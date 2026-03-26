"""Prompt template for strategy optimization."""

OPTIMIZATION_SYSTEM_PROMPT = """你是一个量化策略优化专家，擅长分析策略表现并提出改进建议。

你的职责：
1. 分析策略代码和回测结果
2. 识别策略的问题和改进空间
3. 提出具体的优化建议
4. 生成优化后的策略代码

优化维度：
- 参数调优（周期、阈值、比例）
- 添加过滤条件（趋势、波动率、成交量）
- 改进入场/出场时机
- 增强风险管理
- 优化仓位管理"""

OPTIMIZATION_PROMPT = """请分析以下策略并提供优化建议。

## 策略代码
```python
{strategy_code}
```

## 策略名称
{strategy_name}

## 当前回测表现
{backtest_metrics}

## 优化目标
{optimization_goal}

## 优化方向建议

根据目标，考虑以下优化方向：

### 1. 参数调优
- 调整均线周期（如果适用）
- 优化阈值参数（买入/卖出阈值）
- 调整风险控制参数（止损比例、最大回撤）

### 2. 添加过滤器
- 趋势过滤器：只在上升趋势中做多（如价格 > 均线）
- 波动率过滤器：避开高波动时期（如 ATR 过高）
- 成交量过滤器：确认成交量支持信号

### 3. 改进入场/出场
- 分批建仓/减仓
- 动态止损（追踪止损、ATR止损）
- 多条件确认（如需要多个指标同时满足）

### 4. 风险管理增强
- 仓位根据波动率调整
- 单日最大亏损限制
- 连续亏损后暂停交易

## 输出格式

请按以下格式提供响应：

### 分析
简要分析当前策略的主要问题和改进空间。

### 优化建议
1. **建议1**: 具体描述
2. **建议2**: 具体描述
3. **建议3**: 具体描述（如适用）

### 优化后代码
```python
# 完整的优化后策略代码
# 必须包含所有导入和类定义
# 必须保留 BaseStrategy 继承
# 必须保留 on_bar 方法
```

## 优化响应
"""

# Default metrics when no backtest data available
DEFAULT_METRICS_TEMPLATE = """- 夏普比率: 未计算
- 最大回撤: 未计算
- 胜率: 未计算
- 总收益率: 未计算
- 交易次数: 未计算"""

# Metrics template with values
METRICS_TEMPLATE = """- 夏普比率: {sharpe_ratio:.2f}
- 最大回撤: {max_drawdown:.2%}
- 胜率: {win_rate:.2%}
- 总收益率: {total_return:.2%}
- 年化收益率: {annual_return:.2%}
- 交易次数: {total_trades}
- 盈利交易: {win_trades}
- 亏损交易: {loss_trades}"""
