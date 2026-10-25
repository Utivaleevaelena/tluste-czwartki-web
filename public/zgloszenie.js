/* Formularz zgłoszenia do klubu: otwiera go przycisk DOŁĄCZ (zdarzenie `club:join-request`). */
(() => {
  'use strict';
  const dlg = document.querySelector('[data-apply]');
  if (!dlg) return;
  const form = dlg.querySelector('[data-apply-form]');
  const submit = dlg.querySelector('[data-apply-submit]');
  const status = dlg.querySelector('[data-apply-status]');
  const errBox = dlg.querySelector('[data-apply-error]');
  const MSG = {
    ok: 'Dziękujemy. Odezwiemy się po weryfikacji zgłoszenia.',
    sending: 'WYSYŁAMY ZGŁOSZENIE…',
    fail: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.',
    rate: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
  };
  let opener = null;

  const field = (n) => form.elements[n];
  const errEl = (n) => dlg.querySelector(`#ap-${n}-err`);
  function setError(n, on) {
    const el = field(n), msg = errEl(n);
    if (!el || !msg) return;
    msg.hidden = !on;
    if (on) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', msg.id); }
    else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
  }
  function check() {
    const v = (n) => field(n).value.trim();
    const digits = v('phone').replace(/\D/g, '');
    const res = {
      name: v('name').length >= 3,
      company: v('company').length >= 2,
      turnover: !!field('turnover').value,
      phone: /^\+?[\d\s().-]{7,}$/.test(v('phone')) && digits.length >= 7 && digits.length <= 15,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')),
      consent: field('consent').checked,
    };
    Object.entries(res).forEach(([n, ok]) => setError(n, !ok));
    return res;
  }

  const snd = () => window.ClubSound;
  function open() {
    snd()?.key();
    opener = document.activeElement;
    status.textContent = ''; errBox.textContent = '';
    if (!dlg.open) dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
    field('name').focus();
  }
  function close() { if (dlg.open) { snd()?.key(); dlg.close(); } }
  dlg.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  });
  dlg.querySelector('[data-apply-close]').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); }); // klik w tło

  window.addEventListener('club:join-request', open);
  if (location.hash === '#zgloszenie') open();

  // Walidacja na bieżąco po pierwszej próbie wysłania
  let tried = false;
  form.addEventListener('input', () => { if (tried) check(); });
  form.addEventListener('change', () => { if (tried) check(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    tried = true;
    errBox.textContent = '';
    const res = check();
    const firstBad = Object.keys(res).find((n) => !res[n]);
    if (firstBad) { field(firstBad).focus(); return; }

    snd()?.thunk();
    submit.disabled = true;
    status.textContent = MSG.sending;
    try {
      const r = await fetch('/api/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: field('name').value, company: field('company').value, turnover: field('turnover').value,
          phone: field('phone').value, email: field('email').value, consent: field('consent').checked,
          website: field('website').value, lang: document.documentElement.lang,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        snd()?.success();
        dlg.classList.add('is-done');
        status.textContent = MSG.ok;
        form.reset(); tried = false;
        dlg.querySelector('[data-apply-close]').focus();
        return;
      }
      status.textContent = '';
      errBox.textContent = r.status === 429 ? MSG.rate : MSG.fail;
    } catch {
      status.textContent = '';
      errBox.textContent = MSG.fail;
    } finally {
      submit.disabled = false;
    }
  });
  dlg.addEventListener('close', () => dlg.classList.remove('is-done'));
})();
