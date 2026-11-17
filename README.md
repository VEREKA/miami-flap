# MIAMI FLAP

Gra przeglądarkowa typu „flappy” w klimacie Miami — reskin i rozbudowa [RoboFlap](https://github.com/VEREKA/roboflap), napisana od zera w HTML5 Canvas + czystym JavaScripcie (bez bibliotek i bez kroku budowania).

**Sterowanie:** dotyk / klik / spacja = wzlot. `P` lub `Esc` = pauza.

## Zasady

| Element | Efekt |
|---|---|
| Dolar | +1 pkt |
| Butelka (Dolarsowo 0.0%) | +3 pkt, 3 butelki uruchamiają **Miami Mode** |
| Diament | +5 pkt (leży tuż przy krawędzi dymu) |
| Combo | zbieranie bez przerwy dłuższej niż 2 s: ×2 od 4. zbierajki, ×3 od 10. |
| Miami Mode (6 s) | magnes na zbierajki, punkty ×2, jedna tarcza |
| Chmury dymu, plotki, ziemia | koniec lotu |
| Etapy | co 12 bramek: nowa pora dnia, większa prędkość, kolejny skin do odblokowania |

Punkty dają wyłącznie zbierajki. Szerokość szczeliny jest stała — trudność rośnie tylko przez prędkość.

## Uruchomienie lokalnie

```bash
python3 -m http.server 8000     # i otwórz http://localhost:8000
```

## Konfiguracja kampanii — `js/config.js`

Tytuł, adres landing page'a, kod QR, nagrody, hasła na billboardach, nazwy etapów i skiny.
Grafika kampanii na billboardach: `billboardImage` (plik 2:1, np. 630×315 px w `assets/img/`), pokazywana na co drugim billboardzie (`billboardImageEvery`).
Link i QR do strony kampanii są wyłączone (`landingUrl: null`). Po ustawieniu adresu wygeneruj QR: `python3 tools/make_qr.py HTTPS://ADRES.PL` i wklej wynik do `qr`.

## Osadzanie w iframe

```html
<iframe src="https://…/miami-flap/" width="360" height="640" style="border:0" allow="autoplay"></iframe>
```

Gra wysyła do strony-rodzica komunikaty `postMessage`:

| `type` | Kiedy | Zawartość |
|---|---|---|
| `miamiflap:gameover` | po każdej grze | `score`, `report`, `integrity` |
| `miamiflap:entry` | po wysłaniu formularza | `name`, `email`, `consent`, `report`, `integrity` |

W wersji testowej formularz **niczego nie zapisuje** — dane trafiają tylko do strony-rodzica. Po ustawieniu `entryEndpoint` w konfiguracji gra wyśle je też metodą POST (JSON).

## Zabezpieczenia przed oszukiwaniem

- **Stały krok symulacji 60 Hz.** Spowolnienie przeglądarki nie spowalnia gry: brakujące klatki są nadrabiane (do 4 kroków na klatkę).
- **Wykrywanie spowolnienia.** Jeśli gra mimo to idzie wolniej niż czas rzeczywisty (poniżej 80% przez 4 s lub poniżej 90% w całej grze), jest pauzowana, a wynik oznaczany jako niezweryfikowany.
- **Zmiana karty / utrata fokusu = pauza**, po powrocie odliczanie 3-2-1. Więcej niż 3 pauzy unieważniają wynik.
- **Deterministyczny zapis rozgrywki.** `report` zawiera ziarno losowości i listę tapnięć (~150–500 B). Z tego da się odtworzyć całą grę i policzyć wynik niezależnie:

```bash
node tools/verify.js raport.json    # {"ok":true,"score":123,…} albo {"ok":false,"reason":"score-mismatch"}
```

Gra sama odtwarza każdy przebieg przed pokazaniem wyniku, więc ręczna zmiana stanu w konsoli daje wynik niezweryfikowany.

**Czego nie da się zrobić po stronie przeglądarki:** kod JS jest jawny, więc zdeterminowana osoba może napisać bota albo spreparować raport z poprawnym przebiegiem. Do konkursu z nagrodami potrzebny jest serwer, który (1) sam wydaje ziarno i zapisuje czas startu, (2) odtwarza raport przez `Sim.verify`, (3) sprawdza, że gra nie trwała krócej niż `steps / 60` s. `js/sim.js` działa bez zmian w Node.

## Struktura

```
index.html          strona i nakładki UI
css/style.css       wygląd UI
js/config.js        konfiguracja kampanii
js/sim.js           deterministyczny rdzeń gry (przeglądarka + Node)
js/render.js        rysowanie: tło z parallaxem, billboardy, efekty, HUD
js/sprites.js       sprite'y pixel-art i skiny
js/font.js          font bitmapowy 5×7 z polskimi znakami
js/audio.js         muzyka i efekty generowane w WebAudio
js/main.js          pętla gry, wejście, UI, kontrola uczciwości
tools/              verify.js (weryfikacja wyniku), bot.js (test balansu), make_qr.py
assets/svg/         sprite'y jako pliki SVG
assets/fonts/       Jersey 15, VT323 (licencja SIL OFL) — oba z pełnymi polskimi znakami
```

## Testy

```bash
node tools/bot.js 300    # 4 boty × 300 gier, każda odtwarzana i weryfikowana
```
