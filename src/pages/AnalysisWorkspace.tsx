import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CandlestickChart,
  ChevronDown,
  Loader2,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Shield,
  LineChart,
  Newspaper,
  Calculator,
  DollarSign,
  BarChart3,
  Briefcase,
  Scale,
  Flame,
  CheckCircle2,
  Search,
  Send,
  CircleDot,
  Target,
} from 'lucide-react'
import { extractCnSymbol, normalizeCnSymbol } from '@/lib/symbols'

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

interface SymbolQuote {
  symbol: string
  name: string
  marketLabel: string
  lastPrice: number
  open: number
  high: number
  low: number
  change: number
  changePercent: number
  volume: number
  candles: CandlePoint[]
  verdict: string
  confidence: number
  targetPrice: number
  stopLoss: number
  summary: string
}

interface CandlePoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
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

const WATCHLIST = [
  { symbol: '600519.SH', name: '贵州茅台', note: '白酒龙头，稳态观察' },
  { symbol: '601318.SH', name: '中国平安', note: '金融权重，等待催化' },
  { symbol: '300750.SZ', name: '宁德时代', note: '新能源核心，波动较高' },
  { symbol: '000001.SH', name: '上证指数', note: '大盘风向标' },
]

const MARKET_TABS = [
  { symbol: '000001.SH', label: '上证指数' },
  { symbol: '399001.SZ', label: '深证成指' },
  { symbol: '399006.SZ', label: '创业板指' },
  { symbol: '000688.SH', label: '科创50' },
  { symbol: '899050.BJ', label: '北证50' },
]

