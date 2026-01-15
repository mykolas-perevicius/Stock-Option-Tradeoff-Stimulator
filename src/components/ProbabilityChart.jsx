import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatPrice, formatPercent } from '../utils/statistics';
import { priceAtSigma } from '../utils/probability';

/**
 * Probability distribution chart showing where the stock is likely to end up
 * This chart has its own independent price range based on volatility (±3σ)
 * and is NOT affected by the P&L chart range
 */
export default function ProbabilityChart({
  data,
  currentPrice,
  breakeven,
  strikePrice,
  T,
  r,
  sigma,
  minPrice,
  maxPrice,
  showConfidenceIntervals = true,
  userExpectedMove = null,
  marketExpectedMove = null,
  userImpliedIV = null,
}) {
  // Calculate sigma levels based on current (possibly adjusted) sigma
  const sigma1Up = priceAtSigma(currentPrice, T, r, sigma, 1);
  const sigma1Down = priceAtSigma(currentPrice, T, r, sigma, -1);
  const sigma2Up = priceAtSigma(currentPrice, T, r, sigma, 2);
  const sigma2Down = priceAtSigma(currentPrice, T, r, sigma, -2);

  // Calculate expected move percentage from current sigma (user's view or market)
  const currentExpectedMove = sigma * Math.sqrt(T) * 100;

  // Data is already filtered to the probability-specific range (passed from parent)
  // Create data with profit zones highlighted
  const enhancedData = data.map((d) => ({
    ...d,
    stockProfit: d.price > currentPrice ? d.probability : 0,
    stockLoss: d.price <= currentPrice ? d.probability : 0,
    optionProfit: d.price > breakeven ? d.probability : 0,
    optionLoss: d.price <= breakeven ? d.probability : 0,
  }));

  const tooltipFormatter = (value, name) => {
    return [`${value.toFixed(2)}%`, name];
  };

  const isUsingCustomMove = userExpectedMove !== null;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Price Probability Distribution</h2>
        {isUsingCustomMove && (
          <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
            Your View: ±{currentExpectedMove.toFixed(1)}% move (IV: {userImpliedIV?.toFixed(1)}%)
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={enhancedData}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="price"
            stroke="#9CA3AF"
            domain={[minPrice, maxPrice]}
            tickFormatter={(val) => `$${Math.round(val)}`}
            type="number"
          />
          <YAxis stroke="#9CA3AF" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={tooltipFormatter}
            labelFormatter={(label) => `Price: ${formatPrice(label)}`}
          />

          {/* Main probability distribution */}
          <Area
            type="monotone"
            dataKey="probability"
            stroke="#A855F7"
            fill="#A855F7"
            fillOpacity={0.4}
            name="Probability"
          />

          {/* Reference lines */}
          <ReferenceLine x={currentPrice} stroke="#EAB308" strokeDasharray="3 3" />
          <ReferenceLine x={breakeven} stroke="#F97316" strokeDasharray="3 3" />
          <ReferenceLine x={strikePrice} stroke="#3B82F6" strokeDasharray="3 3" />

          {/* Confidence interval lines */}
          {showConfidenceIntervals && (
            <>
              <ReferenceLine
                x={sigma1Up}
                stroke="#22C55E"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                x={sigma1Down}
                stroke="#22C55E"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                x={sigma2Up}
                stroke="#EF4444"
                strokeDasharray="2 2"
                strokeOpacity={0.3}
              />
              <ReferenceLine
                x={sigma2Down}
                stroke="#EF4444"
                strokeDasharray="2 2"
                strokeOpacity={0.3}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 mt-2">
        <span>
          <span className="text-purple-400">■</span> Probability Distribution
        </span>
        {showConfidenceIntervals && (
          <>
            <span>
              <span className="text-green-500">|</span> ±1σ ({formatPrice(sigma1Down)} - {formatPrice(sigma1Up)})
            </span>
            <span>
              <span className="text-red-500">|</span> ±2σ ({formatPrice(sigma2Down)} - {formatPrice(sigma2Up)})
            </span>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center mt-1">
        {isUsingCustomMove
          ? `Distribution based on your expected ±${currentExpectedMove.toFixed(1)}% move (market: ±${marketExpectedMove?.toFixed(1)}%)`
          : `Distribution based on ${(sigma * 100).toFixed(0)}% implied volatility`
        }
      </p>
    </div>
  );
}
