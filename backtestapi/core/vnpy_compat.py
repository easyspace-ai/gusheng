from __future__ import annotations

"""Minimal compatibility layer so strategy code can be validated and loaded before vn.py is wired."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional


class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"


class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


@dataclass
class Bar:
    datetime: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    amount: float = 0.0


@dataclass
class Order:
    order_id: str
    code: str
    side: OrderSide
    price: float
    quantity: int
    order_type: OrderType = OrderType.LIMIT
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: int = 0
    filled_price: float = 0.0
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None


@dataclass
class Trade:
    trade_id: str
    order_id: str
    code: str
    side: OrderSide
    price: float
    quantity: int
    commission: float
    trade_time: datetime
    pnl: float = 0.0
    bar_time: Optional[datetime] = None


@dataclass
class Position:
    code: str
    quantity: int
    avg_cost: float
    current_price: float = 0.0

    @property
    def market_value(self) -> float:
        return self.quantity * self.current_price

    @property
    def profit(self) -> float:
        return (self.current_price - self.avg_cost) * self.quantity

    @property
    def profit_pct(self) -> float:
        if self.avg_cost == 0:
            return 0.0
        return (self.current_price - self.avg_cost) / self.avg_cost * 100


class BaseStrategy:
    """Placeholder BaseStrategy until vn.py strategy adapter is fully wired."""

    def __init__(self) -> None:
        self.name = self.__class__.__name__
        self.positions: Dict[str, Position] = {}
        self.orders: List[Order] = []
        self.trades: List[Trade] = []
        self.cash = 0.0
        self.initial_capital = 0.0
        self._bars: Dict[str, List[Bar]] = {}
        self._current_bar: Optional[Bar] = None
        self._current_code: str = ""
        self._order_callback: Optional[Callable[[Order], Any]] = None
        self._trade_callback: Optional[Callable[[Trade], Any]] = None
        self._log_callback: Optional[Callable[[str], Any]] = None

    def set_capital(self, capital: float) -> None:
        self.initial_capital = capital
        self.cash = capital

    def set_callbacks(self, order_callback=None, trade_callback=None, log_callback=None) -> None:
        self._order_callback = order_callback
        self._trade_callback = trade_callback
        self._log_callback = log_callback

    def apply_parameters(self, parameters: Optional[Dict[str, Any]] = None) -> None:
        """Apply runtime parameters to the strategy instance.

        User strategies can override this method for stricter validation. The
        default behavior mirrors vn.py-style parameter injection by attaching
        each key as an attribute on the instance.
        """
        if not parameters:
            return

        for key, value in parameters.items():
            setattr(self, key, value)
        self.parameters = dict(parameters)

    def log(self, message: str) -> None:
        if self._log_callback:
            self._log_callback(message)

    @property
    def position(self) -> int:
        if self._current_code in self.positions:
            return self.positions[self._current_code].quantity
        return 0

    @property
    def total_value(self) -> float:
        return self.cash + sum(pos.market_value for pos in self.positions.values())

    def get_close_prices(self, count: int) -> List[float]:
        if self._current_code not in self._bars:
            return []
        return [bar.close for bar in self._bars[self._current_code][-count:]]

    def get_bars(self, count: int) -> List[Bar]:
        if self._current_code not in self._bars:
            return []
        return self._bars[self._current_code][-count:]

    def buy(self, price: float, quantity: int, order_type: OrderType = OrderType.LIMIT) -> Optional[Order]:
        quantity = (quantity // 100) * 100
        if quantity <= 0:
            return None

        order = Order(
            order_id=f"O{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            code=self._current_code,
            side=OrderSide.BUY,
            price=price,
            quantity=quantity,
            order_type=order_type,
            status=OrderStatus.SUBMITTED,
            create_time=datetime.now(),
        )
        self.orders.append(order)
        if self._order_callback:
            self._order_callback(order)
        return order

    def sell(self, price: float, quantity: int, order_type: OrderType = OrderType.LIMIT) -> Optional[Order]:
        if self.position < quantity:
            return None

        order = Order(
            order_id=f"O{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            code=self._current_code,
            side=OrderSide.SELL,
            price=price,
            quantity=quantity,
            order_type=order_type,
            status=OrderStatus.SUBMITTED,
            create_time=datetime.now(),
        )
        self.orders.append(order)
        if self._order_callback:
            self._order_callback(order)
        return order

    def cancel_order(self, order_id: str) -> bool:
        for order in self.orders:
            if order.order_id == order_id and order.status == OrderStatus.SUBMITTED:
                order.status = OrderStatus.CANCELLED
                order.update_time = datetime.now()
                return True
        return False

    def _on_bar(self, code: str, bar: Bar) -> None:
        self._current_code = code
        self._current_bar = bar

        if code not in self._bars:
            self._bars[code] = []
        self._bars[code].append(bar)

        if code in self.positions:
            self.positions[code].current_price = bar.close

        self.on_bar(bar)

    def _on_order_filled(self, order: Order, trade: Trade) -> None:
        order.status = OrderStatus.FILLED
        order.filled_quantity = trade.quantity
        order.filled_price = trade.price
        order.update_time = datetime.now()
        self.trades.append(trade)

        if trade.side == OrderSide.BUY:
            self.cash -= trade.price * trade.quantity + trade.commission
            if trade.code in self.positions:
                pos = self.positions[trade.code]
                total_cost = pos.avg_cost * pos.quantity + trade.price * trade.quantity
                pos.quantity += trade.quantity
                pos.avg_cost = total_cost / pos.quantity
                pos.current_price = trade.price
            else:
                self.positions[trade.code] = Position(
                    code=trade.code,
                    quantity=trade.quantity,
                    avg_cost=trade.price,
                    current_price=trade.price,
                )
        else:
            if trade.code in self.positions:
                trade.pnl = (trade.price - self.positions[trade.code].avg_cost) * trade.quantity - trade.commission
            self.cash += trade.price * trade.quantity - trade.commission
            if trade.code in self.positions:
                self.positions[trade.code].quantity -= trade.quantity
                self.positions[trade.code].current_price = trade.price
                if self.positions[trade.code].quantity <= 0:
                    del self.positions[trade.code]

        if self._trade_callback:
            self._trade_callback(trade)

    def on_bar(self, bar: Bar) -> None:  # pragma: no cover - user strategy hook
        raise NotImplementedError
