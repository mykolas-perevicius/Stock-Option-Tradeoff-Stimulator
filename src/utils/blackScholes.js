// Black-Scholes option pricing model utilities

/**
 * Standard normal cumulative distribution function (CDF)
 * Approximation using Abramowitz and Stegun formula
 */
export function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal probability density function (PDF)
 */
export function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 parameter for Black-Scholes
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free interest rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 */
export function calcD1(S, K, T, r, sigma) {
  if (T <= 0 || sigma <= 0) return 0;
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 parameter for Black-Scholes
 */
export function calcD2(S, K, T, r, sigma) {
  return calcD1(S, K, T, r, sigma) - sigma * Math.sqrt(T);
}

/**
 * Black-Scholes Call Option Price
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free interest rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @returns {number} Call option price
 */
export function blackScholesCall(S, K, T, r, sigma) {
  if (T <= 0) return Math.max(0, S - K);
  if (sigma <= 0) return Math.max(0, S - K);

  const d1 = calcD1(S, K, T, r, sigma);
  const d2 = d1 - sigma * Math.sqrt(T);

  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

/**
 * Black-Scholes Put Option Price
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration in years
 * @param {number} r - Risk-free interest rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @returns {number} Put option price
 */
export function blackScholesPut(S, K, T, r, sigma) {
  if (T <= 0) return Math.max(0, K - S);
  if (sigma <= 0) return Math.max(0, K - S);

  const d1 = calcD1(S, K, T, r, sigma);
  const d2 = d1 - sigma * Math.sqrt(T);

  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

/**
 * Calculate option price (call or put)
 */
export function optionPrice(S, K, T, r, sigma, isCall = true) {
  return isCall ? blackScholesCall(S, K, T, r, sigma) : blackScholesPut(S, K, T, r, sigma);
}

/**
 * Calculate intrinsic value
 */
export function intrinsicValue(S, K, isCall = true) {
  return isCall ? Math.max(0, S - K) : Math.max(0, K - S);
}

/**
 * Calculate time value
 */
export function timeValue(S, K, T, r, sigma, isCall = true) {
  const price = optionPrice(S, K, T, r, sigma, isCall);
  const intrinsic = intrinsicValue(S, K, isCall);
  return Math.max(0, price - intrinsic);
}

/**
 * Calculate breakeven price
 */
export function breakevenPrice(K, premium, isCall = true) {
  return isCall ? K + premium : K - premium;
}
