from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from api.database import (
    BacktestEquityPointDB,
    BacktestJobDB,
    BacktestResultDB,
    BacktestTradeDB,
    SessionLocal,
    init_db,
)
from api.routers.backtests import get_backtest_detail, get_backtest_equity, get_backtest_metrics, get_backtest_trades


def _cleanup(job_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(BacktestEquityPointDB).filter(BacktestEquityPointDB.job_id == job_id).delete()
        db.query(BacktestTradeDB).filter(BacktestTradeDB.job_id == job_id).delete()
        db.query(BacktestResultDB).filter(BacktestResultDB.job_id == job_id).delete()
        db.query(BacktestJobDB).filter(BacktestJobDB.job_id == job_id).delete()
        db.commit()
    finally:
        db.close()


def test_backtest_detail_endpoints_return_full_payload():
    init_db()
    job_id = uuid4().hex
    db = SessionLocal()
    try:
        job = BacktestJobDB(
            job_id=job_id,
            strategy_id=1,
            strategy_version="1.0.0",
            symbol="000001.SZ",
            start_date="2024-01-01",
            end_date="2024-01-31",
            initial_capital=100000.0,
            commission_rate=0.0003,
            slippage=0.001,
            parameters={"threshold": 9},
            benchmark_symbol="000300.SH",
            data_source="akshare",
            status="completed",
            progress=100,
            created_at=datetime.now(timezone.utc),
            started_at=datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
        )
        result = BacktestResultDB(
            job_id=job_id,
            strategy_id=1,
            strategy_name="DemoStrategy",
            symbol="000001.SZ",
            start_date="2024-01-01",
            end_date="2024-01-31",
            initial_capital=100000.0,
            final_capital=100280.0,
            total_return=0.28,
            annual_return=18.0,
            benchmark_return=2.2,
            max_drawdown=3.5,
            volatility=12.3,
            sharpe_ratio=1.8,
            sortino_ratio=2.0,
            calmar_ratio=5.1,
            total_trades=2,
            win_trades=1,
            loss_trades=1,
            win_rate=50.0,
            profit_loss_ratio=1.2,
            avg_profit=120.0,
            avg_loss=-80.0,
            max_profit=120.0,
            max_loss=-80.0,
            equity_curve_json=[100000.0, 100120.0, 100280.0],
            metrics_json={"total_return": 0.28, "custom": True},
            created_at=datetime.now(timezone.utc),
        )
        trade_id = f"T{job_id[:12]}"
        order_id = f"O{job_id[:12]}"
        trade = BacktestTradeDB(
            job_id=job_id,
            trade_id=trade_id,
            order_id=order_id,
            symbol="000001.SZ",
            side="buy",
            price=10.0,
            quantity=100,
            commission=0.3,
            pnl=0.0,
            trade_time=datetime.now(timezone.utc),
            bar_time=datetime.now(timezone.utc),
        )
        equity_point = BacktestEquityPointDB(
            job_id=job_id,
            trade_date="2024-01-02",
            equity=100120.0,
            cash=99820.0,
            position_value=300.0,
            drawdown=0.0,
        )

        db.add(job)
        db.add(result)
        db.add(trade)
        db.add(equity_point)
        db.commit()
    finally:
        db.close()

    db = SessionLocal()
    try:
        payload = get_backtest_detail(job_id, db)
        assert payload.job.job_id == job_id
        assert payload.result is not None
        assert payload.result.strategy_name == "DemoStrategy"
        assert len(payload.trades) == 1
        assert len(payload.equity_points) == 1
        assert payload.metrics["custom"] is True

        trades_payload = get_backtest_trades(job_id, db)
        assert len(trades_payload) == 1

        equity_payload = get_backtest_equity(job_id, db)
        assert len(equity_payload) == 1

        metrics_payload = get_backtest_metrics(job_id, db)
        assert metrics_payload["metrics"]["custom"] is True
    finally:
        db.close()
        _cleanup(job_id)
