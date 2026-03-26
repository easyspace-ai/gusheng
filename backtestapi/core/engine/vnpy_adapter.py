from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd

from core.vnpy_compat import (
    Bar,
    BaseStrategy,
    Order,
    OrderSide,
    OrderStatus,
    OrderType,
    Trade,
)
from core.strategy.vnpy_base import VnpyStrategyBase

from vnpy.trader.constant import Exchange, Interval
from vnpy.trader.object import BarData
from vnpy_ctastrategy.backtesting import BacktestingEngine, BacktestingMode


@dataclass
class EngineExecutionResult:
    equity_curve: List[float] = field(default_factory=list)
    equity_points: List[Dict[str, Any]] = field(default_factory=list)
    trades: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    source: str = "vnpy"


class VNpyBacktestEngineAdapter:
    """Bridge our service layer to vn.py backtesting components."""

    def __init__(self, initial_capital: float, commission_rate: float, slippage: float) -> None:
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage = slippage

    def execute(
        self,
        strategy_instance: Any,
        data: pd.DataFrame,
        symbol: str,
        parameters: Optional[Dict[str, Any]] = None,
        benchmark_symbol: Optional[str] = None,
    ) -> EngineExecutionResult:
        """Execute a backtest.

        The adapter prefers the real vn.py engine when available and falls back
        to a local event-driven engine with the same service-level outputs.
        """
        try:
            return self._execute_vnpy(strategy_instance, data, symbol, parameters, benchmark_symbol)
        except Exception:
            return self._execute_local(strategy_instance, data, symbol, parameters, benchmark_symbol)

    @staticmethod
    def _apply_parameters(strategy_instance: Any, parameters: Optional[Dict[str, Any]]) -> None:
        if not parameters:
            return

        if hasattr(strategy_instance, "apply_parameters"):
            strategy_instance.apply_parameters(parameters)
            return

        for key, value in parameters.items():
            setattr(strategy_instance, key, value)

    def _execute_vnpy(
        self,
        strategy_instance: Any,
        data: pd.DataFrame,
        symbol: str,
        parameters: Optional[Dict[str, Any]],
        benchmark_symbol: Optional[str],
    ) -> EngineExecutionResult:
        vt_symbol, exchange = self._normalize_vt_symbol(symbol)
        strategy_cls = strategy_instance.__class__

        engine = BacktestingEngine()
        engine.set_parameters(
            vt_symbol=vt_symbol,
            interval=Interval.DAILY,
            start=pd.to_datetime(data["date"].min()).to_pydatetime(),
            end=pd.to_datetime(data["date"].max()).to_pydatetime(),
            rate=self.commission_rate,
            slippage=self.slippage,
            size=1,
            pricetick=0.01,
            capital=int(self.initial_capital),
            mode=BacktestingMode.BAR,
        )
        engine.add_strategy(strategy_cls, parameters or {})
        engine.history_data = self._build_history_data(data, vt_symbol, exchange)
        engine.run_backtesting()

        result_df = engine.calculate_result()
        statistics = engine.calculate_statistics(result_df, output=False)

        equity_curve: List[float] = [self.initial_capital]
        equity_points: List[Dict[str, Any]] = []
        if result_df is not None and not result_df.empty:
            for trade_date, row in result_df.iterrows():
                balance = float(row.get("balance", self.initial_capital))
                equity_curve.append(balance)
                close_price = float(row.get("close_price", row.get("close", 0.0)))
                end_pos = float(row.get("end_pos", 0.0))
                position_value = end_pos * close_price
                cash = balance - position_value
                equity_points.append(
                    {
                        "trade_date": str(trade_date),
                        "equity": balance,
                        "cash": cash,
                        "position_value": position_value,
                        "drawdown": float(row.get("ddpercent", 0.0)),
                    }
                )

        trades = [self._vnpy_trade_to_dict(trade, commission_rate=self.commission_rate) for trade in engine.get_all_trades()]
        return EngineExecutionResult(
            equity_curve=equity_curve,
            equity_points=equity_points,
            trades=trades,
            metrics=self._map_statistics(statistics, engine),
            source="vnpy",
        )

    def _execute_local(
        self,
        strategy_instance: Any,
        data: pd.DataFrame,
        symbol: str,
        parameters: Optional[Dict[str, Any]],
        benchmark_symbol: Optional[str],
    ) -> EngineExecutionResult:
        self._apply_parameters(strategy_instance, parameters)
        engine = _LocalBacktestEngine(
            initial_capital=self.initial_capital,
            commission_rate=self.commission_rate,
            slippage=self.slippage,
        )
        return engine.run(strategy_instance=strategy_instance, data=data, symbol=symbol)

    @staticmethod
    def _normalize_vt_symbol(symbol: str) -> tuple[str, Exchange]:
        raw = symbol.strip().upper()
        if "." in raw:
            code, suffix = raw.split(".", 1)
            suffix_map = {
                "SH": Exchange.SSE,
                "SZ": Exchange.SZSE,
                "BJ": Exchange.BSE,
                "SSE": Exchange.SSE,
                "SZSE": Exchange.SZSE,
                "BSE": Exchange.BSE,
            }
            exchange = suffix_map.get(suffix, Exchange.LOCAL)
            return f"{code}.{exchange.value}", exchange

        if raw.startswith(("6", "5", "9")):
            exchange = Exchange.SSE
        elif raw.startswith(("0", "3")):
            exchange = Exchange.SZSE
        else:
            exchange = Exchange.LOCAL
        return f"{raw}.{exchange.value}", exchange

    def _build_history_data(self, data: pd.DataFrame, vt_symbol: str, exchange: Exchange) -> list[BarData]:
        bars: list[BarData] = []
        ordered = data.sort_values("date").drop_duplicates(subset=["date"]).reset_index(drop=True)
        for _, row in ordered.iterrows():
            dt = pd.to_datetime(row["date"]).to_pydatetime()
            close_price = float(row.get("close", 0))
            bars.append(
                BarData(
                    gateway_name="BACKTEST",
                    symbol=vt_symbol.split(".", 1)[0],
                    exchange=exchange,
                    datetime=dt,
                    interval=Interval.DAILY,
                    volume=float(row.get("volume", 0)),
                    turnover=float(row.get("amount", close_price * float(row.get("volume", 0)))),
                    open_interest=0,
                    open_price=float(row.get("open", 0)),
                    high_price=float(row.get("high", 0)),
                    low_price=float(row.get("low", 0)),
                    close_price=close_price,
                )
            )
        return bars

    @staticmethod
    def _vnpy_trade_to_dict(trade: Any, commission_rate: float = 0.0) -> Dict[str, Any]:
        price = float(getattr(trade, "price", 0.0) or 0.0)
        volume = float(getattr(trade, "volume", 0.0) or 0.0)
        direction = getattr(trade, "direction", None)
        commission = price * volume * commission_rate
        if getattr(direction, "value", "") == "空":
            commission += price * volume * 0.001
        return {
            "trade_id": getattr(trade, "tradeid", ""),
            "order_id": getattr(trade, "orderid", ""),
            "code": f"{getattr(trade, 'symbol', '')}.{getattr(getattr(trade, 'exchange', None), 'value', '')}".rstrip("."),
            "side": getattr(getattr(trade, "direction", None), "value", str(getattr(trade, "direction", ""))),
            "price": price,
            "quantity": int(volume),
            "commission": commission,
            "trade_time": getattr(trade, "datetime", datetime.now()).isoformat() if getattr(trade, "datetime", None) else datetime.now().isoformat(),
            "pnl": 0.0,
            "bar_time": getattr(trade, "datetime", None).isoformat() if getattr(trade, "datetime", None) else None,
        }

    @staticmethod
    def _map_statistics(statistics: Dict[str, Any], engine: BacktestingEngine) -> Dict[str, Any]:
        return {
            "initial_capital": float(statistics.get("capital", engine.capital) or engine.capital or 0),
            "final_capital": float(statistics.get("end_balance", engine.capital) or engine.capital or 0),
            "total_return": float(statistics.get("total_return", 0.0) or 0.0),
            "annual_return": float(statistics.get("annual_return", 0.0) or 0.0),
            "max_drawdown": float(abs(statistics.get("max_drawdown", 0.0) or 0.0)),
            "volatility": float(statistics.get("return_std", 0.0) or 0.0),
            "sharpe_ratio": float(statistics.get("sharpe_ratio", 0.0) or 0.0),
            "sortino_ratio": 0.0,
            "calmar_ratio": float(statistics.get("return_drawdown_ratio", 0.0) or 0.0),
            "total_trades": int(statistics.get("total_trade_count", 0) or 0),
            "win_trades": int(statistics.get("profit_days", 0) or 0),
            "loss_trades": int(statistics.get("loss_days", 0) or 0),
            "win_rate": 0.0,
            "profit_loss_ratio": 0.0,
            "avg_profit": float(statistics.get("daily_net_pnl", 0.0) or 0.0),
            "avg_loss": 0.0,
            "max_profit": 0.0,
            "max_loss": 0.0,
            "benchmark_return": 0.0,
        }


