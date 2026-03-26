from __future__ import annotations

"""Compatibility layer for strategy code.

User-authored strategies can import from the familiar AstraQuant style path:

    from core.strategy.base import BaseStrategy, Bar

This file re-exports the lightweight scaffolding types used by the backtest
service until the vn.py bridge is fully wired.
"""

from core.vnpy_compat import Bar, BaseStrategy, OrderSide, OrderStatus, OrderType

