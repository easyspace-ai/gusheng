import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BusinessDay,
  CandlestickData,
  CandlestickSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  createChart,
} from 'lightweight-charts'
import { Activity, CandlestickChart } from 'lucide-react'
import { getTradingKline, type TradingApiKlineCandle, type TradingApiKlineResponse } from '@/lib/tradingApi'
import { normalizeCnSymbol } from '@/lib/symbols'

interface TradingKlinePanelProps {
  symbol: string
  analysisSymbol?: string
  onSymbolChange?: (symbol: string) => void
  prefetchedKline?: TradingApiKlineResponse | null
  managedExternally?: boolean
}

function toDateText(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toBusinessDay(value: string): BusinessDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return { year, month, day }
}

const SYMBOL_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
  '300750.SZ': '宁德时代',
  '600406.SH': '国电南瑞',
  '510300.SH': '沪深300ETF',
}

function getDisplayName(symbol: string): string {
  const s = symbol.toUpperCase()
  return SYMBOL_NAME_MAP[s] ? `${SYMBOL_NAME_MAP[s]}（${s}）` : s
}

function formatNumber(value?: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatVolume(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '--'
  if (Math.abs(value) >= 1e8) return `${formatNumber(value / 1e8, 2)}亿`
  if (Math.abs(value) >= 1e4) return `${formatNumber(value / 1e4, 2)}万`
  return formatNumber(value, 0)
}

const INDEX_PRESETS = [
  { symbol: '000001.SH', label: '上证指数' },
  { symbol: '399001.SZ', label: '深证成指' },
  { symbol: '399006.SZ', label: '创业板指' },
  { symbol: '000688.SH', label: '科创50' },
  { symbol: '899050.BJ', label: '北证50' },
] as const

interface CandlePoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
  amount?: number | null
  change?: number | null
  change_percent?: number | null
  turnover_rate?: number | null
}

