import { useState } from 'react';
import { IV_METHODS } from '../utils/volatilityCalculations';

/**
 * IV Calculation Method Selector
 * Dropdown to select different volatility calculation methods
 */
export default function IVMethodSelector({
  selectedMethod,
  onMethodChange,
  volatilities = {},
  isLoadingHistory = false,
  historyError = null,
  className = '',
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const currentMethod = IV_METHODS[selectedMethod] || IV_METHODS.market;
  const currentVol = volatilities[selectedMethod];

  const handleMethodSelect = (methodId) => {
    onMethodChange(methodId);
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs text-gray-400 mb-1">
        IV Calculation Method
      </label>

      {/* Method Selector Button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-medium">{currentMethod.name}</span>
          {currentVol !== undefined && (
            <span className="text-gray-400">({currentVol.toFixed(1)}%)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoadingHistory && (
            <span className="text-blue-400 text-xs animate-pulse">Loading...</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Description */}
      <p className="text-xs text-gray-500 mt-1">
        {currentMethod.description}
      </p>

      {/* Error message */}
      {historyError && selectedMethod !== 'market' && (
        <p className="text-xs text-red-400 mt-1">
          {historyError} - Using market IV
        </p>
      )}

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {Object.values(IV_METHODS).map((method) => {
            const isSelected = method.id === selectedMethod;
            const methodVol = volatilities[method.id];
            const isAvailable = method.id === 'market' || !isLoadingHistory;

            return (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method.id)}
                disabled={!isAvailable}
                className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
                  isSelected ? 'bg-gray-700' : ''
                } ${!isAvailable ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{method.name}</span>
                    {method.requiresHistory && (
                      <span className="px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-400 rounded">
                        Historical
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {methodVol !== undefined && methodVol > 0 ? (
                      <span className="text-xs text-purple-400 font-mono">
                        {methodVol.toFixed(1)}%
                      </span>
                    ) : method.requiresHistory && isLoadingHistory ? (
                      <span className="text-xs text-gray-500">...</span>
                    ) : null}
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {method.description}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Volatility Comparison (when multiple methods have data) */}
      {Object.keys(volatilities).length > 1 && (
        <div className="mt-3 p-2 bg-gray-900/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">Volatility Comparison</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(volatilities)
              .filter(([_, vol]) => vol > 0)
              .map(([methodId, vol]) => (
                <div
                  key={methodId}
                  className={`flex justify-between items-center px-2 py-1 rounded ${
                    methodId === selectedMethod ? 'bg-purple-900/30 border border-purple-700' : 'bg-gray-800'
                  }`}
                >
                  <span className="text-gray-400">{IV_METHODS[methodId]?.name || methodId}</span>
                  <span className={`font-mono ${methodId === selectedMethod ? 'text-purple-400' : 'text-white'}`}>
                    {vol.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
