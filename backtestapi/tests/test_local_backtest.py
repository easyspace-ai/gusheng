from __future__ import annotations

import pandas as pd

from core.engine.vnpy_adapter import VNpyBacktestEngineAdapter
from core.strategy.loader import load_strategy_class


STRATEGY_CODE = """
from core.strategy.base import BaseStrategy, Bar


class DemoStrategy(BaseStrategy):
    def on_bar(self, bar: Bar):
        closes = self.get_close_prices(2)
        if len(closes) == 1 and bar.close > self.threshold:
            self.buy(price=bar.close, quantity=100)
        elif len(closes) >= 2 and self.position > 0:
            self.sell(price=bar.close, quantity=self.position)
"""


def test_local_backtest_executes_and_persists_shape():
    strategy_cls = load_strategy_class(STRATEGY_CODE)
    strategy = strategy_cls()
    strategy.apply_parameters({"threshold": 9})

    frame = pd.DataFrame(
        [
            {"date": "2024-01-02", "open": 10, "high": 11, "low": 9, "close": 10, "volume": 1000},
            {"date": "2024-01-03", "open": 11, "high": 12, "low": 10, "close": 11, "volume": 1200},
            {"date": "2024-01-04", "open": 12, "high": 13, "low": 11, "close": 12, "volume": 1400},
        ]
    )

    adapter = VNpyBacktestEngineAdapter(initial_capital=100000.0, commission_rate=0.0003, slippage=0.001)
    result = adapter.execute(strategy_instance=strategy, data=frame, symbol="000001.SZ", parameters={"threshold": 9})

    assert result.source == "local-fallback"
    assert len(result.equity_curve) == 4
    assert len(result.equity_points) == 3
    assert len(result.trades) == 2
    assert result.metrics["total_trades"] == 2
    assert result.metrics["final_capital"] > 0
    assert result.trades[0]["trade_time"].startswith("2024-01-03")
