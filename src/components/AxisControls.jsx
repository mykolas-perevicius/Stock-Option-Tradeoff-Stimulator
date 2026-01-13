import React from 'react';
import { priceAtSigma } from '../utils/probability';

/**
 * Controls for adjusting chart axis bounds
 */
export default function AxisControls({
  currentPrice,
  strikePrice,
  breakeven,
  T,
  r,
  sigma,
  minPrice,
  maxPrice,
  minPL,
  maxPL,
  investmentAmount,
  onMinPriceChange,
  onMaxPriceChange,
  onMinPLChange,
  onMaxPLChange,
  onPresetChange,
}) {
  // Calculate preset ranges based on sigma
  const getPresetRange = (numSigma) => {
    const low = priceAtSigma(currentPrice, T, r, sigma, -numSigma);
    const high = priceAtSigma(currentPrice, T, r, sigma, numSigma);
    return { min: Math.max(0.01, low), max: high };
  };

  const presets = [
    { label: 'Super Focused', type: 'focused', description: 'Tight range around key prices' },
    { label: 'Conservative', sigmas: 1, description: '±1σ (68% range)' },
    { label: 'Normal', sigmas: 2, description: '±2σ (95% range)' },
    { label: 'Wide', sigmas: 3, description: '±3σ (99% range)' },
    { label: 'Full Range', sigmas: null, description: '0 to 2x price' },
  ];

  const handlePreset = (preset) => {
    if (preset.type === 'focused') {
      // Super Focused: tight range around current, strike, and breakeven
      const keyPrices = [currentPrice, strikePrice, breakeven].filter(p => p > 0);
      const minKey = Math.min(...keyPrices);
      const maxKey = Math.max(...keyPrices);
      const padding = (maxKey - minKey) * 0.15 || currentPrice * 0.05; // 15% padding or 5% of current
      onMinPriceChange(Math.round((minKey - padding) * 100) / 100);
      onMaxPriceChange(Math.round((maxKey + padding) * 100) / 100);
      // Tighter P&L range for focused view
      onMinPLChange(Math.round(-investmentAmount * 0.5));
      onMaxPLChange(Math.round(investmentAmount * 0.5));
    } else if (preset.sigmas) {
      const range = getPresetRange(preset.sigmas);
      onMinPriceChange(Math.round(range.min * 100) / 100);
      onMaxPriceChange(Math.round(range.max * 100) / 100);
      // Auto-adjust P&L based on price range
      onMinPLChange(Math.round(-investmentAmount));
      onMaxPLChange(Math.round(investmentAmount * 2));
    } else {
      // Full range
      onMinPriceChange(Math.round(currentPrice * 0.1 * 100) / 100);
      onMaxPriceChange(Math.round(currentPrice * 2 * 100) / 100);
      // Auto-adjust P&L based on price range
      onMinPLChange(Math.round(-investmentAmount));
      onMaxPLChange(Math.round(investmentAmount * 2));
    }
  };

  const handleReset = () => {
    const range = getPresetRange(2);
    onMinPriceChange(Math.round(range.min * 100) / 100);
    onMaxPriceChange(Math.round(range.max * 100) / 100);
    onMinPLChange(Math.round(-investmentAmount));
    onMaxPLChange(Math.round(investmentAmount * 2));
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Chart Range</h3>
        <button
          onClick={handleReset}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded transition-colors"
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Manual controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Price</label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => onMinPriceChange(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max Price</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min P&L</label>
          <input
            type="number"
            value={minPL}
            onChange={(e) => onMinPLChange(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="100"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max P&L</label>
          <input
            type="number"
            value={maxPL}
            onChange={(e) => onMaxPLChange(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="100"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Adjust the visible range to focus on likely outcomes. Presets based on implied volatility.
      </p>
    </div>
  );
}
