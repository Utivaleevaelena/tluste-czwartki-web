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
