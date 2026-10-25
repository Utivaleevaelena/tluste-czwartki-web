/* Blok 2 — zaproszenie: wjazd ręki z kartą przy scrollu + przycisk DOŁĄCZ. Bez zależności. */
(() => {
  'use strict';
  const zone = document.querySelector('[data-inv]');
  if (!zone) return;
  const stage = zone.querySelector('[data-inv-stage]');
  const group = zone.querySelector('[data-inv-group]');
  const join = zone.querySelector('[data-join]');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ── Przesuw przy scrollu (jeden kontener: karta + ręka) ───── */
  let target = 0, now = 0, raf = 0, last = 0, inView = false;
  const span = () => Math.max(1, zone.offsetHeight - stage.offsetHeight);
  // Postęp liczymy od chwili, gdy blok zaczyna wjeżdżać od dołu ekranu (top = wysokość okna),
  // więc ręka rusza razem z nim, a nie dopiero po przypięciu sceny.
  const progress = () => {
    if (mq.matches) return 1;
    const vh = innerHeight;
    return clamp((vh - zone.getBoundingClientRect().top) / (vh + span()));
  };

  function pose(p) {
    // poza kadrem → wjazd → miękkie dojście z lekkim przeregulowaniem → stoi
    // q=0: blok dotyka dołu ekranu · q≈.45: scena przypięta · ręka jedzie od q=.03 do q=.5 (bez opóźnienia po przypięciu)
    const slide = easeOut(range(p, .03, .5));
    const settle = range(p, .5, .62);
    const overshoot = Math.sin(settle * Math.PI) * -1.2;      // vw
    const x = (1 - slide) * 70 + overshoot;                  // vw
    const y = (1 - slide) * 4;                               // svh
    const rot = (1 - slide) * 2.5;                           // deg
    group.style.transform = `translate3d(${x.toFixed(3)}vw,${y.toFixed(3)}svh,0) rotate(${rot.toFixed(3)}deg)`;
  }

  function loop(t) {
    raf = 0;
    const dt = Math.min(64, t - (last || t)); last = t;
    now += (target - now) * (1 - Math.exp(-dt / 140));
    if (Math.abs(target - now) < .0004) now = target;
    pose(now);
    if (now !== target && inView) raf = requestAnimationFrame(loop); else last = 0;
  }
  function onScroll() {
    target = progress();
    if (mq.matches) { now = target; pose(now); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) onScroll(); }, { rootMargin: '200px 0px' }).observe(zone);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  mq.addEventListener('change', onScroll);
  now = target = progress(); pose(now);

  /* ── Przycisk DOŁĄCZ: wciśnięty PNG + zdarzenie dla formularza zgłoszeń ── */
  const press = (on) => {
    if (on && !join.classList.contains('is-pressed')) window.ClubSound?.thunk();
    join.classList.toggle('is-pressed', on);
  };
  join.addEventListener('pointerdown', () => press(true));
  ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((t) => join.addEventListener(t, () => press(false)));
  join.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') press(true); });
  join.addEventListener('keyup', () => press(false));
  join.querySelectorAll('img').forEach((im) => im.decode?.().catch(() => {}));

  /**
   * Tu podłącz formularz zgłoszeń. Adres/formularz nie jest jeszcze zatwierdzony,
   * więc nic nie wysyłamy — emitujemy tylko zdarzenie `club:join-request`
   * i wywołujemy opcjonalny window.STREFA_CONFIG.onJoinRequest().
   */
  join.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('club:join-request'));
    window.STREFA_CONFIG?.onJoinRequest?.();
  });

  /* ── Link „POPROŚ O ZAPROSZENIE →” z bloku 1 przewija do gotowej sceny ── */
  document.querySelectorAll('a[href="#zaproszenie"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const top = zone.getBoundingClientRect().top + scrollY + span() * .5;
      scrollTo({ top, behavior: mq.matches ? 'instant' : 'smooth' });
      history.replaceState(null, '', '#zaproszenie');
    });
  });
})();
