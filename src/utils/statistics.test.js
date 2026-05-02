import { describe, it, expect } from 'vitest';
import {
  calculateStats,
  formatCurrency,
  formatPercent,
  formatPrice,
  expectedMoveToIV,
  ivToExpectedMove,
} from './statistics';

describe('formatCurrency', () => {
  it('shows + sign for positive', () => {
    expect(formatCurrency(1500)).toBe('+$1,500');
  });

  it('shows - sign for negative', () => {
    expect(formatCurrency(-2300)).toBe('-$2,300');
  });

  it('omits sign when requested', () => {
    expect(formatCurrency(1500, false)).toBe('$1,500');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });

  it('respects decimals override', () => {
    expect(formatPercent(12.345, 2)).toBe('12.35%');
  });
});

describe('formatPrice', () => {
  it('shows two decimals', () => {
    expect(formatPrice(100)).toBe('$100.00');
    expect(formatPrice(1234.5)).toBe('$1,234.50');
  });
});

describe('expectedMoveToIV / ivToExpectedMove are inverses', () => {
  it('round-trips', () => {
    const T = 30 / 365;
    const iv = 25;
    const em = ivToExpectedMove(iv, T);
    expect(Math.abs(expectedMoveToIV(em, T) - iv)).toBeLessThan(1e-9);
  });

  it('returns 0 IV at T=0', () => {
    expect(expectedMoveToIV(5, 0)).toBe(0);
  });
});

describe('calculateStats', () => {
  // Build a tiny chartData fixture covering a few price points with
  // probabilities summing to 100%. The relevant fields here are
  // stockPL/optionPL/probability — the stat function aggregates.
  const chartData = [
    { price: 80, stockPL: -2000, optionPL: -500, probability: 20 },
    { price: 100, stockPL: 0, optionPL: -500, probability: 50 },
    { price: 120, stockPL: 2000, optionPL: 1500, probability: 30 },
  ];

  const baseParams = {
    currentPrice: 100,
    strikePrice: 100,
    premium: 5,
    investmentAmount: 10000,
    sharesOwned: 100,
    optionShares: 1000,
    totalPremiumPaid: 5000,
    T: 30 / 365,
    r: 0.05,
    sigma: 0.25,
    isCall: true,
    stockPosition: 'long',
    optionPosition: 'long',
  };

  it('uses K + premium for call breakeven', () => {
    const stats = calculateStats(chartData, { ...baseParams, isCall: true });
    expect(stats.breakeven).toBe(105);
  });

  it('uses K - premium for put breakeven (regression test)', () => {
    // Bug: hardcoded K + premium gave 105 for puts when correct is 95.
    const stats = calculateStats(chartData, { ...baseParams, isCall: false });
    expect(stats.breakeven).toBe(95);
  });

  it('long stock max loss = -investmentAmount', () => {
    const stats = calculateStats(chartData, { ...baseParams, stockPosition: 'long' });
    expect(stats.stockMaxLoss).toBe(-10000);
  });

  it('short stock max loss is null (unlimited)', () => {
    const stats = calculateStats(chartData, { ...baseParams, stockPosition: 'short' });
    expect(stats.stockMaxLoss).toBeNull();
  });

  it('long option max loss = -totalPremiumPaid', () => {
    const stats = calculateStats(chartData, { ...baseParams, optionPosition: 'long' });
    expect(stats.optionMaxLoss).toBe(-5000);
  });

  it('short call max loss is null (unlimited)', () => {
    const stats = calculateStats(chartData, {
      ...baseParams,
      isCall: true,
      optionPosition: 'short',
    });
    expect(stats.optionMaxLoss).toBeNull();
  });

  it('short put max loss is bounded', () => {
    const stats = calculateStats(chartData, {
      ...baseParams,
      isCall: false,
      optionPosition: 'short',
    });
    // -(strike * optionShares) + totalPremiumPaid = -(100*1000) + 5000 = -95000
    expect(stats.optionMaxLoss).toBe(-95000);
  });

  it('crossover is null for puts', () => {
    const stats = calculateStats(chartData, { ...baseParams, isCall: false });
    expect(stats.crossoverPrice).toBeNull();
  });
});
