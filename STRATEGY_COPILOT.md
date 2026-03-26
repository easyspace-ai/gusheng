# Strategy Copilot - AI 策略助手

基于 LLM 的量化交易策略智能助手，支持基于模板修改策略、优化策略和解释策略。

## 功能特性

### 1. 基于模板修改策略
从内置模板出发，通过自然语言描述修改需求，AI 自动生成修改后的策略代码。

**内置模板**:
- 双均线策略 (DualMAStrategy) - 趋势跟踪
- 市场情绪策略 (MarketSentimentStrategy) - 情绪代理
- ETF轮动策略 (ETFRotationStrategy) - 动量轮动
- 双均线对冲策略 (DualMAHedgingStrategy) - 对冲模板

### 2. 策略优化
基于现有策略和回测结果，AI 提供优化建议和优化后的代码。

### 3. 策略解释
将策略代码转换为易懂的中文说明，包括入场条件、出场条件、风险管理等。

## 快速开始

### 1. 配置环境变量

```bash
# 编辑 backtestapi/.env 文件，添加 LLM 配置
LLM_API_URL=https://api.moonshot.cn/v1
LLM_API_KEY=sk-your-api-key-here
LLM_MODEL=kimi-k2.5
```

### 2. 启动后端服务

```bash
cd backtestapi
source .venv/bin/activate
uvicorn api.main:app --reload
```

### 3. 测试 API

#### 修改策略
```bash
curl -X POST http://localhost:8000/api/backtest/api/v1/strategies/modify \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "双均线策略",
    "requirements": "增加RSI过滤，RSI大于70时不买入，RSI小于30时不卖出",
    "temperature": 0.3
  }'
```

#### 优化策略
```bash
curl -X POST http://localhost:8000/api/backtest/api/v1/strategies/1/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "optimization_goal": "降低最大回撤",
    "temperature": 0.3
  }'
```

#### 解释策略
```bash
curl -X POST http://localhost:8000/api/backtest/api/v1/strategies/1/explain
```

## API 端点

### POST /api/backtest/api/v1/strategies/modify
基于模板修改策略

**请求体**:
```json
{
  "template_name": "双均线策略",
  "requirements": "添加成交量过滤",
  "temperature": 0.3
}
```

**响应**:
```json
{
  "code": "# Python code...",
  "changes": ["添加了成交量过滤", "优化了入场条件"],
  "parameters_schema": {...},
  "is_valid": true,
  "errors": [],
  "base_template": "双均线策略"
}
```

### POST /api/backtest/api/v1/strategies/{id}/optimize
优化现有策略

**请求体**:
```json
{
  "optimization_goal": "提高夏普比率",
  "backtest_job_id": "optional-job-id",
  "temperature": 0.3
}
```

**响应**:
```json
{
  "code": "# Optimized Python code...",
  "analysis": "策略在震荡市表现较差...",
  "suggestions": ["添加趋势过滤器", "调整止损比例"],
  "is_valid": true,
  "errors": []
}
```

### POST /api/backtest/api/v1/strategies/{id}/explain
解释策略

**响应**:
```json
{
  "explanation": "## 策略概述\n这是一个双均线策略...",
  "raw": "..."
}
```

## 前端集成

前端 API 客户端已更新，新增以下函数：

```typescript
import {
  modifyStrategy,
  optimizeStrategy,
  explainStrategy
} from '@/lib/strategyApi'

// 修改策略
const result = await modifyStrategy({
  template_name: '双均线策略',
  requirements: '增加RSI大于70的过滤条件',
  temperature: 0.3
})

// 优化策略
const optimization = await optimizeStrategy(strategyId, {
  optimization_goal: '降低最大回撤',
  temperature: 0.3
})

// 解释策略
const explanation = await explainStrategy(strategyId)
```

## Prompt 设计

### 修改策略 Prompt

核心约束：
1. 保持 BaseStrategy 继承
2. 保留 on_bar 方法签名
3. 保留风险管理逻辑（max_drawdown 检查）
4. A股约束：仓位为100的整数倍
5. 白名单数据接口：get_close_prices, get_bars, position, cash, total_value, buy, sell, log

### 优化策略 Prompt

优化维度：
1. 参数调优（周期、阈值、比例）
2. 添加过滤器（趋势、波动率、成交量）
3. 改进入场/出场时机
4. 增强风险管理
5. 优化仓位管理

### 解释策略 Prompt

输出结构：
1. 策略概述
2. 入场条件
3. 出场条件
4. 仓位管理
5. 风险控制
6. 关键参数
7. 适用场景
8. 风险提示

## 文件结构

```
backtestapi/
├── api/
│   ├── prompts/              # Prompt 模板
│   │   ├── __init__.py
│   │   ├── modification.py   # 修改策略 Prompt
│   │   ├── optimization.py   # 优化策略 Prompt
│   │   └── explanation.py    # 解释策略 Prompt
│   ├── routers/
│   │   └── strategies.py     # 新增 AI 端点
│   └── services/
│       └── ai_strategy_service.py  # AI 服务核心
src/
└── lib/
    └── strategyApi.ts        # 前端 API 客户端
```

## 安全与约束

1. **代码验证**: 所有生成的代码都经过 `StrategyValidator` 验证
2. **自动修复**: 验证失败时，AI 会尝试自动修复（最多2次）
3. **风险管理保护**: Prompt 强制要求保留 max_drawdown 检查
4. **接口白名单**: 只允许使用预定义的数据接口
5. **A股规则**: 仓位必须是100的整数倍

## 自定义 LLM 配置

支持任意 OpenAI 兼容的 LLM API：

```bash
# Moonshot (Kimi)
LLM_API_URL=https://api.moonshot.cn/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=kimi-k2.5

# OpenAI
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4

# 其他兼容 API
LLM_API_URL=https://your-api.com/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
```

## 故障排除

### API 返回 500 错误
- 检查 LLM_API_URL 和 LLM_API_KEY 是否正确配置
- 确认 LLM 服务可访问

### 生成的代码验证失败
- 查看响应中的 `errors` 字段
- 调整 `requirements` 描述，使其更具体
- 降低 `temperature` 值以获得更确定性的结果

### 策略运行异常
- 确保生成的代码只使用了允许的数据接口
- 检查参数默认值是否合理
- 验证回测引擎版本兼容性

## 路线图

- [x] 后端 AI Service 实现
- [x] Prompt 模板系统
- [x] API 端点
- [x] 前端 API 客户端
- [ ] 前端 AI Copilot 界面
- [ ] 回测结果集成到优化流程
- [ ] 策略版本管理
- [ ] A/B 测试支持
