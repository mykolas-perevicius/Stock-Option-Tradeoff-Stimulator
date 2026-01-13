/**
 * Groq API integration for AI-powered analysis interpretation
 * Uses Llama 3 on free tier
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// API key stored in memory (loaded from localStorage)
let apiKey = null;

/**
 * Set the API key
 */
export function setGroqApiKey(key) {
  apiKey = key;
}

/**
 * Get the current API key
 */
export function getGroqApiKey() {
  return apiKey;
}

/**
 * Check if API is configured
 */
export function isGroqConfigured() {
  return !!apiKey;
}

/**
 * Load API key from localStorage
 */
export function loadGroqApiKey() {
  const savedKey = localStorage.getItem('groq_api_key');
  if (savedKey) {
    apiKey = savedKey;
    return true;
  }
  return false;
}

/**
 * Save API key to localStorage
 */
export function saveGroqApiKey(key) {
  localStorage.setItem('groq_api_key', key);
  apiKey = key;
}

/**
 * Clear API key
 */
export function clearGroqApiKey() {
  localStorage.removeItem('groq_api_key');
  apiKey = null;
}

/**
 * Generate AI interpretation of option analysis
 * @param {object} analysisData - The analysis parameters and results
 * @returns {Promise<string>} AI-generated interpretation
 */
export async function generateInterpretation(analysisData) {
  if (!apiKey) {
    throw new Error('Groq API key not configured. Get a free key at console.groq.com');
  }

  const prompt = buildPrompt(analysisData);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a friendly financial educator explaining stock options to someone learning about investing.
Keep explanations clear, use analogies where helpful, and avoid jargon.
Focus on practical understanding rather than technical details.
Be concise - aim for 3-4 paragraphs maximum.
Use markdown formatting for emphasis and structure.
Do not give specific investment advice or recommendations.
Always remind the reader this is educational content, not financial advice.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Groq API key.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate interpretation.';
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

/**
 * Build the prompt for the AI
 */
function buildPrompt(data) {
  const {
    symbol,
    currentPrice,
    strikePrice,
    premium,
    breakeven,
    daysToExpiry,
    impliedVol,
    isCall,
    stats,
  } = data;

  const optionType = isCall ? 'call' : 'put';
  const direction = isCall ? 'rise' : 'fall';

  let moneyness;
  if (isCall) {
    moneyness = strikePrice > currentPrice ? 'out-of-the-money' : strikePrice < currentPrice ? 'in-the-money' : 'at-the-money';
  } else {
    moneyness = strikePrice < currentPrice ? 'out-of-the-money' : strikePrice > currentPrice ? 'in-the-money' : 'at-the-money';
  }

  return `Please explain this ${optionType} option analysis in plain English for someone learning about options:

**Setup:**
- Stock: ${symbol || 'Example Stock'} at $${currentPrice}
- Option: ${optionType.toUpperCase()} with $${strikePrice} strike (${moneyness})
- Premium: $${premium} per share ($${(premium * 100).toFixed(0)} per contract)
- Days to Expiration: ${daysToExpiry}
- Implied Volatility: ${impliedVol}%

**Key Numbers:**
- Breakeven Price: $${breakeven.toFixed(2)} (stock must ${direction} to here to profit)
- Probability option makes money: ${stats.optionProfitProb}%
- Probability stock makes money: ${stats.stockWinProb}%
- Option Expected Value: $${stats.optionEV}
- Stock Expected Value: $${stats.stockEV}
- Max option loss: $${Math.abs(stats.optionMaxLoss || premium * 100)}

Please explain:
1. What this position means in simple terms (like explaining to a friend)
2. The main tradeoff between this option vs buying the stock
3. What needs to happen for this to be profitable
4. One key insight or thing to watch out for

Keep it friendly and educational!`;
}

/**
 * Fallback interpretation when API is unavailable
 */
export function getFallbackInterpretation(analysisData) {
  const { stats, isCall, strikePrice, currentPrice, breakeven, daysToExpiry, premium, impliedVol } = analysisData;

  const direction = isCall ? 'rise' : 'fall';
  const aboveBelow = isCall ? 'above' : 'below';
  const moveNeeded = Math.abs(breakeven - currentPrice);
  const movePercent = (moveNeeded / currentPrice * 100).toFixed(1);

  return `## Understanding This ${isCall ? 'Call' : 'Put'} Option

**What You're Buying:** This option gives you the right to ${isCall ? 'buy' : 'sell'} the stock at $${strikePrice} anytime in the next ${daysToExpiry} days. For this right, you pay $${premium} per share upfront (the "premium").

**The Key Tradeoff:**
- The option has a **${stats.optionProfitProb}% chance** of being profitable
- Buying the stock directly has a **${stats.stockWinProb}% chance** of profit
- This lower probability comes with the benefit of **limited risk** - you can only lose the premium paid

**To Make Money:** The stock needs to ${direction} ${aboveBelow} $${breakeven.toFixed(2)} by expiration. That's a **${movePercent}% move** from the current price of $${currentPrice}.

**Key Insight:** The market is pricing in about ${(impliedVol * Math.sqrt(daysToExpiry/365) * 100).toFixed(1)}% worth of expected movement (based on ${impliedVol}% IV). If you think the stock will move more than this, the option may be underpriced. If you think it will move less, stock might be the better choice.

---
*This is educational content generated locally. For AI-powered personalized insights, add a free Groq API key in settings.*`;
}
