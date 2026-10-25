// POST /api/members/verify  { "code": "1234" } -> { ok, redirect }
// Kod dostępu jest tylko w zmiennej środowiskowej MEMBERS_CODE (Vercel → Settings → Environment Variables).
const crypto = require('crypto');
const { sessionCookie } = require('./_session');

const MAX_FAILS = 5, WINDOW_MS = 60_000, LOCKOUT_MS = 60_000;
// Uwaga: pamięć instancji — to ochrona „best effort”. Na produkcji dodaj Vercel Firewall / KV rate limit.
const fails = new Map(), locked = new Map();

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  if ((locked.get(ip) || 0) > now) return res.status(429).json({ ok: false });

  const expected = process.env.MEMBERS_CODE;
  if (!expected) return res.status(500).json({ ok: false });

  let code = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    code = String(body.code ?? '').slice(0, 16);
  } catch {
    return res.status(400).json({ ok: false });
  }

  if (crypto.timingSafeEqual(digest(code), digest(expected))) {
    fails.delete(ip);
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ ok: true, redirect: '/private/' });
  }

  const recent = (fails.get(ip) || []).filter((t) => now - t < WINDOW_MS).concat(now);
  fails.set(ip, recent);
  if (recent.length >= MAX_FAILS) { locked.set(ip, now + LOCKOUT_MS); fails.delete(ip); }
  return res.status(401).json({ ok: false });
};
