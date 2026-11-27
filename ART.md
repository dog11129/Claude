# Schönere Modelle & Icons – Anleitung

Alles im Spiel hat schon ein Modell und ein Bild. Wo noch kein Blender-Modell existiert, baut das Spiel einen **Platzhalter** aus einfachen Formen; jedes Icon wird aus dem 3D-Modell **gerendert**. Beides lässt sich Stück für Stück ersetzen, ohne Code anzufassen – fehlt eine Datei, nimmt das Spiel einfach wieder den Platzhalter. Spielstände sind davon nie betroffen.

## Überblick

| Werkzeug | Wofür |
|---|---|
| `tools/gallery.html` (im Browser über den lokalen Server öffnen: `http://localhost:8080/tools/gallery.html`) | Alle Dinge mit Bild, Modell-Name und Stand (🧊 eigenes Modell / ⚙️ Platzhalter, 🎨 eigenes Icon / 📷 gerendert). Antippen = 3D-Ansicht zum Drehen (1 Kästchen = 1 Feld). Filter „Ohne eigenes Modell/Icon“. Knopf **Alle Icons als ZIP** lädt alle gerenderten Icons als PNG – gut als Vorlage zum Nachmalen. |
| `npm run export-models` | Schreibt alle Platzhalter als GLB nach `art/export/` (`place.glb`, `furniture.glb`, `items.glb`, `crops.glb`) und die Liste `art/STATUS.md` (was ist schon aus Blender, was fehlt noch, mit Größe und Dreiecken). |
| `npm run icons -- ordner` | Übernimmt eigene Icons (siehe unten). |
| `blender/*.py` | Die bestehenden Blender-Skripte, aus denen die fertigen Pakete in `assets/models/` stammen (siehe README). |

## Ein Modell ersetzen

1. `npm run export-models`, dann in Blender **Datei → Importieren → glTF** und z. B. `art/export/place.glb` laden. Jedes Modell ist ein eigenes Wurzel-Objekt mit dem richtigen Namen, in richtiger Größe und Lage – ideal als Vorlage zum Nachbauen oder Verschönern.
2. Neu modellieren. Regeln:
   - **Maßstab:** 1 Blender-Einheit = 1 Feld (Kachel). Der Platzhalter zeigt die erlaubte Größe; Deko für ein Feld bleibt innerhalb von etwa 1 × 1.
   - **Ursprung** (Origin) unten in der Mitte, auf Bodenhöhe (Z = 0).
   - **Vorderseite** zeigt in Blender nach **−Y** (Ansicht *Vorne*, Num 1). Beim glTF-Export wird daraus +Z im Spiel.
   - **Farben als Vertex-Farben** (Farbattribut, z. B. per *Vertex Paint* oder Skript). Das Spiel ersetzt alle Materialien durch sein eigenes weiches Licht-Material – Texturen und Material-Farben gehen verloren. Schnee im Winter legt sich automatisch auf alles, was nach oben zeigt.
   - **Leuchtteile** (Lampen, Flammen, Fenster) bekommen `__glow` im Objekt-Namen, z. B. `strandgrill.flamme__glow`. Sie leuchten in ihrer Vertex-Farbe und werden nachts heller.
   - **Animation:** Keyframes (z. B. ein Rad, eine Fahne) laufen im Spiel als Schleife, wenn sie nur Teile desselben Modells bewegen.
   - **Sparsam:** Deko und Möbel möglichst unter ~3000 Dreiecken, kleine Items unter ~800 (Handys!). `art/STATUS.md` zeigt die Werte der Platzhalter zum Vergleich.
3. Das Wurzel-Objekt muss **genau** den Modell-Namen tragen (Tabelle unten, die Galerie zeigt ihn unter jedem Bild).
4. Export: alle neuen Modelle zusammen als `assets/models/custom.glb` (glTF Binary, *+Y Up*, Draco-Kompression an, Materialien aus, Vertex-Farben an – genau wie `export()` in `blender/kit.py`).
5. In `assets/models/packs.json` `"custom"` **ans Ende** der Liste setzen. Pakete werden in dieser Reihenfolge eingetragen; ein späteres Paket ersetzt gleichnamige Modelle aus früheren. So kann `custom.glb` auch vorhandene Blender-Modelle verbessern.
6. Prüfen: Galerie neu laden (Zähler „mit eigenem Modell“ steigt), `npm run export-models` (STATUS aktualisiert), Spiel öffnen.

