import React from 'react';

/**
 * AnalystTargets - Visual display of analyst price targets
 * Shows low, mean, median, high targets with current price position
 */
export default function AnalystTargets({ fundamentals }) {
  if (!fundamentals) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-48 mb-4"></div>
        <div className="h-32 bg-gray-800 rounded"></div>
      </div>
    );
  }

  const { currentPrice, targetLow, targetMean, targetMedian, targetHigh, numberOfAnalysts, recommendationKey, recommendationMean } = fundamentals;

  // Check if we have analyst data
  const hasTargets = targetLow && targetHigh && currentPrice;

  if (!hasTargets) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📈</span> Analyst Consensus
        </h3>
        <div className="text-center py-6 text-gray-500">
          No analyst coverage available for this stock
        </div>
      </div>
    );
  }

  // Calculate position of current price relative to targets
  const range = targetHigh - targetLow;
  const currentPosition = ((currentPrice - targetLow) / range) * 100;
  const meanPosition = targetMean ? ((targetMean - targetLow) / range) * 100 : 50;

  // Calculate implied moves
  const upsideToMean = targetMean ? ((targetMean - currentPrice) / currentPrice * 100).toFixed(1) : null;
  const upsideToHigh = ((targetHigh - currentPrice) / currentPrice * 100).toFixed(1);
  const downsideToLow = ((targetLow - currentPrice) / currentPrice * 100).toFixed(1);

  // Recommendation color
  const getRecColor = (rec) => {
    if (!rec) return 'text-gray-400';
    const lower = rec.toLowerCase();
    if (lower.includes('buy') || lower.includes('strong')) return 'text-green-400';
    if (lower.includes('sell') || lower.includes('under')) return 'text-red-400';
    return 'text-yellow-400';
  };

  // Format recommendation
  const formatRec = (rec) => {
    if (!rec) return 'N/A';
    return rec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📈</span> Analyst Consensus
        {numberOfAnalysts && (
          <span className="text-sm text-gray-500 font-normal">
            ({numberOfAnalysts} analyst{numberOfAnalysts !== 1 ? 's' : ''})
          </span>
        )}
      </h3>

      {/* Visual Target Range */}
      <div className="mb-6 px-2">
        <div className="relative h-16 mb-4">
          {/* Background bar */}
          <div className="absolute top-6 left-0 right-0 h-3 bg-gradient-to-r from-red-900 via-yellow-900 to-green-900 rounded-full" />

          {/* Target Low */}
          <div className="absolute left-0 top-0 flex flex-col items-center">
            <div className="text-xs text-red-400">Low</div>
            <div className="font-mono text-sm text-red-400">${targetLow.toFixed(0)}</div>
            <div className="w-0.5 h-4 bg-red-400 mt-1" />
          </div>

          {/* Target Mean */}
          {targetMean && (
            <div
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${Math.max(10, Math.min(90, meanPosition))}%` }}
            >
              <div className="text-xs text-yellow-400">Mean</div>
              <div className="font-mono text-sm text-yellow-400">${targetMean.toFixed(0)}</div>
              <div className="w-0.5 h-4 bg-yellow-400 mt-1" />
            </div>
          )}

          {/* Target High */}
          <div className="absolute right-0 top-0 flex flex-col items-center">
            <div className="text-xs text-green-400">High</div>
            <div className="font-mono text-sm text-green-400">${targetHigh.toFixed(0)}</div>
            <div className="w-0.5 h-4 bg-green-400 mt-1" />
          </div>

          {/* Current Price Marker */}
          <div
            className="absolute top-4 -translate-x-1/2"
            style={{ left: `${Math.max(5, Math.min(95, currentPosition))}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
              <div className="text-xs text-blue-400 mt-1 font-mono whitespace-nowrap">
                ${currentPrice.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">Current</div>
            </div>
          </div>
        </div>
      </div>

      {/* Implied Move Analysis */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Downside Risk</div>
          <div className={`text-lg font-bold ${parseFloat(downsideToLow) < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {downsideToLow}%
          </div>
          <div className="text-xs text-gray-600">to target low</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Expected Move</div>
          <div className={`text-lg font-bold ${parseFloat(upsideToMean) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {upsideToMean ? `${parseFloat(upsideToMean) >= 0 ? '+' : ''}${upsideToMean}%` : 'N/A'}
          </div>
          <div className="text-xs text-gray-600">to mean target</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Upside Potential</div>
          <div className={`text-lg font-bold ${parseFloat(upsideToHigh) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            +{upsideToHigh}%
          </div>
          <div className="text-xs text-gray-600">to target high</div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">Consensus Rating</div>
          <div className={`text-xl font-bold ${getRecColor(recommendationKey)}`}>
            {formatRec(recommendationKey)}
          </div>
        </div>
        {recommendationMean && (
          <div className="text-right">
            <div className="text-sm text-gray-400">Rating Score</div>
            <div className="text-xl font-bold text-white">
              {recommendationMean.toFixed(2)}
              <span className="text-sm text-gray-500 ml-1">/5</span>
            </div>
            <div className="text-xs text-gray-600">
              (1=Strong Buy, 5=Sell)
            </div>
          </div>
        )}
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded text-sm">
        <strong className="text-blue-400">Interpretation:</strong>{' '}
        {currentPosition < 30 ? (
          <span className="text-green-400">
            Current price is near analyst low targets, suggesting potential upside if fundamentals hold.
          </span>
        ) : currentPosition > 70 ? (
          <span className="text-yellow-400">
            Current price is near analyst high targets, limited upside based on consensus.
          </span>
        ) : (
          <span className="text-gray-300">
            Current price is within the middle of the analyst target range.
          </span>
        )}
      </div>
    </div>
  );
}
