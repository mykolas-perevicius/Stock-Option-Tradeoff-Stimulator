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

      const price = parseFloat(globalQuote['05. price']);
      const prevClose = parseFloat(globalQuote['08. previous close']);
      const change = parseFloat(globalQuote['09. change']);
      const changePercent = parseFloat(globalQuote['10. change percent']?.replace('%', ''));

      const quote = {
        symbol: upperSymbol,
        price: Math.round(price * 100) / 100,
        previousClose: Math.round(prevClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        high: parseFloat(globalQuote['03. high']) || null,
        low: parseFloat(globalQuote['04. low']) || null,
        open: parseFloat(globalQuote['02. open']) || null,
        volume: parseInt(globalQuote['06. volume']) || null,
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
