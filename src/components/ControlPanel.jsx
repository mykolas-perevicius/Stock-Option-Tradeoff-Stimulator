import React, { useState } from 'react';
import { formatPrice } from '../utils/statistics';

/**
 * Main control panel for simulation parameters
 */
export default function ControlPanel({
  currentPrice,
  strikePrice,
  daysToExpiry,
  impliedVol,
  riskFreeRate,
  investmentAmount,
  isCall,
  symbol,
  onCurrentPriceChange,
  onStrikePriceChange,
  onDaysToExpiryChange,
  onImpliedVolChange,
  onRiskFreeRateChange,
  onInvestmentAmountChange,
  onIsCallChange,
  onSymbolChange,
  onLoadQuote,
  isLoading,
  lastUpdated,
  presets,
  onLoadPreset,
}) {
  const [symbolInput, setSymbolInput] = useState(symbol || '');

  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      onSymbolChange(symbolInput.trim().toUpperCase());
      onLoadQuote(symbolInput.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      {/* Symbol search */}
      <div className="mb-4">
        <form onSubmit={handleSymbolSubmit} className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Stock Symbol</label>
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="AAPL, TSLA, SPY..."
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm uppercase"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </form>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Presets dropdown */}
      {presets && presets.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Load Example</label>
          <select
            onChange={(e) => e.target.value && onLoadPreset(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm"
            defaultValue=""
          >
            <option value="">Select a preset scenario...</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Call/Put Toggle */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Option Type</label>
        <div className="flex rounded overflow-hidden border border-gray-600">
          <button
            onClick={() => onIsCallChange(true)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              isCall
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Call (Bullish)
          </button>
          <button
            onClick={() => onIsCallChange(false)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              !isCall
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Put (Bearish)
          </button>
        </div>
      </div>

      {/* Main inputs grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Stock Price $</label>
          <input
            type="number"
            value={currentPrice}
            onChange={(e) => onCurrentPriceChange(Number(e.target.value) || 100)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="0.01"
            min="0.01"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Strike Price $</label>
          <input
            type="number"
            value={strikePrice}
            onChange={(e) => onStrikePriceChange(Number(e.target.value) || 100)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="0.01"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Days to Expiry</label>
          <input
            type="number"
            value={daysToExpiry}
            onChange={(e) => onDaysToExpiryChange(Number(e.target.value) || 30)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="1"
            max="730"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">IV %</label>
          <input
            type="number"
            value={impliedVol}
            onChange={(e) => onImpliedVolChange(Number(e.target.value) || 30)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1"
            min="1"
            max="200"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Risk-Free Rate %</label>
          <input
            type="number"
            value={riskFreeRate}
            onChange={(e) => onRiskFreeRateChange(Number(e.target.value) || 5)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="0.1"
            min="0"
            max="20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Investment $</label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => onInvestmentAmountChange(Number(e.target.value) || 10000)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
            step="1000"
            min="100"
          />
        </div>
      </div>

      {/* IV Slider */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Implied Volatility: {impliedVol}%
          <span className="text-gray-500 ml-2">
            ({impliedVol < 25 ? 'Low' : impliedVol < 50 ? 'Normal' : impliedVol < 75 ? 'High' : 'Very High'})
          </span>
        </label>
        <input
          type="range"
          min={5}
          max={150}
          value={impliedVol}
          onChange={(e) => onImpliedVolChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5%</span>
          <span>50%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>
    </div>
  );
}
