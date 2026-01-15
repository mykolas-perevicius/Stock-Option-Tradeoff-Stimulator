import React from 'react';
import { IV_METHODS } from '../../utils/volatilityCalculations';

/**
 * ExpectedMoveCalculator - Calculate expected price moves using different IV methods
 */
export default function ExpectedMoveCalculator({
  allVolatilities,
  daysToExpiry,
  onDaysChange,
  currentPrice,
}) {
  // Time in years
  const T = daysToExpiry / 365;

  // Calculate expected move for a given IV
  const calcExpectedMove = (iv) => {
    if (!iv || !currentPrice) return null;
    const sigma = iv / 100;
    const move = currentPrice * sigma * Math.sqrt(T);
    const movePercent = sigma * Math.sqrt(T) * 100;
    return { move, movePercent };
  };

  // Calculate confidence intervals
  // 68% = 1 sigma, 95% = 1.96 sigma, 99% = 2.58 sigma
  const calcConfidenceRange = (iv, confidence) => {
    if (!iv || !currentPrice) return null;
    const sigma = iv / 100;
    const multiplier =
      confidence === 68 ? 1 : confidence === 95 ? 1.96 : confidence === 99 ? 2.58 : 1;
    const move = currentPrice * sigma * Math.sqrt(T) * multiplier;
    return {
      low: currentPrice - move,
      high: currentPrice + move,
    };
  };

  // Methods to display in the calculator
  const displayMethods = ['market', 'hist30', 'garch', 'parkinson'];

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🎯</span> Expected Move Calculator
      </h3>

      {/* Days Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-400">Days to Expiry</label>
          <span className="text-lg font-bold text-purple-400">{daysToExpiry} days</span>
        </div>
        <input
          type="range"
          min="1"
          max="365"
          value={daysToExpiry}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 day</span>
          <span>1 week</span>
          <span>1 month</span>
          <span>3 months</span>
          <span>1 year</span>
        </div>
        {/* Quick select buttons */}
        <div className="flex gap-2 mt-3">
          {[7, 14, 30, 45, 60, 90, 180, 365].map((days) => (
            <button
              key={days}
              onClick={() => onDaysChange(days)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                daysToExpiry === days
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {days < 7 ? `${days}d` : days < 30 ? `${days / 7}w` : days < 365 ? `${Math.round(days / 30)}mo` : '1yr'}
            </button>
          ))}
        </div>
      </div>

      {/* Expected Move Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Method</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">Expected Move</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">68% Range</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">95% Range</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">99% Range</th>
            </tr>
          </thead>
          <tbody>
            {displayMethods.map((key) => {
              const method = IV_METHODS[key];
              const iv = allVolatilities[key];
              const expectedMove = calcExpectedMove(iv);
              const range68 = calcConfidenceRange(iv, 68);
              const range95 = calcConfidenceRange(iv, 95);
              const range99 = calcConfidenceRange(iv, 99);

              const isMarket = key === 'market';

              return (
                <tr
                  key={key}
                  className={`border-b border-gray-800 ${
                    isMarket ? 'bg-purple-900/20' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <td className="py-3 px-3">
                    <span className={isMarket ? 'font-semibold text-purple-300' : ''}>
                      {method?.name || key}
                    </span>
                    {iv && (
                      <span className="text-gray-500 text-xs ml-2">({iv.toFixed(1)}%)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {expectedMove ? (
                      <div>
                        <span className="font-mono font-medium text-yellow-400">
                          ±${expectedMove.move.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({expectedMove.movePercent.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {range68 ? (
                      <span className="text-green-400">
                        ${range68.low.toFixed(0)}-${range68.high.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {range95 ? (
                      <span className="text-blue-400">
                        ${range95.low.toFixed(0)}-${range95.high.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {range99 ? (
                      <span className="text-red-400">
                        ${range99.low.toFixed(0)}-${range99.high.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
        <p>
          <strong>Confidence Intervals:</strong>{' '}
          <span className="text-green-400">68%</span> = 1 std dev,{' '}
          <span className="text-blue-400">95%</span> = ~2 std dev,{' '}
          <span className="text-red-400">99%</span> = ~2.6 std dev
        </p>
        <p className="mt-1">
          Expected move assumes log-normal distribution and no drift adjustment.
        </p>
      </div>
    </div>
  );
}
