// Greeks calculations for options
import { normalCDF, normalPDF, calcD1, calcD2 } from './blackScholes';

/**
 * Calculate Delta - rate of change of option price with respect to stock price
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free interest rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {boolean} isCall - True for call, false for put
 * @returns {number} Delta value (-1 to 1)
 */
export function calcDelta(S, K, T, r, sigma, isCall = true) {
  if (T <= 0 || sigma <= 0) {
    // At expiration, delta is 1 if ITM, 0 if OTM
    if (isCall) return S > K ? 1 : 0;
    return S < K ? -1 : 0;
  }

  const d1 = calcD1(S, K, T, r, sigma);
  return isCall ? normalCDF(d1) : normalCDF(d1) - 1;
}

/**
 * Calculate Gamma - rate of change of delta with respect to stock price
 * Same for both calls and puts
 * @returns {number} Gamma value (always positive)
 */
export function calcGamma(S, K, T, r, sigma) {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;

  const d1 = calcD1(S, K, T, r, sigma);
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

/**
 * Calculate Theta - rate of change of option price with respect to time
 * Returns daily theta (negative for long options)
 * @returns {number} Theta value (typically negative)
 */
export function calcTheta(S, K, T, r, sigma, isCall = true) {
  if (T <= 0 || sigma <= 0) return 0;

  const d1 = calcD1(S, K, T, r, sigma);
  const d2 = calcD2(S, K, T, r, sigma);
  const sqrtT = Math.sqrt(T);

  // First term: time decay of option value
  const term1 = -(S * normalPDF(d1) * sigma) / (2 * sqrtT);

  if (isCall) {
    // Call theta
    const term2 = -r * K * Math.exp(-r * T) * normalCDF(d2);
    return (term1 + term2) / 365; // Per day
  } else {
    // Put theta
    const term2 = r * K * Math.exp(-r * T) * normalCDF(-d2);
    return (term1 + term2) / 365; // Per day
  }
}

/**
 * Calculate Vega - rate of change of option price with respect to volatility
 * Same for both calls and puts
 * Returns vega per 1% change in IV
 * @returns {number} Vega value (always positive for long options)
 */
export function calcVega(S, K, T, r, sigma) {
  if (T <= 0 || sigma <= 0) return 0;

  const d1 = calcD1(S, K, T, r, sigma);
  // Vega per 1% IV change (divide by 100)
  return (S * Math.sqrt(T) * normalPDF(d1)) / 100;
}

/**
 * Calculate Rho - rate of change of option price with respect to interest rate
 * Returns rho per 1% change in rate
 * @returns {number} Rho value
 */
export function calcRho(S, K, T, r, sigma, isCall = true) {
  if (T <= 0 || sigma <= 0) return 0;

  const d2 = calcD2(S, K, T, r, sigma);

  if (isCall) {
    // Call rho per 1% rate change
    return (K * T * Math.exp(-r * T) * normalCDF(d2)) / 100;
  } else {
    // Put rho per 1% rate change
    return (-K * T * Math.exp(-r * T) * normalCDF(-d2)) / 100;
  }
}

/**
 * Calculate all Greeks at once
 * @returns {object} Object containing all Greeks
 */
export function calcAllGreeks(S, K, T, r, sigma, isCall = true) {
  return {
    delta: calcDelta(S, K, T, r, sigma, isCall),
    gamma: calcGamma(S, K, T, r, sigma),
    theta: calcTheta(S, K, T, r, sigma, isCall),
    vega: calcVega(S, K, T, r, sigma),
    rho: calcRho(S, K, T, r, sigma, isCall),
  };
}

/**
 * Format Greek value for display
 */
export function formatGreek(name, value) {
  switch (name) {
    case 'delta':
      return value.toFixed(4);
    case 'gamma':
      return value.toFixed(4);
    case 'theta':
      return `$${value.toFixed(2)}/day`;
    case 'vega':
      return `$${value.toFixed(2)}/1%`;
    case 'rho':
      return `$${value.toFixed(2)}/1%`;
    default:
      return value.toFixed(4);
  }
}

/**
 * Get Greek description for tooltips
 */
export function getGreekDescription(name) {
  const descriptions = {
    delta: 'Measures how much the option price changes for a $1 move in the stock. Call deltas range from 0 to 1, put deltas from -1 to 0.',
    gamma: 'Measures how fast delta changes as the stock price moves. Higher gamma means delta changes more rapidly.',
    theta: 'Time decay - how much value the option loses each day. Usually negative for long options.',
    vega: 'Sensitivity to implied volatility. Shows price change for a 1% change in IV.',
    rho: 'Sensitivity to interest rates. Shows price change for a 1% change in the risk-free rate.',
  };
  return descriptions[name] || '';
}
