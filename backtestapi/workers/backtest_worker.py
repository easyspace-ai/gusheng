from __future__ import annotations

from datetime import datetime, timezone
from threading import Thread
from typing import Any, Dict

from api.database import SessionLocal
from api.services import backtest_service
from api.services.strategy_service import get_strategy
from core.engine.vnpy_adapter import VNpyBacktestEngineAdapter
from core.data.pipeline import DataPipeline
from core.strategy.loader import load_strategy_class
from core.strategy.vnpy_base import VnpyStrategyBase


def _apply_runtime_parameters(strategy_instance: Any, parameters: Dict[str, Any]) -> None:
    if not parameters:
        return

    if hasattr(strategy_instance, "apply_parameters"):
        strategy_instance.apply_parameters(parameters)
        return

    for key, value in parameters.items():
        setattr(strategy_instance, key, value)


def run_backtest_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = backtest_service.get_job(db, job_id)
        if not job:
            return

        backtest_service.update_job_status(db, job_id, "running", progress=5)
        strategy = get_strategy(db, job.strategy_id)
        if not strategy:
            backtest_service.update_job_status(db, job_id, "failed", progress=100, error_message="strategy not found")
            return

        strategy_cls = load_strategy_class(
            strategy.code,
            base_class=VnpyStrategyBase,
        )
        strategy_instance = strategy_cls()
        _apply_runtime_parameters(strategy_instance, job.parameters or {})

        pipeline = DataPipeline()
        prepared = pipeline.prepare_daily(job.symbol, job.start_date, job.end_date, source=job.data_source or "auto")
        if prepared.frame.empty:
            backtest_service.update_job_status(db, job_id, "failed", progress=100, error_message="empty market data")
            return

        backtest_service.update_job_status(db, job_id, "running", progress=30)

        adapter = VNpyBacktestEngineAdapter(
            initial_capital=job.initial_capital,
            commission_rate=job.commission_rate,
            slippage=job.slippage,
        )
        result = adapter.execute(
            strategy_instance=strategy_instance,
            data=prepared.frame,
            symbol=job.symbol,
            parameters=job.parameters or {},
            benchmark_symbol=job.benchmark_symbol,
        )

        backtest_service.update_job_status(db, job_id, "running", progress=85)

        # The vn.py adapter will return the execution result once wired.
        metrics = result.metrics
        equity_curve = result.equity_curve
        final_capital = float(equity_curve[-1]) if equity_curve else job.initial_capital
        total_return = ((final_capital / job.initial_capital) - 1.0) * 100 if job.initial_capital else 0.0

        backtest_service.save_result(
            db,
            job_id=job_id,
            strategy_id=job.strategy_id,
            strategy_name=strategy.name,
            symbol=job.symbol,
            start_date=job.start_date,
            end_date=job.end_date,
            initial_capital=job.initial_capital,
            final_capital=final_capital,
            total_return=total_return,
            annual_return=float(metrics.get("annual_return", 0.0) or 0.0),
            metrics=metrics,
            equity_curve=equity_curve,
        )

        for index, trade in enumerate(result.trades, start=1):
            trade_id = str(trade.get("trade_id") or index)
            order_id = str(trade.get("order_id") or trade_id)
            backtest_service.save_trade(
                db,
                {
                    "job_id": job_id,
                    "trade_id": f"{job_id}:{trade_id}",
                    "order_id": f"{job_id}:{order_id}",
                    "symbol": trade["code"],
                    "side": trade["side"],
                    "price": trade["price"],
                    "quantity": trade["quantity"],
                    "commission": trade["commission"],
                    "pnl": trade.get("pnl", 0.0),
                    "trade_time": datetime.fromisoformat(trade["trade_time"]),
                    "bar_time": datetime.fromisoformat(trade["bar_time"]) if trade.get("bar_time") else None,
                },
            )

        for point in result.equity_points:
            backtest_service.save_equity_point(
                db,
                {
                    "job_id": job_id,
                    "trade_date": point["trade_date"],
                    "equity": point["equity"],
                    "cash": point["cash"],
                    "position_value": point["position_value"],
                    "drawdown": point["drawdown"],
                },
            )

        backtest_service.update_job_status(db, job_id, "completed", progress=100)
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        backtest_service.update_job_status(db, job_id, "failed", progress=100, error_message=str(exc))
    finally:
        db.close()


def dispatch_backtest(job_id: str) -> Thread:
    thread = Thread(target=run_backtest_job, args=(job_id,), daemon=True)
    thread.start()
    return thread
