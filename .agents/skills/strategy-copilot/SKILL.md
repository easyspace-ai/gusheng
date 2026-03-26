---
name: strategy-copilot
version: "1.0.0"
spec: "skill-manifest/0.1"
description: AI Strategy Copilot for quantitative trading strategy modification and optimization based on templates.
argument-hint: "[modify|optimize|explain] [strategy_file_or_id] [requirements...]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch

environment:
  python: ">=3.9"
  packages: [requests>=2.31, pydantic>=2.0]
  env_vars:
    - { name: BACKTEST_API_URL, required: true, default: "http://localhost:8000" }
    - { name: LLM_API_URL, required: true, description: "Your custom LLM API endpoint" }
    - { name: LLM_API_KEY, required: true, description: "Your custom LLM API key" }
    - { name: LLM_MODEL, required: false, default: "default", description: "Model name to use" }

selftest: "cd $SKILL_DIR && python -m strategy_copilot.selftest"
---

<instructions>

## Principles (MUST follow)

1. **Template-first approach.** ALWAYS start from existing builtin templates, never generate from scratch.
2. **Incremental modification.** Make small, verifiable changes rather than complete rewrites.
3. **Preserve strategy structure.** Keep BaseStrategy inheritance, on_bar method, and parameter schema format.
4. **Validate before suggesting.** Use backtestapi's validation endpoint to check generated code.
5. **Explain the changes.** Always tell user what was modified and why.

---

## Available Builtin Templates

When user wants to modify a strategy, ALWAYS reference these templates as base:

### Template 1: DualMAStrategy (双均线策略)
```python
from core.strategy.base import BaseStrategy, Bar


class DualMAStrategy(BaseStrategy):
    fast_period = 5
    slow_period = 13
    risk_ratio = 0.02
    max_drawdown = 0.15
    trail_percent = 0.02
    enable_trailing_stop = False
    enable_death_cross = False

    def on_start(self):
        self.highest_value = self.total_value
        self.entry_price = 0.0
        self.peak_price = 0.0
        self.trailing_stop_price = None

    def _sma(self, values, period):
        if len(values) < period:
            return None
        window = values[-period:]
        return sum(window) / period

    def _position_size(self, price):
        risk_budget = self.total_value * self.risk_ratio
        stop_distance = max(price * self.trail_percent, price * 0.03)
        quantity = int((risk_budget / stop_distance) // 100) * 100
        if quantity * price > self.cash:
            quantity = int((self.cash / price) // 100) * 100
        return max(0, quantity)

    def on_bar(self, bar: Bar):
        closes = self.get_close_prices(self.slow_period + 2)
        if len(closes) < self.slow_period + 2:
            return

        # Risk management: max drawdown
        current_value = self.total_value
        if current_value > self.highest_value:
            self.highest_value = current_value
        drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
        if drawdown > self.max_drawdown and self.position > 0:
            self.log(f"触发最大回撤限制: {drawdown:.2%}")
            self.sell(price=bar.close, quantity=self.position)
            return

        # Moving average calculation
        prev_closes = closes[:-1]
        fast_prev = self._sma(prev_closes, self.fast_period)
        slow_prev = self._sma(prev_closes, self.slow_period)
        fast_curr = self._sma(closes, self.fast_period)
        slow_curr = self._sma(closes, self.slow_period)

        if None in (fast_prev, slow_prev, fast_curr, slow_curr):
            return

        cross_up = fast_prev <= slow_prev and fast_curr > slow_curr
        cross_down = fast_prev >= slow_prev and fast_curr < slow_curr

        if self.position == 0:
            if cross_up:
                quantity = self._position_size(bar.close)
                if quantity >= 100:
                    self.entry_price = bar.close
                    self.peak_price = bar.close
                    self.trailing_stop_price = bar.close * (1 - self.trail_percent)
                    self.buy(price=bar.close, quantity=quantity)
        else:
            self.peak_price = max(self.peak_price, bar.close)
            if self.enable_trailing_stop:
                trailing_floor = self.peak_price * (1 - self.trail_percent)
                self.trailing_stop_price = max(self.trailing_stop_price or 0.0, trailing_floor)

            if self.enable_death_cross and cross_down:
                self.sell(price=bar.close, quantity=self.position)
                return

            if self.enable_trailing_stop and self.trailing_stop_price and bar.close <= self.trailing_stop_price:
                self.sell(price=bar.close, quantity=self.position)
                return

            stop_price = self.entry_price * (1 - self.trail_percent)
            if self.entry_price and bar.close <= stop_price:
                self.sell(price=bar.close, quantity=self.position)
```

