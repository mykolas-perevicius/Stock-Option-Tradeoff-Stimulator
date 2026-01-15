import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVolatilityPrediction } from '../../contexts/VolatilityPredictionContext';
import { IV_METHODS } from '../../utils/volatilityCalculations';

/**
 * UserPredictionPanel - 3-way input for user volatility predictions
 *
 * Methods:
 * 1. Expected Move Slider - Set expected move %
 * 2. Select IV Method - Pick a calculation method and optionally adjust
 * 3. Direct IV Input - Enter specific IV %
 */
export default function UserPredictionPanel({
  symbol,
  currentPrice,
  marketIV,
  allVolatilities,
  daysToExpiry,
}) {
  const navigate = useNavigate();
  const { prediction, setPrediction } = useVolatilityPrediction();

  // Local state for inputs
  const [activeMethod, setActiveMethod] = useState('slider');
  const [sliderValue, setSliderValue] = useState(5); // Expected move %
  const [selectedIVMethod, setSelectedIVMethod] = useState('market');
  const [adjustment, setAdjustment] = useState(0);
  const [directIV, setDirectIV] = useState(30);

  // Time in years for calculations
  const T = daysToExpiry / 365;

  // Calculate IV from expected move
  const sliderIV = useMemo(() => {
    if (!sliderValue || T <= 0) return 0;
    return sliderValue / Math.sqrt(T);
  }, [sliderValue, T]);

  // Get IV from selected method
  const methodIV = useMemo(() => {
    const baseIV = allVolatilities?.[selectedIVMethod] || marketIV;
    return baseIV + adjustment;
  }, [allVolatilities, selectedIVMethod, adjustment, marketIV]);

  // Determine the effective user IV based on active method
  const effectiveUserIV = useMemo(() => {
    switch (activeMethod) {
      case 'slider':
        return sliderIV;
      case 'method':
        return methodIV;
      case 'direct':
        return directIV;
      default:
        return marketIV;
    }
  }, [activeMethod, sliderIV, methodIV, directIV, marketIV]);

  // Calculate expected move from IV
  const expectedMove = useMemo(() => {
    if (!effectiveUserIV || !currentPrice || T <= 0) return null;
    const sigma = effectiveUserIV / 100;
    const move = currentPrice * sigma * Math.sqrt(T);
    const movePercent = sigma * Math.sqrt(T) * 100;
    return { move, movePercent };
  }, [effectiveUserIV, currentPrice, T]);

  // Market expected move for comparison
  const marketExpectedMove = useMemo(() => {
    if (!marketIV || !currentPrice || T <= 0) return null;
    const sigma = marketIV / 100;
    const move = currentPrice * sigma * Math.sqrt(T);
    const movePercent = sigma * Math.sqrt(T) * 100;
    return { move, movePercent };
  }, [marketIV, currentPrice, T]);

  // IV difference
  const ivDiff = effectiveUserIV - marketIV;
  const ivDiffPercent = marketIV > 0 ? (ivDiff / marketIV) * 100 : 0;

  // Sync slider with market expected move on load
  useEffect(() => {
    if (marketExpectedMove && sliderValue === 5) {
      setSliderValue(Math.round(marketExpectedMove.movePercent * 10) / 10);
    }
  }, [marketExpectedMove]);

  // Initialize direct IV with market IV
  useEffect(() => {
    if (marketIV && directIV === 30) {
      setDirectIV(Math.round(marketIV * 10) / 10);
    }
  }, [marketIV]);

  // Handle save prediction
  const handleSavePrediction = () => {
    setPrediction({
      symbol,
      currentPrice,
      userIV: effectiveUserIV,
      marketIV,
      daysToExpiry,
      method: activeMethod,
      selectedMethod: activeMethod === 'method' ? selectedIVMethod : null,
      adjustment: activeMethod === 'method' ? adjustment : 0,
    });
  };

  // Handle navigate to options page
  const handleAnalyzeOptions = () => {
    handleSavePrediction();
    navigate('/options', {
      state: {
        symbol,
        currentPrice,
        userIV: effectiveUserIV,
        marketIV,
        daysToExpiry,
      },
    });
  };

  // Method options for radio buttons
  const ivMethods = [
    { key: 'market', label: 'Market IV' },
    { key: 'hist30', label: 'Historical 30d' },
    { key: 'hist90', label: 'Historical 90d' },
    { key: 'garch', label: 'GARCH' },
    { key: 'parkinson', label: 'Parkinson' },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🎯</span> Your Volatility Prediction
      </h3>

      {/* Method Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-3">
        {[
          { id: 'slider', label: 'Expected Move', icon: '📊' },
          { id: 'method', label: 'Select Method', icon: '📐' },
          { id: 'direct', label: 'Direct IV', icon: '✏️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMethod(tab.id)}
            className={`px-3 py-2 text-sm rounded-t transition-colors flex items-center gap-1 ${
              activeMethod === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Method 1: Expected Move Slider */}
      {activeMethod === 'slider' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Expected Move (%)</label>
              <span className="text-lg font-bold text-purple-400">±{sliderValue.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.1"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.5%</span>
              <span>Market: {marketExpectedMove?.movePercent.toFixed(1)}%</span>
              <span>30%</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Expected price range: <span className="text-white font-mono">
              ${(currentPrice - expectedMove?.move).toFixed(2)} - ${(currentPrice + expectedMove?.move).toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Implied IV: <span className="text-purple-400">{sliderIV.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Method 2: Select IV Method */}
      {activeMethod === 'method' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ivMethods.map((method) => {
              const methodValue = allVolatilities?.[method.key];
              return (
                <button
                  key={method.key}
                  onClick={() => setSelectedIVMethod(method.key)}
                  className={`p-2 rounded text-left text-sm transition-colors ${
                    selectedIVMethod === method.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs opacity-75">
                    {methodValue ? `${methodValue.toFixed(1)}%` : 'N/A'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Adjustment slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Adjustment</label>
              <span className={`font-mono ${adjustment > 0 ? 'text-red-400' : adjustment < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {adjustment > 0 ? '+' : ''}{adjustment.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="text-sm">
            <span className="text-gray-400">Base: </span>
            <span className="text-white">{allVolatilities?.[selectedIVMethod]?.toFixed(1) || 'N/A'}%</span>
            <span className="text-gray-400"> → Final: </span>
            <span className="text-purple-400 font-bold">{methodIV.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Method 3: Direct IV Input */}
      {activeMethod === 'direct' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Your IV Forecast (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="200"
                step="0.1"
                value={directIV}
                onChange={(e) => setDirectIV(Number(e.target.value))}
                className="w-32 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-lg font-mono text-purple-400 focus:border-purple-500 focus:outline-none"
              />
              <span className="text-2xl text-gray-500">%</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 35, 50].map((val) => (
              <button
                key={val}
                onClick={() => setDirectIV(val)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  directIV === val
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            This implies expected move of{' '}
            <span className="text-white font-mono">
              ±{(directIV * Math.sqrt(T)).toFixed(1)}%
            </span>{' '}
            (±${((directIV / 100) * currentPrice * Math.sqrt(T)).toFixed(2)})
          </div>
        </div>
      )}

      {/* Prediction Summary */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Your Prediction Summary</h4>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500">Your IV</div>
            <div className="text-xl font-bold text-purple-400">{effectiveUserIV.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Market IV</div>
            <div className="text-xl font-bold text-gray-400">{marketIV.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Difference</div>
            <div className={`text-xl font-bold ${ivDiff > 0 ? 'text-red-400' : ivDiff < 0 ? 'text-green-400' : 'text-gray-400'}`}>
              {ivDiff > 0 ? '+' : ''}{ivDiff.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className={`p-3 rounded text-sm ${
          ivDiff > 2 ? 'bg-red-900/30 border border-red-500/30' :
          ivDiff < -2 ? 'bg-green-900/30 border border-green-500/30' :
          'bg-gray-800/50'
        }`}>
          {ivDiff > 2 ? (
            <p>
              <strong className="text-red-400">Bullish Volatility View:</strong> You expect
              more movement than the market. Consider buying options (straddles, strangles).
            </p>
          ) : ivDiff < -2 ? (
            <p>
              <strong className="text-green-400">Bearish Volatility View:</strong> You expect
              less movement than the market. Consider selling premium (iron condors, credit spreads).
            </p>
          ) : (
            <p className="text-gray-400">
              Your view is roughly in line with the market's expectation.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSavePrediction}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>💾</span> Save Prediction
          </button>
          <button
            onClick={handleAnalyzeOptions}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>📊</span> Analyze in Options Page →
          </button>
        </div>
      </div>
    </div>
  );
}