### Modell-Namen

| Was | Name des Wurzel-Objekts | Beispiel |
|---|---|---|
| Deko & Bauprojekte draußen | ID des Gegenstands | `strandgrill`, `schmetterlingshaus`, `ballonplatz` |
| Möbel | ID des Möbels | `spieltisch`, `sternenteppich` |
| Gegenstände in der Hand / im Rucksack (Fische, Insekten, Gerichte, Fundstücke …) | `item_<id>` | `item_grillfisch`, `item_dublone` |
| Beete / Pflanzen (3 Wachstumsstufen) | `crop_<id>_<stufe>`, Stufe 1–3 | `crop_erdbeere_3` |
| Sandburg je Ausbaustufe | `castle_<stufe>`, Stufe 1–5 | `castle_3` |
| Fahrrad (Räder drehen sich, wenn Teile so heißen) | `ride_fahrrad` mit Teilen `wheel_f`, `wheel_b` | |
| Drachen am Strand | `ride_drache` | |
| Geschenk-Ballon am Himmel | `skygift` | |
| Schiff im Wrack-Tauchgebiet (Ursprung = Mitte des Wracks) | `zone_wreck_ship` | |
| Schon vorhanden (aus `blender/*.py`), verbesserbar | `rock`, `pine`, `banana`, `fruit_<art>`, `shell_<art>`, `house_<n>`, `cloud_<n>`, `balloon`, `rainbow` … | |

Obstbäume teilen sich ein Modell (`ptree`), die Bananenstaude heißt `banana` – die Galerie zählt sie deshalb als vorhanden.

## Alles Neue auf einmal in Blender nachbauen

Für neue Dinge, die erst einmal nur als Platzhalter im Code stehen, gibt es einen Automatik-Weg:

1. `node tools/dump-models.mjs` – schreibt `art/remaster/plan.json`: jedes Platzhalter-Modell als Liste von Grundformen (Klotz, Kugel, Polster, Zylinder, Ring …) mit Maßen, Lage und Farbe; Formen, die sich nicht erkennen lassen (gebogene Stängel, Sterne), als Dreiecke. Dazu, welches Modell welches Icon zeigt.
2. In Blender `kit.py` laufen lassen, `PLAN = r"…\plan.json"` setzen und `blender/remaster.py` ausführen. Es baut alles in schön nach (runde Kanten, feinere Rundungen, weiche Schatten in Ritzen und am Boden), dünnt sehr dichte Modelle aus und schreibt `place2.glb`, `furniture2.glb`, `items2.glb`, `crops2.glb`. Erzeuger (Beerenstrauch, Bienenstock …) bekommen ein zweites Modell `<name>_ready` mit Ernte.
3. Die vier Dateien nach `assets/models/` und in `packs.json` eintragen (stehen schon drin).
4. Icons: `PACKDIR` (Ordner mit allen `.glb`) und `ICONDIR` setzen, `blender/icons2.py` ausführen, dann `python3 tools/import-icons.py --rand ordner`.

## Welt-Stücke (Orte, Fahrgeschäfte, Tiere) in Blender

Feste Teile der Orte (Höhle, Tiefen, Riff, Wrack, Grotte, Vulkan, Hochsee, Jahrmarkt, Moor, Bambushain, Tore), Fahrgeschäfte und Reittiere (Pony, Tandem, Bimmelbahn, Schlitten, Floß), Wildtiere, Erzfelsen, Pilze, Beerensträucher u. a. werden im Code über `bm('name', teile)` (`src/blend.js`) gebaut: Gibt es ein Blender-Modell mit dem Namen, wird es genommen, sonst die Grundformen.

1. `python3 tools/capture-world.py` – startet das Spiel im Bauplan-Modus, besucht alle Orte, öffnet die Tore und schreibt `art/remaster/world.json`.
2. In Blender `kit.py`, `PLAN = r"…\world.json"`, `PACKS = ['world']`, dann `blender/remaster.py` ➜ `world2.glb` (Segmente bleiben wie im Spiel, dazu runde Kanten und weiche Schatten).
3. `world2.glb` nach `assets/models/` (steht in `packs.json`).

