/**
 * AI API Integration for Option Analysis Interpretation
 *
 * Provider hierarchy:
 * 1. Google Gemini (free tier - 15 RPM, 1M tokens/day)
 * 2. Groq with Llama 3 (if user has API key)
 * 3. Local fallback interpretation
 */

// API endpoints
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// API keys stored in memory
let geminiApiKey = null;
let groqApiKey = null;

// Load API keys from localStorage
export function loadApiKeys() {
  geminiApiKey = localStorage.getItem('gemini_api_key');
  groqApiKey = localStorage.getItem('groq_api_key');
}

// Save API keys
export function saveGeminiApiKey(key) {
  localStorage.setItem('gemini_api_key', key);
  geminiApiKey = key;
}

export function saveGroqApiKey(key) {
  localStorage.setItem('groq_api_key', key);
  groqApiKey = key;
}

// Clear API keys
export function clearGeminiApiKey() {
  localStorage.removeItem('gemini_api_key');
  geminiApiKey = null;
}

export function clearGroqApiKey() {
  localStorage.removeItem('groq_api_key');
  groqApiKey = null;
}

// Get API keys
export function getGeminiApiKey() {
  return geminiApiKey;
}

export function getGroqApiKey() {
  return groqApiKey;
}

// Check if AI is available
export function isAIAvailable() {
  return true; // Gemini works without key for basic use
}

/**
 * Generate AI interpretation with automatic fallback
 * Tries: Gemini -> Groq -> Local Fallback
 */
export async function generateInterpretation(analysisData) {
  const prompt = buildPrompt(analysisData);
  const systemPrompt = `You are a friendly financial educator explaining stock options to someone learning about investing.
Keep explanations clear, use analogies where helpful, and avoid jargon.
Focus on practical understanding rather than technical details.
Be concise - aim for 3-4 paragraphs maximum.
Use markdown formatting for emphasis and structure.
Do not give specific investment advice or recommendations.
Always remind the reader this is educational content, not financial advice.`;

  // Try Gemini first (free tier available)
  try {
    const result = await callGemini(prompt, systemPrompt);
    return { text: result, provider: 'gemini' };
  } catch (geminiError) {
    console.warn('Gemini failed:', geminiError.message);

    // Try Groq if user has API key
    if (groqApiKey) {
      try {
        const result = await callGroq(prompt, systemPrompt);
        return { text: result, provider: 'groq' };
      } catch (groqError) {
        console.warn('Groq failed:', groqError.message);
      }
    }

    // Fall back to local interpretation
    return {
      text: getFallbackInterpretation(analysisData),
      provider: 'local',
    };
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt, systemPrompt) {
  const url = geminiApiKey
    ? `${GEMINI_API_URL}?key=${geminiApiKey}`
    : GEMINI_API_URL;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini API key invalid or not authorized');
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit exceeded');
    }
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  return text;
}

/**
 * Call Groq API with Llama 3
 */
async function callGroq(prompt, systemPrompt) {
  if (!groqApiKey) {
    throw new Error('Groq API key not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Invalid Groq API key');
    }
    if (response.status === 429) {
      throw new Error('Groq rate limit exceeded');
    }
    throw new Error(error.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
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
 * Fallback interpretation when APIs are unavailable
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
*This is educational content generated locally. AI analysis is currently unavailable.*`;
}

// Legacy exports for backwards compatibility
export { loadApiKeys as loadGroqApiKey };
export function isGroqConfigured() {
  return !!groqApiKey;
}
export function setGroqApiKey(key) {
  saveGroqApiKey(key);
}
