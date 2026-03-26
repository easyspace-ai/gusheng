from __future__ import annotations

import sys
from types import SimpleNamespace

import pandas as pd

from core.data.pipeline import DataPipeline


def test_data_pipeline_falls_back_to_tencent_source(monkeypatch):
    frame = pd.DataFrame(
        [
            {"date": "2024-01-02", "open": 10.0, "close": 10.2, "high": 10.5, "low": 9.9, "amount": 10200},
        ]
    )

    def failing_hist(*args, **kwargs):
        raise ConnectionError("proxy unavailable")

    def tx_hist(*args, **kwargs):
        return frame.copy()

    fake_akshare = SimpleNamespace(stock_zh_a_hist=failing_hist, stock_zh_a_hist_tx=tx_hist)
    monkeypatch.setitem(sys.modules, "akshare", fake_akshare)

    pipeline = DataPipeline()
    prepared = pipeline.prepare_daily("600519.SH", "2024-01-01", "2024-01-10", source="auto")

    assert prepared.frame.shape[0] == 1
    assert "volume" in prepared.frame.columns
    assert prepared.frame.loc[0, "volume"] > 0
    assert prepared.source == "auto"
