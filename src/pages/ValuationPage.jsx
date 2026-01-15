import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { yfinanceProvider } from '../api/providers/yfinance';
import {
  FundamentalsPanel,
  AnalystTargets,
  EarningsAnalysis,
  ScenarioSimulator,
  CorrelationFactors,
} from '../components/valuation';

/**
 * ValuationPage - Comprehensive valuation analysis and expected move estimation
 * Shows fundamental metrics, analyst targets, earnings analysis, and scenarios
 */
export default function ValuationPage() {
  const { user } = useAuth();

  // State
  const [symbol, setSymbol] = useState('');
  const [fundamentals, setFundamentals] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [currentIV, setCurrentIV] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active tab for mobile
  const [activeTab, setActiveTab] = useState('fundamentals');

  // Fetch all data when symbol changes
  useEffect(() => {
    if (!symbol) return;

    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [fundData, earningsData, histData] = await Promise.all([
          yfinanceProvider.fetchFundamentals(symbol),
          yfinanceProvider.fetchEarnings(symbol),
          yfinanceProvider.fetchHistory(symbol, '1y'),
        ]);

        if (isCancelled) return;

        setFundamentals(fundData);
        setEarnings(earningsData);
        setHistoricalData(histData);

        // Try to get current IV from options
        try {
          const optionsData = await yfinanceProvider.fetchOptionsChain(symbol);
          if (isCancelled) return;

          if (optionsData?.calls?.length) {
            // Get ATM options IV
            const price = optionsData.underlyingPrice || fundData.currentPrice;
            const atmCalls = optionsData.calls.filter(c =>
              Math.abs(c.strike - price) < price * 0.05
            );
            if (atmCalls.length > 0) {
              const avgIV = atmCalls.reduce((sum, c) => sum + (c.impliedVolatility || 0), 0) / atmCalls.length;
              if (avgIV > 0) setCurrentIV(avgIV);
            }
          }
        } catch {
          // Options data is optional
        }

      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to fetch valuation data');
          console.error('Valuation fetch error:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [symbol]);

  // Handle symbol search/submit
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    const input = e.target.symbol.value.trim().toUpperCase();
    if (input) {
      setSymbol(input);
    }
  };

  // Quick symbol buttons
  const quickSymbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'];

  const tabs = [
    { id: 'fundamentals', label: 'Fundamentals', icon: '📊' },
    { id: 'analyst', label: 'Analyst Targets', icon: '📈' },
    { id: 'earnings', label: 'Earnings', icon: '⚡' },
    { id: 'scenarios', label: 'Scenarios', icon: '🎯' },
    { id: 'correlation', label: 'Risk Factors', icon: '🔄' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold">Valuation Estimator</h1>
            <p className="text-gray-500 text-xs">
              Fundamental analysis and expected move estimation
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="text-sm text-gray-400">
                {user.email}
              </span>
            )}
            <Link
              to="/options"
              className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Options Analysis
            </Link>
            <Link
              to="/volatility"
              className="px-4 py-2 text-sm bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors"
            >
              Volatility
            </Link>
            <Link
              to="/"
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Simulator
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Symbol Input */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <form onSubmit={handleSymbolSubmit} className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stock Symbol</label>
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
                Analyze
              </button>
            </form>

            {/* Quick Symbols */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Quick:</span>
              {quickSymbols.map(sym => (
                <button
                  key={sym}
                  onClick={() => setSymbol(sym)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    symbol === sym
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Current Price Display */}
            {fundamentals?.currentPrice && (
              <div className="ml-auto flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Current Price</div>
                  <div className="text-2xl font-bold">${fundamentals.currentPrice.toFixed(2)}</div>
                </div>
                {fundamentals.change !== undefined && (
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Change</div>
                    <div className={`text-lg font-bold ${
                      fundamentals.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fundamentals.change >= 0 ? '+' : ''}{fundamentals.change?.toFixed(2)}%
                    </div>
                  </div>
                )}
                {currentIV && (
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Current IV</div>
                    <div className="text-lg font-bold text-purple-400">
                      {currentIV.toFixed(1)}%
                    </div>
                  </div>
                )}
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-400">Loading valuation data...</p>
          </div>
        )}

        {/* No Symbol Selected */}
        {!symbol && !loading && (
          <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 border border-blue-800/50 rounded-lg p-8 text-center">
            <span className="text-4xl mb-4 block">📊</span>
            <h2 className="text-xl font-bold text-blue-300 mb-2">Enter a Symbol to Get Started</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              Analyze any stock's fundamental valuation metrics, analyst price targets, historical
              earnings moves, and see scenario-based projections. Get insights into how fundamental
              changes typically affect stock prices.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {quickSymbols.slice(0, 4).map(sym => (
                <button
                  key={sym}
                  onClick={() => setSymbol(sym)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Analyze {sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content - Desktop Layout */}
        {symbol && fundamentals && !loading && (
          <>
            {/* Mobile Tab Navigation */}
            <div className="md:hidden flex gap-1 mb-4 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Tab Content */}
            <div className="md:hidden">
              {activeTab === 'fundamentals' && (
                <FundamentalsPanel fundamentals={fundamentals} />
              )}
              {activeTab === 'analyst' && (
                <AnalystTargets fundamentals={fundamentals} />
              )}
              {activeTab === 'earnings' && (
                <EarningsAnalysis
                  earnings={earnings}
                  historicalData={historicalData}
                  currentIV={currentIV}
                />
              )}
              {activeTab === 'scenarios' && (
                <ScenarioSimulator fundamentals={fundamentals} />
              )}
              {activeTab === 'correlation' && (
                <CorrelationFactors fundamentals={fundamentals} />
              )}
            </div>

            {/* Desktop Grid Layout */}
            <div className="hidden md:grid gap-6">
              {/* Top Row - Fundamentals and Analyst Targets */}
              <div className="grid grid-cols-2 gap-6">
                <FundamentalsPanel fundamentals={fundamentals} />
                <AnalystTargets fundamentals={fundamentals} />
              </div>

              {/* Middle Row - Earnings and Scenarios */}
              <div className="grid grid-cols-2 gap-6">
                <EarningsAnalysis
                  earnings={earnings}
                  historicalData={historicalData}
                  currentIV={currentIV}
                />
                <ScenarioSimulator fundamentals={fundamentals} />
              </div>

              {/* Bottom Row - Correlation/Risk Factors */}
              <CorrelationFactors fundamentals={fundamentals} />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500 pb-4">
        <p>
          Fundamental data from yfinance. Analyst targets and earnings history may vary by source.
          Educational purposes only, not financial advice.
        </p>
        <p className="mt-1 text-gray-600">
          Created by Mykolas Perevicius
        </p>
      </footer>
    </div>
  );
}
