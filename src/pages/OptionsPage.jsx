import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useVolatilityPrediction } from '../contexts/VolatilityPredictionContext';
import { yfinanceProvider } from '../api/providers/yfinance';
import {
  OptionsChainTable,
  StrategyRecommendations,
  ScenarioComparison,
  HistoricalAccuracy,
} from '../components/options';

/**
 * OptionsPage - Comprehensive options analysis using volatility predictions
 * Shows options chain, strategy recommendations, and historical accuracy
 */
export default function OptionsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { prediction } = useVolatilityPrediction();

  // Get initial values from navigation state or context
  const initialState = location.state || prediction;

  // Local state
  const [symbol, setSymbol] = useState(initialState?.symbol || '');
  const [currentPrice, setCurrentPrice] = useState(initialState?.currentPrice || null);
  const [userIV, setUserIV] = useState(initialState?.userIV || 30);
  const [marketIV, setMarketIV] = useState(initialState?.marketIV || 30);
  const [daysToExpiry, setDaysToExpiry] = useState(initialState?.daysToExpiry || 30);

  // Data states
  const [optionsData, setOptionsData] = useState(null);
  const [expirations, setExpirations] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('chain');

  // Latest-request guard against stale-response races when the user types a
  // new symbol or picks a new expiry before the previous fetches finish.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!symbol) return;
    const reqId = ++requestIdRef.current;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const chain = await yfinanceProvider.fetchOptionsChain(symbol, selectedExpiry);
        if (reqId !== requestIdRef.current) return;
        setOptionsData(chain);
        setExpirations(chain.expirations || []);
        setCurrentPrice(chain.underlyingPrice);

        if (!selectedExpiry && chain.expirations?.length > 0) {
          // Backend already picks ~30 days out via _pick_target_expiration;
          // mirror the choice from chain.expiry rather than [0] which is the
          // 0-DTE weekly on Fridays.
          setSelectedExpiry(chain.expiry || chain.expirations[0]);
        }

        if (chain.expiry) {
          const expiryDate = new Date(chain.expiry);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysToExpiry(Math.max(1, diffDays));
        }

        const history = await yfinanceProvider.fetchHistory(symbol, '1y');
        if (reqId !== requestIdRef.current) return;
        setHistoricalData(history);

      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        setError(err.message || 'Failed to fetch options data');
        console.error('Options fetch error:', err);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    };

    fetchData();
  }, [symbol, selectedExpiry]);

  // Handle symbol search/submit
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    const input = e.target.symbol.value.trim().toUpperCase();
    if (input) {
      setSymbol(input);
    }
  };

  // Handle expiration change
  const handleExpiryChange = (newExpiry) => {
    setSelectedExpiry(newExpiry);
  };

  // Calculate average market IV from options chain
  const calculatedMarketIV = useMemo(() => {
    if (!optionsData?.calls?.length) return marketIV;

    // Get ATM options IV
    const atmCalls = optionsData.calls.filter(c =>
      Math.abs(c.strike - currentPrice) < currentPrice * 0.02
    );

    if (atmCalls.length === 0) return marketIV;

    const avgIV = atmCalls.reduce((sum, c) => sum + (c.impliedVolatility || 0), 0) / atmCalls.length;
    return avgIV > 0 ? avgIV : marketIV;
  }, [optionsData, currentPrice, marketIV]);

  // Update market IV when calculated
  useEffect(() => {
    if (calculatedMarketIV !== marketIV && calculatedMarketIV > 0) {
      setMarketIV(calculatedMarketIV);
    }
  }, [calculatedMarketIV]);

  const tabs = [
    { id: 'chain', label: 'Options Chain', icon: '📊' },
    { id: 'strategies', label: 'Strategy Ideas', icon: '💡' },
    { id: 'scenarios', label: 'Scenarios', icon: '📈' },
    { id: 'accuracy', label: 'Historical', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0 mr-3">
            <h1 className="text-base sm:text-xl font-bold">Options Analysis</h1>
            <p className="text-gray-500 text-[11px] sm:text-xs hidden sm:block">
              Compare your volatility prediction to market pricing
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {user?.email && (
              <span className="text-xs sm:text-sm text-gray-400 hidden md:inline">{user.email}</span>
            )}
            <Link
              to="/volatility"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors"
            >
              Volatility
            </Link>
            <Link
              to="/"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Simulator
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-2 sm:p-4">
        {/* Symbol Input and Settings */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Symbol Input */}
            <form onSubmit={handleSymbolSubmit} className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                <input
                  type="text"
                  name="symbol"
                  defaultValue={symbol}
                  placeholder="AAPL"
                  className="w-28 bg-gray-800 border border-gray-600 rounded px-3 py-2 uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              >
                Load
              </button>
            </form>

            {/* Expiration Selector */}
            {expirations.length > 0 && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Expiration</label>
                <select
                  value={selectedExpiry || ''}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
                >
                  {expirations.map(exp => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>
            )}

            {/* User IV Input */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Your IV (%)</label>
              <input
                type="number"
                value={userIV}
                onChange={(e) => setUserIV(Number(e.target.value))}
                min="1"
                max="200"
                step="0.1"
                className="w-24 bg-gray-800 border border-gray-600 rounded px-3 py-2"
              />
            </div>

            {/* Quick Info */}
            {currentPrice && (
              <div className="flex items-center gap-6 ml-auto">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Price</div>
                  <div className="text-lg font-bold">${currentPrice.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Market IV</div>
                  <div className="text-lg font-bold text-gray-300">{marketIV.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Your IV</div>
                  <div className="text-lg font-bold text-purple-400">{userIV.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">DTE</div>
                  <div className="text-lg font-bold">{daysToExpiry}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-400">Loading options data...</p>
          </div>
        )}

        {/* No Symbol Selected */}
        {!symbol && !loading && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-lg p-8 text-center">
            <span className="text-4xl mb-4 block">📊</span>
            <h2 className="text-xl font-bold text-purple-300 mb-2">Enter a Symbol to Get Started</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-4">
              Enter a stock symbol above to load its options chain and analyze it against your volatility prediction.
            </p>
            {prediction?.symbol && (
              <button
                onClick={() => {
                  setSymbol(prediction.symbol);
                  setUserIV(prediction.userIV || 30);
                  setMarketIV(prediction.marketIV || 30);
                }}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                Load {prediction.symbol} from Volatility Page
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        {symbol && optionsData && !loading && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-700 pb-3 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
              {activeTab === 'chain' && (
                <OptionsChainTable
                  optionsData={optionsData}
                  underlyingPrice={currentPrice}
                  userIV={userIV}
                  marketIV={marketIV}
                  daysToExpiry={daysToExpiry}
                />
              )}

              {activeTab === 'strategies' && (
                <StrategyRecommendations
                  underlyingPrice={currentPrice}
                  userIV={userIV}
                  marketIV={marketIV}
                  daysToExpiry={daysToExpiry}
                  optionsData={optionsData}
                />
              )}

              {activeTab === 'scenarios' && (
                <ScenarioComparison
                  underlyingPrice={currentPrice}
                  userIV={userIV}
                  marketIV={marketIV}
                  daysToExpiry={daysToExpiry}
                />
              )}

              {activeTab === 'accuracy' && (
                <HistoricalAccuracy
                  symbol={symbol}
                  userIV={userIV}
                  marketIV={marketIV}
                  historicalData={historicalData}
                  daysToExpiry={daysToExpiry}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500 pb-4">
        <p>
          Options data from yfinance. Theoretical prices use Black-Scholes model.
          Educational purposes only, not financial advice.
        </p>
      </footer>
    </div>
  );
}