export default function TradingKlinePanel({ symbol, analysisSymbol, onSymbolChange, prefetchedKline, managedExternally = false }: TradingKlinePanelProps) {
  const normalizedSymbol = normalizeCnSymbol(symbol)
  const normalizedAnalysisSymbol = analysisSymbol ? normalizeCnSymbol(analysisSymbol) : undefined
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const candlesRef = useRef<CandlePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'))
  const [candles, setCandles] = useState<CandlePoint[]>([])
  const [activeCandle, setActiveCandle] = useState<CandlePoint | null>(null)

  const range = useMemo(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000)
    return {
      start: toDateText(start),
      end: toDateText(end),
    }
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const textColor = isDark ? '#94a3b8' : '#475569'
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.6)'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        attributionLogo: false,
      },
      localization: {
        locale: 'zh-CN',
        dateFormat: 'yyyy-MM-dd',
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        timeVisible: true,
        rightOffset: 6,
        tickMarkFormatter: (time: BusinessDay | string) => {
          if (typeof time !== 'object') return String(time)
          const y = String(time.year)
          const m = String(time.month).padStart(2, '0')
          const d = String(time.day).padStart(2, '0')
          return `${y}/${m}/${d}`
        },
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)' },
        horzLine: { color: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)' },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#22c55e',
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
      borderVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    if (candlesRef.current.length) {
      const existingData: CandlestickData[] = candlesRef.current.flatMap((c) => {
        const time = toBusinessDay(c.date.slice(0, 10))
        if (!time) return []
        const open = Number(c.open)
        const high = Number(c.high)
        const low = Number(c.low)
        const close = Number(c.close)
        if (![open, high, low, close].every(Number.isFinite)) return []
        return [{ time, open, high, low, close }]
      })
      series.setData(existingData)
      chart.timeScale().fitContent()
    }

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !seriesRef.current) {
        setActiveCandle(candlesRef.current.length ? candlesRef.current[candlesRef.current.length - 1] : null)
        return
      }

      const pointData = param.seriesData.get(seriesRef.current) as CandlestickData | undefined
      if (!pointData) return

      const time = typeof pointData.time === 'object'
        ? `${pointData.time.year}-${String(pointData.time.month).padStart(2, '0')}-${String(pointData.time.day).padStart(2, '0')}`
        : String(pointData.time)

      const matched = candlesRef.current.find((item) => item.date === time)
      if (matched) setActiveCandle(matched)
    }

    chart.subscribeCrosshairMove(handleCrosshairMove)

    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [isDark])

  useEffect(() => {
    let cancelled = false

    const applyResponse = (resp: TradingApiKlineResponse) => {
      const mapped: CandlePoint[] = resp.candles.map((c: TradingApiKlineCandle) => ({
        date: c.date,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ?? null,
        amount: c.amount ?? null,
        change: c.change ?? null,
        change_percent: c.change_percent ?? null,
        turnover_rate: c.turnover_rate ?? null,
      }))
      const data: CandlestickData[] = mapped.flatMap((c) => {
        const time = toBusinessDay(c.date.slice(0, 10))
        if (!time) return []
        if (![c.open, c.high, c.low, c.close].every(Number.isFinite)) return []
        return [{ time, open: c.open, high: c.high, low: c.low, close: c.close }]
      })

      if (cancelled) return
      candlesRef.current = mapped
      setCandles(mapped)
      setActiveCandle(mapped.length ? mapped[mapped.length - 1] : null)
      seriesRef.current?.setData(data)
      chartRef.current?.timeScale().fitContent()
      setError(data.length ? null : '暂无可用K线数据')
    }

    const load = async () => {
      if (!seriesRef.current) return
      const canUsePrefetched = !!prefetchedKline && normalizeCnSymbol(prefetchedKline.symbol) === normalizedSymbol
      if (canUsePrefetched && prefetchedKline) {
        setLoading(false)
        applyResponse(prefetchedKline)
        return
      }
      if (managedExternally) {
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const resp = await getTradingKline(normalizedSymbol, range.start, range.end)
        applyResponse(resp)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '加载K线失败')
        candlesRef.current = []
        setCandles([])
        setActiveCandle(null)
        seriesRef.current?.setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [managedExternally, normalizedSymbol, prefetchedKline, range.end, range.start])

  const panelCandle = activeCandle ?? (candles.length ? candles[candles.length - 1] : null)
  const panelChange = panelCandle?.change ?? (panelCandle ? panelCandle.close - panelCandle.open : null)
  const safePanelChange = panelChange ?? 0
  const panelChangePercent = panelCandle?.change_percent ?? (
    panelCandle && panelCandle.open !== 0 ? (safePanelChange / panelCandle.open) * 100 : null
  )
  const isUp = (panelChange ?? 0) >= 0
  const compactChangePercent = panelChangePercent == null
    ? '--'
    : `${panelChangePercent >= 0 ? '+' : ''}${formatNumber(panelChangePercent)}%`
  const showCurrentSymbolButton = !!normalizedAnalysisSymbol && normalizedAnalysisSymbol !== normalizedSymbol
  const currentSymbolLabel = normalizedAnalysisSymbol ? getDisplayName(normalizedAnalysisSymbol).replace(/（.*?）/, '') : '当前标的'

  return (
    <section className="card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="min-w-0 flex items-center gap-3">
          <CandlestickChart className="w-5 h-5 text-cyan-500" />
          <div className="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{getDisplayName(normalizedSymbol)} K线</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400">{panelCandle?.date || '--'}</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>收盘 {formatNumber(panelCandle?.close)}</span>
              <span className="text-slate-500 dark:text-slate-400">开盘 {formatNumber(panelCandle?.open)}</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>{compactChangePercent}</span>
              <span className="text-slate-500 dark:text-slate-400">高/低 {formatNumber(panelCandle?.high)} / {formatNumber(panelCandle?.low)}</span>
              <span className="text-slate-500 dark:text-slate-400">量 {formatVolume(panelCandle?.volume)}</span>
              <span className="text-slate-500 dark:text-slate-400">换手 {panelCandle?.turnover_rate == null ? '--' : `${formatNumber(panelCandle.turnover_rate)}%`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {showCurrentSymbolButton && (
            <button
              onClick={() => normalizedAnalysisSymbol && onSymbolChange?.(normalizedAnalysisSymbol)}
              className="text-xs px-2.5 py-1 rounded border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
            >
              {currentSymbolLabel}
            </button>
          )}
          {INDEX_PRESETS.map((item) => (
            <button
              key={item.symbol}
              onClick={() => onSymbolChange?.(item.symbol)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${item.symbol === normalizedSymbol
                ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-500/10'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex-1 min-h-0 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute right-3 top-3 text-xs px-2 py-1 rounded bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-pulse" />
            加载中
          </div>
        )}
        {error && (
          <div className="absolute left-3 top-3 text-xs px-2 py-1 rounded bg-white/90 dark:bg-slate-800/90 text-orange-500">
            {error}
          </div>
        )}
      </div>
    </section>
  )
}