const PRESET_PROMPTS = [
  '分析一下贵州茅台(600519.SH)今天走势',
  '请分析稀土ETF嘉实(516150)在2026-03-03的情况',
  '分析宁德时代300750.SZ，给出交易建议',
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

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function buildMockQuote(symbol: string): SymbolQuote {
  const seed = hashString(symbol)
  const names: Record<string, string> = {
    '600519.SH': '贵州茅台',
    '601318.SH': '中国平安',
    '300750.SZ': '宁德时代',
    '000001.SH': '上证指数',
    '399001.SZ': '深证成指',
    '399006.SZ': '创业板指',
    '000688.SH': '科创50',
    '899050.BJ': '北证50',
  }
  const name = names[symbol] || symbol
  const base = 20 + (seed % 220) / 3
  const direction = seed % 3 === 0 ? 1 : seed % 3 === 1 ? -1 : 1
  const change = direction * (((seed % 11) + 3) / 10)
  const lastPrice = base + change
  const open = lastPrice - change / 2
  const high = Math.max(open, lastPrice) + 0.9 + ((seed % 6) / 10)
  const low = Math.min(open, lastPrice) - 0.7 - ((seed % 5) / 10)
  const changePercent = (change / (lastPrice - change)) * 100
  const volume = 1.2e8 + (seed % 900) * 2.4e5
  const candles: CandlePoint[] = Array.from({ length: 36 }, (_, index) => {
    const drift = Math.sin((index + seed % 17) / 4) * 1.6 + Math.cos((index + seed % 13) / 7) * 0.9
    const openPrice = base + drift + index * 0.1
    const closePrice = openPrice + Math.sin((index + seed % 9) / 3) * 0.8 + ((index % 4) - 1.5) * 0.15
    const highPrice = Math.max(openPrice, closePrice) + 0.9 + ((index % 3) * 0.12)
    const lowPrice = Math.min(openPrice, closePrice) - 0.8 - ((index % 2) * 0.09)
    return {
      time: index,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      volume: 900000 + index * 24000 + (seed % 80000),
    }
  })

  const verdicts = ['看多', '中性', '谨慎']
  const verdict = verdicts[seed % verdicts.length]
  const confidence = 58 + (seed % 24)
  const targetPrice = lastPrice * (verdict === '看多' ? 1.09 : verdict === '谨慎' ? 1.04 : 1.06)
  const stopLoss = lastPrice * (verdict === '看多' ? 0.95 : verdict === '谨慎' ? 0.93 : 0.96)

  return {
    symbol,
    name,
    marketLabel: symbol.endsWith('.SH')
      ? '沪市'
      : symbol.endsWith('.SZ')
        ? '深市'
        : '北交所',
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
    summary: verdict === '看多'
      ? '趋势偏强，量能温和放大，短线有延续动力。'
      : verdict === '谨慎'
        ? '估值与情绪分歧较大，建议等待确认信号。'
        : '方向分歧较明显，适合控制仓位并观察催化。',
  }
}

function buildSectionContent(section: SectionKey, quote: SymbolQuote): string {
  switch (section) {
    case 'market_report':
      return `技术面观察：${quote.name}（${quote.symbol}）近期价格维持在中短期均线附近。当前节奏更偏向${quote.verdict === '看多' ? '上攻延续' : quote.verdict === '谨慎' ? '震荡整理' : '高位消化'}，量能较前期${quote.change >= 0 ? '有所放大' : '略有收缩'}。`
    case 'sentiment_report':
      return `舆情侧观察到相关讨论热度${quote.confidence > 72 ? '升温明显' : '保持稳定'}，市场对${quote.name}的关注点主要集中在业绩预期、行业景气和短期资金行为。`
    case 'news_report':
      return `新闻侧暂无明显的单边冲击，但政策与行业数据正在提供分歧中的催化。若后续出现超预期公告，情绪弹性会明显增强。`
    case 'fundamentals_report':
      return `基本面层面，当前估值区间与盈利预期存在一定匹配度。若中期增长路径延续，估值修复空间仍在，但需要业绩兑现支撑。`
    case 'macro_report':
      return `宏观与板块轮动角度，当前行情更强调资金在核心资产与主题方向之间切换。${quote.name}所在风格的相对强弱仍需要结合指数环境观察。`
    case 'smart_money_report':
      return `主力资金层面，近期流向呈现${quote.verdict === '看多' ? '持续净流入' : '高低切换' }特征，短线更适合观察成交放量与盘口承接。`
    case 'game_theory_report':
      return `博弈视角下，市场预期与真实定价仍有差距。若后续资金持续确认，${quote.name}有望完成预期修正；若失去量能支持，容易回到均衡区间。`
    case 'investment_plan':
      return `研究团队综合认为：${quote.summary} 多空理由并存，但当前更偏向${quote.verdict}路径。`
    case 'trader_investment_plan':
      return `交易执行建议：围绕 ${formatNumber(quote.lastPrice)} 元附近分批观察，保持仓位弹性，等待更明确的确认信号。`
    case 'final_trade_decision':
      return `最终决策：${quote.verdict}。目标价 ${formatNumber(quote.targetPrice)}，止损参考 ${formatNumber(quote.stopLoss)}。置信度 ${quote.confidence}% 。`
    default:
      return ''
  }
}

function getAgentStatus(agent: AgentCardMeta, phaseIndex: number): AgentStatus {
  const order: Record<SectionKey, number> = {
    market_report: 0,
    sentiment_report: 1,
    news_report: 2,
    fundamentals_report: 3,
    macro_report: 4,
    smart_money_report: 5,
    game_theory_report: 6,
    investment_plan: 7,
    trader_investment_plan: 8,
    final_trade_decision: 9,
  }

  const target = agent.section ? order[agent.section] : 9
  if (phaseIndex > target) return 'completed'
  if (phaseIndex === target) return 'in_progress'
  return 'pending'
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

function buildAgentStageMap(phaseIndex: number): Record<string, AgentStatus> {
  return AGENTS.reduce((acc, agent) => {
    acc[agent.id] = getAgentStatus(agent, phaseIndex)
    return acc
  }, {} as Record<string, AgentStatus>)
}

function buildMockAnswer(prompt: string, quote: SymbolQuote): string {
  const symbol = extractCnSymbol(prompt) || normalizeCnSymbol(quote.symbol)
  return `已接收请求：${prompt}\n\n当前先对 ${symbol} 做快速研判，再结合分段分析输出结论。`
}

export default function AnalysisWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const querySymbol = normalizeCnSymbol(searchParams.get('symbol') || '')
  const [selectedSymbol, setSelectedSymbol] = useState(querySymbol || '600519.SH')
  const [promptInput, setPromptInput] = useState('')
  const [phaseIndex, setPhaseIndex] = useState(-1)
  const [streamingSection, setStreamingSection] = useState<SectionKey | null>(null)
  const [streamTick, setStreamTick] = useState(0)
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => createInitialMessages(querySymbol || '600519.SH'))
  const [sections, setSections] = useState<Record<SectionKey, ReportSectionState>>(() => createInitialSections())
  const timersRef = useRef<number[]>([])

  const quote = useMemo(() => buildMockQuote(selectedSymbol), [selectedSymbol])
  const reportStatus = phaseIndex >= REPORT_SEQUENCE.length - 1 ? '已完成' : analysisRunning ? '分析中' : '待分析'
  const progress = useMemo(() => {
    if (phaseIndex < 0) return 0
    const phaseBase = [8, 18, 30, 42, 54, 66, 76, 84, 92, 96][Math.max(0, phaseIndex)] ?? 0
    return Math.min(100, phaseBase + Math.min(streamTick, 12) * 1.2)
  }, [phaseIndex, streamTick])

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }

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

  useEffect(() => {
    return () => clearTimers()
  }, [])

  const pushMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => prev.concat({
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    }))
  }

  const updateSection = (section: SectionKey, status: SectionStatus, content: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: { status, content },
    }))
  }

  const runAnalysis = (prompt: string) => {
    clearTimers()
    const symbol = extractCnSymbol(prompt) || normalizeCnSymbol(selectedSymbol)
    const nextQuote = buildMockQuote(symbol)

    setSelectedSymbol(symbol)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('symbol', symbol)
      return next
    }, { replace: true })

    setAnalysisRunning(true)
    setPhaseIndex(-1)
    setStreamTick(0)
    setStreamingSection('market_report')
    setSections(createInitialSections())
    setMessages([
      ...createInitialMessages(symbol),
      {
        id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      },
      {
        id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        role: 'assistant',
        content: buildMockAnswer(prompt, nextQuote),
        timestamp: new Date().toISOString(),
      },
    ])

    const schedule = (delay: number, fn: () => void) => {
      const timer = window.setTimeout(fn, delay)
      timersRef.current.push(timer)
    }

    schedule(450, () => {
      setPhaseIndex(0)
      setStreamingSection('market_report')
      updateSection('market_report', 'streaming', buildSectionContent('market_report', nextQuote))
      pushMessage('system', `已锁定标的 ${symbol}，开始市场扫描。`)
    })

    schedule(1500, () => {
      updateSection('market_report', 'complete', buildSectionContent('market_report', nextQuote))
      setPhaseIndex(1)
      setStreamingSection('sentiment_report')
      updateSection('sentiment_report', 'streaming', buildSectionContent('sentiment_report', nextQuote))
      pushMessage('system', '技术面阶段已完成，进入舆情分析。')
    })

    schedule(2700, () => {
      updateSection('sentiment_report', 'complete', buildSectionContent('sentiment_report', nextQuote))
      setPhaseIndex(2)
      setStreamingSection('news_report')
      updateSection('news_report', 'streaming', buildSectionContent('news_report', nextQuote))
    })

    schedule(3900, () => {
      updateSection('news_report', 'complete', buildSectionContent('news_report', nextQuote))
      setPhaseIndex(3)
      setStreamingSection('fundamentals_report')
      updateSection('fundamentals_report', 'streaming', buildSectionContent('fundamentals_report', nextQuote))
    })

    schedule(5100, () => {
      updateSection('fundamentals_report', 'complete', buildSectionContent('fundamentals_report', nextQuote))
      setPhaseIndex(4)
      setStreamingSection('macro_report')
      updateSection('macro_report', 'streaming', buildSectionContent('macro_report', nextQuote))
    })

    schedule(6300, () => {
      updateSection('macro_report', 'complete', buildSectionContent('macro_report', nextQuote))
      setPhaseIndex(5)
      setStreamingSection('smart_money_report')
      updateSection('smart_money_report', 'streaming', buildSectionContent('smart_money_report', nextQuote))
    })

    schedule(7500, () => {
      updateSection('smart_money_report', 'complete', buildSectionContent('smart_money_report', nextQuote))
      setPhaseIndex(6)
      setStreamingSection('game_theory_report')
      updateSection('game_theory_report', 'streaming', buildSectionContent('game_theory_report', nextQuote))
    })

    schedule(8700, () => {
      updateSection('game_theory_report', 'complete', buildSectionContent('game_theory_report', nextQuote))
      setPhaseIndex(7)
      setStreamingSection('investment_plan')
      updateSection('investment_plan', 'streaming', buildSectionContent('investment_plan', nextQuote))
    })

    schedule(9900, () => {
      updateSection('investment_plan', 'complete', buildSectionContent('investment_plan', nextQuote))
      setPhaseIndex(8)
      setStreamingSection('trader_investment_plan')
      updateSection('trader_investment_plan', 'streaming', buildSectionContent('trader_investment_plan', nextQuote))
    })

    schedule(11100, () => {
      updateSection('trader_investment_plan', 'complete', buildSectionContent('trader_investment_plan', nextQuote))
      setPhaseIndex(9)
      setStreamingSection('final_trade_decision')
      updateSection('final_trade_decision', 'streaming', buildSectionContent('final_trade_decision', nextQuote))
    })

    schedule(12400, () => {
      updateSection('final_trade_decision', 'complete', buildSectionContent('final_trade_decision', nextQuote))
      setStreamingSection(null)
      setAnalysisRunning(false)
      pushMessage('assistant', `分析完成：${nextQuote.verdict}。目标价 ${formatNumber(nextQuote.targetPrice)}，止损参考 ${formatNumber(nextQuote.stopLoss)}，置信度 ${nextQuote.confidence}%。`)
    })
  }

  const handleSendPrompt = () => {
    const prompt = promptInput.trim()
    if (!prompt) return
    setPromptInput('')
    runAnalysis(prompt)
  }

  const handlePreset = (prompt: string) => {
    setPromptInput(prompt)
    runAnalysis(prompt)
  }

  const activeReportSections = REPORT_SEQUENCE.map((section) => ({
    key: section,
    title: REPORT_SECTION_TITLES[section],
    ...sections[section],
  }))

  const agentStatuses = useMemo(() => buildAgentStageMap(phaseIndex), [phaseIndex])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_32%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_32%,_#0f172a_100%)] text-slate-900 dark:text-slate-100">
      <div className="h-screen flex overflow-hidden">
        <AnalysisSidebar
          selectedSymbol={selectedSymbol}
          analysisRunning={analysisRunning}
          onAnalyze={runAnalysis}
          onSelectSymbol={(symbol) => {
            setSelectedSymbol(symbol)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('symbol', symbol)
              return next
            }, { replace: true })
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-16 px-5 border-b border-white/50 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                返回工作台
              </Link>
              <div className="hidden md:flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5 text-emerald-500" />
                  A 股投研终端
                </span>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <span>实时分析路由 /analysis</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusClass(analysisRunning ? 'streaming' : 'complete')}`}>
                {reportStatus}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-300">
                {quote.marketLabel}
              </span>
            </div>
          </div>

          <main className="flex-1 min-h-0 overflow-hidden p-4 lg:p-5">
            <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
              <div className="min-w-0 h-full overflow-y-auto space-y-4 pr-0 lg:pr-1">
                <AnalysisCenter
                  quote={quote}
                  phaseIndex={phaseIndex}
                  progress={progress}
                  analysisRunning={analysisRunning}
                  streamingSection={streamingSection}
                  streamTick={streamTick}
                  activeReportSections={activeReportSections}
                  agentStatuses={agentStatuses}
                  onSelectMarket={(symbol) => setSelectedSymbol(symbol)}
                />
              </div>

              <div className="min-h-0">
                <AnalysisChatPanel
                  messages={messages}
                  promptInput={promptInput}
                  onPromptInput={setPromptInput}
                  onSend={handleSendPrompt}
                  onPreset={handlePreset}
                  onAnalyze={handleSendPrompt}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function AnalysisSidebar({
  selectedSymbol,
  analysisRunning,
  onAnalyze,
  onSelectSymbol,
}: {
  selectedSymbol: string
  analysisRunning: boolean
  onAnalyze: (prompt: string) => void
  onSelectSymbol: (symbol: string) => void
}) {
  const [manualSymbol, setManualSymbol] = useState(selectedSymbol)

  useEffect(() => {
    setManualSymbol(selectedSymbol)
  }, [selectedSymbol])

  const handleAnalyze = () => {
    onAnalyze(`分析 ${(manualSymbol || selectedSymbol).trim()} 今日走势`)
  }

  return (
    <aside className="w-[330px] max-w-[86vw] shrink-0 h-full border-r border-slate-200/80 dark:border-slate-800/80 bg-[#f7f9fc] dark:bg-slate-950/70 overflow-y-auto">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI 分析股标</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">TradingAgents-AShare 集成工作台</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">快速分析</div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {analysisRunning ? '分析中' : '待命'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <Search className="w-4 h-4 shrink-0 text-slate-400" />
              <input
                value={manualSymbol}
                onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                placeholder="输入股票代码，如 600519.SH"
                className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
            </div>
            <button
              onClick={handleAnalyze}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 dark:bg-white dark:text-slate-900"
            >
              <Sparkles className="w-4 h-4" />
              分析
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">自选列表</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">点击即可发起分析</div>
            </div>
          </div>

          <div className="space-y-3">
            {WATCHLIST.map((item) => {
              const active = item.symbol === selectedSymbol
              return (
                <button
                  key={item.symbol}
                  onClick={() => {
                    onSelectSymbol(item.symbol)
                    onAnalyze(`分析 ${item.symbol} 今日走势`)
                  }}
                  className={`w-full text-left rounded-[24px] border px-4 py-4 transition-all ${
                    active
                      ? 'border-blue-400 bg-blue-50/80 shadow-[0_8px_20px_rgba(59,130,246,0.12)] dark:bg-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[15px] text-slate-900 dark:text-slate-100">{item.symbol}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.note}</div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-300">
                      分析 <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}