### Template 2: MarketSentimentStrategy (市场情绪策略)
```python
from core.strategy.base import BaseStrategy, Bar


class MarketSentimentStrategy(BaseStrategy):
    lookback = 20
    sentiment_buy_threshold = 35.0
    sentiment_sell_threshold = 70.0
    risk_ratio = 0.02
    max_drawdown = 0.15
    take_profit_ratio = 0.12
    stop_loss_ratio = 0.06
    target_position_ratio = 0.35

    def on_start(self):
        self.highest_value = self.total_value
        self.entry_price = 0.0

    def _sma(self, values, period):
        if len(values) < period:
            return None
        return sum(values[-period:]) / period

    def _sentiment_score(self, closes, volumes, current_close, current_volume):
        ma20 = self._sma(closes, self.lookback)
        ma5 = self._sma(closes, 5)
        if ma20 is None or ma5 is None:
            return None

        price_gap = (current_close - ma20) / ma20 * 100
        momentum = (current_close / ma5 - 1) * 100
        avg_volume = sum(volumes[-self.lookback:]) / self.lookback if len(volumes) >= self.lookback else current_volume
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

        score = 50.0
        score -= price_gap * 2.2
        score -= momentum * 1.1
        score += max(0.0, volume_ratio - 1.0) * 12.0
        return max(0.0, min(100.0, score))

    def _position_size(self, price):
        target_value = self.total_value * self.target_position_ratio
        quantity = int((target_value / price) // 100) * 100
        if quantity * price > self.cash:
            quantity = int((self.cash / price) // 100) * 100
        return max(0, quantity)

    def on_bar(self, bar: Bar):
        closes = self.get_close_prices(self.lookback + 5)
        bars = self.get_bars(self.lookback + 5)
        if len(closes) < self.lookback or len(bars) < self.lookback:
            return

        # Risk management
        current_value = self.total_value
        if current_value > self.highest_value:
            self.highest_value = current_value
        drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
        if drawdown > self.max_drawdown and self.position > 0:
            self.sell(price=bar.close, quantity=self.position)
            return

        volumes = [item.volume for item in bars]
        score = self._sentiment_score(closes, volumes, bar.close, bar.volume)
        if score is None:
            return

        if self.position == 0:
            if score <= self.sentiment_buy_threshold and bar.close >= bar.open:
                quantity = self._position_size(bar.close)
                if quantity >= 100:
                    self.entry_price = bar.close
                    self.buy(price=bar.close, quantity=quantity)
        else:
            take_profit_price = self.entry_price * (1 + self.take_profit_ratio)
            stop_loss_price = self.entry_price * (1 - self.stop_loss_ratio)

            if score >= self.sentiment_sell_threshold:
                self.sell(price=bar.close, quantity=self.position)
                return

            if bar.close >= take_profit_price or bar.close <= stop_loss_price:
                self.sell(price=bar.close, quantity=self.position)
```

