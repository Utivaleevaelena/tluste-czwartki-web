/* Strefa Klubowicza — scroll-reveal kurtyny, żywe oko, kod dostępu.
   Bez zależności. Kod dostępu jest weryfikowany WYŁĄCZNIE na serwerze (verifyAccess). */
(() => {
  'use strict';

  const cfg = Object.assign(
    { endpoint: '/api/members/verify', redirect: null, inviteHref: '#zaproszenie' },
    window.STREFA_CONFIG
  );
  const CODE_LENGTH = 4;
  const MSG = {
    checking: 'SPRAWDZAMY DOSTĘP…',
    error: 'KOD NIEPRAWIDŁOWY. SPRÓBUJ PONOWNIE.',
    success: 'WITAJ W KLUBIE.',
  };

  const $ = (s, r = document) => r.querySelector(s);
  const zone = $('[data-zone]');
  const stage = $('[data-stage]');
  const el = {
    wall: $('[data-wall]'), light: $('[data-light]'),
    left: $('[data-curtain-left]'), right: $('[data-curtain-right]'),
    portrait: $('[data-portrait]'), iris: $('[data-iris]'), lid: $('[data-lid]'),
    caption: $('[data-caption]'), keypad: $('[data-keypad]'), pad: $('[data-pad]'),
    invite: $('[data-invite]'), input: $('[data-input]'),
    status: $('[data-status]'), error: $('[data-error]'),
  };
  el.invite.setAttribute('href', cfg.inviteHref);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smooth = (t) => t * t * (3 - 2 * t);

  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reduceMq.matches;
  let progress = 0;

  /* ── Scroll → stan sceny ─────────────────────────────────── */
  // Animacja zajmuje 140svh przewijania; reszta sekcji to „zatrzymanie” — scena stoi w miejscu,
  // żeby przypadkowe mocniejsze przewinięcie nie wyrzucało od razu poniżej bloku.
  const animSpan = () => stage.offsetHeight * 1.4;
  function readProgress() {
    if (reduced) return 1;
    return clamp(-zone.getBoundingClientRect().top / animSpan());
  }

  // Штора догоняет скролл с инерцией: колесо мыши даёт шаги, а штора едет плавно.
  let restPct = 30;
  const readRest = () => { restPct = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rest-pct')) || 30; };
  let slideTarget = 0, slideNow = 0, curtainRaf = 0, curtainLast = 0;
  function curtainLoop(now) {
    curtainRaf = 0;
    const dt = Math.min(64, now - (curtainLast || now)); curtainLast = now;
    const prev = slideNow;
    slideNow += (slideTarget - slideNow) * (1 - Math.exp(-dt / 260));
    // szelest kurtyny ~ prędkość jej ruchu
    window.ClubSound?.rustle(Math.abs(slideNow - prev) / Math.max(dt, 8) * 900);
    if (Math.abs(slideTarget - slideNow) < .0004) slideNow = slideTarget;
    const x = (slideNow * (100 - restPct)).toFixed(3); // połowy zatrzymują się przy krawędziach kadru
    stage.style.setProperty('--logo-o', Math.max(0, 1 - slideNow * 4).toFixed(3)); // logo znika, gdy kurtyna ruszy — nie zostaje na brzegach
    el.left.style.transform = `translate3d(${-x}%,0,0)`;
    el.right.style.transform = `translate3d(${x}%,0,0)`;
    if (slideNow !== slideTarget) curtainRaf = requestAnimationFrame(curtainLoop);
    else { curtainLast = 0; window.ClubSound?.rustle(0); }
  }
  function kickCurtain() { if (!curtainRaf) curtainRaf = requestAnimationFrame(curtainLoop); }

  let live = false;
  function render(p) {
    // Jedyna animacja: zasunięta kurtyna przesuwa się w lewo. Scena pod nią jest statyczna.
    slideTarget = smooth(range(p, .08, .89));
    if (reduced) slideNow = slideTarget;
    kickCurtain();
    live = slideTarget >= .6; // штора уже открыла замок
    el.keypad.style.pointerEvents = live ? '' : 'none';
    stage.classList.toggle('is-closed', p < .6 && !reduced);

    if (p >= .85 && !firstBlinkDone) { firstBlinkDone = true; blink(); }
    if (p < .6) firstBlinkDone = false;
    tracking = p >= .85 && !reduced;
    if (p >= .9) scheduleBlink(); else clearTimeout(blinkTimer), (blinkTimer = 0);
  }

  /* ── Klik / dotyk w zasuniętą kurtynę ją otwiera: płynnie dociągamy przewinięcie do końca animacji ── */
  let autoRaf = 0;
  function cancelAuto() { if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = 0; } }
  function openCurtain() {
    if (reduced || autoRaf) return;
    const from = scrollY, to = zone.getBoundingClientRect().top + scrollY + animSpan();
    if (to - from < 4) return;
    const dur = 2600, t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / dur);
      scrollTo(0, from + (to - from) * ease(t));
      autoRaf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    autoRaf = requestAnimationFrame(step);
  }
  ['wheel', 'touchstart', 'keydown'].forEach((t) => addEventListener(t, cancelAuto, { passive: true }));
  stage.addEventListener('click', (e) => {
    if (progress >= .6 || e.target.closest('a, button, input, label')) return;
    openCurtain();
  });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      progress = readProgress();
      render(progress);
    });
  }

  /* ── Mruganie ─────────────────────────────────────────────── */
  let firstBlinkDone = false, blinkTimer = 0, lidHeld = false;

  function blink(duration = 260) {
    if (reduced || lidHeld || el.portrait.classList.contains('is-closed')) return;
    el.lid.animate(
      [{ opacity: 0 }, { opacity: 1, offset: .32 }, { opacity: 1, offset: .5 }, { opacity: 0 }],
      { duration, easing: 'ease-in-out' }
    );
  }
  function scheduleBlink() {
    if (blinkTimer || reduced) return;
    blinkTimer = setTimeout(() => {
      blinkTimer = 0;
      blink(Math.random() < .2 ? 420 : 260);
      if (Math.random() < .18) setTimeout(() => blink(240), 320); // czasem podwójne
      if (progress >= .9) scheduleBlink();
    }, 4000 + Math.random() * 5000);
  }
  function holdLidClosed() {
    lidHeld = true;
    el.lid.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: 'forwards', easing: 'ease-out' });
  }
  function releaseLid() {
    lidHeld = false;
    el.lid.getAnimations().forEach((a) => a.cancel());
  }

  /* Najechanie myszą na portret zamyka oko (tylko myszka/rysik, gdy scena jest odsłonięta). */
  el.portrait.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || reduced || !live) return;
    el.portrait.classList.add('is-closed');
  });
  el.portrait.addEventListener('pointerleave', () => el.portrait.classList.remove('is-closed'));

  /* ── Śledzenie wzroku (jedna pętla rAF) ────────────────────── */
  const MAX_X = 7, MAX_Y = 4;
  let tracking = false, inView = true, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0;

  function loop(now) {
    raf = 0;
    if (!inView) return;
    const dt = Math.min(48, now - (last || now)); last = now;
    const k = 1 - Math.exp(-dt / 90);
    cx += (tx - cx) * k; cy += (ty - cy) * k;
    el.iris.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
    if (Math.abs(tx - cx) > .02 || Math.abs(ty - cy) > .02) raf = requestAnimationFrame(loop);
    else last = 0;
  }
  function kick() { if (!raf && inView) raf = requestAnimationFrame(loop); }

  function lookAt(clientX, clientY) {
    const r = el.portrait.getBoundingClientRect();
    const s = r.width / 275; // referencyjna szerokość portretu
    const nx = clamp((clientX - (r.left + r.width / 2)) / (innerWidth * .5), -1, 1);
    const ny = clamp((clientY - (r.top + r.height / 2)) / (innerHeight * .5), -1, 1);
    tx = nx * MAX_X * s; ty = ny * MAX_Y * s;
    kick();
  }
  addEventListener('pointermove', (e) => {
    if (reduced || !tracking || e.pointerType === 'touch') return;
    lookAt(e.clientX, e.clientY);
  }, { passive: true });

  // Na dotyku: krótkie spojrzenie w punkt dotknięcia, potem powrót do spokoju.
  let glanceTimer = 0;
  addEventListener('pointerdown', (e) => {
    if (reduced || !tracking || e.pointerType !== 'touch') return;
    lookAt(e.clientX, e.clientY);
    clearTimeout(glanceTimer);
    glanceTimer = setTimeout(() => { tx = 0; ty = 0; kick(); }, 700);
  }, { passive: true });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) kick();
  }, { threshold: 0 }).observe(stage);

  /* ── Kod dostępu ──────────────────────────────────────────── */
  const dots = [...el.keypad.querySelectorAll('.code-dot')];
  const btns = [...el.keypad.querySelectorAll('button')];
  let code = '', busy = false;

  const setState = (s) => { el.keypad.dataset.state = s; };
  function setCode(v) {
    code = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
    el.input.value = code;
    dots.forEach((d, i) => d.classList.toggle('is-filled', i < code.length));
    if (!busy) setState(code ? 'typing' : 'idle');
  }
  function say(kind, text = '') {
    el.status.textContent = kind === 'status' ? text : '';
    el.error.textContent = kind === 'error' ? text : '';
  }
  function setBusy(b) {
    busy = b;
    btns.forEach((n) => { n.disabled = b; });
    el.input.disabled = b;
    el.keypad.setAttribute('aria-busy', String(b));
  }
  function shake() {
    if (reduced) return;
    el.pad.classList.remove('is-shake');
    void el.pad.offsetWidth;
    el.pad.classList.add('is-shake');
  }

  /* Wciśnięty klawisz = gotowy PNG z buttons/pressed (bez transform/scale). */
  const press = (btn, on) => {
    if (!btn) return;
    if (on && !btn.classList.contains('is-pressed')) {
      if (btn.matches('[data-submit]')) window.ClubSound?.thunk(); else window.ClubSound?.key();
    }
    btn.classList.toggle('is-pressed', on);
  };
  btns.forEach((btn) => {
    btn.addEventListener('pointerdown', () => press(btn, true));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => btn.addEventListener(t, () => press(btn, false)));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') press(btn, true); });
    btn.addEventListener('keyup', () => press(btn, false));
    btn.addEventListener('blur', () => press(btn, false));
  });
  const keyBtn = (k) => el.keypad.querySelector(`[data-key="${k}"], [data-action="${k}"]`);

  /**
   * Weryfikacja kodu — TYLKO po stronie serwera.
   * >>> Tu podłączasz prawdziwy endpoint (cfg.endpoint). <<<
   * Kontrakt: POST cfg.endpoint, JSON { code } -> 200 { ok: true, redirect?: string }
   *           błędny kod / blokada -> 401/429 (ok: false). Sesja w cookie HttpOnly; Secure; SameSite.
   * Podgląd bez backendu: ?mock=ok lub ?mock=fail w adresie (bez żadnego prawdziwego kodu).
   */
  async function verifyAccess(value) {
    const mock = new URLSearchParams(location.search).get('mock');
    if (mock) {
      await new Promise((r) => setTimeout(r, 800));
      return { ok: mock === 'ok' };
    }
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json().catch(() => ({}));
      return { ok: data.ok !== false, redirect: data.redirect };
    } catch {
      return { ok: false };
    }
  }

  function fail() {
    setBusy(false);
    setCode('');
    setState('error');
    say('error', MSG.error);
    shake();
    setTimeout(() => { if (!busy && !code) setState('idle'); }, 1600);
    el.input.focus({ preventScroll: true });
  }

  async function submit() {
    if (busy || code.length !== CODE_LENGTH) return; // mniej niż 4 cyfry: bez sprawdzania
    const value = code;
    say('status', MSG.checking);
    setState('checking');
    setBusy(true);
    const result = await verifyAccess(value);
    if (!result.ok) return fail();

    setState('success');
    say('status', MSG.success);
    stage.classList.add('is-success');
    holdLidClosed();
    const target = new URLSearchParams(location.search).has('mock') ? null : (result.redirect || cfg.redirect);
    if (target) {
      setTimeout(() => location.assign(target), 1400);
    } else { // podgląd bez przekierowania
      setTimeout(() => {
        stage.classList.remove('is-success');
        releaseLid(); setBusy(false); setCode(''); setState('idle'); say('status', '');
      }, 2400);
    }
  }

  el.keypad.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  el.keypad.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || busy || b.type === 'submit') return;
    say('error', '');
    if (b.dataset.key !== undefined) setCode(code + b.dataset.key);
    else if (b.dataset.action === 'backspace') setCode(code.slice(0, -1));
    else if (b.dataset.action === 'confirm') submit();
  });
  el.input.addEventListener('input', () => { say('error', ''); setCode(el.input.value); });

  // Fizyczna klawiatura: cyfry, Backspace, Enter — gdy panel jest już odsłonięty.
  addEventListener('keydown', (e) => {
    if (busy || !live || e.metaKey || e.ctrlKey || e.altKey) return;
    const onInput = e.target === el.input;
    if (/^\d$/.test(e.key)) {
      press(keyBtn(e.key), true);
      if (!onInput && !e.target.closest?.('input, textarea')) { e.preventDefault(); say('error', ''); setCode(code + e.key); }
    } else if (e.key === 'Backspace') {
      press(keyBtn('backspace'), true);
      if (!onInput && !e.target.closest?.('input, textarea')) { e.preventDefault(); setCode(code.slice(0, -1)); }
    } else if (e.key === 'Enter' && !e.target.closest?.('button, a')) {
      e.preventDefault(); press(el.keypad.querySelector('[data-submit]'), true); submit();
    }
  });
  addEventListener('keyup', (e) => {
    if (/^\d$/.test(e.key)) press(keyBtn(e.key), false);
    else if (e.key === 'Backspace') press(keyBtn('backspace'), false);
    else if (e.key === 'Enter') press(el.keypad.querySelector('[data-submit]'), false);
  });

  // Wczytaj stany pressed z wyprzedzeniem (są już w DOM jako ukryte obrazy; dekodujemy je od razu).
  el.keypad.querySelectorAll('img').forEach((im) => im.decode?.().catch(() => {}));

  // Fokus z klawiatury na ukrytym jeszcze panelu / linku → przewiń do końca sekcji.
  function revealOnFocus() {
    if (reduced || live) return;
    const top = zone.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + animSpan(), behavior: 'instant' });
  }
  el.keypad.addEventListener('focusin', revealOnFocus);
  el.invite.addEventListener('focusin', revealOnFocus);

  /* ── Start ────────────────────────────────────────────────── */
  function init() {
    readRest();
    reduced = reduceMq.matches;
    progress = readProgress();
    render(progress);
    if (reduced) {
      // Krótkie, miękkie pojawienie się zamiast scrollowanej choreografii.
      stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { readRest(); kickCurtain(); onScroll(); });
  reduceMq.addEventListener('change', () => { init(); });
  init();
})();
