// Adapter biletowy. Dziś: DEMO (konfiguracja z zmiennych środowiskowych, brak płatności i brak zapisu rezerwacji).
// Docelowo: podmień implementację `demoAdapter` na prawdziwy backend/operatora płatności zachowując ten sam interfejs:
//   validateInvite(code)                -> { status: 'valid'|'invalid'|'soldOut', maxSeats, price:{amount,currency}, email? }
//   getEventStatus()                    -> { available: number|null, memberTerms: string|null }
//   createCheckout({code, quantity, idempotencyKey}) -> { status: 'redirect', url } | { status: 'demo', ... }
//   reserveForMember({quantity, idempotencyKey})     -> { status: 'reserved'|'demo'|'soldOut', ... }
// QR-bilet powstaje wyłącznie po potwierdzeniu płatności przez webhook operatora — NIE tutaj.
//
// Zmienne środowiskowe (tylko serwer):
//   TICKET_DEMO_INVITES   JSON: {"KOD123":{"email":"gosc@firma.pl","maxSeats":2,"price":0,"currency":"PLN","expiresAt":"2026-11-20T00:00:00Z"}}
//                         (cena pochodzi z konfiguracji — nic nie jest „wymyślane” w kodzie)
//   TICKET_SEATS_AVAILABLE  liczba wolnych miejsc (0 = brak); puste = nieznane
//   EVENT_MEMBER_TERMS      tekst warunków członkostwa pokazywany w trybie „Członek klubu”
//   TICKET_MEMBER_MAX_SEATS maks. miejsc na jedną rezerwację członka (domyślnie 1)
const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function invites() {
  try { return JSON.parse(process.env.TICKET_DEMO_INVITES || '{}'); } catch { return {}; }
}
function seats() {
  const v = process.env.TICKET_SEATS_AVAILABLE;
  return v === undefined || v === '' ? null : Math.max(0, parseInt(v, 10) || 0);
}
const used = new Set();            // demo: „jednorazowość” tylko w pamięci instancji
const idem = new Map();            // demo: idempotentność checkoutu w pamięci instancji

function findInvite(code) {
  const book = invites();
  for (const k of Object.keys(book)) {
    if (same(String(code).toUpperCase(), k.toUpperCase())) return { key: k, ...book[k] };
  }
  return null;
}

const demoAdapter = {
  mode: 'demo',
  async validateInvite(code) {
    const inv = findInvite(code);
    if (!inv || used.has(inv.key)) return { status: 'invalid' };
    if (inv.expiresAt && Date.parse(inv.expiresAt) < Date.now()) return { status: 'invalid' };
    const left = seats();
    if (left === 0) return { status: 'soldOut' };
    const maxSeats = Math.max(1, Math.min(Number(inv.maxSeats) || 1, left ?? 10));
    return { status: 'valid', maxSeats, price: { amount: Number(inv.price), currency: inv.currency || 'PLN' } };
  },
  async getEventStatus() {
    const left = seats(), cfg = Math.max(1, parseInt(process.env.TICKET_MEMBER_MAX_SEATS || '1', 10) || 1);
    return { available: left, memberTerms: process.env.EVENT_MEMBER_TERMS || null, memberMaxSeats: Math.min(cfg, left ?? cfg) };
  },
  async createCheckout({ code, quantity, idempotencyKey }) {
    if (idempotencyKey && idem.has(idempotencyKey)) return idem.get(idempotencyKey);
    const v = await this.validateInvite(code);                 // ponowna weryfikacja ceny i dostępności
    if (v.status !== 'valid') return { status: v.status };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > v.maxSeats) return { status: 'badQuantity', maxSeats: v.maxSeats };
    const res = { status: 'demo', quantity, total: { amount: v.price.amount * quantity, currency: v.price.currency } };
    if (idempotencyKey) idem.set(idempotencyKey, res);
    return res;
  },
  async reserveForMember({ quantity, idempotencyKey }) {
    if (idempotencyKey && idem.has(idempotencyKey)) return idem.get(idempotencyKey);
    const left = seats();
    if (left === 0) return { status: 'soldOut' };
    const cap = (await this.getEventStatus()).memberMaxSeats;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > cap) return { status: 'badQuantity', maxSeats: cap };
    const res = { status: 'demo', quantity };
    if (idempotencyKey) idem.set(idempotencyKey, res);
    return res;
  },
};

// Tu podłącz prawdziwy adapter (np. Stripe/Przelewy24 + baza zaproszeń), gdy będzie gotowy.
function getAdapter() { return demoAdapter; }

module.exports = { getAdapter };