function AnalysisCenter({
  quote,
  phaseIndex,
  progress,
  analysisRunning,
  streamingSection,
  streamTick,
  activeReportSections,
  agentStatuses,
  onSelectMarket,
}: {
  quote: SymbolQuote
  phaseIndex: number
  progress: number
  analysisRunning: boolean
  streamingSection: SectionKey | null
  streamTick: number
  activeReportSections: Array<{ key: SectionKey; title: string; status: SectionStatus; content: string }>
  agentStatuses: Record<string, AgentStatus>
  onSelectMarket: (symbol: string) => void
}) {
  const renderedContent = (content: string, status: SectionStatus) => {
    if (status !== 'streaming' || !streamingSection) return content
    const visibleCount = Math.max(24, Math.floor(content.length * Math.min(1, 0.18 + streamTick * 0.06)))
    return content.slice(0, visibleCount)
  }

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden"
      >
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CandlestickChart className="w-4 h-4 text-cyan-500" />
                <span>{quote.marketLabel}</span>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <span>实时 K 线</span>
              </div>
              <h2 className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                {quote.name} <span className="text-slate-500 dark:text-slate-400">({quote.symbol})</span>
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-2.5 py-1 rounded-full border ${statusClass(analysisRunning ? 'streaming' : 'complete')}`}>
                  {analysisRunning ? '加载中' : '已就绪'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  收盘 <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(quote.lastPrice)}</span>
                </span>
                <span className={quote.change >= 0 ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                  {quote.change >= 0 ? '+' : ''}
                  {formatNumber(quote.change)} ({quote.changePercent >= 0 ? '+' : ''}{formatNumber(quote.changePercent)}%)
                </span>
                <span className="text-slate-500 dark:text-slate-400">高/低 {formatNumber(quote.high)} / {formatNumber(quote.low)}</span>
                <span className="text-slate-500 dark:text-slate-400">量 {formatNumber(quote.volume / 1e8, 2)} 亿</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:w-[420px]">
              {MARKET_TABS.map((item) => {
                const active = item.symbol === quote.symbol
                return (
                  <button
                    key={item.symbol}
                    onClick={() => onSelectMarket(item.symbol)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-5 lg:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_320px] gap-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">K 线快照</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className={`w-3.5 h-3.5 ${analysisRunning ? 'animate-spin' : 'opacity-0'}`} />
                  {analysisRunning ? '智能体正在同步研判' : '静态快照'}
                </div>
              </div>
              <MarketChart quote={quote} />
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">核心指标</div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="置信度" value={`${quote.confidence}%`} tone="blue" />
                <MetricCard label="方向" value={quote.verdict} tone="emerald" />
                <MetricCard label="目标价" value={formatNumber(quote.targetPrice)} tone="cyan" />
                <MetricCard label="止损价" value={formatNumber(quote.stopLoss)} tone="amber" />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">分析摘要</div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{quote.summary}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden"
      >
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">TradingAgents 协同研判台</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">15 席位 · 5 阶段串行流水线 · 分析团队并行产出</p>
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {phaseIndex < 0 ? '0 / 10' : `${Math.min(phaseIndex + 1, 10)} / 10`}
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
                    <div
                      key={agent.id}
                      className={`rounded-3xl border p-4 transition-all ${statusClass(status)}`}
                    >
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
                        <span className={`text-[11px] px-2 py-1 rounded-full border ${statusClass(status)}`}>
                          {status === 'in_progress' ? '分析中' : status === 'completed' ? '完成' : '待命'}
                        </span>
                      </div>
                      <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {status === 'completed'
                          ? buildSectionContent(agent.section || 'market_report', quote)
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
        <ResultCard
          title="决策结论"
          icon={Target}
          tone="blue"
          content={`方向：${quote.verdict} · 置信度 ${quote.confidence}%\n目标价 ${formatNumber(quote.targetPrice)} · 止损 ${formatNumber(quote.stopLoss)}`}
        />
        <ResultCard
          title="风险雷达"
          icon={Shield}
          tone="amber"
          content="当前风险来自情绪波动、政策扰动与短线资金切换。建议结合仓位管理和交易计划执行。"
        />
        <ResultCard
          title="关键指标"
          icon={LineChart}
          tone="emerald"
          content={`收盘 ${formatNumber(quote.lastPrice)} · 振幅 ${formatNumber(((quote.high - quote.low) / quote.lastPrice) * 100)}% · 成交量 ${formatNumber(quote.volume / 1e8, 2)} 亿`}
        />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden"
      >
        <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">研报输出</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">分析过程中会逐段刷新，保留 TradingAgents 的实时输出感觉。</p>
        </div>
        <div className="p-5 lg:p-6 space-y-3">
          {activeReportSections.map((section) => (
            <div
              key={section.key}
              className={`rounded-3xl border p-4 transition-all ${
                section.status === 'streaming'
                  ? 'border-blue-300 bg-blue-50/70 dark:bg-blue-500/10'
                  : section.status === 'complete'
                    ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    {section.status === 'streaming' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <CheckCircle2 className={`w-4 h-4 ${section.status === 'complete' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{section.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {section.status === 'streaming' ? '实时生成中' : section.status === 'complete' ? '已完成' : '等待生成'}
                    </div>
                  </div>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full border ${statusClass(section.status)}`}>
                  {section.status === 'streaming' ? '生成中' : section.status === 'complete' ? '完成' : '待命'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {renderedContent(section.content, section.status) || '等待模型输出...'}
              </p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}

function MarketChart({ quote }: { quote: SymbolQuote }) {
  const data = quote.candles
  const width = 860
  const height = 300
  const margin = { top: 20, right: 24, bottom: 24, left: 18 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const minPrice = Math.min(...data.map((item) => item.low))
  const maxPrice = Math.max(...data.map((item) => item.high))
  const scaleX = chartWidth / Math.max(data.length, 1)
  const scaleY = chartHeight / Math.max(maxPrice - minPrice, 1)

  const toY = (price: number) => margin.top + (maxPrice - price) * scaleY

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500 dark:text-slate-400">
        <span>-- 收盘 --</span>
        <span>开盘 --</span>
        <span>高/低 -- / --</span>
        <span>量 --</span>
      </div>

      <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[300px] block">
          <defs>
            <linearGradient id="chartGrid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(148,163,184,0.25)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.05)" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }).map((_, index) => (
            <line
              key={index}
              x1={margin.left}
              x2={width - margin.right}
              y1={margin.top + (chartHeight / 4) * index}
              y2={margin.top + (chartHeight / 4) * index}
              stroke="url(#chartGrid)"
              strokeWidth="1"
            />
          ))}
          {data.map((point, index) => {
            const x = margin.left + index * scaleX + scaleX * 0.4
            const bodyWidth = Math.max(3, scaleX * 0.38)
            const up = point.close >= point.open
            const bodyTop = toY(Math.max(point.open, point.close))
            const bodyHeight = Math.max(2, Math.abs(toY(point.open) - toY(point.close)))
            return (
              <g key={index}>
                <line
                  x1={x}
                  x2={x}
                  y1={toY(point.high)}
                  y2={toY(point.low)}
                  stroke={up ? '#ef4444' : '#22c55e'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={bodyTop}
                  width={bodyWidth}
                  height={bodyHeight}
                  rx="1.5"
                  fill={up ? '#ef4444' : '#22c55e'}
                />
              </g>
            )
          })}
          <path
            d={data.map((point, index) => {
              const x = margin.left + index * scaleX + scaleX * 0.4
              const y = toY(point.close)
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none"
            stroke="rgba(59,130,246,0.35)"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'emerald' | 'cyan' | 'amber'
}) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3">
      <div className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${toneMap[tone]}`}>{label}</div>
      <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

function ResultCard({
  title,
  icon: Icon,
  tone,
  content,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  tone: 'blue' | 'amber' | 'emerald'
  content: string
}) {
  const toneMap = {
    blue: 'from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-950',
    amber: 'from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-950',
    emerald: 'from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-950',
  }

  return (
    <div className={`rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-gradient-to-br ${toneMap[tone]} p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </div>
        <h4 className="font-semibold text-slate-950 dark:text-slate-50">{title}</h4>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 whitespace-pre-line">{content}</p>
    </div>
  )
}

function AnalysisChatPanel({
  messages,
  promptInput,
  onPromptInput,
  onSend,
  onPreset,
  onAnalyze,
}: {
  messages: ChatMessage[]
  promptInput: string
  onPromptInput: (value: string) => void
  onSend: () => void
  onPreset: (prompt: string) => void
  onAnalyze: () => void
}) {
  const messageListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <aside className="h-full rounded-[28px] border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
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
            <button
              key={prompt}
              onClick={() => onPreset(prompt)}
              className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:border-blue-300 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onAnalyze}
          className="w-full flex items-center justify-between rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles className="w-4 h-4" />
            分析类型（6/6）
          </span>
          <ChevronDown className="w-4 h-4 text-blue-500" />
        </button>
      </div>

      <div ref={messageListRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 whitespace-pre-line shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'assistant'
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-500/20'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-end gap-3">
          <div className="flex-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
            <textarea
              value={promptInput}
              onChange={(e) => onPromptInput(e.target.value)}
              placeholder="直接描述你的分析需求..."
              rows={3}
              className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={onSend}
            className="shrink-0 inline-flex items-center gap-2 rounded-3xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-600/25"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
    </aside>
  )
}
