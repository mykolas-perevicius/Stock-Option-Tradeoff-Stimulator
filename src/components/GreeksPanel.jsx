import React from 'react';
import { calcAllGreeks, formatGreek, getGreekDescription } from '../utils/greeks';

/**
 * Greeks dashboard showing all option sensitivities
 */
export default function GreeksPanel({
  currentPrice,
  strikePrice,
  T,
  r,
  sigma,
  isCall,
  premium,
}) {
  const greeks = calcAllGreeks(currentPrice, strikePrice, T, r, sigma, isCall);

  const greekConfig = [
    {
      name: 'delta',
      label: 'Delta (Δ)',
      value: greeks.delta,
      color: greeks.delta >= 0 ? 'text-green-400' : 'text-red-400',
      barColor: greeks.delta >= 0 ? 'bg-green-500' : 'bg-red-500',
      max: 1,
      format: (v) => v.toFixed(4),
    },
    {
      name: 'gamma',
      label: 'Gamma (Γ)',
      value: greeks.gamma,
      color: 'text-blue-400',
      barColor: 'bg-blue-500',
      max: 0.1, // Typical max gamma
      format: (v) => v.toFixed(4),
    },
    {
      name: 'theta',
      label: 'Theta (Θ)',
      value: greeks.theta,
      color: greeks.theta <= 0 ? 'text-red-400' : 'text-green-400',
      barColor: greeks.theta <= 0 ? 'bg-red-500' : 'bg-green-500',
      max: Math.abs(premium * 0.1), // Scale to premium
      format: (v) => `$${v.toFixed(2)}/day`,
    },
    {
      name: 'vega',
      label: 'Vega (ν)',
      value: greeks.vega,
      color: 'text-purple-400',
      barColor: 'bg-purple-500',
      max: premium * 0.5, // Scale to premium
      format: (v) => `$${v.toFixed(2)}/1%`,
    },
    {
      name: 'rho',
      label: 'Rho (ρ)',
      value: greeks.rho,
      color: greeks.rho >= 0 ? 'text-cyan-400' : 'text-orange-400',
      barColor: greeks.rho >= 0 ? 'bg-cyan-500' : 'bg-orange-500',
      max: premium * 0.2, // Scale to premium
      format: (v) => `$${v.toFixed(2)}/1%`,
    },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">
        Option Greeks
        <span className="text-xs text-gray-500 ml-2 font-normal">
          ({isCall ? 'Call' : 'Put'} Option)
        </span>
      </h3>

      <div className="space-y-4">
        {greekConfig.map((greek) => {
          const barWidth = Math.min(100, (Math.abs(greek.value) / greek.max) * 100);

          return (
            <div key={greek.name} className="group relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-300">{greek.label}</span>
                <span className={`text-sm font-mono ${greek.color}`}>
                  {greek.format(greek.value)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${greek.barColor}`}
                  style={{ width: `${barWidth}%`, opacity: 0.7 }}
                />
              </div>
              {/* Tooltip on hover */}
              <div className="absolute left-0 right-0 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs text-gray-300 mt-2 shadow-lg">
                  {getGreekDescription(greek.name)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary interpretation */}
      <div className="mt-4 p-3 bg-gray-800 rounded text-sm text-gray-400">
        <strong className="text-gray-300">Interpretation:</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>
            • Delta {Math.abs(greeks.delta).toFixed(2)}: Option moves ${(Math.abs(greeks.delta) * 1).toFixed(2)} for every $1 stock move
          </li>
          <li>
            • Theta ${Math.abs(greeks.theta).toFixed(2)}/day: Losing ${(Math.abs(greeks.theta) * 7).toFixed(2)} per week to time decay
          </li>
          <li>
            • Vega ${greeks.vega.toFixed(2)}: A 5% IV increase adds ${(greeks.vega * 5).toFixed(2)} to option value
          </li>
        </ul>
      </div>
    </div>
  );
}
