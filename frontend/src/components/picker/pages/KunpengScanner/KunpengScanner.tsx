/**
 * 鲲鹏战法量化初筛页面
 * 基于三年五倍战法，筛选符合"合成资产"结构的基础标的池
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
  DollarSign,
  TrendingUp,
  Shield,
  Layers,
  Fish,
} from 'lucide-react';
import { useToast } from '@/components/picker/common/Toast';
import { PickerLoadingOverlay, type PickerLoadingProgress } from '@/components/picker/common/PickerLoadingOverlay';
import { getAllAShareQuotesWithProgress, type FullQuote } from '@/lib/stockV1Api';
import type { PickerStockResult as KunpengCandidate } from '@/lib/pickerApi';
import { addToWatchlist, isInWatchlist } from '@/lib/stockPickerStorage';
import styles from './KunpengScanner.module.css';

// ========== 类型定义 ==========

interface KunpengCriteria {
  // 市值范围 (亿元)
  marketCapMin: number; // 默认 100亿
  marketCapMax: number; // 默认 300亿
  // 净利润 (亿元)
  netProfitMin: number; // 默认 2亿
  // 市盈率范围
  peMin: number; // 默认 0.1 (避免负数)
  peMax: number; // 默认 40
  // 额外筛选条件
  excludeST: boolean; // 排除ST股票
  excludeNewStock: boolean; // 排除次新股 (上市不足1年)
  minPrice: number; // 最低价格
  maxPrice: number; // 最高价格
}

interface SavedScheme {
  id: string;
  name: string;
  criteria: KunpengCriteria;
  createdAt: number;
}

interface RecentUsage {
  criteria: KunpengCriteria;
  usedAt: number;
}

type SortField = 'totalMarketCap' | 'netProfit' | 'pe' | 'changePercent' | 'safetyScore';
type SortOrder = 'asc' | 'desc';

// ========== 常量 ==========

const STORAGE_KEY = 'kunpeng-scanner-settings';
const SCHEMES_STORAGE_KEY = 'kunpeng-scanner-schemes';
const RECENT_USAGE_STORAGE_KEY = 'kunpeng-scanner-recent';
const MAX_RECENT_USAGE = 5;

const DEFAULT_CRITERIA: KunpengCriteria = {
  marketCapMin: 100, // 100亿
  marketCapMax: 300, // 300亿
  netProfitMin: 2, // 2亿
  peMin: 0.1, // 避免负PE
  peMax: 40, // 40倍PE
  excludeST: true, // 排除ST股票
  excludeNewStock: true, // 排除次新股
  minPrice: 3, // 最低3元
  maxPrice: 100, // 最高100元
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'safetyScore', label: '安全评分' },
  { field: 'totalMarketCap', label: '总市值' },
  { field: 'netProfit', label: '净利润' },
  { field: 'pe', label: '市盈率' },
  { field: 'changePercent', label: '当日涨幅' },
];
// ========== 工具函数 ==========

const loadCriteriaFromStorage = (): KunpengCriteria => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CRITERIA, ...parsed };
    }
  } catch (error) {
    console.warn('读取筛选条件失败:', error);
  }
  return DEFAULT_CRITERIA;
};

const saveCriteriaToStorage = (criteria: KunpengCriteria): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(criteria));
  } catch (error) {
    console.warn('保存筛选条件失败:', error);
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

const addRecentUsage = (criteria: KunpengCriteria): void => {
  const recent = loadRecentUsageFromStorage();
  const newEntry: RecentUsage = { criteria, usedAt: Date.now() };
  // 检查是否已存在相同配置
  const isDuplicate = recent.some(
    (r) => JSON.stringify(r.criteria) === JSON.stringify(criteria)
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

// 使用后端返回的评分，不再需要前端计算
// ========== 子组件 ==========

// 鲲鹏指标卡片组件
function KunpengIndicators({ candidate }: { candidate: KunpengCandidate }) {
  return (
    <div className={styles.kunpengIndicators}>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <Shield size={12} strokeWidth={2.25} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>安全评分</span>
          <span className={styles.indicatorValue}>
            {Math.round(candidate.safetyScore ?? 0)}分
          </span>
        </div>
      </div>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <DollarSign size={12} strokeWidth={2.25} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>净利润</span>
          <span className={styles.indicatorValue}>
            {formatNumber(candidate.netProfit)}亿
          </span>
        </div>
      </div>
      <div className={styles.indicatorItem}>
        <div className={styles.indicatorIcon}>
          <TrendingUp size={12} strokeWidth={2.25} />
        </div>
        <div className={styles.indicatorContent}>
          <span className={styles.indicatorLabel}>潜在倍数</span>
          <span className={styles.indicatorValue}>
            {formatNumber(candidate.potentialMultiple)}x
          </span>
        </div>
      </div>
    </div>
  );
}

// 候选股票卡片组件
function KunpengCard({
  candidate,
  index,
  onAddWatchlist,
  isSelected,
  onToggleSelect,
  showSelect,
}: {
  candidate: KunpengCandidate;
  index: number;
  onAddWatchlist: (code: string, name: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (code: string) => void;
  showSelect?: boolean;
}) {
  const navigate = useNavigate();
  const isPositive = candidate.changePercent >= 0;
  const inWatchlist = isInWatchlist(candidate.code);

  const handleCardClick = () => {
    const marketPrefix =
      candidate.code.startsWith('6') || candidate.code.startsWith('9')
        ? 'sh'
        : candidate.code.startsWith('4') || candidate.code.startsWith('8')
          ? 'bj'
          : 'sz';
    navigate(`/backtest?symbol=${marketPrefix}${candidate.code}`);
  };

  const handleSelectClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(candidate.code);
  };

  // 获取安全等级
  const getSafetyLevel = () => {
    const score = candidate.safetyScore ?? 0;
    if (score >= 80) return { level: '优秀', color: '#10b981' };
    if (score >= 60) return { level: '良好', color: '#3b82f6' };
    if (score >= 40) return { level: '一般', color: '#f59e0b' };
    return { level: '较差', color: '#ef4444' };
  };

  const safetyLevel = getSafetyLevel();

  return (
    <motion.div
      className={`${styles.kunpengCard} ${isPositive ? styles.positive : styles.negative} ${isSelected ? styles.selected : ''}`}
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
            <h3 className={styles.stockName}>{candidate.name}</h3>
            <div 
              className={styles.safetyBadge}
              style={{ backgroundColor: safetyLevel.color }}
            >
              <span className={styles.safetyLevel}>{safetyLevel.level}</span>
            </div>
          </div>
          <span className={styles.stockCode}>{candidate.code}</span>
        </div>
        <motion.div
          className={styles.changeBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 + 0.2, type: 'spring' }}
        >
          <span className={styles.changeIcon}>{isPositive ? '▲' : '▼'}</span>
          <span className={styles.changePercent}>{formatNumber(candidate.changePercent)}%</span>
        </motion.div>
      </div>

      <div className={styles.priceSection}>
        <div className={styles.currentPrice}>
          <span className={styles.priceLabel}>现价</span>
          <span className={styles.priceValue}>{formatNumber(candidate.price)}</span>
        </div>
        <div className={styles.priceChange}>
          <span className={styles.changeValue}>
            {isPositive ? '+' : ''}
            {formatNumber(candidate.change)}
          </span>
        </div>
      </div>

      <KunpengIndicators candidate={candidate} />

      <div className={styles.dataGrid}>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>总市值</span>
          <span className={styles.dataValue}>{formatNumber(candidate.totalMarketCap)}亿</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>市盈率</span>
          <span className={styles.dataValue}>{formatNumber(candidate.pe)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>市净率</span>
          <span className={styles.dataValue}>{formatNumber(candidate.pb)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>成交额</span>
          <span className={styles.dataValue}>{formatLargeNumber(candidate.amount)}</span>
        </div>
      </div>

      <button
        className={`${styles.addWatchlistBtn} ${inWatchlist ? styles.added : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!inWatchlist) {
            onAddWatchlist(candidate.code, candidate.name);
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

export function KunpengScanner() {
  const toast = useToast();
  const [criteria, setCriteria] = useState<KunpengCriteria>(loadCriteriaFromStorage);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<PickerLoadingProgress>({
    completed: 0,
    total: 0,
    stage: '',
  });
  const [candidates, setCandidates] = useState<KunpengCandidate[]>([]);
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
  const [sortField, setSortField] = useState<SortField>('safetyScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 批量选择
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [showSelectMode, setShowSelectMode] = useState(false);

  const convertFullQuoteToCandidate = useCallback((quote: FullQuote): KunpengCandidate => {
    const totalMarketCap = quote.totalMarketCap ?? 0;
    const pe = quote.pe ?? 0;
    const netProfit = totalMarketCap / (pe || 1);
    const marketCapScore = Math.max(0, 30 - Math.abs(totalMarketCap - 200) / 10);
    const profitScore = Math.min(30, (netProfit / 5) * 30);
    const peScore = pe > 0 ? Math.max(0, 25 - (pe - 15) / 2) : 0;
    const priceScore = quote.price >= 5 && quote.price <= 50 ? 15 : quote.price >= 3 && quote.price <= 80 ? 10 : 5;
    const safetyScore = Math.min(100, Math.max(0, marketCapScore + profitScore + peScore + priceScore));
    const potentialMarketCap = netProfit * 50;
    const potentialMultiple = totalMarketCap > 0 ? Math.min(potentialMarketCap, 1000) / totalMarketCap : 0;

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
      totalMarketCap,
      pe,
      pb: quote.pb ?? 0,
      high: quote.high,
      low: quote.low,
      open: quote.open,
      prevClose: quote.prevClose,
      market: quote.code.startsWith('6') || quote.code.startsWith('9') ? 'SH' : quote.code.startsWith('4') || quote.code.startsWith('8') ? 'BJ' : 'SZ',
      netProfit,
      safetyScore,
      potentialMultiple,
    };
  }, []);

  const filterAndTransformStocks = useCallback(
    (quotes: FullQuote[]): KunpengCandidate[] => {
      return quotes
        .filter((quote) => {
          const totalMarketCap = quote.totalMarketCap ?? null;
          const pe = quote.pe ?? null;
          if (criteria.excludeST && (quote.name.includes('ST') || quote.name.includes('*ST'))) return false;
          if (totalMarketCap === null || totalMarketCap < criteria.marketCapMin || totalMarketCap > criteria.marketCapMax) return false;
          if (pe === null || pe <= criteria.peMin || pe > criteria.peMax) return false;
          if (quote.price < criteria.minPrice || quote.price > criteria.maxPrice) return false;
          if ((totalMarketCap / pe) < criteria.netProfitMin) return false;
          return true;
        })
        .map(convertFullQuoteToCandidate)
        .sort((a, b) => (b.safetyScore ?? 0) - (a.safetyScore ?? 0));
    },
    [convertFullQuoteToCandidate, criteria],
  );

  // 保存筛选条件
  useEffect(() => {
    saveCriteriaToStorage(criteria);
  }, [criteria]);

  // 恢复默认设置
  const handleResetCriteria = useCallback(() => {
    setCriteria(DEFAULT_CRITERIA);
  }, []);

  // 开始扫描
  const handleStartScan = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress({ completed: 0, total: 0, stage: '获取行情数据' });
    setCandidates([]);
    abortRef.current = false;

    // 记录最近使用
    addRecentUsage(criteria);
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

      setLoadingProgress({ completed: 0, total: 100, stage: '鲲鹏战法筛选' });
      const filtered = filterAndTransformStocks(quotes);
      setLoadingProgress({ completed: 100, total: 100, stage: '完成' });
      setCandidates(filtered);
      setHasScanned(true);
    } catch (error) {
      console.error('扫描鲲鹏标的失败:', error);
      toast.error('扫描失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [criteria, filterAndTransformStocks, toast]);

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

  // 更新筛选条件
  const handleCriteriaChange = (key: keyof KunpengCriteria, value: number | boolean) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
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
      criteria: { ...criteria },
      createdAt: Date.now(),
    };
    const updated = [...savedSchemes, newScheme];
    setSavedSchemes(updated);
    saveSchemesToStorage(updated);
    setNewSchemeName('');
    setShowSaveInput(false);
    toast.success(`方案「${newScheme.name}」已保存`);
  }, [newSchemeName, criteria, savedSchemes, toast]);

  // 加载方案
  const handleLoadScheme = useCallback((scheme: SavedScheme) => {
    setCriteria(scheme.criteria);
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
    setCriteria(recent.criteria);
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
            <Fish size={24} />
            鲲鹏战法量化初筛
          </h1>
          <p className={styles.subtitle}>
            三年五倍战法第一步 · 筛选符合"合成资产"结构的基础标的池
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
                    <span>开始筛选</span>
                  </span>
                </motion.button>
              </motion.div>

              {/* 筛选条件卡片 */}
              <motion.div
                className={`${styles.criteriaCard} ${isEditing ? styles.editing : ''}`}
                onClick={() => !isEditing && setIsEditing(true)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={!isEditing ? { scale: 1.01 } : undefined}
              >
                <div className={styles.criteriaHeader}>
                  <div className={styles.criteriaTitle}>
                    <SlidersHorizontal size={20} />
                    <span>鲲鹏战法条件</span>
                  </div>
                  <div className={styles.criteriaActions}>
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
                              handleResetCriteria();
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
                                市值{recent.criteria.marketCapMin}-{recent.criteria.marketCapMax}亿 · 
                                PE≤{recent.criteria.peMax} · 净利润≥{recent.criteria.netProfitMin}亿
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

                <div className={styles.criteriaGrid}>
                  {/* 市值范围 */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>
                      <Layers size={16} />
                      总市值范围
                    </span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={criteria.marketCapMin}
                            onChange={(e) =>
                              handleCriteriaChange('marketCapMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.criteriaSeparator}>~</span>
                          <input
                            type="number"
                            value={criteria.marketCapMax}
                            onChange={(e) =>
                              handleCriteriaChange('marketCapMax', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.criteriaUnit}>亿</span>
                        </>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          {criteria.marketCapMin} ~ {criteria.marketCapMax}
                          <span className={styles.criteriaUnit}>亿</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 净利润 */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>
                      <DollarSign size={16} />
                      净利润下限
                    </span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={criteria.netProfitMin}
                            onChange={(e) =>
                              handleCriteriaChange('netProfitMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                            min="0"
                          />
                          <span className={styles.criteriaUnit}>亿</span>
                        </>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          ≥ {criteria.netProfitMin}
                          <span className={styles.criteriaUnit}>亿</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 市盈率范围 */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>
                      <TrendingUp size={16} />
                      市盈率范围
                    </span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={criteria.peMin}
                            onChange={(e) =>
                              handleCriteriaChange('peMin', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.1"
                            min="0.1"
                          />
                          <span className={styles.criteriaSeparator}>~</span>
                          <input
                            type="number"
                            value={criteria.peMax}
                            onChange={(e) =>
                              handleCriteriaChange('peMax', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                            step="1"
                          />
                        </>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          {criteria.peMin} ~ {criteria.peMax}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 价格区间 */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>价格区间</span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={criteria.minPrice}
                            onChange={(e) =>
                              handleCriteriaChange('minPrice', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                          />
                          <span className={styles.criteriaSeparator}>~</span>
                          <input
                            type="number"
                            value={criteria.maxPrice}
                            onChange={(e) =>
                              handleCriteriaChange('maxPrice', parseFloat(e.target.value) || 0)
                            }
                            className={styles.criteriaInput}
                            onClick={(e) => e.stopPropagation()}
                            step="0.5"
                          />
                          <span className={styles.criteriaUnit}>元</span>
                        </>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          {criteria.minPrice} ~ {criteria.maxPrice}
                          <span className={styles.criteriaUnit}>元</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 过滤ST */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>过滤ST股票</span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <button
                          className={`${styles.toggleBtn} ${criteria.excludeST ? styles.active : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCriteriaChange('excludeST', !criteria.excludeST);
                          }}
                        >
                          {criteria.excludeST ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          <span>{criteria.excludeST ? '开启' : '关闭'}</span>
                        </button>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          {criteria.excludeST ? '开启' : '关闭'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 过滤次新股 */}
                  <div className={styles.criteriaItem}>
                    <span className={styles.criteriaLabel}>过滤次新股</span>
                    <div className={styles.criteriaValue}>
                      {isEditing ? (
                        <button
                          className={`${styles.toggleBtn} ${criteria.excludeNewStock ? styles.active : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCriteriaChange('excludeNewStock', !criteria.excludeNewStock);
                          }}
                        >
                          {criteria.excludeNewStock ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          <span>{criteria.excludeNewStock ? '开启' : '关闭'}</span>
                        </button>
                      ) : (
                        <span className={styles.criteriaDisplay}>
                          {criteria.excludeNewStock ? '开启' : '关闭'}
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
                    共筛选出 <strong>{candidates.length}</strong> 只鲲鹏标的
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
                    重新筛选
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
                    <KunpengCard
                      key={candidate.code}
                      candidate={candidate}
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
                  <p className={styles.noResultsTitle}>没有找到符合鲲鹏战法的标的</p>
                  <p className={styles.noResultsHint}>请尝试调整筛选条件后重新分析</p>
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
            defaultStage="正在扫描鲲鹏标的..."
          />
        )}
      </AnimatePresence>
    </div>
  );
}