### Template 3: ETFRotationStrategy (ETF轮动策略)
```python
from core.strategy.base import BaseStrategy, Bar


class ETFRotationStrategy(BaseStrategy):
    momentum_short = 10
    momentum_long = 60
    rebalance_interval = 30
    num_positions = 1
    risk_ratio = 0.02
    max_drawdown = 0.15
    trail_percent = 0.025

    def on_start(self):
        self.highest_value = self.total_value
        self.last_rebalance_index = 0
        self.last_entry_price = 0.0

    def _sma(self, values, period):
        if len(values) < period:
            return None
        return sum(values[-period:]) / period

    def _momentum(self, closes, period):
        if len(closes) < period + 1:
            return None
        prev_price = closes[-period - 1]
        if prev_price == 0:
            return None
        return closes[-1] / prev_price - 1

    def _position_size(self, price):
        cash_budget = self.total_value / max(self.num_positions, 1)
        risk_budget = self.total_value * self.risk_ratio
        stop_distance = max(price * self.trail_percent, price * 0.03)
        risk_size = int((risk_budget / stop_distance) // 100) * 100
        cash_size = int((cash_budget / price) // 100) * 100
        return max(0, min(risk_size, cash_size))

    def on_bar(self, bar: Bar):
        closes = self.get_close_prices(self.momentum_long + 2)
        if len(closes) < self.momentum_long + 2:
            return

        # Risk management
        current_value = self.total_value
        if current_value > self.highest_value:
            self.highest_value = current_value
        drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
        if drawdown > self.max_drawdown and self.position > 0:
            self.sell(price=bar.close, quantity=self.position)
            return

        # Momentum calculation
        short_momentum = self._momentum(closes, self.momentum_short)
        long_momentum = self._momentum(closes, self.momentum_long)
        if short_momentum is None or long_momentum is None:
            return

        momentum_score = short_momentum - long_momentum
        if self.position == 0 and momentum_score > 0:
            quantity = self._position_size(bar.close)
            if quantity >= 100:
                self.last_entry_price = bar.close
                self.buy(price=bar.close, quantity=quantity)
        elif self.position > 0 and momentum_score < -0.05:
            self.sell(price=bar.close, quantity=self.position)
```

---

## Commands

### Command: modify

Modify an existing strategy based on user requirements.

**Usage**: `modify [template_name] [modification_requirements]`

**Examples**:
- `modify 双均线策略 增加成交量过滤，只有当成交量大于20日均量1.5倍时才买入`
- `modify 市场情绪策略 把止盈比例从12%改成8%，增加RSI指标过滤`
- `modify ETF轮动策略 增加波动率过滤，当ATR大于5%时停止开仓`

**Workflow**:
1. Load the specified template
2. Parse user requirements into specific modifications
3. Generate modified code using LLM with MODIFICATION_PROMPT
4. Validate the generated code using backtestapi
5. Show diff and explain changes
6. Save to `strategies/modified/{strategy_name}.py`

---

### Command: optimize

Optimize strategy parameters or logic based on backtest feedback.

**Usage**: `optimize [strategy_file] [target_metric]`

**Examples**:
- `optimize my_strategy.py 提高夏普比率`
- `optimize dual_ma.py 降低最大回撤`
- `optimize sentiment.py 提高胜率`

**Workflow**:
1. Load existing strategy code
2. If backtest results available, analyze performance metrics
3. Generate optimization suggestions using OPTIMIZATION_PROMPT
4. Apply changes incrementally
5. Validate and compare before/after

---

### Command: explain

Explain what a strategy does in plain language.

**Usage**: `explain [strategy_file]`

**Workflow**:
1. Parse strategy code
2. Extract entry/exit logic, risk management, position sizing
3. Generate explanation using EXPLAIN_PROMPT
4. Show parameter schema and their meanings

---

## Prompt Templates

### MODIFICATION_PROMPT

Use this prompt when modifying strategies:

