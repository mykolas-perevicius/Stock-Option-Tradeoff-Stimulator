import React, { useEffect, useMemo } from 'react';

/**
 * Volatility Controls Component
 * Always visible at the top - controls IV and Expected Move
 * These drive all probability calculations throughout the app
 */
export default function VolatilityControls({
  impliedVol,
  onImpliedVolChange,
  expectedMoveOverride,
  onExpectedMoveChange,
  impliedMovePercent,
  daysToExpiry,
  currentPrice,
}) {
  // Calculate slider bounds with proper minimums for edge cases
  const { minExpected, maxExpected, stepSize } = useMemo(() => {
    // Ensure minimum usable range regardless of implied move
    // Min: at least 0.5%, but cap at implied * 0.2 or 1% (whichever is smaller for reasonability)
    const min = Math.max(0.5, Math.min(impliedMovePercent * 0.2, 1));

    // Max: at least implied * 3, but ensure minimum range of 5% and absolute min of 10%
    const max = Math.max(impliedMovePercent * 3, min + 5, 10);

    // Adaptive step size based on range
    const range = max - min;
    const step = range < 5 ? 0.1
               : range < 20 ? 0.5
               : 1;

    return { minExpected: min, maxExpected: max, stepSize: step };
  }, [impliedMovePercent]);

  // Clamp expectedMoveOverride when bounds change
  useEffect(() => {
    if (expectedMoveOverride !== null) {
      const clamped = Math.max(minExpected, Math.min(expectedMoveOverride, maxExpected));
      // Only update if significantly different (avoid floating point issues)
      if (Math.abs(clamped - expectedMoveOverride) > 0.01) {
        onExpectedMoveChange(clamped);
      }
    }
  }, [minExpected, maxExpected, expectedMoveOverride, onExpectedMoveChange]);

  // Use override if set, otherwise use implied (clamped to valid range)
  const expectedMove = expectedMoveOverride !== null
    ? Math.max(minExpected, Math.min(expectedMoveOverride, maxExpected))
    : impliedMovePercent;

  // Calculate dollar move for display
  const dollarMove = currentPrice * (expectedMove / 100);

  const getIVLevel = (iv) => {
    if (iv < 20) return { text: 'Very Low', color: 'text-green-400' };
    if (iv < 30) return { text: 'Low', color: 'text-green-300' };
    if (iv < 45) return { text: 'Normal', color: 'text-blue-400' };
    if (iv < 60) return { text: 'High', color: 'text-yellow-400' };
    return { text: 'Very High', color: 'text-red-400' };
  };

  const ivLevel = getIVLevel(impliedVol);

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400 text-lg">📊</span>
        <h2 className="text-sm font-semibold text-purple-300">Volatility & Expected Move</h2>
        <span className="text-xs text-gray-500 ml-auto">These settings drive all probability calculations</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Implied Volatility Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">
              Implied Volatility (IV)
            </label>
            <span className={`text-xs px-2 py-0.5 rounded ${ivLevel.color} bg-gray-800`}>
              {ivLevel.text}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={150}
              value={impliedVol}
              onChange={(e) => onImpliedVolChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
            />
            <div className="w-20">
              <input
                type="number"
                value={impliedVol}
                onChange={(e) => onImpliedVolChange(Number(e.target.value) || 30)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                step="1"
                min="5"
                max="150"
              />
            </div>
            <span className="text-gray-400 text-sm w-4">%</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>5%</span>
            <span>30%</span>
            <span>60%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        {/* Expected Move Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">
              Expected Move ({daysToExpiry} days)
            </label>
            {expectedMoveOverride !== null && (
              <button
                onClick={() => onExpectedMoveChange(null)}
                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                Reset to IV
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={minExpected}
              max={maxExpected}
              step={stepSize}
              value={expectedMove}
              onChange={(e) => onExpectedMoveChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
            />
            <div className="w-28 text-right">
              <span className={`text-lg font-bold ${
                expectedMoveOverride !== null
                  ? expectedMove > impliedMovePercent * 1.2 ? 'text-yellow-400'
                    : expectedMove < impliedMovePercent * 0.8 ? 'text-green-400'
                    : 'text-purple-400'
                  : 'text-blue-400'
              }`}>
                ±{expectedMove.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>Low ({minExpected.toFixed(1)}%)</span>
            <span className="text-purple-400">IV: {impliedMovePercent.toFixed(1)}%</span>
            <span>High ({maxExpected.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-gray-400">IV-Implied Move: </span>
            <span className="text-blue-400 font-medium">±{impliedMovePercent.toFixed(1)}%</span>
            <span className="text-gray-500 ml-1">(±${(currentPrice * impliedMovePercent / 100).toFixed(2)})</span>
          </div>
          {expectedMoveOverride !== null && (
            <div>
              <span className="text-gray-400">Your Expectation: </span>
              <span className={`font-medium ${
                expectedMove > impliedMovePercent * 1.2 ? 'text-yellow-400' :
                expectedMove < impliedMovePercent * 0.8 ? 'text-green-400' : 'text-purple-400'
              }`}>
                ±{expectedMove.toFixed(1)}%
              </span>
              <span className="text-gray-500 ml-1">(±${dollarMove.toFixed(2)})</span>
            </div>
          )}
        </div>

        {/* Insight Messages */}
        {expectedMoveOverride !== null && (
          <div className="text-xs">
            {expectedMove > impliedMovePercent * 1.2 && (
              <span className="text-yellow-400">
                ⚡ You expect larger moves than the market — options may be underpriced
              </span>
            )}
            {expectedMove < impliedMovePercent * 0.8 && (
              <span className="text-green-400">
                📉 You expect smaller moves than the market — stock may be the better choice
              </span>
            )}
            {expectedMove >= impliedMovePercent * 0.8 && expectedMove <= impliedMovePercent * 1.2 && (
              <span className="text-purple-400">
                ≈ Your expectation aligns with market pricing
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
