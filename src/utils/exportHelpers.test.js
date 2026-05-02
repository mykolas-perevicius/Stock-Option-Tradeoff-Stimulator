import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseURLParams } from './exportHelpers';

// Stub window.location.search via jsdom-style globals. parseURLParams reads
// `window.location.search`, so we substitute a Location-shaped object.
function setSearch(search) {
  globalThis.window = {
    ...(globalThis.window || {}),
    location: { search, origin: 'https://example.com', pathname: '/' },
  };
}

describe('parseURLParams', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('returns null when no `s` param present', () => {
    setSearch('');
    expect(parseURLParams()).toBeNull();
  });

  it('parses a clean v=2 share URL', () => {
    setSearch('?v=2&s=150&k=160&d=45&iv=28&r=4.5&amt=20000&type=put&sym=AAPL&sp=long&op=long');
    const p = parseURLParams();
    expect(p.currentPrice).toBe(150);
    expect(p.strikePrice).toBe(160);
    expect(p.daysToExpiry).toBe(45);
    expect(p.impliedVol).toBe(28);
    expect(p.riskFreeRate).toBe(4.5);
    expect(p.investmentAmount).toBe(20000);
    expect(p.isCall).toBe(false);
    expect(p.symbol).toBe('AAPL');
    expect(p.stockPosition).toBe('long');
    expect(p.optionPosition).toBe('long');
  });

  it('clamps negative price to floor (regression: hostile share)', () => {
    setSearch('?s=-100');
    expect(parseURLParams().currentPrice).toBe(0.01);
  });

  it('clamps absurdly high IV', () => {
    setSearch('?s=100&iv=99999');
    expect(parseURLParams().impliedVol).toBe(500);
  });

  it('clamps days-to-expiry to ten-year max', () => {
    setSearch('?s=100&d=99999');
    expect(parseURLParams().daysToExpiry).toBe(3650);
  });

  it('rejects NaN literally and falls back to default', () => {
    setSearch('?s=NaN');
    expect(parseURLParams().currentPrice).toBe(100);
  });

  it('strips non-allowed chars from symbol and caps length', () => {
    setSearch('?s=100&sym=<script>alert(1)</script>aaaaaaaaaaaaaaa');
    const sym = parseURLParams().symbol;
    expect(sym).toMatch(/^[A-Z0-9.\-^]+$/);
    expect(sym.length).toBeLessThanOrEqual(12);
  });

  it('returns null symbol for completely invalid input', () => {
    setSearch('?s=100&sym=!!!');
    expect(parseURLParams().symbol).toBeNull();
  });

  it('isCall defaults to true on missing/garbage type', () => {
    setSearch('?s=100');
    expect(parseURLParams().isCall).toBe(true);
    setSearch('?s=100&type=puuut');
    expect(parseURLParams().isCall).toBe(true);
  });

  it('rejects non-short for stockPosition / optionPosition', () => {
    setSearch('?s=100&sp=evil&op=evil');
    const p = parseURLParams();
    expect(p.stockPosition).toBe('long');
    expect(p.optionPosition).toBe('long');
  });

  it('clamps userExpectedMove to 0..200', () => {
    setSearch('?s=100&uem=500');
    expect(parseURLParams().userExpectedMove).toBe(200);
    setSearch('?s=100&uem=-5');
    expect(parseURLParams().userExpectedMove).toBe(0);
  });

  it('userExpectedMove is null when key absent', () => {
    setSearch('?s=100');
    expect(parseURLParams().userExpectedMove).toBeNull();
  });
});