Neue Figuren (Besucher, Hüte …): `node tools/dump-shapes.mjs`, dann in Blender `shapes_data.py` + `shapes.py` ➜ `characters.glb`.

## Ein Icon ersetzen

1. In der Galerie **Alle Icons als ZIP** laden – darin `<id>.png` für jedes Ding.
2. Eigenes Bild malen oder rendern: quadratisch, **transparenter Hintergrund**, Motiv groß und mittig, kräftige Umrisse (wird auf dem Handy klein gezeigt). Dateiname = ID, z. B. `apfel.png`, `strandgrill.png`.
3. `npm run icons -- pfad/zum/ordner` – bringt jedes Bild auf 256 × 256 (WebP), legt es in `assets/icons/` und trägt es in `assets/icons/index.json` ein. Unbekannte Dateinamen werden gemeldet und übersprungen.
4. Ein eigenes Icon entfernen: die `.webp` in `assets/icons/` löschen und `npm run icons -- --sync`.

Eigene Icons haben Vorrang vor gerenderten; alle anderen werden weiter automatisch erzeugt.

## Ohne PC-Blender

Die Platzhalter-GLBs aus `art/export/` lassen sich in jedem Programm öffnen, das glTF kann (z. B. Blender, aber auch Web-Editoren auf dem Tablet). Wichtig sind nur die Regeln oben: Name, Maßstab, Ursprung, Vertex-Farben.

## Schwere Modelle verschlanken (Inselleben 12)

`blender/slim.py` (nach `kit.py`) lädt `nature.glb` und `crops.glb`, dünnt sehr dichte Netze aus (Palmwedel 6.888 → 2.600 Dreiecke,
Baumkronen → 1.700, Felsen → 650, reife Beete → 1.000) und schreibt die Pakete zurück; Namen, Gelenke, Animationen und Vertex-Farben
bleiben gleich, die Originale liegen als `*_orig.glb` daneben. Zusammen mit den Schatten, die nur noch jedes zweite Bild neu
berechnet werden, sind es im Schnitt rund 58 % weniger Zeichenaufrufe und 43 % weniger Dreiecke pro Bild.

## Inselleben 13: Zäune, Tore und Feengarten (Blender-Lauf steht noch aus)

Die neuen Stücke laufen fürs Erste als Code-Modelle (`src/models-13.js`, Ausnahmeliste `CODE_ONLY` in `test/remaster.test.mjs`).
`node tools/dump-models.mjs` schreibt sie schon in den Bauplan: je Zaunart 15 Stücke `zaun_<art>_<maske>` (Maske: 1 = Norden,
2 = Osten, 4 = Süden, 8 = Westen), je Tor `tor_<art>_rahmen` und `tor_<art>_fluegel` (Ursprung des Flügels = Angel), dazu die
16 neuen Deko-Modelle samt Icons. Nach dem nächsten `remaster.py`-Lauf nimmt das Spiel die Blender-Fassungen von selbst
(`world.js`, `syncObjects`); dann die 16 Namen aus `CODE_ONLY` streichen. Die Gebiete (`zone13_*`) kommen über
`python3 tools/capture-world.py` + `PACKS = ['world']` dazu.

## Inselleben 14: Lieblingsplätze (Blender-Lauf steht noch aus)

Auch diese 59 Stücke laufen fürs Erste als Code-Modelle (`src/models-14.js`, in `CODE_ONLY`): Stege, Treppen, Laternen,
Kuschelplätze, der Saisonkatalog (20 Deko, 20 Möbel), vier Sträuße und vier Kränze. `node tools/dump-models.mjs` nimmt sie
schon in den Bauplan auf (samt Icons). Nicht im Bauplan, weil sie sich im Spiel zusammensetzen: Hase, Schneemann (je nach
Kugeln und Schmuck), Liebesschlösser, Salon-Stand, Fassaden-Teile (Tür, Läden, Blumenkästen) und das Gelände (Hügel, Wasser).
Die sechs Salon-Frisuren kommen über `node tools/dump-shapes.mjs` + `shapes.py` in `characters.glb`.
