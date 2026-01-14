"""
yfinance Backend Server
Provides stock quote data using the yfinance Python library
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import yfinance as yf

app = FastAPI(
    title="yfinance Stock Quote API",
    description="Backend server for yfinance stock data",
    version="1.0.0"
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuoteResponse(BaseModel):
    symbol: str
    price: float
    previousClose: float
    open: Optional[float] = None
    dayHigh: Optional[float] = None
    dayLow: Optional[float] = None
    volume: Optional[int] = None
    marketCap: Optional[int] = None
    shortName: Optional[str] = None
    longName: Optional[str] = None
    currency: Optional[str] = "USD"
    exchange: Optional[str] = None
    fiftyTwoWeekHigh: Optional[float] = None
    fiftyTwoWeekLow: Optional[float] = None
    averageVolume: Optional[int] = None
    beta: Optional[float] = None


class SearchResult(BaseModel):
    symbol: str
    shortname: Optional[str] = None
    longname: Optional[str] = None
    exchange: Optional[str] = None
    quoteType: Optional[str] = None


class IVResponse(BaseModel):
    symbol: str
    iv: float  # Implied volatility as percentage (e.g., 25.5 for 25.5%)
    atmStrike: Optional[float] = None
    expirationDate: Optional[str] = None
    source: str = "options_chain"
    timestamp: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "yfinance-backend"}


@app.get("/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(symbol: str):
    """
    Get stock quote for a given symbol
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info

        # Check if we got valid data
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not price:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")

        return QuoteResponse(
            symbol=symbol.upper(),
            price=price,
            previousClose=info.get("previousClose", price),
            open=info.get("open") or info.get("regularMarketOpen"),
            dayHigh=info.get("dayHigh") or info.get("regularMarketDayHigh"),
            dayLow=info.get("dayLow") or info.get("regularMarketDayLow"),
            volume=info.get("volume") or info.get("regularMarketVolume"),
            marketCap=info.get("marketCap"),
            shortName=info.get("shortName"),
            longName=info.get("longName"),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange"),
            fiftyTwoWeekHigh=info.get("fiftyTwoWeekHigh"),
            fiftyTwoWeekLow=info.get("fiftyTwoWeekLow"),
            averageVolume=info.get("averageVolume"),
            beta=info.get("beta"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/iv/{symbol}", response_model=IVResponse)
async def get_implied_volatility(symbol: str):
    """
    Get implied volatility for a stock from its options chain.
    Returns the IV of the ATM (at-the-money) option for the nearest expiration.
    """
    from datetime import datetime

    try:
        ticker = yf.Ticker(symbol.upper())

        # Get current price for ATM calculation
        info = ticker.info
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not current_price:
            raise HTTPException(status_code=404, detail=f"No price data for symbol: {symbol}")

        # Get available expiration dates
        expirations = ticker.options
        if not expirations:
            # No options available - return estimated IV based on beta
            beta = info.get("beta", 1.0) or 1.0
            estimated_iv = 20 + (beta - 1) * 15  # Higher beta = higher IV
            return IVResponse(
                symbol=symbol.upper(),
                iv=round(max(15, min(80, estimated_iv)), 1),
                source="estimated_from_beta",
                timestamp=datetime.now().isoformat()
            )

        # Get the nearest expiration (first one)
        nearest_exp = expirations[0]

        # Get options chain for nearest expiration
        chain = ticker.option_chain(nearest_exp)
        calls = chain.calls

        if calls.empty:
            raise HTTPException(status_code=404, detail=f"No options data for symbol: {symbol}")

        # Find ATM strike (closest to current price)
        calls['distance'] = abs(calls['strike'] - current_price)
        atm_row = calls.loc[calls['distance'].idxmin()]

        # Get implied volatility (yfinance returns it as decimal, e.g., 0.25 for 25%)
        iv = atm_row.get('impliedVolatility', 0.30)

        # Convert to percentage if needed
        if iv < 1:
            iv = iv * 100

        return IVResponse(
            symbol=symbol.upper(),
            iv=round(iv, 1),
            atmStrike=float(atm_row['strike']),
            expirationDate=nearest_exp,
            source="options_chain",
            timestamp=datetime.now().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        # Fallback to estimated IV
        from datetime import datetime
        return IVResponse(
            symbol=symbol.upper(),
            iv=30.0,  # Default fallback
            source="fallback",
            timestamp=datetime.now().isoformat()
        )


@app.get("/search")
async def search_symbols(q: str):
    """
    Search for stock symbols
    Note: yfinance doesn't have a direct search API, so this is limited
    """
    try:
        # yfinance doesn't have a search endpoint, so we try to get info
        # for the query as a symbol and return it if found
        ticker = yf.Ticker(q.upper())
        info = ticker.info

        if info.get("symbol"):
            return {
                "results": [{
                    "symbol": info.get("symbol"),
                    "shortname": info.get("shortName"),
                    "longname": info.get("longName"),
                    "exchange": info.get("exchange"),
                    "quoteType": info.get("quoteType"),
                }]
            }

        return {"results": []}
    except Exception:
        return {"results": []}


@app.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Get historical price data for a symbol

    period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No history for symbol: {symbol}")

        # Convert to list of dicts
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.isoformat(),
                "open": row.get("Open"),
                "high": row.get("High"),
                "low": row.get("Low"),
                "close": row.get("Close"),
                "volume": row.get("Volume"),
            })

        return {"symbol": symbol.upper(), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
