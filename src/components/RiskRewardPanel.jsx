import React, { useMemo } from 'react';
import { formatCurrency, formatPercent, formatPrice, expectedMoveToIV } from '../utils/statistics';
import TradeoffExplanation from './TradeoffExplanation';

/**
 * Risk/Reward analysis panel showing comprehensive statistics
 * Includes the user's Expected Move slider (this is where users set their prediction)
 */
export default function RiskRewardPanel({
  stats,
  investmentAmount,
  totalPremiumPaid,
  currentPrice,
  strikePrice,
  premium,
  sharesOwned,
  optionShares,
  isCall,
  marketIV,
  daysToExpiry,
  userExpectedMove,
  onUserExpectedMoveChange,
  marketExpectedMove,
  userImpliedIV,
  pricingEdge,
  pricingEdgePercent,
  stockPosition = 'long',
  optionPosition = 'long',
}) {
  // Use user's move if set, otherwise use market-implied
  const effectiveMove = userExpectedMove !== null ? userExpectedMove : marketExpectedMove;

  // Calculate slider bounds with proper minimums
  const { minExpected, maxExpected, stepSize } = useMemo(() => {
    const min = Math.max(0.5, Math.min(marketExpectedMove * 0.2, 1));
    const max = Math.max(marketExpectedMove * 3, min + 5, 10);
    const range = max - min;
    const step = range < 5 ? 0.1 : range < 20 ? 0.5 : 1;
    return { minExpected: min, maxExpected: max, stepSize: step };
  }, [marketExpectedMove]);

  const StatBar = ({ label, value, maxValue, color, subtext }) => {
    const width = Math.min(100, Math.max(0, (Math.abs(value) / maxValue) * 100));
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">{label}</span>
          <span className={color}>{typeof value === 'number' ? formatPercent(value) : value}</span>
        </div>
        <div className="bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${color.includes('green') ? 'bg-green-500' : color.includes('red') ? 'bg-red-500' : 'bg-gray-500'}`}
            style={{ width: `${width}%` }}
          />
        </div>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
    );
  };

  const isUsingCustomMove = userExpectedMove !== null;

  return (
    <div className="space-y-4">
      {/* Expected Move Control (USER'S PREDICTION) */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-purple-400 flex items-center gap-2">
            <span>🎯</span> Your Expected Move Prediction
          </h3>
          {isUsingCustomMove && (
            <button
              onClick={() => onUserExpectedMoveChange(null)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Reset to Market
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Market expects <strong className="text-blue-400">±{marketExpectedMove.toFixed(1)}%</strong> move
          based on {marketIV.toFixed(1)}% IV over {daysToExpiry} days.
          {' '}Adjust if you disagree:
        </p>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min={minExpected}
            max={maxExpected}
            step={stepSize}
            value={effectiveMove}
            onChange={(e) => onUserExpectedMoveChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
          />
          <div className="w-28 text-center">
            <span className={`text-xl font-bold ${
              isUsingCustomMove
                ? effectiveMove > marketExpectedMove * 1.2 ? 'text-yellow-400'
                  : effectiveMove < marketExpectedMove * 0.8 ? 'text-green-400'
                  : 'text-purple-400'
                : 'text-blue-400'
            }`}>
              ±{effectiveMove.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low ({minExpected.toFixed(1)}%)</span>
          <span className="text-blue-400">Market: {marketExpectedMove.toFixed(1)}%</span>
          <span>High ({maxExpected.toFixed(0)}%)</span>
        </div>

        {/* Comparison Display when user has set a custom move */}
        {isUsingCustomMove && (
          <div className="mt-4 pt-3 border-t border-purple-800/50">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-900/30 rounded p-2">
                <div className="text-xs text-gray-400">Market Move</div>
                <div className="text-lg font-semibold text-blue-400">±{marketExpectedMove.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">IV: {marketIV.toFixed(1)}%</div>
              </div>
              <div className="bg-purple-900/30 rounded p-2">
                <div className="text-xs text-gray-400">Your Move</div>
                <div className={`text-lg font-semibold ${
                  effectiveMove > marketExpectedMove * 1.1 ? 'text-yellow-400' :
                  effectiveMove < marketExpectedMove * 0.9 ? 'text-green-400' : 'text-purple-400'
                }`}>
                  ±{effectiveMove.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Your IV: {userImpliedIV.toFixed(1)}%</div>
              </div>
              <div className={`rounded p-2 ${
                pricingEdge > 0.1 ? 'bg-green-900/30' : pricingEdge < -0.1 ? 'bg-red-900/30' : 'bg-gray-800/50'
              }`}>
                <div className="text-xs text-gray-400">Your Edge</div>
                <div className={`text-lg font-semibold ${
                  pricingEdge > 0.1 ? 'text-green-400' : pricingEdge < -0.1 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  ${Math.abs(pricingEdge).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {pricingEdge > 0.1 ? 'Underpriced' : pricingEdge < -0.1 ? 'Overpriced' : 'Fair'}
                </div>
              </div>
            </div>

            {/* Insight Messages */}
            <div className="mt-3 text-sm">
              {effectiveMove > marketExpectedMove * 1.2 && (
                <div className="p-2 bg-yellow-900/20 rounded text-yellow-400">
                  ⚡ <strong>You expect MORE volatility</strong> — If right, options are underpriced by ${pricingEdge.toFixed(2)} ({pricingEdgePercent.toFixed(1)}%)
                </div>
              )}
              {effectiveMove < marketExpectedMove * 0.8 && (
                <div className="p-2 bg-green-900/20 rounded text-green-400">
                  📉 <strong>You expect LESS volatility</strong> — Stock may be better than paying for expensive options
                </div>
              )}
              {effectiveMove >= marketExpectedMove * 0.8 && effectiveMove <= marketExpectedMove * 1.2 && (
                <div className="p-2 bg-purple-900/20 rounded text-purple-400">
                  ≈ <strong>Your view aligns with market</strong> — Options are fairly priced for your expectations
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Downside Panel */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-4 text-red-400 flex items-center gap-2">
            <span>📉</span> Downside Risk
          </h3>

          {/* Stock Downside */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h4 className="text-sm text-green-400 mb-2">
              {stockPosition === 'long' ? 'Long Stock' : 'Short Stock'}
            </h4>
            {stockPosition === 'short' && (
              <p className="text-xs text-red-400 mb-2">⚠️ Short stock has unlimited loss potential</p>
            )}
            <StatBar
              label="Probability of Loss"
              value={stats.stockLossProb}
              maxValue={100}
              color="text-red-400"
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Avg Loss:</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.stockAvgLoss)}</span>
              </div>
              <div>
                <span className="text-gray-500">Max Loss:</span>
                <span className={`ml-1 ${stats.stockMaxLoss === null ? 'text-red-500 font-bold' : 'text-red-400'}`}>
                  {stats.stockMaxLoss === null ? 'UNLIMITED' : formatCurrency(stats.stockMaxLoss)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">VaR (95%):</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.stockVaR95)}</span>
              </div>
              <div>
                <span className="text-gray-500">VaR (99%):</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.stockVaR99)}</span>
              </div>
            </div>
          </div>

          {/* Options Downside */}
          <div>
            <h4 className="text-sm text-yellow-400 mb-2">
              {optionPosition === 'long' ? 'Long' : 'Short'} {isCall ? 'Call' : 'Put'}
            </h4>
            <StatBar
              label="Probability of Loss"
              value={stats.optionLossProb}
              maxValue={100}
              color="text-red-400"
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Avg Loss:</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.optionAvgLoss)}</span>
              </div>
              <div>
                <span className="text-gray-500">Max Loss:</span>
                <span className={`ml-1 ${stats.optionMaxLoss === null ? 'text-red-500 font-bold' : 'text-red-400'}`}>
                  {stats.optionMaxLoss === null ? 'UNLIMITED' : formatCurrency(stats.optionMaxLoss)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">VaR (95%):</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.optionVaR95)}</span>
              </div>
              <div>
                <span className="text-gray-500">VaR (99%):</span>
                <span className="text-red-400 ml-1">{formatCurrency(stats.optionVaR99)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {optionPosition === 'long' ? (
                <>Options have defined risk: max loss is premium paid ({formatCurrency(-totalPremiumPaid)})</>
              ) : isCall ? (
                <span className="text-red-400">⚠️ Short calls have UNLIMITED loss potential</span>
              ) : (
                <>Short put max loss: assignment at strike ({formatCurrency(stats.optionMaxLoss)})</>
              )}
            </p>
          </div>
        </div>

        {/* Upside Panel */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-md font-semibold mb-4 text-green-400 flex items-center gap-2">
            <span>📈</span> Upside Potential
          </h3>

          {/* Stock Upside */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h4 className="text-sm text-green-400 mb-2">
              {stockPosition === 'long' ? 'Long Stock' : 'Short Stock'}
            </h4>
            <StatBar
              label="Probability of Profit"
              value={stats.stockWinProb}
              maxValue={100}
              color="text-green-400"
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Avg Gain:</span>
                <span className="text-green-400 ml-1">{formatCurrency(stats.stockAvgWin)}</span>
              </div>
              <div>
                <span className="text-gray-500">50% Return @:</span>
                <span className="text-green-400 ml-1">{formatPrice(stats.stockPrice50Return)}</span>
              </div>
              <div>
                <span className="text-gray-500">P(+50%):</span>
                <span className="text-green-400 ml-1">{formatPercent(stats.probStock50)}</span>
              </div>
              <div>
                <span className="text-gray-500">P(+100%):</span>
                <span className="text-green-400 ml-1">{formatPercent(stats.probStock100)}</span>
              </div>
            </div>
          </div>

          {/* Options Upside */}
          <div>
            <h4 className="text-sm text-yellow-400 mb-2">
              {optionPosition === 'long' ? 'Long' : 'Short'} {isCall ? 'Call' : 'Put'}
            </h4>
            <StatBar
              label="Probability of Profit"
              value={stats.optionProfitProb}
              maxValue={100}
              color="text-green-400"
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Avg Gain:</span>
                <span className="text-green-400 ml-1">{formatCurrency(stats.optionAvgWin)}</span>
              </div>
              <div>
                <span className="text-gray-500">100% Return @:</span>
                <span className="text-green-400 ml-1">{formatPrice(stats.optionPrice100Return)}</span>
              </div>
              <div>
                <span className="text-gray-500">P(+50%):</span>
                <span className="text-green-400 ml-1">{formatPercent(stats.probOption50)}</span>
              </div>
              <div>
                <span className="text-gray-500">P(+100%):</span>
                <span className="text-green-400 ml-1">{formatPercent(stats.probOption100)}</span>
              </div>
            </div>
            {stats.crossoverPrice && (
              <p className="text-xs text-gray-500 mt-2">
                Options outperform stock above {formatPrice(stats.crossoverPrice)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expected Value Summary */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Expected Value Comparison</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Stock EV</p>
            <p className={`text-2xl font-bold ${stats.stockEV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.stockEV)}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Option EV</p>
            <p className={`text-2xl font-bold ${stats.optionEV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.optionEV)}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">EV Difference</p>
            <p className={`text-2xl font-bold ${stats.evDifference >= 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
              {formatCurrency(stats.evDifference)}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Breakeven</p>
            <p className="text-2xl font-bold text-orange-400">
              {formatPrice(stats.breakeven)}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Risk-Adjusted Statistics */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>📊</span> Risk-Adjusted Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Metrics */}
          <div className="bg-gray-800/50 rounded p-3">
            <h4 className="text-sm font-medium text-green-400 mb-3">
              {stockPosition === 'long' ? 'Long Stock' : 'Short Stock'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Sharpe:</span>
                <span className={`ml-1 font-medium ${stats.stockSharpe > 0.5 ? 'text-green-400' : stats.stockSharpe > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.stockSharpe?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Sortino:</span>
                <span className={`ml-1 font-medium ${stats.stockSortino > 1 ? 'text-green-400' : stats.stockSortino > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.stockSortino === 999 ? '∞' : stats.stockSortino?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Kelly %:</span>
                <span className={`ml-1 font-medium ${stats.stockKelly > 20 ? 'text-green-400' : stats.stockKelly > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.stockKelly}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Omega:</span>
                <span className={`ml-1 font-medium ${stats.stockOmega > 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.stockOmega === 999 ? '∞' : stats.stockOmega?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Risk/Reward:</span>
                <span className={`ml-1 font-medium ${stats.stockRiskReward > 2 ? 'text-green-400' : stats.stockRiskReward > 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.stockRiskReward?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Calmar:</span>
                <span className={`ml-1 font-medium ${stats.stockCalmar > 0.5 ? 'text-green-400' : stats.stockCalmar > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.stockCalmar?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Option Metrics */}
          <div className="bg-gray-800/50 rounded p-3">
            <h4 className="text-sm font-medium text-yellow-400 mb-3">
              {optionPosition === 'long' ? 'Long' : 'Short'} {isCall ? 'Call' : 'Put'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Sharpe:</span>
                <span className={`ml-1 font-medium ${stats.optionSharpe > 0.5 ? 'text-green-400' : stats.optionSharpe > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.optionSharpe?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Sortino:</span>
                <span className={`ml-1 font-medium ${stats.optionSortino > 1 ? 'text-green-400' : stats.optionSortino > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.optionSortino === 999 ? '∞' : stats.optionSortino?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Kelly %:</span>
                <span className={`ml-1 font-medium ${stats.optionKelly > 20 ? 'text-green-400' : stats.optionKelly > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.optionKelly}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Omega:</span>
                <span className={`ml-1 font-medium ${stats.optionOmega > 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.optionOmega === 999 ? '∞' : stats.optionOmega?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Risk/Reward:</span>
                <span className={`ml-1 font-medium ${stats.optionRiskReward > 2 ? 'text-green-400' : stats.optionRiskReward > 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.optionRiskReward?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Calmar:</span>
                <span className={`ml-1 font-medium ${stats.optionCalmar > 0.5 ? 'text-green-400' : stats.optionCalmar > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.optionCalmar?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Explanations */}
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500">
          <details className="cursor-pointer">
            <summary className="font-medium text-gray-400 hover:text-gray-300">What do these metrics mean?</summary>
            <div className="mt-2 space-y-1 pl-2">
              <p><strong className="text-gray-400">Sharpe:</strong> Return per unit of risk (higher = better risk-adjusted return)</p>
              <p><strong className="text-gray-400">Sortino:</strong> Like Sharpe but only penalizes downside risk (higher = better)</p>
              <p><strong className="text-gray-400">Kelly %:</strong> Optimal position size as % of portfolio (0-100%, negative = don't trade)</p>
              <p><strong className="text-gray-400">Omega:</strong> Ratio of gains to losses (greater than 1 = profitable on average)</p>
              <p><strong className="text-gray-400">Risk/Reward:</strong> Average win / average loss (higher = better)</p>
              <p><strong className="text-gray-400">Calmar:</strong> Return / max drawdown (higher = better recovery potential)</p>
            </div>
          </details>
        </div>
      </div>

      {/* Detailed Tradeoff Explanation */}
      <TradeoffExplanation
        stats={stats}
        currentPrice={currentPrice}
        strikePrice={strikePrice}
        premium={premium}
        investmentAmount={investmentAmount}
        totalPremiumPaid={totalPremiumPaid}
        sharesOwned={sharesOwned}
        optionShares={optionShares}
        isCall={isCall}
        impliedVol={marketIV}
        daysToExpiry={daysToExpiry}
        expectedMove={userExpectedMove}
      />
    </div>
  );
}
