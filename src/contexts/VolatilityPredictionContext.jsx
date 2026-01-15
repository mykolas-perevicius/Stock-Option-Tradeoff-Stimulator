import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const VolatilityPredictionContext = createContext();

const STORAGE_KEY = 'volatility_prediction';

/**
 * Default prediction state
 */
const defaultPrediction = {
  symbol: null,
  currentPrice: null,
  userIV: null,
  marketIV: null,
  daysToExpiry: 30,
  method: 'slider', // 'slider' | 'method' | 'direct'
  selectedMethod: null, // For 'method' type: 'market', 'hist30', 'garch', etc.
  adjustment: 0, // Percentage adjustment to selected method
  timestamp: null,
};

/**
 * VolatilityPredictionProvider - Manages user's volatility predictions across pages
 *
 * Provides:
 * - prediction: Current prediction state
 * - setPrediction: Update prediction
 * - clearPrediction: Reset to defaults
 * - savePrediction: Persist to storage
 */
export function VolatilityPredictionProvider({ children }) {
  const { user } = useAuth();
  const [prediction, setPredictionState] = useState(defaultPrediction);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load prediction from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if prediction is still fresh (within 24 hours)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setPredictionState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load prediction from storage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever prediction changes
  useEffect(() => {
    if (isLoaded && prediction.symbol) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prediction));
      } catch (e) {
        console.error('Failed to save prediction to storage:', e);
      }
    }
  }, [prediction, isLoaded]);

  /**
   * Update prediction with new values
   */
  const setPrediction = useCallback((updates) => {
    setPredictionState((prev) => ({
      ...prev,
      ...updates,
      timestamp: Date.now(),
    }));
  }, []);

  /**
   * Clear prediction and reset to defaults
   */
  const clearPrediction = useCallback(() => {
    setPredictionState(defaultPrediction);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Calculate the effective user IV based on method
   */
  const getEffectiveUserIV = useCallback((allVolatilities) => {
    if (!prediction.method) return prediction.userIV;

    if (prediction.method === 'direct') {
      return prediction.userIV;
    }

    if (prediction.method === 'slider') {
      return prediction.userIV;
    }

    if (prediction.method === 'method' && prediction.selectedMethod && allVolatilities) {
      const baseIV = allVolatilities[prediction.selectedMethod] || prediction.marketIV;
      return baseIV + (prediction.adjustment || 0);
    }

    return prediction.userIV || prediction.marketIV;
  }, [prediction]);

  /**
   * Calculate expected move from IV
   */
  const calculateExpectedMove = useCallback((iv, currentPrice, daysToExpiry) => {
    if (!iv || !currentPrice || !daysToExpiry) return null;
    const T = daysToExpiry / 365;
    const sigma = iv / 100;
    const move = currentPrice * sigma * Math.sqrt(T);
    const movePercent = sigma * Math.sqrt(T) * 100;
    return { move, movePercent };
  }, []);

  const value = {
    prediction,
    setPrediction,
    clearPrediction,
    getEffectiveUserIV,
    calculateExpectedMove,
    isLoaded,
  };

  return (
    <VolatilityPredictionContext.Provider value={value}>
      {children}
    </VolatilityPredictionContext.Provider>
  );
}

/**
 * Hook to access volatility prediction context
 */
export function useVolatilityPrediction() {
  const context = useContext(VolatilityPredictionContext);
  if (!context) {
    throw new Error('useVolatilityPrediction must be used within VolatilityPredictionProvider');
  }
  return context;
}

export default VolatilityPredictionContext;
