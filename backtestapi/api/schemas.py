from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None


class StrategyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=1)
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    parameters_schema: Dict[str, Any] = Field(default_factory=dict)
    version: str = "1.0.0"
    is_template: bool = False
    template_type: Optional[str] = None
    status: str = "active"


class StrategyCreate(StrategyBase):
    language: str = "python"


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parameters_schema: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    is_template: Optional[bool] = None
    template_type: Optional[str] = None
    status: Optional[str] = None


class Strategy(StrategyBase):
    id: int
    language: str = "python"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StrategyValidateRequest(BaseModel):
    code: str


class StrategyValidateResponse(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class StrategyGenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = None
    symbol: Optional[str] = None
    horizon: Optional[str] = None


class StrategyGenerateResponse(BaseModel):
    code: str
    summary: str
    parameters_schema: Dict[str, Any] = Field(default_factory=dict)


class BacktestRequest(BaseModel):
    strategy_id: int
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = 1000000.0
    commission_rate: float = 0.0003
    slippage: float = 0.001
    parameters: Dict[str, Any] = Field(default_factory=dict)
    data_source: str = "auto"
    benchmark_symbol: Optional[str] = None


class BacktestJob(BaseModel):
    job_id: str
    strategy_id: int
    strategy_version: Optional[str] = None
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    commission_rate: float
    slippage: float
    parameters: Dict[str, Any] = Field(default_factory=dict)
    benchmark_symbol: Optional[str] = None
    data_source: Optional[str] = None
    status: str
    progress: int = 0
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class BacktestResult(BaseModel):
    job_id: str
    strategy_id: int
    strategy_name: str
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: float
    total_return: float
    annual_return: float
    benchmark_return: float = 0.0
    max_drawdown: float = 0.0
    volatility: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    calmar_ratio: float = 0.0
    total_trades: int = 0
    win_trades: int = 0
    loss_trades: int = 0
    win_rate: float = 0.0
    profit_loss_ratio: float = 0.0
    avg_profit: float = 0.0
    avg_loss: float = 0.0
    max_profit: float = 0.0
    max_loss: float = 0.0
    equity_curve: List[float] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class BacktestTrade(BaseModel):
    trade_id: str
    order_id: str
    symbol: str
    side: str
    price: float
    quantity: int
    commission: float
    pnl: float = 0.0
    trade_time: datetime
    bar_time: Optional[datetime] = None


class BacktestEquityPoint(BaseModel):
    trade_date: str
    equity: float
    cash: float
    position_value: float
    drawdown: float = 0.0


class BacktestDetailResponse(BaseModel):
    job: BacktestJob
    result: Optional[BacktestResult] = None
    trades: List[BacktestTrade] = Field(default_factory=list)
    equity_points: List[BacktestEquityPoint] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BacktestHistoryQuery(BaseModel):
    strategy_id: Optional[int] = None
    symbol: Optional[str] = None
    status: Optional[str] = None
    skip: int = 0
    limit: int = 50


class DataPreviewRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    frequency: str = "daily"
    adjust_type: str = "qfq"


class DataPreviewResponse(BaseModel):
    symbol: str
    frequency: str
    row_count: int
    warnings: List[str] = Field(default_factory=list)
    preview: List[Dict[str, Any]] = Field(default_factory=list)
