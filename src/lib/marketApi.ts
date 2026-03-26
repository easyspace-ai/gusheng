export interface MarketApiEnvelope<T> {
  code: number
  message: string
  data?: T
}

export interface MarketApiPage<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface GlobalIndex {
  name: string
  code: string
  price: number
  change: number
  changePct: number
  updateTime: string
}

export interface StockCommonKlineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
  change: number
}

export interface StockCommonKlineData {
  code: string
  name: string
  list: StockCommonKlineItem[]
}

export interface IndustryMoneyRank {
  industryName: string
  changePct: number
  inflow: number
  outflow: number
  netInflow: number
  netRatio: number
  leadStock: string
  leadStockCode: string
  leadChange: number
  leadPrice: number
  leadNetRatio: number
}

export interface IndustryRank {
  industryName: string
  industryCode: string
  changePct: number
  changePct5d: number
  changePct20d: number
  leadStock: string
  leadStockCode: string
  leadChange: number
  leadPrice: number
}

export interface StockMoneyRank {
  code: string
  name: string
  price: number
  changePct: number
  turnoverRate: number
  amount: number
  outAmount: number
  inAmount: number
  netAmount: number
  netRatio: number
  r0Out: number
  r0In: number
  r0Net: number
  r0Ratio: number
  r3Out: number
  r3In: number
  r3Net: number
  r3Ratio: number
}

export interface MoneyFlowInfo {
  date: string
  mainNetInflow: number
  mainNetRatio: number
  superLargeNetInflow: number
  largeNetInflow: number
  mediumNetInflow: number
  smallNetInflow: number
}

export interface LongTigerRank {
  id: number
  tradeDate: string
  securityCode: string
  secuCode: string
  securityNameAbbr: string
  closePrice: number
  changeRate: number
  accumAmount: number
  billboardBuyAmt: number
  billboardSellAmt: number
  billboardNetAmt: number
  billboardDealAmt: number
  explanation: string
  turnoverRate: number
  freeMarketCap: number
}

export interface MarketNews {
  id: number
  title: string
  content: string
  source: string
  url: string
  publishTime: string
  stockCodes: string
  tags: string
}

export interface ResearchReport {
  id: number
  title: string
  content: string
  stockCode: string
  stockName: string
  author: string
  orgName: string
  publishDate: string
  reportType: string
  url: string
}

export interface StockNotice {
  id: number
  title: string
  content: string
  stockCode: string
  stockName: string
  noticeType: string
  publishDate: string
  updateTime: string
  url: string
}

export interface StockSearchItem {
  id: number
  code: string
  name: string
  market: string
  industry: string
  concept: string
  listDate: string
}

export interface HotStock {
  code: string
  name: string
  value: number
  increment: number
  rankChange: number
  percent: number
  current: number
  chg: number
  exchange: string
}

export interface HotEvent {
  id: number
  title: string
  content: string
  tag: string
  pic: string
  hot: number
  statusCount: number
}

export interface HotTopic {
  id: number
  title: string
  content: string
  hot: number
  stockCount: number
}

export interface InvestCalendarItem {
  date: string
  title: string
  content: string
  type: string
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new Error('服务返回了无法解析的数据')
  }
}

async function marketRequest<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(response.statusText || '请求失败')
  }

  const payload = await readJson<MarketApiEnvelope<T>>(response)
  if (payload.code !== 0) {
    throw new Error(payload.message || '接口返回错误')
  }
  return payload.data as T
}

export function getGlobalIndexes() {
  return marketRequest<GlobalIndex[]>('/api/market/global-indexes')
}

export function getStockCommonKline(code: string, days = 365, kLineType = 'day') {
  return marketRequest<StockCommonKlineData>(
    `/api/stock/${encodeURIComponent(code)}/common-kline?days=${days}&kLineType=${encodeURIComponent(kLineType)}`,
  )
}

export function getIndustryRank(sort = '0', count = 150) {
  return marketRequest<IndustryRank[]>(`/api/market/industry-rank?sort=${encodeURIComponent(sort)}&count=${count}`)
}

export function getIndustryMoneyRank(fenlei = '0', sort = 'netamount') {
  return marketRequest<IndustryMoneyRank[]>(
    `/api/market/industry-money-rank?fenlei=${encodeURIComponent(fenlei)}&sort=${encodeURIComponent(sort)}`,
  )
}

export function getStockMoneyRank(sort = 'netamount') {
  return marketRequest<StockMoneyRank[]>(`/api/market/money-rank?sort=${encodeURIComponent(sort)}`)
}

export function getStockMoneyTrend(code: string) {
  return marketRequest<MoneyFlowInfo[]>(`/api/market/stock-money-trend?code=${encodeURIComponent(code)}`)
}

export function getLongTiger(date: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return marketRequest<LongTigerRank[]>(`/api/market/long-tiger${query}`)
}

export function getNews24h(page = 1, pageSize = 24) {
  return marketRequest<MarketApiPage<MarketNews>>(`/api/market/news24h?page=${page}&pageSize=${pageSize}`)
}

export function getSinaNews(page = 1, pageSize = 20) {
  return marketRequest<MarketApiPage<MarketNews>>(`/api/market/sina-news?page=${page}&pageSize=${pageSize}`)
}

export function getStockResearchReport(code: string, page = 1, pageSize = 20) {
  return marketRequest<MarketApiPage<ResearchReport>>(
    `/api/market/stock-research-report?code=${encodeURIComponent(code)}&page=${page}&pageSize=${pageSize}`,
  )
}

export function getStockNotice(code: string, page = 1, pageSize = 50) {
  return marketRequest<MarketApiPage<StockNotice>>(
    `/api/market/stock-notice?code=${encodeURIComponent(code)}&page=${page}&pageSize=${pageSize}`,
  )
}

export function searchStocks(keyword: string) {
  return marketRequest<StockSearchItem[]>(`/api/stock/search?keyword=${encodeURIComponent(keyword)}`)
}

export function getIndustryResearchReport(industry: string, page = 1, pageSize = 20) {
  return marketRequest<MarketApiPage<ResearchReport>>(
    `/api/market/industry-research-report?industry=${encodeURIComponent(industry)}&page=${page}&pageSize=${pageSize}`,
  )
}

export function getHotStocks(source = 'xueqiu') {
  return marketRequest<HotStock[]>(`/api/market/hot-stock?source=${encodeURIComponent(source)}`)
}

export function getHotEvents() {
  return marketRequest<HotEvent[]>('/api/market/hot-event')
}

export function getHotTopics() {
  return marketRequest<HotTopic[]>('/api/market/hot-topic')
}

export function getInvestCalendar(startDate: string, endDate: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const query = params.toString()
  return marketRequest<InvestCalendarItem[]>(`/api/market/invest-calendar${query ? `?${query}` : ''}`)
}

export function getClsCalendar(startDate: string, endDate: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const query = params.toString()
  return marketRequest<InvestCalendarItem[]>(`/api/market/cls-calendar${query ? `?${query}` : ''}`)
}
