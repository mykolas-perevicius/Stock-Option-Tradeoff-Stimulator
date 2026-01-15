import React from 'react';

/**
 * FundamentalsPanel - Display key financial metrics
 * Shows P/E, EPS, P/B, EV/EBITDA and other valuation metrics
 */
export default function FundamentalsPanel({ fundamentals }) {
  if (!fundamentals) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Format large numbers
  const formatLarge = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  // Format percentage
  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(1)}%`;
  };

  // Format ratio
  const formatRatio = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(2);
  };

  // Helper for safe color logic
  const getColor = (value, redThreshold, greenThreshold, isHigherBetter = false) => {
    if (value === null || value === undefined) return 'text-white';
    if (isHigherBetter) {
      return value > greenThreshold ? 'text-green-400' : value < redThreshold ? 'text-red-400' : 'text-white';
    }
    return value > redThreshold ? 'text-red-400' : value < greenThreshold ? 'text-green-400' : 'text-white';
  };

  // Valuation metrics
  const valuationMetrics = [
    {
      label: 'P/E Ratio (TTM)',
      value: formatRatio(fundamentals.trailingPE),
      description: 'Price-to-earnings ratio',
      color: getColor(fundamentals.trailingPE, 30, 15),
    },
    {
      label: 'Forward P/E',
      value: formatRatio(fundamentals.forwardPE),
      description: 'Based on projected earnings',
      color: fundamentals.forwardPE && fundamentals.trailingPE && fundamentals.forwardPE < fundamentals.trailingPE ? 'text-green-400' : 'text-white',
    },
    {
      label: 'P/B Ratio',
      value: formatRatio(fundamentals.priceToBook),
      description: 'Price-to-book value',
      color: fundamentals.priceToBook && fundamentals.priceToBook > 10 ? 'text-yellow-400' : 'text-white',
    },
    {
      label: 'EV/EBITDA',
      value: formatRatio(fundamentals.enterpriseToEbitda),
      description: 'Enterprise value to EBITDA',
      color: fundamentals.enterpriseToEbitda && fundamentals.enterpriseToEbitda > 20 ? 'text-yellow-400' : 'text-white',
    },
  ];

  // Earnings metrics
  const earningsMetrics = [
    {
      label: 'EPS (TTM)',
      value: fundamentals.trailingEps ? `$${fundamentals.trailingEps.toFixed(2)}` : 'N/A',
      description: 'Earnings per share',
    },
    {
      label: 'Forward EPS',
      value: fundamentals.forwardEps ? `$${fundamentals.forwardEps.toFixed(2)}` : 'N/A',
      description: 'Projected EPS',
      color: fundamentals.forwardEps && fundamentals.trailingEps && fundamentals.forwardEps > fundamentals.trailingEps ? 'text-green-400' : 'text-white',
    },
    {
      label: 'PEG Ratio',
      value: formatRatio(fundamentals.pegRatio),
      description: 'P/E to growth ratio',
      color: fundamentals.pegRatio != null ? (fundamentals.pegRatio < 1 ? 'text-green-400' : fundamentals.pegRatio > 2 ? 'text-red-400' : 'text-white') : 'text-white',
    },
    {
      label: 'EPS Growth',
      value: formatPercent(fundamentals.earningsGrowth),
      description: 'Year-over-year growth',
      color: fundamentals.earningsGrowth != null ? (fundamentals.earningsGrowth > 0 ? 'text-green-400' : 'text-red-400') : 'text-white',
    },
  ];

  // Profitability metrics
  const profitMetrics = [
    {
      label: 'Profit Margin',
      value: formatPercent(fundamentals.profitMargins),
      color: fundamentals.profitMargins != null && fundamentals.profitMargins > 0.2 ? 'text-green-400' : 'text-white',
    },
    {
      label: 'Operating Margin',
      value: formatPercent(fundamentals.operatingMargins),
      color: fundamentals.operatingMargins != null && fundamentals.operatingMargins > 0.15 ? 'text-green-400' : 'text-white',
    },
    {
      label: 'ROE',
      value: formatPercent(fundamentals.returnOnEquity),
      color: fundamentals.returnOnEquity != null && fundamentals.returnOnEquity > 0.15 ? 'text-green-400' : 'text-white',
    },
    {
      label: 'ROA',
      value: formatPercent(fundamentals.returnOnAssets),
    },
  ];

  // Financial health metrics
  const healthMetrics = [
    {
      label: 'Debt/Equity',
      value: formatRatio(fundamentals.debtToEquity),
      color: fundamentals.debtToEquity != null && fundamentals.debtToEquity > 2 ? 'text-red-400' : 'text-white',
    },
    {
      label: 'Current Ratio',
      value: formatRatio(fundamentals.currentRatio),
      color: fundamentals.currentRatio != null ? (fundamentals.currentRatio > 1.5 ? 'text-green-400' : fundamentals.currentRatio < 1 ? 'text-red-400' : 'text-white') : 'text-white',
    },
    {
      label: 'Revenue Growth',
      value: formatPercent(fundamentals.revenueGrowth),
      color: fundamentals.revenueGrowth != null ? (fundamentals.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400') : 'text-white',
    },
    {
      label: 'Market Cap',
      value: formatLarge(fundamentals.marketCap),
    },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Fundamental Metrics
      </h3>

      {/* Valuation Section */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Valuation</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {valuationMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
              <div className={`text-xl font-bold ${metric.color || 'text-white'}`}>{metric.value}</div>
              <div className="text-xs text-gray-600 mt-1">{metric.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings Section */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Earnings</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {earningsMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
              <div className={`text-xl font-bold ${metric.color || 'text-white'}`}>{metric.value}</div>
              {metric.description && (
                <div className="text-xs text-gray-600 mt-1">{metric.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Profitability Section */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Profitability</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {profitMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
              <div className={`text-lg font-bold ${metric.color || 'text-white'}`}>{metric.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Health Section */}
      <div>
        <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Financial Health</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {healthMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
              <div className={`text-lg font-bold ${metric.color || 'text-white'}`}>{metric.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
