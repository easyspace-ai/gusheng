from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from api.database import BacktestEquityPointDB, BacktestJobDB, BacktestResultDB, BacktestTradeDB
from api.schemas import BacktestRequest


def create_job(db: Session, request: BacktestRequest, strategy_version: str | None = None) -> BacktestJobDB:
    job = BacktestJobDB(
        job_id=uuid4().hex,
        strategy_id=request.strategy_id,
        strategy_version=strategy_version,
        symbol=request.symbol,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_capital=request.initial_capital,
        commission_rate=request.commission_rate,
        slippage=request.slippage,
        parameters=request.parameters,
        benchmark_symbol=request.benchmark_symbol,
        data_source=request.data_source,
        status="pending",
        progress=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: str) -> Optional[BacktestJobDB]:
    return db.query(BacktestJobDB).filter(BacktestJobDB.job_id == job_id).first()


def get_result(db: Session, job_id: str) -> Optional[BacktestResultDB]:
    return db.query(BacktestResultDB).filter(BacktestResultDB.job_id == job_id).first()


def list_trades(db: Session, job_id: str) -> List[BacktestTradeDB]:
    return (
        db.query(BacktestTradeDB)
        .filter(BacktestTradeDB.job_id == job_id)
        .order_by(BacktestTradeDB.trade_time.asc(), BacktestTradeDB.id.asc())
        .all()
    )


def list_equity_points(db: Session, job_id: str) -> List[BacktestEquityPointDB]:
    return (
        db.query(BacktestEquityPointDB)
        .filter(BacktestEquityPointDB.job_id == job_id)
        .order_by(BacktestEquityPointDB.trade_date.asc(), BacktestEquityPointDB.id.asc())
        .all()
    )


def list_jobs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    strategy_id: int | None = None,
    symbol: str | None = None,
    status: str | None = None,
) -> List[BacktestJobDB]:
    query = db.query(BacktestJobDB)
    if strategy_id is not None:
        query = query.filter(BacktestJobDB.strategy_id == strategy_id)
    if symbol:
        query = query.filter(BacktestJobDB.symbol == symbol)
    if status:
        query = query.filter(BacktestJobDB.status == status)
    return query.order_by(BacktestJobDB.created_at.desc()).offset(skip).limit(limit).all()


def update_job_status(
    db: Session,
    job_id: str,
    status: str,
    progress: int | None = None,
    error_message: str | None = None,
) -> Optional[BacktestJobDB]:
    job = get_job(db, job_id)
    if not job:
        return None

    job.status = status
    if progress is not None:
        job.progress = progress
    if error_message is not None:
        job.error_message = error_message

    now = datetime.now(timezone.utc)
    if status == "running" and job.started_at is None:
        job.started_at = now
    if status in {"completed", "failed", "cancelled"}:
        job.finished_at = now

    db.commit()
    db.refresh(job)
    return job


def save_result(
    db: Session,
    *,
    job_id: str,
    strategy_id: int,
    strategy_name: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    final_capital: float,
    total_return: float,
    annual_return: float,
    metrics: Dict[str, Any],
    equity_curve: List[float],
) -> BacktestResultDB:
    row = BacktestResultDB(
        job_id=job_id,
        strategy_id=strategy_id,
        strategy_name=strategy_name,
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        initial_capital=initial_capital,
        final_capital=final_capital,
        total_return=total_return,
        annual_return=annual_return,
        benchmark_return=float(metrics.get("benchmark_return", 0.0) or 0.0),
        max_drawdown=float(metrics.get("max_drawdown", 0.0) or 0.0),
        volatility=float(metrics.get("volatility", 0.0) or 0.0),
        sharpe_ratio=float(metrics.get("sharpe_ratio", 0.0) or 0.0),
        sortino_ratio=float(metrics.get("sortino_ratio", 0.0) or 0.0),
        calmar_ratio=float(metrics.get("calmar_ratio", 0.0) or 0.0),
        total_trades=int(metrics.get("total_trades", 0) or 0),
        win_trades=int(metrics.get("win_trades", 0) or 0),
        loss_trades=int(metrics.get("loss_trades", 0) or 0),
        win_rate=float(metrics.get("win_rate", 0.0) or 0.0),
        profit_loss_ratio=float(metrics.get("profit_loss_ratio", 0.0) or 0.0),
        avg_profit=float(metrics.get("avg_profit", 0.0) or 0.0),
        avg_loss=float(metrics.get("avg_loss", 0.0) or 0.0),
        max_profit=float(metrics.get("max_profit", 0.0) or 0.0),
        max_loss=float(metrics.get("max_loss", 0.0) or 0.0),
        equity_curve_json=equity_curve,
        metrics_json=metrics,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def save_trade(db: Session, trade: Dict[str, Any]) -> BacktestTradeDB:
    row = BacktestTradeDB(**trade)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def save_equity_point(db: Session, point: Dict[str, Any]) -> BacktestEquityPointDB:
    row = BacktestEquityPointDB(**point)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
