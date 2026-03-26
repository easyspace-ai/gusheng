from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.database import get_db
from api.schemas import (
    ApiResponse,
    Strategy,
    StrategyCreate,
    StrategyGenerateRequest,
    StrategyGenerateResponse,
    StrategyValidateRequest,
    StrategyValidateResponse,
    StrategyUpdate,
)
from api.services import strategy_service
from api.services.ai_strategy_service import get_ai_strategy_service

router = APIRouter(prefix="/strategies", tags=["strategies"])


# AI-related request/response schemas
class StrategyModifyRequest(BaseModel):
    template_name: str = Field(..., description="Name of the builtin template to base on")
    requirements: str = Field(..., description="User's modification requirements")
    temperature: float = Field(0.3, ge=0.0, le=1.0, description="LLM temperature")


class StrategyModifyResponse(BaseModel):
    code: str
    changes: List[str]
    parameters_schema: Dict[str, Any]
    is_valid: bool
    errors: List[str]
    base_template: str


class StrategyOptimizeRequest(BaseModel):
    optimization_goal: str = Field(..., description="What to optimize for")
    backtest_job_id: Optional[str] = Field(None, description="Optional backtest job ID for metrics")
    temperature: float = Field(0.3, ge=0.0, le=1.0)


class StrategyOptimizeResponse(BaseModel):
    code: str
    analysis: str
    suggestions: List[str]
    is_valid: bool
    errors: List[str]


class StrategyExplainResponse(BaseModel):
    explanation: str
    raw: Optional[str] = None


def _serialize_strategy(row) -> Strategy:
    return Strategy(
        id=row.id,
        name=row.name,
        code=row.code,
        language=row.language,
        description=row.description,
        tags=row.tags or [],
        parameters_schema=row.parameters_schema or {},
        version=row.version,
        is_template=row.is_template,
        template_type=row.template_type,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[Strategy])
def list_strategies(
    skip: int = 0,
    limit: int = 50,
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    rows = strategy_service.list_strategies(db, skip=skip, limit=limit, keyword=keyword)
    return [_serialize_strategy(row) for row in rows]


@router.get("/{strategy_id}", response_model=Strategy)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    row = strategy_service.get_strategy(db, strategy_id)
    if not row:
        raise HTTPException(status_code=404, detail="strategy not found")
    return _serialize_strategy(row)


@router.post("", response_model=Strategy)
def create_strategy(payload: StrategyCreate, db: Session = Depends(get_db)):
    try:
        row = strategy_service.create_strategy(db, payload)
        return _serialize_strategy(row)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{strategy_id}", response_model=Strategy)
def update_strategy(strategy_id: int, payload: StrategyUpdate, db: Session = Depends(get_db)):
    try:
        row = strategy_service.update_strategy(db, strategy_id, payload)
        return _serialize_strategy(row)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{strategy_id}", response_model=ApiResponse)
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    deleted = strategy_service.delete_strategy(db, strategy_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="strategy not found")
    return ApiResponse(success=True, message="deleted")


@router.post("/validate", response_model=StrategyValidateResponse)
def validate_strategy(payload: StrategyValidateRequest):
    result = strategy_service.validate_strategy_code(payload.code)
    return StrategyValidateResponse(valid=result.valid, errors=result.errors, warnings=result.warnings)


@router.post("/generate", response_model=StrategyGenerateResponse)
def generate_strategy(payload: StrategyGenerateRequest):
    """Generate strategy using AI (placeholder for backward compatibility)."""
    # Use modify endpoint with empty template as base
    ai_service = get_ai_strategy_service()
    try:
        result = ai_service.modify_strategy(
            template_name="双均线策略",  # Default template
            requirements=payload.prompt,
            temperature=0.3,
        )
        return StrategyGenerateResponse(
            code=result["code"],
            summary=f"AI generated strategy based on: {payload.prompt[:120]}",
            parameters_schema=result["parameters_schema"],
        )
    except ValueError as e:
        # Fallback to placeholder if AI not configured
        code = (
            "from core.strategy.base import BaseStrategy, Bar\n\n\n"
            "class GeneratedStrategy(BaseStrategy):\n"
            "    def on_bar(self, bar: Bar):\n"
            "        pass\n"
        )
        summary = f"Stub strategy generated from prompt: {payload.prompt[:120]}"
        return StrategyGenerateResponse(code=code, summary=summary, parameters_schema={})


@router.post("/modify", response_model=StrategyModifyResponse)
def modify_strategy(payload: StrategyModifyRequest):
    """Modify a strategy template based on user requirements."""
    ai_service = get_ai_strategy_service()
    try:
        result = ai_service.modify_strategy(
            template_name=payload.template_name,
            requirements=payload.requirements,
            temperature=payload.temperature,
        )
        return StrategyModifyResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/{strategy_id}/optimize", response_model=StrategyOptimizeResponse)
def optimize_strategy(
    strategy_id: int,
    payload: StrategyOptimizeRequest,
    db: Session = Depends(get_db),
):
    """Optimize an existing strategy."""
    # Get strategy
    row = strategy_service.get_strategy(db, strategy_id)
    if not row:
        raise HTTPException(status_code=404, detail="strategy not found")
    
    ai_service = get_ai_strategy_service()
    try:
        result = ai_service.optimize_strategy(
            strategy_code=row.code,
            strategy_name=row.name,
            optimization_goal=payload.optimization_goal,
            backtest_metrics=None,  # TODO: Fetch from backtest_job_id if provided
            temperature=payload.temperature,
        )
        return StrategyOptimizeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/{strategy_id}/explain", response_model=StrategyExplainResponse)
def explain_strategy(strategy_id: int, db: Session = Depends(get_db)):
    """Explain a strategy in plain language."""
    # Get strategy
    row = strategy_service.get_strategy(db, strategy_id)
    if not row:
        raise HTTPException(status_code=404, detail="strategy not found")
    
    ai_service = get_ai_strategy_service()
    try:
        result = ai_service.explain_strategy(
            strategy_code=row.code,
            strategy_name=row.name,
            output_format="text",
        )
        return StrategyExplainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
