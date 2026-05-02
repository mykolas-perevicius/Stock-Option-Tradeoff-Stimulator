import { describe, it, expect } from 'vitest';
import {
  normalCDF,
  normalPDF,
  calcD1,
  calcD2,
  blackScholesCall,
  blackScholesPut,
  optionPrice,
  intrinsicValue,
  timeValue,
  breakevenPrice,
} from './blackScholes';

const close = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

describe('normalCDF', () => {
  it('returns 0.5 at zero', () => {
    expect(close(normalCDF(0), 0.5)).toBe(true);
  });

  it('matches known table values', () => {
    expect(close(normalCDF(1), 0.8413, 1e-3)).toBe(true);
    expect(close(normalCDF(-1), 0.1587, 1e-3)).toBe(true);
    expect(close(normalCDF(1.96), 0.975, 1e-3)).toBe(true);
  });

  it('approaches 0 and 1 at the tails', () => {
    expect(normalCDF(-10)).toBeLessThan(1e-6);
    expect(normalCDF(10)).toBeGreaterThan(1 - 1e-6);
  });
});

describe('normalPDF', () => {
  it('peaks at zero with value 1/sqrt(2π)', () => {
    expect(close(normalPDF(0), 1 / Math.sqrt(2 * Math.PI))).toBe(true);
  });

  it('is symmetric', () => {
    expect(close(normalPDF(1.5), normalPDF(-1.5))).toBe(true);
  });
});

describe('calcD1 / calcD2', () => {
  it('returns 0 for invalid inputs', () => {
    expect(calcD1(0, 100, 1, 0.05, 0.2)).toBe(0);
    expect(calcD1(100, 0, 1, 0.05, 0.2)).toBe(0);
    expect(calcD1(100, 100, 0, 0.05, 0.2)).toBe(0);
    expect(calcD1(100, 100, 1, 0.05, 0)).toBe(0);
    expect(calcD1(100, 100, -1, 0.05, 0.2)).toBe(0);
  });

  it('d2 = d1 - sigma*sqrt(T)', () => {
    const S = 100, K = 100, T = 0.5, r = 0.05, sigma = 0.2;
    const d1 = calcD1(S, K, T, r, sigma);
    const d2 = calcD2(S, K, T, r, sigma);
    expect(close(d1 - d2, sigma * Math.sqrt(T))).toBe(true);
  });
});

describe('blackScholesCall', () => {
  it('matches a textbook ATM example', () => {
    // S=100, K=100, T=1y, r=5%, σ=20% → call ≈ 10.45
    expect(close(blackScholesCall(100, 100, 1, 0.05, 0.2), 10.4506, 0.01)).toBe(true);
  });

  it('returns intrinsic value at expiration', () => {
    expect(blackScholesCall(120, 100, 0, 0.05, 0.2)).toBe(20);
    expect(blackScholesCall(80, 100, 0, 0.05, 0.2)).toBe(0);
  });

  it('returns intrinsic value when sigma is zero', () => {
    expect(blackScholesCall(120, 100, 1, 0, 0.2)).toBeGreaterThan(0);
    expect(blackScholesCall(120, 100, 1, 0.05, 0)).toBe(20);
  });

  it('is non-negative', () => {
    expect(blackScholesCall(50, 100, 1, 0.05, 0.2)).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for invalid prices', () => {
    expect(blackScholesCall(0, 100, 1, 0.05, 0.2)).toBe(0);
    expect(blackScholesCall(100, 0, 1, 0.05, 0.2)).toBe(0);
  });
});

describe('blackScholesPut', () => {
  it('matches put-call parity', () => {
    // C - P = S - K*e^(-rT)
    const S = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;
    const c = blackScholesCall(S, K, T, r, sigma);
    const p = blackScholesPut(S, K, T, r, sigma);
    const parity = S - K * Math.exp(-r * T);
    expect(close(c - p, parity, 0.01)).toBe(true);
  });

  it('returns intrinsic value at expiration', () => {
    expect(blackScholesPut(80, 100, 0, 0.05, 0.2)).toBe(20);
    expect(blackScholesPut(120, 100, 0, 0.05, 0.2)).toBe(0);
  });
});

describe('optionPrice', () => {
  it('dispatches to call/put based on isCall', () => {
    const c = blackScholesCall(100, 100, 1, 0.05, 0.2);
    const p = blackScholesPut(100, 100, 1, 0.05, 0.2);
    expect(optionPrice(100, 100, 1, 0.05, 0.2, true)).toBe(c);
    expect(optionPrice(100, 100, 1, 0.05, 0.2, false)).toBe(p);
  });
});

describe('intrinsicValue', () => {
  it('handles ITM and OTM for both call and put', () => {
    expect(intrinsicValue(120, 100, true)).toBe(20);
    expect(intrinsicValue(80, 100, true)).toBe(0);
    expect(intrinsicValue(80, 100, false)).toBe(20);
    expect(intrinsicValue(120, 100, false)).toBe(0);
  });
});

describe('timeValue', () => {
  it('is non-negative', () => {
    expect(timeValue(100, 100, 0.5, 0.05, 0.3, true)).toBeGreaterThan(0);
  });

  it('is zero at expiration', () => {
    expect(timeValue(120, 100, 0, 0.05, 0.2, true)).toBe(0);
  });
});

describe('breakevenPrice', () => {
  it('adds premium for calls, subtracts for puts', () => {
    expect(breakevenPrice(100, 5, true)).toBe(105);
    expect(breakevenPrice(100, 5, false)).toBe(95);
  });
});
