from __future__ import annotations

from typing import List, Tuple

import pandas as pd

from core.data.pipeline import DataPipeline, PreparedData


def get_pipeline() -> DataPipeline:
    return DataPipeline()


def preview_data(symbol: str, start_date: str, end_date: str, frequency: str = "daily", source: str = "auto") -> PreparedData:
    pipeline = get_pipeline()
    if frequency != "daily":
        raise ValueError("Only daily frequency is scaffolded for the first stage")
    return pipeline.prepare_daily(symbol, start_date, end_date, source=source)


def clean_data_frame(frame: pd.DataFrame) -> pd.DataFrame:
    pipeline = get_pipeline()
    return pipeline.clean(frame)
