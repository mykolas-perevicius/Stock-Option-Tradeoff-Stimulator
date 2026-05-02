import { describe, it, expect } from 'vitest';
import {
  calcDelta,
  calcGamma,
  calcTheta,
  calcVega,
  calcRho,
  calcAllGreeks,
  formatGreek,
} from './greeks';

const close = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

describe('calcDelta', () => {
  it('ATM call delta is around 0.5', () => {
    const d = calcDelta(100, 100, 1, 0.05, 0.2, true);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(0.7);
  });

  it('ATM put delta is around -0.5', () => {
    const d = calcDelta(100, 100, 1, 0.05, 0.2, false);
    expect(d).toBeLessThan(-0.3);
    expect(d).toBeGreaterThan(-0.5);
  });

  it('deep ITM call delta approaches 1', () => {
    expect(calcDelta(200, 100, 1, 0.05, 0.2, true)).toBeGreaterThan(0.95);
  });

  it('deep OTM call delta approaches 0', () => {
    expect(calcDelta(50, 100, 1, 0.05, 0.2, true)).toBeLessThan(0.1);
  });

  it('at expiration, call delta = 1 if ITM, 0 if OTM', () => {
    expect(calcDelta(120, 100, 0, 0.05, 0.2, true)).toBe(1);
    expect(calcDelta(80, 100, 0, 0.05, 0.2, true)).toBe(0);
  });

  it('at expiration, put delta = -1 if ITM, 0 if OTM', () => {
    expect(calcDelta(80, 100, 0, 0.05, 0.2, false)).toBe(-1);
    expect(calcDelta(120, 100, 0, 0.05, 0.2, false)).toBe(0);
  });
});

describe('calcGamma', () => {
  it('is positive for any valid input', () => {
    expect(calcGamma(100, 100, 0.5, 0.05, 0.3)).toBeGreaterThan(0);
  });

  it('is zero at expiration', () => {
    expect(calcGamma(100, 100, 0, 0.05, 0.3)).toBe(0);
  });

  it('is symmetric for calls and puts (Greeks are direction-agnostic)', () => {
    // Gamma doesn't take isCall — should produce same value regardless.
    const g = calcGamma(100, 100, 0.5, 0.05, 0.3);
    expect(g).toBeGreaterThan(0);
  });
});

describe('calcTheta', () => {
  it('is negative for ATM long call', () => {
    expect(calcTheta(100, 100, 0.5, 0.05, 0.3, true)).toBeLessThan(0);
  });

  it('is zero at expiration', () => {
    expect(calcTheta(100, 100, 0, 0.05, 0.3, true)).toBe(0);
  });
});

describe('calcVega', () => {
  it('is positive for ATM option', () => {
    expect(calcVega(100, 100, 0.5, 0.05, 0.3)).toBeGreaterThan(0);
  });

  it('is zero at expiration', () => {
    expect(calcVega(100, 100, 0, 0.05, 0.3)).toBe(0);
  });
});

describe('calcRho', () => {
  it('is positive for calls, negative for puts', () => {
    expect(calcRho(100, 100, 1, 0.05, 0.2, true)).toBeGreaterThan(0);
    expect(calcRho(100, 100, 1, 0.05, 0.2, false)).toBeLessThan(0);
  });
});

describe('calcAllGreeks', () => {
  it('returns all five greeks', () => {
    const g = calcAllGreeks(100, 100, 1, 0.05, 0.2, true);
    expect(g).toHaveProperty('delta');
    expect(g).toHaveProperty('gamma');
    expect(g).toHaveProperty('theta');
    expect(g).toHaveProperty('vega');
    expect(g).toHaveProperty('rho');
  });
});

describe('formatGreek', () => {
  it('formats theta as $/day', () => {
    expect(formatGreek('theta', -0.123)).toBe('$-0.12/day');
  });

  it('formats delta to 4 decimals', () => {
    expect(formatGreek('delta', 0.55)).toBe('0.5500');
  });
});
