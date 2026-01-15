import React, { useMemo, useState } from 'react';
import { blackScholesCall, blackScholesPut } from '../../utils/blackScholes';

/**
 * ScenarioComparison - Compare P&L outcomes under different price scenarios
 * Shows how positions would perform at expiry under both market IV and user's IV
 */
export default function ScenarioComparison({
  underlyingPrice,
  userIV,
  marketIV,
  daysToExpiry,
  riskFreeRate = 0.05,
}) {
  const [selectedStrategy, setSelectedStrategy] = useState('longCall');
  const [customStrike, setCustomStrike] = useState(Math.round(underlyingPrice));

  const T = daysToExpiry / 365;
  const userSigma = userIV / 100;
  const marketSigma = marketIV / 100;

  // Round strike to nearest 5
  const atmStrike = Math.round(underlyingPrice / 5) * 5;

  // Strategy definitions
  const strategyOptions = [
    { id: 'longCall', name: 'Long Call', description: 'Buy ATM call' },
    { id: 'longPut', name: 'Long Put', description: 'Buy ATM put' },
    { id: 'longStraddle', name: 'Long Straddle', description: 'Buy ATM call + put' },
    { id: 'shortStraddle', name: 'Short Straddle', description: 'Sell ATM call + put' },
    { id: 'customCall', name: 'Custom Strike Call', description: 'Long call at custom strike' },
  ];

  // Generate price scenarios (% moves from current price)
  const scenarios = useMemo(() => {
    const moves = [-15, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 15];
    return moves.map(movePercent => ({
      movePercent,
      price: underlyingPrice * (1 + movePercent / 100),
    }));
  }, [underlyingPrice]);

  // Calculate P&L for each scenario
  const scenarioResults = useMemo(() => {
    const strike = selectedStrategy === 'customCall' ? customStrike : atmStrike;

    // Calculate entry prices using MARKET IV (what you'd actually pay)
    const marketCallPrice = blackScholesCall(underlyingPrice, strike, T, riskFreeRate, marketSigma);
    const marketPutPrice = blackScholesPut(underlyingPrice, strike, T, riskFreeRate, marketSigma);

    // Calculate entry prices using USER's IV (theoretical "fair" value)
    const userCallPrice = blackScholesCall(underlyingPrice, strike, T, riskFreeRate, userSigma);
    const userPutPrice = blackScholesPut(underlyingPrice, strike, T, riskFreeRate, userSigma);

    // Entry costs
    const getEntryCost = (iv) => {
      const callPrice = iv === 'market' ? marketCallPrice : userCallPrice;
      const putPrice = iv === 'market' ? marketPutPrice : userPutPrice;

      switch (selectedStrategy) {
        case 'longCall':
        case 'customCall':
          return callPrice * 100;
        case 'longPut':
          return putPrice * 100;
        case 'longStraddle':
          return (callPrice + putPrice) * 100;
        case 'shortStraddle':
          return -(callPrice + putPrice) * 100; // Credit
        default:
          return 0;
      }
    };

    const marketEntryCost = getEntryCost('market');
    const userEntryCost = getEntryCost('user');
    const costDifference = userEntryCost - marketEntryCost;

    return scenarios.map(scenario => {
      const { price, movePercent } = scenario;

      // Calculate intrinsic value at expiry
      const callIntrinsic = Math.max(0, price - strike);
      const putIntrinsic = Math.max(0, strike - price);

      // P&L at expiry (intrinsic - entry cost)
      const getExpiryPL = (entryCost) => {
        switch (selectedStrategy) {
          case 'longCall':
          case 'customCall':
            return (callIntrinsic * 100) - entryCost;
          case 'longPut':
            return (putIntrinsic * 100) - entryCost;
          case 'longStraddle':
            return ((callIntrinsic + putIntrinsic) * 100) - entryCost;
          case 'shortStraddle':
            return -((callIntrinsic + putIntrinsic) * 100) - entryCost;
          default:
            return 0;
        }
      };

      const marketPL = getExpiryPL(marketEntryCost);
      const userPL = getExpiryPL(userEntryCost);
      const plDifference = userPL - marketPL;

      return {
        movePercent,
        price,
        marketPL,
        userPL,
        plDifference,
      };
    });
  }, [scenarios, selectedStrategy, customStrike, atmStrike, underlyingPrice, T, riskFreeRate, marketSigma, userSigma]);

  // Summary stats
  const summary = useMemo(() => {
    const maxMarketProfit = Math.max(...scenarioResults.map(s => s.marketPL));
    const maxMarketLoss = Math.min(...scenarioResults.map(s => s.marketPL));
    const avgDiff = scenarioResults.reduce((sum, s) => sum + s.plDifference, 0) / scenarioResults.length;

    // Find breakeven points
    const breakevens = [];
    for (let i = 1; i < scenarioResults.length; i++) {
      const prev = scenarioResults[i - 1];
      const curr = scenarioResults[i];
      if ((prev.marketPL < 0 && curr.marketPL >= 0) || (prev.marketPL >= 0 && curr.marketPL < 0)) {
        // Linear interpolation
        const ratio = Math.abs(prev.marketPL) / (Math.abs(prev.marketPL) + Math.abs(curr.marketPL));
        const breakeven = prev.movePercent + ratio * (curr.movePercent - prev.movePercent);
        breakevens.push(breakeven);
      }
    }

    return {
      maxProfit: maxMarketProfit,
      maxLoss: maxMarketLoss,
      avgDiff,
      breakevens,
      ivImpact: userIV > marketIV ? 'underpriced' : userIV < marketIV ? 'overpriced' : 'fair',
    };
  }, [scenarioResults, userIV, marketIV]);

  const formatPL = (pl) => {
    const sign = pl >= 0 ? '+' : '';
    return `${sign}$${pl.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📊</span> Scenario Analysis
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Compare P&L at different price points at expiry
          </p>
        </div>

        {/* Strategy selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          >
            {strategyOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>

          {selectedStrategy === 'customCall' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Strike:</span>
              <input
                type="number"
                value={customStrike}
                onChange={(e) => setCustomStrike(Number(e.target.value))}
                className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Max Profit</div>
          <div className="text-xl font-bold text-green-400">{formatPL(summary.maxProfit)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Max Loss</div>
          <div className="text-xl font-bold text-red-400">{formatPL(summary.maxLoss)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Avg IV Impact</div>
          <div className={`text-xl font-bold ${summary.avgDiff > 0 ? 'text-green-400' : summary.avgDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {formatPL(summary.avgDiff)}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Breakeven</div>
          <div className="text-xl font-bold text-purple-400">
            {summary.breakevens.length > 0
              ? summary.breakevens.map(b => `${b > 0 ? '+' : ''}${b.toFixed(1)}%`).join(' / ')
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Scenario table */}
      <div className="bg-gray-900/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Price Move</th>
                <th className="px-4 py-3 text-right">Price at Expiry</th>
                <th className="px-4 py-3 text-right">P&L (Market IV)</th>
                <th className="px-4 py-3 text-right">P&L (Your IV)</th>
                <th className="px-4 py-3 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {scenarioResults.map((scenario) => {
                const isATM = Math.abs(scenario.movePercent) < 0.1;
                const isProfitable = scenario.marketPL >= 0;

                return (
                  <tr
                    key={scenario.movePercent}
                    className={`border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors
                      ${isATM ? 'bg-purple-900/20' : ''}
                    `}
                  >
                    <td className={`px-4 py-3 font-mono ${
                      scenario.movePercent > 0 ? 'text-green-400' :
                      scenario.movePercent < 0 ? 'text-red-400' : 'text-purple-400'
                    }`}>
                      {scenario.movePercent > 0 ? '+' : ''}{scenario.movePercent}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${scenario.price.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      isProfitable ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPL(scenario.marketPL)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      scenario.userPL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPL(scenario.userPL)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${
                      scenario.plDifference > 0 ? 'text-green-400' :
                      scenario.plDifference < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {formatPL(scenario.plDifference)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interpretation */}
      <div className={`p-4 rounded-lg border ${
        summary.ivImpact === 'underpriced'
          ? 'bg-green-900/20 border-green-500/30'
          : summary.ivImpact === 'overpriced'
          ? 'bg-red-900/20 border-red-500/30'
          : 'bg-gray-800/50 border-gray-700'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {summary.ivImpact === 'underpriced' ? '💡' :
             summary.ivImpact === 'overpriced' ? '⚠️' : '📊'}
          </span>
          <div>
            <h4 className="font-semibold">
              {summary.ivImpact === 'underpriced'
                ? 'Position appears underpriced based on your IV'
                : summary.ivImpact === 'overpriced'
                ? 'Position appears overpriced based on your IV'
                : 'Position is fairly priced'}
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              {summary.ivImpact === 'underpriced'
                ? `If your IV prediction (${userIV.toFixed(1)}%) is correct, you're getting this position at a discount. The average P&L improvement is ${formatPL(summary.avgDiff)} vs market pricing.`
                : summary.ivImpact === 'overpriced'
                ? `If your IV prediction (${userIV.toFixed(1)}%) is correct, you're overpaying for this position. Consider selling premium instead or waiting for better pricing.`
                : `Your IV prediction aligns with market expectations. Focus on directional conviction or other factors.`}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500">
        <p><strong>P&L (Market IV):</strong> What you'd actually pay/receive based on current market prices</p>
        <p><strong>P&L (Your IV):</strong> Theoretical P&L if options were priced using your IV prediction</p>
        <p><strong>Difference:</strong> The edge you capture if your IV prediction is correct</p>
      </div>
    </div>
  );
}
