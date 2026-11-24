# 🌻 Kuschelhof

Ein gemütliches 3D-Farmspiel für zwei (oder bis zu vier) – im Browser, auf Handy und PC, ohne Installation.
Ihr baut zusammen eine Farm auf: Geld, Lager, Tiere und Fortschritt sind geteilt.

## Spielen

1. Seite öffnen, Namen eingeben, Farbe und Hut aussuchen.
2. **Neue Farm** gründen – oben erscheint ein Einladungscode (z. B. `7KXPA`).
3. Deine Freundin öffnet dieselbe Seite, tippt den Code bei **Mit Code beitreten** ein (oder öffnet den geteilten Link).

Der Code bleibt pro Farm gleich, solange er frei ist. Wer die Farm gegründet hat, ist „Host“: dort läuft und speichert das Spiel.
Gäste bekommen automatisch eine Sicherheitskopie und können die Farm später auch selbst hosten.

### Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | WASD / Pfeiltasten | links auf den Bildschirm tippen & ziehen |
| Aktion | E, Leertaste oder Klick (gedrückt halten = wiederholen) | großer rosa Knopf |
| Werkzeug / Samen | 1–9 oder anklicken | unten antippen |
| Zoom | Mausrad | zwei Finger |
| Chat / Emotes | Enter / Q | 💬 / 😊 |
| Laden, Lager, Aufträge, Freunde | B, I, O, F | Knöpfe oben rechts |

## Was es gibt

- **Anbau:** 8 Pflanzen (Weizen bis Kürbis), umgraben → säen → gießen → ernten, manche tragen mehrfach. Regen gießt alles, Sprinkler gießen automatisch.
- **Tiere:** Hühner, Kühe, Schafe, Schweine – füttern, streicheln (glückliche Tiere geben öfter doppelt), Produkte einsammeln.
- **Verarbeitung:** Mayo-Maschine, Einmachtopf, Käserei, Webstuhl, Ölpresse; Apfelbäume und Bienenstöcke.
- **Upgrades:** Farm (Feldgröße, Haus, Hühnerstall, Stall), Ausrüstung (Hacke, Gießkanne, Sichel, Stiefel, Angel) und Waren (Qualität = höhere Preise).
- **Deko:** Blumenbeete, Wege, Zäune, Laternen (leuchten nachts), Kirschbäume, Herzbogen, Brunnen …
- **Außerdem:** Angeln am Teich, Aufträge aus dem Dorf, Farm-Level mit Freischaltungen, Tag/Nacht, Regenwetter, Musik & Geräusche.
- **Multiplayer:** Einladungscode/-link, bis zu 4 Spieler, Chat mit Sprechblasen, Emotes, Hinbeamen zum Partner, automatisches Neu-Verbinden, Host kann Spieler entfernen.

## Technik

- Reine statische Webseite (`index.html`, `src/`, `vendor/`), kein Build-Schritt. Three.js für 3D, PeerJS (WebRTC) für den Multiplayer.
- Der Host ist gleichzeitig der Server. Zum Finden des Partners wird der kostenlose PeerJS-Vermittlungsserver genutzt; danach laufen die Daten direkt zwischen den Geräten.
- Gespeichert wird im Browser (`localStorage`). Browserdaten löschen = Farm weg (die Kopie beim Partner bleibt).

### Veröffentlichen

Irgendein statischer Webspace reicht (GitHub Pages, Netlify, Cloudflare Pages …). Wichtig: über **https** ausliefern, sonst blockieren Handys WebRTC.
GitHub Pages: *Settings → Pages → Deploy from a branch* → diesen Branch, Ordner `/ (root)` (bei privaten Repos nur mit GitHub Pro).

### Lokal testen

```bash
python3 -m http.server 8080        # dann http://localhost:8080 öffnen
npm test                           # Spiellogik
npm i --no-save playwright peer && node test/multiplayer.e2e.cjs   # Host + Gast im Browser
```
