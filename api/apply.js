// POST /api/apply — przyjmuje zgłoszenie do klubu i przekazuje je dalej.
// Dostawa (ustaw w Vercel → Environment Variables), wystarczy jedna z opcji:
//   APPLICATION_WEBHOOK_URL            — dowolny webhook (Make, Zapier, n8n, własny CRM) dostaje JSON ze zgłoszeniem
//   RESEND_API_KEY + APPLICATIONS_TO   — e-mail przez Resend (opcjonalnie APPLICATIONS_FROM)
// Gdy nic nie jest skonfigurowane, endpoint odpowiada 503 i NIC nie zapisuje — zgłoszenia nie giną po cichu.
// Dane osobowe nie są logowane.
const hits = new Map(); // best effort w pamięci instancji: 5 zgłoszeń / 10 min na IP

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function validate(b) {
  const d = {
    name: clean(b.name, 120), company: clean(b.company, 160), turnover: clean(b.turnover, 60),
    phone: clean(b.phone, 40), email: clean(b.email, 160),
  };
  const digits = d.phone.replace(/\D/g, '');
  const errors = {};
  if (d.name.length < 3) errors.name = true;
  if (d.company.length < 2) errors.company = true;
  if (!d.turnover) errors.turnover = true;
  if (!/^\+?[\d\s().-]{7,}$/.test(d.phone) || digits.length < 7 || digits.length > 15) errors.phone = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = true;
  if (b.consent !== true) errors.consent = true;
  return { d, errors };
}

async function deliver(d) {
  const payload = { ...d, consent: true, consentText: 'RODO – zgoda na kontakt w sprawie członkostwa', receivedAt: new Date().toISOString(), source: 'tluste-czwartki-web' };
  if (process.env.APPLICATION_WEBHOOK_URL) {
    const r = await fetch(process.env.APPLICATION_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok;
  }
  if (process.env.RESEND_API_KEY && process.env.APPLICATIONS_TO) {
    const text = `Nowe zgłoszenie do klubu\n\nImię i nazwisko: ${d.name}\nFirma: ${d.company}\nObrót: ${d.turnover}\nTelefon: ${d.phone}\nE-mail: ${d.email}\nZgoda RODO: tak\nData: ${payload.receivedAt}`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.APPLICATIONS_FROM || 'Tłuste Czwartki <onboarding@resend.dev>', to: process.env.APPLICATIONS_TO.split(',').map((s) => s.trim()), reply_to: d.email, subject: `Zgłoszenie do klubu: ${d.name} (${d.company})`, text }),
    });
    return r.ok;
  }
  return null; // brak skonfigurowanego odbiorcy
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: 'rate' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { return res.status(400).json({ ok: false }); }

  if (body.website) return res.status(200).json({ ok: true }); // honeypot: boty dostają „sukces” i nic się nie dzieje

  const { d, errors } = validate(body);
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  hits.set(ip, recent.concat(now));
  try {
    const sent = await deliver(d);
    if (sent === null) return res.status(503).json({ ok: false, error: 'not_configured' });
    if (!sent) return res.status(502).json({ ok: false, error: 'delivery' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: 'delivery' });
  }
};
