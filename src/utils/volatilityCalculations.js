/**
 * Volatility Calculations Module
 * Multiple methods for calculating implied/realized volatility
 */

/**
 * Calculate realized (historical) volatility from daily price returns
 * @param {number[]} prices - Array of daily closing prices (oldest to newest)
 * @param {number} period - Number of days to use for calculation
 * @returns {number} Annualized volatility as percentage (e.g., 25 for 25%)
 */
export function realizedVolatility(prices, period = 30) {
  if (!prices || prices.length < 2) return 0;

  // Use the most recent 'period' prices
  const relevantPrices = prices.slice(-Math.min(period + 1, prices.length));

  if (relevantPrices.length < 2) return 0;

  // Calculate log returns
  const returns = [];
  for (let i = 1; i < relevantPrices.length; i++) {
    if (relevantPrices[i - 1] > 0 && relevantPrices[i] > 0) {
      returns.push(Math.log(relevantPrices[i] / relevantPrices[i - 1]));
    }
  }

  if (returns.length < 2) return 0;

  // Calculate variance of returns
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);

  // Annualize: multiply by sqrt(252 trading days)
  const annualizedVol = Math.sqrt(variance * 252) * 100;

  return annualizedVol;
}

/**
 * Calculate Parkinson volatility using high-low price range
 * More efficient estimator than close-to-close volatility
 * @param {Array<{high: number, low: number}>} ohlcData - Array of OHLC data
 * @returns {number} Annualized volatility as percentage
 */
export function parkinsonVolatility(ohlcData) {
  if (!ohlcData || ohlcData.length < 2) return 0;

  const sum = ohlcData.reduce((s, d) => {
    if (d.high > 0 && d.low > 0 && d.high >= d.low) {
      return s + Math.pow(Math.log(d.high / d.low), 2);
    }
    return s;
  }, 0);

  const n = ohlcData.filter(d => d.high > 0 && d.low > 0 && d.high >= d.low).length;

  if (n < 2) return 0;

  // Parkinson estimator: sqrt(sum / (4 * n * ln(2)) * 252) * 100
  const annualizedVol = Math.sqrt(sum / (4 * n * Math.log(2)) * 252) * 100;

  return annualizedVol;
}

/**
 * Calculate Garman-Klass volatility (uses OHLC data)
 * More efficient than Parkinson by incorporating open/close
 * @param {Array<{open: number, high: number, low: number, close: number}>} ohlcData
 * @returns {number} Annualized volatility as percentage
 */
export function garmanKlassVolatility(ohlcData) {
  if (!ohlcData || ohlcData.length < 2) return 0;

  const sum = ohlcData.reduce((s, d) => {
    if (d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0) {
      const u = Math.log(d.high / d.open);
      const d_val = Math.log(d.low / d.open);
      const c = Math.log(d.close / d.open);

      // Garman-Klass formula
      return s + 0.5 * Math.pow(Math.log(d.high / d.low), 2) - (2 * Math.log(2) - 1) * Math.pow(c, 2);
    }
    return s;
  }, 0);

  const n = ohlcData.filter(
    (d) => d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
  ).length;

  if (n < 2) return 0;

  const annualizedVol = Math.sqrt((sum / n) * 252) * 100;

  return annualizedVol;
}

/**
 * Simple GARCH(1,1) volatility estimation
 * Uses exponential weighting of recent returns
 * @param {number[]} prices - Array of daily closing prices
 * @param {number} omega - Long-run variance weight (default 0.000001)
 * @param {number} alpha - Coefficient for lagged squared return (default 0.1)
 * @param {number} beta - Coefficient for lagged variance (default 0.88)
 * @returns {number} Annualized volatility as percentage
 */
export function garchVolatility(prices, omega = 0.000001, alpha = 0.1, beta = 0.88) {
  if (!prices || prices.length < 30) return 0;

  // Calculate log returns
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }

  if (returns.length < 10) return 0;

  // Initialize variance with sample variance of first 10 returns
  const initialReturns = returns.slice(0, 10);
  const initialMean = initialReturns.reduce((s, r) => s + r, 0) / initialReturns.length;
  let variance = initialReturns.reduce((s, r) => s + Math.pow(r - initialMean, 2), 0) / (initialReturns.length - 1);

  // GARCH(1,1) recursion
  for (let i = 10; i < returns.length; i++) {
    const ret = returns[i];
    variance = omega + alpha * Math.pow(ret, 2) + beta * variance;
  }

  // Annualize
  const annualizedVol = Math.sqrt(variance * 252) * 100;

  return annualizedVol;
}

/**
 * IV calculation methods available
 */
export const IV_METHODS = {
  market: {
    id: 'market',
    name: 'Market IV',
    description: 'ATM implied volatility from options chain',
    requiresHistory: false,
  },
  hist30: {
    id: 'hist30',
    name: 'Historical 30-day',
    description: 'Realized volatility over last 30 trading days',
    requiresHistory: true,
  },
  hist90: {
    id: 'hist90',
    name: 'Historical 90-day',
    description: 'Realized volatility over last 90 trading days',
    requiresHistory: true,
  },
  hist1y: {
    id: 'hist1y',
    name: 'Historical 1-year',
    description: 'Realized volatility over last 252 trading days',
    requiresHistory: true,
  },
  parkinson: {
    id: 'parkinson',
    name: 'Parkinson (Range)',
    description: 'High-low range based volatility (more efficient)',
    requiresHistory: true,
    requiresOHLC: true,
  },
  garmanKlass: {
    id: 'garmanKlass',
    name: 'Garman-Klass',
    description: 'Uses OHLC data for better estimation',
    requiresHistory: true,
    requiresOHLC: true,
  },
  garch: {
    id: 'garch',
    name: 'GARCH(1,1)',
    description: 'Exponentially weighted recent volatility',
    requiresHistory: true,
  },
};

/**
 * Calculate volatility using specified method
 * @param {string} method - One of the IV_METHODS keys
 * @param {object} data - Data object containing prices and OHLC data
 * @param {number} data.marketIV - Market implied volatility
 * @param {number[]} data.closePrices - Array of closing prices
 * @param {Array} data.ohlcData - Array of OHLC objects
 * @returns {number} Volatility as percentage
 */
export function calculateVolatility(method, data) {
  const { marketIV = 30, closePrices = [], ohlcData = [] } = data;

  switch (method) {
    case 'market':
      return marketIV;

    case 'hist30':
      return realizedVolatility(closePrices, 30);

    case 'hist90':
      return realizedVolatility(closePrices, 90);

    case 'hist1y':
      return realizedVolatility(closePrices, 252);

    case 'parkinson':
      // Use last 30 days of OHLC data
      return parkinsonVolatility(ohlcData.slice(-30));

    case 'garmanKlass':
      // Use last 30 days of OHLC data
      return garmanKlassVolatility(ohlcData.slice(-30));

    case 'garch':
      return garchVolatility(closePrices);

    default:
      return marketIV;
  }
}

/**
 * Get all volatility calculations at once
 * @param {object} data - Data containing marketIV, closePrices, ohlcData
 * @returns {object} Object with all volatility calculations
 */
export function getAllVolatilities(data) {
  return {
    market: calculateVolatility('market', data),
    hist30: calculateVolatility('hist30', data),
    hist90: calculateVolatility('hist90', data),
    hist1y: calculateVolatility('hist1y', data),
    parkinson: calculateVolatility('parkinson', data),
    garmanKlass: calculateVolatility('garmanKlass', data),
    garch: calculateVolatility('garch', data),
  };
}
