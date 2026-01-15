import React from 'react';
import IVMethodSelector from './IVMethodSelector';

/**
 * Volatility Controls Component (MARKET VIEW - Read-Only)
 *
 * Shows market-implied volatility and expected move from the options chain.
 * This is the "market's view" - what options are priced at.
 *
 * The user's expected move prediction is controlled separately in RiskRewardPanel.
 */
export default function VolatilityControls({
  marketIV,
  marketExpectedMove,
  userExpectedMove,
  userImpliedIV,
  daysToExpiry,
  currentPrice,
  pricingEdge,
  pricingEdgePercent,
  // IV Method props
  selectedIVMethod = 'market',
  onIVMethodChange,
  allVolatilities = {},
  isLoadingHistory = false,
  historyError = null,
}) {
  const getIVLevel = (iv) => {
    if (iv < 20) return { text: 'Very Low', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (iv < 30) return { text: 'Low', color: 'text-green-300', bg: 'bg-green-900/20' };
    if (iv < 45) return { text: 'Normal', color: 'text-blue-400', bg: 'bg-blue-900/30' };
    if (iv < 60) return { text: 'High', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    return { text: 'Very High', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const ivLevel = getIVLevel(marketIV);
  const isUsingCustomMove = userExpectedMove !== null;
  const effectiveUserMove = userExpectedMove ?? marketExpectedMove;

  // Calculate dollar moves
  const marketDollarMove = currentPrice * (marketExpectedMove / 100);
  const userDollarMove = currentPrice * (effectiveUserMove / 100);

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400 text-lg">📈</span>
        <h2 className="text-sm font-semibold text-blue-300">Market Implied Volatility</h2>
        <span className="text-xs text-gray-500 ml-auto">From options chain pricing</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market IV Display */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">Market IV</label>
            <span className={`text-xs px-2 py-0.5 rounded ${ivLevel.color} ${ivLevel.bg}`}>
              {ivLevel.text}
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {marketIV.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Annualized implied volatility from options prices
          </p>
        </div>

        {/* Market Expected Move Display */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">Market Expected Move</label>
            <span className="text-xs text-gray-500">{daysToExpiry} days</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            ±{marketExpectedMove.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ±${marketDollarMove.toFixed(2)} ({currentPrice.toFixed(2)} × {marketExpectedMove.toFixed(1)}%)
          </p>
        </div>

        {/* IV Method Selector */}
        {onIVMethodChange && (
          <div className="bg-gray-900/50 rounded-lg p-3">
            <IVMethodSelector
              selectedMethod={selectedIVMethod}
              onMethodChange={onIVMethodChange}
              volatilities={allVolatilities}
              isLoadingHistory={isLoadingHistory}
              historyError={historyError}
            />
          </div>
        )}
      </div>

      {/* Comparison with User's View (if different) */}
      {isUsingCustomMove && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Market View */}
            <div className="text-center p-2 bg-blue-900/20 rounded">
              <div className="text-xs text-gray-400 mb-1">MARKET SAYS</div>
              <div className="text-lg font-semibold text-blue-400">
                ±{marketExpectedMove.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">IV: {marketIV.toFixed(1)}%</div>
            </div>

            {/* Your View */}
            <div className="text-center p-2 bg-purple-900/20 rounded">
              <div className="text-xs text-gray-400 mb-1">YOU EXPECT</div>
              <div className={`text-lg font-semibold ${
                effectiveUserMove > marketExpectedMove * 1.1 ? 'text-yellow-400' :
                effectiveUserMove < marketExpectedMove * 0.9 ? 'text-green-400' : 'text-purple-400'
              }`}>
                ±{effectiveUserMove.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Your IV: {userImpliedIV.toFixed(1)}%</div>
            </div>

            {/* Pricing Edge */}
            <div className={`text-center p-2 rounded ${
              pricingEdge > 0 ? 'bg-green-900/20' : pricingEdge < 0 ? 'bg-red-900/20' : 'bg-gray-800/50'
            }`}>
              <div className="text-xs text-gray-400 mb-1">PRICING EDGE</div>
              <div className={`text-lg font-semibold ${
                pricingEdge > 0 ? 'text-green-400' : pricingEdge < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {pricingEdge >= 0 ? '+' : ''}{pricingEdge.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {pricingEdge > 0 ? 'Underpriced' : pricingEdge < 0 ? 'Overpriced' : 'Fair'}
                {' '}({pricingEdgePercent >= 0 ? '+' : ''}{pricingEdgePercent.toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Insight Message */}
          <div className="mt-3 text-sm text-center">
            {effectiveUserMove > marketExpectedMove * 1.2 && (
              <span className="text-yellow-400">
                ⚡ If you're right, options are UNDERPRICED — buying options has an edge
              </span>
            )}
            {effectiveUserMove < marketExpectedMove * 0.8 && (
              <span className="text-green-400">
                📉 If you're right, options are OVERPRICED — stock may be better
              </span>
            )}
            {effectiveUserMove >= marketExpectedMove * 0.8 && effectiveUserMove <= marketExpectedMove * 1.2 && (
              <span className="text-purple-400">
                ≈ Your view aligns with market — options are fairly priced for you
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
