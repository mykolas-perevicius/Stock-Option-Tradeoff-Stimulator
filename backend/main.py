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


class OptionContract(BaseModel):
    contractSymbol: str
    strike: float
    lastPrice: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    change: Optional[float] = None
    percentChange: Optional[float] = None
    volume: Optional[int] = None
    openInterest: Optional[int] = None
    impliedVolatility: Optional[float] = None
    inTheMoney: Optional[bool] = None


class OptionsChainResponse(BaseModel):
    symbol: str
    expiry: str
    expirations: list
    underlyingPrice: float
    calls: list
    puts: list


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


@app.get("/options/{symbol}/expirations")
async def get_options_expirations(symbol: str):
    """
    Get available options expiration dates for a symbol
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        expirations = ticker.options

        if not expirations:
            raise HTTPException(
                status_code=404,
                detail=f"No options available for symbol: {symbol}"
            )

        return {
            "symbol": symbol.upper(),
            "expirations": list(expirations)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/options/{symbol}", response_model=OptionsChainResponse)
async def get_options_chain(symbol: str, expiry: str = None):
    """
    Get full options chain for a symbol.
    If expiry is not provided, returns the nearest expiration.
    """
    import math

    try:
        ticker = yf.Ticker(symbol.upper())

        # Get current price
        info = ticker.info
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not current_price:
            raise HTTPException(status_code=404, detail=f"No price data for symbol: {symbol}")

        # Get available expirations
        expirations = ticker.options
        if not expirations:
            raise HTTPException(
                status_code=404,
                detail=f"No options available for symbol: {symbol}"
            )

        # Use provided expiry or default to nearest
        selected_expiry = expiry if expiry and expiry in expirations else expirations[0]

        # Get options chain
        chain = ticker.option_chain(selected_expiry)

        def process_options(df):
            """Convert options dataframe to list of dicts with clean values"""
            result = []
            for _, row in df.iterrows():
                # Get IV and convert to percentage if needed
                iv = row.get('impliedVolatility', 0)
                if iv and iv < 1:
                    iv = iv * 100

                # Handle NaN values
                def clean_value(val):
                    if val is None or (isinstance(val, float) and math.isnan(val)):
                        return None
                    return val

                result.append({
                    "contractSymbol": row.get('contractSymbol', ''),
                    "strike": float(row.get('strike', 0)),
                    "lastPrice": clean_value(row.get('lastPrice')),
                    "bid": clean_value(row.get('bid')),
                    "ask": clean_value(row.get('ask')),
                    "change": clean_value(row.get('change')),
                    "percentChange": clean_value(row.get('percentChange')),
                    "volume": int(row.get('volume', 0)) if row.get('volume') and not math.isnan(row.get('volume')) else None,
                    "openInterest": int(row.get('openInterest', 0)) if row.get('openInterest') and not math.isnan(row.get('openInterest')) else None,
                    "impliedVolatility": round(iv, 2) if iv else None,
                    "inTheMoney": bool(row.get('inTheMoney')) if 'inTheMoney' in row else None,
                })
            return result

        calls = process_options(chain.calls)
        puts = process_options(chain.puts)

        return OptionsChainResponse(
            symbol=symbol.upper(),
            expiry=selected_expiry,
            expirations=list(expirations),
            underlyingPrice=current_price,
            calls=calls,
            puts=puts,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FundamentalsResponse(BaseModel):
    symbol: str
    currentPrice: Optional[float] = None
    # Valuation
    trailingPE: Optional[float] = None
    forwardPE: Optional[float] = None
    priceToBook: Optional[float] = None
    priceToSales: Optional[float] = None
    enterpriseToEbitda: Optional[float] = None
    enterpriseToRevenue: Optional[float] = None
    marketCap: Optional[int] = None
    enterpriseValue: Optional[int] = None
    # Earnings
    trailingEps: Optional[float] = None
    forwardEps: Optional[float] = None
    pegRatio: Optional[float] = None
    # Profitability
    profitMargins: Optional[float] = None
    operatingMargins: Optional[float] = None
    grossMargins: Optional[float] = None
    returnOnEquity: Optional[float] = None
    returnOnAssets: Optional[float] = None
    # Financial health
    debtToEquity: Optional[float] = None
    currentRatio: Optional[float] = None
    quickRatio: Optional[float] = None
    # Analyst targets
    targetLow: Optional[float] = None
    targetMean: Optional[float] = None
    targetMedian: Optional[float] = None
    targetHigh: Optional[float] = None
    numberOfAnalysts: Optional[int] = None
    recommendationKey: Optional[str] = None
    recommendationMean: Optional[float] = None
    # Risk metrics
    beta: Optional[float] = None
    shortRatio: Optional[float] = None
    shortPercentOfFloat: Optional[float] = None
    heldPercentInsiders: Optional[float] = None
    heldPercentInstitutions: Optional[float] = None
    # Classification
    sector: Optional[str] = None
    industry: Optional[str] = None
    # Dividends
    dividendYield: Optional[float] = None
    dividendRate: Optional[float] = None
    payoutRatio: Optional[float] = None
    exDividendDate: Optional[str] = None
    # Growth
    revenueGrowth: Optional[float] = None
    earningsGrowth: Optional[float] = None
    # 52 week metrics
    fiftyTwoWeekHigh: Optional[float] = None
    fiftyTwoWeekLow: Optional[float] = None
    fiftyTwoWeekChange: Optional[float] = None


@app.get("/fundamentals/{symbol}", response_model=FundamentalsResponse)
async def get_fundamentals(symbol: str):
    """
    Get fundamental financial metrics for a stock.
    Includes valuation, profitability, analyst targets, and risk metrics.
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info

        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not current_price:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")

        return FundamentalsResponse(
            symbol=symbol.upper(),
            currentPrice=current_price,
            # Valuation
            trailingPE=info.get("trailingPE"),
            forwardPE=info.get("forwardPE"),
            priceToBook=info.get("priceToBook"),
            priceToSales=info.get("priceToSalesTrailingTwelveMonths"),
            enterpriseToEbitda=info.get("enterpriseToEbitda"),
            enterpriseToRevenue=info.get("enterpriseToRevenue"),
            marketCap=info.get("marketCap"),
            enterpriseValue=info.get("enterpriseValue"),
            # Earnings
            trailingEps=info.get("trailingEps"),
            forwardEps=info.get("forwardEps"),
            pegRatio=info.get("pegRatio"),
            # Profitability
            profitMargins=info.get("profitMargins"),
            operatingMargins=info.get("operatingMargins"),
            grossMargins=info.get("grossMargins"),
            returnOnEquity=info.get("returnOnEquity"),
            returnOnAssets=info.get("returnOnAssets"),
            # Financial health
            debtToEquity=info.get("debtToEquity"),
            currentRatio=info.get("currentRatio"),
            quickRatio=info.get("quickRatio"),
            # Analyst targets
            targetLow=info.get("targetLowPrice"),
            targetMean=info.get("targetMeanPrice"),
            targetMedian=info.get("targetMedianPrice"),
            targetHigh=info.get("targetHighPrice"),
            numberOfAnalysts=info.get("numberOfAnalystOpinions"),
            recommendationKey=info.get("recommendationKey"),
            recommendationMean=info.get("recommendationMean"),
            # Risk metrics
            beta=info.get("beta"),
            shortRatio=info.get("shortRatio"),
            shortPercentOfFloat=info.get("shortPercentOfFloat"),
            heldPercentInsiders=info.get("heldPercentInsiders"),
            heldPercentInstitutions=info.get("heldPercentInstitutions"),
            # Classification
            sector=info.get("sector"),
            industry=info.get("industry"),
            # Dividends
            dividendYield=info.get("dividendYield"),
            dividendRate=info.get("dividendRate"),
            payoutRatio=info.get("payoutRatio"),
            exDividendDate=str(info.get("exDividendDate")) if info.get("exDividendDate") else None,
            # Growth
            revenueGrowth=info.get("revenueGrowth"),
            earningsGrowth=info.get("earningsGrowth"),
            # 52 week
            fiftyTwoWeekHigh=info.get("fiftyTwoWeekHigh"),
            fiftyTwoWeekLow=info.get("fiftyTwoWeekLow"),
            fiftyTwoWeekChange=info.get("52WeekChange"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EarningsResponse(BaseModel):
    symbol: str
    nextEarningsDate: Optional[str] = None
    earningsHistory: Optional[list] = None
    quarterlyEarnings: Optional[list] = None
    revenueEstimate: Optional[dict] = None
    earningsEstimate: Optional[dict] = None


@app.get("/earnings/{symbol}", response_model=EarningsResponse)
async def get_earnings(symbol: str):
    """
    Get earnings history and upcoming earnings dates for a stock.
    Includes historical earnings surprises and next earnings date.
    """
    import math
    from datetime import datetime

    try:
        ticker = yf.Ticker(symbol.upper())

        # Get earnings dates
        earnings_dates = None
        try:
            ed = ticker.earnings_dates
            if ed is not None and not ed.empty:
                earnings_dates = []
                for idx, row in ed.head(12).iterrows():  # Last 12 entries
                    def safe_val(v):
                        if v is None or (isinstance(v, float) and math.isnan(v)):
                            return None
                        return v

                    earnings_dates.append({
                        "date": idx.isoformat() if hasattr(idx, 'isoformat') else str(idx),
                        "epsEstimate": safe_val(row.get("EPS Estimate")),
                        "epsActual": safe_val(row.get("Reported EPS")),
                        "surprise": safe_val(row.get("Surprise(%)")),
                    })
        except Exception:
            pass

        # Get next earnings date from calendar
        next_earnings = None
        try:
            calendar = ticker.calendar
            if calendar is not None:
                if isinstance(calendar, dict):
                    ed_val = calendar.get("Earnings Date")
                    if ed_val:
                        if isinstance(ed_val, list) and len(ed_val) > 0:
                            next_earnings = str(ed_val[0])
                        else:
                            next_earnings = str(ed_val)
        except Exception:
            pass

        # Get quarterly earnings
        quarterly = None
        try:
            qe = ticker.quarterly_earnings
            if qe is not None and not qe.empty:
                quarterly = []
                for idx, row in qe.iterrows():
                    quarterly.append({
                        "quarter": str(idx),
                        "revenue": row.get("Revenue"),
                        "earnings": row.get("Earnings"),
                    })
        except Exception:
            pass

        return EarningsResponse(
            symbol=symbol.upper(),
            nextEarningsDate=next_earnings,
            earningsHistory=earnings_dates,
            quarterlyEarnings=quarterly,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
