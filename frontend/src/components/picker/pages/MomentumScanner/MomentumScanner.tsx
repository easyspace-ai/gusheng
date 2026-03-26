/**
 * 妖股候选人扫描器页面
 * 基于动量因子、趋势因子、活跃因子筛选潜在妖股
 */

import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Target,
  ChevronLeft,
  SearchX,
  SlidersHorizontal,
  Check,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  TrendingUp,
  Plus,
  Save,
  FolderOpen,
  Trash2,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  X,
  Activity,
  BarChart3,
  Flame,
} from 'lucide-react';
import { useToast } from '@/components/picker/common/Toast';
import { PickerLoadingOverlay, type PickerLoadingProgress } from '@/components/picker/common/PickerLoadingOverlay';
import {
  getAllAShareQuotesWithProgress,
  getHistoryKline,
  type FullQuote,
} from '@/lib/stockV1Api';
import type { PickerStockResult as CandidateStock } from '@/lib/pickerApi';
import { addToWatchlist, isInWatchlist } from '@/lib/stockPickerStorage';
import styles from './MomentumScanner.module.css';

// ========== 类型定义 ==========

interface ScanConditions {
  // 动量因子：过去20个交易日区间最大涨幅
  momentumThreshold: number; // 默认 50%
  // 趋势因子：当前价格相对60日均线
  trendAboveMA60: boolean; // 默认 true
  // 活跃因子：近5日平均换手率
  avgTurnoverMin: number; // 默认 5%
  // 额外筛选条件
  marketCapMin: number; // 最小市值
  marketCapMax: number; // 最大市值
  excludeST: boolean; // 排除ST股票
  priceMin: number; // 最低价格
  priceMax: number; // 最高价格
}

interface SavedScheme {
  id: string;
  name: string;
  conditions: ScanConditions;
  createdAt: number;
}

interface RecentUsage {
  conditions: ScanConditions;
  usedAt: number;
}

type SortField = 'momentumRatio' | 'ma60Distance' | 'avgTurnover5d' | 'changePercent' | 'circulatingMarketCap';
type SortOrder = 'asc' | 'desc';

// ========== 常量 ==========

const STORAGE_KEY = 'momentum-scanner-settings';
const SCHEMES_STORAGE_KEY = 'momentum-scanner-schemes';
const RECENT_USAGE_STORAGE_KEY = 'momentum-scanner-recent';
const MAX_RECENT_USAGE = 5;

const DEFAULT_CONDITIONS: ScanConditions = {
  momentumThreshold: 50, // 20日区间最大涨幅 > 50%
  trendAboveMA60: true, // 当前价格在60日均线之上
  avgTurnoverMin: 5, // 近5日平均换手率 > 5%
  marketCapMin: 20, // 最小市值20亿
  marketCapMax: 500, // 最大市值500亿
  excludeST: true, // 排除ST股票
  priceMin: 5, // 最低价格5元
  priceMax: 100, // 最高价格100元
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'momentumRatio', label: '动量强度' },
  { field: 'ma60Distance', label: '趋势强度' },
  { field: 'avgTurnover5d', label: '活跃度' },
  { field: 'changePercent', label: '当日涨幅' },
  { field: 'circulatingMarketCap', label: '流通市值' },
];

// ========== 工具函数 ==========

const loadConditionsFromStorage = (): ScanConditions => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONDITIONS, ...parsed };
    }
  } catch (error) {
    console.warn('读取扫描条件失败:', error);
  }
  return DEFAULT_CONDITIONS;
};

const saveConditionsToStorage = (conditions: ScanConditions): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conditions));
  } catch (error) {
    console.warn('保存扫描条件失败:', error);
  }
};

