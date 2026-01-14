import { useState, useEffect } from 'react';
import {
  providerList,
  getStoredProvider,
  storeProvider,
  getStoredApiKeys,
  storeApiKey,
  removeApiKey,
  requiresApiKey,
} from '../api/providers/index.js';

/**
 * API Provider Selector Component
 * Dropdown to select stock quote provider with API key management
 */
export default function APIProviderSelector({
  selectedProvider,
  onProviderChange,
  apiKeys,
  onApiKeyChange,
  className = '',
}) {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  const currentProvider = providerList.find(p => p.id === selectedProvider) || providerList[0];
  const hasApiKey = apiKeys?.[selectedProvider];
  const needsKey = requiresApiKey(selectedProvider);

  const handleProviderSelect = (providerId) => {
    onProviderChange(providerId);
    storeProvider(providerId);
    setShowProviderMenu(false);

    // Show key input if provider needs key and doesn't have one
    if (requiresApiKey(providerId) && !apiKeys?.[providerId]) {
      setShowKeyInput(true);
      setKeyInput('');
    } else {
      setShowKeyInput(false);
    }
  };

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      storeApiKey(selectedProvider, keyInput.trim());
      onApiKeyChange({ ...apiKeys, [selectedProvider]: keyInput.trim() });
      setKeyInput('');
      setShowKeyInput(false);
    }
  };

  const handleRemoveKey = () => {
    removeApiKey(selectedProvider);
    const newKeys = { ...apiKeys };
    delete newKeys[selectedProvider];
    onApiKeyChange(newKeys);
  };

  const getStatusColor = () => {
    if (!needsKey) return 'text-green-400';
    if (hasApiKey) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStatusText = () => {
    if (!needsKey) return 'Ready';
    if (hasApiKey) return 'Connected';
    return 'Needs API Key';
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs text-gray-400 mb-1">Data Provider</label>

      {/* Provider Selector Button */}
      <button
        type="button"
        onClick={() => setShowProviderMenu(!showProviderMenu)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          {currentProvider.badge && (
            <span className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-400 rounded">
              {currentProvider.badge}
            </span>
          )}
          <span>{currentProvider.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showProviderMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Provider Dropdown Menu */}
      {showProviderMenu && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {providerList.map((provider) => {
            const isSelected = provider.id === selectedProvider;
            const providerHasKey = apiKeys?.[provider.id];
            const providerNeedsKey = provider.requiresApiKey;

            return (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
                  isSelected ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {provider.badge && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-400 rounded">
                        {provider.badge}
                      </span>
                    )}
                    <span className="text-sm text-white">{provider.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {providerNeedsKey ? (
                      providerHasKey ? (
                        <span className="text-xs text-green-400">Ready</span>
                      ) : (
                        <span className="text-xs text-yellow-400">Key needed</span>
                      )
                    ) : (
                      <span className="text-xs text-green-400">Free</span>
                    )}
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {provider.description} • {provider.rateLimit}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* API Key Input */}
      {needsKey && (showKeyInput || !hasApiKey) && (
        <div className="mt-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              {currentProvider.name} API Key
            </span>
            {currentProvider.signupUrl && (
              <a
                href={currentProvider.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Get free key →
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter API key..."
              className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            />
            <button
              onClick={handleSaveKey}
              disabled={!keyInput.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Connected Key Actions */}
      {needsKey && hasApiKey && !showKeyInput && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-green-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            API key saved
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowKeyInput(true)}
              className="text-gray-400 hover:text-white"
            >
              Change
            </button>
            <button
              onClick={handleRemoveKey}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showProviderMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProviderMenu(false)}
        />
      )}
    </div>
  );
}
