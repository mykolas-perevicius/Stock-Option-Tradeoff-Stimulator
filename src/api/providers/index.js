/**
 * API Provider Registry
 * Central registry for all stock quote providers
 */

import { yahooProvider } from './yahoo.js';
import { yfinanceProvider } from './yfinance.js';
import { finnhubProvider } from './finnhub.js';
import { twelveDataProvider } from './twelveData.js';
import { alphaVantageProvider } from './alphaVantage.js';
import { fmpProvider } from './fmp.js';

// Provider registry - ordered by priority (no-key providers first)
export const providers = {
  yahoo: yahooProvider,
  yfinance: yfinanceProvider,
  finnhub: finnhubProvider,
  twelvedata: twelveDataProvider,
  alphavantage: alphaVantageProvider,
  fmp: fmpProvider,
};

// Provider list for UI dropdown (ordered: free first, then paid)
export const providerList = [
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    requiresApiKey: false,
    rateLimit: 'Unlimited*',
    description: 'Free, no API key required',
    badge: 'Free',
  },
  {
    id: 'yfinance',
    name: 'yfinance (Backend)',
    requiresApiKey: false,
    rateLimit: 'Unlimited',
    description: 'Python yfinance via our backend server',
    badge: 'Free',
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    requiresApiKey: true,
    rateLimit: '60/min',
    description: 'Real-time quotes with 15-min delay on free tier',
    signupUrl: 'https://finnhub.io/register',
  },
  {
    id: 'twelvedata',
    name: 'Twelve Data',
    requiresApiKey: true,
    rateLimit: '8/min',
    description: 'Real-time and historical data',
    signupUrl: 'https://twelvedata.com/register',
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    requiresApiKey: true,
    rateLimit: '25/day',
    description: 'Comprehensive stock data API',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
  },
  {
    id: 'fmp',
    name: 'Financial Modeling Prep',
    requiresApiKey: true,
    rateLimit: '500MB/month',
    description: 'Real-time quotes and financial statements',
    signupUrl: 'https://site.financialmodelingprep.com/developer/docs',
  },
];

// Default provider
export const DEFAULT_PROVIDER = 'yahoo';

// Storage key for persisting provider selection
export const PROVIDER_STORAGE_KEY = 'stock_quote_provider';
export const API_KEYS_STORAGE_KEY = 'stock_api_keys';

/**
 * Get provider by ID
 * @param {string} providerId - Provider identifier
 * @returns {object|null} Provider instance or null
 */
export function getProvider(providerId) {
  return providers[providerId] || null;
}

/**
 * Get provider info for UI display
 * @param {string} providerId - Provider identifier
 * @returns {object|null} Provider info or null
 */
export function getProviderInfo(providerId) {
  return providerList.find(p => p.id === providerId) || null;
}

/**
 * Check if provider requires API key
 * @param {string} providerId - Provider identifier
 * @returns {boolean}
 */
export function requiresApiKey(providerId) {
  const info = getProviderInfo(providerId);
  return info?.requiresApiKey ?? true;
}

/**
 * Get stored API keys from localStorage
 * @returns {object} Map of provider ID to API key
 */
export function getStoredApiKeys() {
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Store API key for a provider
 * @param {string} providerId - Provider identifier
 * @param {string} apiKey - API key to store
 */
export function storeApiKey(providerId, apiKey) {
  const keys = getStoredApiKeys();
  keys[providerId] = apiKey;
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Remove API key for a provider
 * @param {string} providerId - Provider identifier
 */
export function removeApiKey(providerId) {
  const keys = getStoredApiKeys();
  delete keys[providerId];
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Get stored provider selection
 * @returns {string} Provider ID
 */
export function getStoredProvider() {
  try {
    return localStorage.getItem(PROVIDER_STORAGE_KEY) || DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

/**
 * Store provider selection
 * @param {string} providerId - Provider identifier
 */
export function storeProvider(providerId) {
  localStorage.setItem(PROVIDER_STORAGE_KEY, providerId);
}

/**
 * Fetch quote using specified provider
 * @param {string} symbol - Stock symbol
 * @param {string} providerId - Provider to use
 * @param {string} apiKey - API key (if required)
 * @returns {Promise<object>} Quote data
 */
export async function fetchQuoteWithProvider(symbol, providerId, apiKey = null) {
  const provider = getProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // Check if API key is required but not provided
  if (requiresApiKey(providerId) && !apiKey) {
    throw new Error(`API key required for ${providerId}`);
  }

  return provider.fetchQuote(symbol, apiKey);
}

/**
 * Search symbols using specified provider
 * @param {string} query - Search query
 * @param {string} providerId - Provider to use
 * @param {string} apiKey - API key (if required)
 * @returns {Promise<array>} Search results
 */
export async function searchSymbolsWithProvider(query, providerId, apiKey = null) {
  const provider = getProvider(providerId);

  if (!provider || !provider.searchSymbols) {
    // Fall back to local search
    return localSymbolSearch(query);
  }

  if (requiresApiKey(providerId) && !apiKey) {
    return localSymbolSearch(query);
  }

  try {
    return await provider.searchSymbols(query, apiKey);
  } catch {
    return localSymbolSearch(query);
  }
}

/**
 * Local symbol search fallback
 */
function localSymbolSearch(query) {
  const symbols = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'AMD', name: 'AMD' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'BA', name: 'Boeing Co.' },
    { symbol: 'DIS', name: 'Walt Disney' },
  ];

  const q = query.toUpperCase();
  return symbols.filter(
    s => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
  );
}
