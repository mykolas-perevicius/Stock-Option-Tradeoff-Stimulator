import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

/**
 * VolatilityChart - Historical rolling volatility line chart
 */
export default function VolatilityChart({ data, marketIV }) {
  const [showMarketIV, setShowMarketIV] = useState(true);

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📈</span> Historical Volatility Chart
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No historical data available. Load a symbol to see the chart.
        </div>
      </div>
    );
  }

  // Calculate min/max for Y axis
  const volValues = data.map((d) => d.vol30).filter((v) => v > 0);
  const minVol = Math.max(0, Math.min(...volValues) - 5);
  const maxVol = Math.max(...volValues) + 5;

  // Get current volatility (last point)
  const currentVol = data[data.length - 1]?.vol30;

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
        <p className="text-gray-400 mb-1">{formatDate(label)}</p>
        <p className="text-purple-400">
          30-day Vol: <span className="font-mono font-bold">{payload[0]?.value?.toFixed(1)}%</span>
        </p>
        {payload[1] && (
          <p className="text-gray-300">
            Price: <span className="font-mono">${payload[1]?.value?.toFixed(2)}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📈</span> Historical Volatility Chart
        </h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showMarketIV}
              onChange={(e) => setShowMarketIV(e.target.checked)}
              className="rounded text-purple-500"
            />
            <span className="text-gray-400">Show Market IV</span>
          </label>
          <div className="text-sm">
            <span className="text-gray-500">Current:</span>{' '}
            <span className="text-purple-400 font-medium">{currentVol?.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVol, maxVol]}
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Market IV reference line */}
            {showMarketIV && marketIV && (
              <ReferenceLine
                y={marketIV}
                stroke="#A855F7"
                strokeDasharray="5 5"
                label={{
                  value: `Market IV: ${marketIV.toFixed(1)}%`,
                  position: 'right',
                  fill: '#A855F7',
                  fontSize: 11,
                }}
              />
            )}

            {/* 30-day rolling volatility line */}
            <Line
              type="monotone"
              dataKey="vol30"
              name="30-day Rolling Vol"
              stroke="#A855F7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#A855F7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="mt-4 pt-3 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Current</span>
          <div className="text-purple-400 font-medium">{currentVol?.toFixed(1)}%</div>
        </div>
        <div>
          <span className="text-gray-500">Average</span>
          <div className="text-white">
            {(volValues.reduce((a, b) => a + b, 0) / volValues.length).toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-gray-500">Min</span>
          <div className="text-green-400">{Math.min(...volValues).toFixed(1)}%</div>
        </div>
        <div>
          <span className="text-gray-500">Max</span>
          <div className="text-red-400">{Math.max(...volValues).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
