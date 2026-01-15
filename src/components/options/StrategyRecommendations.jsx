import React, { useMemo } from 'react';
import { blackScholesCall, blackScholesPut } from '../../utils/blackScholes';

/**
 * StrategyRecommendations - Suggests options strategies based on IV view
 */
export default function StrategyRecommendations({
  underlyingPrice,
  userIV,
  marketIV,
  daysToExpiry,
  riskFreeRate = 0.05,
  optionsData,
}) {
  const T = daysToExpiry / 365;
  const ivDiff = userIV - marketIV;
  const ivDiffPercent = marketIV > 0 ? (ivDiff / marketIV) * 100 : 0;

  // Determine user's volatility view
  const volView = useMemo(() => {
    if (ivDiff > 3) return 'very_bullish';
    if (ivDiff > 1) return 'bullish';
    if (ivDiff < -3) return 'very_bearish';
    if (ivDiff < -1) return 'bearish';
    return 'neutral';
  }, [ivDiff]);

  // Find ATM strike
  const atmStrike = useMemo(() => {
    if (!optionsData?.calls?.length || !underlyingPrice) return underlyingPrice;
    const strikes = optionsData.calls.map(c => c.strike);
    return strikes.reduce((closest, strike) =>
      Math.abs(strike - underlyingPrice) < Math.abs(closest - underlyingPrice) ? strike : closest
    , strikes[0]);
  }, [optionsData, underlyingPrice]);

  // Find OTM strikes for strangle
  const otmStrikes = useMemo(() => {
    if (!optionsData?.calls?.length) return { callStrike: atmStrike * 1.05, putStrike: atmStrike * 0.95 };
    const strikes = optionsData.calls.map(c => c.strike).sort((a, b) => a - b);
    const atmIndex = strikes.findIndex(s => s >= underlyingPrice);

    return {
      callStrike: strikes[Math.min(atmIndex + 2, strikes.length - 1)] || atmStrike * 1.05,
      putStrike: strikes[Math.max(atmIndex - 2, 0)] || atmStrike * 0.95,
    };
  }, [optionsData, underlyingPrice, atmStrike]);

  // Calculate strategy costs and breakevens
  const strategies = useMemo(() => {
    const sigma = userIV / 100;
    const marketSigma = marketIV / 100;

    // ATM Straddle
    const atmCallPrice = blackScholesCall(underlyingPrice, atmStrike, T, riskFreeRate, marketSigma);
    const atmPutPrice = blackScholesPut(underlyingPrice, atmStrike, T, riskFreeRate, marketSigma);
    const straddleCost = atmCallPrice + atmPutPrice;
    const straddleBreakeven = (straddleCost / underlyingPrice) * 100;

    // OTM Strangle
    const otmCallPrice = blackScholesCall(underlyingPrice, otmStrikes.callStrike, T, riskFreeRate, marketSigma);
    const otmPutPrice = blackScholesPut(underlyingPrice, otmStrikes.putStrike, T, riskFreeRate, marketSigma);
    const strangleCost = otmCallPrice + otmPutPrice;
    const strangleBreakevenUp = ((otmStrikes.callStrike + strangleCost - underlyingPrice) / underlyingPrice) * 100;
    const strangleBreakevenDown = ((underlyingPrice - otmStrikes.putStrike + strangleCost) / underlyingPrice) * 100;

    // Iron Condor (sell ATM-ish, buy wings)
    const icShortCallStrike = otmStrikes.callStrike;
    const icLongCallStrike = icShortCallStrike * 1.03;
    const icShortPutStrike = otmStrikes.putStrike;
    const icLongPutStrike = icShortPutStrike * 0.97;

    const icShortCallPrice = blackScholesCall(underlyingPrice, icShortCallStrike, T, riskFreeRate, marketSigma);
    const icLongCallPrice = blackScholesCall(underlyingPrice, icLongCallStrike, T, riskFreeRate, marketSigma);
    const icShortPutPrice = blackScholesPut(underlyingPrice, icShortPutStrike, T, riskFreeRate, marketSigma);
    const icLongPutPrice = blackScholesPut(underlyingPrice, icLongPutStrike, T, riskFreeRate, marketSigma);

    const icCredit = (icShortCallPrice - icLongCallPrice) + (icShortPutPrice - icLongPutPrice);
    const icMaxLoss = (icLongCallStrike - icShortCallStrike) - icCredit;

    // Calendar Spread
    const calendarFrontPrice = blackScholesCall(underlyingPrice, atmStrike, T, riskFreeRate, marketSigma);
    const calendarBackPrice = blackScholesCall(underlyingPrice, atmStrike, T * 2, riskFreeRate, marketSigma);
    const calendarDebit = calendarBackPrice - calendarFrontPrice;

    return {
      straddle: {
        name: 'Long Straddle',
        description: 'Buy ATM Call + ATM Put',
        cost: straddleCost * 100,
        breakeven: straddleBreakeven,
        strike: atmStrike,
        confidence: volView === 'very_bullish' ? 'high' : volView === 'bullish' ? 'medium' : 'low',
        suitable: volView === 'very_bullish' || volView === 'bullish',
        icon: '🎯',
      },
      strangle: {
        name: 'Long Strangle',
        description: `Buy ${otmStrikes.putStrike} Put + ${otmStrikes.callStrike} Call`,
        cost: strangleCost * 100,
        breakevenUp: strangleBreakevenUp,
        breakevenDown: strangleBreakevenDown,
        confidence: volView === 'very_bullish' ? 'high' : volView === 'bullish' ? 'medium' : 'low',
        suitable: volView === 'very_bullish' || volView === 'bullish',
        icon: '📈',
      },
      ironCondor: {
        name: 'Iron Condor',
        description: 'Sell OTM Call Spread + Sell OTM Put Spread',
        credit: icCredit * 100,
        maxLoss: icMaxLoss * 100,
        confidence: volView === 'very_bearish' ? 'high' : volView === 'bearish' ? 'medium' : 'low',
        suitable: volView === 'very_bearish' || volView === 'bearish',
        icon: '🦅',
      },
      calendar: {
        name: 'Calendar Spread',
        description: 'Sell near-term, buy far-term ATM call',
        cost: calendarDebit * 100,
        strike: atmStrike,
        confidence: volView === 'neutral' ? 'high' : 'medium',
        suitable: volView === 'neutral' || volView === 'bearish',
        icon: '📅',
      },
    };
  }, [underlyingPrice, atmStrike, otmStrikes, T, riskFreeRate, userIV, marketIV, volView]);

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceBg = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-900/30 border-green-500/30';
      case 'medium': return 'bg-yellow-900/30 border-yellow-500/30';
      default: return 'bg-gray-800/50 border-gray-700';
    }
  };

  const recommendedStrategies = Object.values(strategies).filter(s => s.suitable);
  const avoidStrategies = Object.values(strategies).filter(s => !s.suitable);

  return (
    <div className="space-y-6">
      {/* Header with IV view */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📈</span> Strategy Recommendations
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Based on your volatility prediction vs market
          </p>
        </div>

        <div className={`px-4 py-2 rounded-lg ${
          volView.includes('bullish') ? 'bg-green-900/30' :
          volView.includes('bearish') ? 'bg-red-900/30' :
          'bg-gray-800'
        }`}>
          <span className="text-sm text-gray-400">Your View: </span>
          <span className={`font-semibold ${
            volView.includes('bullish') ? 'text-green-400' :
            volView.includes('bearish') ? 'text-red-400' :
            'text-gray-300'
          }`}>
            {volView === 'very_bullish' ? 'Very Bullish on Volatility' :
             volView === 'bullish' ? 'Bullish on Volatility' :
             volView === 'very_bearish' ? 'Very Bearish on Volatility' :
             volView === 'bearish' ? 'Bearish on Volatility' :
             'Neutral on Volatility'}
          </span>
          <span className="ml-2 text-gray-500">
            ({ivDiff > 0 ? '+' : ''}{ivDiff.toFixed(1)}% IV diff)
          </span>
        </div>
      </div>

      {/* Recommended Strategies */}
      <div>
        <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
          <span>✅</span> Recommended Strategies
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedStrategies.map((strategy) => (
            <div
              key={strategy.name}
              className={`p-4 rounded-lg border ${getConfidenceBg(strategy.confidence)}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold flex items-center gap-2">
                    <span>{strategy.icon}</span>
                    {strategy.name}
                  </h5>
                  <p className="text-sm text-gray-400 mt-1">{strategy.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(strategy.confidence)} bg-gray-800/50`}>
                  {strategy.confidence === 'high' ? 'High Confidence' :
                   strategy.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/50">
                {strategy.cost !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cost:</span>
                    <span className="font-mono">${strategy.cost.toFixed(0)}</span>
                  </div>
                )}
                {strategy.credit !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Credit:</span>
                    <span className="font-mono text-green-400">${strategy.credit.toFixed(0)}</span>
                  </div>
                )}
                {strategy.breakeven !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Breakeven:</span>
                    <span className="font-mono">±{strategy.breakeven.toFixed(1)}%</span>
                  </div>
                )}
                {strategy.breakevenUp !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Breakeven:</span>
                    <span className="font-mono">+{strategy.breakevenUp.toFixed(1)}% / -{strategy.breakevenDown.toFixed(1)}%</span>
                  </div>
                )}
                {strategy.maxLoss !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Max Loss:</span>
                    <span className="font-mono text-red-400">${strategy.maxLoss.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategies to Avoid */}
      {avoidStrategies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> Strategies to Avoid (given your view)
          </h4>
          <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
            <ul className="space-y-2">
              {avoidStrategies.map((strategy) => (
                <li key={strategy.name} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-red-400">•</span>
                  <span className="font-medium">{strategy.name}</span>
                  <span className="text-gray-500">- {strategy.description}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-400 mt-3">
              {volView.includes('bullish')
                ? 'Avoid selling premium or strategies that profit from low volatility.'
                : volView.includes('bearish')
                ? 'Avoid buying premium or strategies that profit from high volatility.'
                : 'Consider waiting for a clearer volatility signal.'}
            </p>
          </div>
        </div>
      )}

      {/* Educational note */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
        <p className="text-gray-400">
          <strong className="text-gray-300">How this works:</strong> If you believe volatility will be higher
          than the market expects ({userIV.toFixed(1)}% vs {marketIV.toFixed(1)}%), options are "cheap" and
          you should buy them. If you believe volatility will be lower, options are "expensive" and you
          should sell them (with defined risk).
        </p>
      </div>
    </div>
  );
}
