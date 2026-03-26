from __future__ import annotations

import os
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import numpy as np


@dataclass
class PreparedData:
    symbol: str
    frequency: str
    frame: pd.DataFrame
    warnings: List[str] = field(default_factory=list)
    source: str = "unknown"


class DataPipeline:
    """Fetch, clean, and normalize A-share market data for backtesting."""

    REQUIRED_COLUMNS = {"date", "open", "high", "low", "close", "volume"}
    PROXY_ENV_KEYS = ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")

    @staticmethod
    def normalize_symbol(symbol: str) -> str:
        return symbol.split(".")[0].strip()

    @staticmethod
    def _to_tx_symbol(symbol: str) -> str:
        code = DataPipeline.normalize_symbol(symbol)
        if code.startswith(("6", "5", "9")):
            return f"sh{code}"
        if code.startswith(("0", "3")):
            return f"sz{code}"
        if code.startswith("8"):
            return f"bj{code}"
        return code

    @contextmanager
    def _without_proxies(self):
        saved = {key: os.environ.get(key) for key in self.PROXY_ENV_KEYS}
        try:
            for key in self.PROXY_ENV_KEYS:
                os.environ.pop(key, None)
            yield
        finally:
            for key, value in saved.items():
                if value:
                    os.environ[key] = value

    def _fetch_with_akshare_hist(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        import akshare as ak

        code = self.normalize_symbol(symbol)
        with self._without_proxies():
            return ak.stock_zh_a_hist(
                symbol=code,
                period="daily",
                start_date=start_date.replace("-", ""),
                end_date=end_date.replace("-", ""),
                adjust="qfq",
            )

    def _fetch_with_akshare_tx(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        import akshare as ak

        tx_symbol = self._to_tx_symbol(symbol)
        with self._without_proxies():
            return ak.stock_zh_a_hist_tx(
                symbol=tx_symbol,
                start_date=start_date.replace("-", ""),
                end_date=end_date.replace("-", ""),
                adjust="qfq",
            )

    def fetch_daily(self, symbol: str, start_date: str, end_date: str, source: str = "auto") -> pd.DataFrame:
        source = (source or "auto").strip().lower()
        if source not in {"auto", "akshare", "akshare_tx"}:
            raise ValueError(f"Unsupported source: {source}")

        try:
            import akshare as ak
        except Exception as exc:
            raise RuntimeError(f"akshare is not available: {exc}") from exc

        rename_map = {
            "日期": "date",
            "开盘": "open",
            "收盘": "close",
            "最高": "high",
            "最低": "low",
            "成交量": "volume",
            "成交额": "amount",
            "涨跌幅": "pct_change",
        }

        candidates: List[str]
        if source == "akshare_tx":
            candidates = ["akshare_tx"]
        elif source == "akshare":
            candidates = ["akshare", "akshare_tx"]
        else:
            candidates = ["akshare", "akshare_tx"]

        last_error: Exception | None = None
        for candidate in candidates:
            try:
                if candidate == "akshare":
                    df = self._fetch_with_akshare_hist(symbol, start_date, end_date)
                else:
                    df = self._fetch_with_akshare_tx(symbol, start_date, end_date)
                if df is None or df.empty:
                    continue
                return df.rename(columns=rename_map)
            except Exception as exc:
                last_error = exc
                continue

        if last_error is not None:
            raise RuntimeError(
                "Failed to fetch daily market data from akshare/akshare_tx. "
                "The environment may block outbound data requests or proxy settings may be invalid."
            ) from last_error
        return pd.DataFrame()

    def clean(self, frame: pd.DataFrame) -> pd.DataFrame:
        if frame is None or frame.empty:
            return pd.DataFrame()

        df = frame.copy()
        if "date" not in df.columns:
            raise ValueError("data frame must contain a date column")

        df["date"] = pd.to_datetime(df["date"])
        for col in ["open", "high", "low", "close", "volume"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        if "volume" not in df.columns and "amount" in df.columns:
            amount = pd.to_numeric(df["amount"], errors="coerce")
            close = pd.to_numeric(df["close"], errors="coerce") if "close" in df.columns else None
            if close is not None:
                derived_volume = amount / close
                df["volume"] = derived_volume.replace([np.inf, -np.inf], np.nan)
            else:
                df["volume"] = amount

        required_missing = [col for col in ["open", "high", "low", "close", "volume"] if col not in df.columns]
        if required_missing:
            raise ValueError(f"data frame missing required column: {required_missing[0]}")

        if "amount" not in df.columns:
            df["amount"] = df["close"] * df["volume"]
        else:
            df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

        df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
        df["volume"] = df["volume"].fillna(df["amount"] / df["close"])
        df["volume"] = df["volume"].replace([np.inf, -np.inf], np.nan)

        df = df.dropna(subset=["open", "high", "low", "close", "volume"])
        df = df.sort_values("date").drop_duplicates(subset=["date"]).reset_index(drop=True)
        return df

    def prepare_daily(self, symbol: str, start_date: str, end_date: str, source: str = "auto") -> PreparedData:
        warnings: List[str] = []
        raw = self.fetch_daily(symbol, start_date, end_date, source=source)
        if raw.empty:
            warnings.append("empty market data")
            return PreparedData(symbol=symbol, frequency="daily", frame=raw, warnings=warnings, source=source)

        cleaned = self.clean(raw)
        if cleaned.empty:
            warnings.append("cleaned market data is empty")

        return PreparedData(symbol=symbol, frequency="daily", frame=cleaned, warnings=warnings, source=source)
