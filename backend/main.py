"""
yfinance Backend Server
Provides stock quote data using the yfinance Python library
"""

import asyncio
import math
import os
import re
from datetime import date, datetime, timezone

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

# Locked-down CORS. Open wildcard + the public hosting let strangers proxy
# yfinance through this dyno, which Yahoo eventually rate-limits the host IP
# for. Override with EXTRA_CORS_ORIGINS=comma,separated for staging URLs.
_DEFAULT_ORIGINS = [
    "https://stocksandoptions.org",
    "https://www.stocksandoptions.org",
    "https://stock-options-simulator.vercel.app",
    "http://localhost:5173",
    "http://localhost:4173",
]
_EXTRA = [o.strip() for o in os.getenv("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]
_ALLOWED_ORIGINS = _DEFAULT_ORIGINS + _EXTRA

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# Symbol whitelist. Uppercase letters, digits, dots (BRK.B), dashes (BRK-B),
# carets (^GSPC). Anything else is rejected before we touch yfinance to avoid
# log injection, weird path traversal characters, and pointless cold-fetches.
_SYMBOL_RE = re.compile(r"^[A-Z0-9.\-^]{1,12}$")

def _safe_symbol(symbol: str) -> str:
    upper = (symbol or "").upper().strip()
    if not _SYMBOL_RE.match(upper):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    return upper


def _safe_error(e: Exception, fallback: str = "Upstream data error") -> str:
    """Sanitize exception messages so we don't echo URLs/headers/proxies back to
    the client. yfinance errors often contain the request URL with the user's
    symbol embedded — fine, but we strip newlines and cap length."""
    msg = str(e) if e else fallback
    return msg.replace("\n", " ").replace("\r", " ")[:200] or fallback


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
    """Lightweight liveness check.

    We deliberately do NOT touch yfinance here — Render's healthcheck pings
    this often, and a flaky upstream shouldn't take the dyno down. The
    frontend treats 200 as 'dyno is warm,' which is exactly what this proves.
    """
    return {"status": "healthy", "service": "yfinance-backend"}


def _fetch_quote_sync(symbol: str) -> dict:
    ticker = yf.Ticker(symbol)
    info = ticker.info
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not price:
        raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")
    return {
        "symbol": symbol,
        "price": price,
        "previousClose": info.get("previousClose", price),
        "open": info.get("open") or info.get("regularMarketOpen"),
        "dayHigh": info.get("dayHigh") or info.get("regularMarketDayHigh"),
        "dayLow": info.get("dayLow") or info.get("regularMarketDayLow"),
        "volume": info.get("volume") or info.get("regularMarketVolume"),
        "marketCap": info.get("marketCap"),
        "shortName": info.get("shortName"),
        "longName": info.get("longName"),
        "currency": info.get("currency", "USD"),
        "exchange": info.get("exchange"),
        "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
        "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
        "averageVolume": info.get("averageVolume"),
        "beta": info.get("beta"),
    }


@app.get("/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(symbol: str):
    """Get stock quote for a given symbol."""
    sym = _safe_symbol(symbol)
    try:
        data = await asyncio.to_thread(_fetch_quote_sync, sym)
        return QuoteResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


def _ny_today() -> date:
    """Today in America/New_York. Render runs UTC; using server-local UTC
    'today' makes a Tuesday's regular weekly look 0-DTE on Monday evening US.
    Falling back to UTC if zoneinfo unavailable still beats the prior bug."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/New_York")).date()
    except Exception:
        return datetime.now(timezone.utc).date()


def _pick_target_expiration(expirations, target_dte: int = 30, min_dte: int = 7):
    """
    Pick a sensible expiration from yfinance's list.

    yfinance returns expirations[0] = next available, which on Fridays is the
    SAME-DAY 0-DTE weekly. ATM IV on a 0-DTE option mathematically collapses
    toward zero (the option has no time value left), producing nonsense IV
    readings like "AAPL IV 2.0%". To avoid this:
    - Skip anything < min_dte days out (default 7).
    - Pick the expiration nearest to target_dte (default 30 — typical analyst
      horizon and what most option calculators imply by "the IV").
    """
    today = _ny_today()
    candidates = []
    for exp_str in expirations:
        try:
            exp_date = date.fromisoformat(exp_str)
        except Exception:
            continue
        dte = (exp_date - today).days
        if dte >= min_dte:
            candidates.append((exp_str, dte))

    if not candidates:
        # All expirations are too short-dated; fall back to the longest
        # available rather than the same-day one.
        return expirations[-1] if expirations else None

    candidates.sort(key=lambda x: abs(x[1] - target_dte))
    return candidates[0][0]


def _normalize_dividend_yield(raw):
    """yfinance has flip-flopped on this field across versions.
    >=0.2.31 returns it in percent (0.44 = 0.44%); older versions returned
    it as a decimal (0.0044 = 0.44%). Use the value, not the version: any
    value > 1 is implausible as a decimal yield (would be >100% annual) so
    treat it as percent and divide; otherwise it's already decimal.
    Returns None for None/non-numeric/zero (zero-yield non-payers should not
    render '0.00% dividend'; CorrelationFactors hides on falsy)."""
    if raw is None or not isinstance(raw, (int, float)) or raw <= 0:
        return None
    return raw / 100 if raw > 1 else raw


def _format_ex_div(raw):
    """yfinance returns exDividendDate as Unix epoch int. Send ISO date so
    the frontend doesn't have to know it's epoch seconds."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and raw > 0:
        try:
            return datetime.fromtimestamp(int(raw), tz=timezone.utc).date().isoformat()
        except (OverflowError, OSError, ValueError):
            return None
    s = str(raw)
    return s if s and s != "None" else None


def _fetch_iv_sync(symbol: str, dte: int) -> dict:
    ticker = yf.Ticker(symbol)
    info = ticker.info
    current_price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not current_price:
        raise HTTPException(status_code=404, detail=f"No price data for symbol: {symbol}")

    expirations = ticker.options
    if not expirations:
        beta = info.get("beta", 1.0) or 1.0
        estimated_iv = 20 + (beta - 1) * 15
        return {
            "symbol": symbol,
            "iv": round(max(15, min(80, estimated_iv)), 1),
            "source": "estimated_from_beta",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    target_exp = _pick_target_expiration(expirations, target_dte=dte, min_dte=7)
    if target_exp is None:
        raise HTTPException(status_code=404, detail=f"No usable expirations for {symbol}")

    chain = ticker.option_chain(target_exp)
    calls = chain.calls
    if calls.empty:
        raise HTTPException(status_code=404, detail=f"No options data for symbol: {symbol}")

    calls = calls.copy()
    calls['distance'] = (calls['strike'] - current_price).abs()
    atm_row = calls.loc[calls['distance'].idxmin()]

    iv = atm_row.get('impliedVolatility', 0.30)
    if iv and iv < 1:
        iv = iv * 100

    # Sanity floor: ATM IV under 5% on an equity is almost certainly bad
    # data (e.g. yfinance returning a zero-volume contract). Fall through
    # to a beta-based estimate rather than confusing the user.
    if not iv or iv < 5:
        beta = info.get("beta", 1.0) or 1.0
        estimated_iv = 20 + (beta - 1) * 15
        return {
            "symbol": symbol,
            "iv": round(max(15, min(80, estimated_iv)), 1),
            "atmStrike": float(atm_row['strike']),
            "expirationDate": target_exp,
            "source": "estimated_from_beta",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return {
        "symbol": symbol,
        "iv": round(iv, 1),
        "atmStrike": float(atm_row['strike']),
        "expirationDate": target_exp,
        "source": "options_chain",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/iv/{symbol}", response_model=IVResponse)
async def get_implied_volatility(symbol: str, dte: int = 30):
    """
    Get implied volatility for a stock from its options chain.
    Returns the IV of the ATM (at-the-money) option for an expiration ~`dte`
    days out (default 30). Skips 0-DTE / same-week expirations whose IV is
    artificially low.
    """
    sym = _safe_symbol(symbol)
    # Clamp dte to a sane window so users can't ask for negative or 50-year DTE.
    dte = max(1, min(int(dte), 730))
    try:
        return IVResponse(**(await asyncio.to_thread(_fetch_iv_sync, sym, dte)))
    except HTTPException:
        raise
    except Exception as e:
        # Last-resort fallback so the page still renders something sensible
        # — but flag the source so the client can warn rather than displaying
        # 30% as if it were a real reading.
        return IVResponse(
            symbol=sym,
            iv=30.0,
            source="fallback",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


_VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}
_VALID_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"}


@app.get("/search")
async def search_symbols(q: str):
    """
    Search for stock symbols
    Note: yfinance doesn't have a direct search API, so this is limited
    """
    if not q or len(q) > 12:
        return {"results": []}
    try:
        sym = _safe_symbol(q)
    except HTTPException:
        return {"results": []}

    def _do():
        ticker = yf.Ticker(sym)
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

    try:
        return await asyncio.to_thread(_do)
    except Exception:
        return {"results": []}


def _fetch_history_sync(symbol: str, period: str, interval: str) -> dict:
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period=period, interval=interval)
    if hist.empty:
        raise HTTPException(status_code=404, detail=f"No history for symbol: {symbol}")
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
    return {"symbol": symbol, "data": data}


@app.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    """Get historical price data for a symbol."""
    sym = _safe_symbol(symbol)
    if period not in _VALID_PERIODS:
        raise HTTPException(status_code=400, detail="Invalid period")
    if interval not in _VALID_INTERVALS:
        raise HTTPException(status_code=400, detail="Invalid interval")
    try:
        return await asyncio.to_thread(_fetch_history_sync, sym, period, interval)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


@app.get("/options/{symbol}/expirations")
async def get_options_expirations(symbol: str):
    """Get available options expiration dates for a symbol."""
    sym = _safe_symbol(symbol)

    def _do():
        ticker = yf.Ticker(sym)
        expirations = ticker.options
        if not expirations:
            raise HTTPException(
                status_code=404,
                detail=f"No options available for symbol: {sym}"
            )
        return {"symbol": sym, "expirations": list(expirations)}

    try:
        return await asyncio.to_thread(_do)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


def _safe_int(val):
    """Coerce a yfinance numeric (which can be a numpy float, NaN, or None)
    into an int, or return None. Avoids 'cannot convert NaN to int' crashes."""
    if val is None:
        return None
    try:
        f = float(val)
    except (TypeError, ValueError):
        return None
    if math.isnan(f):
        return None
    return int(f)


def _fetch_options_chain_sync(symbol: str, expiry: Optional[str]) -> dict:
    ticker = yf.Ticker(symbol)
    info = ticker.info
    current_price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not current_price:
        raise HTTPException(status_code=404, detail=f"No price data for symbol: {symbol}")

    expirations = ticker.options
    if not expirations:
        raise HTTPException(status_code=404, detail=f"No options available for symbol: {symbol}")

    if expiry and expiry in expirations:
        selected_expiry = expiry
    elif expiry:
        # User asked for a specific expiry that doesn't exist — be loud about
        # it instead of silently substituting a different one.
        raise HTTPException(status_code=400, detail=f"Expiry {expiry} not available for {symbol}")
    else:
        selected_expiry = _pick_target_expiration(expirations, target_dte=30, min_dte=7) \
            or expirations[0]

    chain = ticker.option_chain(selected_expiry)

    def process_options(df):
        result = []
        for _, row in df.iterrows():
            iv = row.get('impliedVolatility', 0)
            if iv and iv < 1:
                iv = iv * 100

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
                "volume": _safe_int(row.get('volume')),
                "openInterest": _safe_int(row.get('openInterest')),
                "impliedVolatility": round(iv, 2) if iv else None,
                "inTheMoney": bool(row.get('inTheMoney')) if 'inTheMoney' in row else None,
            })
        return result

    return {
        "symbol": symbol,
        "expiry": selected_expiry,
        "expirations": list(expirations),
        "underlyingPrice": current_price,
        "calls": process_options(chain.calls),
        "puts": process_options(chain.puts),
    }


@app.get("/options/{symbol}", response_model=OptionsChainResponse)
async def get_options_chain(symbol: str, expiry: str = None):
    """Get full options chain. Default expiry is ~30 DTE (skips 0-DTE weeklies
    whose IV / pricing is artificially distorted)."""
    sym = _safe_symbol(symbol)
    try:
        data = await asyncio.to_thread(_fetch_options_chain_sync, sym, expiry)
        return OptionsChainResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


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


def _fetch_fundamentals_sync(symbol: str) -> dict:
    ticker = yf.Ticker(symbol)
    info = ticker.info

    current_price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not current_price:
        raise HTTPException(status_code=404, detail=f"No data found for symbol: {symbol}")

    return dict(
            symbol=symbol,
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
            # Dividends. yfinance has shifted between decimal and percent
            # representations of this field across versions. Normalize by
            # value: anything > 1 must be percent (real yields don't exceed
            # 100% per year), anything <= 1 is already decimal.
            dividendYield=_normalize_dividend_yield(info.get("dividendYield")),
            dividendRate=info.get("dividendRate"),
            payoutRatio=info.get("payoutRatio"),
            exDividendDate=_format_ex_div(info.get("exDividendDate")),
            # Growth
            revenueGrowth=info.get("revenueGrowth"),
            earningsGrowth=info.get("earningsGrowth"),
            # 52 week
            fiftyTwoWeekHigh=info.get("fiftyTwoWeekHigh"),
            fiftyTwoWeekLow=info.get("fiftyTwoWeekLow"),
            fiftyTwoWeekChange=info.get("52WeekChange"),
        )


@app.get("/fundamentals/{symbol}", response_model=FundamentalsResponse)
async def get_fundamentals(symbol: str):
    """Get fundamental financial metrics for a stock."""
    sym = _safe_symbol(symbol)
    try:
        data = await asyncio.to_thread(_fetch_fundamentals_sync, sym)
        return FundamentalsResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


class EarningsResponse(BaseModel):
    symbol: str
    nextEarningsDate: Optional[str] = None
    earningsHistory: Optional[list] = None
    quarterlyEarnings: Optional[list] = None
    revenueEstimate: Optional[dict] = None
    earningsEstimate: Optional[dict] = None


def _safe_val(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return v


def _fetch_earnings_sync(symbol: str) -> dict:
    ticker = yf.Ticker(symbol)

    earnings_dates = None
    try:
        ed = ticker.earnings_dates
        if ed is not None and not ed.empty:
            earnings_dates = []
            for idx, row in ed.head(12).iterrows():
                # Surprise column has been renamed across yfinance versions
                # ("Surprise(%)", "Surprise %", "Surprise"). Probe all of them.
                surprise = None
                for col in ("Surprise(%)", "Surprise %", "Surprise"):
                    if col in row:
                        surprise = _safe_val(row.get(col))
                        if surprise is not None:
                            break
                earnings_dates.append({
                    "date": idx.isoformat() if hasattr(idx, 'isoformat') else str(idx),
                    "epsEstimate": _safe_val(row.get("EPS Estimate")),
                    "epsActual": _safe_val(row.get("Reported EPS")),
                    "surprise": surprise,
                })
    except Exception:
        pass

    next_earnings = None
    try:
        calendar = ticker.calendar
        if isinstance(calendar, dict):
            ed_val = calendar.get("Earnings Date")
            if ed_val:
                first = ed_val[0] if isinstance(ed_val, list) and ed_val else ed_val
                next_earnings = first.isoformat() if hasattr(first, 'isoformat') else str(first)
    except Exception:
        pass

    quarterly = None
    try:
        qe = ticker.quarterly_earnings
        if qe is not None and not qe.empty:
            quarterly = []
            for idx, row in qe.iterrows():
                quarterly.append({
                    "quarter": str(idx),
                    "revenue": _safe_val(row.get("Revenue")),
                    "earnings": _safe_val(row.get("Earnings")),
                })
    except Exception:
        pass

    # If we got literally nothing back for an unknown ticker, surface a 404
    # rather than a hollow 200 that the frontend renders as "no earnings."
    if earnings_dates is None and next_earnings is None and quarterly is None:
        # Verify the symbol actually resolves to a tradeable instrument.
        try:
            info = ticker.info
            if not (info.get("currentPrice") or info.get("regularMarketPrice")):
                raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}")

    return {
        "symbol": symbol,
        "nextEarningsDate": next_earnings,
        "earningsHistory": earnings_dates,
        "quarterlyEarnings": quarterly,
    }


@app.get("/earnings/{symbol}", response_model=EarningsResponse)
async def get_earnings(symbol: str):
    """Get earnings history and upcoming earnings dates for a stock."""
    sym = _safe_symbol(symbol)
    try:
        data = await asyncio.to_thread(_fetch_earnings_sync, sym)
        return EarningsResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=_safe_error(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
