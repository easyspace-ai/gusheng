from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import init_db
from api.settings import get_settings
from api.routers.backtests import router as backtests_router
from api.routers.data import router as data_router
from api.routers.health import router as health_router
from api.routers.strategies import router as strategies_router
from api.database import SessionLocal
from api.services.strategy_service import seed_builtin_strategies

settings = get_settings()

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))

app = FastAPI(
    title=settings.project_name,
    description="A-share strategy backtesting service based on vn.py",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.api_v1_str
app.include_router(health_router)
app.include_router(strategies_router, prefix=api_prefix)
app.include_router(backtests_router, prefix=api_prefix)
app.include_router(data_router, prefix=api_prefix)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_builtin_strategies(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "Welcome to BacktestAPI",
        "docs": "/docs",
        "version": app.version,
    }


def run() -> None:
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=8001, reload=True)
