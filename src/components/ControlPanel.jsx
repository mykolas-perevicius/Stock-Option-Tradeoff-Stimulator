import React, { useState, useEffect, useId } from 'react';
import { formatPrice } from '../utils/statistics';
import APIProviderSelector from './APIProviderSelector';

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
  // API Provider props
  selectedProvider,
  onProviderChange,
  apiKeys,
  onApiKeyChange,
  // Position props
  stockPosition,
  optionPosition,
  onStockPositionChange,
  onOptionPositionChange,
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
        <form onSubmit={handleSymbolSubmit} className="flex gap-2" aria-label="Stock symbol lookup">
          <div className="flex-1">
            <label htmlFor="symbol-input" className="block text-xs text-gray-400 mb-1">Stock Symbol</label>
            <div className="relative">
              <input
                id="symbol-input"
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="AAPL, TSLA, SPY..."
                aria-describedby="quote-status"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm uppercase pr-20"
              />
              {/* Status badge — announced to screen readers when it changes */}
              <span
                id="quote-status"
                role="status"
                aria-live="polite"
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-medium text-white ${getStatusColor()}`}
              >
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

      {/* Data Provider Selector - integrated into control panel */}
      {selectedProvider !== undefined && (
        <div className="mb-4">
          <APIProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={onProviderChange}
            apiKeys={apiKeys}
            onApiKeyChange={onApiKeyChange}
          />
        </div>
      )}

      {/* Quick stock buttons */}
      <div className="mb-4">
        <span id="popular-stocks-label" className="block text-xs text-gray-400 mb-1">Popular Stocks</span>
        <div role="group" aria-labelledby="popular-stocks-label" className="flex flex-wrap gap-2">
          {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY'].map((sym) => (
            <button
              key={sym}
              type="button"
              aria-pressed={symbol === sym}
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
          <label htmlFor="preset-select" className="block text-xs text-gray-400 mb-1">Educational Scenarios</label>
          <select
            id="preset-select"
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

      {/* Stock Position Toggle */}
      {stockPosition !== undefined && (
        <div className="mb-4">
          <span id="stock-position-label" className="block text-xs text-gray-400 mb-1">Stock Position</span>
          <div role="group" aria-labelledby="stock-position-label" className="flex rounded overflow-hidden border border-gray-600">
            <button
              type="button"
              aria-pressed={stockPosition === 'long'}
              onClick={() => onStockPositionChange('long')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                stockPosition === 'long'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Long Stock (Buy)
            </button>
            <button
              type="button"
              aria-pressed={stockPosition === 'short'}
              onClick={() => onStockPositionChange('short')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                stockPosition === 'short'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Short Stock (Sell)
            </button>
          </div>
          {/* Warning for short stock */}
          {stockPosition === 'short' && (
            <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded text-xs text-red-300">
              ⚠️ <strong>Short Stock:</strong> Maximum loss is theoretically UNLIMITED. Stock can rise indefinitely.
            </div>
          )}
        </div>
      )}

      {/* Option Position Selector (4-way) */}
      {optionPosition !== undefined && (
        <div className="mb-4">
          <span id="option-position-label" className="block text-xs text-gray-400 mb-1">Option Position</span>
          <div role="group" aria-labelledby="option-position-label" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={optionPosition === 'long' && isCall}
              onClick={() => { onOptionPositionChange('long'); onIsCallChange(true); }}
              className={`py-2 px-3 text-sm font-medium rounded border transition-colors ${
                optionPosition === 'long' && isCall
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Buy Call
            </button>
            <button
              type="button"
              aria-pressed={optionPosition === 'short' && isCall}
              onClick={() => { onOptionPositionChange('short'); onIsCallChange(true); }}
              className={`py-2 px-3 text-sm font-medium rounded border transition-colors ${
                optionPosition === 'short' && isCall
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Sell Call <span aria-label="warning">⚠️</span>
            </button>
            <button
              type="button"
              aria-pressed={optionPosition === 'long' && !isCall}
              onClick={() => { onOptionPositionChange('long'); onIsCallChange(false); }}
              className={`py-2 px-3 text-sm font-medium rounded border transition-colors ${
                optionPosition === 'long' && !isCall
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Buy Put
            </button>
            <button
              type="button"
              aria-pressed={optionPosition === 'short' && !isCall}
              onClick={() => { onOptionPositionChange('short'); onIsCallChange(false); }}
              className={`py-2 px-3 text-sm font-medium rounded border transition-colors ${
                optionPosition === 'short' && !isCall
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Sell Put
            </button>
          </div>
          {/* Warning for naked short call */}
          {optionPosition === 'short' && isCall && (
            <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded text-xs text-red-300">
              ⚠️ <strong>Naked Short Call:</strong> Maximum loss is theoretically UNLIMITED. The stock can rise indefinitely.
            </div>
          )}
          {/* Info for short put */}
          {optionPosition === 'short' && !isCall && (
            <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded text-xs text-yellow-300">
              ℹ️ <strong>Short Put:</strong> Maximum loss = (Strike - Premium) × 100 per contract. You may be assigned shares.
            </div>
          )}
        </div>
      )}

      {/* Legacy Call/Put Toggle - only show if position props not provided */}
      {optionPosition === undefined && (
        <div className="mb-4">
          <span id="option-type-label" className="block text-xs text-gray-400 mb-1">Option Type</span>
          <div role="group" aria-labelledby="option-type-label" className="flex rounded overflow-hidden border border-gray-600">
            <button
              type="button"
              aria-pressed={isCall}
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
              type="button"
              aria-pressed={!isCall}
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
      )}

      {/* Main inputs grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <NumberInput
          label="Stock Price $"
          value={currentPrice}
          onChange={onCurrentPriceChange}
          step={0.01}
          min={0.01}
        />
        <NumberInput
          label="Strike Price $"
          value={strikePrice}
          onChange={onStrikePriceChange}
          step={1}
          min={0.01}
        />
        <NumberInput
          label="Days to Expiry"
          value={daysToExpiry}
          onChange={onDaysToExpiryChange}
          step={1}
          min={1}
          max={730}
          integer
        />
        <NumberInput
          label="Risk-Free Rate %"
          value={riskFreeRate}
          onChange={onRiskFreeRateChange}
          step={0.1}
          min={0}
          max={20}
        />
        <NumberInput
          label="Investment $"
          value={investmentAmount}
          onChange={onInvestmentAmountChange}
          step={1000}
          min={100}
        />
      </div>
    </div>
  );
}

/**
 * Number input that:
 *  - Lets the user type freely (including transient empty / partial like "0.")
 *    without snapping back to a default mid-keystroke.
 *  - Only fires onChange when the value is a finite number — silently ignores
 *    junk like "1e999" → Infinity, "abc" → NaN.
 *  - Clamps to [min, max] only on blur, so typing "5" toward "50" doesn't
 *    bounce against a min of 10.
 */
function NumberInput({ label, value, onChange, step, min, max, integer = false }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const id = useId();

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const commit = (raw) => {
    if (raw === '' || raw === '-' || raw === '.') return;
    const n = integer ? parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(n)) return;
    let clamped = n;
    if (typeof min === 'number' && clamped < min) clamped = min;
    if (typeof max === 'number' && clamped > max) clamped = max;
    onChange(clamped);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        id={id}
        type="number"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          // Only push valid intermediate values upstream so charts redraw
          // live, but skip empties / partial typing.
          const n = Number(e.target.value);
          if (Number.isFinite(n)) commit(e.target.value);
        }}
        onBlur={(e) => {
          if (e.target.value === '' || !Number.isFinite(Number(e.target.value))) {
            // Empty / invalid on blur — restore last good value from prop.
            setDraft(String(value ?? ''));
          } else {
            commit(e.target.value);
          }
        }}
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
}
