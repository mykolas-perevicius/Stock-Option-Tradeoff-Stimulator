/**
 * Financial Modeling Prep (FMP) Provider
 * Free tier: 250 requests/day, 500MB/month bandwidth
 * Requires API key from https://site.financialmodelingprep.com/developer/docs
 */

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

export const fmpProvider = {
  id: 'fmp',
  name: 'Financial Modeling Prep',
  requiresApiKey: true,

  /**
   * Fetch stock quote from FMP
   * @param {string} symbol - Stock symbol
   * @param {string} apiKey - FMP API key
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol, apiKey) {
    if (!apiKey) {
      throw new Error('FMP API key required');
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cacheKey = `${upperSymbol}-fmp`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${FMP_BASE_URL}/quote/${upperSymbol}?apikey=${apiKey}`,
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
          throw new Error('Invalid FMP API key');
        }
        if (response.status === 429) {
          throw new Error('FMP rate limit exceeded');
        }
        throw new Error(`FMP HTTP ${response.status}`);
      }

      const data = await response.json();

      // FMP returns an array
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No data for symbol: ${upperSymbol}`);
      }

      const stockData = data[0];

      const quote = {
        symbol: stockData.symbol,
        price: Math.round(stockData.price * 100) / 100,
        previousClose: Math.round(stockData.previousClose * 100) / 100,
        change: Math.round(stockData.change * 100) / 100,
        changePercent: Math.round(stockData.changesPercentage * 100) / 100,
        high: stockData.dayHigh,
        low: stockData.dayLow,
        open: stockData.open,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
        pe: stockData.pe,
        eps: stockData.eps,
        name: stockData.name,
        exchange: stockData.exchange,
        currency: 'USD',
        timestamp: new Date(stockData.timestamp * 1000).toISOString(),
        source: 'fmp',
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
   * Search for symbols using FMP
   * @param {string} query - Search query
   * @param {string} apiKey - FMP API key
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query, apiKey) {
    if (!apiKey) {
      throw new Error('FMP API key required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${FMP_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=20&apikey=${apiKey}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`FMP search failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      return (data || []).slice(0, 20).map(item => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.stockExchange,
        exchangeShortName: item.exchangeShortName,
        currency: item.currency,
      }));
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },
};
