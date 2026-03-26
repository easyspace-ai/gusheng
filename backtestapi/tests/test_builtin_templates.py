from __future__ import annotations

from api.database import SessionLocal, StrategyDB, init_db
from api.services.strategy_service import seed_builtin_strategies


BUILTIN_NAMES = [
    "双均线策略",
    "市场情绪策略",
    "ETF轮动策略",
    "双均线对冲策略",
]


def _cleanup() -> None:
    db = SessionLocal()
    try:
        db.query(StrategyDB).filter(StrategyDB.name.in_(BUILTIN_NAMES)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_builtin_strategy_templates_are_seeded_idempotently():
    init_db()
    _cleanup()

    db = SessionLocal()
    try:
        created = seed_builtin_strategies(db)
        assert len(created) == 4

        rows = db.query(StrategyDB).filter(StrategyDB.name.in_(BUILTIN_NAMES)).all()
        assert len(rows) == 4
        assert all(row.is_template for row in rows)
        assert {row.name for row in rows} == set(BUILTIN_NAMES)

        created_again = seed_builtin_strategies(db)
        assert len(created_again) == 0
        rows_again = db.query(StrategyDB).filter(StrategyDB.name.in_(BUILTIN_NAMES)).all()
        assert len(rows_again) == 4
    finally:
        db.close()
        _cleanup()
