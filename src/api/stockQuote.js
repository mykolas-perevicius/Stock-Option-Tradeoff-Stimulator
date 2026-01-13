/**
 * Stock quote API using free data sources
 * Primary: Yahoo Finance chart API (works from browser)
 * Fallback: Curated static prices for common stocks
 */

// Multiple Yahoo Finance endpoints to try
const YAHOO_ENDPOINTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart',
  'https://query2.finance.yahoo.com/v8/finance/chart',
];

// Cache for recent quotes
const quoteCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch stock quote - tries Yahoo Finance, falls back to static data
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<object>} Quote data
 */
export async function fetchQuote(symbol) {
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
        // Cache successful result
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

  // All APIs failed - return fallback
  console.log(`Using fallback price for ${upperSymbol}`);
  const fallback = getFallbackQuote(upperSymbol);

  // Cache fallback too (with shorter duration)
  quoteCache.set(upperSymbol, {
    data: fallback,
    timestamp: Date.now() - CACHE_DURATION / 2, // Expires sooner
  });

  return fallback;
}

/**
 * Fetch from Yahoo Finance API
 */
async function fetchFromYahoo(endpoint, symbol) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
 * Get fallback quote data for common symbols
 * Prices updated January 2025 - reasonable approximations
 */
function getFallbackQuote(symbol) {
  // Current approximate prices (Jan 2025)
  const fallbacks = {
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
    MCD: { price: 283, name: 'McDonald\'s' },
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

  const stock = fallbacks[symbol];

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
      source: 'fallback',
      live: false,
      note: 'Using approximate price. Enter symbol and click Load for live data.',
    };
  }

  // Unknown symbol - return generic default
  return {
    symbol,
    price: 100,
    previousClose: 100,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    source: 'default',
    live: false,
    note: 'Unknown symbol. Using $100 default.',
  };
}

/**
 * Search for stock symbols
 */
export function searchSymbols(query) {
  const symbols = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'AMD', name: 'AMD' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'BA', name: 'Boeing Co.' },
    { symbol: 'DIS', name: 'Walt Disney' },
  ];

  const q = query.toUpperCase();
  return symbols.filter(
    s => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
  );
}

/**
 * Get estimated IV for a symbol
 */
export function getEstimatedIV(symbol) {
  const ivEstimates = {
    // High IV (volatile stocks)
    TSLA: 55,
    NVDA: 50,
    AMD: 48,
    NFLX: 45,
    META: 40,

    // Medium IV
    AAPL: 24,
    MSFT: 22,
    GOOGL: 28,
    AMZN: 32,
    CRM: 35,

    // Low IV (stable stocks)
    JPM: 22,
    V: 20,
    JNJ: 18,
    WMT: 18,
    KO: 15,
    PG: 15,

    // ETFs (typically lower)
    SPY: 16,
    QQQ: 22,
    IWM: 24,
    DIA: 14,
  };

  return ivEstimates[symbol.toUpperCase()] || 30;
}

/**
 * Clear the quote cache
 */
export function clearCache() {
  quoteCache.clear();
}

/**
 * Check if quote is live or fallback
 */
export function isLiveQuote(quote) {
  return quote?.live === true;
}
