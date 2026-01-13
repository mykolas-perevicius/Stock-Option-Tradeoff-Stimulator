import React from 'react';
import { formatCurrency, formatPercent, formatPrice } from '../utils/statistics';

/**
 * Detailed tradeoff explanation with educational content
 * Shows when options vs stock is favorable based on expected move vs implied move
 */
export default function TradeoffExplanation({
  stats,
  currentPrice,
  strikePrice,
  premium,
  investmentAmount,
  totalPremiumPaid,
  sharesOwned,
  optionShares,
  isCall,
  impliedVol,
  daysToExpiry,
  expectedMove,
}) {
  // Calculate key metrics
  const T = Math.max(0.001, daysToExpiry / 365);
  const sigma = impliedVol / 100;
  const impliedMovePercent = sigma * Math.sqrt(T) * 100;
  const userExpectedMove = expectedMove !== null ? expectedMove : impliedMovePercent;

  // Leverage ratio
  const leverageRatio = optionShares / sharesOwned;

  // Capital efficiency
  const capitalAtRiskStock = investmentAmount;
  const capitalAtRiskOption = totalPremiumPaid;
  const capitalFreed = investmentAmount - totalPremiumPaid;
  const capitalEfficiency = (capitalFreed / investmentAmount) * 100;

  // Determine recommendation based on expected vs implied move
  const moveRatio = userExpectedMove / impliedMovePercent;

  let recommendation;
  let recommendationColor;
  let recommendationIcon;

  if (moveRatio > 1.2) {
    recommendation = "Options may have an edge";
    recommendationColor = "text-yellow-400";
    recommendationIcon = "🎯";
  } else if (moveRatio < 0.8) {
    recommendation = "Stock appears more favorable";
    recommendationColor = "text-green-400";
    recommendationIcon = "📊";
  } else {
    recommendation = "Tradeoffs are roughly even";
    recommendationColor = "text-blue-400";
    recommendationIcon = "⚖️";
  }

  return (
    <div className="space-y-4">
      {/* Main Recommendation */}
      <div className={`p-4 bg-gray-800 rounded-lg border-l-4 ${
        moveRatio > 1.2 ? 'border-yellow-500' : moveRatio < 0.8 ? 'border-green-500' : 'border-blue-500'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{recommendationIcon}</span>
          <h4 className={`text-lg font-semibold ${recommendationColor}`}>{recommendation}</h4>
        </div>
        <p className="text-sm text-gray-300">
          {moveRatio > 1.2 ? (
            <>
              You expect the stock to move <strong className="text-yellow-400">{userExpectedMove.toFixed(1)}%</strong> but
              the market is only pricing in <strong>{impliedMovePercent.toFixed(1)}%</strong> (IV: {impliedVol}%).
              If you're right, options offer leveraged exposure to an underpriced move.
            </>
          ) : moveRatio < 0.8 ? (
            <>
              You expect the stock to move <strong className="text-green-400">{userExpectedMove.toFixed(1)}%</strong> but
              the market is pricing in <strong>{impliedMovePercent.toFixed(1)}%</strong> (IV: {impliedVol}%).
              Options appear expensive relative to your expected move. Stock may be the better choice.
            </>
          ) : (
            <>
              Your expected move (<strong>{userExpectedMove.toFixed(1)}%</strong>) roughly matches what the
              market is pricing (<strong>{impliedMovePercent.toFixed(1)}%</strong>).
              Choose based on your risk preference and whether you have a directional edge.
            </>
          )}
        </p>
      </div>

      {/* Leverage Explanation */}
      <div className="p-3 bg-gray-800 rounded">
        <h4 className="font-medium text-blue-400 mb-2">Leverage Effect</h4>
        <p className="text-sm text-gray-300 mb-2">
          With ${investmentAmount.toLocaleString()} you control:
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-400">Stock:</span> {sharesOwned.toFixed(1)} shares
          </div>
          <div>
            <span className="text-yellow-400">Options:</span> {optionShares} shares ({leverageRatio.toFixed(1)}x leverage)
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Options provide {leverageRatio.toFixed(1)}x more exposure per dollar invested.
          This amplifies both gains and losses above the breakeven price.
        </p>
      </div>

      {/* Probability Analysis */}
      <div className="p-3 bg-gray-800 rounded">
        <h4 className="font-medium text-purple-400 mb-2">Probability Differences</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Stock profits when price {isCall ? 'rises above' : 'falls below'}:</span>
            <span className="text-green-400">{formatPrice(currentPrice)} (current price)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Option profits when price {isCall ? 'rises above' : 'falls below'}:</span>
            <span className="text-yellow-400">{formatPrice(stats.breakeven)} (breakeven)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Extra move needed for option to profit:</span>
            <span className="text-orange-400">
              {isCall ? '+' : '-'}{formatPercent(Math.abs((stats.breakeven - currentPrice) / currentPrice * 100))}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Options have a lower probability of profit ({formatPercent(stats.optionProfitProb)} vs {formatPercent(stats.stockWinProb)})
          because the stock must move further to cover the premium paid.
        </p>
      </div>

      {/* Risk/Reward Matrix */}
      <div className="p-3 bg-gray-800 rounded">
        <h4 className="font-medium text-red-400 mb-2">Risk/Reward Profile</h4>
        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
          <div>
            <p className="text-gray-400 mb-1">Maximum Loss</p>
            <p className="text-green-400">Stock: {formatCurrency(stats.stockMaxLoss)} (if goes to $0)</p>
            <p className="text-yellow-400">Option: {formatCurrency(-totalPremiumPaid)} (premium only)</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Capital at Risk</p>
            <p className="text-green-400">Stock: 100% of investment</p>
            <p className="text-yellow-400">Option: {formatPercent(totalPremiumPaid / investmentAmount * 100)} of investment</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Options have defined risk - you can never lose more than the premium paid.
          This frees up {formatCurrency(capitalFreed)} ({formatPercent(capitalEfficiency)}) for other uses or as a safety buffer.
        </p>
      </div>

      {/* When to Use Each */}
      <div className="p-3 bg-gray-800 rounded">
        <h4 className="font-medium text-green-400 mb-2">When Each Strategy Makes Sense</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-green-400 font-medium mb-1">Choose Stock When:</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>- You expect gradual appreciation over time</li>
              <li>- You want dividend income</li>
              <li>- You prefer higher probability of profit</li>
              <li>- You plan to hold long-term</li>
              <li>- IV seems high (options expensive)</li>
              <li>- You have no strong directional conviction</li>
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 font-medium mb-1">Choose Options When:</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>- You expect a significant move within the timeframe</li>
              <li>- You want to limit downside risk</li>
              <li>- You want capital efficiency (leverage)</li>
              <li>- You have a specific catalyst in mind (earnings, FDA, etc.)</li>
              <li>- IV seems low relative to expected move</li>
              <li>- You accept lower probability for higher reward</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
        <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
          <span>⚠️</span> Important Disclaimer
        </h4>
        <div className="text-xs text-gray-400 space-y-2">
          <p>
            <strong>Expected Value calculations are theoretical</strong> and based on the Black-Scholes model
            and log-normal distribution, which assume:
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Markets are efficient and options are fairly priced</li>
            <li>Future volatility equals implied volatility</li>
            <li>Stock returns follow a log-normal distribution</li>
            <li>No transaction costs, slippage, or bid-ask spreads</li>
          </ul>
          <p className="mt-2">
            <strong>In reality:</strong> Options can be mispriced (cheap or expensive). Your expected move
            may differ from the market's implied move. The "better" choice depends on your specific edge,
            risk tolerance, and investment horizon.
          </p>
          <p className="text-red-400 font-medium mt-2">
            This tool is for EDUCATION ONLY. Not financial advice. Consult a qualified financial
            advisor before making investment decisions. Options involve risk of total loss of premium.
          </p>
        </div>
      </div>
    </div>
  );
}
