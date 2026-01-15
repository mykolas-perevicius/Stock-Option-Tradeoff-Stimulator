import React, { useState, useMemo } from 'react';
import { blackScholesCall, blackScholesPut } from '../../utils/blackScholes';

/**
 * OptionsChainTable - Displays options chain with dual IV comparison
 * Shows market prices vs theoretical prices based on user's IV prediction
 */
export default function OptionsChainTable({
  optionsData,
  underlyingPrice,
  userIV,
  marketIV,
  daysToExpiry,
  riskFreeRate = 0.05,
}) {
  const [showCalls, setShowCalls] = useState(true);
  const [showPuts, setShowPuts] = useState(true);
  const [strikeFilter, setStrikeFilter] = useState('atm'); // 'all', 'atm', 'itm', 'otm'

  // Time to expiry in years
  const T = daysToExpiry / 365;

  // Calculate theoretical prices using user's IV
  const enrichedOptions = useMemo(() => {
    if (!optionsData || !underlyingPrice) return { calls: [], puts: [] };

    const enrichCall = (call) => {
      const strike = call.strike;
      const marketPrice = call.lastPrice || ((call.bid || 0) + (call.ask || 0)) / 2;

      // Calculate theoretical price using user's IV
      const userTheoPrice = blackScholesCall(
        underlyingPrice,
        strike,
        T,
        riskFreeRate,
        userIV / 100
      );

      // Calculate theoretical price using market IV (for comparison)
      const marketTheoPrice = blackScholesCall(
        underlyingPrice,
        strike,
        T,
        riskFreeRate,
        marketIV / 100
      );

      // Difference between user's theo and market price
      const priceDiff = userTheoPrice - marketPrice;
      const priceDiffPercent = marketPrice > 0 ? (priceDiff / marketPrice) * 100 : 0;

      // Is this strike ITM, ATM, or OTM?
      const moneyness = strike < underlyingPrice * 0.99 ? 'itm' :
                        strike > underlyingPrice * 1.01 ? 'otm' : 'atm';

      return {
        ...call,
        marketPrice,
        userTheoPrice,
        marketTheoPrice,
        priceDiff,
        priceDiffPercent,
        moneyness,
      };
    };

    const enrichPut = (put) => {
      const strike = put.strike;
      const marketPrice = put.lastPrice || ((put.bid || 0) + (put.ask || 0)) / 2;

      const userTheoPrice = blackScholesPut(
        underlyingPrice,
        strike,
        T,
        riskFreeRate,
        userIV / 100
      );

      const marketTheoPrice = blackScholesPut(
        underlyingPrice,
        strike,
        T,
        riskFreeRate,
        marketIV / 100
      );

      const priceDiff = userTheoPrice - marketPrice;
      const priceDiffPercent = marketPrice > 0 ? (priceDiff / marketPrice) * 100 : 0;

      const moneyness = strike > underlyingPrice * 1.01 ? 'itm' :
                        strike < underlyingPrice * 0.99 ? 'otm' : 'atm';

      return {
        ...put,
        marketPrice,
        userTheoPrice,
        marketTheoPrice,
        priceDiff,
        priceDiffPercent,
        moneyness,
      };
    };

    return {
      calls: (optionsData.calls || []).map(enrichCall),
      puts: (optionsData.puts || []).map(enrichPut),
    };
  }, [optionsData, underlyingPrice, userIV, marketIV, T, riskFreeRate]);

  // Filter by moneyness
  const filteredOptions = useMemo(() => {
    const filterByMoneyness = (options) => {
      if (strikeFilter === 'all') return options;
      return options.filter(opt => opt.moneyness === strikeFilter);
    };

    // Sort by strike
    const sortByStrike = (options) => [...options].sort((a, b) => a.strike - b.strike);

    return {
      calls: sortByStrike(filterByMoneyness(enrichedOptions.calls)),
      puts: sortByStrike(filterByMoneyness(enrichedOptions.puts)),
    };
  }, [enrichedOptions, strikeFilter]);

  // Find ATM strike for highlighting
  const atmStrike = useMemo(() => {
    if (!optionsData?.calls?.length || !underlyingPrice) return null;
    const strikes = optionsData.calls.map(c => c.strike);
    return strikes.reduce((closest, strike) =>
      Math.abs(strike - underlyingPrice) < Math.abs(closest - underlyingPrice) ? strike : closest
    , strikes[0]);
  }, [optionsData, underlyingPrice]);

  // Summary stats
  const summary = useMemo(() => {
    const allCalls = filteredOptions.calls;
    const allPuts = filteredOptions.puts;

    const avgCallDiff = allCalls.length > 0
      ? allCalls.reduce((sum, c) => sum + c.priceDiff, 0) / allCalls.length
      : 0;
    const avgPutDiff = allPuts.length > 0
      ? allPuts.reduce((sum, p) => sum + p.priceDiff, 0) / allPuts.length
      : 0;

    return {
      avgCallDiff,
      avgPutDiff,
      overallView: userIV > marketIV ? 'bullish_vol' : userIV < marketIV ? 'bearish_vol' : 'neutral',
    };
  }, [filteredOptions, userIV, marketIV]);

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '-';
    return `$${price.toFixed(2)}`;
  };

  const formatDiff = (diff, percent) => {
    if (diff === null || diff === undefined || isNaN(diff)) return '-';
    const sign = diff >= 0 ? '+' : '';
    return `${sign}$${diff.toFixed(2)} (${sign}${percent.toFixed(1)}%)`;
  };

  const OptionRow = ({ option, type }) => {
    const isATM = option.strike === atmStrike;
    const isUnderpriced = option.priceDiff > 0.05; // User thinks it's worth more
    const isOverpriced = option.priceDiff < -0.05; // User thinks it's worth less

    return (
      <tr className={`
        border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors
        ${isATM ? 'bg-purple-900/20' : ''}
        ${isUnderpriced ? 'bg-green-900/10' : ''}
        ${isOverpriced ? 'bg-red-900/10' : ''}
      `}>
        <td className="px-3 py-2 text-center">
          <span className={`font-mono ${isATM ? 'text-purple-400 font-bold' : ''}`}>
            ${option.strike}
          </span>
          {isATM && <span className="ml-1 text-xs text-purple-400">ATM</span>}
        </td>
        <td className="px-3 py-2 text-right font-mono">
          {formatPrice(option.marketPrice)}
        </td>
        <td className="px-3 py-2 text-right font-mono text-purple-400">
          {formatPrice(option.userTheoPrice)}
        </td>
        <td className={`px-3 py-2 text-right font-mono text-sm ${
          option.priceDiff > 0.05 ? 'text-green-400' :
          option.priceDiff < -0.05 ? 'text-red-400' : 'text-gray-400'
        }`}>
          {formatDiff(option.priceDiff, option.priceDiffPercent)}
        </td>
        <td className="px-3 py-2 text-right text-gray-400 text-sm">
          {option.impliedVolatility ? `${option.impliedVolatility.toFixed(1)}%` : '-'}
        </td>
        <td className="px-3 py-2 text-right text-gray-500 text-sm">
          {option.openInterest?.toLocaleString() || '-'}
        </td>
      </tr>
    );
  };

  if (!optionsData) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-400">
        Loading options chain...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with IV comparison */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-gray-400 text-sm">Your IV:</span>
            <span className="ml-2 text-purple-400 font-bold">{userIV.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Market IV:</span>
            <span className="ml-2 text-white font-bold">{marketIV.toFixed(1)}%</span>
          </div>
          <div className={`px-3 py-1 rounded text-sm ${
            summary.overallView === 'bullish_vol' ? 'bg-green-900/30 text-green-400' :
            summary.overallView === 'bearish_vol' ? 'bg-red-900/30 text-red-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {summary.overallView === 'bullish_vol' ? 'Options appear UNDERPRICED' :
             summary.overallView === 'bearish_vol' ? 'Options appear OVERPRICED' :
             'Fair value'}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={strikeFilter}
            onChange={(e) => setStrikeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All Strikes</option>
            <option value="atm">ATM Only</option>
            <option value="itm">ITM Only</option>
            <option value="otm">OTM Only</option>
          </select>
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCalls(!showCalls)}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            showCalls ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Calls ({filteredOptions.calls.length})
        </button>
        <button
          onClick={() => setShowPuts(!showPuts)}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            showPuts ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Puts ({filteredOptions.puts.length})
        </button>
      </div>

      {/* Options Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calls Table */}
        {showCalls && (
          <div className="bg-gray-900/50 rounded-lg overflow-hidden">
            <div className="bg-green-900/30 px-4 py-2 border-b border-green-700/50">
              <h4 className="font-semibold text-green-400">CALLS</h4>
              {summary.avgCallDiff !== 0 && (
                <span className={`text-sm ml-2 ${summary.avgCallDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Avg diff: {summary.avgCallDiff > 0 ? '+' : ''}{summary.avgCallDiff.toFixed(2)}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                    <th className="px-3 py-2 text-center">Strike</th>
                    <th className="px-3 py-2 text-right">Market</th>
                    <th className="px-3 py-2 text-right">Your Theo</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2 text-right">IV</th>
                    <th className="px-3 py-2 text-right">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOptions.calls.slice(0, 15).map((call) => (
                    <OptionRow key={call.strike} option={call} type="call" />
                  ))}
                </tbody>
              </table>
              {filteredOptions.calls.length > 15 && (
                <div className="text-center py-2 text-gray-500 text-sm">
                  +{filteredOptions.calls.length - 15} more strikes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Puts Table */}
        {showPuts && (
          <div className="bg-gray-900/50 rounded-lg overflow-hidden">
            <div className="bg-red-900/30 px-4 py-2 border-b border-red-700/50">
              <h4 className="font-semibold text-red-400">PUTS</h4>
              {summary.avgPutDiff !== 0 && (
                <span className={`text-sm ml-2 ${summary.avgPutDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Avg diff: {summary.avgPutDiff > 0 ? '+' : ''}{summary.avgPutDiff.toFixed(2)}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                    <th className="px-3 py-2 text-center">Strike</th>
                    <th className="px-3 py-2 text-right">Market</th>
                    <th className="px-3 py-2 text-right">Your Theo</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2 text-right">IV</th>
                    <th className="px-3 py-2 text-right">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOptions.puts.slice(0, 15).map((put) => (
                    <OptionRow key={put.strike} option={put} type="put" />
                  ))}
                </tbody>
              </table>
              {filteredOptions.puts.length > 15 && (
                <div className="text-center py-2 text-gray-500 text-sm">
                  +{filteredOptions.puts.length - 15} more strikes
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insight box */}
      <div className={`p-4 rounded-lg border ${
        summary.overallView === 'bullish_vol'
          ? 'bg-green-900/20 border-green-500/30'
          : summary.overallView === 'bearish_vol'
          ? 'bg-red-900/20 border-red-500/30'
          : 'bg-gray-800/50 border-gray-700'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-xl">
            {summary.overallView === 'bullish_vol' ? '💡' :
             summary.overallView === 'bearish_vol' ? '⚠️' : '📊'}
          </span>
          <div>
            <p className="font-medium">
              {summary.overallView === 'bullish_vol'
                ? 'Options appear underpriced based on your IV prediction'
                : summary.overallView === 'bearish_vol'
                ? 'Options appear overpriced based on your IV prediction'
                : 'Options are fairly priced relative to your prediction'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {summary.overallView === 'bullish_vol'
                ? `Your IV (${userIV.toFixed(1)}%) is higher than market (${marketIV.toFixed(1)}%). Consider buying volatility through long straddles or strangles.`
                : summary.overallView === 'bearish_vol'
                ? `Your IV (${userIV.toFixed(1)}%) is lower than market (${marketIV.toFixed(1)}%). Consider selling premium through iron condors or credit spreads.`
                : `Your IV matches the market expectation. Look for directional plays or wait for better opportunities.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
