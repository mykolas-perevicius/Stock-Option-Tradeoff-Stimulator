import React from 'react';
import { IV_METHODS } from '../../utils/volatilityCalculations';

/**
 * IVMethodsTable - Side-by-side comparison of all IV calculation methods
 */
export default function IVMethodsTable({ allVolatilities, marketIV }) {
  // Define the display order and formatting
  const methodsConfig = [
    { key: 'market', icon: '📊', highlight: true },
    { key: 'hist30', icon: '📅' },
    { key: 'hist90', icon: '📅' },
    { key: 'hist1y', icon: '📅' },
    { key: 'parkinson', icon: '📈' },
    { key: 'garmanKlass', icon: '📉' },
    { key: 'garch', icon: '🔮' },
  ];

  const formatDiff = (value, baseline) => {
    if (!value || !baseline) return null;
    const diff = value - baseline;
    const sign = diff >= 0 ? '+' : '';
    return {
      text: `${sign}${diff.toFixed(1)}%`,
      color: diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-gray-500',
      title: diff > 0 ? 'Higher than market (options more expensive)' : diff < 0 ? 'Lower than market (options cheaper)' : 'Same as market',
    };
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📐</span> IV Calculation Methods
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Method</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">IV</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">vs Market</th>
            </tr>
          </thead>
          <tbody>
            {methodsConfig.map(({ key, icon, highlight }) => {
              const method = IV_METHODS[key];
              const value = allVolatilities[key];
              const diff = key !== 'market' ? formatDiff(value, marketIV) : null;

              return (
                <tr
                  key={key}
                  className={`border-b border-gray-800 ${
                    highlight ? 'bg-purple-900/20' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className={highlight ? 'font-semibold text-purple-300' : ''}>
                        {method?.name || key}
                      </span>
                      {highlight && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-600 rounded">
                          Baseline
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-400 text-xs">
                    {method?.description || ''}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`font-mono font-medium ${
                        highlight ? 'text-purple-300' : 'text-white'
                      }`}
                    >
                      {value ? `${value.toFixed(1)}%` : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {diff ? (
                      <span className={`font-mono ${diff.color}`} title={diff.title}>
                        {diff.text}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="text-green-400">Green</span> = Lower than market (implied options may be overpriced)
          </div>
          <div>
            <span className="text-red-400">Red</span> = Higher than market (implied options may be underpriced)
          </div>
        </div>
      </div>
    </div>
  );
}
