// Wspólna logika sesji (plik z prefiksem "_" nie jest publicznym endpointem).
const crypto = require('crypto');

const COOKIE = 'club_session';
const TTL = 60 * 60 * 8; // 8 godzin

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

function sign(exp) {
  const sig = crypto.createHmac('sha256', secret()).update(String(exp)).digest('base64url');
  return `${exp}.${sig}`;
}

function valid(token) {
  try {
    const exp = Number(token.split('.')[0]);
    if (!exp || exp * 1000 < Date.now()) return false;
    const a = Buffer.from(token), b = Buffer.from(sign(exp));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hasSession(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  return !!m && valid(m[1]);
}

function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return `${COOKIE}=${sign(exp)}; Path=/; HttpOnly${process.env.VERCEL ? "; Secure" : ""}; SameSite=Lax; Max-Age=${TTL}`;
}

module.exports = { hasSession, sessionCookie };
