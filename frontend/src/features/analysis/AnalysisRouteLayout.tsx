import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DollarSign,
  Flame,
  Loader2,
  MessageCircle,
  Newspaper,
  Scale,
  Send,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Calculator,
  BarChart3,
  Briefcase,
  History,
  ChevronRight,
  PlusCircle,
} from 'lucide-react'
import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout'
import { useWorkbenchChrome } from '@/components/layout/WorkbenchChromeContext'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  getTradingKline,
  getTradingReport,
  getTradingReports,
  streamTradingAnalysis,
  type TradingApiKlineResponse,
  type TradingApiStreamEvent,
  type TradingApiReportSummary,
} from '@/lib/tradingApi'
import { getCustomAnalysisPrompt, getDefaultAnalysisAnalysts } from '@/lib/analysisPreferences'
import { extractCnSymbol, normalizeCnSymbol } from '@/lib/symbols'
import {
  loadAnalysisHistory,
  saveAnalysisHistory,
  upsertAnalysisHistory,
  type LocalAnalysisHistoryRecord,
} from '@/lib/analysisHistory'
import TradingKlinePanel from '@/features/analysis/TradingKlinePanel'
import {
  createAnalysisSession,
  flushAnalysisSessionsSave,
  loadAnalysisSessions,
  saveAnalysisSessions,
  summarizeSessionTitle,
  upsertSession,
  type AnalysisSession,
  type AnalysisSessionMessage,
} from '@/lib/analysisSessions'

type ChatRole = 'user' | 'assistant' | 'system'
type SectionKey =
  | 'market_report'
  | 'sentiment_report'
  | 'news_report'
  | 'fundamentals_report'
  | 'macro_report'
  | 'smart_money_report'
  | 'game_theory_report'
  | 'investment_plan'
  | 'trader_investment_plan'
  | 'final_trade_decision'

type SectionStatus = 'pending' | 'streaming' | 'complete'
type AgentStatus = 'pending' | 'in_progress' | 'completed'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

