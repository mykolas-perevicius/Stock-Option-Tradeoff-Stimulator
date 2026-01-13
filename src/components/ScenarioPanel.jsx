import React, { useState, useMemo } from 'react';
import { optionPrice } from '../utils/blackScholes';
import { calcAllGreeks } from '../utils/greeks';
import { formatCurrency, formatPrice, formatPercent } from '../utils/statistics';

/**
 * Scenario analysis panel for "what if" comparisons
 */
export default function ScenarioPanel({
  currentPrice,
  strikePrice,
  daysToExpiry,
  impliedVol,
  riskFreeRate,
  investmentAmount,
  isCall,
  premium,
  sharesOwned,
  optionShares,
  totalPremiumPaid,
}) {
  const [whatIfPrice, setWhatIfPrice] = useState(currentPrice);
  const [whatIfIV, setWhatIfIV] = useState(impliedVol);
  const [whatIfDays, setWhatIfDays] = useState(daysToExpiry);

  const T = Math.max(0.001, daysToExpiry / 365);
  const sigma = impliedVol / 100;
  const r = riskFreeRate / 100;

  // Current scenario calculations
  const currentScenario = useMemo(() => {
    const stockPL = sharesOwned * (currentPrice - currentPrice); // Always 0 at current
    const optionValue = optionPrice(currentPrice, strikePrice, T, r, sigma, isCall);
    const optionPL = (optionValue * optionShares) - totalPremiumPaid;
    const greeks = calcAllGreeks(currentPrice, strikePrice, T, r, sigma, isCall);

    return {
      stockPrice: currentPrice,
      stockPL,
      stockReturn: 0,
      optionValue,
      optionPL,
      optionReturn: (optionPL / totalPremiumPaid) * 100,
      delta: greeks.delta,
      theta: greeks.theta,
      iv: impliedVol,
      days: daysToExpiry,
    };
  }, [currentPrice, strikePrice, T, r, sigma, isCall, sharesOwned, optionShares, totalPremiumPaid, impliedVol, daysToExpiry]);

  // What-if scenario calculations
  const whatIfScenario = useMemo(() => {
    const whatIfT = Math.max(0.001, whatIfDays / 365);
    const whatIfSigma = whatIfIV / 100;

    const stockPL = sharesOwned * (whatIfPrice - currentPrice);
    const stockReturn = ((whatIfPrice - currentPrice) / currentPrice) * 100;

    const optionValue = optionPrice(whatIfPrice, strikePrice, whatIfT, r, whatIfSigma, isCall);
    const optionPL = (optionValue * optionShares) - totalPremiumPaid;
    const optionReturn = (optionPL / totalPremiumPaid) * 100;

    const greeks = calcAllGreeks(whatIfPrice, strikePrice, whatIfT, r, whatIfSigma, isCall);

    return {
      stockPrice: whatIfPrice,
      stockPL,
      stockReturn,
      optionValue,
      optionPL,
      optionReturn,
      delta: greeks.delta,
      theta: greeks.theta,
      iv: whatIfIV,
      days: whatIfDays,
    };
  }, [whatIfPrice, whatIfDays, whatIfIV, currentPrice, strikePrice, r, isCall, sharesOwned, optionShares, totalPremiumPaid]);

  // Difference calculations
  const diff = {
    priceDiff: whatIfPrice - currentPrice,
    pricePct: ((whatIfPrice - currentPrice) / currentPrice) * 100,
    ivDiff: whatIfIV - impliedVol,
    daysDiff: whatIfDays - daysToExpiry,
    stockPLDiff: whatIfScenario.stockPL - currentScenario.stockPL,
    optionPLDiff: whatIfScenario.optionPL - currentScenario.optionPL,
  };

  const ComparisonRow = ({ label, current, whatIf, diff, formatter = formatCurrency }) => (
    <tr className="border-b border-gray-700">
      <td className="py-2 text-gray-400">{label}</td>
      <td className="py-2 text-center">{formatter(current)}</td>
      <td className="py-2 text-center">{formatter(whatIf)}</td>
      <td className={`py-2 text-center ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {diff >= 0 ? '+' : ''}{formatter(diff)}
      </td>
    </tr>
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Scenario Analysis</h3>

      {/* What-if inputs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            What if price is...
          </label>
          <input
            type="number"
            value={whatIfPrice}
            onChange={(e) => setWhatIfPrice(Number(e.target.value) || currentPrice)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
          />
          <div className="flex gap-1 mt-1">
            {[-10, -5, 0, 5, 10].map((pct) => (
              <button
                key={pct}
                onClick={() => setWhatIfPrice(Math.round(currentPrice * (1 + pct / 100) * 100) / 100)}
                className="flex-1 text-xs py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {pct >= 0 ? '+' : ''}{pct}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            What if IV is...
          </label>
          <input
            type="number"
            value={whatIfIV}
            onChange={(e) => setWhatIfIV(Number(e.target.value) || impliedVol)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="5"
          />
          <div className="flex gap-1 mt-1">
            {[-20, -10, 0, 10, 20].map((delta) => (
              <button
                key={delta}
                onClick={() => setWhatIfIV(Math.max(5, impliedVol + delta))}
                className="flex-1 text-xs py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {delta >= 0 ? '+' : ''}{delta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            What if days left...
          </label>
          <input
            type="number"
            value={whatIfDays}
            onChange={(e) => setWhatIfDays(Math.max(1, Math.min(daysToExpiry, Number(e.target.value))))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="1"
            max={daysToExpiry}
          />
          <div className="flex gap-1 mt-1">
            {[1, 7, 14, Math.floor(daysToExpiry / 2), daysToExpiry].filter((d, i, arr) => arr.indexOf(d) === i && d <= daysToExpiry).slice(0, 5).map((days) => (
              <button
                key={days}
                onClick={() => setWhatIfDays(days)}
                className="flex-1 text-xs py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="py-2 text-left text-gray-400">Metric</th>
              <th className="py-2 text-center text-gray-400">Current</th>
              <th className="py-2 text-center text-gray-400">What If</th>
              <th className="py-2 text-center text-gray-400">Change</th>
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Stock Price"
              current={currentScenario.stockPrice}
              whatIf={whatIfScenario.stockPrice}
              diff={diff.priceDiff}
              formatter={formatPrice}
            />
            <ComparisonRow
              label="Stock P&L"
              current={currentScenario.stockPL}
              whatIf={whatIfScenario.stockPL}
              diff={diff.stockPLDiff}
            />
            <ComparisonRow
              label="Stock Return"
              current={currentScenario.stockReturn}
              whatIf={whatIfScenario.stockReturn}
              diff={whatIfScenario.stockReturn - currentScenario.stockReturn}
              formatter={(v) => formatPercent(v)}
            />
            <tr className="border-b border-gray-600 bg-gray-800/50">
              <td colSpan={4} className="py-1"></td>
            </tr>
            <ComparisonRow
              label="Option Value"
              current={currentScenario.optionValue}
              whatIf={whatIfScenario.optionValue}
              diff={whatIfScenario.optionValue - currentScenario.optionValue}
              formatter={formatPrice}
            />
            <ComparisonRow
              label="Option P&L"
              current={currentScenario.optionPL}
              whatIf={whatIfScenario.optionPL}
              diff={diff.optionPLDiff}
            />
            <ComparisonRow
              label="Option Return"
              current={currentScenario.optionReturn}
              whatIf={whatIfScenario.optionReturn}
              diff={whatIfScenario.optionReturn - currentScenario.optionReturn}
              formatter={(v) => formatPercent(v)}
            />
            <tr className="border-b border-gray-600 bg-gray-800/50">
              <td colSpan={4} className="py-1"></td>
            </tr>
            <ComparisonRow
              label="Delta"
              current={currentScenario.delta}
              whatIf={whatIfScenario.delta}
              diff={whatIfScenario.delta - currentScenario.delta}
              formatter={(v) => v.toFixed(3)}
            />
            <ComparisonRow
              label="Theta ($/day)"
              current={currentScenario.theta}
              whatIf={whatIfScenario.theta}
              diff={whatIfScenario.theta - currentScenario.theta}
              formatter={(v) => `$${v.toFixed(2)}`}
            />
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
        <strong className="text-gray-300">Summary:</strong>
        <p className="text-gray-400 mt-1">
          If the stock moves to {formatPrice(whatIfPrice)} ({diff.pricePct >= 0 ? '+' : ''}{diff.pricePct.toFixed(1)}%)
          {diff.ivDiff !== 0 && ` with IV at ${whatIfIV}% (${diff.ivDiff >= 0 ? '+' : ''}${diff.ivDiff}%)`}
          {diff.daysDiff !== 0 && ` in ${daysToExpiry - whatIfDays} days`}:
        </p>
        <div className="flex gap-4 mt-2">
          <span className={whatIfScenario.stockPL >= 0 ? 'text-green-400' : 'text-red-400'}>
            Stock: {formatCurrency(whatIfScenario.stockPL)} ({formatPercent(whatIfScenario.stockReturn)})
          </span>
          <span className={whatIfScenario.optionPL >= 0 ? 'text-green-400' : 'text-red-400'}>
            Options: {formatCurrency(whatIfScenario.optionPL)} ({formatPercent(whatIfScenario.optionReturn)})
          </span>
        </div>
      </div>
    </div>
  );
}
