/* Fotogaleria: closed → opening → open → closing → closed. Tylko transform/opacity (CSS), JS pilnuje stanów i fokusu. */
(() => {
  'use strict';
  const root = document.querySelector('[data-gal]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const openBtn = $('[data-open]');
  const closeBtn = $('[data-close]');
  const panel = $('[data-panel]');
  const title = $('[data-title]');
  const dl = $('[data-download]');
  const dlNote = $('[data-download-note]');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OPEN_MS = 1950;   // do końca przesuwu kurtyn i zejścia obsługi (czasy ×1.6)
  const CLOSE_MS = 2000;
  let state = 'closed', timer = 0;

  /* ── Link do pobrania: tylko prawdziwy adres, bez „#” ── */
  const href = (root.dataset.downloadHref || '').trim();
  if (href) {
    dl.setAttribute('href', href);
    dl.removeAttribute('aria-disabled');
    if (/^https?:\/\//i.test(href) && new URL(href, location.href).origin !== location.origin) { dl.target = '_blank'; dl.rel = 'noopener noreferrer'; }
    else dl.setAttribute('download', '');
    dlNote.hidden = true;
  }
  dl.addEventListener('click', (e) => { if (!dl.hasAttribute('href')) e.preventDefault(); });

  function set(next) {
    state = next;
    root.dataset.state = next;
    const isOpen = next === 'opening' || next === 'open';
    openBtn.setAttribute('aria-expanded', String(isOpen));
    panel.toggleAttribute('inert', !(next === 'open' || next === 'opening'));
  }

  function open() {
    if (state !== 'closed') return;
    clearTimeout(timer);
    if (reduced()) { set('open'); title.focus({ preventScroll: true }); return; }
    set('opening');
    timer = setTimeout(() => { set('open'); title.focus({ preventScroll: true }); }, OPEN_MS);
  }
  function close() {
    if (state !== 'open') return;
    clearTimeout(timer);
    if (reduced()) { set('closed'); openBtn.focus({ preventScroll: true }); return; }
    set('closing');
    timer = setTimeout(() => { set('closed'); openBtn.focus({ preventScroll: true }); }, CLOSE_MS);
    root.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  // Wciśnięty wygląd przycisku zaraz po kliknięciu (0–120 ms), potem start animacji.
  openBtn.addEventListener('click', () => {
    if (state !== 'closed') return;
    openBtn.classList.add('is-pressed');
    const go = () => { openBtn.classList.remove('is-pressed'); open(); };
    reduced() ? go() : setTimeout(go, 110);
  });
  closeBtn.addEventListener('click', close);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state === 'open' && !lb.open) close(); });
  set('closed');

  /* ── Powiększenie zdjęcia ── */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbCap = $('[data-lb-cap]');
  const thumbs = [...root.querySelectorAll('.gal__thumb')];
  let cur = 0, lastThumb = null;
  function show(i) {
    cur = (i + thumbs.length) % thumbs.length;
    const im = thumbs[cur].querySelector('img');
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; lbCap.textContent = `${cur + 1} / ${thumbs.length} — ${im.alt}`;
  }
  thumbs.forEach((t, i) => t.addEventListener('click', () => { lastThumb = t; show(i); lb.showModal(); }));
  $('[data-lb-prev]').addEventListener('click', () => show(cur - 1));
  $('[data-lb-next]').addEventListener('click', () => show(cur + 1));
  $('[data-lb-close]').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
  lb.addEventListener('close', () => { lastThumb && lastThumb.focus({ preventScroll: true }); });
})();
