# 🌻 Kuschelhof

Ein gemütliches 3D-Farmspiel für zwei (oder bis zu vier) – im Browser, auf Handy und PC, ohne Installation.
Ihr baut zusammen eine Farm auf: Geld, Lager, Tiere und Fortschritt sind geteilt.

**Spielen:** https://dog11129.github.io/Claude/

## Los geht's

1. Seite öffnen und deine Figur gestalten (Name, Haut, Frisur, Outfit, Hut, Brille, Haustier).
2. **Meine Farmen → Gründen** – oben erscheint ein Einladungscode (z. B. `7KXPA`).
3. Dein Lieblingsmensch öffnet dieselbe Seite und tippt den Code bei **Mit Code beitreten** ein – oder öffnet den Link aus 👥 → „Link teilen“.
   Beim nächsten Mal reicht ein Tipp auf **Wieder zu Besuch**.

Tipp fürs Handy: im Browser-Menü **„Zum Startbildschirm hinzufügen“** – dann startet Kuschelhof wie eine App im Vollbild.
Unter ⚙️ → Optionen gibt es den **Querformat-Modus**.

Wer die Farm gegründet hat, ist „Host“: dort läuft und speichert das Spiel. Gäste bekommen automatisch eine Sicherheitskopie
und können die Farm später auch selbst hosten. Der Code bleibt pro Farm gleich, solange er frei ist.

### Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | WASD / Pfeiltasten | links wischen |
| Hinlaufen & benutzen | Klick auf Feld, Tier, Gebäude … | irgendwo antippen |
| Aktion vor der Figur | E / Leertaste (halten = wiederholen) | großer rosa Knopf |
| Werkzeug / Samen | 1–9 oder anklicken | unten antippen |
| Kamera | Mausrad = Zoom, rechte Maustaste ziehen oder Z/C = drehen | zwei Finger = Zoom & drehen, 🔄 |
| Chat / Emotes | Enter / Q | 💬 / 😊 |
| Laden, Lager, Hof-Buch, Freunde | B, I, O, F | Knöpfe oben rechts |
| Fotomodus | P | 📷 |

## Was es gibt

- **Anbau:** 8 Pflanzen (Weizen bis Kürbis), umgraben → säen → gießen → ernten, manche tragen mehrfach. Regen und Sprinkler gießen automatisch.
- **Tiere:** Hühner, Kühe, Schafe, Schweine – füttern, streicheln (glückliche Tiere geben öfter doppelt), Produkte einsammeln.
- **Verarbeitung:** Mayo-Maschine, Einmachtopf, Käserei, Webstuhl, Ölpresse; Apfelbäume und Bienenstöcke.
- **Upgrades:** Farm (Feldgröße, Haus, Hühnerstall, Stall), Ausrüstung (Hacke, Gießkanne, Sichel, Stiefel, Angel), Waren (Qualität = höhere Preise).
- **Deko:** Blumenbeete, Wege, Zäune, Laternen, Kirschbäume, Herzbogen, Brunnen, Bänke zum Hinsetzen …
- **Figuren:** Charakter-Editor mit Hautfarben, 8 Frisuren, Augen, Outfits, 11 Kopfbedeckungen, Brillen und Haustieren (Katze, Hund, Hase, Küken, Fuchs), die euch folgen.
- **Miteinander:** Einladungscode/-link, bis zu 4 Spieler, Chat mit Sprechblasen, Emotes mit Animationen, Umarmen 🤗, Hinbeamen, automatisches Neu-Verbinden.
- **Außerdem:** Angeln, Aufträge aus dem Dorf, 22 Erfolge mit Belohnungen, Farm-Level, Tag & Nacht, Regen, Fotomodus, Musik & Umgebungsgeräusche.
- **Grafik:** Wind in Gras und Pflanzen, Partikel, Schmetterlinge, Glühwürmchen, leuchtende Laternen. Drei Grafikstufen (Handy startet auf „Mittel“).

## Technik

- Reine statische Webseite (`index.html`, `src/`, `vendor/`), kein Build-Schritt. Three.js für 3D, PeerJS (WebRTC) für den Multiplayer.
- Der Host ist gleichzeitig der Server. Zum Finden des Partners wird der kostenlose PeerJS-Vermittlungsserver genutzt; danach laufen die Daten direkt zwischen den Geräten.
- Gespeichert wird im Browser (`localStorage`). Browserdaten löschen = Farm weg (die Kopie beim Partner bleibt).

| Datei | Inhalt |
|---|---|
| `src/data.js` | Pflanzen, Tiere, Gegenstände, Upgrades, Erfolge |
| `src/state.js` | Spiellogik (läuft beim Host) |
| `src/world.js`, `src/models.js`, `src/avatar.js` | 3D-Welt, Modelle, Spielfiguren |
| `src/main.js`, `src/menu.js`, `src/ui.js` | Menü, Steuerung, Multiplayer, Fenster |
| `src/net.js`, `src/audio.js` | Netzwerk, Klang |

### Veröffentlichen

Irgendein statischer Webspace mit **https** reicht. GitHub Pages: *Settings → Pages → Deploy from a branch* → diesen Branch, Ordner `/ (root)`.

### Lokal testen

```bash
python3 -m http.server 8080        # dann http://localhost:8080 öffnen
npm test                           # Spiellogik
npm i --no-save playwright peer && node test/multiplayer.e2e.cjs   # Host + Gast im Browser
```
