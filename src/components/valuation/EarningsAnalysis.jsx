import React, { useMemo } from 'react';

/**
 * EarningsAnalysis - Historical earnings moves and upcoming earnings
 * Shows past earnings surprises and stock reactions
 */
export default function EarningsAnalysis({ earnings, historicalData, currentIV }) {
  // Calculate historical earnings moves from price data
  const earningsMoves = useMemo(() => {
    if (!earnings?.earningsHistory || !historicalData?.ohlcData) {
      return [];
    }

    const moves = [];
    const priceData = historicalData.ohlcData;

    // For each earnings date, find the price move around that date
    for (const earning of earnings.earningsHistory.slice(0, 8)) {
      if (!earning.date) continue;

      try {
        const earningsDate = new Date(earning.date);
        if (isNaN(earningsDate.getTime())) continue;

        // Find the trading day before and after earnings
        const beforeIdx = priceData.findIndex((d) => {
          const date = new Date(d.date);
          return date >= earningsDate;
        });

        if (beforeIdx > 0 && beforeIdx < priceData.length - 1) {
          const beforePrice = priceData[beforeIdx - 1].close;
          const afterPrice = priceData[beforeIdx].close;
          const move = ((afterPrice - beforePrice) / beforePrice) * 100;

          moves.push({
            date: earningsDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            epsEstimate: earning.epsEstimate,
            epsActual: earning.epsActual,
            surprise: earning.surprise,
            priceMove: move,
          });
        }
      } catch {
        // Skip invalid dates
      }
    }

    return moves;
  }, [earnings, historicalData]);

  // Calculate average absolute move
  const avgMove = useMemo(() => {
    if (earningsMoves.length === 0) return null;
    const absSum = earningsMoves.reduce((sum, m) => sum + Math.abs(m.priceMove), 0);
    return absSum / earningsMoves.length;
  }, [earningsMoves]);

  // Calculate IV-implied move for comparison
  const ivImpliedMove = currentIV ? currentIV * Math.sqrt(1 / 365) : null;

  // Format next earnings date
  const formatNextEarnings = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return `${date.toLocaleDateString()} (Past)`;
      if (diffDays === 0) return 'Today!';
      if (diffDays === 1) return 'Tomorrow!';
      if (diffDays <= 7) return `${diffDays} days (${date.toLocaleDateString()})`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const nextEarningsFormatted = formatNextEarnings(earnings?.nextEarningsDate);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚡</span> Earnings Analysis
      </h3>

      {/* Next Earnings Alert */}
      {nextEarningsFormatted && (
        <div className="mb-4 p-3 bg-purple-900/40 border border-purple-500/40 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-400">Next Earnings Report</div>
              <div className="text-xl font-bold text-white">{nextEarningsFormatted}</div>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
      )}

      {/* Historical Earnings Table */}
      {earningsMoves.length > 0 ? (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">EPS Est</th>
                  <th className="text-right py-2 px-2">EPS Act</th>
                  <th className="text-right py-2 px-2">Surprise</th>
                  <th className="text-right py-2 px-2">Price Move</th>
                </tr>
              </thead>
              <tbody>
                {earningsMoves.map((earning, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-2 text-gray-300">{earning.date}</td>
                    <td className="py-2 px-2 text-right text-gray-400">
                      {earning.epsEstimate ? `$${earning.epsEstimate.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-white font-mono">
                      {earning.epsActual ? `$${earning.epsActual.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${
                      earning.surprise > 0 ? 'text-green-400' : earning.surprise < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {earning.surprise ? `${earning.surprise > 0 ? '+' : ''}${earning.surprise.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${
                      earning.priceMove > 0 ? 'text-green-400' : earning.priceMove < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {earning.priceMove > 0 ? '+' : ''}{earning.priceMove.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Avg Move</div>
              <div className="text-xl font-bold text-purple-400">
                ±{avgMove?.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">historical</div>
            </div>
            {ivImpliedMove && (
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">IV Implied</div>
                <div className="text-xl font-bold text-yellow-400">
                  ±{(ivImpliedMove * Math.sqrt(30) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">30-day move</div>
              </div>
            )}
            {avgMove && ivImpliedMove && (
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Options Pricing</div>
                <div className={`text-lg font-bold ${
                  (ivImpliedMove * Math.sqrt(30) * 100) > avgMove ? 'text-red-400' : 'text-green-400'
                }`}>
                  {(ivImpliedMove * Math.sqrt(30) * 100) > avgMove ? 'RICH' : 'CHEAP'}
                </div>
                <div className="text-xs text-gray-600">vs history</div>
              </div>
            )}
          </div>

          {/* Interpretation */}
          {avgMove && ivImpliedMove && (
            <div className={`mt-4 p-3 rounded text-sm ${
              (ivImpliedMove * Math.sqrt(30) * 100) > avgMove * 1.2
                ? 'bg-red-900/30 border border-red-500/30'
                : (ivImpliedMove * Math.sqrt(30) * 100) < avgMove * 0.8
                  ? 'bg-green-900/30 border border-green-500/30'
                  : 'bg-gray-800/50'
            }`}>
              {(ivImpliedMove * Math.sqrt(30) * 100) > avgMove * 1.2 ? (
                <p>
                  <strong className="text-red-400">Options appear OVERPRICED:</strong>{' '}
                  Current IV implies a larger move than historical earnings suggest.
                  Consider selling premium into earnings.
                </p>
              ) : (ivImpliedMove * Math.sqrt(30) * 100) < avgMove * 0.8 ? (
                <p>
                  <strong className="text-green-400">Options appear UNDERPRICED:</strong>{' '}
                  Historical earnings moves exceed what current IV implies.
                  Consider buying options for earnings.
                </p>
              ) : (
                <p className="text-gray-400">
                  Options pricing is roughly in line with historical earnings moves.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No historical earnings move data available.</p>
          <p className="text-sm mt-2">Earnings dates may not align with available price data.</p>
        </div>
      )}
    </div>
  );
}
