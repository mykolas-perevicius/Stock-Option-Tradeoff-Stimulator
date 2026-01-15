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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // yfinance can be slow

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/quote/${upperSymbol}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

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

      const quote = {
        symbol: upperSymbol,
        price: Math.round(data.price * 100) / 100,
        previousClose: Math.round(data.previousClose * 100) / 100,
        change: Math.round((data.price - data.previousClose) * 100) / 100,
        changePercent: Math.round(((data.price - data.previousClose) / data.previousClose) * 10000) / 100,
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
      clearTimeout(timeout);

      // If backend is unavailable, provide helpful error
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        throw new Error('yfinance backend not available. Please ensure the backend server is running.');
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/search?q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

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
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // History can be slow

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/history/${upperSymbol}?period=${period}&interval=1d`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

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
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('History request timed out');
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/options/${upperSymbol}/expirations`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No options available for: ${upperSymbol}`);
        }
        throw new Error(`Options expirations HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('Options expirations request timed out');
      }

      throw error;
    }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      let url = `${YFINANCE_BACKEND_URL}/options/${upperSymbol}`;
      if (expiry) {
        url += `?expiry=${encodeURIComponent(expiry)}`;
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No options data for: ${upperSymbol}`);
        }
        throw new Error(`Options chain HTTP ${response.status}`);
      }

      const data = await response.json();

      quoteCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('Options chain request timed out');
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/fundamentals/${upperSymbol}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No fundamental data for: ${upperSymbol}`);
        }
        throw new Error(`Fundamentals HTTP ${response.status}`);
      }

      const data = await response.json();

      quoteCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('Fundamentals request timed out');
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

    // Check cache
    const cacheKey = `${upperSymbol}-earnings`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 5) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `${YFINANCE_BACKEND_URL}/earnings/${upperSymbol}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No earnings data for: ${upperSymbol}`);
        }
        throw new Error(`Earnings HTTP ${response.status}`);
      }

      const data = await response.json();

      quoteCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('Earnings request timed out');
      }

      throw error;
    }
  },
};
