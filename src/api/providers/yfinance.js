/**
 * yfinance Provider (via Backend Server)
 * Free, no API key required (uses our hosted Python backend)
 * Backend runs yfinance Python library
 */

// Backend URL - can be configured via environment variable
const YFINANCE_BACKEND_URL = import.meta.env.VITE_YFINANCE_BACKEND_URL || 'http://localhost:8000';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Render free-tier services cold-start in 30-60s. We try a normal request first,
// then on network/abort failure ping /health (which spins the dyno up), and retry
// once with a longer timeout. Fire one warmup at module load too.
const DEFAULT_TIMEOUT = 25000;
const WARM_RETRY_TIMEOUT = 75000;
let warmupPromise = null;

function warmupBackend() {
  if (warmupPromise) return warmupPromise;
  warmupPromise = fetch(`${YFINANCE_BACKEND_URL}/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(60000),
  })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      // Allow another warmup attempt after 5 minutes
      setTimeout(() => { warmupPromise = null; }, 5 * 60 * 1000);
    });
  return warmupPromise;
}

// Best-effort warmup the moment any code imports this provider.
if (typeof window !== 'undefined') {
  warmupBackend();
}

async function fetchWithWarmup(url, { timeout = DEFAULT_TIMEOUT, ...init } = {}) {
  const attempt = (ms) => fetch(url, {
    ...init,
    signal: AbortSignal.timeout(ms),
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });

  try {
    return await attempt(timeout);
  } catch (err) {
    const isNetwork = err?.name === 'AbortError' || err?.name === 'TimeoutError'
      || /fetch|network|Failed to fetch/i.test(err?.message || '');
    if (!isNetwork) throw err;
    // Warm the backend, then retry once with a longer fuse.
    await warmupBackend();
    return attempt(WARM_RETRY_TIMEOUT);
  }
}

export const yfinanceProvider = {
  id: 'yfinance',
  name: 'yfinance (Backend)',
  requiresApiKey: false,

  /**
   * Fetch stock quote from yfinance backend
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-yfinance`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetchWithWarmup(
        `${YFINANCE_BACKEND_URL}/quote/${upperSymbol}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Symbol not found: ${upperSymbol}`);
        }
        if (response.status === 503) {
          throw new Error('yfinance backend unavailable');
        }
        throw new Error(`yfinance backend HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const price = Number.isFinite(data.price) ? data.price : null;
      if (price === null) {
        throw new Error(`No price returned for ${upperSymbol}`);
      }
      // previousClose can be missing on new IPOs / halted symbols; fall back to
      // current price so downstream change/changePercent come out as 0 instead
      // of NaN/Infinity polluting every component that displays them.
      const prevClose = Number.isFinite(data.previousClose) && data.previousClose > 0
        ? data.previousClose
        : price;

      const quote = {
        symbol: upperSymbol,
        price: Math.round(price * 100) / 100,
        previousClose: Math.round(prevClose * 100) / 100,
        change: Math.round((price - prevClose) * 100) / 100,
        changePercent: Math.round(((price - prevClose) / prevClose) * 10000) / 100,
        high: data.dayHigh,
        low: data.dayLow,
        open: data.open,
        volume: data.volume,
        marketCap: data.marketCap,
        name: data.shortName || data.longName,
        currency: data.currency || 'USD',
        exchange: data.exchange,
        timestamp: new Date().toISOString(),
        source: 'yfinance',
        live: true,
        // Additional yfinance data
        fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: data.fiftyTwoWeekLow,
        averageVolume: data.averageVolume,
        beta: data.beta,
      };

      quoteCache.set(cacheKey, {
        data: quote,
        timestamp: Date.now(),
      });

      return quote;
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError'
          || /fetch|Failed to fetch/i.test(error.message)) {
        throw new Error('yfinance backend is starting up. Please retry in 30-60 seconds.');
      }
      throw error;
    }
  },

  /**
   * Search for symbols using yfinance backend
   * @param {string} query - Search query
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query) {
    const response = await fetchWithWarmup(
      `${YFINANCE_BACKEND_URL}/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error(`yfinance search failed: HTTP ${response.status}`);
    }
    const data = await response.json();
    return (data.results || []).slice(0, 20).map(item => ({
      symbol: item.symbol,
      name: item.shortname || item.longname,
      exchange: item.exchange,
      type: item.quoteType,
    }));
  },

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const response = await fetch(`${YFINANCE_BACKEND_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch historical price data for volatility calculations
   * @param {string} symbol - Stock symbol
   * @param {string} period - Time period (1y, 2y, 5y, etc.)
   * @returns {Promise<object>} Historical data with closePrices and ohlcData
   */
  async fetchHistory(symbol, period = '1y') {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-history-${period}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 5) {
      // Cache history for 5 minutes
      return cached.data;
    }

    try {
      const response = await fetchWithWarmup(
        `${YFINANCE_BACKEND_URL}/history/${upperSymbol}?period=${period}&interval=1d`,
        { timeout: 35000 }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No history for symbol: ${upperSymbol}`);
        }
        throw new Error(`yfinance history HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        throw new Error(`No historical data for ${upperSymbol}`);
      }

      // Extract close prices and OHLC data
      const closePrices = data.data.map((d) => d.close).filter((p) => p > 0);
      const ohlcData = data.data
        .filter((d) => d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0)
        .map((d) => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));

      const result = {
        symbol: upperSymbol,
        closePrices,
        ohlcData,
        dataPoints: data.data.length,
        period,
        timestamp: new Date().toISOString(),
      };

      quoteCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('History request timed out (backend may be cold starting)');
      }
      throw error;
    }
  },

  /**
   * Fetch available options expiration dates
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Object with symbol and expirations array
   */
  async fetchOptionsExpirations(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();
    const response = await fetchWithWarmup(
      `${YFINANCE_BACKEND_URL}/options/${upperSymbol}/expirations`
    );
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No options available for: ${upperSymbol}`);
      }
      throw new Error(`Options expirations HTTP ${response.status}`);
    }
    return response.json();
  },

  /**
   * Fetch full options chain for a symbol
   * @param {string} symbol - Stock symbol
   * @param {string} expiry - Expiration date (optional, defaults to nearest)
   * @returns {Promise<object>} Options chain with calls and puts
   */
  async fetchOptionsChain(symbol, expiry = null) {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache
    const cacheKey = `${upperSymbol}-options-${expiry || 'nearest'}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    let url = `${YFINANCE_BACKEND_URL}/options/${upperSymbol}`;
    if (expiry) url += `?expiry=${encodeURIComponent(expiry)}`;

    try {
      const response = await fetchWithWarmup(url, { timeout: 30000 });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No options data for: ${upperSymbol}`);
        }
        throw new Error(`Options chain HTTP ${response.status}`);
      }

      const data = await response.json();
      quoteCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Options chain request timed out (backend may be cold starting)');
      }
      throw error;
    }
  },

  /**
   * Fetch fundamental financial metrics for a stock
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Fundamental data including P/E, EPS, margins, analyst targets
   */
  async fetchFundamentals(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache
    const cacheKey = `${upperSymbol}-fundamentals`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 5) {
      // Cache fundamentals for 5 minutes
      return cached.data;
    }

    try {
      const response = await fetchWithWarmup(
        `${YFINANCE_BACKEND_URL}/fundamentals/${upperSymbol}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No fundamental data for: ${upperSymbol}`);
        }
        throw new Error(`Fundamentals HTTP ${response.status}`);
      }
      const data = await response.json();
      quoteCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Fundamentals request timed out (backend may be cold starting)');
      }
      throw error;
    }
  },

  /**
   * Fetch earnings history and upcoming earnings for a stock
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Earnings data including history and next date
   */
  async fetchEarnings(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();
    const cacheKey = `${upperSymbol}-earnings`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 5) {
      return cached.data;
    }

    try {
      const response = await fetchWithWarmup(
        `${YFINANCE_BACKEND_URL}/earnings/${upperSymbol}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No earnings data for: ${upperSymbol}`);
        }
        throw new Error(`Earnings HTTP ${response.status}`);
      }
      const data = await response.json();
      quoteCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Earnings request timed out (backend may be cold starting)');
      }
      throw error;
    }
  },
};
