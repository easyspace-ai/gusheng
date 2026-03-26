export interface TradingApiMessage {
  role: string
  content: string
}

export interface TradingApiKlineCandle {
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

export interface TradingApiKlineResponse {
  symbol: string
  start_date: string
  end_date: string
  candles: TradingApiKlineCandle[]
}

export interface TradingApiStreamEvent {
  event: string
  data: any
  timestamp?: string
}

export interface TradingApiReportSummary {
  id: string
  symbol: string
  trade_date: string
  decision?: string | null
  direction?: string | null
  confidence?: number | null
  target_price?: number | null
  stop_loss_price?: number | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface TradingApiReportDetail extends TradingApiReportSummary {
  user_id?: string | null
  error?: string | null
  result_data?: Record<string, any> | null
  risk_items?: Array<Record<string, any>> | null
  key_metrics?: Array<Record<string, any>> | null
  analyst_traces?: Array<Record<string, any>> | null
  market_report?: string | null
  sentiment_report?: string | null
  news_report?: string | null
  fundamentals_report?: string | null
  macro_report?: string | null
  smart_money_report?: string | null
  game_theory_report?: string | null
  investment_plan?: string | null
  trader_investment_plan?: string | null
  final_trade_decision?: string | null
}

function getBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_TRADING_API_URL as string | undefined)?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  return 'http://localhost:8000'
}

function getToken(): string {
  const envToken = (import.meta.env.VITE_TRADING_API_TOKEN as string | undefined)?.trim()
  if (envToken) return envToken
  try {
    return (localStorage.getItem('tradingapi-token') || '').trim()
  } catch {
    return ''
  }
}

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra || {})
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json()
      return data?.detail || data?.message || response.statusText
    } catch {
      return response.statusText
    }
  }
  try {
    const text = await response.text()
    return text || response.statusText
  } catch {
    return response.statusText
  }
}

export async function tradingApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: buildHeaders(init?.headers),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export async function getTradingKline(symbol: string, startDate?: string, endDate?: string): Promise<TradingApiKlineResponse> {
  const params = new URLSearchParams({ symbol })
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  return tradingApiRequest<TradingApiKlineResponse>(`/v1/market/kline?${params.toString()}`)
}

export async function searchTradingStocks(query: string): Promise<{ results: Array<{ symbol: string; name: string }> }> {
  return tradingApiRequest<{ results: Array<{ symbol: string; name: string }> }>(
    `/v1/market/stock-search?q=${encodeURIComponent(query)}`
  )
}

export interface TradingAnalysisStreamOptions {
  messages: TradingApiMessage[]
  selectedAnalysts?: string[]
  onEvent: (event: TradingApiStreamEvent) => void
  signal?: AbortSignal
}

export async function streamTradingAnalysis({
  messages,
  selectedAnalysts,
  onEvent,
  signal,
}: TradingAnalysisStreamOptions): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers: buildHeaders(),
    body: JSON.stringify({
      messages,
      stream: true,
      selected_analysts: selectedAnalysts,
    }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('分析流不可用')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = 'message'
  let currentData: string[] = []

  const emit = () => {
    if (!currentData.length) return
    const raw = currentData.join('\n')
    let parsed: any = raw
    if (raw !== '[DONE]') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = raw
      }
    }
    onEvent({ event: currentEvent, data: parsed })
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (value) {
        buffer += decoder.decode(value, { stream: !done })
      }
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line) {
          emit()
          currentEvent = 'message'
          currentData = []
          continue
        }
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim() || 'message'
          continue
        }
        if (line.startsWith('data:')) {
          currentData.push(line.slice(5).trimStart())
        }
      }

      if (done) {
        break
      }
    }
    emit()
  } finally {
    reader.releaseLock()
  }
}

export async function getTradingReports(symbol?: string, skip = 0, limit = 20): Promise<{ total: number; reports: TradingApiReportSummary[] }> {
  const params = new URLSearchParams()
  if (symbol) params.append('symbol', symbol)
  params.append('skip', String(skip))
  params.append('limit', String(limit))
  return tradingApiRequest<{ total: number; reports: TradingApiReportSummary[] }>(`/v1/reports?${params.toString()}`)
}

export async function getTradingReport(reportId: string): Promise<TradingApiReportDetail> {
  return tradingApiRequest<TradingApiReportDetail>(`/v1/reports/${reportId}`)
}
