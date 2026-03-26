from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return ["*"]
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(slots=True)
class Settings:
    project_name: str = "BacktestAPI"
    api_v1_str: str = "/api/v1"
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./backtestapi.db"))
    cors_allow_origins: list[str] = field(
        default_factory=lambda: _parse_csv(os.getenv("CORS_ALLOW_ORIGINS"))
    )
    data_path: Path = field(default_factory=lambda: Path(os.getenv("BACKTESTAPI_DATA_PATH", "./data")))
    strategy_path: Path = field(default_factory=lambda: Path(os.getenv("BACKTESTAPI_STRATEGY_PATH", "./strategies")))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))


def get_settings() -> Settings:
    return Settings()
