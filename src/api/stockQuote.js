/**
 * Stock quote API using free data sources
 * Primary: Yahoo Finance chart API (no auth required)
 * Fallback: Static defaults
 */

const YAHOO_CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch stock quote from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<object>} Quote data
 */
export async function fetchQuote(symbol) {
  const upperSymbol = symbol.toUpperCase().trim();

  // Check cache
  const cached = quoteCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Yahoo Finance chart API - works without authentication
    const response = await fetch(
      `${YAHOO_CHART_API}/${upperSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.chart?.error) {
      throw new Error(data.chart.error.description || 'API error');
    }

    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error('No data returned');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    const quoteData = {
      symbol: upperSymbol,
      price: meta.regularMarketPrice || meta.previousClose,
      previousClose: meta.previousClose,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      high: quote?.high?.[0] || meta.regularMarketDayHigh,
      low: quote?.low?.[0] || meta.regularMarketDayLow,
      volume: quote?.volume?.[0] || meta.regularMarketVolume,
      marketCap: meta.marketCap,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    quoteCache.set(upperSymbol, {
      data: quoteData,
      timestamp: Date.now(),
    });

    return quoteData;
  } catch (error) {
    console.warn(`Failed to fetch quote for ${upperSymbol}:`, error.message);

    // Return cached data if available (even if stale)
    if (cached) {
      return { ...cached.data, stale: true };
    }

    // Return fallback
    return getFallbackQuote(upperSymbol);
  }
}

/**
 * Get fallback quote data for common symbols
 */
function getFallbackQuote(symbol) {
  const fallbacks = {
    AAPL: { price: 175, change: 0, changePercent: 0 },
    TSLA: { price: 250, change: 0, changePercent: 0 },
    MSFT: { price: 380, change: 0, changePercent: 0 },
    GOOGL: { price: 140, change: 0, changePercent: 0 },
    AMZN: { price: 180, change: 0, changePercent: 0 },
    META: { price: 500, change: 0, changePercent: 0 },
    NVDA: { price: 480, change: 0, changePercent: 0 },
    SPY: { price: 480, change: 0, changePercent: 0 },
    QQQ: { price: 410, change: 0, changePercent: 0 },
  };

  const fallback = fallbacks[symbol] || { price: 100, change: 0, changePercent: 0 };

  return {
    symbol,
    ...fallback,
    previousClose: fallback.price,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    fallback: true,
  };
}

/**
 * Search for stock symbols (basic implementation)
 * In production, you'd use a proper search API
 */
export function searchSymbols(query) {
  const commonSymbols = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'AMD', name: 'Advanced Micro Devices' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'DIS', name: 'Walt Disney Co.' },
    { symbol: 'BA', name: 'Boeing Co.' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa Inc.' },
  ];

  const upperQuery = query.toUpperCase();
  return commonSymbols.filter(
    (s) =>
      s.symbol.includes(upperQuery) ||
      s.name.toUpperCase().includes(upperQuery)
  );
}

/**
 * Get estimated IV for a symbol (simplified)
 * In production, you'd fetch real IV from options chain
 */
export function getEstimatedIV(symbol) {
  const ivEstimates = {
    // High IV stocks (meme stocks, volatile tech)
    TSLA: 55,
    NVDA: 45,
    AMD: 50,
    // Medium IV stocks
    AAPL: 25,
    MSFT: 22,
    GOOGL: 28,
    META: 35,
    AMZN: 30,
    NFLX: 40,
    // Low IV stocks (stable blue chips)
    JPM: 20,
    V: 18,
    DIS: 25,
    BA: 35,
    // ETFs (generally lower IV)
    SPY: 15,
    QQQ: 20,
  };

  return ivEstimates[symbol.toUpperCase()] || 30;
}

/**
 * Clear the quote cache
 */
export function clearCache() {
  quoteCache.clear();
}
