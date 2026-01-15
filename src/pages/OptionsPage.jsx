import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * OptionsPage - Protected page showing detailed options data
 * Requires user authentication to access
 */
export default function OptionsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Options Data</h1>
            <p className="text-gray-500 text-xs">Detailed options chain analysis and IV surface</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Welcome, {user?.email}
            </span>
            <Link
              to="/"
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back to Simulator
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-lg p-8 text-center mb-8">
          <span className="text-4xl mb-4 block">🚧</span>
          <h2 className="text-2xl font-bold text-purple-300 mb-2">Options Data - Coming Soon</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            This page will display detailed options chain data, implied volatility surface,
            term structure analysis, and advanced options analytics. Check back soon!
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Options Chain</h3>
            <p className="text-sm text-gray-400">
              Full options chain with real-time bid/ask, volume, open interest,
              and Greeks for all strikes and expirations.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">IV Surface</h3>
            <p className="text-sm text-gray-400">
              3D visualization of implied volatility across strikes and expirations,
              including volatility smile and term structure.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Historical IV</h3>
            <p className="text-sm text-gray-400">
              Track IV rank, IV percentile, and historical volatility comparisons
              to identify relative value opportunities.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Put/Call Ratios</h3>
            <p className="text-sm text-gray-400">
              Volume and open interest put/call ratios with historical context
              for sentiment analysis.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Unusual Activity</h3>
            <p className="text-sm text-gray-400">
              Flag unusual options activity including large block trades,
              sweep orders, and volume spikes.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Strategy Builder</h3>
            <p className="text-sm text-gray-400">
              Build and analyze multi-leg options strategies with P&L diagrams,
              probability analysis, and optimal entry points.
            </p>
          </div>
        </div>

        {/* User Note */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-center">
          <p className="text-sm text-gray-400">
            This feature is available exclusively to registered users.
            Your saved setups and preferences will be available here.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500 pb-4">
        <p>
          Options data powered by live market feeds.
          Educational purposes only, not financial advice.
        </p>
      </footer>
    </div>
  );
}