```
You are a quantitative trading strategy engineer. Your task is to modify an existing strategy based on user requirements.

## Original Strategy Code
```python
{original_code}
```

## User Requirements
{user_requirements}

## Rules (MUST follow)
1. PRESERVE the class inheritance: `class {class_name}(BaseStrategy)`
2. PRESERVE the `on_bar(self, bar: Bar)` method signature
3. PRESERVE all risk management logic (max_drawdown check)
4. PRESERVE position sizing logic structure
5. A-share market constraints:
   - Position size must be multiple of 100 (lot sizing)
   - T+1 trading (handled by engine, don't worry)
6. Available data methods:
   - self.get_close_prices(n) - get last n close prices
   - self.get_bars(n) - get last n Bar objects (open, high, low, close, volume)
   - self.position - current position
   - self.cash - available cash
   - self.total_value - total portfolio value
   - self.buy(price, quantity), self.sell(price, quantity)
   - self.log(message) - log messages

## Output Format
Return ONLY the complete modified Python code. Do not include explanations outside the code.

The code must:
1. Be syntactically valid Python
2. Include all necessary imports
3. Define the strategy class
4. Include parameter schema as class attributes
```

### OPTIMIZATION_PROMPT

Use this prompt when optimizing strategies:

```
You are a quantitative strategy optimizer. Analyze the strategy and suggest improvements.

## Strategy Code
```python
{strategy_code}
```

## Current Performance (if available)
- Sharpe Ratio: {sharpe_ratio}
- Max Drawdown: {max_drawdown}
- Win Rate: {win_rate}
- Total Return: {total_return}

## Optimization Goal
{optimization_goal}

## Suggestions to Consider
1. Parameter tuning (periods, thresholds, ratios)
2. Add filters (trend, volatility, volume)
3. Improve entry/exit timing
4. Enhance risk management
5. Add position sizing adjustments

## Output Format
Provide your response in this format:

### Analysis
Brief analysis of current strategy issues

### Suggested Changes
1. Change 1: Description
2. Change 2: Description
...

### Optimized Code
```python
# Complete optimized strategy code
```
```

### EXPLAIN_PROMPT

Use this prompt when explaining strategies:

```
Explain the following trading strategy in plain Chinese language.

## Strategy Code
```python
{strategy_code}
```

## Output Sections

### 策略概述
简要描述这是什么类型的策略，核心思想是什么

### 入场条件
- 多头入场: 什么条件下买入
- 空头入场: 什么条件下卖出（如果有）

### 出场条件
- 止盈: 如何止盈
- 止损: 如何止损
- 其他出场: 其他平仓条件

### 风险管理
- 仓位控制: 如何计算仓位大小
- 回撤控制: 如何控制最大回撤
- 其他风控: 其他风险控制措施

### 关键参数
| 参数名 | 默认值 | 说明 |
|--------|--------|------|
| param1 | value1 | description1 |
...

### 适用场景
- 适合的市场环境
- 适合的标的类型
- 不适合的场景
```

---

## Integration with BacktestAPI

### API Client Functions

```python
# $SKILL_DIR/strategy_copilot/api_client.py

import requests
import os

BACKTEST_API_URL = os.environ.get("BACKTEST_API_URL", "http://localhost:8000")

def validate_strategy(code: str) -> dict:
    """Validate strategy code using backtestapi"""
    url = f"{BACKTEST_API_URL}/api/backtest/api/v1/strategies/validate"
    response = requests.post(url, json={"code": code})
    return response.json()

def save_strategy(name: str, code: str, description: str = "", tags: list = None) -> dict:
    """Save strategy to backtestapi"""
    url = f"{BACKTEST_API_URL}/api/backtest/api/v1/strategies"
    payload = {
        "name": name,
        "code": code,
        "language": "python",
        "description": description,
        "tags": tags or [],
        "parameters_schema": extract_parameters_schema(code)
    }
    response = requests.post(url, json=payload)
    return response.json()

def extract_parameters_schema(code: str) -> dict:
    """Extract parameter schema from strategy class attributes"""
    # Parse code to find class attributes with default values
    import ast
    tree = ast.parse(code)
    schema = {}
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for item in node.body:
                if isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name):
                            # Skip private attributes and methods
                            if target.id.startswith('_'):
                                continue
                            # Infer type from default value
                            default = item.value
                            if isinstance(default, ast.Constant):
                                if isinstance(default.value, bool):
                                    schema[target.id] = {
                                        "type": "boolean",
                                        "default": default.value,
                                        "title": target.id.replace('_', ' ').title()
                                    }
                                elif isinstance(default.value, (int, float)):
                                    schema[target.id] = {
                                        "type": "number",
                                        "default": default.value,
                                        "title": target.id.replace('_', ' ').title()
                                    }
                                elif isinstance(default.value, str):
                                    schema[target.id] = {
                                        "type": "string",
                                        "default": default.value,
                                        "title": target.id.replace('_', ' ').title()
                                    }
    return schema
```

