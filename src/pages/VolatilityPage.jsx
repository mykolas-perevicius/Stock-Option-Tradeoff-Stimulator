import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchQuote, fetchIV } from '../api/stockQuote';
import { yfinanceProvider } from '../api/providers/yfinance';
import {
  getAllVolatilities,
  IV_METHODS,
  realizedVolatility,
} from '../utils/volatilityCalculations';
import IVMethodsTable from '../components/volatility/IVMethodsTable';
import ExpectedMoveCalculator from '../components/volatility/ExpectedMoveCalculator';
import VolatilityChart from '../components/volatility/VolatilityChart';
import IVRankGauge from '../components/volatility/IVRankGauge';
import HistoricalMovesTable from '../components/volatility/HistoricalMovesTable';
import UserPredictionPanel from '../components/volatility/UserPredictionPanel';

/**
 * VolatilityPage - Protected page for IV and expected move analysis
 * Provides multiple volatility calculation methods and historical analysis
 */
export default function VolatilityPage() {
  const { user } = useAuth();

  // State
  const [symbol, setSymbol] = useState('AAPL');
  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stock data
  const [stockData, setStockData] = useState(null);
  const [marketIV, setMarketIV] = useState(30);

  // Historical data
  const [historicalData, setHistoricalData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');

  // Calculated volatilities
  const [allVolatilities, setAllVolatilities] = useState({});

  // Expected move calculator
  const [daysToExpiry, setDaysToExpiry] = useState(30);

  // Popular symbols for quick selection
  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'AMD'];

  // Load data for a symbol
  const handleLoadData = useCallback(async (sym) => {
    if (!sym) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch current quote
      const quote = await fetchQuote(sym, { provider: 'yfinance' });
      setStockData({
        symbol: sym.toUpperCase(),
        name: quote.name || sym.toUpperCase(),
        price: quote.price,
        change: quote.change || 0,
        changePercent: quote.changePercent || 0,
      });
      setSymbol(sym.toUpperCase());

      // Fetch IV from options chain
      const ivData = await fetchIV(sym);
      setMarketIV(ivData.iv);

      // Fetch historical data
      const history = await yfinanceProvider.fetchHistory(sym, selectedPeriod);
      setHistoricalData(history);

      // Calculate all volatilities
      const vols = getAllVolatilities({
        marketIV: ivData.iv,
        closePrices: history.closePrices,
        ohlcData: history.ohlcData,
      });
      setAllVolatilities(vols);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Load on period change if we have a symbol
  useEffect(() => {
    if (symbol && !isLoading) {
      handleLoadData(symbol);
    }
  }, [selectedPeriod]);

  // Load initial data
  useEffect(() => {
    handleLoadData('AAPL');
  }, []);

  // Calculate rolling volatility for chart
  const rollingVolatilityData = useMemo(() => {
    if (!historicalData?.closePrices || historicalData.closePrices.length < 60) {
      return [];
    }

    const data = [];
    const prices = historicalData.closePrices;
    const dates = historicalData.ohlcData?.map(d => d.date) || [];

    // Calculate 30-day rolling volatility
    for (let i = 30; i < prices.length; i++) {
      const windowPrices = prices.slice(i - 30, i + 1);
      const vol = realizedVolatility(windowPrices, 30);

      data.push({
        date: dates[i] || `Day ${i}`,
        vol30: Math.round(vol * 10) / 10,
        price: prices[i],
      });
    }

    return data;
  }, [historicalData]);

  // Calculate historical IVs for rank/percentile (using 30-day rolling vol as proxy)
  const historicalIVs = useMemo(() => {
    return rollingVolatilityData.map(d => d.vol30);
  }, [rollingVolatilityData]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Volatility Analysis</h1>
            <p className="text-gray-500 text-xs">
              Multi-method IV prediction and expected move analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Welcome, {user?.email}</span>
            <Link
              to="/options"
              className="px-4 py-2 text-sm bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors"
            >
              Options Analysis
            </Link>
            <Link
              to="/"
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back to Simulator
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Symbol Input Section */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 block mb-1">Stock Symbol</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadData(symbolInput)}
                  placeholder="Enter symbol..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => handleLoadData(symbolInput)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
            </div>

            {/* Period Selection */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Historical Period</label>
              <div className="flex gap-1">
                {['1y', '2y', '5y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      selectedPeriod === period
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Symbols */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Popular:</span>
            {popularSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSymbolInput(sym);
                  handleLoadData(sym);
                }}
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

          {/* Stock Info Display */}
          {stockData && (
            <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center gap-4">
              <div>
                <span className="text-lg font-bold text-white">{stockData.symbol}</span>
                <span className="text-gray-500 text-sm ml-2">{stockData.name}</span>
              </div>
              <div className="text-2xl font-bold">${stockData.price.toFixed(2)}</div>
              <div
                className={`text-sm ${
                  stockData.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stockData.change >= 0 ? '+' : ''}
                {stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
              </div>
              <div className="text-sm text-gray-500">
                Market IV: <span className="text-purple-400 font-medium">{marketIV.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded text-sm text-red-400">
              Error: {error}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        {stockData && (
          <>
            {/* IV Methods & IV Rank Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <IVMethodsTable
                  allVolatilities={allVolatilities}
                  marketIV={marketIV}
                />
              </div>
              <div>
                <IVRankGauge
                  currentIV={marketIV}
                  historicalIVs={historicalIVs}
                />
              </div>
            </div>

            {/* Expected Move Calculator */}
            <ExpectedMoveCalculator
              allVolatilities={allVolatilities}
              daysToExpiry={daysToExpiry}
              onDaysChange={setDaysToExpiry}
              currentPrice={stockData?.price || 100}
            />

            {/* User Prediction Panel */}
            <UserPredictionPanel
              symbol={symbol}
              currentPrice={stockData?.price || 100}
              marketIV={marketIV}
              allVolatilities={allVolatilities}
              daysToExpiry={daysToExpiry}
            />

            {/* Historical Volatility Chart */}
            <VolatilityChart
              data={rollingVolatilityData}
              marketIV={marketIV}
            />

            {/* Historical Move Analysis */}
            <HistoricalMovesTable
              historicalData={historicalData}
              daysToExpiry={daysToExpiry}
            />
          </>
        )}

        {/* Loading State */}
        {isLoading && !stockData && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading volatility data...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500 pb-4">
        <p>
          Volatility calculations for educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
