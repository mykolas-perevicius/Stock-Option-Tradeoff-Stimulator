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

      const num = (v) => {
        if (v == null) return null;
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

      const price = num(data.close);
      if (price == null || price <= 0) {
        throw new Error(`No data for symbol: ${upperSymbol}`);
      }
      const prevCloseRaw = num(data.previous_close);
      const prevClose = prevCloseRaw != null && prevCloseRaw > 0 ? prevCloseRaw : price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      const volRaw = parseInt(data.volume, 10);

      const quote = {
        symbol: upperSymbol,
        price: round2(price),
        previousClose: round2(prevClose),
        change: round2(change),
        changePercent: round2(changePercent),
        high: num(data.high),
        low: num(data.low),
        open: num(data.open),
        volume: Number.isFinite(volRaw) ? volRaw : null,
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