### LLM Client Functions

```python
# $SKILL_DIR/strategy_copilot/llm_client.py

import requests
import os

LLM_API_URL = os.environ.get("LLM_API_URL")
LLM_API_KEY = os.environ.get("LLM_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "default")

def call_llm(prompt: str, system_prompt: str = None, temperature: float = 0.3) -> str:
    """Call custom LLM API"""
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False
    }
    
    response = requests.post(
        f"{LLM_API_URL}/chat/completions",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
```

---

## Directory Structure

```
$SKILL_DIR/
├── SKILL.md                          # This file
├── strategy_copilot/
│   ├── __init__.py
│   ├── api_client.py                 # BacktestAPI integration
│   ├── llm_client.py                 # Custom LLM integration
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── modification.py           # MODIFICATION_PROMPT
│   │   ├── optimization.py           # OPTIMIZATION_PROMPT
│   │   └── explanation.py            # EXPLAIN_PROMPT
│   ├── templates/
│   │   ├── __init__.py
│   │   ├── dual_ma.py                # DualMAStrategy template
│   │   ├── market_sentiment.py       # MarketSentimentStrategy template
│   │   ├── etf_rotation.py           # ETFRotationStrategy template
│   │   └── hedging.py                # DualMAHedgingStrategy template
│   └── utils/
│       ├── __init__.py
│       ├── code_parser.py            # AST parsing utilities
│       └── diff_generator.py         # Code diff generation
├── strategies/
│   └── modified/                     # Modified strategy outputs
└── tests/
    └── test_copilot.py
```

---

## Example Usage Flow

### Example 1: Modify Strategy

User: `modify 双均线策略 增加RSI过滤，RSI大于70时不买入，RSI小于30时不卖出`

System:
1. Load `DualMAStrategy` template
2. Build prompt with requirements
3. Call LLM with MODIFICATION_PROMPT
4. Receive modified code
5. Validate via `validate_strategy()`
6. If valid, save to `strategies/modified/dual_ma_with_rsi.py`
7. Show user:
   - What was changed
   - New parameter `rsi_period`
   - How RSI filter works

### Example 2: Optimize Strategy

User: `optimize strategies/modified/my_strategy.py 降低最大回撤`

System:
1. Load existing strategy
2. If backtest results exist, include in prompt
3. Call LLM with OPTIMIZATION_PROMPT
4. Receive optimized code and analysis
5. Show comparison:
   - Before: max_drawdown=0.15
   - After: max_drawdown=0.10 (added volatility filter)
6. Save optimized version

---

## Constraints

1. **ALWAYS validate generated code** before presenting to user
2. **NEVER remove risk management** (max_drawdown checks)
3. **NEVER change position sizing to non-100-multiple**
4. **ALWAYS preserve BaseStrategy interface**
5. **NEVER use unavailable data** (only use get_close_prices, get_bars)
6. **ALWAYS explain changes** in plain language

---

## Reference

- BacktestAPI endpoint: `/api/backtest/api/v1/strategies`
- Strategy validation endpoint: `/api/backtest/api/v1/strategies/validate`
- BaseStrategy interface: see `core/strategy/base.py`

</instructions>
