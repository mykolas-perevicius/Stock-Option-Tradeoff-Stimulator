import React, { useMemo } from 'react';

/**
 * HistoricalAccuracy - Compare past implied volatility to realized moves
 * Shows how accurate market IV and user predictions would have been historically
 */
export default function HistoricalAccuracy({
  symbol,
  userIV,
  marketIV,
  historicalData,
  daysToExpiry,
}) {
  // Calculate historical realized volatility for the same time period
  const analysis = useMemo(() => {
    if (!historicalData?.ohlcData || historicalData.ohlcData.length < 30) {
      return null;
    }

    const data = historicalData.ohlcData;
    const period = daysToExpiry;

    // Calculate rolling realized volatility over the same period as DTE
    const rollingRealizedVols = [];
    const rollingActualMoves = [];

    for (let i = period; i < data.length; i++) {
      // Calculate actual move over the period
      const startPrice = data[i - period].close;
      const endPrice = data[i].close;
      const actualMove = ((endPrice - startPrice) / startPrice) * 100;
      rollingActualMoves.push(Math.abs(actualMove));

      // Calculate realized vol over the period
      const periodData = data.slice(i - period, i);
      const returns = [];
      for (let j = 1; j < periodData.length; j++) {
        const ret = Math.log(periodData[j].close / periodData[j - 1].close);
        returns.push(ret);
      }

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
      const dailyVol = Math.sqrt(variance);
      const annualizedVol = dailyVol * Math.sqrt(252) * 100;
      rollingRealizedVols.push(annualizedVol);
    }

    // Calculate statistics
    const avgRealizedVol = rollingRealizedVols.reduce((a, b) => a + b, 0) / rollingRealizedVols.length;
    const avgActualMove = rollingActualMoves.reduce((a, b) => a + b, 0) / rollingActualMoves.length;

    // Calculate implied expected moves
    const T = daysToExpiry / 365;
    const marketExpectedMove = marketIV * Math.sqrt(T);
    const userExpectedMove = userIV * Math.sqrt(T);

    // How often did actual moves exceed implied moves?
    const marketExceedCount = rollingActualMoves.filter(m => m > marketExpectedMove).length;
    const userExceedCount = rollingActualMoves.filter(m => m > userExpectedMove).length;

    const marketExceedRate = (marketExceedCount / rollingActualMoves.length) * 100;
    const userExceedRate = (userExceedCount / rollingActualMoves.length) * 100;

    // Calculate percentiles for actual moves
    const sortedMoves = [...rollingActualMoves].sort((a, b) => a - b);
    const p25 = sortedMoves[Math.floor(sortedMoves.length * 0.25)];
    const p50 = sortedMoves[Math.floor(sortedMoves.length * 0.50)];
    const p75 = sortedMoves[Math.floor(sortedMoves.length * 0.75)];
    const p90 = sortedMoves[Math.floor(sortedMoves.length * 0.90)];

    // Determine verdict
    let verdict = 'neutral';
    let verdictText = '';

    if (marketIV > avgRealizedVol * 1.15) {
      verdict = 'market_overstates';
      verdictText = 'Market IV historically overstates actual volatility';
    } else if (marketIV < avgRealizedVol * 0.85) {
      verdict = 'market_understates';
      verdictText = 'Market IV historically understates actual volatility';
    } else {
      verdictText = 'Market IV is roughly in line with historical realized volatility';
    }

    let userVerdict = 'neutral';
    if (userIV > avgRealizedVol * 1.20) {
      userVerdict = 'user_overstates';
    } else if (userIV < avgRealizedVol * 0.80) {
      userVerdict = 'user_understates';
    }

    return {
      avgRealizedVol,
      avgActualMove,
      marketExpectedMove,
      userExpectedMove,
      marketExceedRate,
      userExceedRate,
      p25,
      p50,
      p75,
      p90,
      verdict,
      verdictText,
      userVerdict,
      periods: rollingActualMoves.length,
    };
  }, [historicalData, daysToExpiry, marketIV, userIV]);

  if (!analysis) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-400">
        <p>Insufficient historical data for accuracy analysis.</p>
        <p className="text-sm mt-2">Need at least 30 days of price history.</p>
      </div>
    );
  }

  const getVerdictColor = (verdict) => {
    if (verdict.includes('overstates')) return 'text-red-400';
    if (verdict.includes('understates')) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📜</span> Historical Accuracy Check
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          How accurate would predictions have been over the past year?
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Avg Realized Vol</div>
          <div className="text-2xl font-bold text-blue-400">
            {analysis.avgRealizedVol.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Historical annualized</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Avg Actual Move</div>
          <div className="text-2xl font-bold text-purple-400">
            ±{analysis.avgActualMove.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Over {daysToExpiry} days</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Market Expected</div>
          <div className="text-2xl font-bold text-white">
            ±{analysis.marketExpectedMove.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">From {marketIV.toFixed(1)}% IV</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Your Expected</div>
          <div className="text-2xl font-bold text-purple-400">
            ±{analysis.userExpectedMove.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">From {userIV.toFixed(1)}% IV</div>
        </div>
      </div>

      {/* Historical move distribution */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Historical {daysToExpiry}-Day Move Distribution
        </h4>

        <div className="space-y-3">
          {/* Visual bar showing percentiles */}
          <div className="relative h-8 bg-gray-700 rounded overflow-hidden">
            {/* Percentile markers */}
            <div
              className="absolute top-0 bottom-0 bg-blue-900/50 border-r border-blue-400"
              style={{ left: 0, width: `${(analysis.p25 / analysis.p90) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 bg-purple-900/50 border-r border-purple-400"
              style={{ left: `${(analysis.p25 / analysis.p90) * 100}%`, width: `${((analysis.p50 - analysis.p25) / analysis.p90) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 bg-yellow-900/50 border-r border-yellow-400"
              style={{ left: `${(analysis.p50 / analysis.p90) * 100}%`, width: `${((analysis.p75 - analysis.p50) / analysis.p90) * 100}%` }}
            />

            {/* Market expected line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: `${Math.min((analysis.marketExpectedMove / analysis.p90) * 100, 100)}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white whitespace-nowrap">
                Market
              </div>
            </div>

            {/* User expected line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-purple-400"
              style={{ left: `${Math.min((analysis.userExpectedMove / analysis.p90) * 100, 100)}%` }}
            >
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-purple-400 whitespace-nowrap">
                Your
              </div>
            </div>
          </div>

          {/* Percentile labels */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>0%</span>
            <span>P25: {analysis.p25.toFixed(1)}%</span>
            <span>P50: {analysis.p50.toFixed(1)}%</span>
            <span>P75: {analysis.p75.toFixed(1)}%</span>
            <span>P90: {analysis.p90.toFixed(1)}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Market exceeded: </span>
            <span className={analysis.marketExceedRate > 35 ? 'text-green-400' : analysis.marketExceedRate < 25 ? 'text-red-400' : 'text-gray-300'}>
              {analysis.marketExceedRate.toFixed(0)}% of the time
            </span>
          </div>
          <div>
            <span className="text-gray-400">Your prediction exceeded: </span>
            <span className={analysis.userExceedRate > 35 ? 'text-green-400' : analysis.userExceedRate < 25 ? 'text-red-400' : 'text-gray-300'}>
              {analysis.userExceedRate.toFixed(0)}% of the time
            </span>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className={`p-4 rounded-lg border ${
        analysis.verdict === 'market_overstates'
          ? 'bg-red-900/20 border-red-500/30'
          : analysis.verdict === 'market_understates'
          ? 'bg-green-900/20 border-green-500/30'
          : 'bg-gray-800/50 border-gray-700'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {analysis.verdict === 'market_overstates' ? '📉' :
             analysis.verdict === 'market_understates' ? '📈' : '📊'}
          </span>
          <div>
            <h4 className={`font-semibold ${getVerdictColor(analysis.verdict)}`}>
              {analysis.verdictText}
            </h4>
            <p className="text-sm text-gray-400 mt-2">
              Over the past {analysis.periods} periods ({daysToExpiry}-day windows):
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>
                • Average realized volatility was <strong className="text-blue-400">{analysis.avgRealizedVol.toFixed(1)}%</strong>
              </li>
              <li>
                • Market IV of <strong className="text-white">{marketIV.toFixed(1)}%</strong> {marketIV > analysis.avgRealizedVol ? 'overstates' : 'understates'} by {Math.abs(marketIV - analysis.avgRealizedVol).toFixed(1)}%
              </li>
              <li>
                • Your IV of <strong className="text-purple-400">{userIV.toFixed(1)}%</strong> {userIV > analysis.avgRealizedVol ? 'overstates' : 'understates'} by {Math.abs(userIV - analysis.avgRealizedVol).toFixed(1)}%
              </li>
            </ul>

            {analysis.userVerdict !== 'neutral' && (
              <div className={`mt-3 p-2 rounded text-sm ${
                analysis.userVerdict === 'user_overstates' ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'
              }`}>
                {analysis.userVerdict === 'user_overstates'
                  ? `⚠️ Your prediction (${userIV.toFixed(1)}%) would have overstated historical moves. Consider that realized vol typically runs below implied vol.`
                  : `✅ Your prediction (${userIV.toFixed(1)}%) aligns well with historical realized volatility.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500">
        <p><strong>Note:</strong> Past volatility is not a guarantee of future volatility. This analysis is based on {analysis.periods} rolling {daysToExpiry}-day periods from historical data.</p>
      </div>
    </div>
  );
}
