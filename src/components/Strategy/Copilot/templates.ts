import type { TemplateOption } from './types'

export const BUILTIN_TEMPLATES: TemplateOption[] = [
  {
    id: '双均线策略',
    name: '双均线策略',
    description: '趋势跟踪，快慢均线交叉产生信号',
    type: 'trend_following'
  },
  {
    id: '市场情绪策略',
    name: '市场情绪策略',
    description: '基于价格偏离、动量和成交量的情绪代理策略',
    type: 'sentiment'
  },
  {
    id: 'ETF轮动策略',
    name: 'ETF轮动策略',
    description: '动量轮动，短期和长期动量差产生信号',
    type: 'momentum'
  },
  {
    id: '双均线对冲策略',
    name: '双均线对冲策略',
    description: '双均线基础策略加对冲接口骨架',
    type: 'hedging'
  }
]

export const MODIFY_PRESETS = [
  {
    label: '添加RSI过滤',
    prompt: '增加RSI指标过滤，RSI大于70时不买入，RSI小于30时不卖出。RSI周期默认14。'
  },
  {
    label: '添加成交量确认',
    prompt: '增加成交量过滤，只有当成交量大于20日均量1.5倍时才考虑买入。'
  },
  {
    label: '优化止损逻辑',
    prompt: '改进止损逻辑，使用ATR动态止损代替固定比例止损，ATR周期14，倍数2。'
  },
  {
    label: '添加趋势过滤',
    prompt: '增加趋势过滤器，只在价格高于50日均线且均线向上时做多。'
  },
  {
    label: '分批建仓',
    prompt: '改进入场逻辑，采用分批建仓策略，首次买入30%，确认趋势后再买70%。'
  }
]

export const OPTIMIZE_PRESETS = [
  {
    label: '降低最大回撤',
    prompt: '降低最大回撤，加强风险控制，考虑添加波动率过滤和更严格的止损。'
  },
  {
    label: '提高夏普比率',
    prompt: '提高夏普比率，优化风险调整后的收益，减少无效交易。'
  },
  {
    label: '提高胜率',
    prompt: '提高胜率，添加更多确认条件减少假信号，优化入场时机。'
  },
  {
    label: '减少交易次数',
    prompt: '减少交易频率，避免过度交易，增加持仓周期。'
  }
]
