import React, { useMemo } from 'react';

/**
 * IVRankGauge - Visual display of IV rank and percentile
 */
export default function IVRankGauge({ currentIV, historicalIVs }) {
  // Calculate IV Rank: (Current - Min) / (Max - Min) * 100
  const ivRank = useMemo(() => {
    if (!historicalIVs || historicalIVs.length === 0 || !currentIV) return null;
    const validIVs = historicalIVs.filter((iv) => iv > 0);
    if (validIVs.length === 0) return null;

    const min = Math.min(...validIVs);
    const max = Math.max(...validIVs);

    if (max === min) return 50;
    return ((currentIV - min) / (max - min)) * 100;
  }, [currentIV, historicalIVs]);

  // Calculate IV Percentile: % of days IV was lower than current
  const ivPercentile = useMemo(() => {
    if (!historicalIVs || historicalIVs.length === 0 || !currentIV) return null;
    const validIVs = historicalIVs.filter((iv) => iv > 0);
    if (validIVs.length === 0) return null;

    const daysBelow = validIVs.filter((iv) => iv < currentIV).length;
    return (daysBelow / validIVs.length) * 100;
  }, [currentIV, historicalIVs]);

  // Get min/max from historical data
  const { minIV, maxIV, avgIV } = useMemo(() => {
    if (!historicalIVs || historicalIVs.length === 0) {
      return { minIV: 0, maxIV: 100, avgIV: 50 };
    }
    const validIVs = historicalIVs.filter((iv) => iv > 0);
    return {
      minIV: Math.min(...validIVs),
      maxIV: Math.max(...validIVs),
      avgIV: validIVs.reduce((a, b) => a + b, 0) / validIVs.length,
    };
  }, [historicalIVs]);

  // Determine color based on IV rank
  const getColor = (rank) => {
    if (rank === null) return 'text-gray-500';
    if (rank < 25) return 'text-green-400';
    if (rank < 50) return 'text-yellow-400';
    if (rank < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  // Interpretation text
  const getInterpretation = (rank, percentile) => {
    if (rank === null) return 'No historical data available';
    if (rank < 20) return 'IV is very low - options may be cheap';
    if (rank < 40) return 'IV is below average - options relatively cheap';
    if (rank < 60) return 'IV is around average';
    if (rank < 80) return 'IV is above average - options relatively expensive';
    return 'IV is very high - options may be expensive';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> IV Rank & Percentile
      </h3>

      {/* Main Gauge Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold mb-2">
          <span className={getColor(ivRank)}>
            {currentIV ? `${currentIV.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="text-gray-500 text-sm">Current Market IV</div>
      </div>

      {/* Visual Bar */}
      <div className="mb-6">
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, #22C55E, #EAB308, #F97316, #EF4444)',
            }}
          />
          {/* Position marker */}
          {ivRank !== null && (
            <div
              className="absolute top-0 h-full w-1 bg-white shadow-lg"
              style={{ left: `${Math.min(100, Math.max(0, ivRank))}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                {ivRank?.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low</span>
          <span>Average</span>
          <span>High</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-gray-400">IV Rank</span>
          <span className={`font-mono font-medium ${getColor(ivRank)}`}>
            {ivRank !== null ? `${ivRank.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-gray-400">IV Percentile</span>
          <span className={`font-mono font-medium ${getColor(ivPercentile)}`}>
            {ivPercentile !== null ? `${ivPercentile.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-gray-400">52-Week Range</span>
          <span className="font-mono text-sm">
            <span className="text-green-400">{minIV.toFixed(1)}%</span>
            <span className="text-gray-500"> - </span>
            <span className="text-red-400">{maxIV.toFixed(1)}%</span>
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400">Average</span>
          <span className="font-mono text-white">{avgIV.toFixed(1)}%</span>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          <strong className={getColor(ivRank)}>Interpretation:</strong>{' '}
          {getInterpretation(ivRank, ivPercentile)}
        </p>
      </div>

      {/* Explanation */}
      <details className="mt-3 text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-400">What do these mean?</summary>
        <div className="mt-2 space-y-1">
          <p>
            <strong>IV Rank:</strong> Where IV sits relative to its 52-week high/low range.
            0% = at 52-week low, 100% = at 52-week high.
          </p>
          <p>
            <strong>IV Percentile:</strong> Percentage of time IV was lower than current.
            Higher = more expensive options historically.
          </p>
        </div>
      </details>
    </div>
  );
}
