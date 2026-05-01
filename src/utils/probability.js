// Probability distribution calculations for stock price prediction
import { normalPDF, normalCDF } from './blackScholes';

/**
 * Log-normal probability density for future stock price
 * Based on geometric Brownian motion model
 * @param {number} futurePrice - Price to calculate probability for
 * @param {number} currentPrice - Current stock price
 * @param {number} T - Time period in years
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @returns {number} Probability density
 */
export function stockProbability(futurePrice, currentPrice, T, r, sigma) {
  if (futurePrice <= 0 || T <= 0 || sigma <= 0) return 0;

  // Mean of log price under risk-neutral measure
  const mu = Math.log(currentPrice) + (r - 0.5 * sigma * sigma) * T;
  const sigmaSqrtT = sigma * Math.sqrt(T);

  const logPrice = Math.log(futurePrice);
  const z = (logPrice - mu) / sigmaSqrtT;

  return normalPDF(z) / (futurePrice * sigmaSqrtT);
}

/**
 * Calculate cumulative probability that stock ends below a price
 * @returns {number} Probability (0 to 1)
 */
export function probBelow(targetPrice, currentPrice, T, r, sigma) {
  if (targetPrice <= 0) return 0;
  if (T <= 0 || sigma <= 0) return currentPrice < targetPrice ? 1 : 0;

  const mu = Math.log(currentPrice) + (r - 0.5 * sigma * sigma) * T;
  const sigmaSqrtT = sigma * Math.sqrt(T);

  const z = (Math.log(targetPrice) - mu) / sigmaSqrtT;
  return normalCDF(z);
}

/**
 * Calculate cumulative probability that stock ends above a price
 */
export function probAbove(targetPrice, currentPrice, T, r, sigma) {
  return 1 - probBelow(targetPrice, currentPrice, T, r, sigma);
}

/**
 * Calculate probability of stock being between two prices
 */
export function probBetween(lowPrice, highPrice, currentPrice, T, r, sigma) {
  return probBelow(highPrice, currentPrice, T, r, sigma) - probBelow(lowPrice, currentPrice, T, r, sigma);
}

/**
 * Calculate expected stock price (mean)
 */
export function expectedPrice(currentPrice, T, r) {
  return currentPrice * Math.exp(r * T);
}

/**
 * Calculate standard deviation of stock price movement
 * Returns the 1-sigma price move
 */
export function priceStdDev(currentPrice, T, sigma) {
  // Approximate 1-sigma move for log-normal
  return currentPrice * sigma * Math.sqrt(T);
}

/**
 * Calculate price at given standard deviation level
 * @param {number} currentPrice
 * @param {number} T - Time in years
 * @param {number} r - Risk-free rate
 * @param {number} sigma - Volatility
 * @param {number} numSigma - Number of standard deviations (e.g., 1, 2, -1, -2)
 */
export function priceAtSigma(currentPrice, T, r, sigma, numSigma) {
  const mu = Math.log(currentPrice) + (r - 0.5 * sigma * sigma) * T;
  const sigmaSqrtT = sigma * Math.sqrt(T);
  return Math.exp(mu + numSigma * sigmaSqrtT);
}

/**
 * Calculate Value at Risk (VaR) for a position
 * @param {Array} plData - Array of {pl, probability} objects
 * @param {number} confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns {number} VaR value (typically negative, representing loss)
 */
export function calculateVaR(plData, confidence = 0.95) {
  // Sort by P&L ascending
  const sorted = [...plData].sort((a, b) => a.pl - b.pl);

  // Find the cumulative probability at (1 - confidence)
  const targetProb = 1 - confidence;
  let cumProb = 0;

  for (const point of sorted) {
    cumProb += point.probability;
    if (cumProb >= targetProb) {
      return point.pl;
    }
  }

  return sorted[0]?.pl || 0;
}

/**
 * Calculate Expected Shortfall (CVaR) - average loss beyond VaR
 * @param {Array} plData - Array of {pl, probability} objects
 * @param {number} confidence - Confidence level
 * @returns {number} Expected Shortfall value
 */
export function calculateExpectedShortfall(plData, confidence = 0.95) {
  const var95 = calculateVaR(plData, confidence);

  // Calculate average of all losses beyond VaR
  let sumWeightedLoss = 0;
  let sumProb = 0;

  for (const point of plData) {
    if (point.pl <= var95) {
      sumWeightedLoss += point.pl * point.probability;
      sumProb += point.probability;
    }
  }

  return sumProb > 0 ? sumWeightedLoss / sumProb : var95;
}

/**
 * Calculate price needed for a target return
 * @param {number} currentPrice - Current stock price
 * @param {number} entryPrice - Entry price for the position
 * @param {number} targetReturn - Target return as decimal (e.g., 0.5 for 50%)
 * @param {boolean} isStock - True for stock, false for options
 * @param {number} strikePrice - Strike price (for options)
 * @param {number} premium - Option premium paid (for options)
 * @param {number} contracts - Number of contracts (for options)
 */
export function priceForReturn(currentPrice, investmentAmount, targetReturn, isStock, strikePrice = 0, premium = 0, contracts = 1) {
  const targetPL = investmentAmount * targetReturn;

  if (isStock) {
    // For stock: shares * (targetPrice - currentPrice) = targetPL
    const shares = investmentAmount / currentPrice;
    return currentPrice + targetPL / shares;
  } else {
    // For options: contracts * 100 * (targetPrice - strike) - totalPremium = targetPL
    const totalPremium = contracts * premium * 100;
    const optionShares = contracts * 100;
    // targetPrice = (targetPL + totalPremium) / optionShares + strike
    return (targetPL + totalPremium) / optionShares + strikePrice;
  }
}

/**
 * Generate price range based on volatility
 * @returns {object} {min, max} price range
 */
export function generatePriceRange(currentPrice, T, sigma, numSigma = 2) {
  const stdMove = priceStdDev(currentPrice, T, sigma);
  return {
    min: Math.max(0.01, currentPrice - numSigma * stdMove),
    max: currentPrice + numSigma * stdMove,
  };
}

/**
 * Find crossover price where a LONG CALL outperforms LONG STOCK.
 *
 * Only defined for the long-call vs long-stock comparison — for puts and
 * for short positions the curves either don't intersect in the meaningful
 * region or "outperform" needs a different definition. Returns null in
 * those cases so the UI can hide the crossover row instead of displaying
 * a misleading number.
 */
export function findCrossoverPrice(
  currentPrice, strikePrice, premium, sharesOwned, optionShares,
  isCall = true, stockPosition = 'long', optionPosition = 'long'
) {
  if (!isCall || stockPosition !== 'long' || optionPosition !== 'long') {
    return null;
  }

  const totalPremium = premium * optionShares;
  const breakeven = strikePrice + premium;

  // Above breakeven both legs have positive slope but the option has higher
  // leverage. Solve sharesOwned·(P − S0) = optionShares·(P − K) − totalPremium.
  const numerator = sharesOwned * currentPrice - optionShares * strikePrice - totalPremium;
  const denominator = sharesOwned - optionShares;

  // Guard against tiny denominators producing absurd extrapolated prices
  // (when sharesOwned ≈ optionShares the lines are nearly parallel).
  if (Math.abs(denominator) < 1e-6) return null;

  const crossover = numerator / denominator;
  return crossover > breakeven ? crossover : null;
}
