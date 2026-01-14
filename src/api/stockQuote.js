/**
 * Stock quote API - Multi-provider interface
 * Supports multiple data providers with fallback to Yahoo Finance
 */

import {
  fetchQuoteWithProvider,
  searchSymbolsWithProvider,
  getStoredProvider,
  getStoredApiKeys,
  DEFAULT_PROVIDER,
} from './providers/index.js';

import { yahooProvider } from './providers/yahoo.js';

/**
 * Fetch stock quote using the configured provider
 * Falls back to Yahoo Finance if the selected provider fails
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {object} options - Optional configuration
 * @param {string} options.provider - Provider ID to use (default: stored provider)
 * @param {object} options.apiKeys - API keys object (default: stored keys)
 * @returns {Promise<object>} Quote data
 */
export async function fetchQuote(symbol, options = {}) {
  const provider = options.provider || getStoredProvider();
  const apiKeys = options.apiKeys || getStoredApiKeys();
  const apiKey = apiKeys[provider];

  try {
    const quote = await fetchQuoteWithProvider(symbol, provider, apiKey);
    return quote;
  } catch (error) {
    console.warn(`Provider ${provider} failed:`, error.message);

    // If not already using Yahoo, fall back to it
    if (provider !== 'yahoo') {
      console.log('Falling back to Yahoo Finance');
      try {
        return await yahooProvider.fetchQuote(symbol);
      } catch (fallbackError) {
        console.warn('Yahoo fallback also failed:', fallbackError.message);
        throw error; // Throw original error
      }
    }

    throw error;
  }
}

/**
 * Search for stock symbols
 * @param {string} query - Search query
 * @param {object} options - Optional configuration
 * @returns {Promise<array>} Matching symbols
 */
export function searchSymbols(query, options = {}) {
  const provider = options.provider || getStoredProvider();
  const apiKeys = options.apiKeys || getStoredApiKeys();
  const apiKey = apiKeys[provider];

  return searchSymbolsWithProvider(query, provider, apiKey);
}

/**
 * Get estimated IV for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {number} Estimated IV percentage
 */
export function getEstimatedIV(symbol) {
  const ivEstimates = {
    // High IV (volatile stocks)
    TSLA: 55,
    NVDA: 50,
    AMD: 48,
    NFLX: 45,
    META: 40,

    // Medium IV
    AAPL: 24,
    MSFT: 22,
    GOOGL: 28,
    AMZN: 32,
    CRM: 35,

    // Low IV (stable stocks)
    JPM: 22,
    V: 20,
    JNJ: 18,
    WMT: 18,
    KO: 15,
    PG: 15,

    // ETFs (typically lower)
    SPY: 16,
    QQQ: 22,
    IWM: 24,
    DIA: 14,
  };

  return ivEstimates[symbol.toUpperCase()] || 30;
}

/**
 * Check if quote is live or fallback
 * @param {object} quote - Quote object
 * @returns {boolean}
 */
export function isLiveQuote(quote) {
  return quote?.live === true;
}

/**
 * Get the source/provider of a quote
 * @param {object} quote - Quote object
 * @returns {string} Source identifier
 */
export function getQuoteSource(quote) {
  return quote?.source || 'unknown';
}

// Re-export provider utilities for convenience
export {
  providerList,
  getStoredProvider,
  storeProvider,
  getStoredApiKeys,
  storeApiKey,
  removeApiKey,
  requiresApiKey,
  getProviderInfo,
  DEFAULT_PROVIDER,
} from './providers/index.js';
