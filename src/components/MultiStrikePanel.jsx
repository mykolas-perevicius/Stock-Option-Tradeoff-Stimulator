import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { optionPrice, breakevenPrice } from '../utils/blackScholes';
import { probAbove, probBelow } from '../utils/probability';
import { formatCurrency, formatPercent, formatPrice } from '../utils/statistics';

/**
 * Multi-strike comparison panel
 * Shows analysis for multiple strike prices at once
 */
export default function MultiStrikePanel({
  currentPrice,
  daysToExpiry,
  impliedVol,
  sigma, // Use adjusted sigma from parent (reflects expected move override)
  riskFreeRate,
  investmentAmount,
  isCall,
  minPrice,
  maxPrice,
  expectedMoveOverride = null,
}) {
  const T = Math.max(0.001, daysToExpiry / 365);
  const r = riskFreeRate / 100;
  // Note: sigma is now passed from parent, already adjusted for expected move

  // Generate strikes at -10%, -5%, ATM, +5%, +10%, +15%, +20%
  const strikeOffsets = [-10, -5, 0, 5, 10, 15, 20];

  const strikeAnalysis = useMemo(() => {
    return strikeOffsets.map((offset) => {
      const strikePrice = Math.round(currentPrice * (1 + offset / 100));
      const premium = optionPrice(currentPrice, strikePrice, T, r, sigma, isCall);
      const breakeven = breakevenPrice(strikePrice, premium, isCall);
      const contracts = Math.max(1, Math.floor(investmentAmount / (premium * 100)));
      const totalCost = contracts * premium * 100;

      // Calculate probability of profit
      let probProfit;
      if (isCall) {
        probProfit = probAbove(breakeven, currentPrice, T, r, sigma) * 100;
      } else {
        probProfit = probBelow(breakeven, currentPrice, T, r, sigma) * 100;
      }

      // Determine moneyness
      let moneyness;
      if (isCall) {
        moneyness = strikePrice > currentPrice ? 'OTM' : strikePrice < currentPrice ? 'ITM' : 'ATM';
      } else {
        moneyness = strikePrice < currentPrice ? 'OTM' : strikePrice > currentPrice ? 'ITM' : 'ATM';
      }

      // Calculate max gain at +30% move
      const targetPrice = currentPrice * (isCall ? 1.3 : 0.7);
      let maxGainAtTarget;
      if (isCall) {
        maxGainAtTarget = Math.max(0, targetPrice - strikePrice) * contracts * 100 - totalCost;
      } else {
        maxGainAtTarget = Math.max(0, strikePrice - targetPrice) * contracts * 100 - totalCost;
      }

      // Simplified EV calculation
      const ev = (probProfit / 100) * (maxGainAtTarget * 0.3) - ((100 - probProfit) / 100) * totalCost;

      return {
        offset,
        label: offset === 0 ? 'ATM' : `${offset > 0 ? '+' : ''}${offset}%`,
        strikePrice,
        premium: Math.round(premium * 100) / 100,
        breakeven: Math.round(breakeven * 100) / 100,
        contracts,
        totalCost: Math.round(totalCost),
        probProfit: Math.round(probProfit * 10) / 10,
        ev: Math.round(ev),
        maxGainAtTarget: Math.round(maxGainAtTarget),
        moneyness,
      };
    });
  }, [currentPrice, T, r, sigma, isCall, investmentAmount]);

  // Generate P&L chart data for all strikes
  const chartData = useMemo(() => {
    const steps = 80;
    const priceStep = (maxPrice - minPrice) / steps;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + i * priceStep;
      const point = { price: Math.round(price * 100) / 100 };

      strikeAnalysis.forEach((strike) => {
        let intrinsic;
        if (isCall) {
          intrinsic = Math.max(0, price - strike.strikePrice) * strike.contracts * 100;
        } else {
          intrinsic = Math.max(0, strike.strikePrice - price) * strike.contracts * 100;
        }
        point[`strike_${strike.offset}`] = Math.round(intrinsic - strike.totalCost);
      });

      points.push(point);
    }
    return points;
  }, [strikeAnalysis, minPrice, maxPrice, isCall]);

  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  // Find best strike by probability and by EV
  const bestByProb = strikeAnalysis.reduce((best, curr) =>
    curr.probProfit > best.probProfit ? curr : best
  );
  const bestByEV = strikeAnalysis.reduce((best, curr) =>
    curr.ev > best.ev ? curr : best
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Multi-Strike Comparison</h3>
          {expectedMoveOverride !== null && (
            <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
              Using custom expected move
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Compare {isCall ? 'call' : 'put'} options at different strike prices for ${currentPrice.toFixed(2)} stock.
          All calculations assume ${investmentAmount.toLocaleString()} investment.
          {expectedMoveOverride !== null && (
            <span className="text-purple-400"> Probability calculations reflect your custom expected move.</span>
          )}
        </p>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-400 mb-2">Highest Probability of Profit</h4>
          <p className="text-2xl font-bold text-white">
            ${bestByProb.strikePrice} ({bestByProb.label})
          </p>
          <p className="text-sm text-gray-400">
            {formatPercent(bestByProb.probProfit)} chance of profit • {bestByProb.moneyness}
          </p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">Highest Expected Value</h4>
          <p className="text-2xl font-bold text-white">
            ${bestByEV.strikePrice} ({bestByEV.label})
          </p>
          <p className="text-sm text-gray-400">
            EV: {formatCurrency(bestByEV.ev)} • {formatPercent(bestByEV.probProfit)} win rate
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-4">Strike Comparison Table</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600 text-gray-400">
                <th className="py-2 text-left">Strike</th>
                <th className="py-2 text-center">Premium</th>
                <th className="py-2 text-center">Breakeven</th>
                <th className="py-2 text-center">Contracts</th>
                <th className="py-2 text-center">Total Cost</th>
                <th className="py-2 text-center">P(Profit)</th>
                <th className="py-2 text-center">Max Gain @30%</th>
              </tr>
            </thead>
            <tbody>
              {strikeAnalysis.map((strike, idx) => (
                <tr
                  key={strike.offset}
                  className={`border-b border-gray-700 ${
                    strike.offset === 0 ? 'bg-gray-800' : ''
                  } ${strike === bestByProb || strike === bestByEV ? 'bg-blue-900/20' : ''}`}
                >
                  <td className="py-2">
                    <span style={{ color: colors[idx] }} className="font-medium">
                      {strike.label}
                    </span>
                    <span className="text-gray-400 ml-2">${strike.strikePrice}</span>
                    <span className="text-xs text-gray-500 ml-1">({strike.moneyness})</span>
                  </td>
                  <td className="py-2 text-center text-white">${strike.premium}</td>
                  <td className="py-2 text-center text-orange-400">${strike.breakeven}</td>
                  <td className="py-2 text-center text-purple-400">{strike.contracts}</td>
                  <td className="py-2 text-center text-red-400">{formatCurrency(strike.totalCost)}</td>
                  <td className="py-2 text-center">
                    <span
                      className={
                        strike.probProfit > 50
                          ? 'text-green-400'
                          : strike.probProfit > 30
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {formatPercent(strike.probProfit)}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span className={strike.maxGainAtTarget > 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(strike.maxGainAtTarget)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Strike P&L Chart */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-4">P&L Comparison by Strike</h4>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="price"
              stroke="#9CA3AF"
              tickFormatter={(val) => `$${val}`}
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={(val) => formatCurrency(val, false)}
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Stock Price: $${label}`}
            />
            <Legend />
            <ReferenceLine x={currentPrice} stroke="#EAB308" strokeDasharray="5 5" />
            <ReferenceLine y={0} stroke="#6B7280" />
            {strikeAnalysis.map((strike, idx) => (
              <Line
                key={strike.offset}
                type="monotone"
                dataKey={`strike_${strike.offset}`}
                stroke={colors[idx]}
                strokeWidth={strike.offset === 0 ? 3 : 2}
                dot={false}
                name={`$${strike.strikePrice} (${strike.label})`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Educational Summary */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Understanding Strike Selection</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-800 rounded">
            <h5 className="text-green-400 font-medium mb-2">ITM (In-The-Money)</h5>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>- Higher premium cost</li>
              <li>- Higher probability of profit</li>
              <li>- Less leverage</li>
              <li>- More "stock-like" behavior</li>
              <li>- Best for: Conservative plays, high conviction</li>
            </ul>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <h5 className="text-yellow-400 font-medium mb-2">ATM (At-The-Money)</h5>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>- Balanced premium</li>
              <li>- ~50% probability (for calls)</li>
              <li>- Moderate leverage</li>
              <li>- Highest theta decay</li>
              <li>- Best for: Balanced risk/reward</li>
            </ul>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <h5 className="text-red-400 font-medium mb-2">OTM (Out-of-The-Money)</h5>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>- Lower premium cost</li>
              <li>- Lower probability of profit</li>
              <li>- Maximum leverage</li>
              <li>- Highest potential % gains</li>
              <li>- Best for: Speculative plays, low capital</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Note: The "best" strike depends on your outlook, risk tolerance, and investment goals.
          ITM offers more certainty, OTM offers more leverage. ATM balances both.
        </p>
      </div>
    </div>
  );
}
