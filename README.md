# Darts Trening

Aplikacja (PWA) do treningu celności w darta. Działa w przeglądarce na telefonie, można ją „zainstalować” na ekranie głównym i używać offline.

## Tryby

| Tryb | Co ćwiczy |
|---|---|
| **Around the Clock+** | 1→20→Bull→20→1 (tam i z powrotem; opcjonalnie tylko w górę). **3 trafienia w turze = bonusowa tura** (powtarza się, dopóki trafiasz 3/3). Wariant B: double = +2 pola, treble = +3 pola. Opcje: tylko double / tylko treble, kolejność po tarczy, bez Bulla. |
| Bob's 27 | Double D1–D20 + Bull |
| Shanghai | S/D/T jednego numeru, Shanghai = natychmiastowa wygrana |
| Halve-It | Presja: pudło w rundzie = połowa punktów |
| Seria w T20 | 30/60/99 lotek w wybrane pole, średnia i % treble |
| Checkout 121 | 9 lotek na zamknięcie, sukces podnosi cel |
| X01 | 301/501/701, double/single out, podpowiedzi checkoutów |
| Cricket | 15–20 + Bull, MPR |

## Gracze

- **Solo**, **kilku graczy na jednym telefonie**.
- **Boty**: 8 poziomów, od Nowicjusza (średnia ok. 22) do Legendy (średnia ok. 114). Bot celuje w pole i rzuca z losowym rozrzutem na prawdziwej geometrii tarczy.
- **Online ze znajomymi**: host tworzy pokój (5-znakowy kod lub link), goście dołączają ze swoich telefonów. Połączenie peer-to-peer (WebRTC, PeerJS), bez kont i bez własnego serwera.

Statystyki (rekordy, trend, skuteczność na poszczególnych polach) są zapisywane lokalnie w przeglądarce.

## Hosting

Produkcja: https://sajt.com.pl (serwer Hetzner, nginx). Wdrożenie: `./deploy.sh`.
Kopia na GitHub Pages: https://swiatczekolad-create.github.io/darts-trening/

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski (dostępny też z telefonu w tej samej sieci)
npm test         # testy silnika gry
npm run build    # wersja produkcyjna w dist/
```
