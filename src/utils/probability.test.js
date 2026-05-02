import { describe, it, expect } from 'vitest';
import {
  probAbove,
  probBelow,
  probBetween,
  expectedPrice,
  priceStdDev,
  priceAtSigma,
  findCrossoverPrice,
  generatePriceRange,
} from './probability';

const close = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

describe('probAbove / probBelow', () => {
  it('sum to 1 for any threshold', () => {
    const S = 100, T = 0.5, r = 0.05, sigma = 0.3;
    const above = probAbove(110, S, T, r, sigma);
    const below = probBelow(110, S, T, r, sigma);
    expect(close(above + below, 1, 1e-6)).toBe(true);
  });

  it('ATM probAbove is roughly 0.5 with drift adjustment', () => {
    // With positive drift (r=5%), prob(future > current) should be slightly > 0.5
    expect(probAbove(100, 100, 1, 0.05, 0.2)).toBeGreaterThan(0.5);
  });

  it('returns 0 / 1 at extreme thresholds', () => {
    expect(probAbove(1e9, 100, 1, 0.05, 0.2)).toBeLessThan(0.001);
    expect(probAbove(0.01, 100, 1, 0.05, 0.2)).toBeGreaterThan(0.999);
  });
});

describe('probBetween', () => {
  it('matches probAbove(low) - probAbove(high)', () => {
    const S = 100, T = 0.5, r = 0.05, sigma = 0.25;
    const between = probBetween(90, 110, S, T, r, sigma);
    const expected = probAbove(90, S, T, r, sigma) - probAbove(110, S, T, r, sigma);
    expect(close(between, expected)).toBe(true);
  });

  it('is zero when low > high', () => {
    expect(probBetween(110, 90, 100, 1, 0.05, 0.2)).toBeLessThanOrEqual(0);
  });
});

describe('expectedPrice', () => {
  it('equals S * exp(r*T)', () => {
    const S = 100, T = 1, r = 0.05;
    expect(close(expectedPrice(S, T, r), S * Math.exp(r * T))).toBe(true);
  });
});

describe('priceStdDev', () => {
  it('scales with sqrt(T) and sigma', () => {
    expect(close(priceStdDev(100, 1, 0.2), 100 * 0.2)).toBe(true);
    expect(close(priceStdDev(100, 4, 0.2), 100 * 0.2 * 2)).toBe(true);
  });
});

describe('priceAtSigma', () => {
  it('+1σ > current price > -1σ', () => {
    const S = 100, T = 0.5, r = 0.05, sigma = 0.3;
    const upper = priceAtSigma(S, T, r, sigma, 1);
    const lower = priceAtSigma(S, T, r, sigma, -1);
    expect(upper).toBeGreaterThan(S);
    expect(lower).toBeLessThan(S);
  });

  it('0σ returns the median (~ expected price minus drift)', () => {
    // priceAtSigma(0σ) is the geometric median: S * exp((r - σ²/2) T)
    const S = 100, T = 1, r = 0.05, sigma = 0.2;
    const median = priceAtSigma(S, T, r, sigma, 0);
    const expected = S * Math.exp((r - 0.5 * sigma * sigma) * T);
    expect(close(median, expected, 0.01)).toBe(true);
  });
});

describe('findCrossoverPrice', () => {
  it('returns null for puts (regression: prior version returned wrong number)', () => {
    expect(findCrossoverPrice(100, 100, 5, 100, 1000, false, 'long', 'long')).toBeNull();
  });

  it('returns null for short stock position', () => {
    expect(findCrossoverPrice(100, 100, 5, 100, 1000, true, 'short', 'long')).toBeNull();
  });

  it('returns null for short option position', () => {
    expect(findCrossoverPrice(100, 100, 5, 100, 1000, true, 'long', 'short')).toBeNull();
  });

  it('returns a price > breakeven for the long-call vs long-stock case', () => {
    // S=100, K=100, premium=$5, $10k stock = 100 shares, $5k options = 1000 shares
    const result = findCrossoverPrice(100, 100, 5, 100, 1000, true, 'long', 'long');
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(105); // breakeven = K + premium
  });

  it('returns null when shares ≈ option shares (parallel lines)', () => {
    expect(findCrossoverPrice(100, 100, 5, 1000, 1000, true, 'long', 'long')).toBeNull();
  });
});

describe('generatePriceRange', () => {
  it('returns a range centered (in log space) on current price', () => {
    const range = generatePriceRange(100, 1, 0.2, 2);
    expect(range.min).toBeLessThan(100);
    expect(range.max).toBeGreaterThan(100);
  });

  it('respects positive bounds', () => {
    const range = generatePriceRange(100, 1, 1.5, 3);
    expect(range.min).toBeGreaterThan(0);
  });
});
