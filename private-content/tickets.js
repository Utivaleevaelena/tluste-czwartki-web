/* Blok 3 — bilet / rezerwacja. Wszystkie teksty i dane wydarzenia: obiekt CONTENT poniżej (jedno źródło).
   Backend: POST /api/tickets/{validate,checkout,reserve}, GET /api/tickets/status — kod zaproszenia NIE jest sprawdzany w przeglądarce. */
(() => {
  'use strict';

  const CONTENT = {
    locale: 'pl-PL',
    eyebrow: 'NAJBLIŻSZE SPOTKANIE',
    event: {
      date: '2026-11-26', displayDate: '26.11.2026', time: null,           // czasu i ceny brak — nie są wymyślane
      title: 'Czas i zaangażowanie właściciela', titleMain: 'Czas i zaangażowanie', titleAccent: 'właściciela',
      speaker: 'Michał Borowski', speakerRole: 'CEO & Founder, Nexpertis', venue: 'Tłusta Kaczka', location: 'Gdynia Orłowo', price: null, currency: 'PLN',
    },
    booking: {
      heading: 'BILET / REZERWACJA', defaultMode: 'guest',
      modes: { member: 'CZŁONEK KLUBU', guest: 'GOŚĆ Z ZAPROSZENIEM' },
      inviteCodeLabel: 'KOD ZAPROSZENIA', inviteCodePlaceholder: '••••••', quantityLabel: 'LICZBA MIEJSC',
      purchaseCta: 'KUP BILET', reserveCta: 'ZAREZERWUJ MIEJSCE', memberSwitchCopy: 'JESTEŚ CZŁONKIEM? ZAREZERWUJ MIEJSCE →',
      confirmationCopy: 'MIEJSCE ZOSTANIE POTWIERDZONE PO ZAKUPIE', waitlistCta: 'DOŁĄCZ DO LISTY OCZEKUJĄCYCH',
    },
    validation: {
      required: 'Wpisz kod zaproszenia.', checking: 'Sprawdzamy zaproszenie…', invalid: 'Ten kod jest nieprawidłowy albo wygasł.',
      valid: 'Zaproszenie zostało potwierdzone.', soldOut: 'Brak wolnych miejsc. Możesz dołączyć do listy oczekujących.',
      paymentError: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
    },
    // komunikaty dodatkowe (stany, które nie występują w content.json)
    ui: {
      rateLimited: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
      processing: 'Przygotowujemy płatność…',
      demoCheckout: 'Płatność nie została rozpoczęta — operator płatności nie jest jeszcze podłączony. Kod pozostaje ważny.',
      demoReserve: 'Rezerwacja nie została zapisana — system rezerwacji nie jest jeszcze podłączony.',
      reserved: 'Miejsce zostało zarezerwowane.',
      waitlistDemo: 'Lista oczekujących nie jest jeszcze dostępna.',
      memberChecking: 'Sprawdzamy dostępność miejsc…',
      memberAvailable: (n) => (n === null ? 'Dostępność miejsc potwierdzi serwer przy rezerwacji.' : `Wolne miejsca: ${n}`),
      memberSoldOut: 'Brak wolnych miejsc.',
      sessionExpired: 'Sesja wygasła — wracamy do logowania…',
      price: (unit, total, n) => `Cena potwierdzona: ${unit} / miejsce${n > 1 ? ` · Razem: ${total}` : ''}`,
      demoTag: 'TRYB DEMO',
    },
  };

  const root = document.querySelector('[data-tb]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), CONTENT);
  root.querySelectorAll('[data-t]').forEach((el) => { const v = get(el.dataset.t); if (typeof v === 'string') el.textContent = v; });

  const el = {
    tabs: $('[data-tabs]'), form: $('[data-form]'), code: $('[data-code]'), minus: $('[data-minus]'), plus: $('[data-plus]'), qty: $('[data-qty]'),
    price: $('[data-price]'), cta: $('[data-cta]'), ctaLabel: $('[data-cta-label]'), msg: $('[data-msg]'), sw: $('[data-switch]'), swLabel: $('[data-switch-label]'),
    guestOnly: $('[data-guest-only]'), memberOnly: $('[data-member-only]'), avail: $('[data-member-avail]'), terms: $('[data-member-terms]'),
  };
  el.code.placeholder = CONTENT.booking.inviteCodePlaceholder;
  el.swLabel.textContent = CONTENT.booking.memberSwitchCopy.replace(/\s*→\s*$/, '');

  /* ── Stan ─────────────────────────────────────────────── */
  // idle | validating | valid | invalid | soldOut | processing | success | error
  let state = 'idle', mode = CONTENT.booking.defaultMode, qty = 1, maxQty = 1, priceInfo = null, demo = true;
  let memberStatus = null, validateSeq = 0, idemKey = null, debounce = 0;

  const money = (amount, currency) => new Intl.NumberFormat(CONTENT.locale, { style: 'currency', currency }).format(amount);
  function say(text, kind, demoTag) {
    el.msg.dataset.kind = kind || '';
    el.msg.replaceChildren();
    if (!text) return;
    if (demoTag) { const t = document.createElement('span'); t.className = 'tb__demo-tag'; t.textContent = CONTENT.ui.demoTag; el.msg.append(t); }
    el.msg.append(document.createTextNode(text));
  }
  const busy = () => state === 'validating' || state === 'processing';

  function render() {
    root.dataset.state = state;
    root.dataset.mode = mode;
    el.tabs.dataset.mode = mode;
    const guest = mode === 'guest';
    el.guestOnly.hidden = !guest; el.memberOnly.hidden = guest; el.sw.hidden = !guest;

    // etykieta i dostępność przycisku głównego
    let label = guest ? CONTENT.booking.purchaseCta : CONTENT.booking.reserveCta, enabled = false;
    if (guest) {
      enabled = state === 'valid' || state === 'error' && !!priceInfo;
      if (state === 'soldOut') { label = CONTENT.booking.waitlistCta; enabled = true; }
    } else {
      const soldOut = memberStatus && memberStatus.available === 0;
      if (soldOut) { label = CONTENT.booking.waitlistCta; enabled = true; }
      else enabled = !!memberStatus && (state === 'idle' || state === 'valid' || state === 'error');
    }
    if (busy() || state === 'success') enabled = false;
    el.ctaLabel.textContent = label;
    el.cta.disabled = !enabled;
    el.cta.setAttribute('aria-disabled', String(!enabled));
    el.code.disabled = state === 'validating' || state === 'processing';
    if (state === 'invalid') el.code.setAttribute('aria-invalid', 'true'); else el.code.removeAttribute('aria-invalid');

    // licznik
    const max = guest ? (state === 'valid' || state === 'error' && priceInfo ? maxQty : 1) : (memberStatus ? memberStatus.memberMaxSeats || 1 : 1);
    qty = Math.min(Math.max(1, qty), max);
    el.qty.textContent = String(qty);
    el.minus.disabled = busy() || qty <= 1;
    el.plus.disabled = busy() || qty >= max;

    // cena — tylko po potwierdzeniu przez backend
    const showPrice = guest && priceInfo && Number.isFinite(priceInfo.amount) && (state === 'valid' || state === 'processing' || state === 'success' || state === 'error');
    el.price.hidden = !showPrice;
    if (showPrice) el.price.textContent = CONTENT.ui.price(money(priceInfo.amount, priceInfo.currency), money(priceInfo.amount * qty, priceInfo.currency), qty);
  }

  function setState(next, text, kind, demoTag) { state = next; say(text, kind, demoTag); render(); }

  /* ── API ──────────────────────────────────────────────── */
  async function api(path, body, headers = {}) {
    const res = await fetch(`/api/tickets/${path}`, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers, body: body ? JSON.stringify(body) : undefined,
    });
    let data = {}; try { data = await res.json(); } catch {}
    return { res, data };
  }

  /* ── Gość z zaproszeniem ─────────────────────────────── */
  async function validate() {
    const code = el.code.value.trim();
    if (!code) { priceInfo = null; return setState('invalid', CONTENT.validation.required, 'error'); }
    const seq = ++validateSeq;
    priceInfo = null; idemKey = null;
    setState('validating', CONTENT.validation.checking, 'progress');
    try {
      const { res, data } = await api('validate', { code });
      if (seq !== validateSeq) return;
      demo = data.demo !== false;
      if (res.status === 429) return setState('error', CONTENT.ui.rateLimited, 'error');
      if (data.status === 'valid') {
        priceInfo = data.price; maxQty = Math.max(1, data.maxSeats | 0); qty = 1;
        return setState('valid', CONTENT.validation.valid, 'success');
      }
      if (data.status === 'soldOut') return setState('soldOut', CONTENT.validation.soldOut, 'error');
      return setState('invalid', CONTENT.validation.invalid, 'error');
    } catch {
      if (seq === validateSeq) setState('error', CONTENT.validation.paymentError, 'error');
    }
  }
  el.code.addEventListener('input', () => {
    validateSeq++; priceInfo = null; idemKey = null; clearTimeout(debounce);
    if (state !== 'idle') setState('idle', '', '');
    if (el.code.value.trim().length >= 4) debounce = setTimeout(validate, 800);
  });
  el.code.addEventListener('blur', () => { if (el.code.value.trim() && state === 'idle') { clearTimeout(debounce); validate(); } });
  el.code.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(debounce); if (state !== 'valid') validate(); else el.cta.focus(); } });

  /* ── Członek klubu ───────────────────────────────────── */
  async function loadMemberStatus() {
    if (memberStatus) return render();
    setState('idle', CONTENT.ui.memberChecking, 'progress');
    try {
      const { data } = await api('status');
      demo = data.demo !== false;
      memberStatus = { available: data.available ?? null, memberMaxSeats: data.memberMaxSeats || 1, terms: data.memberTerms || null };
      say('', '');
    } catch {
      memberStatus = null; say(CONTENT.validation.paymentError, 'error');
    }
    paintMember(); render();
  }
  function paintMember() {
    if (!memberStatus) { el.avail.textContent = ''; el.terms.hidden = true; return; }
    el.avail.textContent = memberStatus.available === 0 ? CONTENT.ui.memberSoldOut : CONTENT.ui.memberAvailable(memberStatus.available);
    el.terms.hidden = !memberStatus.terms; el.terms.textContent = memberStatus.terms || '';
  }

  /* ── Zakładki ────────────────────────────────────────── */
  function setMode(next, focus) {
    if (next === mode || busy()) return;
    mode = next; qty = 1; idemKey = null; validateSeq++;
    el.tabs.querySelectorAll('[role=tab]').forEach((t) => { const on = t.dataset.mode === mode; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    el.form.setAttribute('aria-labelledby', `tab-${mode}`);
    state = 'idle'; say('', '');
    if (mode === 'member') { render(); loadMemberStatus(); } else { render(); }
  }
  el.tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) setMode(b.dataset.mode, false); });
  el.tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault(); setMode(mode === 'guest' ? 'member' : 'guest', true);
  });
  el.sw.addEventListener('click', () => setMode('member', true));

  /* ── Licznik ─────────────────────────────────────────── */
  el.minus.addEventListener('click', () => { qty -= 1; idemKey = null; render(); });
  el.plus.addEventListener('click', () => { qty += 1; idemKey = null; render(); });

  /* ── Główny przycisk ─────────────────────────────────── */
  const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (el.cta.disabled || busy()) return;
    idemKey = idemKey || newKey();                               // ten sam klucz przy powtórzeniu = brak podwójnej płatności
    const headers = { 'Idempotency-Key': idemKey };

    if (mode === 'guest') {
      if (state === 'soldOut') return say(CONTENT.ui.waitlistDemo, 'error', true);
      setState('processing', CONTENT.ui.processing, 'progress');
      try {
        const { res, data } = await api('checkout', { code: el.code.value.trim(), quantity: qty }, headers);
        if (res.status === 429) return setState('error', CONTENT.ui.rateLimited, 'error');
        if (data.status === 'redirect' && data.url) { location.assign(data.url); return; }   // prawdziwy operator płatności
        if (data.status === 'demo') return setState('success', CONTENT.ui.demoCheckout, 'success', true);
        if (data.status === 'soldOut') return setState('soldOut', CONTENT.validation.soldOut, 'error');
        if (data.status === 'invalid') { priceInfo = null; return setState('invalid', CONTENT.validation.invalid, 'error'); }
        if (data.status === 'badQuantity') { maxQty = data.maxSeats || 1; qty = Math.min(qty, maxQty); return setState('error', CONTENT.validation.paymentError, 'error'); }
        return setState('error', CONTENT.validation.paymentError, 'error');
      } catch { return setState('error', CONTENT.validation.paymentError, 'error'); }
    }

    // członek klubu
    if (memberStatus && memberStatus.available === 0) return say(CONTENT.ui.waitlistDemo, 'error', true);
    setState('processing', CONTENT.ui.processing, 'progress');
    try {
      const { res, data } = await api('reserve', { quantity: qty }, headers);
      if (res.status === 401) { say(CONTENT.ui.sessionExpired, 'error'); setTimeout(() => location.assign('/#strefa'), 1200); return; }
      if (data.status === 'reserved') return setState('success', CONTENT.ui.reserved, 'success');
      if (data.status === 'demo') return setState('success', CONTENT.ui.demoReserve, 'success', true);
      if (data.status === 'soldOut') { memberStatus = { ...memberStatus, available: 0 }; paintMember(); return setState('idle', CONTENT.ui.memberSoldOut, 'error'); }
      return setState('error', CONTENT.validation.paymentError, 'error');
    } catch { return setState('error', CONTENT.validation.paymentError, 'error'); }
  });

  /* ── Animacja wejścia ────────────────────────────────── */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-anim');
    new IntersectionObserver((entries, io) => { if (entries[0].isIntersecting) { root.classList.add('is-in'); io.disconnect(); } }, { threshold: .25 }).observe(root);
  }

  render();
})();
