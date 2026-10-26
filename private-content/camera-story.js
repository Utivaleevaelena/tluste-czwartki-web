/* Blok 4 „Historia marki”: uruchamia animację raz (IntersectionObserver ~35% sekcji), zatrzymuje na finale, pokazuje „ODTWÓRZ PONOWNIE”.
   Stany: idle → playing → done (data-state na .cs); static = prefers-reduced-motion. Cały timing jest w camera-story.css (zmienne na początku .cs). */
(() => {
  'use strict';
  const root = document.querySelector('[data-cs]');
  if (!root) return;
  root.setAttribute('data-js', '');

  const frames = [...root.querySelectorAll('.cs__frame')];
  const replayBtn = root.querySelector('[data-cs-replay]');
  const cta = root.querySelector('[data-cs-cta]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const START_RATIO = 0.35;
  let state = 'idle', started = false, timer = 0;

  function setState(next) {
    state = next;
    root.dataset.state = next;
    if (next === 'playing' || next === 'done') root.setAttribute('data-run', ''); else root.removeAttribute('data-run');
  }

  /* ── Kadry: pierwszy ładowany z wyprzedzeniem, reszta tuż przed startem timeline ── */
  function load(list) {
    return Promise.all(list.map((img) => {
      img.loading = 'eager';
      if (img.complete && img.naturalWidth) return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      return new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
    }));
  }
  const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

  /* ── Odtwarzanie ── */
  function endMs() {
    const v = parseFloat(getComputedStyle(root).getPropertyValue('--t-end'));
    return (Number.isFinite(v) ? v : 15.2) * 1000;
  }
  function finish() { clearTimeout(timer); if (state === 'playing') setState('done'); }
  function run() {
    setState('playing');
    clearTimeout(timer);
    timer = setTimeout(finish, endMs() + 400);   // zapas na wypadek braku zdarzenia animationend
  }
  root.addEventListener('animationend', (e) => { if (e.target === cta && e.animationName === 'cs-rise') finish(); });

  async function start() {
    if (started) return;
    started = true;
    await within(load(frames), 4000);
    if (reduced.matches) setState('static'); else run();
  }

  function replay() {
    if (reduced.matches) return;
    setState('idle');
    void root.offsetWidth;   // restart animacji CSS
    run();
  }
  replayBtn.addEventListener('click', replay);

  /* ── Kliknięcie WhatsApp: zdarzenie dla analityki (creator_ad_whatsapp_click) ── */
  cta.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('creator-ad:whatsapp-click'));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'creator_ad_whatsapp_click' });
  });
  /* ── Wersja bez ruchu: statyczny kadr 4 + skrócony zakres usług + CTA ── */
  function toStatic() {
    clearTimeout(timer);
    setState('static');
    load([frames[3]]);
  }
  reduced.addEventListener('change', () => { if (reduced.matches) toStatic(); });
  if (reduced.matches) { started = true; toStatic(); return; }

  /* ── Wczytanie z wyprzedzeniem i start po wejściu ~35% sekcji w viewport ── */
  if (!('IntersectionObserver' in window)) { start(); return; }
  const near = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { frames.forEach((img) => { img.loading = 'eager'; }); near.disconnect(); }
  }, { rootMargin: '120% 0px' });
  near.observe(root);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const tall = e.intersectionRect.height >= innerHeight * 0.6;   // sekcja wyższa niż ekran: wystarczy duży fragment
      if (e.isIntersecting && (e.intersectionRatio >= START_RATIO || tall)) { io.disconnect(); start(); }
    }
  }, { threshold: [0, START_RATIO, 0.6] });
  io.observe(root);

})();
