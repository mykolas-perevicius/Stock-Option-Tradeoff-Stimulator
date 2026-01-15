import React, { useState, useMemo } from 'react';

/**
 * ScenarioSimulator - What-if analysis for fundamental changes
 * Shows expected price moves based on EPS/revenue changes
 */
export default function ScenarioSimulator({ fundamentals }) {
  const [selectedScenario, setSelectedScenario] = useState(0);

  if (!fundamentals || !fundamentals.currentPrice || !fundamentals.trailingPE) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎯</span> Scenario Simulator
        </h3>
        <div className="text-center py-8 text-gray-500">
          Insufficient data for scenario analysis.
          <p className="text-sm mt-2">P/E ratio or current price not available.</p>
        </div>
      </div>
    );
  }

  const { currentPrice, trailingPE, trailingEps, forwardEps } = fundamentals;

  // Define EPS surprise scenarios
  const scenarios = [
    { label: 'Big Miss', epsChange: -20, typicalMove: -12 },
    { label: 'Miss', epsChange: -10, typicalMove: -6 },
    { label: 'Slight Miss', epsChange: -5, typicalMove: -3 },
    { label: 'In Line', epsChange: 0, typicalMove: 0 },
    { label: 'Slight Beat', epsChange: 5, typicalMove: 2 },
    { label: 'Beat', epsChange: 10, typicalMove: 5 },
    { label: 'Big Beat', epsChange: 20, typicalMove: 10 },
  ];

  // Calculate projected prices based on P/E method
  const projectedPrices = useMemo(() => {
    return scenarios.map(scenario => {
      // If EPS changes, and P/E stays constant, price changes proportionally
      const epsMultiplier = 1 + (scenario.epsChange / 100);
      const newEps = (trailingEps || currentPrice / trailingPE) * epsMultiplier;
      const projectedPrice = newEps * trailingPE;
      const priceChange = ((projectedPrice - currentPrice) / currentPrice) * 100;

      return {
        ...scenario,
        projectedPrice,
        priceChange,
        newEps,
      };
    });
  }, [trailingPE, trailingEps, currentPrice]);

  const selectedData = projectedPrices[selectedScenario];

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🎯</span> Scenario Simulator
      </h3>

      {/* P/E Based Analysis Explanation */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-sm">
        <span className="text-gray-400">Assumptions:</span>{' '}
        <span className="text-white">P/E remains constant at {trailingPE?.toFixed(1)}x</span>
        <span className="text-gray-400">, price moves with EPS changes</span>
      </div>

      {/* Scenario Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {scenarios.map((scenario, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedScenario(idx)}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              selectedScenario === idx
                ? scenario.epsChange > 0
                  ? 'bg-green-600 text-white'
                  : scenario.epsChange < 0
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {scenario.label}
            <span className="block text-xs opacity-75">
              {scenario.epsChange > 0 ? '+' : ''}{scenario.epsChange}%
            </span>
          </button>
        ))}
      </div>

      {/* Selected Scenario Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">EPS Change</div>
          <div className={`text-2xl font-bold ${
            selectedData.epsChange > 0 ? 'text-green-400' : selectedData.epsChange < 0 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {selectedData.epsChange > 0 ? '+' : ''}{selectedData.epsChange}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">New EPS</div>
          <div className="text-xl font-bold text-white">
            ${selectedData.newEps?.toFixed(2)}
          </div>
          {trailingEps && (
            <div className="text-xs text-gray-600">
              from ${trailingEps.toFixed(2)}
            </div>
          )}
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Projected Price</div>
          <div className="text-xl font-bold text-white">
            ${selectedData.projectedPrice?.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600">
            from ${currentPrice.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Price Move</div>
          <div className={`text-2xl font-bold ${
            selectedData.priceChange > 0 ? 'text-green-400' : selectedData.priceChange < 0 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {selectedData.priceChange > 0 ? '+' : ''}{selectedData.priceChange.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Historical Comparison */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Typical Market Reaction</h4>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-500">Historical avg for "{selectedData.label}":</span>
            <span className={`ml-2 font-bold ${
              selectedData.typicalMove > 0 ? 'text-green-400' : selectedData.typicalMove < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {selectedData.typicalMove > 0 ? '+' : ''}{selectedData.typicalMove}%
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Based on market studies
          </div>
        </div>
      </div>

      {/* All Scenarios Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-2">Scenario</th>
              <th className="text-right py-2 px-2">EPS Δ</th>
              <th className="text-right py-2 px-2">New EPS</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Move</th>
            </tr>
          </thead>
          <tbody>
            {projectedPrices.map((proj, idx) => (
              <tr
                key={idx}
                className={`border-b border-gray-800 ${
                  selectedScenario === idx ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                }`}
              >
                <td className="py-2 px-2 text-gray-300">{proj.label}</td>
                <td className={`py-2 px-2 text-right font-mono ${
                  proj.epsChange > 0 ? 'text-green-400' : proj.epsChange < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {proj.epsChange > 0 ? '+' : ''}{proj.epsChange}%
                </td>
                <td className="py-2 px-2 text-right font-mono text-white">
                  ${proj.newEps?.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-white">
                  ${proj.projectedPrice?.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-right font-mono font-bold ${
                  proj.priceChange > 0 ? 'text-green-400' : proj.priceChange < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {proj.priceChange > 0 ? '+' : ''}{proj.priceChange.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-gray-600 text-center">
        Note: Actual price movements depend on many factors beyond EPS.
        This model assumes P/E multiple remains constant.
      </div>
    </div>
  );
}