// 方案存储
const loadSchemesFromStorage = (): SavedScheme[] => {
  try {
    const stored = localStorage.getItem(SCHEMES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('读取方案失败:', error);
  }
  return [];
};

const saveSchemesToStorage = (schemes: SavedScheme[]): void => {
  try {
    localStorage.setItem(SCHEMES_STORAGE_KEY, JSON.stringify(schemes));
  } catch (error) {
    console.warn('保存方案失败:', error);
  }
};

// 最近使用存储
const loadRecentUsageFromStorage = (): RecentUsage[] => {
  try {
    const stored = localStorage.getItem(RECENT_USAGE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('读取最近使用失败:', error);
  }
  return [];
};

const saveRecentUsageToStorage = (recentUsage: RecentUsage[]): void => {
  try {
    localStorage.setItem(RECENT_USAGE_STORAGE_KEY, JSON.stringify(recentUsage));
  } catch (error) {
    console.warn('保存最近使用失败:', error);
  }
};

const addRecentUsage = (conditions: ScanConditions): void => {
  const recent = loadRecentUsageFromStorage();
  const newEntry: RecentUsage = { conditions, usedAt: Date.now() };
  // 检查是否已存在相同配置
  const isDuplicate = recent.some(
    (r) => JSON.stringify(r.conditions) === JSON.stringify(conditions)
  );
  if (!isDuplicate) {
    const updated = [newEntry, ...recent].slice(0, MAX_RECENT_USAGE);
    saveRecentUsageToStorage(updated);
  }
};

const formatNumber = (num: number | null | undefined, decimals = 2): string => {
  if (num === null || num === undefined) return '-';
  return num.toFixed(decimals);
};

const formatLargeNumber = (num: number): string => {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万';
  }
  return num.toFixed(2);
};
// ========== 子组件 ==========

// 妖股指标卡片组件
function MomentumIndicators({ stock }: { stock: CandidateStock }) {
  return (
    <div className={styles.momentumIndicators}>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <Flame size={16} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>动量强度</span>
          <span className={styles.indicatorValue}>
            {formatNumber(stock.momentumRatio)}%
          </span>
        </div>
      </div>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <TrendingUp size={16} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>趋势强度</span>
          <span className={styles.indicatorValue}>
            +{formatNumber(stock.ma60Distance)}%
          </span>
        </div>
      </div>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <Activity size={16} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>活跃度</span>
          <span className={styles.indicatorValue}>
            {formatNumber(stock.avgTurnover5d)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// 股票卡片组件
function CandidateCard({
  stock,
  index,
  onAddWatchlist,
  isSelected,
  onToggleSelect,
  showSelect,
}: {
  stock: CandidateStock;
  index: number;
  onAddWatchlist: (code: string, name: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (code: string) => void;
  showSelect?: boolean;
}) {
  const navigate = useNavigate();
  const isPositive = stock.changePercent >= 0;
  const inWatchlist = isInWatchlist(stock.code);

  const handleCardClick = () => {
    const marketPrefix =
      stock.code.startsWith('6') || stock.code.startsWith('9')
        ? 'sh'
        : stock.code.startsWith('4') || stock.code.startsWith('8')
          ? 'bj'
          : 'sz';
    navigate(`/backtest?symbol=${marketPrefix}${stock.code}`);
  };

  const handleSelectClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(stock.code);
  };

  // 计算妖股潜力评分
  const getPotentialScore = () => {
    const momentumScore = Math.min((stock.momentumRatio ?? 0) / 100, 1) * 40;
    const trendScore = Math.min((stock.ma60Distance ?? 0) / 20, 1) * 30;
    const activityScore = Math.min((stock.avgTurnover5d ?? 0) / 15, 1) * 30;
    return Math.round(momentumScore + trendScore + activityScore);
  };

  const potentialScore = getPotentialScore();

  return (
    <motion.div
      className={`${styles.candidateCard} ${isPositive ? styles.positive : styles.negative} ${isSelected ? styles.selected : ''}`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: 'easeOut',
      }}
      whileHover={{
        scale: 1.02,
        y: -3,
        transition: { duration: 0.2 },
      }}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.stockInfo}>
          <div className={styles.stockNameRow}>
            {showSelect && (
              <button className={styles.selectBtn} onClick={handleSelectClick}>
                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
            )}
            <h3 className={styles.stockName}>{stock.name}</h3>
            <div className={styles.potentialBadge}>
              <span className={styles.potentialScore}>{potentialScore}</span>
              <span className={styles.potentialLabel}>分</span>
            </div>
          </div>
          <span className={styles.stockCode}>{stock.code}</span>
        </div>
        <motion.div
          className={styles.changeBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 + 0.2, type: 'spring' }}
        >
          <span className={styles.changeIcon}>{isPositive ? '▲' : '▼'}</span>
          <span className={styles.changePercent}>{formatNumber(stock.changePercent)}%</span>
        </motion.div>
      </div>

      <div className={styles.priceSection}>
        <div className={styles.currentPrice}>
          <span className={styles.priceLabel}>现价</span>
          <span className={styles.priceValue}>{formatNumber(stock.price)}</span>
        </div>
        <div className={styles.priceChange}>
          <span className={styles.changeValue}>
            {isPositive ? '+' : ''}
            {formatNumber(stock.change)}
          </span>
        </div>
      </div>

      <MomentumIndicators stock={stock} />

      <div className={styles.dataGrid}>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>流通市值</span>
          <span className={styles.dataValue}>{formatNumber(stock.circulatingMarketCap)}亿</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>20日高低</span>
          <span className={styles.dataValue}>
            {formatNumber(stock.low20d)}-{formatNumber(stock.high20d)}
          </span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>60日均线</span>
          <span className={styles.dataValue}>{formatNumber(stock.ma60)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>成交额</span>
          <span className={styles.dataValue}>{formatLargeNumber(stock.amount)}</span>
        </div>
      </div>

      <button
        className={`${styles.addWatchlistBtn} ${inWatchlist ? styles.added : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!inWatchlist) {
            onAddWatchlist(stock.code, stock.name);
          }
        }}
        disabled={inWatchlist}
      >
        {inWatchlist ? <Check size={14} /> : <Plus size={14} />}
        {inWatchlist ? '已自选' : '加自选'}
      </button>
    </motion.div>
  );
}
// ========== 主组件 ==========

export function MomentumScanner() {
  const toast = useToast();
  const [conditions, setConditions] = useState<ScanConditions>(loadConditionsFromStorage);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<PickerLoadingProgress>({
    completed: 0,
    total: 0,
    stage: '',
  });
  const [candidates, setCandidates] = useState<CandidateStock[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const abortRef = useRef(false);

  // 方案管理
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>(loadSchemesFromStorage);
  const [recentUsage, setRecentUsage] = useState<RecentUsage[]>(loadRecentUsageFromStorage);
  const [showSchemePanel, setShowSchemePanel] = useState(false);
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // 排序
  const [sortField, setSortField] = useState<SortField>('momentumRatio');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 批量选择
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [showSelectMode, setShowSelectMode] = useState(false);

  const calculateMomentumIndicators = useCallback(
    async (quote: FullQuote): Promise<CandidateStock | null> => {
      if (
        (quote.circulatingMarketCap ?? 0) < conditions.marketCapMin ||
        (quote.circulatingMarketCap ?? 0) > conditions.marketCapMax
      ) {
        return null;
      }
      if (quote.price < conditions.priceMin || quote.price > conditions.priceMax) {
        return null;
      }
      if ((quote.turnoverRate ?? 0) < conditions.avgTurnoverMin) {
        return null;
      }
      if (conditions.excludeST && (quote.name.includes('ST') || quote.name.includes('*ST'))) {
        return null;
      }

      const marketPrefix =
        quote.code.startsWith('6') || quote.code.startsWith('9')
          ? 'sh'
          : quote.code.startsWith('4') || quote.code.startsWith('8')
            ? 'bj'
            : 'sz';
      const fullCode = `${marketPrefix}${quote.code}`;

      const klineData = await getHistoryKline(fullCode, {
        period: 'daily',
        adjust: 'qfq',
      });
      if (!klineData || klineData.length < 60) {
        return null;
      }

      const closes = klineData.map((k) => k.close);
      const highs20 = klineData.slice(-20).map((k) => k.high);
      const lows20 = klineData.slice(-20).map((k) => k.low).filter((v) => v > 0);

      const ma60 = closes.slice(-60).reduce((sum, v) => sum + v, 0) / 60;
      const ma60Distance = ((quote.price - ma60) / ma60) * 100;
      if (conditions.trendAboveMA60 && quote.price < ma60) {
        return null;
      }

      const high20d = Math.max(...highs20);
      const low20d = lows20.length > 0 ? Math.min(...lows20) : 0;
      if (low20d <= 0) {
        return null;
      }

      const momentumRatio = ((high20d - low20d) / low20d) * 100;
      if (momentumRatio < conditions.momentumThreshold) {
        return null;
      }

      return {
        code: quote.code,
        name: quote.name,
        price: quote.price,
        changePercent: quote.changePercent,
        change: quote.change,
        volume: quote.volume,
        amount: quote.amount,
        turnoverRate: quote.turnoverRate ?? 0,
        volumeRatio: quote.volumeRatio ?? 0,
        circulatingMarketCap: quote.circulatingMarketCap ?? 0,
        totalMarketCap: quote.totalMarketCap ?? 0,
        pe: quote.pe ?? 0,
        pb: quote.pb ?? 0,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        prevClose: quote.prevClose,
        market: marketPrefix.toUpperCase(),
        momentumRatio,
        ma60Distance,
        avgTurnover5d: quote.turnoverRate ?? 0,
        high20d,
        low20d,
        ma60,
      };
    },
    [conditions],
  );

  // 保存扫描条件
  useEffect(() => {
    saveConditionsToStorage(conditions);
  }, [conditions]);

  // 恢复默认设置
  const handleResetConditions = useCallback(() => {
    setConditions(DEFAULT_CONDITIONS);
  }, []);

  // 开始扫描
  const handleStartScan = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress({ completed: 0, total: 0, stage: '获取行情数据' });
    setCandidates([]);
    abortRef.current = false;

    // 记录最近使用
    addRecentUsage(conditions);
    setRecentUsage(loadRecentUsageFromStorage());

    try {
      const quotes = await getAllAShareQuotesWithProgress({
        batchSize: 400,
        concurrency: 5,
        onProgress: (completed, total) => {
          setLoadingProgress({ completed, total, stage: '获取行情数据' });
        },
      });
      if (abortRef.current) return;

      setLoadingProgress({ completed: 0, total: quotes.length, stage: '计算动量指标' });
      const tempResults: CandidateStock[] = []
      for (let i = 0; i < quotes.length; i += 1) {
        if (abortRef.current) return;
        const candidate = await calculateMomentumIndicators(quotes[i]);
        if (candidate) tempResults.push(candidate);
        if (i % 20 === 0) {
          setLoadingProgress({ completed: i + 1, total: quotes.length, stage: '计算动量指标' });
        }
      }

      tempResults.sort((a, b) => (b.momentumRatio ?? 0) - (a.momentumRatio ?? 0));
      setLoadingProgress({ completed: quotes.length, total: quotes.length, stage: '完成' });

      if (tempResults.length === 0) {
        toast.info('没有符合条件的妖股候选人，请尝试调整筛选条件');
      }

      setCandidates(tempResults);
      setHasScanned(true);
    } catch (error) {
      console.error('扫描妖股候选人失败:', error);
      toast.error('扫描失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [calculateMomentumIndicators, conditions, toast]);

  // 加入自选
  const handleAddWatchlist = useCallback(
    (code: string, name: string) => {
      const marketPrefix =
        code.startsWith('6') || code.startsWith('9')
          ? 'sh'
          : code.startsWith('4') || code.startsWith('8')
            ? 'bj'
            : 'sz';
      addToWatchlist(`${marketPrefix}${code}`);
      toast.success(`已将 ${name} 加入自选`);
      // 强制刷新以更新按钮状态
      setCandidates((prev) => [...prev]);
    },
    [toast]
  );

  // 更新扫描条件
  const handleConditionChange = (key: keyof ScanConditions, value: number | boolean) => {
    setConditions((prev) => ({ ...prev, [key]: value }));
  };

  // 保存方案
  const handleSaveScheme = useCallback(() => {
    if (!newSchemeName.trim()) {
      toast.warning('请输入方案名称');
      return;
    }
    const newScheme: SavedScheme = {
      id: Date.now().toString(),
      name: newSchemeName.trim(),
      conditions: { ...conditions },
      createdAt: Date.now(),
    };
    const updated = [...savedSchemes, newScheme];
    setSavedSchemes(updated);
    saveSchemesToStorage(updated);
    setNewSchemeName('');
    setShowSaveInput(false);
    toast.success(`方案「${newScheme.name}」已保存`);
  }, [newSchemeName, conditions, savedSchemes, toast]);

  // 加载方案
  const handleLoadScheme = useCallback((scheme: SavedScheme) => {
    setConditions(scheme.conditions);
    setShowSchemePanel(false);
    toast.success(`已加载方案「${scheme.name}」`);
  }, [toast]);

  // 删除方案
  const handleDeleteScheme = useCallback((schemeId: string) => {
    const updated = savedSchemes.filter((s) => s.id !== schemeId);
    setSavedSchemes(updated);
    saveSchemesToStorage(updated);
    toast.success('方案已删除');
  }, [savedSchemes, toast]);

  // 加载最近使用
  const handleLoadRecent = useCallback((recent: RecentUsage) => {
    setConditions(recent.conditions);
    setShowRecentPanel(false);
    toast.success('已加载历史配置');
  }, [toast]);

  // 排序候选股票
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [candidates, sortField, sortOrder]);

  // 切换排序
  const handleSortChange = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  // 切换选择
  const handleToggleSelect = useCallback((code: string) => {
    setSelectedStocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedStocks.size === sortedCandidates.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(sortedCandidates.map((s) => s.code)));
    }
  }, [selectedStocks.size, sortedCandidates]);

  // 批量加入自选
  const handleBatchAddWatchlist = useCallback(() => {
    let addedCount = 0;
    selectedStocks.forEach((code) => {
      const stock = candidates.find((s) => s.code === code);
      if (stock && !isInWatchlist(code)) {
        const marketPrefix =
          code.startsWith('6') || code.startsWith('9')
            ? 'sh'
            : code.startsWith('4') || code.startsWith('8')
              ? 'bj'
              : 'sz';
        addToWatchlist(`${marketPrefix}${code}`);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      toast.success(`已将 ${addedCount} 只股票加入自选`);
      setCandidates((prev) => [...prev]); // 刷新状态
    } else {
      toast.info('所选股票已在自选中');
    }
    setSelectedStocks(new Set());
    setShowSelectMode(false);
  }, [selectedStocks, candidates, toast]);
  return (
    <div className={styles.container}>
      {/* 页面头部 */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            <Flame size={24} />
            妖股候选人扫描器
          </h1>
          <p className={styles.subtitle}>
            基于动量、趋势、活跃度三因子模型筛选潜在妖股
          </p>
        </div>
      </motion.header>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          {!hasScanned ? (
            <motion.div
              key="start-screen"
              className={styles.startScreen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {/* 开始按钮 */}
              <motion.div
                className={styles.startButtonContainer}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.button
                  className={styles.startButton}
                  onClick={handleStartScan}
                  disabled={isLoading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className={styles.buttonGlow} />
                  <span className={styles.buttonContent}>
                    <Zap size={28} />
                    <span>开始扫描</span>
                  </span>
                </motion.button>
              </motion.div>

              {/* 扫描条件卡片 */}
              <motion.div
                className={`${styles.conditionCard} ${isEditing ? styles.editing : ''}`}
                onClick={() => !isEditing && setIsEditing(true)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={!isEditing ? { scale: 1.01 } : undefined}
              >
                <div className={styles.conditionHeader}>
                  <div className={styles.conditionTitle}>
                    <SlidersHorizontal size={20} />
                    <span>扫描条件</span>
                  </div>
                  <div className={styles.conditionActions}>
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div
                          key="editing"
                          className={styles.editActions}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <button
                            className={styles.resetBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetConditions();
                            }}
                            title="恢复默认"
                          >
                            <RotateCcw size={14} />
                            默认
                          </button>
                          <button
                            className={styles.schemeBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSchemePanel(!showSchemePanel);
                              setShowRecentPanel(false);
                            }}
                            title="管理方案"
                          >
                            <FolderOpen size={14} />
                            方案
                          </button>
                          <button
                            className={styles.recentBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRecentPanel(!showRecentPanel);
                              setShowSchemePanel(false);
                            }}
                            title="最近使用"
                          >
                            <Clock size={14} />
                            历史
                          </button>
                          <button
                            className={styles.saveBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditing(false);
                              setShowSchemePanel(false);
                              setShowRecentPanel(false);
                            }}
                          >
                            <Check size={14} />
                            完成
                          </button>
                        </motion.div>
                      ) : (
                        <motion.span
                          key="hint"
                          className={styles.editHint}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          点击编辑
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 方案管理面板 */}
                <AnimatePresence>
                  {showSchemePanel && (
                    <motion.div
                      className={styles.schemePanel}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={styles.schemePanelHeader}>
                        <span>保存的方案</span>
                        <button
                          className={styles.addSchemeBtn}
                          onClick={() => setShowSaveInput(!showSaveInput)}
                        >
                          <Plus size={14} />
                          保存当前
                        </button>
                      </div>
                      {showSaveInput && (
                        <div className={styles.saveInputRow}>
                          <input
                            type="text"
                            placeholder="输入方案名称"
                            value={newSchemeName}
                            onChange={(e) => setNewSchemeName(e.target.value)}
                            className={styles.schemeNameInput}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveScheme()}
                          />
                          <button className={styles.confirmSaveBtn} onClick={handleSaveScheme}>
                            <Save size={14} />
                          </button>
                        </div>
                      )}
                      {savedSchemes.length > 0 ? (
                        <div className={styles.schemeList}>
                          {savedSchemes.map((scheme) => (
                            <div key={scheme.id} className={styles.schemeItem}>
                              <button
                                className={styles.schemeLoadBtn}
                                onClick={() => handleLoadScheme(scheme)}
                              >
                                {scheme.name}
                              </button>
                              <button
                                className={styles.schemeDeleteBtn}
                                onClick={() => handleDeleteScheme(scheme.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyHint}>暂无保存的方案</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 最近使用面板 */}
                <AnimatePresence>
                  {showRecentPanel && (
                    <motion.div
                      className={styles.recentPanel}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={styles.schemePanelHeader}>
                        <span>最近使用</span>
                      </div>
                      {recentUsage.length > 0 ? (
                        <div className={styles.schemeList}>
                          {recentUsage.map((recent, idx) => (
                            <button
                              key={idx}
                              className={styles.recentItem}
                              onClick={() => handleLoadRecent(recent)}
                            >
                              <span className={styles.recentSummary}>
                                动量≥{recent.conditions.momentumThreshold}% · 
                                换手≥{recent.conditions.avgTurnoverMin}%
                              </span>
                              <span className={styles.recentTime}>
                                {new Date(recent.usedAt).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyHint}>暂无使用记录</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className={styles.conditionGrid}>
                  {/* 动量因子 */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>
                      <Flame size={16} />
                      动量阈值
                    </span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={conditions.momentumThreshold}
                            onChange={(e) =>
                              handleConditionChange('momentumThreshold', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                            step="5"
                            min="0"
                            max="200"
                          />
                          <span className={styles.conditionUnit}>%</span>
                        </>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          ≥ {conditions.momentumThreshold}
                          <span className={styles.conditionUnit}>%</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 趋势因子 */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>
                      <TrendingUp size={16} />
                      趋势要求
                    </span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <button
                          className={`${styles.toggleBtn} ${conditions.trendAboveMA60 ? styles.active : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConditionChange('trendAboveMA60', !conditions.trendAboveMA60);
                          }}
                        >
                          {conditions.trendAboveMA60 ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          <span>{conditions.trendAboveMA60 ? '高于60日均线' : '无要求'}</span>
                        </button>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          {conditions.trendAboveMA60 ? '高于60日均线' : '无要求'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 活跃因子 */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>
                      <Activity size={16} />
                      活跃度
                    </span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={conditions.avgTurnoverMin}
                            onChange={(e) =>
                              handleConditionChange('avgTurnoverMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                            min="0"
                            max="50"
                          />
                          <span className={styles.conditionUnit}>%</span>
                        </>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          ≥ {conditions.avgTurnoverMin}
                          <span className={styles.conditionUnit}>%</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 流通市值 */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>
                      <BarChart3 size={16} />
                      流通市值
                    </span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={conditions.marketCapMin}
                            onChange={(e) =>
                              handleConditionChange('marketCapMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.conditionSeparator}>~</span>
                          <input
                            type="number"
                            value={conditions.marketCapMax}
                            onChange={(e) =>
                              handleConditionChange('marketCapMax', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.conditionUnit}>亿</span>
                        </>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          {conditions.marketCapMin} ~ {conditions.marketCapMax}
                          <span className={styles.conditionUnit}>亿</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 价格区间 */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>价格区间</span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={conditions.priceMin}
                            onChange={(e) =>
                              handleConditionChange('priceMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                          />
                          <span className={styles.conditionSeparator}>~</span>
                          <input
                            type="number"
                            value={conditions.priceMax}
                            onChange={(e) =>
                              handleConditionChange('priceMax', parseFloat(e.target.value) || 0)
                            }
                            className={styles.conditionInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                          />
                          <span className={styles.conditionUnit}>元</span>
                        </>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          {conditions.priceMin} ~ {conditions.priceMax}
                          <span className={styles.conditionUnit}>元</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 过滤ST */}
                  <div className={styles.conditionItem}>
                    <span className={styles.conditionLabel}>过滤ST股票</span>
                    <div className={styles.conditionValue}>
                      {isEditing ? (
                        <button
                          className={`${styles.toggleBtn} ${conditions.excludeST ? styles.active : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConditionChange('excludeST', !conditions.excludeST);
                          }}
                        >
                          {conditions.excludeST ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          <span>{conditions.excludeST ? '开启' : '关闭'}</span>
                        </button>
                      ) : (
                        <span className={styles.conditionDisplay}>
                          {conditions.excludeST ? '开启' : '关闭'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="results-screen"
              className={styles.resultsScreen}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* 结果头部 */}
              <div className={styles.resultsHeader}>
                <motion.div
                  className={styles.resultsSummary}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Target size={20} />
                  <span className={styles.summaryText}>
                    共发现 <strong>{candidates.length}</strong> 只妖股候选人
                  </span>
                </motion.div>
                <motion.div
                  className={styles.resultsActions}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* 批量选择按钮 */}
                  {candidates.length > 0 && (
                    <button
                      className={`${styles.selectModeBtn} ${showSelectMode ? styles.active : ''}`}
                      onClick={() => {
                        setShowSelectMode(!showSelectMode);
                        if (showSelectMode) {
                          setSelectedStocks(new Set());
                        }
                      }}
                    >
                      {showSelectMode ? <X size={16} /> : <CheckSquare size={16} />}
                      {showSelectMode ? '取消' : '批量选'}
                    </button>
                  )}
                  <button
                    className={styles.backButton}
                    onClick={() => {
                      setHasScanned(false);
                      setCandidates([]);
                      setShowSelectMode(false);
                      setSelectedStocks(new Set());
                    }}
                  >
                    <ChevronLeft size={18} />
                    重新扫描
                  </button>
                </motion.div>
              </div>

              {/* 排序和批量操作栏 */}
              {candidates.length > 0 && (
                <motion.div
                  className={styles.sortBar}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className={styles.sortSection}>
                    <ArrowUpDown size={14} />
                    <span className={styles.sortLabel}>排序：</span>
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.field}
                        className={`${styles.sortOption} ${sortField === option.field ? styles.active : ''}`}
                        onClick={() => handleSortChange(option.field)}
                      >
                        {option.label}
                        {sortField === option.field && (
                          sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                  {showSelectMode && (
                    <div className={styles.batchSection}>
                      <button className={styles.selectAllBtn} onClick={handleSelectAll}>
                        {selectedStocks.size === sortedCandidates.length ? '取消全选' : '全选'}
                      </button>
                      <button
                        className={styles.batchAddBtn}
                        onClick={handleBatchAddWatchlist}
                        disabled={selectedStocks.size === 0}
                      >
                        <Plus size={14} />
                        加入自选 ({selectedStocks.size})
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 结果列表 */}
              {sortedCandidates.length > 0 ? (
                <motion.div
                  className={styles.candidateGrid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {sortedCandidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.code}
                      stock={candidate}
                      index={index}
                      onAddWatchlist={handleAddWatchlist}
                      isSelected={selectedStocks.has(candidate.code)}
                      onToggleSelect={handleToggleSelect}
                      showSelect={showSelectMode}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  className={styles.noResults}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <SearchX size={64} strokeWidth={1} />
                  <p className={styles.noResultsTitle}>没有发现符合条件的妖股候选人</p>
                  <p className={styles.noResultsHint}>请尝试调整扫描条件后重新分析</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 加载遮罩 */}
      <AnimatePresence>
        {isLoading && (
          <PickerLoadingOverlay
            progress={loadingProgress}
            defaultStage="正在扫描妖股候选人..."
          />
        )}
      </AnimatePresence>
    </div>
  );
}
