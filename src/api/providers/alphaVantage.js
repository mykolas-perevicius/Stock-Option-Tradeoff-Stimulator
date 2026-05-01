/**
 * Alpha Vantage Provider
 * Free tier: 25 API calls/day
 * Requires API key from https://www.alphavantage.co/support/#api-key
 */

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

export const alphaVantageProvider = {
  id: 'alphavantage',
  name: 'Alpha Vantage',
  requiresApiKey: true,

  /**
   * Fetch stock quote from Alpha Vantage
   * @param {string} symbol - Stock symbol
   * @param {string} apiKey - Alpha Vantage API key
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol, apiKey) {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key required');
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-alphavantage`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // Alpha Vantage can be slow

    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Alpha Vantage HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for error/limit messages
      if (data['Error Message']) {
        throw new Error('Invalid Alpha Vantage API key or symbol');
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage rate limit exceeded (25/day)');
      }

      const globalQuote = data['Global Quote'];
      if (!globalQuote || !globalQuote['05. price']) {
        throw new Error(`No data for symbol: ${upperSymbol}`);
      }

      const num = (v) => {
        if (v == null) return null;
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

      const price = num(globalQuote['05. price']);
      if (price == null || price <= 0) {
        throw new Error(`Invalid price for ${upperSymbol}`);
      }
      const prevClose = num(globalQuote['08. previous close']);
      const change = num(globalQuote['09. change']);
      const changePercentRaw = globalQuote['10. change percent'];
      const changePercent = num(
        typeof changePercentRaw === 'string' ? changePercentRaw.replace('%', '') : changePercentRaw
      );

      const quote = {
        symbol: upperSymbol,
        price: round2(price),
        previousClose: round2(prevClose),
        change: round2(change),
        changePercent: round2(changePercent),
        high: num(globalQuote['03. high']),
        low: num(globalQuote['04. low']),
        open: num(globalQuote['02. open']),
        volume: (() => {
          const v = parseInt(globalQuote['06. volume'], 10);
          return Number.isFinite(v) ? v : null;
        })(),
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: 'alphavantage',
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
   * Search for symbols using Alpha Vantage
   * @param {string} query - Search query
   * @param {string} apiKey - Alpha Vantage API key
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query, apiKey) {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Alpha Vantage search failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data['Note']) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      const matches = data.bestMatches || [];

      return matches.slice(0, 20).map(item => ({
        symbol: item['1. symbol'],
        name: item['2. name'],
        type: item['3. type'],
        region: item['4. region'],
        currency: item['8. currency'],
      }));
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },
};
