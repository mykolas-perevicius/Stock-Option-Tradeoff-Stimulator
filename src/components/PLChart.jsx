import React from 'react';
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
  Brush,
} from 'recharts';
import { formatCurrency, formatPrice } from '../utils/statistics';

/**
 * Main P&L visualization chart showing stock vs option payoff curves
 */
export default function PLChart({
  data,
  currentPrice,
  strikePrice,
  breakeven,
  minPrice,
  maxPrice,
  minPL,
  maxPL,
  showBrush = false,
  onBrushChange,
}) {
  // Custom tooltip formatter
  const tooltipFormatter = (value, name) => {
    return [formatCurrency(value), name];
  };

  const labelFormatter = (label) => `Price: ${formatPrice(label)}`;

  // Filter data to visible range
  const visibleData = data.filter(
    (d) => d.price >= minPrice && d.price <= maxPrice
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">P&L at Expiration</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={visibleData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="price"
            stroke="#9CA3AF"
            domain={[minPrice, maxPrice]}
            tickFormatter={(val) => `$${val}`}
            type="number"
          />
          <YAxis
            stroke="#9CA3AF"
            domain={[minPL, maxPL]}
            tickFormatter={(val) => formatCurrency(val, false)}
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
          <ReferenceLine
            y={0}
            stroke="#6B7280"
            strokeDasharray="5 5"
            label={{ value: 'Break Even', position: 'right', fill: '#6B7280', fontSize: 10 }}
          />
          <ReferenceLine
            x={currentPrice}
            stroke="#EAB308"
            strokeDasharray="3 3"
            label={{ value: 'Current', position: 'top', fill: '#EAB308', fontSize: 10 }}
          />
          <ReferenceLine
            x={strikePrice}
            stroke="#3B82F6"
            strokeDasharray="3 3"
            label={{ value: 'Strike', position: 'top', fill: '#3B82F6', fontSize: 10 }}
          />
          <ReferenceLine
            x={breakeven}
            stroke="#F97316"
            strokeDasharray="3 3"
            label={{ value: 'Breakeven', position: 'top', fill: '#F97316', fontSize: 10 }}
          />

          {/* P&L Lines */}
          <Line
            type="monotone"
            dataKey="stockPL"
            stroke="#10B981"
            strokeWidth={3}
            dot={false}
            name="Stock P&L"
          />
          <Line
            type="monotone"
            dataKey="optionPL"
            stroke="#F59E0B"
            strokeWidth={3}
            dot={false}
            name="Option P&L"
          />

          {/* Optional brush for zooming */}
          {showBrush && (
            <Brush
              dataKey="price"
              height={30}
              stroke="#6B7280"
              fill="#1F2937"
              onChange={onBrushChange}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend for reference lines */}
      <div className="flex justify-center gap-6 text-xs text-gray-400 mt-2">
        <span>
          <span className="text-yellow-500">---</span> Current: {formatPrice(currentPrice)}
        </span>
        <span>
          <span className="text-blue-500">---</span> Strike: {formatPrice(strikePrice)}
        </span>
        <span>
          <span className="text-orange-500">---</span> Breakeven: {formatPrice(breakeven)}
        </span>
      </div>
    </div>
  );
}
