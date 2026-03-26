from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from api.database import StrategyDB
from api.schemas import StrategyCreate, StrategyUpdate
from core.strategy.builtin_templates import BuiltinStrategyTemplate, get_builtin_strategy_templates
from core.strategy.validator import StrategyValidator


def list_strategies(db: Session, skip: int = 0, limit: int = 50, keyword: str | None = None) -> List[StrategyDB]:
    query = db.query(StrategyDB)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(StrategyDB.name.ilike(like))
    return query.order_by(StrategyDB.updated_at.desc()).offset(skip).limit(limit).all()


def get_strategy(db: Session, strategy_id: int) -> Optional[StrategyDB]:
    return db.query(StrategyDB).filter(StrategyDB.id == strategy_id).first()


def get_strategy_by_name(db: Session, name: str) -> Optional[StrategyDB]:
    return db.query(StrategyDB).filter(StrategyDB.name == name).first()


def validate_strategy_code(code: str):
    return StrategyValidator.validate(code)


def create_strategy(db: Session, payload: StrategyCreate) -> StrategyDB:
    validation = validate_strategy_code(payload.code)
    if not validation.valid:
        raise ValueError("; ".join(validation.errors))

    row = StrategyDB(
        name=payload.name,
        code=payload.code,
        language=payload.language,
        description=payload.description,
        tags=payload.tags,
        parameters_schema=payload.parameters_schema,
        version=payload.version,
        is_template=payload.is_template,
        template_type=payload.template_type,
        status=payload.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_strategy(db: Session, strategy_id: int, payload: StrategyUpdate) -> StrategyDB:
    row = get_strategy(db, strategy_id)
    if not row:
        raise ValueError("strategy not found")

    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"]:
        validation = validate_strategy_code(updates["code"])
        if not validation.valid:
            raise ValueError("; ".join(validation.errors))

    for key, value in updates.items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    return row


def delete_strategy(db: Session, strategy_id: int) -> bool:
    row = get_strategy(db, strategy_id)
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def seed_builtin_strategies(db: Session) -> List[StrategyDB]:
    created: List[StrategyDB] = []
    templates: List[BuiltinStrategyTemplate] = get_builtin_strategy_templates()

    for template in templates:
        existing = get_strategy_by_name(db, template.name)
        if existing:
            continue

        validation = validate_strategy_code(template.code)
        if not validation.valid:
            raise ValueError(f"Builtin template '{template.name}' failed validation: {'; '.join(validation.errors)}")

        row = StrategyDB(
            name=template.name,
            code=template.code,
            language="python",
            description=template.description,
            tags=template.tags,
            parameters_schema=template.parameters_schema,
            version=template.version,
            is_template=template.is_template,
            template_type=template.template_type,
            status=template.status,
        )
        db.add(row)
        created.append(row)

    if created:
        db.commit()
        for row in created:
            db.refresh(row)

    return created
