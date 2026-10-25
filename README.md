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

## Блок 3: ближайшее спотканя — кнопка «REZERWUJ MIEJSCE» (`#rezerwacja` на `/private/`)

Фронтенд: секция `.tb` и `<dialog class="rsv">` в `private-content/index.html`, `reservation.css`, `reservation.js` (данные события и тексты — объект `CONTENT` в начале `reservation.js`), ассеты `private-content/assets/tickets/` (фон `interior.jpg`, портрет `speaker.png`).
Кнопка открывает окно: имя и фамилия, фирма (необязательно), телефон, e-mail, число мест (1–5), согласие RODO. Отправка: `POST /api/apply` с `type: "reservation"`; данные события дописывает сервер.
Куда уходят заявки — те же переменные Vercel, что и у формы членства: `APPLICATION_WEBHOOK_URL` либо `RESEND_API_KEY` + `APPLICATIONS_TO`. Без них сервер отвечает 503 и ничего не сохраняет.
Покупки билетов и оплаты в блоке нет (убрано по запросу).
