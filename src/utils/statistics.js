// Statistics calculations for risk/reward analysis
import { calculateVaR, calculateExpectedShortfall, priceForReturn, probAbove, findCrossoverPrice } from './probability';

/**
 * Calculate comprehensive statistics for stock vs options comparison
 * @param {Array} chartData - Array of price points with stockPL, optionPL, probability
 * @param {object} params - Calculation parameters
 */
export function calculateStats(chartData, params) {
  const {
    currentPrice,
    strikePrice,
    premium,
    investmentAmount,
    sharesOwned,
    optionShares,
    totalPremiumPaid,
    T,
    r,
    sigma,
    isCall = true,
  } = params;

  let stockEV = 0;
  let optionEV = 0;
  let stockLossProb = 0;
  let optionLossProb = 0;
  let stockWinSum = 0;
  let stockLossSum = 0;
  let optionWinSum = 0;
  let optionLossSum = 0;
  let stockWinProb = 0;
  let optionProfitProb = 0;

  const stockPLData = [];
  const optionPLData = [];

  chartData.forEach((p) => {
    const prob = p.probability / 100;

    stockEV += p.stockPL * prob;
    optionEV += p.optionPL * prob;

    stockPLData.push({ pl: p.stockPL, probability: prob });
    optionPLData.push({ pl: p.optionPL, probability: prob });

    if (p.stockPL < 0) {
      stockLossProb += prob;
      stockLossSum += p.stockPL * prob;
    } else {
      stockWinProb += prob;
      stockWinSum += p.stockPL * prob;
    }

    if (p.optionPL < 0) {
      optionLossProb += prob;
      optionLossSum += p.optionPL * prob;
    } else {
      optionProfitProb += prob;
      optionWinSum += p.optionPL * prob;
    }
  });

  // Calculate VaR and Expected Shortfall
  const stockVaR95 = calculateVaR(stockPLData, 0.95);
  const stockVaR99 = calculateVaR(stockPLData, 0.99);
  const optionVaR95 = calculateVaR(optionPLData, 0.95);
  const optionVaR99 = calculateVaR(optionPLData, 0.99);

  const stockES95 = calculateExpectedShortfall(stockPLData, 0.95);
  const optionES95 = calculateExpectedShortfall(optionPLData, 0.95);

  // Calculate return price targets
  const breakeven = strikePrice + premium;

  const stockPrice50Return = priceForReturn(currentPrice, investmentAmount, 0.5, true);
  const stockPrice100Return = priceForReturn(currentPrice, investmentAmount, 1.0, true);
  const stockPrice200Return = priceForReturn(currentPrice, investmentAmount, 2.0, true);

  const optionPrice50Return = priceForReturn(currentPrice, investmentAmount, 0.5, false, strikePrice, premium, Math.floor(optionShares / 100));
  const optionPrice100Return = priceForReturn(currentPrice, investmentAmount, 1.0, false, strikePrice, premium, Math.floor(optionShares / 100));
  const optionPrice200Return = priceForReturn(currentPrice, investmentAmount, 2.0, false, strikePrice, premium, Math.floor(optionShares / 100));

  // Calculate probabilities of reaching return targets
  const probStock50 = probAbove(stockPrice50Return, currentPrice, T, r, sigma) * 100;
  const probStock100 = probAbove(stockPrice100Return, currentPrice, T, r, sigma) * 100;
  const probOption50 = probAbove(optionPrice50Return, currentPrice, T, r, sigma) * 100;
  const probOption100 = probAbove(optionPrice100Return, currentPrice, T, r, sigma) * 100;

  // Find crossover price
  const crossoverPrice = findCrossoverPrice(currentPrice, strikePrice, premium, sharesOwned, optionShares);

  // Maximum losses
  const stockMaxLoss = -investmentAmount; // Stock goes to 0
  const optionMaxLoss = -totalPremiumPaid; // Premium paid

  return {
    // Expected Values
    stockEV: Math.round(stockEV),
    optionEV: Math.round(optionEV),
    evDifference: Math.round(optionEV - stockEV),

    // Win/Loss Probabilities
    stockLossProb: Math.round(stockLossProb * 100),
    stockWinProb: Math.round(stockWinProb * 100),
    optionLossProb: Math.round(optionLossProb * 100),
    optionProfitProb: Math.round(optionProfitProb * 100),

    // Average Win/Loss
    stockAvgWin: stockWinProb > 0 ? Math.round(stockWinSum / stockWinProb) : 0,
    stockAvgLoss: stockLossProb > 0 ? Math.round(stockLossSum / stockLossProb) : 0,
    optionAvgWin: optionProfitProb > 0 ? Math.round(optionWinSum / optionProfitProb) : 0,
    optionAvgLoss: optionLossProb > 0 ? Math.round(optionLossSum / optionLossProb) : 0,

    // Maximum Losses
    stockMaxLoss: Math.round(stockMaxLoss),
    optionMaxLoss: Math.round(optionMaxLoss),

    // Value at Risk
    stockVaR95: Math.round(stockVaR95),
    stockVaR99: Math.round(stockVaR99),
    optionVaR95: Math.round(optionVaR95),
    optionVaR99: Math.round(optionVaR99),

    // Expected Shortfall
    stockES95: Math.round(stockES95),
    optionES95: Math.round(optionES95),

    // Key Price Levels
    breakeven: Math.round(breakeven * 100) / 100,
    crossoverPrice: crossoverPrice ? Math.round(crossoverPrice * 100) / 100 : null,

    // Return Targets - Stock
    stockPrice50Return: Math.round(stockPrice50Return * 100) / 100,
    stockPrice100Return: Math.round(stockPrice100Return * 100) / 100,
    stockPrice200Return: Math.round(stockPrice200Return * 100) / 100,
    probStock50: Math.round(probStock50 * 10) / 10,
    probStock100: Math.round(probStock100 * 10) / 10,

    // Return Targets - Options
    optionPrice50Return: Math.round(optionPrice50Return * 100) / 100,
    optionPrice100Return: Math.round(optionPrice100Return * 100) / 100,
    optionPrice200Return: Math.round(optionPrice200Return * 100) / 100,
    probOption50: Math.round(probOption50 * 10) / 10,
    probOption100: Math.round(probOption100 * 10) / 10,

    // Risk-adjusted metrics
    stockSharpe: stockLossProb > 0 ? Math.round((stockEV / Math.abs(stockVaR95)) * 100) / 100 : 0,
    optionSharpe: optionLossProb > 0 ? Math.round((optionEV / Math.abs(optionVaR95)) * 100) / 100 : 0,
  };
}

