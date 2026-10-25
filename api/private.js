// Chroni /private/*: bez sesji przekierowanie na stronę z kodem, z sesją — plik z private-content/.
// Wszystko, co ma być tylko dla członków, wrzucaj do private-content/ (NIE do public/).
const fs = require('fs');
const path = require('path');
const { hasSession } = require('./_session');

const ROOT = path.join(process.cwd(), 'private-content');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.woff2': 'font/woff2',
};

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!hasSession(req)) {
    res.statusCode = 302;
    res.setHeader('Location', '/#strefa');
    return res.end();
  }
  let rel = String(req.query.p || '').replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  let file = path.normalize(path.join(ROOT, rel));
  // katalog bez końcowego „/” → przekierowanie, żeby względne ścieżki (../stub.css) działały
  if (file.startsWith(ROOT + path.sep) && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    res.statusCode = 302;
    res.setHeader('Location', '/private/' + rel.replace(/\/+$/, '') + '/');
    return res.end();
  }
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.statusCode = 404;
    return res.end('Not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
};
