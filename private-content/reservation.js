/* Blok 3 — przycisk REZERWUJ MIEJSCE → okno z formularzem → POST /api/apply (type: "reservation").
   Teksty i dane wydarzenia: jeden obiekt CONTENT (data-t w HTML). Czasu i ceny brak — nie są wymyślane. */
(() => {
  'use strict';
  const CONTENT = {
    eyebrow: 'NAJBLIŻSZE SPOTKANIE',
    cta: 'REZERWUJ MIEJSCE',
    event: {
      date: '2026-11-26', displayDate: '26.11.2026', time: null, price: null,
      title: 'Czas i zaangażowanie właściciela', titleMain: 'Czas i zaangażowanie', titleAccent: 'właściciela',
      speaker: 'Michał Borowski', speakerRole: 'CEO & Founder, Nexpertis', venue: 'Tłusta Kaczka', location: 'Gdynia Orłowo',
    },
    dialog: {
      title: 'Rezerwacja miejsca', name: 'Imię i nazwisko', company: 'Firma', optional: '(opcjonalnie)', phone: 'Telefon', email: 'E-mail', seats: 'Liczba miejsc',
      consent: 'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu rezerwacji miejsca na spotkaniu oraz kontaktu w tej sprawie, zgodnie z RODO.',
      submit: 'WYŚLIJ ZGŁOSZENIE',
      errName: 'Podaj imię i nazwisko.', errPhone: 'Podaj poprawny numer telefonu.', errEmail: 'Podaj poprawny adres e-mail.', errConsent: 'Zgoda jest wymagana, aby wysłać zgłoszenie.',
    },
    ui: {
      sending: 'WYSYŁAMY ZGŁOSZENIE…', ok: 'Dziękujemy. Odezwiemy się, aby potwierdzić miejsce.',
      fail: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.', rate: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
    },
    maxSeats: 5,                                  // serwer wymusza ten sam limit
  };

  const root = document.querySelector('[data-tb]');
  const dlg = document.querySelector('[data-rsv]');
  if (!root || !dlg) return;
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), CONTENT);
  document.querySelectorAll('[data-t]').forEach((el) => { const v = get(el.dataset.t); if (typeof v === 'string') el.textContent = v; });

  const form = dlg.querySelector('[data-rsv-form]');
  const submit = dlg.querySelector('[data-rsv-submit]');
  const status = dlg.querySelector('[data-rsv-status]');
  const errBox = dlg.querySelector('[data-rsv-error]');
  const seatsEl = dlg.querySelector('[data-seats]');
  const minus = dlg.querySelector('[data-minus]'), plus = dlg.querySelector('[data-plus]');
  const openBtn = root.querySelector('[data-reserve]');
  const field = (n) => form.elements[n];
  let seats = 1, opener = null, tried = false;

  /* ── liczba miejsc ── */
  function paintSeats() { seatsEl.textContent = String(seats); minus.disabled = seats <= 1; plus.disabled = seats >= CONTENT.maxSeats; }
  minus.addEventListener('click', () => { seats = Math.max(1, seats - 1); paintSeats(); });
  plus.addEventListener('click', () => { seats = Math.min(CONTENT.maxSeats, seats + 1); paintSeats(); });
  paintSeats();

  /* ── otwieranie / zamykanie ── */
  openBtn.addEventListener('pointerdown', () => window.ClubSound?.thunk());
  openBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') window.ClubSound?.thunk(); });
  openBtn.addEventListener('click', () => {
    opener = openBtn; status.textContent = ''; errBox.textContent = '';
    if (!dlg.open) dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
    field('name').focus();
  });
  const close = () => dlg.open && dlg.close();
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; dlg.classList.remove('is-done'); opener && opener.focus({ preventScroll: true }); });
  dlg.querySelector('[data-rsv-close]').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

  /* ── walidacja ── */
  const errEl = (n) => dlg.querySelector(`#rv-${n}-err`);
  function mark(n, bad) { const el = field(n), m = errEl(n); if (!el || !m) return; m.hidden = !bad; if (bad) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', m.id); } else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); } }
  function check() {
    const v = (n) => field(n).value.trim(), digits = v('phone').replace(/\D/g, '');
    const ok = {
      name: v('name').length >= 3,
      phone: /^\+?[\d\s().-]{7,}$/.test(v('phone')) && digits.length >= 7 && digits.length <= 15,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')),
      consent: field('consent').checked,
    };
    Object.entries(ok).forEach(([n, good]) => mark(n, !good));
    return ok;
  }
  form.addEventListener('input', () => { if (tried) check(); });
  form.addEventListener('change', () => { if (tried) check(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); tried = true; errBox.textContent = '';
    const ok = check(), bad = Object.keys(ok).find((n) => !ok[n]);
    if (bad) { field(bad).focus(); return; }
    submit.disabled = true; status.textContent = CONTENT.ui.sending;
    try {
      const r = await fetch('/api/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ type: 'reservation', name: field('name').value, company: field('company').value, phone: field('phone').value, email: field('email').value, seats, consent: field('consent').checked, website: field('website').value }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        dlg.classList.add('is-done'); status.textContent = CONTENT.ui.ok; form.reset(); seats = 1; paintSeats(); tried = false;
        dlg.querySelector('[data-rsv-close]').focus(); return;
      }
      status.textContent = ''; errBox.textContent = r.status === 429 ? CONTENT.ui.rate : CONTENT.ui.fail;
    } catch { status.textContent = ''; errBox.textContent = CONTENT.ui.fail; }
    finally { submit.disabled = false; }
  });

  /* ── animacja wejścia ── */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    root.classList.add('js-anim');
    new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { root.classList.add('is-in'); io.disconnect(); } }, { threshold: .25 }).observe(root);
  }
})();
