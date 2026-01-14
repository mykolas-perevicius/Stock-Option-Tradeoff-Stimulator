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
};
