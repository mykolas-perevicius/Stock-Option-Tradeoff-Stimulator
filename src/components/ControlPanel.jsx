import React, { useState, useEffect } from 'react';
import { formatPrice } from '../utils/statistics';

/**
 * Main control panel for simulation parameters
 */
export default function ControlPanel({
  currentPrice,
  strikePrice,
  daysToExpiry,
  riskFreeRate,
  investmentAmount,
  isCall,
  symbol,
  quoteStatus, // 'live', 'fallback', 'loading', 'error'
  quoteName,
  quoteChange,
  quoteChangePercent,
  onCurrentPriceChange,
  onStrikePriceChange,
  onDaysToExpiryChange,
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
  const [symbolInput, setSymbolInput] = useState(symbol || 'AAPL');

  // Sync symbol input when symbol prop changes
  useEffect(() => {
    if (symbol) setSymbolInput(symbol);
  }, [symbol]);

  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      onSymbolChange(symbolInput.trim().toUpperCase());
      onLoadQuote(symbolInput.trim().toUpperCase());
    }
  };

  // Status badge color
  const getStatusColor = () => {
    switch (quoteStatus) {
      case 'live': return 'bg-green-500';
      case 'fallback': return 'bg-yellow-500';
      case 'loading': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (quoteStatus) {
      case 'live': return 'Live';
      case 'fallback': return 'Offline';
      case 'loading': return 'Loading...';
      case 'error': return 'Error';
      default: return 'Manual';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      {/* Symbol search with status */}
      <div className="mb-4">
        <form onSubmit={handleSymbolSubmit} className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Stock Symbol</label>
            <div className="relative">
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="AAPL, TSLA, SPY..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm uppercase pr-20"
              />
              {/* Status badge */}
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-medium text-white ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
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

        {/* Quote info display */}
        {symbol && currentPrice > 0 && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-white font-bold">{symbol}</span>
            {quoteName && <span className="text-gray-400">{quoteName}</span>}
            <span className="text-white font-mono">${currentPrice.toFixed(2)}</span>
            {quoteChange !== undefined && quoteChange !== 0 && (
              <span className={quoteChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                {quoteChange >= 0 ? '+' : ''}{quoteChange.toFixed(2)} ({quoteChangePercent >= 0 ? '+' : ''}{quoteChangePercent?.toFixed(2)}%)
              </span>
            )}
            {lastUpdated && (
              <span className="text-gray-500 text-xs">Updated: {lastUpdated}</span>
            )}
          </div>
        )}
      </div>

      {/* Quick stock buttons */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Popular Stocks</label>
        <div className="flex flex-wrap gap-2">
          {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSymbolInput(sym);
                onSymbolChange(sym);
                onLoadQuote(sym);
              }}
              disabled={isLoading}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                symbol === sym
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Presets dropdown */}
      {presets && presets.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Educational Scenarios</label>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
    </div>
  );
}
