// Vercel Function: keeps the Render free-tier yfinance backend warm.
// Runs on a schedule (see vercel.json crons) and can also be called manually.

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const backendUrl = process.env.YFINANCE_BACKEND_URL
    || process.env.VITE_YFINANCE_BACKEND_URL
    || 'https://stock-options-backend-62j0.onrender.com';

  const started = Date.now();
  try {
    const r = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(60_000),
    });
    const elapsed = Date.now() - started;
    return res.status(200).json({
      ok: r.ok,
      status: r.status,
      elapsedMs: elapsed,
      backendUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: err?.message || String(err),
      elapsedMs: Date.now() - started,
      backendUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
