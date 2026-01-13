import React, { useState, useCallback, useEffect } from 'react';
import {
  generateInterpretation,
  getFallbackInterpretation,
  isGroqConfigured,
  saveGroqApiKey,
  clearGroqApiKey,
  getGroqApiKey,
} from '../api/groqApi';

/**
 * AI-powered interpretation panel using Groq
 */
export default function AIInterpretation({
  symbol,
  currentPrice,
  strikePrice,
  premium,
  breakeven,
  daysToExpiry,
  impliedVol,
  isCall,
  stats,
  greeks,
}) {
  const [interpretation, setInterpretation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConfigured, setIsConfigured] = useState(isGroqConfigured());

  // Check configuration on mount
  useEffect(() => {
    setIsConfigured(isGroqConfigured());
  }, []);

  const analysisData = {
    symbol,
    currentPrice,
    strikePrice,
    premium,
    breakeven,
    daysToExpiry,
    impliedVol,
    isCall,
    stats,
    greeks,
  };

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isGroqConfigured()) {
        // Use fallback if no API key
        setInterpretation(getFallbackInterpretation(analysisData));
      } else {
        const result = await generateInterpretation(analysisData);
        setInterpretation(result);
      }
    } catch (err) {
      setError(err.message);
      // Show fallback on error
      setInterpretation(getFallbackInterpretation(analysisData));
    } finally {
      setIsLoading(false);
    }
  }, [symbol, currentPrice, strikePrice, premium, breakeven, daysToExpiry, impliedVol, isCall, stats]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveGroqApiKey(apiKeyInput.trim());
      setIsConfigured(true);
      setShowApiKeyInput(false);
      setApiKeyInput('');
      setError(null);
    }
  };

  const handleClearApiKey = () => {
    clearGroqApiKey();
    setIsConfigured(false);
    setInterpretation(null);
  };

  // Simple markdown-like rendering
  const renderContent = (content) => {
    if (!content) return null;

    // Split by double newlines for paragraphs
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-lg font-semibold text-white mt-4 mb-2">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={idx} className="font-semibold text-white mt-3 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      // Bold text inline
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="text-gray-300 mb-2">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={i} className="text-white">
                    {part.replace(/\*\*/g, '')}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      }
      // Bullet points
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="text-gray-300 ml-4 mb-1">
            {line.replace('- ', '')}
          </li>
        );
      }
      // Horizontal rule
      if (line === '---') {
        return <hr key={idx} className="border-gray-700 my-4" />;
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-gray-300 mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🤖</span> AI Interpretation
          <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">Llama 3</span>
        </h3>
        <div className="flex gap-2">
          {isConfigured ? (
            <button
              onClick={handleClearApiKey}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              title="Remove API key"
            >
              ✓ API Key Set
            </button>
          ) : (
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Add API Key
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded text-sm transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span> Analyzing...
              </>
            ) : (
              <>Generate Explanation</>
            )}
          </button>
        </div>
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <p className="text-xs text-gray-400 mb-2">
            Get a free API key from{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              console.groq.com
            </a>{' '}
            - Groq offers fast, free inference with Llama 3 models.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter Groq API key (gsk_...)"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-sm text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Interpretation display */}
      {interpretation ? (
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="leading-relaxed">{renderContent(interpretation)}</div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">💡</div>
          <p>Click "Generate Explanation" to get an AI-powered interpretation</p>
          <p className="text-xs mt-2">
            {isConfigured
              ? 'Using Groq API with Llama 3'
              : 'Will use local fallback (add API key for AI-powered insights)'}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          <strong>Disclaimer:</strong> AI-generated content is for educational purposes only.
          Not financial advice. Always consult a qualified financial advisor before making
          investment decisions. Options involve risk of total loss of premium.
        </p>
      </div>
    </div>
  );
}
