// Lokalny podgląd bez Vercel CLI:  node dev-server.js   →  http://127.0.0.1:8765
// Czyta .env.local (MEMBERS_CODE, SESSION_SECRET) i odtwarza routing z vercel.json.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { console.warn('Brak .env.local — skopiuj .env.example i uzupełnij.'); }

const verify = require('./api/verify');
const apply = require('./api/apply');
const tickets = require('./api/tickets');
const priv = require('./api/private');
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function shim(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  shim(res);
  if (url.pathname.startsWith('/api/tickets/')) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    return req.on('end', () => { try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; } req.query = { action: url.pathname.split('/').pop() }; tickets(req, res); });
  }
  if (url.pathname === '/api/apply') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    return req.on('end', () => { try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; } apply(req, res); });
  }
  if (url.pathname === '/api/members/verify') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    return req.on('end', () => { try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; } verify(req, res); });
  }
  if (url.pathname === '/private' || url.pathname.startsWith('/private/')) {
    req.query = { p: url.pathname.replace(/^\/private\/?/, '') };
    return priv(req, res);
  }
  let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
}).listen(8765, '127.0.0.1', () => console.log('http://127.0.0.1:8765/index.html'));
