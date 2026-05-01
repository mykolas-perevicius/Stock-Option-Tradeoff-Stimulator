// Vercel Function: server-side Gemini proxy so users get real AI without needing
// to bring their own key. Set GEMINI_API_KEY in Vercel project env vars.
// Falls through (502) if no key is configured — client retries with its own keys
// or the local fallback template.

export const config = { runtime: 'nodejs' };

// Model selection. Defaulting to gemini-2.5-flash-lite: full gemini-2.5-flash
// has only 5 RPM on the free tier which gets tripped instantly by even modest
// traffic, while -lite has substantially higher free-tier RPM and is plenty
// capable for short educational explanations. Override with GEMINI_MODEL env
// var to switch to the full flash, a preview model, etc.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Naive in-memory rate limit per Vercel instance to stop runaway abuse.
// Fluid Compute reuses instances, so this is meaningfully effective per region.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const HITS_MAX_KEYS = 5000;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);

  // Cap the map so a long-lived instance with many unique IPs doesn't grow
  // unbounded. Drop the oldest insertion order when over the limit.
  if (hits.size > HITS_MAX_KEYS) {
    const firstKey = hits.keys().next().value;
    if (firstKey !== undefined) hits.delete(firstKey);
  }
  // Also evict any IP whose entire window has expired.
  if (arr.length === 0) hits.delete(ip);

  return arr.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(502).json({ error: 'Server AI not configured' });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  let prompt = '';
  let systemPrompt = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    prompt = String(body?.prompt || '').slice(0, 8000);
    systemPrompt = String(body?.systemPrompt || '').slice(0, 2000);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const r = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
        generationConfig: {
          temperature: 0.7,
          // Generous: gemini-2.5 family burns "thinking tokens" against this
          // limit by default. We disable thinking below, but leave headroom
          // for full multi-paragraph educational responses.
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40,
          // Disable internal reasoning. Thinking tokens are fine for hard
          // problems but pure overhead for "explain this option in plain
          // English." Without this, short prompts return truncated text.
          thinkingConfig: { thinkingBudget: 0 },
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Gemini ${r.status}`, detail: detail.slice(0, 500) });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: 'Empty Gemini response' });
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: err?.message || String(err) });
  }
}
