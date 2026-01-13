import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// Utils
import { optionPrice, intrinsicValue, timeValue, breakevenPrice } from './utils/blackScholes';
import { calcAllGreeks } from './utils/greeks';
import { stockProbability, generatePriceRange, priceAtSigma } from './utils/probability';
import { calculateStats, formatCurrency, formatPrice } from './utils/statistics';
import { parseURLParams, exportToPNG, exportToCSV, exportToPDF, copyShareableURL } from './utils/exportHelpers';

// Components
import ControlPanel from './components/ControlPanel';
import AxisControls from './components/AxisControls';
import PLChart from './components/PLChart';
import ProbabilityChart from './components/ProbabilityChart';
import GreeksPanel from './components/GreeksPanel';
import RiskRewardPanel from './components/RiskRewardPanel';
import TimeDecayChart from './components/TimeDecayChart';
import ScenarioPanel from './components/ScenarioPanel';
import ExportMenu from './components/ExportMenu';
import MultiStrikePanel from './components/MultiStrikePanel';
import AIInterpretation from './components/AIInterpretation';
import AnimatedPLChart from './components/AnimatedPLChart';

// Data
import { presets, getPresetById } from './data/presets';
import { fetchQuote, getEstimatedIV } from './api/stockQuote';
import { loadGroqApiKey } from './api/groqApi';

