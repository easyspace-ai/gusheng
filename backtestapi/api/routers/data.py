from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db, MarketDataCacheDB
from api.schemas import DataPreviewRequest, DataPreviewResponse
from api.services import data_service

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/symbols")
def list_symbols():
    # Placeholder for symbol discovery; wire this to watchlists/universe later.
    return {
        "items": [
            {"symbol": "000001", "name": "Ping An Bank"},
            {"symbol": "600000", "name": "Pudong Development Bank"},
        ]
    }


@router.get("/preview", response_model=DataPreviewResponse)
def preview_data(
    symbol: str,
    start_date: str,
    end_date: str,
    frequency: str = "daily",
    adjust_type: str = "qfq",
):
    prepared = data_service.preview_data(symbol, start_date, end_date, frequency=frequency)
    preview = prepared.frame.head(10).copy()
    preview = preview.where(preview.notnull(), None)
    return DataPreviewResponse(
        symbol=symbol,
        frequency=frequency,
        row_count=int(prepared.frame.shape[0]),
        warnings=prepared.warnings,
        preview=preview.to_dict(orient="records"),
    )


@router.post("/clean", response_model=DataPreviewResponse)
def clean_data(payload: DataPreviewRequest):
    prepared = data_service.preview_data(
        payload.symbol,
        payload.start_date,
        payload.end_date,
        frequency=payload.frequency,
    )
    preview = prepared.frame.head(10).copy()
    preview = preview.where(preview.notnull(), None)
    return DataPreviewResponse(
        symbol=payload.symbol,
        frequency=payload.frequency,
        row_count=int(prepared.frame.shape[0]),
        warnings=prepared.warnings,
        preview=preview.to_dict(orient="records"),
    )
