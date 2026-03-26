from __future__ import annotations

import os
import sqlite3
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    event,
    text,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from api.settings import get_settings

settings = get_settings()


def _runtime_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def _resolve_db_url(db_url: str) -> str:
    if not db_url.startswith("sqlite"):
        return db_url
    raw_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    path = Path(raw_path)
    if not path.is_absolute():
        path = _runtime_base_dir() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path}"


DATABASE_URL = _resolve_db_url(settings.database_url)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)

    def _can_use_wal() -> bool:
        db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        parent = Path(db_path).resolve().parent
        return os.access(parent, os.W_OK)

    _use_wal = _can_use_wal()

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        if _use_wal:
            cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_size=20,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600,
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class StrategyDB(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    code = Column(Text, nullable=False)
    language = Column(String(20), default="python", nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    parameters_schema = Column(JSON, nullable=True)
    version = Column(String(32), default="1.0.0", nullable=False)
    is_template = Column(Boolean, default=False, nullable=False)
    template_type = Column(String(64), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class BacktestJobDB(Base):
    __tablename__ = "backtest_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    strategy_id = Column(Integer, nullable=False, index=True)
    strategy_version = Column(String(32), nullable=True)
    symbol = Column(String(32), nullable=False, index=True)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    initial_capital = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)
    slippage = Column(Float, nullable=False)
    parameters = Column(JSON, nullable=True)
    benchmark_symbol = Column(String(32), nullable=True)
    data_source = Column(String(32), nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    progress = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)


class BacktestResultDB(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    strategy_id = Column(Integer, nullable=False, index=True)
    strategy_name = Column(String(128), nullable=False, index=True)
    symbol = Column(String(32), nullable=False, index=True)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    initial_capital = Column(Float, nullable=False)
    final_capital = Column(Float, nullable=False)
    total_return = Column(Float, nullable=False)
    annual_return = Column(Float, nullable=False)
    benchmark_return = Column(Float, default=0.0, nullable=False)
    max_drawdown = Column(Float, default=0.0, nullable=False)
    volatility = Column(Float, default=0.0, nullable=False)
    sharpe_ratio = Column(Float, default=0.0, nullable=False)
    sortino_ratio = Column(Float, default=0.0, nullable=False)
    calmar_ratio = Column(Float, default=0.0, nullable=False)
    total_trades = Column(Integer, default=0, nullable=False)
    win_trades = Column(Integer, default=0, nullable=False)
    loss_trades = Column(Integer, default=0, nullable=False)
    win_rate = Column(Float, default=0.0, nullable=False)
    profit_loss_ratio = Column(Float, default=0.0, nullable=False)
    avg_profit = Column(Float, default=0.0, nullable=False)
    avg_loss = Column(Float, default=0.0, nullable=False)
    max_profit = Column(Float, default=0.0, nullable=False)
    max_loss = Column(Float, default=0.0, nullable=False)
    equity_curve_json = Column(JSON, nullable=True)
    metrics_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BacktestTradeDB(Base):
    __tablename__ = "backtest_trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), nullable=False, index=True)
    trade_id = Column(String(64), unique=True, nullable=False)
    order_id = Column(String(64), nullable=False)
    symbol = Column(String(32), nullable=False, index=True)
    side = Column(String(8), nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    commission = Column(Float, default=0.0, nullable=False)
    pnl = Column(Float, default=0.0, nullable=False)
    trade_time = Column(DateTime, nullable=False)
    bar_time = Column(DateTime, nullable=True)


class BacktestEquityPointDB(Base):
    __tablename__ = "backtest_equity_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(36), nullable=False, index=True)
    trade_date = Column(String(10), nullable=False, index=True)
    equity = Column(Float, nullable=False)
    cash = Column(Float, nullable=False)
    position_value = Column(Float, nullable=False)
    drawdown = Column(Float, default=0.0, nullable=False)


class MarketDataCacheDB(Base):
    __tablename__ = "market_data_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(32), nullable=False, index=True)
    frequency = Column(String(16), nullable=False, index=True)
    trade_date = Column(String(10), nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    adj_factor = Column(Float, default=1.0, nullable=False)
    limit_up = Column(Float, default=0.0, nullable=False)
    limit_down = Column(Float, default=0.0, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    source = Column(String(32), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("symbol", "frequency", "trade_date", name="uq_market_cache_symbol_freq_date"),)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.begin() as conn:
                conn.execute(text("PRAGMA foreign_keys=ON"))
        except Exception:
            pass
