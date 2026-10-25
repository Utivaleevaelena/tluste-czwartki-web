// /api/tickets/{status|validate|checkout|reserve} — patrz vercel.json (rewrite) i api/_tickets.js (adapter).
// Kody zaproszeń nie są logowane. Weryfikacja i cena wyłącznie po stronie serwera.
const { getAdapter } = require('./_tickets');
const { hasSession } = require('./_session');

const tries = new Map(); // best effort: 8 sprawdzeń kodu / minutę / IP
function limited(ip) {
  const now = Date.now(), list = (tries.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now); tries.set(ip, list);
  return list.length > 8;
}
const readBody = (req) => { try { return typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { return null; } };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const action = String(req.query.action || '');
  const adapter = getAdapter();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  try {
    if (action === 'status') {
      if (req.method !== 'GET') return res.status(405).json({ ok: false });
      return res.status(200).json({ ok: true, demo: adapter.mode === 'demo', ...(await adapter.getEventStatus()) });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false });
    const body = readBody(req);
    if (!body) return res.status(400).json({ ok: false });
    const idempotencyKey = String(req.headers['idempotency-key'] || '').slice(0, 80) || undefined;

    if (action === 'validate') {
      if (limited(ip)) return res.status(429).json({ ok: false, status: 'rateLimited' });
      const code = String(body.code ?? '').trim().slice(0, 64);
      if (!code) return res.status(422).json({ ok: false, status: 'required' });
      const v = await adapter.validateInvite(code);
      return res.status(200).json({ ok: v.status === 'valid', demo: adapter.mode === 'demo', ...v });
    }

    if (action === 'checkout') {
      if (limited(ip)) return res.status(429).json({ ok: false, status: 'rateLimited' });
      const code = String(body.code ?? '').trim().slice(0, 64);
      const out = await adapter.createCheckout({ code, quantity: Number(body.quantity), idempotencyKey });
      const status = out.status === 'demo' || out.status === 'redirect' ? 200 : out.status === 'badQuantity' ? 422 : 409;
      return res.status(status).json({ ok: status === 200, demo: adapter.mode === 'demo', ...out });
    }

    if (action === 'reserve') {
      if (!hasSession(req)) return res.status(401).json({ ok: false, status: 'unauthorized' });
      const out = await adapter.reserveForMember({ quantity: Number(body.quantity), idempotencyKey });
      const status = out.status === 'demo' || out.status === 'reserved' ? 200 : out.status === 'badQuantity' ? 422 : 409;
      return res.status(status).json({ ok: status === 200, demo: adapter.mode === 'demo', ...out });
    }

    return res.status(404).json({ ok: false });
  } catch {
    return res.status(500).json({ ok: false, status: 'error' });
  }
};
