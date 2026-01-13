import React from 'react';
import { formatCurrency, formatPercent, formatPrice } from '../utils/statistics';
import TradeoffExplanation from './TradeoffExplanation';

/**
 * Risk/Reward analysis panel showing comprehensive statistics
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
  impliedVol,
  daysToExpiry,
  expectedMoveOverride,
  onExpectedMoveChange,
  impliedMovePercent,
}) {
  // Use override if set, otherwise use implied
  const expectedMove = expectedMoveOverride !== null ? expectedMoveOverride : impliedMovePercent;

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

  return (
    <div className="space-y-4">
      {/* Expected Move Control */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-purple-400 flex items-center gap-2">
            <span>🎯</span> Your Expected Move
          </h3>
          {expectedMoveOverride !== null && (
            <button
              onClick={() => onExpectedMoveChange(null)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Reset to IV
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          The market implies a <strong className="text-white">{impliedMovePercent.toFixed(1)}%</strong> move
          based on {impliedVol}% IV over {daysToExpiry} days. Adjust if you expect a different move:
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={Math.max(1, impliedMovePercent * 0.2)}
            max={impliedMovePercent * 3}
            step={0.5}
            value={expectedMove}
            onChange={(e) => onExpectedMoveChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
          />
          <div className="w-24 text-center">
            <span className={`text-lg font-bold ${
              expectedMove > impliedMovePercent * 1.2 ? 'text-yellow-400' :
              expectedMove < impliedMovePercent * 0.8 ? 'text-green-400' : 'text-blue-400'
            }`}>
              {expectedMove.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low ({(impliedMovePercent * 0.2).toFixed(0)}%)</span>
          <span>IV-Implied ({impliedMovePercent.toFixed(0)}%)</span>
          <span>High ({(impliedMovePercent * 3).toFixed(0)}%)</span>
        </div>
        {expectedMoveOverride !== null && expectedMoveOverride > impliedMovePercent * 1.2 && (
          <p className="text-xs text-yellow-400 mt-2">
            You expect larger moves than the market - options may offer an edge if you're right.
          </p>
        )}
        {expectedMoveOverride !== null && expectedMoveOverride < impliedMovePercent * 0.8 && (
          <p className="text-xs text-green-400 mt-2">
            You expect smaller moves than the market is pricing - stock may be the better choice.
          </p>
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
            <h4 className="text-sm text-green-400 mb-2">Stock</h4>
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
                <span className="text-red-400 ml-1">{formatCurrency(stats.stockMaxLoss)}</span>
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
            <h4 className="text-sm text-yellow-400 mb-2">Options</h4>
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
                <span className="text-red-400 ml-1">{formatCurrency(-totalPremiumPaid)}</span>
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
              Options have defined risk: max loss is premium paid ({formatCurrency(-totalPremiumPaid)})
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
            <h4 className="text-sm text-green-400 mb-2">Stock</h4>
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
            <h4 className="text-sm text-yellow-400 mb-2">Options</h4>
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
        impliedVol={impliedVol}
        daysToExpiry={daysToExpiry}
        expectedMove={expectedMoveOverride}
      />
    </div>
  );
}
