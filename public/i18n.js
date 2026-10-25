/* Przełącznik języka PL / EN dla całego serwisu (strona główna i część prywatna).
   Działa na zasadzie słownika „polski tekst → angielski”: tłumaczy węzły tekstowe i atrybuty (aria-label, title, placeholder, alt),
   a także teksty wstawiane później przez skrypty (komunikaty formularzy, kod dostępu itp.) — dzięki MutationObserver.
   Wybór języka jest zapamiętywany (localStorage) i wspólny dla wszystkich stron. Nazwy własne (Tłuste Czwartki, Tłusta Kaczka,
   Marian Popinigis, Michał Borowski…) zostają bez zmian. Przyciski-obrazki OTWÓRZ i DOŁĄCZ to grafiki z polskim napisem.
   Aby dodać tłumaczenie: dopisz parę „polski tekst”: „english text” w obiekcie EN poniżej. */
(() => {
  'use strict';

  const EN = {
    /* ── Strona z kodem dostępu ── */
    'Strefa Klubowicza': 'Club Member Zone',
    'Strefa Klubowicza — wejście dla członków klubu Tłuste Czwartki.': 'Club Member Zone — entrance for members of the Tłuste Czwartki club.',
    'STREFA KLUBOWICZA': 'CLUB MEMBER ZONE',
    'WEJDŹ, JEŚLI MASZ KOD': 'ENTER IF YOU HAVE A CODE',
    'Kod dostępu (4 cyfry)': 'Access code (4 digits)',
    'Klawiatura numeryczna': 'Numeric keypad',
    'Cyfra 0': 'Digit 0', 'Cyfra 1': 'Digit 1', 'Cyfra 2': 'Digit 2', 'Cyfra 3': 'Digit 3', 'Cyfra 4': 'Digit 4',
    'Cyfra 5': 'Digit 5', 'Cyfra 6': 'Digit 6', 'Cyfra 7': 'Digit 7', 'Cyfra 8': 'Digit 8', 'Cyfra 9': 'Digit 9',
    'Usuń cyfrę': 'Delete digit',
    'Potwierdź kod': 'Confirm code',
    'Otwórz strefę klubowicza': 'Open the club member zone',
    'NIE MASZ KODU? POPROŚ O ZAPROSZENIE →': 'NO CODE? REQUEST AN INVITATION →',
    'SPRAWDZAMY DOSTĘP…': 'CHECKING ACCESS…',
    'KOD NIEPRAWIDŁOWY. SPRÓBUJ PONOWNIE.': 'INCORRECT CODE. PLEASE TRY AGAIN.',
    'WITAJ W KLUBIE.': 'WELCOME TO THE CLUB.',

    /* ── Blok zaproszenia ── */
    'Dołącz do klubu': 'Join the club',
    'TŁUSTE CZWARTKI · KLUB WŁAŚCICIELI FIRM': 'TŁUSTE CZWARTKI · CLUB FOR BUSINESS OWNERS',
    'RAZ W MIESIĄCU.': 'ONCE A MONTH.',
    'BEZ FILTRÓW.': 'NO FILTERS.',
    'Zamknięte spotkania z przedsiębiorcami, którzy mówią o decyzjach, błędach i kulisach biznesu.': 'Closed meetings with entrepreneurs who talk about decisions, mistakes and the behind-the-scenes of business.',
    'Ty pytasz — i zabierasz konkretną wartość.': 'You ask — and take away real value.',
    'TYLKO DLA CZŁONKÓW SPEŁNIAJĄCYCH KRYTERIA KLUBU': 'ONLY FOR MEMBERS WHO MEET THE CLUB’S CRITERIA',

    /* ── Formularz zgłoszenia do klubu ── */
    'Zamknij formularz': 'Close the form',
    'ZGŁOSZENIE DO KLUBU': 'CLUB APPLICATION',
    'Zostaw dane — odezwiemy się po weryfikacji zgłoszenia.': 'Leave your details — we will get back to you after reviewing your application.',
    'Imię i nazwisko': 'Full name',
    'Podaj imię i nazwisko.': 'Enter your full name.',
    'Firma': 'Company',
    'Podaj nazwę firmy.': 'Enter your company name.',
    'Roczny obrót firmy': 'Annual company turnover',
    'Wybierz przedział': 'Select a range',
    'Poniżej 1 mln PLN': 'Under PLN 1 million',
    '1–5 mln PLN': 'PLN 1–5 million',
    '5–20 mln PLN': 'PLN 5–20 million',
    'Powyżej 20 mln PLN': 'Over PLN 20 million',
    'Wybierz przedział obrotu.': 'Select a turnover range.',
    'Telefon': 'Phone',
    'Podaj poprawny numer telefonu.': 'Enter a valid phone number.',
    'E-mail': 'E-mail',
    'Podaj poprawny adres e-mail.': 'Enter a valid e-mail address.',
    'Nie wypełniaj tego pola': 'Do not fill in this field',
    'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu rozpatrzenia zgłoszenia o członkostwo w klubie Tłuste Czwartki oraz kontaktu w tej sprawie, zgodnie z RODO.': 'I consent to the processing of my personal data in order to review my membership application to the Tłuste Czwartki club and to be contacted about it, in accordance with the GDPR.',
    'Zgoda jest wymagana, aby wysłać zgłoszenie.': 'Consent is required to submit the application.',
    'WYŚLIJ ZGŁOSZENIE': 'SUBMIT APPLICATION',
    'WYSYŁAMY ZGŁOSZENIE…': 'SENDING YOUR APPLICATION…',
    'Dziękujemy. Odezwiemy się po weryfikacji zgłoszenia.': 'Thank you. We will get back to you after reviewing your application.',
    'Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.': 'We could not send your application. Please try again in a moment.',
    'Zbyt wiele prób. Spróbuj ponownie za kilka minut.': 'Too many attempts. Please try again in a few minutes.',

    /* ── Dźwięk i język ── */
    'Dźwięk włączony — kliknij, aby wyłączyć': 'Sound on — click to turn off',
    'Dźwięk wyłączony — kliknij, aby włączyć': 'Sound off — click to turn on',
    'Dotknij ekranu, aby uruchomić dźwięk': 'Tap the screen to start the sound',
    'Język': 'Language',

    /* ── Strona prywatna: relacja ze spotkania ── */
    'Relacja ze spotkania — Tłuste Czwartki': 'Meeting report — Tłuste Czwartki',
    'RELACJA ZE SPOTKANIA': 'MEETING REPORT',
    'JAK ZOSTAĆ': 'HOW TO BECOME',
    'INWESTOREM': 'AN INVESTOR',
    'WE WŁASNEJ FIRMIE?': 'IN YOUR OWN COMPANY?',
    'ROZMOWA Z GOŚCIEM': 'CONVERSATION WITH A GUEST',
    'MATERIAŁY DLA KLUBOWICZÓW': 'MATERIALS FOR CLUB MEMBERS',

    /* ── Fotogaleria ── */
    'FOTOGALERIA': 'PHOTO GALLERY',
    'ZOBACZ ZDJĘCIA': 'VIEW PHOTOS',
    'POBIERZ ZDJĘCIA': 'DOWNLOAD PHOTOS',
    'Link do pobrania zdjęć będzie dostępny wkrótce.': 'The photo download link will be available soon.',
    'ZAMKNIJ GALERIĘ': 'CLOSE GALLERY',
    'ZOBACZ POZOSTAŁE ZDJĘCIA': 'SEE THE REMAINING PHOTOS',
    'Link będzie dostępny wkrótce': 'The link will be available soon',
    'Powiększone zdjęcie': 'Enlarged photo',
    'Poprzednie zdjęcie': 'Previous photo',
    'Następne zdjęcie': 'Next photo',
    'Zamknij powiększenie': 'Close enlarged photo',
    'Rozmowa uczestników spotkania w restauracji': 'Meeting participants talking in the restaurant',
    'Uczestnicy spotkania pozujący do zdjęcia': 'Meeting participants posing for a photo',
    'Rozmowa uczestników podczas wieczoru biznesowego': 'Participants talking during the business evening',
    'Prowadzący i gość przed rozpoczęciem rozmowy': 'The host and the guest before the conversation starts',
    'Uczestnicy słuchający wystąpienia': 'Participants listening to the talk',
    'Uczestnik spotkania podczas dyskusji': 'A participant during the discussion',
    'Rozmowa z gościem wieczoru': 'Conversation with the guest of the evening',
    'Gość spotkania podczas rozmowy z uczestnikami': 'The guest of the meeting talking with participants',

    /* ── Najbliższe spotkanie i rezerwacja ── */
    'NAJBLIŻSZE SPOTKANIE': 'NEXT MEETING',
    'Czas i zaangażowanie': 'Time and commitment',
    'właściciela': 'of the owner',
    'Czas i zaangażowanie właściciela': 'Time and commitment of the owner',
    'REZERWUJ MIEJSCE': 'RESERVE A SEAT',
    'Rezerwacja miejsca': 'Seat reservation',
    '(opcjonalnie)': '(optional)',
    'Liczba miejsc': 'Number of seats',
    'Zmniejsz liczbę miejsc': 'Decrease number of seats',
    'Zwiększ liczbę miejsc': 'Increase number of seats',
    'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu rezerwacji miejsca na spotkaniu oraz kontaktu w tej sprawie, zgodnie z RODO.': 'I consent to the processing of my personal data in order to reserve a seat at the meeting and to be contacted about it, in accordance with the GDPR.',
    'Dziękujemy. Odezwiemy się, aby potwierdzić miejsce.': 'Thank you. We will contact you to confirm your seat.',

    /* ── Strony-zaślepki ── */
    'MATERIAŁY DLA KLUBOWICZÓW — Tłuste Czwartki': 'MATERIALS FOR CLUB MEMBERS — Tłuste Czwartki',
    'Ta część serwisu jest w przygotowaniu.': 'This part of the site is under construction.',
    'POWRÓT DO SPOTKANIA': 'BACK TO THE MEETING',
    'Prywatna część serwisu — w przygotowaniu.': 'Private part of the site — coming soon.',
  };

  /* wzorce z liczbami / złożone zdania */
  const PATTERNS = [
    [/^Powiększ zdjęcie (\d+) z (\d+): (.+)$/, (m) => `Enlarge photo ${m[1]} of ${m[2]}: ${tr(m[3]) ?? m[3]}`],
    [/^(\d+) \/ (\d+) — (.+)$/, (m) => { const t = tr(m[3]); return t === null ? null : `${m[1]} / ${m[2]} — ${t}`; }],
  ];

  const STORE = 'club-lang';
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  function tr(text) {
    const k = norm(text);
    if (EN[k] !== undefined) return EN[k];
    for (const [re, fn] of PATTERNS) { const m = k.match(re); if (m) { const r = fn(m); if (r !== null) return r; } }
    return null;
  }
  const keep = (orig, translated) => { // zachowaj białe znaki z brzegów
    const lead = (orig.match(/^\s*/) || [''])[0], trail = (orig.match(/\s*$/) || [''])[0];
    return lead + translated + trail;
  };

  let lang = 'pl';
  const textOrig = new Map();   // węzeł tekstowy → oryginał (PL)
  const attrOrig = new Map();   // element → { attr: oryginał }
  let busy = false;

  function translateText(node) {
    if (!node.parentNode || SKIP.has(node.parentNode.nodeName) || node.parentElement?.closest('[translate="no"], [data-no-i18n]')) return;
    const orig = node.data;
    if (!orig.trim()) return;
    const t = tr(orig);
    if (t === null) {                                            // brak w słowniku (np. już po angielsku) — nie ruszamy
      const o = textOrig.get(node);
      if (o !== undefined && tr(o) !== null && keep(o, tr(o)) === orig) return;   // to nasza własna zmiana — zostaw zapis oryginału
      textOrig.delete(node); return;
    }
    textOrig.set(node, orig);
    if (node.data !== keep(orig, t)) node.data = keep(orig, t);
  }
  function translateAttrs(el) {
    if (el.closest?.('[translate="no"], [data-no-i18n]')) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), t = tr(v);
      if (t === null) continue;
      const rec = attrOrig.get(el) || {}; rec[a] = v; attrOrig.set(el, rec);
      if (v !== t) el.setAttribute(a, t);
    }
    if (el.nodeName === 'META' && el.getAttribute('name') === 'description') {
      const v = el.getAttribute('content'), t = tr(v);
      if (t !== null) { const rec = attrOrig.get(el) || {}; rec.content = v; attrOrig.set(el, rec); el.setAttribute('content', t); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return translateText(root);
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    translateAttrs(root);
    for (let c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  let titleOrig = null;
  function translateTitle() {
    const t = tr(document.title);
    if (t !== null) { if (titleOrig === null) titleOrig = document.title; document.title = t; }
  }

  function toEnglish() { busy = true; try { walk(document.documentElement); translateTitle(); } finally { busy = false; } }
  function toPolish() {
    busy = true;
    try {
      textOrig.forEach((orig, node) => { if (node.isConnected) node.data = orig; });
      textOrig.clear();
      attrOrig.forEach((rec, el) => { if (el.isConnected) for (const a in rec) el.setAttribute(a === 'content' ? 'content' : a, rec[a]); });
      attrOrig.clear();
      if (titleOrig !== null) { document.title = titleOrig; titleOrig = null; }
    } finally { busy = false; }
  }

  /* teksty wstawiane przez skrypty (gdy aktywny jest EN) */
  const mo = new MutationObserver((list) => {
    if (busy || lang !== 'en') return;
    busy = true;
    try {
      for (const m of list) {
        if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') {
          if (m.target.nodeType === 1 && ATTRS.includes(m.attributeName)) {
            const rec = attrOrig.get(m.target), cur = m.target.getAttribute(m.attributeName);
            if (rec && rec[m.attributeName] !== undefined && tr(rec[m.attributeName]) === cur) continue;   // nasza własna zmiana
            if (rec) delete rec[m.attributeName];
            translateAttrs(m.target);
          }
        }
        else m.addedNodes.forEach((n) => { walk(n); if (n.nodeName === '#text' && n.parentNode?.nodeName === 'TITLE') translateTitle(); });
        if (m.target.nodeName === 'TITLE') { titleOrig = null; translateTitle(); }
      }
    } finally { busy = false; }
  });

  function setLang(next, persist = true) {
    if (next === lang && persist === false) return;
    lang = next === 'en' ? 'en' : 'pl';
    if (persist) { try { localStorage.setItem(STORE, lang); } catch {} }
    document.documentElement.lang = lang;
    if (lang === 'en') toEnglish(); else toPolish();
    paint();
    window.dispatchEvent(new CustomEvent('club:lang', { detail: { lang } }));
  }

  /* ── przełącznik PL | EN ── */
  const sw = document.createElement('div');
  sw.className = 'lang-switch'; sw.setAttribute('role', 'group'); sw.setAttribute('translate', 'no');
  sw.innerHTML = '<button type="button" data-lang="pl" lang="pl" aria-label="Polski">PL</button><button type="button" data-lang="en" lang="en" aria-label="English">EN</button>';
  sw.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
  function paint() { sw.querySelectorAll('[data-lang]').forEach((b) => { const on = b.dataset.lang === lang; b.setAttribute('aria-pressed', String(on)); }); }

  const css = document.createElement('style');
  css.textContent = `
    .lang-switch { position: fixed; z-index: 30; top: calc(max(12px, env(safe-area-inset-top)) + 52px); right: max(12px, env(safe-area-inset-right)); display: flex; height: 40px; align-items: center; padding: 3px; border: 1px solid rgb(251 213 125 / .45); border-radius: 20px; background: rgb(17 3 3 / .72); font-family: "Montserrat", "Manrope", Arial, sans-serif; }
    .lang-switch button { min-width: 38px; height: 32px; padding: 0 8px; border: 0; border-radius: 16px; background: transparent; color: #fcf4e6; font: 700 12px/1 "Montserrat", "Manrope", Arial, sans-serif; letter-spacing: .12em; cursor: pointer; opacity: .75; -webkit-tap-highlight-color: transparent; }
    .lang-switch button:hover { opacity: 1; }
    .lang-switch button[aria-pressed="true"] { background: #fbd57d; color: #25120e; opacity: 1; }
    .lang-switch button:focus-visible { outline: 2px solid #fbd57d; outline-offset: 2px; }
    body:has(dialog[open]) .lang-switch { opacity: 0; pointer-events: none; }
    @media (max-width: 420px) { .lang-switch button { min-width: 34px; padding: 0 6px; } }
  `;

  function init() {
    document.head.appendChild(css);
    document.body.appendChild(sw);
    let saved = null; try { saved = localStorage.getItem(STORE); } catch {}
    const q = new URLSearchParams(location.search).get('lang');
    const browserPl = /^pl\b/i.test(navigator.language || '');
    const initial = q === 'en' || q === 'pl' ? q : saved === 'en' || saved === 'pl' ? saved : browserPl ? 'pl' : 'en';
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    lang = 'pl'; paint();
    setLang(initial, !!q || !!saved);
  }
  window.ClubLang = { set: (l) => setLang(l), get lang() { return lang; }, t: (s) => (lang === 'en' ? (tr(s) ?? s) : s) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
