from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.database import BacktestResultDB, get_db
from api.schemas import (
    BacktestDetailResponse,
    BacktestEquityPoint,
    BacktestHistoryQuery,
    BacktestJob,
    BacktestRequest,
    BacktestResult,
    BacktestTrade,
)
from api.services import backtest_service
from workers.backtest_worker import dispatch_backtest

router = APIRouter(prefix="/backtests", tags=["backtests"])


def _serialize_job(row) -> BacktestJob:
    return BacktestJob(
        job_id=row.job_id,
        strategy_id=row.strategy_id,
        strategy_version=row.strategy_version,
        symbol=row.symbol,
        start_date=row.start_date,
        end_date=row.end_date,
        initial_capital=row.initial_capital,
        commission_rate=row.commission_rate,
        slippage=row.slippage,
        parameters=row.parameters or {},
        benchmark_symbol=row.benchmark_symbol,
        data_source=row.data_source,
        status=row.status,
        progress=row.progress,
        error_message=row.error_message,
        created_at=row.created_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


def _serialize_result(row) -> BacktestResult:
    return BacktestResult(
        job_id=row.job_id,
        strategy_id=row.strategy_id,
        strategy_name=row.strategy_name,
        symbol=row.symbol,
        start_date=row.start_date,
        end_date=row.end_date,
        initial_capital=row.initial_capital,
        final_capital=row.final_capital,
        total_return=row.total_return,
        annual_return=row.annual_return,
        benchmark_return=row.benchmark_return,
        max_drawdown=row.max_drawdown,
        volatility=row.volatility,
        sharpe_ratio=row.sharpe_ratio,
        sortino_ratio=row.sortino_ratio,
        calmar_ratio=row.calmar_ratio,
        total_trades=row.total_trades,
        win_trades=row.win_trades,
        loss_trades=row.loss_trades,
        win_rate=row.win_rate,
        profit_loss_ratio=row.profit_loss_ratio,
        avg_profit=row.avg_profit,
        avg_loss=row.avg_loss,
        max_profit=row.max_profit,
        max_loss=row.max_loss,
        equity_curve=row.equity_curve_json or [],
        metrics=row.metrics_json or {},
        created_at=row.created_at,
    )


def _serialize_trade(row) -> BacktestTrade:
    return BacktestTrade(
        trade_id=row.trade_id,
        order_id=row.order_id,
        symbol=row.symbol,
        side=row.side,
        price=row.price,
        quantity=row.quantity,
        commission=row.commission,
        pnl=row.pnl,
        trade_time=row.trade_time,
        bar_time=row.bar_time,
    )


def _serialize_equity_point(row) -> BacktestEquityPoint:
    return BacktestEquityPoint(
        trade_date=row.trade_date,
        equity=row.equity,
        cash=row.cash,
        position_value=row.position_value,
        drawdown=row.drawdown,
    )


@router.post("/run", response_model=BacktestJob)
def run_backtest(payload: BacktestRequest, db: Session = Depends(get_db)):
    job = backtest_service.create_job(db, payload)
    dispatch_backtest(job.job_id)
    return _serialize_job(job)


@router.get("", response_model=list[BacktestJob])
def list_backtests(
    skip: int = 0,
    limit: int = 50,
    strategy_id: int | None = None,
    symbol: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    rows = backtest_service.list_jobs(
        db,
        skip=skip,
        limit=limit,
        strategy_id=strategy_id,
        symbol=symbol,
        status=status,
    )
    return [_serialize_job(row) for row in rows]


@router.get("/{job_id}", response_model=BacktestJob | BacktestResult)
def get_backtest(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")

    result_row = backtest_service.get_result(db, job_id)
    if result_row:
        return _serialize_result(result_row)
    return _serialize_job(job)


@router.get("/{job_id}/detail", response_model=BacktestDetailResponse)
def get_backtest_detail(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")

    result_row = backtest_service.get_result(db, job_id)
    trades = backtest_service.list_trades(db, job_id)
    equity_points = backtest_service.list_equity_points(db, job_id)

    result = _serialize_result(result_row) if result_row else None
    metrics = result.metrics if result else {}

    return BacktestDetailResponse(
        job=_serialize_job(job),
        result=result,
        trades=[_serialize_trade(row) for row in trades],
        equity_points=[_serialize_equity_point(row) for row in equity_points],
        metrics=metrics,
    )


@router.get("/{job_id}/trades", response_model=list[BacktestTrade])
def get_backtest_trades(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")
    return [_serialize_trade(row) for row in backtest_service.list_trades(db, job_id)]


@router.get("/{job_id}/equity", response_model=list[BacktestEquityPoint])
def get_backtest_equity(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")
    return [_serialize_equity_point(row) for row in backtest_service.list_equity_points(db, job_id)]


@router.get("/{job_id}/metrics")
def get_backtest_metrics(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")
    result_row = backtest_service.get_result(db, job_id)
    if not result_row:
        raise HTTPException(status_code=404, detail="backtest result not found")
    result = _serialize_result(result_row)
    return {
        "job_id": result.job_id,
        "strategy_id": result.strategy_id,
        "strategy_name": result.strategy_name,
        "symbol": result.symbol,
        "start_date": result.start_date,
        "end_date": result.end_date,
        "metrics": result.metrics,
    }


@router.post("/{job_id}/cancel", response_model=BacktestJob)
def cancel_backtest(job_id: str, db: Session = Depends(get_db)):
    job = backtest_service.update_job_status(db, job_id, "cancelled", progress=100)
    if not job:
        raise HTTPException(status_code=404, detail="backtest job not found")
    return _serialize_job(job)
