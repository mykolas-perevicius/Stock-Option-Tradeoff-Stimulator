import React, { useState, useEffect, useCallback } from 'react';
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
} from 'recharts';
import { optionPrice } from '../utils/blackScholes';
import { formatCurrency, formatPrice } from '../utils/statistics';

/**
 * Time decay visualization showing how option P&L changes over time
 */
export default function TimeDecayChart({
  currentPrice,
  strikePrice,
  daysToExpiry,
  r,
  sigma,
  isCall,
  premium,
  optionShares,
  totalPremiumPaid,
  minPrice,
  maxPrice,
}) {
  const [viewDays, setViewDays] = useState(daysToExpiry);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(true);

  // Generate P&L data for a specific day
  const generatePLData = useCallback((days) => {
    const T = Math.max(0.001, days / 365);
    const points = [];
    const step = (maxPrice - minPrice) / 50;

    for (let price = minPrice; price <= maxPrice; price += step) {
      const currentOptionPrice = optionPrice(price, strikePrice, T, r, sigma, isCall);
      const optionPL = (currentOptionPrice * optionShares) - totalPremiumPaid;

      points.push({
        price: Math.round(price * 100) / 100,
        optionPL: Math.round(optionPL),
      });
    }

    return points;
  }, [strikePrice, r, sigma, isCall, optionShares, totalPremiumPaid, minPrice, maxPrice]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setViewDays((prev) => {
        if (prev <= 1) {
          setIsAnimating(false);
          return 1;
        }
        return prev - 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Current view data
  const currentData = generatePLData(viewDays);

  // Snapshot data for comparison
  const snapshots = showSnapshots
    ? [
        { days: daysToExpiry, color: '#10B981', label: `T (${daysToExpiry}d)` },
        { days: Math.max(1, Math.floor(daysToExpiry * 0.5)), color: '#3B82F6', label: `T/2 (${Math.floor(daysToExpiry * 0.5)}d)` },
        { days: Math.max(1, Math.floor(daysToExpiry * 0.25)), color: '#F59E0B', label: `T/4 (${Math.floor(daysToExpiry * 0.25)}d)` },
        { days: 1, color: '#EF4444', label: 'Expiry (1d)' },
      ].filter((s) => s.days <= daysToExpiry)
    : [];

  // Merge snapshot data
  const mergedData = currentData.map((point) => {
    const merged = { ...point };
    snapshots.forEach((snap) => {
      const snapData = generatePLData(snap.days);
      const snapPoint = snapData.find((p) => p.price === point.price);
      if (snapPoint) {
        merged[`pl_${snap.days}d`] = snapPoint.optionPL;
      }
    });
    return merged;
  });

  // Calculate current option value
  const currentT = Math.max(0.001, viewDays / 365);
  const currentOptionValue = optionPrice(currentPrice, strikePrice, currentT, r, sigma, isCall);
  const timeValueRemaining = Math.max(0, currentOptionValue - Math.max(0, isCall ? currentPrice - strikePrice : strikePrice - currentPrice));

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Time Decay (Theta)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              showSnapshots ? 'bg-purple-600' : 'bg-gray-700'
            }`}
          >
            Snapshots
          </button>
          <button
            onClick={() => {
              setViewDays(daysToExpiry);
              setIsAnimating(true);
            }}
            disabled={isAnimating}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded transition-colors"
          >
            {isAnimating ? 'Playing...' : 'Animate'}
          </button>
          {isAnimating && (
            <button
              onClick={() => setIsAnimating(false)}
              className="text-xs px-3 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Days slider */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Days to Expiration: {viewDays}</span>
          <span>Time Value: ${timeValueRemaining.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={1}
          max={daysToExpiry}
          value={viewDays}
          onChange={(e) => {
            setIsAnimating(false);
            setViewDays(Number(e.target.value));
          }}
          className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Expiration (1 day)</span>
          <span>Current ({daysToExpiry} days)</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={mergedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="price"
            stroke="#9CA3AF"
            tickFormatter={(val) => `$${val}`}
          />
          <YAxis
            stroke="#9CA3AF"
            tickFormatter={(val) => formatCurrency(val, false)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [formatCurrency(value), name]}
            labelFormatter={(label) => `Price: ${formatPrice(label)}`}
          />
          <Legend />

          <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="5 5" />
          <ReferenceLine x={currentPrice} stroke="#EAB308" strokeDasharray="3 3" />
          <ReferenceLine x={strikePrice} stroke="#3B82F6" strokeDasharray="3 3" />

          {/* Snapshot lines */}
          {showSnapshots &&
            snapshots.map((snap) => (
              <Line
                key={snap.days}
                type="monotone"
                dataKey={`pl_${snap.days}d`}
                stroke={snap.color}
                strokeWidth={snap.days === viewDays ? 3 : 1.5}
                strokeOpacity={snap.days === viewDays ? 1 : 0.5}
                dot={false}
                name={snap.label}
              />
            ))}

          {/* Current view line (if not matching a snapshot) */}
          {!snapshots.find((s) => s.days === viewDays) && (
            <Line
              type="monotone"
              dataKey="optionPL"
              stroke="#A855F7"
              strokeWidth={3}
              dot={false}
              name={`Current (${viewDays}d)`}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 text-center mt-2">
        Watch how the option P&L curve changes as time passes. The curve flattens near expiration.
      </p>
    </div>
  );
}
