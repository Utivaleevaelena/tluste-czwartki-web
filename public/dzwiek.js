/* Dźwięk: syntezowany w Web Audio (bez plików). Domyślnie wyłączony; włącza go ikona w rogu (zapamiętywane).
   API: ClubSound.key() — klik klawisza, ClubSound.thunk() — przycisk OTWÓRZ/DOŁĄCZ, ClubSound.rustle(0..1) — szelest kurtyny. */
(() => {
  'use strict';
  const KEY = 'club-sound';
  let ctx = null, master = null, noiseBuf = null, rustleGain = null, rustleSrc = null, curtainNorm = 1, lastLevel = 0;
  let enabled = false;
  try { enabled = localStorage.getItem(KEY) === '1'; } catch {}

  function makeNoise(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; // lekko „różowy” szum: cieplejszy, mniej syczący
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = .997 * b0 + w * .029591; b1 = .985 * b1 + w * .032534; b2 = .95 * b2 + w * .048056;
      d[i] = (b0 + b1 + b2 + w * .1848) * 2.2;
    }
    return buf;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .55;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = makeNoise(2);

    // szelest kurtyny: długie nagranie (114 s, równa faktura) w pętli; głośność podąża za prędkością ruchu kurtyny
    rustleGain = ctx.createGain(); rustleGain.gain.value = 0; rustleGain.connect(master);
    fetch('assets/sounds/curtain-rustle.mp3').then((r) => r.arrayBuffer()).then((ab) => new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no)))
      .then((buf) => {
        const ch = buf.getChannelData(0), bins = new Uint32Array(1001); let sum = 0, n = 0, max = 0;
        for (let i = 0; i < ch.length; i += 7) { const v = Math.abs(ch[i]); sum += v * v; n++; if (v > max) max = v; }
        for (let i = 0; i < ch.length; i += 7) bins[Math.min(1000, Math.floor(Math.abs(ch[i]) / (max || 1) * 1000))]++;
        let acc = 0, p999 = max; // 99.9. percentyl — pojedyncze „strzały” nie mogą wyznaczać głośności całości
        for (let k = 0; k <= 1000; k++) { acc += bins[k]; if (acc >= n * .999) { p999 = (k / 1000) * max; break; } }
        const rms = Math.sqrt(sum / n) || .004;
        curtainNorm = Math.min(.12 / rms, .5 / (p999 || .05));   // nagranie jest bardzo ciche — wyrównujemy głośność
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        src.loopStart = 4; src.loopEnd = Math.min(buf.duration, 40);
        src.connect(rustleGain); src.start(0, 4 + Math.random() * 30);
        rustleSrc = src;
        api.rustle(lastLevel);
      }).catch(() => {});
  }

  const t0 = () => ctx.currentTime;
  function burst(freq, q, dur, vol, when = 0) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(), t = t0() + when;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5, dur + .02);
  }
  function tone(from, to, dur, vol, type = 'sine', when = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = t0() + when;
    o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }

  const api = {
    get enabled() { return enabled; },
    // metaliczny „klik” złotego klawisza: krótki stuk + dźwięczny szczyt + lekki ciężar
    key() {
      if (!enabled || !ctx) return;
      const r = .92 + Math.random() * .16;
      burst(3200 * r, 1.4, .05, .5);
      tone(2100 * r, 1500 * r, .07, .09, 'triangle');
      tone(190 * r, 120 * r, .06, .22);
    },
    // cięższy stuk przycisku OTWÓRZ / DOŁĄCZ
    thunk() {
      if (!enabled || !ctx) return;
      burst(1800, .9, .09, .45);
      tone(140, 70, .16, .38);
      tone(2300, 1700, .09, .07, 'triangle', .004);
    },
    // level 0..1 — prędkość ruchu kurtyny: szelest narasta, gdy kurtyna jedzie, i cichnie, gdy staje
    rustle(level) {
      lastLevel = level;
      if (!ctx || !rustleGain) return;
      const l = Math.max(0, Math.min(1, level * 1.3));
      const target = enabled ? Math.pow(l, 1.2) * curtainNorm : 0;
      rustleGain.gain.setTargetAtTime(target, ctx.currentTime, l > 0 ? .07 : .22);
    },
    toggle(v) {
      enabled = v === undefined ? !enabled : !!v;
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch {}
      if (enabled) { init(); ctx && ctx.resume(); }
      else if (rustleGain) rustleGain.gain.setTargetAtTime(0, ctx.currentTime, .03);
      paint();
      if (enabled && ctx) api.key(); // potwierdzenie włączenia
    },
  };
  window.ClubSound = api;

  // ikona w prawym górnym rogu
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sound-toggle';
  const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M16 9.5l5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function paint() {
    btn.innerHTML = enabled ? ICON_ON : ICON_OFF;
    btn.setAttribute('aria-pressed', String(enabled));
    const label = enabled ? 'Dźwięk włączony — kliknij, aby wyłączyć' : 'Dźwięk wyłączony — kliknij, aby włączyć';
    btn.setAttribute('aria-label', label); btn.title = label;
  }
  btn.addEventListener('click', () => api.toggle());
  paint();
  document.body.appendChild(btn);

  // jeśli dźwięk był włączony wcześniej: kontekst audio ruszy dopiero po pierwszym geście
  if (enabled) {
    const wake = () => { init(); ctx && ctx.resume(); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake); addEventListener('keydown', wake);
  }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : enabled && ctx.resume(); });
})();