class _LocalBacktestEngine:
    """Daily-bar backtester used as a compatibility fallback.

    This follows the same data flow and accounting model that we will map to
    vn.py. Once the vn.py bridge is available in the runtime, we can swap the
    implementation behind the same adapter interface.
    """

    def __init__(self, initial_capital: float, commission_rate: float, slippage: float) -> None:
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage = slippage
        self.trade_counter = 0

    def run(self, strategy_instance: BaseStrategy, data: pd.DataFrame, symbol: str) -> EngineExecutionResult:
        strategy_instance.set_capital(self.initial_capital)
        strategy_instance.set_callbacks(order_callback=self._make_order_callback(strategy_instance), trade_callback=None)
        strategy_instance._current_code = symbol

        if hasattr(strategy_instance, "apply_parameters"):
            strategy_instance.apply_parameters(getattr(strategy_instance, "parameters", None))
        if hasattr(strategy_instance, "on_start"):
            try:
                strategy_instance.on_start()
            except Exception:
                pass

        equity_curve: List[float] = [self.initial_capital]
        dates: List[Any] = []
        equity_points: List[Dict[str, Any]] = []
        running_peak = float(self.initial_capital)

        for _, row in data.iterrows():
            bar = self._row_to_bar(row)
            dates.append(bar.datetime)
            self._process_orders(strategy_instance, symbol, bar)
            strategy_instance._on_bar(symbol, bar)
            total_value = float(strategy_instance.total_value)
            equity_curve.append(total_value)
            running_peak = max(running_peak, total_value)
            drawdown = 0.0 if running_peak <= 0 else (running_peak - total_value) / running_peak * 100
            equity_points.append(
                {
                    "trade_date": bar.datetime.date().isoformat(),
                    "equity": total_value,
                    "cash": float(strategy_instance.cash),
                    "position_value": float(total_value - strategy_instance.cash),
                    "drawdown": float(drawdown),
                }
            )

        if hasattr(strategy_instance, "on_stop"):
            try:
                strategy_instance.on_stop()
            except Exception:
                pass

        metrics = self._calculate_metrics(strategy_instance, equity_curve, dates)
        trades = [self._trade_to_dict(trade) for trade in strategy_instance.trades]
        return EngineExecutionResult(
            equity_curve=equity_curve,
            equity_points=equity_points,
            trades=trades,
            metrics=metrics,
            source="local-fallback",
        )

    def _make_order_callback(self, strategy_instance: BaseStrategy):
        def _submit(order: Order) -> None:
            # Orders are submitted into the local engine and filled when bars
            # satisfy the price conditions.
            return None

        return _submit

    @staticmethod
    def _row_to_bar(row: pd.Series) -> Bar:
        amount = row.get("amount")
        if pd.isna(amount) if amount is not None else True:
            amount = float(row.get("close", 0)) * float(row.get("volume", 0))
        return Bar(
            datetime=pd.to_datetime(row["date"]).to_pydatetime(),
            open=float(row.get("open", 0)),
            high=float(row.get("high", 0)),
            low=float(row.get("low", 0)),
            close=float(row.get("close", 0)),
            volume=float(row.get("volume", 0)),
            amount=float(amount),
        )

    def _process_orders(self, strategy_instance: BaseStrategy, symbol: str, bar: Bar) -> None:
        for order in list(strategy_instance.orders):
            if order.code != symbol or order.status != OrderStatus.SUBMITTED:
                continue

            can_fill = False
            fill_price = order.price

            if order.order_type == OrderType.MARKET:
                can_fill = True
                fill_price = bar.open
            elif order.side == OrderSide.BUY:
                if bar.low <= order.price:
                    can_fill = True
                    fill_price = min(order.price, bar.open) * (1 + self.slippage)
            else:
                if bar.high >= order.price:
                    can_fill = True
                    fill_price = max(order.price, bar.open) * (1 - self.slippage)

            if not can_fill:
                continue

            commission = fill_price * order.quantity * self.commission_rate
            if order.side == OrderSide.SELL:
                commission += fill_price * order.quantity * 0.001

            trade = Trade(
                trade_id=f"T{self.trade_counter:08d}",
                order_id=order.order_id,
                code=symbol,
                side=order.side,
                price=fill_price,
                quantity=order.quantity,
                commission=commission,
                trade_time=bar.datetime,
                bar_time=bar.datetime,
            )
            self.trade_counter += 1
            strategy_instance._on_order_filled(order, trade)

    @staticmethod
    def _trade_to_dict(trade: Trade) -> Dict[str, Any]:
        return {
            "trade_id": trade.trade_id,
            "order_id": trade.order_id,
            "code": trade.code,
            "side": trade.side.value if hasattr(trade.side, "value") else str(trade.side),
            "price": trade.price,
            "quantity": trade.quantity,
            "commission": trade.commission,
            "trade_time": trade.trade_time.isoformat(),
            "pnl": trade.pnl,
            "bar_time": trade.bar_time.isoformat() if trade.bar_time else None,
        }

    def _calculate_metrics(self, strategy_instance: BaseStrategy, equity_curve: List[float], dates: List[Any]) -> Dict[str, Any]:
        if not equity_curve:
            return {}

        equity = pd.Series(equity_curve, dtype="float64")
        initial = float(equity.iloc[0])
        final = float(equity.iloc[-1])
        total_return = (final / initial - 1.0) * 100 if initial else 0.0

        returns = equity.pct_change().dropna()
        volatility = float(returns.std(ddof=1) * (252 ** 0.5) * 100) if len(returns) > 1 else 0.0
        annual_return = total_return if len(dates) <= 1 else float((pow(final / initial, 365 / max(len(dates), 1)) - 1) * 100)
        running_max = equity.cummax().replace(0, 1)
        max_drawdown = float(((running_max - equity) / running_max).max() * 100)

        trades = strategy_instance.trades
        trade_profits: List[float] = []
        buy_trades: Dict[str, List[Trade]] = {}
        for trade in trades:
            if trade.side == OrderSide.BUY:
                buy_trades.setdefault(trade.code, []).append(trade)
            else:
                if trade.code in buy_trades and buy_trades[trade.code]:
                    buy_trade = buy_trades[trade.code].pop(0)
                    profit = (trade.price - buy_trade.price) * trade.quantity - trade.commission - buy_trade.commission
                    trade_profits.append(profit)

        wins = [p for p in trade_profits if p > 0]
        losses = [p for p in trade_profits if p < 0]
        avg_profit = float(sum(wins) / len(wins)) if wins else 0.0
        avg_loss = float(sum(losses) / len(losses)) if losses else 0.0

        metrics = {
            "initial_capital": initial,
            "final_capital": final,
            "total_return": total_return,
            "annual_return": annual_return,
            "max_drawdown": max_drawdown,
            "volatility": volatility,
            "sharpe_ratio": float((annual_return - 3) / volatility) if volatility > 0 else 0.0,
            "sortino_ratio": 0.0,
            "calmar_ratio": float(annual_return / max_drawdown) if max_drawdown > 0 else 0.0,
            "total_trades": len(trades),
            "win_trades": len(wins),
            "loss_trades": len(losses),
            "win_rate": float(len(wins) / len(trade_profits) * 100) if trade_profits else 0.0,
            "profit_loss_ratio": float(abs(avg_profit / avg_loss)) if avg_loss != 0 else 0.0,
            "avg_profit": avg_profit,
            "avg_loss": avg_loss,
            "max_profit": float(max(wins)) if wins else 0.0,
            "max_loss": float(min(losses)) if losses else 0.0,
        }
        return metrics
