import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency, formatPrice } from '../utils/statistics';
import { optionPrice } from '../utils/blackScholes';

/**
 * Animated P&L chart with time slider showing theta decay
 */
export default function AnimatedPLChart({
  currentPrice,
  strikePrice,
  daysToExpiry,
  r,
  sigma,
  isCall,
  investmentAmount,
  minPrice,
  maxPrice,
  minPL,
  maxPL,
  stockPosition = 'long',
  optionPosition = 'long',
}) {
  const [displayDays, setDisplayDays] = useState(daysToExpiry);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Reset displayDays when daysToExpiry changes
  useEffect(() => {
    setDisplayDays(daysToExpiry);
  }, [daysToExpiry]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setDisplayDays((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 150); // Speed of animation
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  // Calculate data for current display time
  const chartData = useMemo(() => {
    const T = Math.max(0.001, displayDays / 365);
    const steps = 60;
    const priceStep = (maxPrice - minPrice) / steps;
    const points = [];

    // Calculate position sizing based on original premium
    const originalT = Math.max(0.001, daysToExpiry / 365);
    const originalPremium = optionPrice(currentPrice, strikePrice, originalT, r, sigma, isCall);
    const contractsOwned = Math.max(1, Math.floor(investmentAmount / (originalPremium * 100)));
    const optionShares = contractsOwned * 100;
    const totalPremiumPaid = contractsOwned * originalPremium * 100;
    const sharesOwned = investmentAmount / currentPrice;

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + i * priceStep;

      // Stock P&L - depends on position direction
      let stockPL;
      if (stockPosition === 'long') {
        stockPL = sharesOwned * (price - currentPrice);
      } else {
        // Short stock: profit when price falls
        stockPL = sharesOwned * (currentPrice - price);
      }

      // Option value at current time
      const currentOptionPrice = optionPrice(price, strikePrice, T, r, sigma, isCall);
      const optionValue = currentOptionPrice * optionShares;

      // Option P&L - depends on position direction
      let optionPL;
      if (optionPosition === 'long') {
        optionPL = optionValue - totalPremiumPaid;
      } else {
        // Short option: receive premium, pay out option value
        optionPL = totalPremiumPaid - optionValue;
      }

      // At expiration (intrinsic only)
      let expirationIntrinsic;
      if (isCall) {
        expirationIntrinsic = Math.max(0, price - strikePrice) * optionShares;
      } else {
        expirationIntrinsic = Math.max(0, strikePrice - price) * optionShares;
      }

      let expirationPL;
      if (optionPosition === 'long') {
        expirationPL = expirationIntrinsic - totalPremiumPaid;
      } else {
        expirationPL = totalPremiumPaid - expirationIntrinsic;
      }

      points.push({
        price: Math.round(price * 100) / 100,
        stockPL: Math.round(stockPL),
        optionPL: Math.round(optionPL),
        expirationPL: Math.round(expirationPL),
      });
    }
    return points;
  }, [displayDays, daysToExpiry, currentPrice, strikePrice, r, sigma, isCall, investmentAmount, minPrice, maxPrice]);

  // Calculate breakeven at current time
  const currentBreakeven = useMemo(() => {
    const T = Math.max(0.001, displayDays / 365);
    const originalT = Math.max(0.001, daysToExpiry / 365);
    const originalPremium = optionPrice(currentPrice, strikePrice, originalT, r, sigma, isCall);

    if (isCall) {
      return strikePrice + originalPremium;
    } else {
      return strikePrice - originalPremium;
    }
  }, [displayDays, daysToExpiry, currentPrice, strikePrice, r, sigma, isCall]);

  const handleReset = () => {
    setDisplayDays(daysToExpiry);
    setIsPlaying(false);
  };

  const tooltipFormatter = (value, name) => [formatCurrency(value), name];
  const labelFormatter = (label) => `Price: ${formatPrice(label)}`;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <h2 className="text-lg font-semibold">P&L Over Time</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Days:</span>
          <span className="text-xl font-bold text-yellow-400 w-12">{displayDays}</span>
        </div>
      </div>

      {/* Time Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-medium transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={daysToExpiry}
          value={displayDays}
          onChange={(e) => {
            setDisplayDays(parseInt(e.target.value));
            setIsPlaying(false);
          }}
          className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-yellow-500"
        />
        <div className="flex gap-4 text-xs text-gray-400">
          <span>Expiration</span>
          <span>Today</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="price"
            stroke="#9CA3AF"
            domain={[minPrice, maxPrice]}
            tickFormatter={(val) => `$${val}`}
            type="number"
            fontSize={12}
          />
          <YAxis
            stroke="#9CA3AF"
            domain={[minPL, maxPL]}
            tickFormatter={(val) => formatCurrency(val, false)}
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={tooltipFormatter}
            labelFormatter={labelFormatter}
          />
          <Legend />

          {/* Reference Lines */}
          <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="5 5" />
          <ReferenceLine
            x={currentPrice}
            stroke="#EAB308"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            x={strikePrice}
            stroke="#3B82F6"
            strokeDasharray="3 3"
          />

          {/* Expiration P&L (faded) */}
          <Line
            type="monotone"
            dataKey="expirationPL"
            stroke="#F59E0B"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="At Expiration"
            opacity={0.4}
          />

          {/* Current Time P&L */}
          <Line
            type="monotone"
            dataKey="optionPL"
            stroke="#F59E0B"
            strokeWidth={3}
            dot={false}
            name={`Option (${displayDays}d)`}
          />

          {/* Stock P&L */}
          <Line
            type="monotone"
            dataKey="stockPL"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            name="Stock P&L"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Info */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 mt-2">
        <span>
          <span className="text-yellow-500">━</span> Current: ${currentPrice}
        </span>
        <span>
          <span className="text-blue-500">━</span> Strike: ${strikePrice}
        </span>
        <span className="text-gray-500">
          Dashed line = P&L at expiration
        </span>
      </div>

      {/* Time Decay Info */}
      {displayDays < daysToExpiry && (
        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/30 rounded text-sm text-yellow-400 text-center">
          ⏱ With {daysToExpiry - displayDays} days passed, time decay has eroded option value.
          {displayDays === 0 && " At expiration, only intrinsic value remains."}
        </div>
      )}
    </div>
  );
}