export default function App() {
  // Main parameters
  const [currentPrice, setCurrentPrice] = useState(175);
  const [strikePrice, setStrikePrice] = useState(180);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [impliedVol, setImpliedVol] = useState(28);
  const [riskFreeRate, setRiskFreeRate] = useState(5);
  const [investmentAmount, setInvestmentAmount] = useState(10000);
  const [isCall, setIsCall] = useState(true);
  const [symbol, setSymbol] = useState('AAPL');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'greeks', 'scenarios'

  // Expected move override (null = use IV-implied volatility)
  const [expectedMoveOverride, setExpectedMoveOverride] = useState(null);

  // Quote status
  const [quoteStatus, setQuoteStatus] = useState('manual'); // 'live', 'fallback', 'loading', 'error', 'manual'
  const [quoteName, setQuoteName] = useState('');
  const [quoteChange, setQuoteChange] = useState(0);
  const [quoteChangePercent, setQuoteChangePercent] = useState(0);

  // Axis controls
  const [minPrice, setMinPrice] = useState(140);
  const [maxPrice, setMaxPrice] = useState(210);
  const [minPL, setMinPL] = useState(-10000);
  const [maxPL, setMaxPL] = useState(20000);

  // Refs for export
  const chartRef = useRef(null);

  // Derived values
  const T = Math.max(0.001, daysToExpiry / 365);
  const baseImpliedVol = Math.max(0.01, impliedVol / 100);
  const r = riskFreeRate / 100;

  // Calculate IV-implied expected move (for display and as baseline)
  const impliedMovePercent = baseImpliedVol * Math.sqrt(T) * 100;

  // If user overrides expected move, calculate equivalent sigma
  // expectedMove% = sigma * sqrt(T) * 100, so sigma = expectedMove% / (sqrt(T) * 100)
  const sigma = expectedMoveOverride !== null
    ? Math.max(0.01, expectedMoveOverride / (Math.sqrt(T) * 100))
    : baseImpliedVol;

  // Calculate option price using Black-Scholes
  const premium = useMemo(() => {
    const price = optionPrice(currentPrice, strikePrice, T, r, sigma, isCall);
    return Math.max(0.01, Math.round(price * 100) / 100);
  }, [currentPrice, strikePrice, T, r, sigma, isCall]);

  const intrinsic = intrinsicValue(currentPrice, strikePrice, isCall);
  const timeVal = Math.max(0, Math.round((premium - intrinsic) * 100) / 100);
  const breakeven = breakevenPrice(strikePrice, premium, isCall);

  // Position sizing
  const sharesOwned = investmentAmount / currentPrice;
  const contractsOwned = Math.max(1, Math.floor(investmentAmount / (premium * 100)));
  const optionShares = contractsOwned * 100;
  const totalPremiumPaid = contractsOwned * premium * 100;

  // Greeks
  const greeks = useMemo(() => {
    return calcAllGreeks(currentPrice, strikePrice, T, r, sigma, isCall);
  }, [currentPrice, strikePrice, T, r, sigma, isCall]);

  // Generate chart data
  const chartData = useMemo(() => {
    const steps = 100;
    const priceStep = (maxPrice - minPrice) / steps;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + i * priceStep;
      const prob = stockProbability(price, currentPrice, T, r, sigma) * priceStep;

      const stockPL = sharesOwned * (price - currentPrice);

      let optionIntrinsic;
      if (isCall) {
        optionIntrinsic = Math.max(0, price - strikePrice) * optionShares;
      } else {
        optionIntrinsic = Math.max(0, strikePrice - price) * optionShares;
      }
      const optionPL = optionIntrinsic - totalPremiumPaid;

      points.push({
        price: Math.round(price * 100) / 100,
        probability: Math.round(prob * 10000) / 100,
        stockPL: Math.round(stockPL),
        optionPL: Math.round(optionPL),
      });
    }

    return points;
  }, [minPrice, maxPrice, currentPrice, strikePrice, T, r, sigma, isCall, sharesOwned, optionShares, totalPremiumPaid]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateStats(chartData, {
      currentPrice,
      strikePrice,
      premium,
      investmentAmount,
      sharesOwned,
      optionShares,
      totalPremiumPaid,
      T,
      r,
      sigma,
      isCall,
    });
  }, [chartData, currentPrice, strikePrice, premium, investmentAmount, sharesOwned, optionShares, totalPremiumPaid, T, r, sigma, isCall]);

  // Generate SEPARATE probability distribution data (independent of P&L chart range)
  // This uses its own range based on ±3 sigma to show the full distribution
  const probabilityData = useMemo(() => {
    const steps = 150;
    // Calculate sigma-based range (±3 standard deviations covers 99.7% of distribution)
    const sigmaMove = currentPrice * sigma * Math.sqrt(T);
    const probMinPrice = Math.max(currentPrice * 0.5, currentPrice - 3 * sigmaMove);
    const probMaxPrice = currentPrice + 3 * sigmaMove;
    const priceStep = (probMaxPrice - probMinPrice) / steps;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const price = probMinPrice + i * priceStep;
      const prob = stockProbability(price, currentPrice, T, r, sigma) * priceStep;

      points.push({
        price: Math.round(price * 100) / 100,
        probability: Math.round(prob * 10000) / 100,
      });
    }

    return {
      data: points,
      minPrice: probMinPrice,
      maxPrice: probMaxPrice,
    };
  }, [currentPrice, T, r, sigma]);

  // Update axis range when parameters change - default to focused view
  useEffect(() => {
    // Focus on key prices: current, strike, and breakeven
    const keyPrices = [currentPrice, strikePrice, breakeven].filter(p => p > 0);
    const minKey = Math.min(...keyPrices);
    const maxKey = Math.max(...keyPrices);
    const priceRange = maxKey - minKey;
    const padding = Math.max(priceRange * 0.2, currentPrice * 0.03); // 20% padding or min 3%

    setMinPrice(Math.round((minKey - padding) * 100) / 100);
    setMaxPrice(Math.round((maxKey + padding) * 100) / 100);

    // Tighter P&L range focused on realistic outcomes
    setMinPL(Math.round(-totalPremiumPaid * 1.2)); // Slightly below max option loss
    setMaxPL(Math.round(totalPremiumPaid * 1.5)); // Moderate upside
  }, [currentPrice, strikePrice, breakeven, totalPremiumPaid]);

  // Load URL parameters and initialize on mount
  useEffect(() => {
    // Load Groq API key from localStorage
    loadGroqApiKey();

    const urlParams = parseURLParams();
    if (urlParams) {
      setCurrentPrice(urlParams.currentPrice);
      setStrikePrice(urlParams.strikePrice);
      setDaysToExpiry(urlParams.daysToExpiry);
      setImpliedVol(urlParams.impliedVol);
      setRiskFreeRate(urlParams.riskFreeRate);
      setInvestmentAmount(urlParams.investmentAmount);
      setIsCall(urlParams.isCall);
    } else {
      // Load default quote on mount
      handleLoadQuote('AAPL');
    }
  }, []);

  // Load quote from API
  const handleLoadQuote = useCallback(async (sym) => {
    setIsLoading(true);
    setQuoteStatus('loading');
    try {
      const quote = await fetchQuote(sym);
      setCurrentPrice(Math.round(quote.price * 100) / 100);
      setSymbol(sym);
      setQuoteName(quote.name || '');
      setQuoteChange(quote.change || 0);
      setQuoteChangePercent(quote.changePercent || 0);
      setQuoteStatus(quote.live ? 'live' : 'fallback');

      // Set strike slightly OTM
      const roundedPrice = Math.round(quote.price);
      setStrikePrice(isCall ? roundedPrice + 5 : roundedPrice - 5);

      // Estimate IV
      const estimatedIV = getEstimatedIV(sym);
      setImpliedVol(estimatedIV);

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to load quote:', error);
      setQuoteStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [isCall]);

  // Load preset
  const handleLoadPreset = useCallback((presetId) => {
    const preset = getPresetById(presetId);
    if (preset) {
      setCurrentPrice(preset.params.currentPrice);
      setStrikePrice(preset.params.strikePrice);
      setDaysToExpiry(preset.params.daysToExpiry);
      setImpliedVol(preset.params.impliedVol);
      setRiskFreeRate(preset.params.riskFreeRate);
      setInvestmentAmount(preset.params.investmentAmount);
      setIsCall(preset.params.isCall);
      setSymbol('');
      setLastUpdated(null);
    }
  }, []);

  // Export handlers
  const handleExportPNG = useCallback(async () => {
    if (chartRef.current) {
      await exportToPNG(chartRef.current, `options-chart-${symbol || 'simulation'}.png`);
    }
  }, [symbol]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(chartData, {
      currentPrice,
      strikePrice,
      daysToExpiry,
      impliedVol,
      riskFreeRate,
      investmentAmount,
      isCall,
    }, `options-data-${symbol || 'simulation'}.csv`);
  }, [chartData, currentPrice, strikePrice, daysToExpiry, impliedVol, riskFreeRate, investmentAmount, isCall, symbol]);

  const handleExportPDF = useCallback(async () => {
    await exportToPDF({
      params: {
        currentPrice,
        strikePrice,
        daysToExpiry,
        impliedVol,
        riskFreeRate,
        investmentAmount,
        isCall,
      },
      stats,
      greeks,
    }, `options-report-${symbol || 'simulation'}.pdf`);
  }, [currentPrice, strikePrice, daysToExpiry, impliedVol, riskFreeRate, investmentAmount, isCall, stats, greeks, symbol]);

  const handleCopyURL = useCallback(async () => {
    await copyShareableURL({
      currentPrice,
      strikePrice,
      daysToExpiry,
      impliedVol,
      riskFreeRate,
      investmentAmount,
      isCall,
    });
  }, [currentPrice, strikePrice, daysToExpiry, impliedVol, riskFreeRate, investmentAmount, isCall]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Stock vs Options Simulator</h1>
            <p className="text-gray-500 text-xs">Black-Scholes pricing • Log-normal distribution • Academic analysis</p>
          </div>
          <ExportMenu
            chartRef={chartRef}
            chartData={chartData}
            params={{ currentPrice, strikePrice, daysToExpiry, impliedVol, riskFreeRate, investmentAmount, isCall }}
            stats={stats}
            onExportPNG={handleExportPNG}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onCopyURL={handleCopyURL}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Control Panel */}
        <ControlPanel
          currentPrice={currentPrice}
          strikePrice={strikePrice}
          daysToExpiry={daysToExpiry}
          impliedVol={impliedVol}
          riskFreeRate={riskFreeRate}
          investmentAmount={investmentAmount}
          isCall={isCall}
          symbol={symbol}
          quoteStatus={quoteStatus}
          quoteName={quoteName}
          quoteChange={quoteChange}
          quoteChangePercent={quoteChangePercent}
          onCurrentPriceChange={setCurrentPrice}
          onStrikePriceChange={setStrikePrice}
          onDaysToExpiryChange={setDaysToExpiry}
          onImpliedVolChange={setImpliedVol}
          onRiskFreeRateChange={setRiskFreeRate}
          onInvestmentAmountChange={setInvestmentAmount}
          onIsCallChange={setIsCall}
          onSymbolChange={setSymbol}
          onLoadQuote={handleLoadQuote}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          presets={presets}
          onLoadPreset={handleLoadPreset}
        />

        {/* Option Pricing Summary */}
        <div className="bg-gray-900 rounded-lg p-3 mb-4 flex flex-wrap gap-4 justify-center text-sm">
          <div title="Current market price of the option">
            <span className="text-gray-400">{isCall ? 'Call' : 'Put'} Price:</span>{' '}
            <span className="text-yellow-400 font-bold">${premium}</span>
          </div>
          <div title="Value if exercised immediately">
            <span className="text-gray-400">Intrinsic:</span>{' '}
            <span className="text-green-400">${intrinsic}</span>
          </div>
          <div title="Premium above intrinsic value">
            <span className="text-gray-400">Time Value:</span>{' '}
            <span className="text-blue-400">${timeVal}</span>
          </div>
          <div title="Stock price needed to break even at expiration">
            <span className="text-gray-400">Breakeven:</span>{' '}
            <span className="text-orange-400 font-bold">${breakeven.toFixed(2)}</span>
          </div>
          <div title="Number of 100-share contracts">
            <span className="text-gray-400">Contracts:</span>{' '}
            <span className="text-purple-400">{contractsOwned}</span>
          </div>
          <div title="Total premium paid for all contracts">
            <span className="text-gray-400">Total Cost:</span>{' '}
            <span className="text-red-400">${totalPremiumPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* Axis Controls */}
        <AxisControls
          currentPrice={currentPrice}
          strikePrice={strikePrice}
          breakeven={breakeven}
          T={T}
          r={r}
          sigma={sigma}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minPL={minPL}
          maxPL={maxPL}
          investmentAmount={investmentAmount}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onMinPLChange={setMinPL}
          onMaxPLChange={setMaxPL}
        />

        {/* Main Charts */}
        <div ref={chartRef} className="space-y-4 mb-4">
          <PLChart
            data={chartData}
            currentPrice={currentPrice}
            strikePrice={strikePrice}
            breakeven={breakeven}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minPL={minPL}
            maxPL={maxPL}
          />

          <AnimatedPLChart
            currentPrice={currentPrice}
            strikePrice={strikePrice}
            daysToExpiry={daysToExpiry}
            r={r}
            sigma={sigma}
            isCall={isCall}
            investmentAmount={investmentAmount}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minPL={minPL}
            maxPL={maxPL}
          />

          <ProbabilityChart
            data={probabilityData.data}
            currentPrice={currentPrice}
            breakeven={breakeven}
            strikePrice={strikePrice}
            T={T}
            r={r}
            sigma={sigma}
            minPrice={probabilityData.minPrice}
            maxPrice={probabilityData.maxPrice}
            expectedMoveOverride={expectedMoveOverride}
            impliedMovePercent={impliedMovePercent}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-800 pb-2">
          {[
            { id: 'analysis', label: 'Risk/Reward' },
            { id: 'compare', label: 'Compare Strikes' },
            { id: 'greeks', label: 'Greeks' },
            { id: 'decay', label: 'Time Decay' },
            { id: 'scenarios', label: 'Scenarios' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-t transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            <RiskRewardPanel
              stats={stats}
              investmentAmount={investmentAmount}
              totalPremiumPaid={totalPremiumPaid}
              currentPrice={currentPrice}
              strikePrice={strikePrice}
              premium={premium}
              sharesOwned={sharesOwned}
              optionShares={optionShares}
              isCall={isCall}
              impliedVol={impliedVol}
              daysToExpiry={daysToExpiry}
              expectedMoveOverride={expectedMoveOverride}
              onExpectedMoveChange={setExpectedMoveOverride}
              impliedMovePercent={impliedMovePercent}
            />
            <AIInterpretation
              symbol={symbol}
              currentPrice={currentPrice}
              strikePrice={strikePrice}
              premium={premium}
              breakeven={breakeven}
              daysToExpiry={daysToExpiry}
              impliedVol={impliedVol}
              isCall={isCall}
              stats={stats}
              greeks={greeks}
            />
          </div>
        )}

        {activeTab === 'compare' && (
          <MultiStrikePanel
            currentPrice={currentPrice}
            daysToExpiry={daysToExpiry}
            impliedVol={impliedVol}
            sigma={sigma}
            riskFreeRate={riskFreeRate}
            investmentAmount={investmentAmount}
            isCall={isCall}
            minPrice={minPrice}
            maxPrice={maxPrice}
            expectedMoveOverride={expectedMoveOverride}
          />
        )}

        {activeTab === 'greeks' && (
          <GreeksPanel
            currentPrice={currentPrice}
            strikePrice={strikePrice}
            T={T}
            r={r}
            sigma={sigma}
            isCall={isCall}
            premium={premium}
          />
        )}

        {activeTab === 'decay' && (
          <TimeDecayChart
            currentPrice={currentPrice}
            strikePrice={strikePrice}
            daysToExpiry={daysToExpiry}
            r={r}
            sigma={sigma}
            isCall={isCall}
            premium={premium}
            optionShares={optionShares}
            totalPremiumPaid={totalPremiumPaid}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioPanel
            currentPrice={currentPrice}
            strikePrice={strikePrice}
            daysToExpiry={daysToExpiry}
            impliedVol={impliedVol}
            riskFreeRate={riskFreeRate}
            investmentAmount={investmentAmount}
            isCall={isCall}
            premium={premium}
            sharesOwned={sharesOwned}
            optionShares={optionShares}
            totalPremiumPaid={totalPremiumPaid}
          />
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
          <p>
            Educational simulator for understanding stock vs options tradeoffs.
            Not financial advice. Past performance does not guarantee future results.
          </p>
          <p className="mt-1">
            Uses Black-Scholes model for pricing and log-normal distribution for probability analysis.
          </p>
        </footer>
      </main>
    </div>
  );
}
