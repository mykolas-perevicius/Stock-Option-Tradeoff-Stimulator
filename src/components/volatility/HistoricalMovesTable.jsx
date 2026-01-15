import React, { useMemo } from 'react';

/**
 * HistoricalMovesTable - Analyze actual historical price moves
 */
export default function HistoricalMovesTable({ historicalData, daysToExpiry }) {
  // Analyze historical moves for the given period
  const analysis = useMemo(() => {
    if (!historicalData?.closePrices || historicalData.closePrices.length < daysToExpiry + 10) {
      return null;
    }

    const prices = historicalData.closePrices;
    const moves = [];

    // Calculate all moves for the given period
    for (let i = daysToExpiry; i < prices.length; i++) {
      const startPrice = prices[i - daysToExpiry];
      const endPrice = prices[i];
      if (startPrice > 0 && endPrice > 0) {
        const movePercent = ((endPrice - startPrice) / startPrice) * 100;
        moves.push({
          movePercent,
          absMovePercent: Math.abs(movePercent),
        });
      }
    }

    if (moves.length === 0) return null;

    // Sort for percentile calculations
    const sortedAbsMoves = [...moves.map((m) => m.absMovePercent)].sort((a, b) => a - b);

    // Calculate statistics
    const average = moves.reduce((sum, m) => sum + m.absMovePercent, 0) / moves.length;
    const median = sortedAbsMoves[Math.floor(sortedAbsMoves.length / 2)];

    // Percentiles
    const percentile = (arr, p) => {
      const index = Math.floor((p / 100) * arr.length);
      return arr[Math.min(index, arr.length - 1)];
    };

    // Distribution buckets
    const buckets = [
      { label: '0-2%', min: 0, max: 2, count: 0 },
      { label: '2-5%', min: 2, max: 5, count: 0 },
      { label: '5-10%', min: 5, max: 10, count: 0 },
      { label: '10-15%', min: 10, max: 15, count: 0 },
      { label: '15-20%', min: 15, max: 20, count: 0 },
      { label: '20%+', min: 20, max: Infinity, count: 0 },
    ];

    moves.forEach((m) => {
      const bucket = buckets.find((b) => m.absMovePercent >= b.min && m.absMovePercent < b.max);
      if (bucket) bucket.count++;
    });

    // Threshold counts
    const thresholds = [5, 10, 15, 20].map((threshold) => ({
      threshold,
      count: moves.filter((m) => m.absMovePercent >= threshold).length,
      percent: (moves.filter((m) => m.absMovePercent >= threshold).length / moves.length) * 100,
    }));

    return {
      totalPeriods: moves.length,
      average,
      median,
      percentile75: percentile(sortedAbsMoves, 75),
      percentile90: percentile(sortedAbsMoves, 90),
      percentile95: percentile(sortedAbsMoves, 95),
      percentile99: percentile(sortedAbsMoves, 99),
      maxMove: Math.max(...sortedAbsMoves),
      minMove: Math.min(...sortedAbsMoves),
      buckets,
      thresholds,
      upMoves: moves.filter((m) => m.movePercent > 0).length,
      downMoves: moves.filter((m) => m.movePercent < 0).length,
    };
  }, [historicalData, daysToExpiry]);

  if (!analysis) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Historical Move Analysis
        </h3>
        <div className="text-center py-8 text-gray-500">
          Not enough historical data for {daysToExpiry}-day analysis.
          Try a shorter period or different symbol.
        </div>
      </div>
    );
  }

  // Calculate max bucket for bar scaling
  const maxBucketCount = Math.max(...analysis.buckets.map((b) => b.count));

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Historical Move Analysis ({daysToExpiry}-day periods)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Statistics */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Summary Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Sample Size</span>
              <span className="font-mono text-white">{analysis.totalPeriods} periods</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Average Move</span>
              <span className="font-mono text-yellow-400">±{analysis.average.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Median Move</span>
              <span className="font-mono text-white">±{analysis.median.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">75th Percentile</span>
              <span className="font-mono text-white">±{analysis.percentile75.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">95th Percentile</span>
              <span className="font-mono text-orange-400">±{analysis.percentile95.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Max Move</span>
              <span className="font-mono text-red-400">±{analysis.maxMove.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Direction</span>
              <span className="text-sm">
                <span className="text-green-400">{analysis.upMoves} up</span>
                {' / '}
                <span className="text-red-400">{analysis.downMoves} down</span>
              </span>
            </div>
          </div>

          {/* Threshold Analysis */}
          <h4 className="text-sm font-medium text-gray-400 mt-4 mb-3">Large Move Frequency</h4>
          <div className="space-y-2 text-sm">
            {analysis.thresholds.map((t) => (
              <div key={t.threshold} className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Moves ≥{t.threshold}%</span>
                <span className="font-mono">
                  <span className="text-white">{t.count}</span>
                  <span className="text-gray-500"> ({t.percent.toFixed(1)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Move Distribution</h4>
          <div className="space-y-2">
            {analysis.buckets.map((bucket) => {
              const percentage = (bucket.count / analysis.totalPeriods) * 100;
              const barWidth = maxBucketCount > 0 ? (bucket.count / maxBucketCount) * 100 : 0;

              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16">{bucket.label}</span>
                  <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-end px-2"
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs text-white font-medium">{bucket.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Insight */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded text-sm">
            <p className="text-gray-300">
              <strong className="text-purple-400">Key Insight:</strong> In {daysToExpiry}-day periods,
              the stock moved more than <span className="text-yellow-400">±{analysis.average.toFixed(1)}%</span> on
              average, with 95% of moves staying under <span className="text-orange-400">±{analysis.percentile95.toFixed(1)}%</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
