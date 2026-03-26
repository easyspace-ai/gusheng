from __future__ import annotations

from dataclasses import dataclass
from textwrap import dedent
from typing import Any, Dict, List


@dataclass(frozen=True)
class BuiltinStrategyTemplate:
    name: str
    description: str
    tags: List[str]
    template_type: str
    code: str
    parameters_schema: Dict[str, Any]
    version: str = "1.0.0"
    status: str = "active"
    is_template: bool = True


def _dual_ma_template() -> BuiltinStrategyTemplate:
    return BuiltinStrategyTemplate(
        name="双均线策略",
        description="单标的 A 股趋势跟随模板，支持快慢均线交叉、追踪止损和最大回撤控制。",
        tags=["A股", "日频", "趋势", "均线"],
        template_type="trend_following",
        code=dedent(
            """
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

                    current_value = self.total_value
                    if current_value > self.highest_value:
                        self.highest_value = current_value
                    drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
                    if drawdown > self.max_drawdown and self.position > 0:
                        self.log(f"触发最大回撤限制: {drawdown:.2%}")
                        self.sell(price=bar.close, quantity=self.position)
                        return

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
            """
        ).strip(),
        parameters_schema={
            "fast_period": {"title": "快线周期", "type": "number", "default": 5, "minimum": 1},
            "slow_period": {"title": "慢线周期", "type": "number", "default": 13, "minimum": 2},
            "risk_ratio": {"title": "风险比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "max_drawdown": {"title": "最大回撤", "type": "number", "default": 0.15, "minimum": 0.01},
            "trail_percent": {"title": "止损比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "enable_trailing_stop": {"title": "追踪止损", "type": "boolean", "default": False},
            "enable_death_cross": {"title": "死叉卖出", "type": "boolean", "default": False},
        },
    )


def _market_sentiment_template() -> BuiltinStrategyTemplate:
    return BuiltinStrategyTemplate(
        name="市场情绪策略",
        description="A 股单标的情绪代理模板，使用价格偏离、动量和成交量异常近似市场情绪，便于后续接入真实情绪数据。",
        tags=["A股", "日频", "情绪", "均值回归"],
        template_type="sentiment_proxy",
        code=dedent(
            """
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
            """
        ).strip(),
        parameters_schema={
            "lookback": {"title": "回看窗口", "type": "number", "default": 20, "minimum": 5},
            "sentiment_buy_threshold": {"title": "买入阈值", "type": "number", "default": 35.0, "minimum": 0, "maximum": 100},
            "sentiment_sell_threshold": {"title": "卖出阈值", "type": "number", "default": 70.0, "minimum": 0, "maximum": 100},
            "risk_ratio": {"title": "风险比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "max_drawdown": {"title": "最大回撤", "type": "number", "default": 0.15, "minimum": 0.01},
            "take_profit_ratio": {"title": "止盈比例", "type": "number", "default": 0.12, "minimum": 0.01},
            "stop_loss_ratio": {"title": "止损比例", "type": "number", "default": 0.06, "minimum": 0.01},
            "target_position_ratio": {"title": "目标仓位", "type": "number", "default": 0.35, "minimum": 0.01, "maximum": 1.0},
        },
    )


def _etf_rotation_template() -> BuiltinStrategyTemplate:
    return BuiltinStrategyTemplate(
        name="ETF轮动策略",
        description="ETF 轮动的多标的模板。当前回测引擎仍是单标的版本，因此这里保留轮动骨架，便于后续扩展到组合回测。",
        tags=["A股", "ETF", "轮动", "动量"],
        template_type="multi_asset_template",
        code=dedent(
            """
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

                    current_value = self.total_value
                    if current_value > self.highest_value:
                        self.highest_value = current_value
                    drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
                    if drawdown > self.max_drawdown and self.position > 0:
                        self.sell(price=bar.close, quantity=self.position)
                        return

                    # 说明：这是轮动策略的单标的占位模板，真实的多 ETF 轮动需要多标的引擎支持。
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
            """
        ).strip(),
        parameters_schema={
            "momentum_short": {"title": "短期动量", "type": "number", "default": 10, "minimum": 2},
            "momentum_long": {"title": "长期动量", "type": "number", "default": 60, "minimum": 5},
            "rebalance_interval": {"title": "调仓周期", "type": "number", "default": 30, "minimum": 1},
            "num_positions": {"title": "持仓数", "type": "number", "default": 1, "minimum": 1},
            "risk_ratio": {"title": "风险比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "max_drawdown": {"title": "最大回撤", "type": "number", "default": 0.15, "minimum": 0.01},
            "trail_percent": {"title": "止损比例", "type": "number", "default": 0.025, "minimum": 0.001},
        },
    )


def _dual_ma_hedging_template() -> BuiltinStrategyTemplate:
    return BuiltinStrategyTemplate(
        name="双均线对冲策略",
        description="双均线基础策略加上对冲接口骨架。当前引擎只接单标的，期货对冲部分保留为后续多资产扩展入口。",
        tags=["A股", "趋势", "对冲", "扩展模板"],
        template_type="hedging_template",
        code=dedent(
            """
            from core.strategy.base import BaseStrategy, Bar


            class DualMAHedgingStrategy(BaseStrategy):
                fast_period = 5
                slow_period = 13
                risk_ratio = 0.02
                max_drawdown = 0.15
                trail_percent = 0.02
                enable_death_cross = False
                enable_hedging = False
                hedge_ratio = 0.5

                def on_start(self):
                    self.highest_value = self.total_value
                    self.entry_price = 0.0
                    self.peak_price = 0.0
                    self.hedge_active = False

                def _sma(self, values, period):
                    if len(values) < period:
                        return None
                    return sum(values[-period:]) / period

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

                    current_value = self.total_value
                    if current_value > self.highest_value:
                        self.highest_value = current_value
                    drawdown = 0.0 if self.highest_value <= 0 else (self.highest_value - current_value) / self.highest_value
                    if drawdown > self.max_drawdown and self.position > 0:
                        self.sell(price=bar.close, quantity=self.position)
                        self.hedge_active = False
                        return

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
                                self.buy(price=bar.close, quantity=quantity)
                    else:
                        self.peak_price = max(self.peak_price, bar.close)
                        if self.enable_death_cross and cross_down:
                            self.sell(price=bar.close, quantity=self.position)
                            self.hedge_active = False
                            return

                        trailing_price = self.peak_price * (1 - self.trail_percent)
                        if bar.close <= trailing_price:
                            self.sell(price=bar.close, quantity=self.position)
                            self.hedge_active = False
                            return

                        # 预留对冲入口：当前版本不接多数据源，后续可在这里扩展期货或反向 ETF 对冲逻辑。
                        if self.enable_hedging and not self.hedge_active:
                            self.log("对冲模板已触发，但当前引擎仅支持单标的，暂不执行真实对冲。")
                            self.hedge_active = True
            """
        ).strip(),
        parameters_schema={
            "fast_period": {"title": "快线周期", "type": "number", "default": 5, "minimum": 1},
            "slow_period": {"title": "慢线周期", "type": "number", "default": 13, "minimum": 2},
            "risk_ratio": {"title": "风险比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "max_drawdown": {"title": "最大回撤", "type": "number", "default": 0.15, "minimum": 0.01},
            "trail_percent": {"title": "止损比例", "type": "number", "default": 0.02, "minimum": 0.001},
            "enable_death_cross": {"title": "死叉卖出", "type": "boolean", "default": False},
            "enable_hedging": {"title": "启用对冲", "type": "boolean", "default": False},
            "hedge_ratio": {"title": "对冲比例", "type": "number", "default": 0.5, "minimum": 0.0, "maximum": 1.0},
        },
    )


def get_builtin_strategy_templates() -> list[BuiltinStrategyTemplate]:
    return [
        _dual_ma_template(),
        _market_sentiment_template(),
        _etf_rotation_template(),
        _dual_ma_hedging_template(),
    ]