interface CandlePoint {
  date: string
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SymbolQuote {
  symbol: string
  name: string
  marketLabel: string
  tradeDate: string | null
  lastPrice: number | null
  open: number | null
  high: number | null
  low: number | null
  change: number | null
  changePercent: number | null
  volume: number | null
  candles: CandlePoint[]
  verdict: string
  confidence: number | null
  targetPrice: number | null
  stopLoss: number | null
  summary: string
}

interface ReportSectionState {
  status: SectionStatus
  content: string
}

interface AgentCardMeta {
  id: string
  name: string
  label: string
  goal: string
  section?: SectionKey
  icon: ComponentType<{ className?: string }>
  tone: string
}

const PRESET_PROMPTS = [
  '分析一下贵州茅台(600519.SH)今天走势',
  '请分析稀土ETF嘉实(516150)在2026-03-03的情况',
  '分析宁德时代300750.SZ，给出交易建议',
]

const WATCHLIST = [
  { symbol: '600519.SH', name: '贵州茅台', note: '白酒龙头，稳态观察' },
  { symbol: '601318.SH', name: '中国平安', note: '金融权重，等待催化' },
  { symbol: '300750.SZ', name: '宁德时代', note: '新能源核心，波动较高' },
  { symbol: '000001.SH', name: '上证指数', note: '大盘风向标' },
]

const SYMBOL_NAME_MAP: Record<string, string> = {
  '600519.SH': '贵州茅台',
  '601318.SH': '中国平安',
  '300750.SZ': '宁德时代',
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000688.SH': '科创50',
  '899050.BJ': '北证50',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
  '600406.SH': '国电南瑞',
  '510300.SH': '沪深300ETF',
}

function getDisplayName(symbol: string): string {
  return SYMBOL_NAME_MAP[symbol] || symbol
}

const ANALYST_PROMPTS = [
  { id: 'market', label: '技术面', description: '价格形态与趋势' },
  { id: 'sentiment', label: '舆情', description: '社媒与市场情绪' },
  { id: 'news', label: '新闻', description: '政策与行业催化' },
  { id: 'fundamentals', label: '基本面', description: '财报与估值' },
  { id: 'macro', label: '宏观', description: '板块轮动与环境' },
  { id: 'smart_money', label: '主力资金', description: '机构与资金流向' },
]

const AGENTS: AgentCardMeta[] = [
  { id: 'market', name: 'Market Analyst', label: '技术面', goal: '技术指标与价格形态分析', section: 'market_report', icon: TrendingUp, tone: 'blue' },
  { id: 'social', name: 'Social Analyst', label: '舆情', goal: '舆论情绪与社交媒体分析', section: 'sentiment_report', icon: MessageCircle, tone: 'fuchsia' },
  { id: 'news', name: 'News Analyst', label: '新闻', goal: '政策资讯与行业动态分析', section: 'news_report', icon: Newspaper, tone: 'cyan' },
  { id: 'fundamentals', name: 'Fundamentals Analyst', label: '基本面', goal: '财务报表与估值分析', section: 'fundamentals_report', icon: Calculator, tone: 'emerald' },
  { id: 'macro', name: 'Macro Analyst', label: '宏观', goal: '板块轮动与政策驱动分析', section: 'macro_report', icon: BarChart3, tone: 'violet' },
  { id: 'smart_money', name: 'Smart Money Analyst', label: '主力资金', goal: '机构资金行为与龙虎榜', section: 'smart_money_report', icon: DollarSign, tone: 'amber' },
  { id: 'game_theory', name: 'Game Theory Manager', label: '博弈裁判', goal: '主力与散户预期差裁判', section: 'game_theory_report', icon: Scale, tone: 'rose' },
  { id: 'bull', name: 'Bull Researcher', label: '多头', goal: '评估投资价值与上行潜力', section: 'investment_plan', icon: ArrowRight, tone: 'emerald' },
  { id: 'bear', name: 'Bear Researcher', label: '空头', goal: '评估下行风险与潜在危机', section: 'investment_plan', icon: ArrowLeft, tone: 'rose' },
  { id: 'research_manager', name: 'Research Manager', label: '研究总监', goal: '综合多空论据形成投资计划', section: 'investment_plan', icon: Sparkles, tone: 'indigo' },
  { id: 'trader', name: 'Trader', label: '交易员', goal: '将研究结论转化为可执行指令', section: 'trader_investment_plan', icon: Briefcase, tone: 'orange' },
  { id: 'aggressive', name: 'Aggressive Analyst', label: '激进', goal: '高风险高收益策略约束', section: 'final_trade_decision', icon: Flame, tone: 'red' },
  { id: 'neutral', name: 'Neutral Analyst', label: '中性', goal: '均衡风险收益策略约束', section: 'final_trade_decision', icon: Scale, tone: 'slate' },
  { id: 'conservative', name: 'Conservative Analyst', label: '稳健', goal: '低风险保守策略约束', section: 'final_trade_decision', icon: Shield, tone: 'amber' },
  { id: 'portfolio_manager', name: 'Portfolio Manager', label: '组合经理', goal: '综合裁决形成最终决策', section: 'final_trade_decision', icon: CheckCircle2, tone: 'teal' },
]

const REPORT_SECTION_TITLES: Record<SectionKey, string> = {
  market_report: '市场分析报告',
  sentiment_report: '舆情分析报告',
  news_report: '新闻分析报告',
  fundamentals_report: '基本面分析报告',
  macro_report: '宏观分析报告',
  smart_money_report: '主力资金分析报告',
  game_theory_report: '博弈裁判报告',
  investment_plan: '研究团队投资计划',
  trader_investment_plan: '交易员计划',
  final_trade_decision: '最终交易决策',
}

const REPORT_SEQUENCE: SectionKey[] = [
  'market_report',
  'sentiment_report',
  'news_report',
  'fundamentals_report',
  'macro_report',
  'smart_money_report',
  'game_theory_report',
  'investment_plan',
  'trader_investment_plan',
  'final_trade_decision',
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function getMarketLabel(symbol: string): string {
  if (symbol.endsWith('.SH')) return '沪市'
  if (symbol.endsWith('.SZ')) return '深市'
  if (symbol.endsWith('.BJ')) return '北交所'
  return '市场'
}

function createInitialAgentStatus(): Record<string, AgentStatus> {
  return AGENTS.reduce((acc, agent) => {
    acc[agent.id] = 'pending'
    return acc
  }, {} as Record<string, AgentStatus>)
}

function sectionFromReportName(report?: string | null): SectionKey | null {
  const normalized = (report || '').trim().toLowerCase()
  const map: Record<string, SectionKey> = {
    market_report: 'market_report',
    sentiment_report: 'sentiment_report',
    news_report: 'news_report',
    fundamentals_report: 'fundamentals_report',
    macro_report: 'macro_report',
    smart_money_report: 'smart_money_report',
    game_theory_report: 'game_theory_report',
    investment_plan: 'investment_plan',
    trader_investment_plan: 'trader_investment_plan',
    final_trade_decision: 'final_trade_decision',
  }
  return map[normalized] || null
}

function deriveQuoteFromData(
  symbol: string,
  fallbackName: string,
  kline: TradingApiKlineResponse | null,
  analysisResult: Record<string, any> | null,
  analysisRunning: boolean,
): SymbolQuote {
  const klineCandles = (kline?.candles || []).map((item, index) => ({
    date: item.date,
    time: index,
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
    volume: Number(item.volume ?? 0),
  }))

  const lastCandle = klineCandles[klineCandles.length - 1]
  const prevCandle = klineCandles[klineCandles.length - 2]
  const tradeDate = lastCandle?.date || null
  const name = analysisResult?.company_name || analysisResult?.name || fallbackName || symbol
  const marketLabel = analysisResult?.market_label || getMarketLabel(symbol)
  const lastPrice = lastCandle?.close ?? null
  const open = lastCandle?.open ?? null
  const high = lastCandle?.high ?? null
  const low = lastCandle?.low ?? null
  const volume = lastCandle?.volume ?? null
  const prevClose = prevCandle?.close ?? open
  const change = lastPrice != null && prevClose != null ? lastPrice - prevClose : null
  const changePercent = lastPrice != null && change != null && prevClose ? (change / prevClose) * 100 : null
  const direction = String(analysisResult?.direction || analysisResult?.decision || '').trim()
  const verdict = direction || (analysisRunning ? '分析中' : lastPrice != null ? (changePercent != null && changePercent >= 0 ? '看多' : '谨慎') : '待分析')
  const confidenceRaw = analysisResult?.confidence
  const confidence = typeof confidenceRaw === 'number' ? confidenceRaw : confidenceRaw != null ? Number(confidenceRaw) : null
  const targetPriceRaw = analysisResult?.target_price ?? analysisResult?.targetPrice
  const stopLossRaw = analysisResult?.stop_loss_price ?? analysisResult?.stopLoss
  const targetPrice = typeof targetPriceRaw === 'number' ? targetPriceRaw : targetPriceRaw != null ? Number(targetPriceRaw) : null
  const stopLoss = typeof stopLossRaw === 'number' ? stopLossRaw : stopLossRaw != null ? Number(stopLossRaw) : null
  const summary =
    analysisResult?.final_trade_decision ||
    analysisResult?.investment_plan ||
    analysisResult?.trader_investment_plan ||
    analysisResult?.market_report ||
    analysisResult?.summary ||
    (analysisRunning ? '分析正在进行中，等待后端返回结构化结论。' : '等待分析结果。')

  if (!lastCandle) {
    return buildMockQuote(symbol)
  }

  return {
    symbol,
    name,
    marketLabel,
    tradeDate,
    lastPrice,
    open,
    high,
    low,
    change,
    changePercent,
    volume,
    candles: klineCandles,
    verdict,
    confidence,
    targetPrice,
    stopLoss,
    summary,
  }
}

function buildMockQuote(symbol: string): SymbolQuote {
  const seed = hashString(symbol)
  const name = getDisplayName(symbol)
  const base = 20 + (seed % 220) / 3
  const direction = seed % 3 === 0 ? 1 : seed % 3 === 1 ? -1 : 1
  const change = direction * (((seed % 11) + 3) / 10)
  const lastPrice = base + change
  const open = lastPrice - change / 2
  const high = Math.max(open, lastPrice) + 0.9 + ((seed % 6) / 10)
  const low = Math.min(open, lastPrice) - 0.7 - ((seed % 5) / 10)
  const changePercent = (change / (lastPrice - change)) * 100
  const volume = 1.2e8 + (seed % 900) * 2.4e5
  const candles: CandlePoint[] = Array.from({ length: 30 }, (_, index) => {
    const drift = Math.sin((index + seed % 17) / 4) * 1.6 + Math.cos((index + seed % 13) / 7) * 0.9
    const openPrice = base + drift + index * 0.1
    const closePrice = openPrice + Math.sin((index + seed % 9) / 3) * 0.8 + ((index % 4) - 1.5) * 0.15
    const highPrice = Math.max(openPrice, closePrice) + 0.9 + ((index % 3) * 0.12)
    const lowPrice = Math.min(openPrice, closePrice) - 0.8 - ((index % 2) * 0.09)
    const date = new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return { date, time: index, open: openPrice, high: highPrice, low: lowPrice, close: closePrice, volume: 900000 + index * 24000 + (seed % 80000) }
  })

  const verdicts = ['看多', '中性', '谨慎']
  const verdict = verdicts[seed % verdicts.length]
  const confidence = 58 + (seed % 24)
  const targetPrice = lastPrice * (verdict === '看多' ? 1.09 : verdict === '谨慎' ? 1.04 : 1.06)
  const stopLoss = lastPrice * (verdict === '看多' ? 0.95 : verdict === '谨慎' ? 0.93 : 0.96)

  return {
    symbol,
    name,
    marketLabel: symbol.endsWith('.SH') ? '沪市' : symbol.endsWith('.SZ') ? '深市' : '北交所',
    tradeDate: candles[candles.length - 1]?.date || new Date().toISOString().slice(0, 10),
    lastPrice,
    open,
    high,
    low,
    change,
    changePercent,
    volume,
    candles,
    verdict,
    confidence,
    targetPrice,
    stopLoss,
    summary: verdict === '看多' ? '趋势偏强，量能温和放大，短线有延续动力。' : verdict === '谨慎' ? '估值与情绪分歧较大，建议等待确认信号。' : '方向分歧较明显，适合控制仓位并观察催化。',
  }
}

function statusClass(status: SectionStatus | AgentStatus): string {
  if (status === 'streaming' || status === 'in_progress') return 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
  if (status === 'complete' || status === 'completed') return 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
  return 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
}

function toneClasses(tone: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  }
  return map[tone] || map.slate
}

function createInitialSections(): Record<SectionKey, ReportSectionState> {
  return REPORT_SEQUENCE.reduce((acc, section) => {
    acc[section] = { status: 'pending', content: '' }
    return acc
  }, {} as Record<SectionKey, ReportSectionState>)
}

function createInitialMessages(symbol: string): ChatMessage[] {
  return [
    {
      id: `welcome-${symbol}`,
      role: 'assistant',
      content: '我是你的 A 股多智能体投研助手。直接告诉我你想分析的标的和日期。',
      timestamp: new Date().toISOString(),
    },
  ]
}

function localHistoryToReportSummary(item: LocalAnalysisHistoryRecord): TradingApiReportSummary {
  return {
    id: item.id,
    symbol: item.symbol,
    trade_date: item.tradeDate,
    decision: item.decision,
    direction: item.direction,
    confidence: item.confidence,
    target_price: item.targetPrice,
    stop_loss_price: item.stopLossPrice,
    status: 'completed',
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}

function reportSummaryToLocalHistory(report: TradingApiReportSummary): LocalAnalysisHistoryRecord {
  const now = new Date().toISOString()
  return {
    id: report.id,
    symbol: report.symbol,
    tradeDate: report.trade_date,
    decision: report.decision,
    direction: report.direction,
    confidence: report.confidence,
    targetPrice: report.target_price,
    stopLossPrice: report.stop_loss_price,
    createdAt: report.created_at || now,
    updatedAt: report.updated_at || report.created_at || now,
    summary: null,
    resultData: null,
  }
}

export function AnalysisRouteLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { leftCollapsed, rightCollapsed } = useWorkbenchChrome()
  const querySymbol = normalizeCnSymbol(searchParams.get('symbol') || '')
  const [selectedSymbol, setSelectedSymbol] = useState(querySymbol || '600519.SH')
  const [displaySymbol, setDisplaySymbol] = useState(querySymbol || '600519.SH')
  const [promptInput, setPromptInput] = useState('')
  const [leftSidebarTab, setLeftSidebarTab] = useState<'params' | 'history'>('params')
  const [rightView, setRightView] = useState<'chat' | 'sessions' | 'new' | 'history'>('chat')
  const [phaseIndex, setPhaseIndex] = useState(-1)
  const [streamingSection, setStreamingSection] = useState<SectionKey | null>(null)
  const [streamTick, setStreamTick] = useState(0)
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => createInitialMessages(querySymbol || '600519.SH'))
  const [sections, setSections] = useState<Record<SectionKey, ReportSectionState>>(() => createInitialSections())
  const [analysisResult, setAnalysisResult] = useState<Record<string, any> | null>(null)
  const [kline, setKline] = useState<TradingApiKlineResponse | null>(null)
  const [stockName, setStockName] = useState(() => getDisplayName(querySymbol || '600519.SH'))
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(() => createInitialAgentStatus())
  const [sessions, setSessions] = useState<AnalysisSession[]>(() => loadAnalysisSessions())
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  const [historyReports, setHistoryReports] = useState<TradingApiReportSummary[]>(() =>
    loadAnalysisHistory().map((item) => ({
      id: item.id,
      symbol: item.symbol,
      trade_date: item.tradeDate,
      decision: item.decision,
      direction: item.direction,
      confidence: item.confidence,
      target_price: item.targetPrice,
      stop_loss_price: item.stopLossPrice,
      status: 'completed',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    })),
  )
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoadedRemote, setHistoryLoadedRemote] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])
  const analysisAbortRef = useRef<AbortController | null>(null)
  const sessionSaveTimerRef = useRef<number | null>(null)
  const sectionFlushTimerRef = useRef<number | null>(null)
  const pendingSectionChunksRef = useRef<Partial<Record<SectionKey, { chunk: string; status: SectionStatus }>>>({})

  const quote = useMemo(() => deriveQuoteFromData(
    selectedSymbol,
    stockName || selectedSymbol,
    kline,
    analysisResult,
    analysisRunning,
  ), [selectedSymbol, stockName, kline, analysisResult, analysisRunning])
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )
  const progress = useMemo(() => {
    if (phaseIndex < 0) return 0
    const phaseBase = [8, 18, 30, 42, 54, 66, 76, 84, 92, 96][Math.max(0, phaseIndex)] ?? 0
    return Math.min(100, phaseBase + Math.min(streamTick, 12) * 1.2)
  }, [phaseIndex, streamTick])

  useEffect(() => {
    if (querySymbol) {
      setSelectedSymbol(querySymbol)
      setDisplaySymbol(querySymbol)
      setStockName(getDisplayName(querySymbol))
    }
  }, [querySymbol])

  useEffect(() => {
    let cancelled = false
    const loadStockMeta = async () => {
      setStockName(getDisplayName(selectedSymbol))
      try {
        const klineResult = await getTradingKline(selectedSymbol)
        if (cancelled) return
        setKline(klineResult)
      } catch {
        if (cancelled) return
        setKline(null)
      }
    }
    loadStockMeta()
    return () => {
      cancelled = true
    }
  }, [selectedSymbol])

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('symbol', selectedSymbol)
      return next
    }, { replace: true })
  }, [selectedSymbol, setSearchParams])

  useEffect(() => {
    if (!analysisRunning || !streamingSection) return undefined
    setStreamTick(0)
    const timer = window.setInterval(() => {
      setStreamTick((value) => (value >= 14 ? value : value + 1))
    }, 65)
    return () => window.clearInterval(timer)
  }, [analysisRunning, streamingSection])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  useEffect(() => () => {
    analysisAbortRef.current?.abort()
    if (sectionFlushTimerRef.current) {
      window.clearTimeout(sectionFlushTimerRef.current)
    }
    flushAnalysisSessionsSave()
  }, [])

  useEffect(() => {
    saveAnalysisSessions(sessions)
  }, [sessions])

  useEffect(() => {
    if (sessionSaveTimerRef.current) {
      window.clearTimeout(sessionSaveTimerRef.current)
    }
    sessionSaveTimerRef.current = window.setTimeout(() => {
      const currentCreatedAt = activeSession?.createdAt || new Date().toISOString()
      const nextSession: AnalysisSession = {
        id: activeSessionId,
        title: summarizeSessionTitle(messages as AnalysisSessionMessage[], selectedSymbol),
        symbol: selectedSymbol,
        createdAt: currentCreatedAt,
        updatedAt: new Date().toISOString(),
        messages: messages.map((message) => ({ ...message })),
        reportSummary: quote.summary,
      }
      setSessions((prev) => upsertSession(prev, nextSession))
    }, 300)

    return () => {
      if (sessionSaveTimerRef.current) {
        window.clearTimeout(sessionSaveTimerRef.current)
      }
    }
  }, [activeSession?.createdAt, activeSessionId, messages, quote.summary, selectedSymbol])

  useEffect(() => {
    if (rightView !== 'history' && leftSidebarTab !== 'history') return
    if (historyLoadedRemote || historyLoading) return
    let cancelled = false
    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const response = await getTradingReports(undefined, 0, 20)
        if (cancelled) return
        setHistoryReports(response.reports)
        saveAnalysisHistory(response.reports.map(reportSummaryToLocalHistory))
      } catch (error) {
        if (cancelled) return
        const fallback = loadAnalysisHistory().map(localHistoryToReportSummary)
        if (fallback.length > 0) {
          setHistoryReports(fallback)
          setHistoryError('后端分析历史暂不可用，已显示本地缓存。')
        } else {
          setHistoryError(error instanceof Error ? error.message : '加载分析历史失败')
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false)
          setHistoryLoadedRemote(true)
        }
      }
    }
    loadHistory()
    return () => {
      cancelled = true
    }
  }, [historyLoadedRemote, historyLoading, rightView, leftSidebarTab])

  const refreshReportHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await getTradingReports(undefined, 0, 20)
      setHistoryReports(response.reports)
      saveAnalysisHistory(response.reports.map(reportSummaryToLocalHistory))
      setHistoryLoadedRemote(true)
    } catch (error) {
      const fallback = loadAnalysisHistory().map(localHistoryToReportSummary)
      if (fallback.length > 0) {
        setHistoryReports(fallback)
        setHistoryError('后端分析历史暂不可用，已显示本地缓存。')
      } else {
        setHistoryError(error instanceof Error ? error.message : '加载分析历史失败')
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const pushMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => prev.concat({
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    }))
  }

  const flushQueuedSectionChunks = (immediate = false) => {
    const flush = () => {
      sectionFlushTimerRef.current = null
      const pending = pendingSectionChunksRef.current
      const entries = Object.entries(pending) as Array<[SectionKey, { chunk: string; status: SectionStatus }]>
      if (!entries.length) return
      pendingSectionChunksRef.current = {}
      setSections((prev) => {
        const next = { ...prev }
        entries.forEach(([section, payload]) => {
          const current = next[section]?.content || ''
          next[section] = {
            status: payload.status,
            content: current + payload.chunk,
          }
        })
        return next
      })
    }

    if (immediate) {
      if (sectionFlushTimerRef.current) {
        window.clearTimeout(sectionFlushTimerRef.current)
      }
      flush()
      return
    }

    if (sectionFlushTimerRef.current) return
    sectionFlushTimerRef.current = window.setTimeout(flush, 120)
  }

  const queueSectionChunk = (section: SectionKey, status: SectionStatus, chunk: string) => {
    const current = pendingSectionChunksRef.current[section]
    pendingSectionChunksRef.current[section] = {
      status,
      chunk: `${current?.chunk || ''}${chunk}`,
    }
    flushQueuedSectionChunks()
  }

  const resetQueuedSectionChunks = () => {
    pendingSectionChunksRef.current = {}
    if (sectionFlushTimerRef.current) {
      window.clearTimeout(sectionFlushTimerRef.current)
      sectionFlushTimerRef.current = null
    }
  }

  const setAgentStatusByName = (name: string | undefined, status: AgentStatus) => {
    const agent = AGENTS.find((item) => item.name === name)
    if (!agent) return
    setAgentStatuses((prev) => ({ ...prev, [agent.id]: status }))
  }

  const setAllSectionsCompleteFromResult = (result: Record<string, any>) => {
    setSections((prev) => {
      const next = { ...prev }
      REPORT_SEQUENCE.forEach((section) => {
        const value = result[section]
        if (typeof value === 'string' && value.trim()) {
          next[section] = { status: 'complete', content: value }
        } else if (!next[section].content) {
          next[section] = { status: 'complete', content: '' }
        }
      })
      return next
    })
  }

  const applyStreamEvent = (evt: TradingApiStreamEvent) => {
    const data = evt.data || {}
    switch (evt.event) {
      case 'job.ready':
        pushMessage('system', '分析任务已进入队列，正在等待后端解析。')
        break
      case 'job.created': {
        const symbol = normalizeCnSymbol(String(data.symbol || selectedSymbol))
        if (symbol) setSelectedSymbol(symbol)
        pushMessage('system', `已创建任务：${symbol || '未知标的'}。`)
        break
      }
      case 'job.running':
        setAnalysisRunning(true)
        pushMessage('system', '分析引擎已启动。')
        break
      case 'agent.snapshot':
        if (Array.isArray(data.agents)) {
          setAgentStatuses((prev) => {
            const next = { ...prev }
            data.agents.forEach((item: any) => {
              const agent = AGENTS.find((entry) => entry.name === item.agent)
              if (agent && item.status) {
                next[agent.id] = item.status
              }
            })
            return next
          })
        }
        break
      case 'agent.status':
        setAgentStatusByName(data.agent, data.status)
        break
      case 'agent.milestone':
        if (data.summary) pushMessage('system', `${data.title || data.stage || '阶段'}：${data.summary}`)
        break
      case 'agent.tool_call':
        if (data.description) {
          pushMessage('system', data.description)
        }
        if (data.report) {
          const section = sectionFromReportName(data.report)
          if (section) setStreamingSection(section)
        }
        break
      case 'agent.writing': {
        const section = sectionFromReportName(data.report)
        if (section) {
          setStreamingSection(section)
          setPhaseIndex((prev) => Math.max(prev, REPORT_SEQUENCE.indexOf(section)))
        }
        break
      }
      case 'agent.report.chunk': {
        const section = sectionFromReportName(data.section)
        if (section && typeof data.chunk === 'string') {
          queueSectionChunk(section, data.is_complete ? 'complete' : 'streaming', data.chunk)
          setStreamingSection(section)
          setPhaseIndex((prev) => Math.max(prev, REPORT_SEQUENCE.indexOf(section)))
          if (data.is_complete) {
            flushQueuedSectionChunks(true)
          }
        }
        break
      }
      case 'job.completed': {
      flushQueuedSectionChunks(true)
      const result = (data.result || {}) as Record<string, any>
      setAnalysisResult(result)
        const now = new Date().toISOString()
        const localRecord: LocalAnalysisHistoryRecord = {
          id: String(result.id || `local-${selectedSymbol}-${Date.now()}`),
          symbol: String(result.symbol || selectedSymbol),
          tradeDate: String(result.trade_date || new Date().toISOString().slice(0, 10)),
          decision: result.decision || data.decision || null,
          direction: result.direction || data.direction || null,
          confidence:
            typeof result.confidence === 'number'
              ? result.confidence
              : Number(result.confidence ?? data.confidence ?? null),
          targetPrice:
            typeof result.target_price === 'number'
              ? result.target_price
              : Number(result.target_price ?? data.target_price ?? null),
          stopLossPrice:
            typeof result.stop_loss_price === 'number'
              ? result.stop_loss_price
              : Number(result.stop_loss_price ?? data.stop_loss_price ?? null),
          createdAt: now,
          updatedAt: now,
          summary: String(result.final_trade_decision || result.investment_plan || result.market_report || '分析完成'),
          resultData: result,
        }
        saveAnalysisHistory(upsertAnalysisHistory(loadAnalysisHistory(), localRecord))
        setHistoryReports((prev) => {
          const next = upsertAnalysisHistory(
            prev.map(reportSummaryToLocalHistory),
            localRecord,
          )
          return next.map(localHistoryToReportSummary)
        })
        if (result.symbol) {
          const normalizedSymbol = normalizeCnSymbol(String(result.symbol))
          setSelectedSymbol(normalizedSymbol)
          setDisplaySymbol(normalizedSymbol)
        }
        setAllSectionsCompleteFromResult(result)
        setPhaseIndex(9)
        setStreamingSection(null)
        setAnalysisRunning(false)
        const decision = String(data.decision || result.decision || result.direction || '完成')
        pushMessage('assistant', `分析完成：${decision}。置信度 ${formatNumber(data.confidence ?? result.confidence, 0)}%，目标价 ${formatNumber(data.target_price ?? result.target_price)}，止损参考 ${formatNumber(data.stop_loss_price ?? result.stop_loss_price)}。`)
        break
      }
      case 'job.failed':
        flushQueuedSectionChunks(true)
        setAnalysisRunning(false)
        setStreamingSection(null)
        pushMessage('assistant', `分析失败：${String(data.error || '未知错误')}`)
        break
      default:
        break
    }
  }

  const runAnalysis = async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    analysisAbortRef.current?.abort()
    resetQueuedSectionChunks()
    const controller = new AbortController()
    analysisAbortRef.current = controller

    const symbol = extractCnSymbol(trimmed) || normalizeCnSymbol(selectedSymbol)
    setSelectedSymbol(symbol)
    setDisplaySymbol(symbol)
    setAnalysisResult(null)
    setAnalysisRunning(true)
    setPhaseIndex(-1)
    setStreamTick(0)
    setStreamingSection(null)
    setSections(createInitialSections())
    setAgentStatuses(createInitialAgentStatus())
    setMessages([
      ...createInitialMessages(symbol),
      { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date().toISOString() },
      { id: `assistant-${Date.now()}`, role: 'assistant', content: '正在启动 TradingAPI 分析引擎…', timestamp: new Date().toISOString() },
    ])
    setRightView('chat')

    try {
      const customPrompt = getCustomAnalysisPrompt()
      const analysisMessage = [
        `标的：${symbol}${stockName ? `（${stockName}）` : ''}`,
        customPrompt ? `附加偏好：${customPrompt}` : '',
        trimmed,
      ]
        .filter(Boolean)
        .join('\n')
      await streamTradingAnalysis({
        messages: [{ role: 'user', content: analysisMessage }],
        selectedAnalysts: getDefaultAnalysisAnalysts(),
        signal: controller.signal,
        onEvent: applyStreamEvent,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setAnalysisRunning(false)
      setStreamingSection(null)
      pushMessage('assistant', `分析请求失败：${(error as Error).message}`)
    }
  }

  const startNewSession = () => {
    analysisAbortRef.current?.abort()
    resetQueuedSectionChunks()
    const nextSession = createAnalysisSession(selectedSymbol, `${selectedSymbol} 新会话`)
    setActiveSessionId(nextSession.id)
    setSessions((prev) => upsertSession(prev, nextSession))
    setRightView('chat')
    setDisplaySymbol(selectedSymbol)
    setAnalysisRunning(false)
    setPhaseIndex(-1)
    setStreamTick(0)
    setStreamingSection(null)
    setSections(createInitialSections())
    setAgentStatuses(createInitialAgentStatus())
    setAnalysisResult(null)
    setKline(null)
    setMessages(createInitialMessages(selectedSymbol))
  }

  const loadSession = (session: AnalysisSession) => {
    analysisAbortRef.current?.abort()
    resetQueuedSectionChunks()
    const nextSymbol = normalizeCnSymbol(session.symbol || selectedSymbol)
    setActiveSessionId(session.id)
    setSelectedSymbol(nextSymbol)
    setDisplaySymbol(nextSymbol)
    setMessages(
      session.messages.length
        ? session.messages.map((message) => ({
            id: message.id,
            role: message.role === 'report' ? 'assistant' : message.role,
            content: message.content,
            timestamp: message.timestamp,
          }))
        : createInitialMessages(nextSymbol),
    )
    setAnalysisRunning(false)
    setPhaseIndex(-1)
    setStreamTick(0)
    setStreamingSection(null)
    setSections(createInitialSections())
    setAgentStatuses(createInitialAgentStatus())
    setAnalysisResult(null)
    setKline(null)
    setRightView('chat')
  }

  const openHistoryReport = async (reportId: string) => {
    resetQueuedSectionChunks()
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const detail = await getTradingReport(reportId)
      const nextSymbol = normalizeCnSymbol(detail.symbol)
      setSelectedSymbol(nextSymbol)
      setDisplaySymbol(nextSymbol)
      setAnalysisResult(detail as unknown as Record<string, any>)
      setRightView('chat')
      setAnalysisRunning(false)
      setPhaseIndex(-1)
      setStreamTick(0)
      setStreamingSection(null)
      setSections(createInitialSections())
      setAgentStatuses(createInitialAgentStatus())
      setMessages([
        ...createInitialMessages(nextSymbol),
        {
          id: `history-${detail.id}`,
          role: 'assistant',
          content: `已打开历史分析 ${detail.symbol} · ${detail.trade_date}\n\n方向：${detail.direction || '未知'}\n决策：${detail.decision || '未知'}\n置信度：${detail.confidence ?? '--'}%`,
          timestamp: new Date().toISOString(),
        },
      ])
      saveAnalysisHistory(upsertAnalysisHistory(loadAnalysisHistory(), {
        id: detail.id,
        symbol: detail.symbol,
        tradeDate: detail.trade_date,
        decision: detail.decision,
        direction: detail.direction,
        confidence: detail.confidence,
        targetPrice: detail.target_price,
        stopLossPrice: detail.stop_loss_price,
        createdAt: detail.created_at || new Date().toISOString(),
        updatedAt: detail.updated_at || detail.created_at || new Date().toISOString(),
        summary: detail.final_trade_decision || detail.market_report || null,
        resultData: detail.result_data || null,
      }))
    } catch (error) {
      const fallback = loadAnalysisHistory().find((item) => item.id === reportId)
      if (fallback) {
        const nextSymbol = normalizeCnSymbol(fallback.symbol)
        setSelectedSymbol(nextSymbol)
        setDisplaySymbol(nextSymbol)
        setAnalysisResult(fallback.resultData || null)
        setRightView('chat')
        setAnalysisRunning(false)
        setPhaseIndex(-1)
        setStreamTick(0)
        setStreamingSection(null)
        setSections(createInitialSections())
        setAgentStatuses(createInitialAgentStatus())
        setMessages([
          ...createInitialMessages(nextSymbol),
          {
            id: `history-${fallback.id}`,
            role: 'assistant',
            content: `已打开本地缓存的历史分析 ${fallback.symbol} · ${fallback.tradeDate}\n\n方向：${fallback.direction || '未知'}\n决策：${fallback.decision || '未知'}\n置信度：${fallback.confidence ?? '--'}%`,
            timestamp: new Date().toISOString(),
          },
        ])
        setHistoryError('后端历史暂不可用，已打开本地缓存。')
      } else {
        setHistoryError(error instanceof Error ? error.message : '打开历史报告失败')
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSendPrompt = () => {
    const prompt = promptInput.trim()
    if (!prompt) return
    setPromptInput('')
    runAnalysis(prompt)
  }

  const activeReportSections = REPORT_SEQUENCE.map((section) => ({
    key: section,
    title: REPORT_SECTION_TITLES[section],
    ...sections[section],
  }))

  return (
    <WorkbenchLayout
      className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_32%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_32%,_#0f172a_100%)]"
      leftPanelId="analysis-left"
      mainPanelId="analysis-main"
      rightPanelId="analysis-right"
      leftMinPx={280}
      leftMaxPx={460}
      rightMinPx={320}
      rightMaxPx={460}
      leftSidebarVisible={!leftCollapsed}
      rightSidebarVisible={!rightCollapsed}
      left={
        <AnalysisLeftPanel
          selectedSymbol={selectedSymbol}
          onAnalyze={runAnalysis}
          onSelectSymbol={(symbol) => setSelectedSymbol(symbol)}
          analysisRunning={analysisRunning}
          leftTab={leftSidebarTab}
          onLeftTabChange={setLeftSidebarTab}
          reportHistory={historyReports}
          reportHistoryLoading={historyLoading}
          reportHistoryError={historyError}
          onRefreshHistory={refreshReportHistory}
          onOpenHistoryReport={async (reportId) => {
            await openHistoryReport(reportId)
            setLeftSidebarTab('params')
          }}
        />
      }
      main={
        <AnalysisCenterPanel
          quote={quote}
          phaseIndex={phaseIndex}
          progress={progress}
          streamingSection={streamingSection}
          streamTick={streamTick}
          activeReportSections={activeReportSections}
          agentStatuses={agentStatuses}
          analysisResult={analysisResult}
          prefetchedKline={displaySymbol === selectedSymbol ? kline : null}
          displaySymbol={displaySymbol}
          selectedSymbol={selectedSymbol}
          setDisplaySymbol={setDisplaySymbol}
        />
      }
      right={
        <AnalysisChatPanel
          rightView={rightView}
          onRightViewChange={setRightView}
          messages={messages}
          promptInput={promptInput}
          onPromptInput={setPromptInput}
          onSend={handleSendPrompt}
          onPreset={(prompt) => runAnalysis(prompt)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onLoadSession={loadSession}
          onNewSession={startNewSession}
          reportHistory={historyReports}
          reportHistoryLoading={historyLoading}
          reportHistoryError={historyError}
          onOpenHistoryReport={openHistoryReport}
        />
      }
    />
  )
}

function reportHistoryStatusTone(status?: string | null) {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'success') {
    return 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-500/10'
  }
  if (s === 'failed' || s === 'error') {
    return 'border-rose-200 text-rose-700 bg-rose-50 dark:border-rose-500/20 dark:text-rose-300 dark:bg-rose-500/10'
  }
  if (s === 'running' || s === 'pending') {
    return 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-500/20 dark:text-amber-300 dark:bg-amber-500/10'
  }
  return 'border-slate-200 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/60'
}

function AnalysisLeftPanel({
  selectedSymbol,
  onAnalyze,
  onSelectSymbol,
  analysisRunning,
  leftTab,
  onLeftTabChange,
  reportHistory,
  reportHistoryLoading,
  reportHistoryError,
  onRefreshHistory,
  onOpenHistoryReport,
}: {
  selectedSymbol: string
  onAnalyze: (prompt: string) => void
  onSelectSymbol: (symbol: string) => void
  analysisRunning: boolean
  leftTab: 'params' | 'history'
  onLeftTabChange: (tab: 'params' | 'history') => void
  reportHistory: TradingApiReportSummary[]
  reportHistoryLoading: boolean
  reportHistoryError: string | null
  onRefreshHistory: () => void | Promise<void>
  onOpenHistoryReport: (id: string) => void | Promise<void>
}) {
  const [manualSymbol, setManualSymbol] = useState(selectedSymbol)
  useEffect(() => setManualSymbol(selectedSymbol), [selectedSymbol])

  const handleAnalyze = () => {
    const raw = (manualSymbol || selectedSymbol).trim()
    const sym = normalizeCnSymbol(raw) || raw
    onSelectSymbol(sym)
    setManualSymbol(sym)
    onAnalyze(`分析 ${sym} 今日走势`)
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#fbfcfd] dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-4 dark:border-slate-800">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">分析历史记录</h2>
        <div className="mt-3 flex rounded-xl bg-slate-200/50 p-1 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => onLeftTabChange('params')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              leftTab === 'params'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            参数配置
          </button>
          <button
            type="button"
            onClick={() => onLeftTabChange('history')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              leftTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            历史列表
          </button>
        </div>
      </div>

      {leftTab === 'params' ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <Activity size={12} />
                <span>{analysisRunning ? '分析中' : '待分析'}</span>
              </div>
            </div>

            <section className="space-y-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">标的代码</label>
              <Input
                value={manualSymbol}
                onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyze()
                }}
                className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="600519.SH"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">支持 A股、港股、美股标的</p>
            </section>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analysisRunning}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-md transition-colors',
                analysisRunning
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
              )}
            >
              {analysisRunning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {analysisRunning ? '分析中...' : '开始分析'}
            </button>

            <Separator className="bg-slate-200/80 dark:bg-slate-800" />

            <div>
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">自选列表</div>
                <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">点击即可发起分析</div>
              </div>
              <div className="space-y-3">
                {WATCHLIST.map((item) => {
                  const active = item.symbol === selectedSymbol
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        onSelectSymbol(item.symbol)
                        setManualSymbol(item.symbol)
                        onAnalyze(`分析 ${item.symbol} 今日走势`)
                      }}
                      className={cn(
                        'w-full rounded-[20px] border px-4 py-3.5 text-left transition-all',
                        active
                          ? 'border-blue-400 bg-blue-50/75 shadow-[0_4px_12px_rgba(59,130,246,0.10)] dark:bg-blue-500/10'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{item.symbol}</div>
                          <div className="mt-1 text-[12.5px] text-slate-600 dark:text-slate-300">{item.name}</div>
                          <div className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">{item.note}</div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-300">
                          分析 <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">历史记录</div>
              <button
                type="button"
                onClick={() => void onRefreshHistory()}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                刷新
              </button>
            </div>

            {reportHistoryError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {reportHistoryError}
              </div>
            ) : null}

            {reportHistoryLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在加载历史...
              </div>
            ) : null}

            {!reportHistoryLoading && reportHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                暂无分析历史。完成一次分析后，会显示服务端或本地缓存的报告。
              </div>
            ) : null}

            <div className="space-y-2">
              {reportHistory.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => void onOpenHistoryReport(report.id)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{report.symbol}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {(report.trade_date || '').slice(0, 10)} · {report.decision || '未知决策'} · {report.direction || '未知方向'}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {report.target_price != null ? `目标价 ${formatNumber(report.target_price)} · ` : ''}
                        {report.stop_loss_price != null ? `止损 ${formatNumber(report.stop_loss_price)} · ` : ''}
                        {report.confidence != null ? `置信度 ${formatNumber(report.confidence, 0)}%` : '暂无置信度'}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]',
                          reportHistoryStatusTone(report.status),
                        )}
                      >
                        {report.status || '完成'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </aside>
  )
}

