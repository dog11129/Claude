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
| Werkzeug / Samen | 1–9 oder anklicken (Hacke, Kanne, Hand, Axt, Schaufel, Kescher) | unten antippen |
| Kamera | Mausrad = Zoom, rechte Maustaste ziehen oder Z/C = drehen | zwei Finger = Zoom & drehen, 🔄 |
| Chat / Emotes | Enter / Q | 💬 / 😊 |
| Laden, Lager, Hof-Buch, Freunde | B, I, O, F | Knöpfe oben rechts |
| Fotomodus | P | 📷 |

## Was es gibt

- **Anbau:** 12 Pflanzen mit Jahreszeiten (in ihrer Saison wachsen sie doppelt so schnell), umgraben → säen → gießen → ernten, manche tragen mehrfach. Regen, Schnee und Sprinkler gießen automatisch.
- **Jahreszeiten:** Frühling mit Blütenblättern, Sommer, Herbstlaub, Winter mit Schnee und gefrorenem Teich – je 7 Tage.
- **Tiere:** Hühner, Kühe, Schafe, Schweine – füttern, streicheln, Produkte einsammeln.
- **Nachbarn:** Mira (Igel-Bäckerin), Bruno (Bär-Schreiner), Pippa (Enten-Fischerin) und Lio (Fuchs-Künstler) spazieren über den Hof. Plaudern, Geschenke machen, Freundschaft (10 Herzen), Briefe mit Geschenken, ihre Aufträge erfüllen.
- **Sammeln:** Angeln (Fische je Jahreszeit), Kescher für Schmetterlinge & Käfer, Schaufel für Fossilien an glitzernden Stellen, Bäume schütteln – alles landet im **Sammelbuch**.
- **Herstellen:** Holz (Axt) und Steine (Schaufel) sammeln, an der Werkbank Deko & Möbel bauen, in der Gartenküche oder am Herd 10 Gerichte kochen.
- **Zuhause:** Das Haus betreten und gemeinsam einrichten – 36 Möbel, Teppiche, Wandbilder, 8 Tapeten & 8 Böden. Aufs Sofa setzen, im Bett schlafen (wenn alle schlafen, ist es Morgen).
- **Upgrades:** Feld, Haus (größeres Zimmer), Ställe, Werkzeuge, Warenqualität.
- **Miteinander:** Einladungscode, bis zu 4 Spieler, Chat, 20 Emotes mit Animationen, Zusammen-Aktionen (Umarmen, Küsschen, High-Five, Tanzen), Hinbeamen, automatisches Neu-Verbinden.
- **Außerdem:** Aufträge, 32 Erfolge, Farm-Level, Tag & Nacht, Fotomodus, Charakter-Editor mit Haustier, Musik & Umgebungsgeräusche.

## Technik

- Reine statische Webseite (`index.html`, `src/`, `vendor/`), kein Build-Schritt. Three.js für 3D, PeerJS (WebRTC) für den Multiplayer.
- Der Host ist gleichzeitig der Server. Zum Finden des Partners wird der kostenlose PeerJS-Vermittlungsserver genutzt; danach laufen die Daten direkt zwischen den Geräten.
- Gespeichert wird im Browser (`localStorage`). Browserdaten löschen = Farm weg (die Kopie beim Partner bleibt).

| Datei | Inhalt |
|---|---|
| `src/data.js` | Pflanzen, Tiere, Gegenstände, Upgrades, Erfolge |
| `src/state.js` | Spiellogik (läuft beim Host) |
| `src/world.js`, `src/models.js`, `src/avatar.js` | 3D-Welt, Modelle, Spielfiguren |
| `src/npc.js`, `src/furniture.js`, `src/furni-data.js` | Nachbarn (Modelle & Dialoge), Möbel & Zimmer |
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
