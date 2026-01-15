import React from 'react';

/**
 * CorrelationFactors - Market correlation and risk factors
 * Shows beta, sector info, and related metrics
 */
export default function CorrelationFactors({ fundamentals }) {
  if (!fundamentals) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const {
    beta,
    sector,
    industry,
    shortRatio,
    shortPercentOfFloat,
    heldPercentInsiders,
    heldPercentInstitutions,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    fiftyTwoWeekChange,
    currentPrice,
    dividendYield,
  } = fundamentals;

  // Calculate position in 52-week range
  const fiftyTwoWeekRange = fiftyTwoWeekHigh && fiftyTwoWeekLow
    ? ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100
    : null;

  // Format percentage
  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(1)}%`;
  };

  // Beta interpretation
  const getBetaInterpretation = (beta) => {
    if (!beta) return { text: 'Unknown', color: 'text-gray-400' };
    if (beta > 1.5) return { text: 'Very High Volatility', color: 'text-red-400' };
    if (beta > 1.2) return { text: 'Higher than Market', color: 'text-yellow-400' };
    if (beta > 0.8) return { text: 'Similar to Market', color: 'text-gray-300' };
    if (beta > 0.5) return { text: 'Lower than Market', color: 'text-blue-400' };
    return { text: 'Defensive Stock', color: 'text-green-400' };
  };

  const betaInterp = getBetaInterpretation(beta);

  // Short interest interpretation
  const getShortInterp = (shortRatio) => {
    if (!shortRatio) return { text: 'Unknown', color: 'text-gray-400' };
    if (shortRatio > 10) return { text: 'Heavily Shorted', color: 'text-red-400' };
    if (shortRatio > 5) return { text: 'High Short Interest', color: 'text-yellow-400' };
    if (shortRatio > 2) return { text: 'Moderate Short Interest', color: 'text-gray-300' };
    return { text: 'Low Short Interest', color: 'text-green-400' };
  };

  const shortInterp = getShortInterp(shortRatio);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🔄</span> Correlation & Risk Factors
      </h3>

      {/* Beta and Market Correlation */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Market Correlation</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Beta</span>
              <span className={`text-3xl font-bold ${
                beta > 1.2 ? 'text-red-400' : beta < 0.8 ? 'text-green-400' : 'text-white'
              }`}>
                {beta?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className={`text-sm ${betaInterp.color}`}>
              {betaInterp.text}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {beta && beta > 1
                ? `Moves ${((beta - 1) * 100).toFixed(0)}% more than S&P 500`
                : beta && beta < 1
                  ? `Moves ${((1 - beta) * 100).toFixed(0)}% less than S&P 500`
                  : 'Correlation with S&P 500'
              }
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Sector</div>
            <div className="text-white font-medium text-sm">
              {sector || 'N/A'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {industry || ''}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">52W Change</div>
            <div className={`text-xl font-bold ${
              fiftyTwoWeekChange > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {fiftyTwoWeekChange
                ? `${fiftyTwoWeekChange > 0 ? '+' : ''}${(fiftyTwoWeekChange * 100).toFixed(1)}%`
                : 'N/A'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 52-Week Position */}
      {fiftyTwoWeekRange !== null && (
        <div className="mb-6">
          <h4 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">52-Week Range</h4>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>${fiftyTwoWeekLow?.toFixed(2)}</span>
              <span>Current: ${currentPrice?.toFixed(2)}</span>
              <span>${fiftyTwoWeekHigh?.toFixed(2)}</span>
            </div>
            <div className="relative h-4 bg-gray-700 rounded-full">
              <div
                className="absolute h-full rounded-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-600"
                style={{ width: '100%', opacity: 0.3 }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"
                style={{ left: `calc(${Math.max(0, Math.min(100, fiftyTwoWeekRange))}% - 8px)` }}
              />
            </div>
            <div className="text-center mt-2 text-sm">
              <span className="text-gray-400">Position: </span>
              <span className={fiftyTwoWeekRange > 70 ? 'text-green-400' : fiftyTwoWeekRange < 30 ? 'text-red-400' : 'text-yellow-400'}>
                {fiftyTwoWeekRange.toFixed(0)}% of 52-week range
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ownership & Short Interest */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Ownership & Short Interest</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Institutional</div>
            <div className="text-lg font-bold text-white">
              {formatPercent(heldPercentInstitutions)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Insider</div>
            <div className="text-lg font-bold text-white">
              {formatPercent(heldPercentInsiders)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Short Ratio</div>
            <div className={`text-lg font-bold ${shortInterp.color}`}>
              {shortRatio?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-xs text-gray-600">days to cover</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Short % Float</div>
            <div className={`text-lg font-bold ${
              shortPercentOfFloat > 0.2 ? 'text-red-400' : shortPercentOfFloat > 0.1 ? 'text-yellow-400' : 'text-white'
            }`}>
              {formatPercent(shortPercentOfFloat)}
            </div>
          </div>
        </div>
      </div>

      {/* Dividend Info (if applicable) */}
      {dividendYield && dividendYield > 0 && (
        <div>
          <h4 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Income</h4>
          <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Dividend Yield</div>
              <div className="text-2xl font-bold text-green-400">
                {(dividendYield * 100).toFixed(2)}%
              </div>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </div>
      )}

      {/* Risk Summary */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Risk Summary</h4>
        <div className="space-y-2 text-sm">
          {beta && beta > 1.3 && (
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-gray-300">High beta stock - expect larger price swings</span>
            </div>
          )}
          {shortRatio && shortRatio > 5 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <span className="text-gray-300">Elevated short interest - potential squeeze or continued bearishness</span>
            </div>
          )}
          {fiftyTwoWeekRange && fiftyTwoWeekRange > 90 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <span className="text-gray-300">Near 52-week high - limited upside momentum</span>
            </div>
          )}
          {fiftyTwoWeekRange && fiftyTwoWeekRange < 10 && (
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-gray-300">Near 52-week low - investigate fundamentals</span>
            </div>
          )}
          {(!beta || (beta >= 0.8 && beta <= 1.2)) && (!shortRatio || shortRatio <= 5) && (
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">No significant risk flags detected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