function AnalysisCenterPanel({
  quote,
  phaseIndex,
  progress,
  streamingSection,
  streamTick,
  activeReportSections,
  agentStatuses,
  analysisResult,
  prefetchedKline,
  displaySymbol,
  selectedSymbol,
  setDisplaySymbol,
}: {
  quote: SymbolQuote
  phaseIndex: number
  progress: number
  streamingSection: SectionKey | null
  streamTick: number
  activeReportSections: Array<{ key: SectionKey; title: string; status: SectionStatus; content: string }>
  agentStatuses: Record<string, AgentStatus>
  analysisResult: Record<string, any> | null
  prefetchedKline: TradingApiKlineResponse | null
  displaySymbol: string
  selectedSymbol: string
  setDisplaySymbol: (symbol: string) => void
}) {
  const renderedContent = (content: string, status: SectionStatus) => {
    if (status !== 'streaming' || !streamingSection) return content
    const visibleCount = Math.max(24, Math.floor(content.length * Math.min(1, 0.18 + streamTick * 0.06)))
    return content.slice(0, visibleCount)
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4 lg:p-5 space-y-4">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-5 lg:p-6">
          <div className="h-[360px] lg:h-[420px]">
          <TradingKlinePanel symbol={displaySymbol} analysisSymbol={selectedSymbol} onSymbolChange={setDisplaySymbol} prefetchedKline={prefetchedKline} managedExternally={displaySymbol === selectedSymbol} />
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">TradingAgents 协同研判台</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">15 席位 · 5 阶段串行流水线 · 分析团队并行产出</p>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>{phaseIndex < 0 ? '0 / 10' : `${Math.min(phaseIndex + 1, 10)} / 10`}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                ⚡ {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 lg:p-6 space-y-5">
          {[
            { title: '分析团队', cols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', ids: ['market', 'social', 'news', 'fundamentals', 'macro', 'smart_money'] },
            { title: '博弈裁判', cols: 'grid-cols-1', ids: ['game_theory'] },
            { title: '多空辩论', cols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', ids: ['bull', 'bear', 'research_manager'] },
            { title: '交易执行', cols: 'grid-cols-1', ids: ['trader'] },
            { title: '风控裁决', cols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4', ids: ['aggressive', 'neutral', 'conservative', 'portfolio_manager'] },
          ].map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold">1</span>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">{group.title}</h4>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className={`grid ${group.cols} gap-3`}>
                {AGENTS.filter((agent) => group.ids.includes(agent.id)).map((agent) => {
                  const Icon = agent.icon
                  const status = agentStatuses[agent.id]
                  return (
                    <div key={agent.id} className={`rounded-3xl border p-4 transition-all ${statusClass(status)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${toneClasses(agent.tone)}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{agent.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{agent.goal}</div>
                          </div>
                        </div>
                        <span className={`text-[11px] px-2 py-1 rounded-full border ${statusClass(status)}`}>{status === 'in_progress' ? '分析中' : status === 'completed' ? '完成' : '待命'}</span>
                      </div>
                      <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {status === 'completed'
                          ? (activeReportSections.find((item) => item.key === (agent.section || 'market_report'))?.content || '已完成，等待结构化内容。')
                          : status === 'in_progress'
                            ? '智能体正在输出分析结论，页面将持续刷新。'
                            : '等待轮到该席位。'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-4">
        <DecisionSummaryCard
          symbol={quote.symbol}
          name={quote.name}
          verdict={quote.verdict}
          confidence={quote.confidence}
          targetPrice={quote.targetPrice}
          stopLoss={quote.stopLoss}
          reasoning={String(analysisResult?.final_trade_decision || analysisResult?.investment_plan || quote.summary || '')}
        />
        <RiskRadarCard items={analysisResult?.risk_items as Array<{ name: string; level: 'low' | 'medium' | 'high'; description?: string }> | undefined} />
        <KeyMetricsCard items={analysisResult?.key_metrics as Array<{ name: string; value: string; status: 'good' | 'neutral' | 'bad' }> | undefined} quote={quote} />
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">研报输出</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">分析过程中会逐段刷新，保留 TradingAgents 的实时输出感觉。</p>
        </div>
        <div className="p-5 lg:p-6 space-y-3">
          {activeReportSections.map((section) => (
            <div key={section.key} className={`rounded-3xl border p-4 transition-all ${section.status === 'streaming' ? 'border-blue-300 bg-blue-50/70 dark:bg-blue-500/10' : section.status === 'complete' ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10' : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'}`}>
              <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">{section.status === 'streaming' ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <CheckCircle2 className={`w-4 h-4 ${section.status === 'complete' ? 'text-emerald-500' : 'text-slate-400'}`} />}</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{section.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{section.status === 'streaming' ? '实时生成中' : section.status === 'complete' ? '已完成' : '等待生成'}</div>
                    </div>
                  </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full border ${statusClass(section.status)}`}>{section.status === 'streaming' ? '生成中' : section.status === 'complete' ? '完成' : '待命'}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-line">{renderedContent(section.content, section.status) || '等待模型输出...'}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}

function DecisionSummaryCard({
  symbol,
  name,
  verdict,
  confidence,
  targetPrice,
  stopLoss,
  reasoning,
}: {
  symbol: string
  name: string
  verdict: string
  confidence: number | null
  targetPrice: number | null
  stopLoss: number | null
  reasoning: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-950 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <Target className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-950 dark:text-slate-50">{name}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{symbol}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
          {verdict}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          置信度 <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(confidence, 0)}%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <div className="text-xs text-slate-500">目标价</div>
          <div className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{targetPrice != null ? `¥${formatNumber(targetPrice)}` : '--'}</div>
        </div>
        <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
          <div className="text-xs text-slate-500">止损价</div>
          <div className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{stopLoss != null ? `¥${formatNumber(stopLoss)}` : '--'}</div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? '收起' : '详情'}
        </button>
        {expanded && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {reasoning || '等待完整决策输出。'}
          </div>
        )}
      </div>
    </div>
  )
}

function RiskRadarCard({
  items,
}: {
  items?: Array<{ name: string; level: 'low' | 'medium' | 'high'; description?: string }>
}) {
  const list = items ?? []
  const levelConfig = {
    high: { color: 'text-rose-400', bg: 'bg-rose-500/20', label: '高风险' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: '中风险' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: '低风险' },
  }
  return (
    <div className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-500/20">
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">风险雷达</h3>
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Shield className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">分析完成后展示风险评估</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((risk, index) => {
            const config = levelConfig[risk.level]
            return (
              <div key={`${risk.name}-${index}`} className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-700 dark:text-slate-300 block truncate">{risk.name}</span>
                  {risk.description && <span className="text-xs text-slate-500 mt-0.5 block line-clamp-2">{risk.description}</span>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${config.color} ${config.bg}`}>
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KeyMetricsCard({
  items,
  quote,
}: {
  items?: Array<{ name: string; value: string; status: 'good' | 'neutral' | 'bad' }>
  quote: SymbolQuote
}) {
  const list = items ?? []
  return (
    <div className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-500/20">
          <BarChart3 className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">关键指标速览</h3>
      </div>
      {list.length === 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/30">
            <span className="text-sm text-slate-400">收盘</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatNumber(quote.lastPrice)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/30">
            <span className="text-sm text-slate-400">高/低</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatNumber(quote.high)} / {formatNumber(quote.low)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400">目标价</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatNumber(quote.targetPrice)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/30 last:border-0">
              <span className="text-sm text-slate-400">{metric.name}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{metric.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalysisChatPanel({
  rightView,
  onRightViewChange,
  messages,
  promptInput,
  onPromptInput,
  onSend,
  onPreset,
  sessions,
  activeSessionId,
  onLoadSession,
  onNewSession,
  reportHistory,
  reportHistoryLoading,
  reportHistoryError,
  onOpenHistoryReport,
}: {
  rightView: 'chat' | 'sessions' | 'new' | 'history'
  onRightViewChange: (value: 'chat' | 'sessions' | 'new' | 'history') => void
  messages: ChatMessage[]
  promptInput: string
  onPromptInput: (value: string) => void
  onSend: () => void
  onPreset: (prompt: string) => void
  sessions: AnalysisSession[]
  activeSessionId: string
  onLoadSession: (session: AnalysisSession) => void
  onNewSession: () => void
  reportHistory: TradingApiReportSummary[]
  reportHistoryLoading: boolean
  reportHistoryError: string | null
  onOpenHistoryReport: (reportId: string) => void
}) {
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const [analystExpanded, setAnalystExpanded] = useState(true)
  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const tabButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
    }`

  return (
    <aside className="h-full rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRightViewChange('chat')}
            className={tabButtonClass(rightView === 'chat')}
          >
            <Bot className="w-4 h-4" />
            会话
          </button>
          <button
            type="button"
            onClick={() => onRightViewChange('sessions')}
            className={tabButtonClass(rightView === 'sessions')}
          >
            <History className="w-4 h-4" />
            会话历史
          </button>
          <button
            type="button"
            onClick={() => onRightViewChange('new')}
            className={tabButtonClass(rightView === 'new')}
          >
            <PlusCircle className="w-4 h-4" />
            添加新会话
          </button>
          <button
            type="button"
            onClick={() => onRightViewChange('history')}
            className={tabButtonClass(rightView === 'history')}
          >
            <BarChart3 className="w-4 h-4" />
            分析历史
          </button>
        </div>
      </div>

      {rightView === 'chat' && (
        <>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold">智能分析</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">支持实时追问与继续分析</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="text-sm font-semibold mb-3">示例</div>
            <div className="space-y-2">
              {PRESET_PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => onPreset(prompt)} className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:border-blue-300 transition-colors">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAnalystExpanded((value) => !value)}
              className="w-full flex items-center justify-between rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4" />
                分析类型（6/6）
              </span>
              {analystExpanded ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
            </button>
            {analystExpanded && (
              <div className="mt-3 space-y-2">
                {ANALYST_PROMPTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPreset(`分析 ${item.label}`)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-left hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors"
                  >
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
            {reportHistoryLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在加载报告卡片...
              </div>
            ) : reportHistory.slice(0, 3).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => onOpenHistoryReport(report.id)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 px-3 py-2.5 text-left hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{report.symbol}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {report.trade_date} · {report.direction || '未知方向'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>

          <div ref={messageListRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 whitespace-pre-line shadow-sm ${message.role === 'user' ? 'bg-blue-600 text-white' : message.role === 'assistant' ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-500/20'}`}>{message.content}</div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                <textarea value={promptInput} onChange={(e) => onPromptInput(e.target.value)} placeholder="直接描述你的分析需求..." rows={3} className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-slate-400" />
              </div>
              <button onClick={onSend} className="shrink-0 inline-flex items-center gap-2 rounded-3xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-600/25">
                <Send className="w-4 h-4" />
                发送
              </button>
            </div>
          </div>
        </>
      )}

      {rightView === 'sessions' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">会话历史</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">本地保存的对话记录，下次可直接回看</div>
              </div>
              <button
                type="button"
                onClick={onNewSession}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm font-semibold shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                添加新会话
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-5 text-sm text-slate-500 dark:text-slate-400">
                暂无会话，点击“添加新会话”开始一轮分析。
              </div>
            ) : sessions.map((session) => {
              const active = session.id === activeSessionId
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onLoadSession(session)}
                  className={`w-full text-left rounded-3xl border px-4 py-3 transition-all ${
                    active
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-200 dark:hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{session.title}</span>
                        {active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white">当前</span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {session.symbol || '未知标的'} · {new Date(session.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {session.reportSummary && (
                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{session.reportSummary}</div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {rightView === 'new' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">添加新会话</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">会话会保存到本地浏览器，下次仍可回看</div>
              </div>
              <PlusCircle className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 p-5">
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">开始一个新的分析上下文</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              点击下方按钮后，会清空当前对话区并创建一个新的本地会话。中间的分析工作区不会受影响。
            </p>
            <button
              type="button"
              onClick={onNewSession}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              创建并进入新会话
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">提示</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-6">
              你可以先在这里创建新会话，再回到“会话”页继续输入分析需求。
            </div>
          </div>
        </div>
      )}

      {rightView === 'history' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">分析历史</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">来自 SQLite 的报告记录，可直接回看历史分析结果</div>
              </div>
              <History className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {reportHistoryError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {reportHistoryError}
            </div>
          )}

          {reportHistoryLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              正在加载历史分析...
            </div>
          ) : reportHistory.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-5 text-sm text-slate-500 dark:text-slate-400">
              暂无分析历史。完成一次分析后，这里会显示 SQLite 中的报告列表。
            </div>
          ) : (
            <div className="space-y-2">
              {reportHistory.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onOpenHistoryReport(report.id)}
                  className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {report.symbol}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {report.trade_date} · {report.decision || '未知决策'} · {report.direction || '未知方向'}
                      </div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {report.target_price != null ? `目标价 ${formatNumber(report.target_price)} · ` : ''}
                        {report.stop_loss_price != null ? `止损 ${formatNumber(report.stop_loss_price)} · ` : ''}
                        {report.confidence != null ? `置信度 ${formatNumber(report.confidence, 0)}%` : '暂无置信度'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
