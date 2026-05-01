// Vercel Function: server-side Gemini proxy so users get real AI without needing
// to bring their own key. Set GEMINI_API_KEY in Vercel project env vars.
// Falls through (502) if no key is configured — client retries with its own keys
// or the local fallback template.

export const config = { runtime: 'nodejs' };

// Model selection. gemini-2.5-flash is the current free-tier general-purpose
// recommendation per https://ai.google.dev/gemini-api/docs/models — gemini-1.5-flash
// and 2.0-flash are deprecated. Override with GEMINI_MODEL if you need a newer
// model later (e.g. gemini-3-flash-preview) without touching this file.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Naive in-memory rate limit per Vercel instance to stop runaway abuse.
// Fluid Compute reuses instances, so this is meaningfully effective per region.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
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
          maxOutputTokens: 600,
          topP: 0.95,
          topK: 40,
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
