/**
 * Finnhub Provider
 * Free tier: 60 API calls/minute
 * Requires API key from https://finnhub.io/register
 */

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

export const finnhubProvider = {
  id: 'finnhub',
  name: 'Finnhub',
  requiresApiKey: true,

  /**
   * Fetch stock quote from Finnhub
   * @param {string} symbol - Stock symbol
   * @param {string} apiKey - Finnhub API key
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol, apiKey) {
    if (!apiKey) {
      throw new Error('Finnhub API key required');
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-finnhub`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/quote?symbol=${upperSymbol}&token=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Finnhub API key');
        }
        if (response.status === 429) {
          throw new Error('Finnhub rate limit exceeded (60/min)');
        }
        throw new Error(`Finnhub HTTP ${response.status}`);
      }

      const data = await response.json();

      // Finnhub returns empty data for unknown symbols
      if (!data.c || data.c === 0) {
        throw new Error(`No data for symbol: ${upperSymbol}`);
      }

      const quote = {
        symbol: upperSymbol,
        price: Math.round(data.c * 100) / 100, // Current price
        previousClose: Math.round(data.pc * 100) / 100, // Previous close
        change: Math.round(data.d * 100) / 100, // Change
        changePercent: Math.round(data.dp * 100) / 100, // Change percent
        high: data.h, // High of day
        low: data.l, // Low of day
        open: data.o, // Open price
        currency: 'USD',
        timestamp: new Date(data.t * 1000).toISOString(),
        source: 'finnhub',
        live: true,
      };

      quoteCache.set(cacheKey, {
        data: quote,
        timestamp: Date.now(),
      });

      return quote;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },

  /**
   * Search for symbols using Finnhub
   * @param {string} query - Search query
   * @param {string} apiKey - Finnhub API key
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query, apiKey) {
    if (!apiKey) {
      throw new Error('Finnhub API key required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Finnhub search failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      return (data.result || []).slice(0, 20).map(item => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type,
      }));
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },
};
