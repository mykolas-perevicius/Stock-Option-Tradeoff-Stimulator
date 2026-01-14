/**
 * Yahoo Finance Provider
 * Free, no API key required
 * Uses Yahoo Finance chart API endpoints
 */

const YAHOO_ENDPOINTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart',
  'https://query2.finance.yahoo.com/v8/finance/chart',
];

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Fallback prices for common stocks (Jan 2025)
const FALLBACK_PRICES = {
  // Mega-cap tech
  AAPL: { price: 229, name: 'Apple Inc.' },
  MSFT: { price: 418, name: 'Microsoft Corp.' },
  GOOGL: { price: 191, name: 'Alphabet Inc.' },
  GOOG: { price: 193, name: 'Alphabet Inc.' },
  AMZN: { price: 218, name: 'Amazon.com Inc.' },
  META: { price: 589, name: 'Meta Platforms' },
  NVDA: { price: 136, name: 'NVIDIA Corp.' },

  // Other big tech
  TSLA: { price: 394, name: 'Tesla Inc.' },
  NFLX: { price: 869, name: 'Netflix Inc.' },
  AMD: { price: 119, name: 'AMD' },
  INTC: { price: 20, name: 'Intel Corp.' },
  CRM: { price: 336, name: 'Salesforce' },
  ORCL: { price: 166, name: 'Oracle Corp.' },
  ADBE: { price: 446, name: 'Adobe Inc.' },

  // Finance
  JPM: { price: 243, name: 'JPMorgan Chase' },
  V: { price: 314, name: 'Visa Inc.' },
  MA: { price: 519, name: 'Mastercard' },
  BAC: { price: 46, name: 'Bank of America' },
  GS: { price: 578, name: 'Goldman Sachs' },

  // Consumer
  WMT: { price: 92, name: 'Walmart' },
  COST: { price: 923, name: 'Costco' },
  HD: { price: 392, name: 'Home Depot' },
  MCD: { price: 283, name: "McDonald's" },
  NKE: { price: 73, name: 'Nike Inc.' },
  SBUX: { price: 91, name: 'Starbucks' },
  DIS: { price: 109, name: 'Walt Disney' },

  // Healthcare
  UNH: { price: 506, name: 'UnitedHealth' },
  JNJ: { price: 144, name: 'Johnson & Johnson' },
  PFE: { price: 26, name: 'Pfizer' },
  ABBV: { price: 178, name: 'AbbVie' },
  MRK: { price: 99, name: 'Merck' },
  LLY: { price: 754, name: 'Eli Lilly' },

  // Industrial
  BA: { price: 170, name: 'Boeing' },
  CAT: { price: 368, name: 'Caterpillar' },
  GE: { price: 170, name: 'GE Aerospace' },

  // Energy
  XOM: { price: 106, name: 'Exxon Mobil' },
  CVX: { price: 144, name: 'Chevron' },

  // ETFs
  SPY: { price: 590, name: 'S&P 500 ETF' },
  QQQ: { price: 512, name: 'Nasdaq 100 ETF' },
  IWM: { price: 224, name: 'Russell 2000 ETF' },
  DIA: { price: 430, name: 'Dow Jones ETF' },
  VTI: { price: 284, name: 'Total Stock Market' },
  VOO: { price: 542, name: 'Vanguard S&P 500' },
};

/**
 * Fetch quote from Yahoo Finance
 */
async function fetchFromYahoo(endpoint, symbol) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${endpoint}/${symbol}?interval=1d&range=1d`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.chart?.error) {
      throw new Error(data.chart.error.description || 'API error');
    }

    const result = data.chart?.result?.[0];
    if (!result?.meta) {
      throw new Error('No data returned');
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.previousClose || price;

    return {
      symbol,
      price: Math.round(price * 100) / 100,
      previousClose: Math.round(prevClose * 100) / 100,
      change: Math.round((price - prevClose) * 100) / 100,
      changePercent: Math.round(((price - prevClose) / prevClose) * 10000) / 100,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || 'NASDAQ',
      timestamp: new Date().toISOString(),
      source: 'yahoo',
      live: true,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Get fallback quote for common symbols
 */
function getFallbackQuote(symbol) {
  const stock = FALLBACK_PRICES[symbol];

  if (stock) {
    return {
      symbol,
      price: stock.price,
      name: stock.name,
      previousClose: stock.price,
      change: 0,
      changePercent: 0,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: 'yahoo-fallback',
      live: false,
      note: 'Using approximate price. Live data unavailable.',
    };
  }

  return {
    symbol,
    price: 100,
    previousClose: 100,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    source: 'yahoo-default',
    live: false,
    note: 'Unknown symbol. Using $100 default.',
  };
}

export const yahooProvider = {
  id: 'yahoo',
  name: 'Yahoo Finance',
  requiresApiKey: false,

  /**
   * Fetch stock quote
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Quote data
   */
  async fetchQuote(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cached = quoteCache.get(upperSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Try each Yahoo endpoint
    for (const endpoint of YAHOO_ENDPOINTS) {
      try {
        const quote = await fetchFromYahoo(endpoint, upperSymbol);
        if (quote) {
          quoteCache.set(upperSymbol, {
            data: quote,
            timestamp: Date.now(),
          });
          return quote;
        }
      } catch (error) {
        console.warn(`Yahoo endpoint ${endpoint} failed:`, error.message);
      }
    }

    // All endpoints failed - return fallback
    console.log(`Using fallback price for ${upperSymbol}`);
    const fallback = getFallbackQuote(upperSymbol);

    quoteCache.set(upperSymbol, {
      data: fallback,
      timestamp: Date.now() - CACHE_DURATION / 2,
    });

    return fallback;
  },

  /**
   * Search for symbols (uses local data)
   * @param {string} query - Search query
   * @returns {Promise<array>} Matching symbols
   */
  async searchSymbols(query) {
    const symbols = Object.entries(FALLBACK_PRICES).map(([symbol, data]) => ({
      symbol,
      name: data.name,
    }));

    const q = query.toUpperCase();
    return symbols.filter(
      s => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
    );
  },
};
