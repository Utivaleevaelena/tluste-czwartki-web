# Tłuste Czwartki — strona z zamkniętą Strefą Klubowicza

Statyczna strona (`public/`) + dwie funkcje Vercel (`api/`) + prywatna część (`private-content/`).

```text
public/             publiczna strona: kurtyna, oko, kod dostępu
api/verify.js       POST /api/members/verify — sprawdza kod po stronie serwera, ustawia cookie sesji
api/private.js      /private/* — oddaje pliki z private-content/ tylko z ważną sesją
private-content/    prywatna część serwisu (tu rozwijamy zawartość dla członków)
dev-server.js       lokalny podgląd bez Vercel CLI
```

## Zmienne środowiskowe (nie w repozytorium)

| Zmienna | Opis |
|---|---|
| `MEMBERS_CODE` | kod dostępu (4 cyfry) |
| `SESSION_SECRET` | losowy sekret do podpisu sesji (np. `openssl rand -hex 32`) |

Lokalnie: skopiuj `.env.example` do `.env.local`, potem `node dev-server.js` → http://127.0.0.1:8765/index.html
(`?mock=ok` / `?mock=fail` podmieniają weryfikację na symulację do oglądania animacji).

## Prywatna część

Wszystko, co ma być widoczne tylko po wpisaniu kodu, dodawaj do `private-content/` (wejście: `/private/`).
Nie umieszczaj tam nic w `public/` — ten folder jest publiczny.

## Znane ograniczenia

- Limit prób (5 / min na IP) działa w pamięci instancji — na produkcji dodaj Vercel Firewall lub KV rate limit.
- Jeden wspólny kod to rozwiązanie na MVP; docelowo zaproszenia lub konta osobiste.
- Duże pliki prywatne (zdjęcia, wideo) powinny iść przez podpisane URL-e, nie przez funkcję.

## Blok 2 — zaproszenie do klubu (`#zaproszenie`)

`public/zaproszenie.css` + `public/zaproszenie.js` + `public/assets/invitation/`. Ręka z kartą wjeżdża z prawej przy scrollu (jeden kontener),
przycisk DOŁĄCZ to prawdziwy `<button>` z PNG default/pressed. Tekst karty to żywy HTML.
Kliknięcie emituje `window` event `club:join-request` i wywołuje opcjonalne `STREFA_CONFIG.onJoinRequest()` — podłącz tu formularz zgłoszeń
(adres nie jest jeszcze zatwierdzony). Link „POPROŚ O ZAPROSZENIE →” z bloku 1 przewija do tej sceny.

## Formularz zgłoszenia (DOŁĄCZ)

`public/zgloszenie.{css,js}` + dialog w `index.html` + `api/apply.js`. Pola: imię i nazwisko, firma, roczny obrót (lista przedziałów), telefon, e-mail, zgoda RODO.
Walidacja po stronie przeglądarki i serwera, pole-pułapka dla botów, limit 5 zgłoszeń / 10 min na IP (best effort).
Dokąd trafiają zgłoszenia — zmienne środowiskowe Vercel (jedna z opcji):
`APPLICATION_WEBHOOK_URL` (webhook JSON: Make/Zapier/n8n/CRM) albo `RESEND_API_KEY` + `APPLICATIONS_TO` (e-mail).
Bez nich endpoint odpowiada 503 i nic nie zapisuje (formularz pokaże błąd).

## Prywatna część: blok „relacja ze spotkania” (`/private/`)

`private-content/index.html` + `event.css` + `assets/events/<wydarzenie>/{background.jpg,speaker.png}`. Pliki są serwowane przez `api/private.js` tylko z ważną sesją.
Na następne wydarzenie: podmień teksty/datę w `index.html` (sekcja `.event`, komentarz na górze), adresy `href` przycisków (`#relacja`, `#materialy` — tymczasowe) i oba obrazy.

## Фотогалерея (второй блок на `/private/`, `#fotogaleria`)

Идёт сразу после блока «Relacja ze spotkania». Файлы: `private-content/{gallery.css,gallery.js}`, секция `.gal` в `private-content/index.html`, `assets/gallery-reveal/scene/*` (фон, шторы, сотрудник) и `assets/gallery-reveal/photos/gallery-01..08.jpg`.
Состояния `closed → opening → open → closing`; анимируются только `transform`/`opacity`; reduced-motion — мгновенная смена.
**Ссылка «POBIERZ ZDJĘCIA»:** атрибут `data-download-href=""` у `<section class="gal">`. Пока пусто — кнопка в состоянии «wkrótce».
**Фото следующего события:** замените 8 файлов в `assets/gallery-reveal/photos/` и `alt` в `index.html`.

## Блок 3: билет / бронирование (`#bilety` на `/private/`)

Фронтенд: секция `.tb` в `private-content/index.html`, `tickets.css`, `tickets.js` (все тексты и данные события — один объект `CONTENT` в начале `tickets.js`), ассеты `private-content/assets/tickets/` (фон `interior.jpg`, портрет `speaker.png`). **Шторы** — общий файл `public/assets/curtain-open-left.png` из блока кодового замка (используется дважды, правая зеркалится `scaleX(-1)`), золотых подвязок нет.
Backend: `api/tickets.js` (`/api/tickets/{status,validate,checkout,reserve}`) → адаптер `api/_tickets.js`. **Сейчас это DEMO-адаптер:** нет оплаты, нет записи броней; QR-билет не выдаётся.
Env (только сервер): `TICKET_DEMO_INVITES` (JSON с кодами, ценой, лимитом мест), `TICKET_SEATS_AVAILABLE`, `EVENT_MEMBER_TERMS`, `TICKET_MEMBER_MAX_SEATS`. Без `TICKET_DEMO_INVITES` любой код считается неверным.
Чтобы подключить реальный бэкенд/оплату — замените `demoAdapter` в `api/_tickets.js` (интерфейс описан в начале файла); QR выдавать только после webhook оператора.
