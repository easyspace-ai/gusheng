from __future__ import annotations

from copy import copy
from datetime import datetime
from typing import Any, Dict, List, Optional

from vnpy.trader.constant import Direction, Offset
from vnpy.trader.object import BarData, TradeData
from vnpy_ctastrategy.template import CtaTemplate
from vnpy.trader.object import OrderData

from core.vnpy_compat import Bar as CompatBar
from core.vnpy_compat import Order as CompatOrder
from core.vnpy_compat import OrderSide, OrderStatus, OrderType, Trade as CompatTrade


class VnpyStrategyBase(CtaTemplate):
    """CTA strategy base that keeps the AstraQuant-style helpers available.

    User strategies continue to write `on_bar(self, bar: Bar)` and call
    `self.buy(...)` / `self.sell(...)`, while the actual execution is driven by
    vn.py's `CtaTemplate` and `BacktestingEngine`.
    """

    author = "BacktestAPI"
    parameters: list[str] = []
    variables: list[str] = []

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        user_on_bar = cls.__dict__.get("on_bar")
        if user_on_bar is not None and user_on_bar is not VnpyStrategyBase.on_bar:
            cls._user_on_bar = user_on_bar
            cls.on_bar = VnpyStrategyBase.on_bar  # type: ignore[assignment]

    def __init__(
        self,
        cta_engine: Any | None = None,
        strategy_name: str = "",
        vt_symbol: str = "",
        setting: Optional[dict] = None,
    ) -> None:
        if cta_engine is not None:
            super().__init__(cta_engine, strategy_name, vt_symbol, setting or {})
        else:
            self.inited = False
            self.trading = False
            self.pos = 0
            self.variables = copy(self.variables)
            self.variables.insert(0, "inited")
            self.variables.insert(1, "trading")
            self.variables.insert(2, "pos")
        self.cta_engine = cta_engine
        self.strategy_name = strategy_name
        self.vt_symbol = vt_symbol
        self.name = strategy_name or self.__class__.__name__
        self.positions: Dict[str, int] = {}
        self.orders: List[CompatOrder] = []
        self.trades: List[CompatTrade] = []
        self.cash = float(getattr(cta_engine, "capital", 0) or 0)
        self.initial_capital = float(getattr(cta_engine, "capital", 0) or 0)
        self._bars: Dict[str, List[CompatBar]] = {}
        self._current_bar: Optional[CompatBar] = None
        self._current_code: str = vt_symbol
        self._last_bar_data: Optional[BarData] = None
        self._order_callback = None
        self._trade_callback = None
        self.apply_parameters(setting)

    def apply_parameters(self, parameters: Optional[Dict[str, Any]] = None) -> None:
        if not parameters:
            return

        for key, value in parameters.items():
            setattr(self, key, value)

    def set_capital(self, capital: float) -> None:
        self.initial_capital = float(capital)
        self.cash = float(capital)
        self.trading = True

    def set_callbacks(self, order_callback=None, trade_callback=None, log_callback=None) -> None:
        self._order_callback = order_callback
        self._trade_callback = trade_callback
        self._log_callback = log_callback

    def log(self, message: str) -> None:
        if getattr(self, "_log_callback", None):
            self._log_callback(message)

    def on_init(self) -> None:
        return

    def on_start(self) -> None:
        return

    def on_stop(self) -> None:
        return

    def on_bar(self, bar: BarData | CompatBar) -> None:  # type: ignore[override]
        compat_bar = self._convert_bar(bar)
        self._current_code = self.vt_symbol or self._current_code
        self._current_bar = compat_bar
        key = self.vt_symbol or self._current_code or self.__class__.__name__
        self._bars.setdefault(key, []).append(compat_bar)

        user_on_bar = getattr(self, "_user_on_bar", None)
        if user_on_bar is not None:
            user_on_bar(compat_bar)

    def on_order(self, order: OrderData) -> None:
        return

    def on_trade(self, trade: TradeData) -> None:
        self._record_trade(
            code=self.vt_symbol,
            direction=trade.direction,
            offset=trade.offset,
            price=float(trade.price or 0),
            volume=float(trade.volume or 0),
            trade_time=trade.datetime,
            trade_id=trade.tradeid,
            order_id=trade.orderid,
        )

    def _on_bar(self, code: str, bar: CompatBar) -> None:
        self._current_code = code
        self._current_bar = bar
        if code in self.positions:
            # Keep the compatibility position snapshot loosely in sync.
            pass

        self.on_bar(bar)

    def _on_order_filled(self, order: CompatOrder, trade: CompatTrade) -> None:
        order.status = OrderStatus.FILLED
        order.filled_quantity = trade.quantity
        order.filled_price = trade.price
        order.update_time = datetime.now()
        self._record_trade(
            code=trade.code,
            direction=Direction.LONG if trade.side == OrderSide.BUY else Direction.SHORT,
            offset=Offset.OPEN if trade.side == OrderSide.BUY else Offset.CLOSE,
            price=trade.price,
            volume=float(trade.quantity),
            trade_time=trade.trade_time,
            trade_id=trade.trade_id,
            order_id=trade.order_id,
            commission=trade.commission,
            pnl=trade.pnl,
        )

    def _record_trade(
        self,
        *,
        code: str,
        direction: Optional[Direction],
        offset: Offset,
        price: float,
        volume: float,
        trade_time: Optional[datetime],
        trade_id: str,
        order_id: str,
        commission: float = 0.0,
        pnl: float = 0.0,
    ) -> None:
        key = code
        if direction == Direction.LONG and offset == Offset.OPEN:
            self.cash -= price * volume
            self.positions[key] = self.positions.get(key, 0) + int(volume)
        elif direction == Direction.SHORT and offset in {Offset.CLOSE, Offset.CLOSETODAY, Offset.CLOSEYESTERDAY}:
            self.cash += price * volume
            self.positions[key] = max(self.positions.get(key, 0) - int(volume), 0)

        self.trades.append(
            CompatTrade(
                trade_id=trade_id,
                order_id=order_id,
                code=key,
                side=OrderSide.BUY if direction == Direction.LONG else OrderSide.SELL,
                price=price,
                quantity=int(volume),
                commission=commission,
                trade_time=trade_time or datetime.now(),
                pnl=pnl,
                bar_time=trade_time,
            )
        )

        if getattr(self, "_trade_callback", None):
            self._trade_callback(self.trades[-1])

    @property
    def position(self) -> int:
        return int(self.pos)

    @property
    def total_value(self) -> float:
        close_price = self._current_bar.close if self._current_bar else 0.0
        return float(self.cash + self.pos * close_price * self.get_size())

    def get_close_prices(self, count: int) -> List[float]:
        key = self.vt_symbol or self._current_code or self.__class__.__name__
        bars = self._bars.get(key, [])
        return [bar.close for bar in bars[-count:]]

    def get_bars(self, count: int) -> List[CompatBar]:
        key = self.vt_symbol or self._current_code or self.__class__.__name__
        return self._bars.get(key, [])[-count:]

    def buy(
        self,
        price: float,
        volume: float | None = None,
        stop: bool = False,
        lock: bool = False,
        net: bool = False,
        quantity: float | None = None,
    ) -> list:
        if volume is None:
            volume = quantity if quantity is not None else 0
        volume = self._normalize_volume(volume)
        if volume <= 0:
            return []
        if self.cta_engine is not None and hasattr(self.cta_engine, "send_order"):
            return super().buy(price, volume, stop=stop, lock=lock, net=net)

        order = CompatOrder(
            order_id=f"O{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            code=self.vt_symbol or self._current_code,
            side=OrderSide.BUY,
            price=price,
            quantity=int(volume),
            order_type=OrderType.MARKET if stop else OrderType.LIMIT,
            status=OrderStatus.SUBMITTED,
            create_time=datetime.now(),
        )
        self.orders.append(order)
        if self._order_callback:
            self._order_callback(order)
        return [order.order_id]

    def sell(
        self,
        price: float,
        volume: float | None = None,
        stop: bool = False,
        lock: bool = False,
        net: bool = False,
        quantity: float | None = None,
    ) -> list:
        if volume is None:
            volume = quantity if quantity is not None else 0
        volume = self._normalize_volume(volume)
        if volume <= 0:
            return []
        if self.cta_engine is not None and hasattr(self.cta_engine, "send_order"):
            return super().sell(price, volume, stop=stop, lock=lock, net=net)

        order = CompatOrder(
            order_id=f"O{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            code=self.vt_symbol or self._current_code,
            side=OrderSide.SELL,
            price=price,
            quantity=int(volume),
            order_type=OrderType.MARKET if stop else OrderType.LIMIT,
            status=OrderStatus.SUBMITTED,
            create_time=datetime.now(),
        )
        self.orders.append(order)
        if self._order_callback:
            self._order_callback(order)
        return [order.order_id]

    def cancel_order(self, vt_orderid: str) -> None:
        if self.cta_engine is not None and hasattr(self.cta_engine, "cancel_order"):
            return super().cancel_order(vt_orderid)
        for order in self.orders:
            if order.order_id == vt_orderid and order.status == OrderStatus.SUBMITTED:
                order.status = OrderStatus.CANCELLED
                order.update_time = datetime.now()
                return

    def cancel_all(self) -> None:
        if self.cta_engine is not None and hasattr(self.cta_engine, "cancel_all"):
            return super().cancel_all()
        for order in self.orders:
            if order.status == OrderStatus.SUBMITTED:
                order.status = OrderStatus.CANCELLED
                order.update_time = datetime.now()

    def _normalize_volume(self, volume: float) -> float:
        return float(int(volume // 100) * 100)

    @staticmethod
    def _convert_bar(bar: BarData | CompatBar) -> CompatBar:
        if isinstance(bar, CompatBar):
            return bar
        return CompatBar(
            datetime=bar.datetime,
            open=float(bar.open_price),
            high=float(bar.high_price),
            low=float(bar.low_price),
            close=float(bar.close_price),
            volume=float(bar.volume),
            amount=float(bar.turnover or (bar.close_price * bar.volume)),
        )
