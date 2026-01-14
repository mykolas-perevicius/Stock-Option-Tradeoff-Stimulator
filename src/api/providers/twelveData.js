/**
 * Twelve Data Provider
 * Free tier: 8 API calls/minute, 800/day
 * Requires API key from https://twelvedata.com/register
 */

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

export const twelveDataProvider = {
  id: 'twelvedata',
  name: 'Twelve Data',
  requiresApiKey: true,

  /**
   * Fetch stock quote from Twelve Data
   * @param {string} symbol - Stock symbol
   * @param {string} apiKey - Twelve Data API key
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol, apiKey) {
    if (!apiKey) {
      throw new Error('Twelve Data API key required');
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-twelvedata`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${TWELVE_DATA_BASE_URL}/quote?symbol=${upperSymbol}&apikey=${apiKey}`,
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
          throw new Error('Invalid Twelve Data API key');
        }
        if (response.status === 429) {
          throw new Error('Twelve Data rate limit exceeded (8/min)');
        }
        throw new Error(`Twelve Data HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for error response
      if (data.status === 'error') {
        throw new Error(data.message || 'Twelve Data API error');
      }

      if (!data.close) {
        throw new Error(`No data for symbol: ${upperSymbol}`);
      }

      const price = parseFloat(data.close);
      const prevClose = parseFloat(data.previous_close) || price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      const quote = {
        symbol: upperSymbol,
        price: Math.round(price * 100) / 100,
        previousClose: Math.round(prevClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        high: parseFloat(data.high) || null,
        low: parseFloat(data.low) || null,
        open: parseFloat(data.open) || null,
        volume: parseInt(data.volume) || null,
        currency: data.currency || 'USD',
        exchange: data.exchange || '',
        name: data.name || '',
        timestamp: new Date().toISOString(),
        source: 'twelvedata',
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
   * Search for symbols using Twelve Data
   * @param {string} query - Search query
   * @param {string} apiKey - Twelve Data API key
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query, apiKey) {
    if (!apiKey) {
      throw new Error('Twelve Data API key required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${TWELVE_DATA_BASE_URL}/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Twelve Data search failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      return (data.data || []).slice(0, 20).map(item => ({
        symbol: item.symbol,
        name: item.instrument_name,
        type: item.instrument_type,
        exchange: item.exchange,
      }));
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },
};