/**
 * Generate chart data points for P&L visualization
 */
export function generateChartData(params) {
  const {
    currentPrice,
    strikePrice,
    minPrice,
    maxPrice,
    T,
    r,
    sigma,
    sharesOwned,
    optionShares,
    totalPremiumPaid,
    isCall = true,
    steps = 100,
  } = params;

  const priceStep = (maxPrice - minPrice) / steps;
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * priceStep;

    // Stock P&L - linear
    const stockPL = sharesOwned * (price - currentPrice);

    // Option P&L - nonlinear
    let optionIntrinsic;
    if (isCall) {
      optionIntrinsic = Math.max(0, price - strikePrice) * optionShares;
    } else {
      optionIntrinsic = Math.max(0, strikePrice - price) * optionShares;
    }
    const optionPL = optionIntrinsic - totalPremiumPaid;

    // Probability at this price
    const { stockProbability } = require('./probability');
    const prob = stockProbability(price, currentPrice, T, r, sigma) * priceStep;

    points.push({
      price: Math.round(price * 100) / 100,
      probability: Math.round(prob * 10000) / 100,
      stockPL: Math.round(stockPL),
      optionPL: Math.round(optionPL),
    });
  }

  return points;
}

/**
 * Format currency values for display
 */
export function formatCurrency(val, includeSign = true) {
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (!includeSign) return `$${formatted}`;
  if (val >= 0) return `+$${formatted}`;
  return `-$${formatted}`;
}

/**
 * Format percentage values
 */
export function formatPercent(val, decimals = 1) {
  return `${val.toFixed(decimals)}%`;
}

/**
 * Format price values
 */
export function formatPrice(val) {
  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert Expected Move percentage to Implied Volatility
 * Formula: IV = ExpectedMove% / sqrt(T)
 * @param {number} expectedMovePercent - Expected move as percentage (e.g., 8.5 for 8.5%)
 * @param {number} T - Time to expiry in years
 * @returns {number} Implied volatility as percentage (e.g., 25 for 25%)
 */
export function expectedMoveToIV(expectedMovePercent, T) {
  if (T <= 0) return 0;
  return expectedMovePercent / Math.sqrt(T);
}

/**
 * Convert Implied Volatility to Expected Move percentage
 * Formula: ExpectedMove% = IV * sqrt(T)
 * @param {number} ivPercent - IV as percentage (e.g., 25 for 25%)
 * @param {number} T - Time to expiry in years
 * @returns {number} Expected move as percentage (e.g., 8.5 for 8.5%)
 */
export function ivToExpectedMove(ivPercent, T) {
  return ivPercent * Math.sqrt(T);
}
