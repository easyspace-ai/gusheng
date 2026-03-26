"""Prompt template for strategy modification."""

MODIFICATION_SYSTEM_PROMPT = """你是一个专业的量化交易策略工程师，擅长基于现有模板进行策略修改。

你的职责：
1. 根据用户需求修改策略代码
2. 保持代码结构完整和语法正确
3. 确保风险管理逻辑不被破坏
4. 只使用允许的数据接口

重要约束：
- 必须继承 BaseStrategy
- 必须实现 on_bar(self, bar: Bar) 方法
- 仓位必须是100的整数倍（A股规则）
- 必须保留 max_drawdown 风险控制
- 只能使用以下数据接口：
  * self.get_close_prices(n) - 获取最近n日收盘价
  * self.get_bars(n) - 获取最近n根K线
  * self.position, self.cash, self.total_value
  * self.buy(price, quantity), self.sell(price, quantity)
  * self.log(message)"""

MODIFICATION_PROMPT = """请基于以下模板策略，根据用户需求进行修改。

## 原始策略代码
```python
{template_code}
```

## 策略名称
{template_name}

## 用户需求
{user_requirements}

## 修改规则（必须严格遵守）

### 1. 结构保留
- 保持 `class {class_name}(BaseStrategy)` 继承关系
- 保持 `on_bar(self, bar: Bar)` 方法签名不变
- 保持 `on_start(self)` 初始化方法
- 保持 `_position_size(self, price)` 仓位计算方法的结构

### 2. 风险管理（绝对禁止删除或修改）
- 必须保留 `max_drawdown` 参数和类属性
- 必须保留 `on_bar` 开头的回撤检查逻辑：
```python
current_value = self.total_value
if current_value > self.highest_value:
    self.highest_value = current_value
drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
if drawdown > self.max_drawdown and self.position > 0:
    self.log(f"触发最大回撤限制: {{drawdown:.2%}}")
    self.sell(price=bar.close, quantity=self.position)
    return
```

### 3. A股市场约束
- 仓位计算结果必须是100的整数倍：`quantity = int((value / price) // 100) * 100`
- 买入前检查：`if quantity >= 100:`
- T+1交易由引擎处理，无需在策略中实现

### 4. 可用数据接口（仅限以下）
- `self.get_close_prices(n)` - 获取最近n日收盘价列表
- `self.get_bars(n)` - 获取最近n根K线对象（含 open, high, low, close, volume）
- `self.position` - 当前持仓数量
- `self.cash` - 可用现金
- `self.total_value` - 总资产价值
- `self.buy(price, quantity)` - 买入
- `self.sell(price, quantity)` - 卖出
- `self.log(message)` - 输出日志

### 5. 参数定义
- 所有可配置参数必须定义为类属性（带默认值）
- 新增参数必须有合理的默认值
- 参数命名使用 snake_case

### 6. 辅助方法
- 可以添加私有辅助方法（以下划线开头）
- 辅助方法应该纯计算，不修改状态
- 常用辅助方法：`_sma`, `_ema`, `_rsi`, `_atr` 等

## 输出要求

1. 只返回完整的修改后 Python 代码
2. 不要包含任何代码外的解释、说明或 markdown 标记
3. 代码必须可以直接被 Python 解释器执行
4. 确保导入语句完整：`from core.strategy.base import BaseStrategy, Bar`

## 修改后代码
"""

# Fix prompt for validation errors
FIX_PROMPT = """策略代码验证失败，请根据错误信息修复代码。

## 原始代码
```python
{original_code}
```

## 验证错误
{validation_errors}

## 修复规则
1. 修复所有语法错误
2. 确保类继承 BaseStrategy
3. 确保实现 on_bar 方法
4. 移除任何禁止的导入（os, sys, subprocess, socket, pathlib, shutil, ctypes）
5. 只使用允许的数据接口

## 修复后代码
```python
"""
