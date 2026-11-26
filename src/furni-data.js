// Möbel-, Tapeten- und Bodenkatalog als reine Daten (ohne three.js, damit die Spiellogik in Node-Tests läuft).
// cat: sitzen | tische | betten | licht | deko | pflanzen | teppiche | kueche | bad | wand
import { FURN2 } from './furni-data2.js';
export const FURNITURE = {
  stuhl:          { name: 'Holzstuhl',       icon: '🪑', buy: 140,  lvl: 1, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true, craft: { holz: 6 } },
  hocker:         { name: 'Pilzhocker',      icon: '🍄', buy: 80,   lvl: 1, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true, craft: { holz: 3 } },
  sessel:         { name: 'Sessel',          icon: '💺', buy: 480,  lvl: 2, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true },
  sofa:           { name: 'Sofa',            icon: '🛋️', buy: 1100, lvl: 3, cat: 'sitzen',   w: 2, d: 1, solid: true, sit: true },
  esstisch:       { name: 'Esstisch',        icon: '🍽️', buy: 520,  lvl: 2, cat: 'tische',   w: 2, d: 1, solid: true, craft: { holz: 16 } },
  rundtisch:      { name: 'Teetisch',        icon: '🫖', buy: 260,  lvl: 1, cat: 'tische',   w: 1, d: 1, solid: true, craft: { holz: 8 } },
  couchtisch:     { name: 'Couchtisch',      icon: '☕', buy: 300,  lvl: 2, cat: 'tische',   w: 1, d: 1, solid: true, craft: { holz: 10 } },
  schreibtisch:   { name: 'Schreibtisch',    icon: '✏️', buy: 450,  lvl: 3, cat: 'tische',   w: 1, d: 1, solid: true },
  einzelbett:     { name: 'Einzelbett',      icon: '🛏️', buy: 600,  lvl: 1, cat: 'betten',   w: 1, d: 2, solid: true, bed: true, craft: { holz: 14 } },
  bett:           { name: 'Doppelbett',      icon: '🛏️', buy: 1500, lvl: 3, cat: 'betten',   w: 2, d: 2, solid: true, bed: true },
  kommode:        { name: 'Kommode',         icon: '🗄️', buy: 420,  lvl: 2, cat: 'betten',   w: 1, d: 1, solid: true, craft: { holz: 12 } },
  kleiderschrank: { name: 'Kleiderschrank',  icon: '🚪', buy: 900,  lvl: 3, cat: 'betten',   w: 1, d: 1, solid: true },
  stehlampe:      { name: 'Stehlampe',       icon: '💡', buy: 320,  lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true },
  tischlampe:     { name: 'Nachttischlampe', icon: '🪔', buy: 240,  lvl: 2, cat: 'licht',    w: 1, d: 1, solid: true, glow: true },
  kerzen:         { name: 'Kerzen',          icon: '🕯️', buy: 110,  lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true },
  lichterkette:   { name: 'Lichterkette',    icon: '✨', buy: 280,  lvl: 2, cat: 'licht',    w: 2, d: 1, solid: false, wall: true, glow: true },
  kamin:          { name: 'Kamin',           icon: '🔥', buy: 2800, lvl: 6, cat: 'licht',    w: 2, d: 1, solid: true, glow: true, craft: { stein: 30, holz: 6 } },
  herd:           { name: 'Herd',            icon: '🍳', buy: 650,  lvl: 1, cat: 'kueche',   w: 1, d: 1, solid: true },
  kuechenzeile:   { name: 'Küchentheke',     icon: '🔪', buy: 320,  lvl: 1, cat: 'kueche',   w: 1, d: 1, solid: true, craft: { holz: 8, stein: 6 } },
  kuehlschrank:   { name: 'Kühlschrank',     icon: '🧊', buy: 950,  lvl: 3, cat: 'kueche',   w: 1, d: 1, solid: true },
  teppich_rund:   { name: 'Runder Teppich',  icon: '⭕', buy: 260,  lvl: 1, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true },
  teppich:        { name: 'Streifenteppich', icon: '🟫', buy: 340,  lvl: 2, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true },
  herzteppich:    { name: 'Herzteppich',     icon: '💗', buy: 180,  lvl: 2, cat: 'teppiche', w: 1, d: 1, solid: false, rug: true },
  topfpflanze:    { name: 'Topfpflanze',     icon: '🪴', buy: 120,  lvl: 1, cat: 'pflanzen', w: 1, d: 1, solid: true },
  kaktus:         { name: 'Kaktus',          icon: '🌵', buy: 90,   lvl: 1, cat: 'pflanzen', w: 1, d: 1, solid: true },
  blumenvase:     { name: 'Tulpenvase',      icon: '🌷', buy: 180,  lvl: 2, cat: 'pflanzen', w: 1, d: 1, solid: true },
  monstera:       { name: 'Monstera',        icon: '🌿', buy: 420,  lvl: 3, cat: 'pflanzen', w: 1, d: 1, solid: true },
  teddy:          { name: 'Teddybär',        icon: '🧸', buy: 220,  lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true },
  katzenbett:     { name: 'Katzenkörbchen',  icon: '🐈', buy: 380,  lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true },
  buecherregal:   { name: 'Bücherregal',     icon: '📚', buy: 560,  lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true, craft: { holz: 14 } },
  plattenspieler: { name: 'Plattenspieler',  icon: '🎶', buy: 750,  lvl: 4, cat: 'deko',     w: 1, d: 1, solid: true },
  aquarium:       { name: 'Aquarium',        icon: '🐠', buy: 1600, lvl: 5, cat: 'deko',     w: 1, d: 1, solid: true, glow: true },
  klavier:        { name: 'Klavier',         icon: '🎹', buy: 4000, lvl: 8, cat: 'deko',     w: 2, d: 1, solid: true },
  bild:           { name: 'Gemälde',         icon: '🖼️', buy: 300,  lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true },
  wandregal:      { name: 'Wandregal',       icon: '🪵', buy: 150,  lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true, craft: { holz: 4 } },
  wanduhr:        { name: 'Wanduhr',         icon: '🕰️', buy: 380,  lvl: 2, cat: 'wand',     w: 1, d: 1, solid: false, wall: true },
  kiste:          { name: 'Lagerkiste',      icon: '🧰', buy: 600,  lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true, store: true, craft: { holz: 10, eisen: 1 } },
  // Neue eigene Möbel
  kristalllampe:  { name: 'Kristalllampe',   icon: '🔮', buy: 0,    lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true, craft: { amethyst: 2, kristall: 1, eisen: 1 } },
  pilzlampe:      { name: 'Pilzlampe',       icon: '🍄', buy: 0,    lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true, craft: { fliegenpilz: 2, holz: 3 } },
  edelsteinvitrine: { name: 'Edelsteinvitrine', icon: '💎', buy: 0, lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true, glow: true, craft: { rubin: 1, saphir: 1, amethyst: 1, holz: 8 } },
  zapfenkranz:    { name: 'Zapfenkranz',     icon: '🌰', buy: 0,    lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true, craft: { kiefernzapfen: 6, ast: 2 } },
  honigregal:     { name: 'Honigregal',      icon: '🍯', buy: 0,    lvl: 1, cat: 'kueche',   w: 1, d: 1, solid: true, craft: { honig: 3, holz: 6 } },
  baumstumpftisch:{ name: 'Baumstumpf-Tisch', icon: '🪵', buy: 0,   lvl: 1, cat: 'tische',   w: 1, d: 1, solid: true, craft: { holz: 8, harz: 1 } },
  teeservice:     { name: 'Teetablett',      icon: '🫖', buy: 340,  lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true, craft: { holz: 4, lehm: 3 } },
  forschertisch:  { name: 'Forschertisch',   icon: '🔬', buy: 980,  lvl: 3, cat: 'tische',   w: 1, d: 1, solid: true, craft: { holz: 8, eisen: 3 } },
  muschellampe:   { name: 'Muschellampe',    icon: '🐚', buy: 460,  lvl: 2, cat: 'licht',    w: 1, d: 1, solid: true, glow: true },
  badezuber:      { name: 'Badezuber',       icon: '🛁', buy: 720,  lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true, craft: { holz: 14, eisen: 1 } },
  wolkensofa:     { name: 'Wolkensofa',      icon: '☁️', buy: 1800, lvl: 4, cat: 'sitzen',   w: 2, d: 1, solid: true, sit: true },
  // Selten: Belohnung für Wochenziele (rare: 'week') und vom Nachtmarkt (rare: 'night') – nicht im Laden
  sternglobus:    { name: 'Sternenglobus',   icon: '🌐', buy: 0, lvl: 1, cat: 'licht',  w: 1, d: 1, solid: true, glow: true, rare: 'week' },
  mondsessel:     { name: 'Mondsessel',      icon: '🌙', buy: 0, lvl: 1, cat: 'sitzen', w: 1, d: 1, solid: true, sit: true, rare: 'week' },
  regenbogenregal:{ name: 'Regenbogenregal', icon: '🌈', buy: 0, lvl: 1, cat: 'deko',   w: 1, d: 1, solid: true, rare: 'week' },
  leuchtturmmodell:{ name: 'Leuchtturm-Modell', icon: '🗼', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, glow: true, rare: 'week' },
  lumilaterne:    { name: 'Glühwürmchen-Laterne', icon: '🏮', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'night' },
  sternkarte:     { name: 'Sternkarte',      icon: '🗺️', buy: 0, lvl: 1, cat: 'wand',   w: 1, d: 1, solid: false, wall: true, rare: 'night' },
  windspiel:      { name: 'Muschel-Windspiel', icon: '🎐', buy: 0, lvl: 1, cat: 'wand', w: 1, d: 1, solid: false, wall: true, rare: 'night' },
  spieluhr:       { name: 'Spieluhr',        icon: '🎠', buy: 0, lvl: 1, cat: 'deko',   w: 1, d: 1, solid: true, rare: 'night' },
  schneekugel:    { name: 'Insel-Schneekugel', icon: '🔮', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, glow: true, rare: 'night' },
  // Geschenke am Ende der Nachbar-Geschichten (rare: 'tale') und vom Korallenriff
  zimtofen:       { name: 'Miras Zimtofen',   icon: '🔥', buy: 0, lvl: 1, cat: 'kueche', w: 1, d: 1, solid: true, glow: true, rare: 'tale' },
  schnitzbank:    { name: 'Brunos Schnitzbank', icon: '🪚', buy: 0, lvl: 1, cat: 'tische', w: 2, d: 1, solid: true, rare: 'tale' },
  gluecksboje:    { name: 'Pippas Glücksboje', icon: '🛟', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'tale' },
  staffelei:      { name: 'Lios Staffelei',   icon: '🎨', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'tale' },
  teetischchen:   { name: 'Kalles Teetischchen', icon: '🍵', buy: 0, lvl: 1, cat: 'tische', w: 1, d: 1, solid: true, rare: 'tale' },
  sternteleskop:  { name: 'Wandas Teleskop',  icon: '🔭', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'tale' },
  korallenlampe:  { name: 'Korallenlampe',    icon: '🪸', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'reef' },
  // Zeigt ein eigenes Pixel-Muster (🎨 Muster-Editor)
  // Neue Möbel
  spieltisch:     { name: 'Spieltisch',      icon: '🎲', buy: 2400, lvl: 2, cat: 'tische',   w: 1, d: 1, solid: true },
  treppe_hoch:    { name: 'Treppe zum Dachboden', icon: '🪜', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'xroom' },
  treppe_runter:  { name: 'Treppe in den Keller', icon: '🪜', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'xroom' },
  vorratsregal:   { name: 'Vorratsregal',    icon: '🫙', buy: 1600, lvl: 1, cat: 'kueche', w: 1, d: 1, solid: true },
  inselradio:     { name: 'Inselradio',      icon: '📻', buy: 1800, lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true },
  ohrensessel:    { name: 'Ohrensessel',     icon: '🛋️', buy: 1300, lvl: 2, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true },
  schaukelstuhl:  { name: 'Schaukelstuhl',   icon: '🪑', buy: 1100, lvl: 2, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true },
  bodenkissen:    { name: 'Bodenkissen',     icon: '🟣', buy: 300,  lvl: 1, cat: 'sitzen',   w: 1, d: 1, solid: false, sit: true },
  haengesessel:   { name: 'Hängesessel',     icon: '🥚', buy: 1800, lvl: 3, cat: 'sitzen',   w: 1, d: 1, solid: true, sit: true },
  nachttisch:     { name: 'Nachttisch',      icon: '🗄️', buy: 400,  lvl: 1, cat: 'tische',   w: 1, d: 1, solid: true },
  naehmaschine:   { name: 'Nähtisch',        icon: '🧵', buy: 1200, lvl: 2, cat: 'tische',   w: 1, d: 1, solid: true },
  standspiegel:   { name: 'Standspiegel',    icon: '🪞', buy: 900,  lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true },
  puppenhaus:     { name: 'Puppenhaus',      icon: '🏠', buy: 1500, lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true },
  schreibmaschine:{ name: 'Schreibmaschine', icon: '⌨️', buy: 900,  lvl: 2, cat: 'deko',     w: 1, d: 1, solid: true },
  zimmerbrunnen:  { name: 'Zimmerbrunnen',   icon: '⛲', buy: 1400, lvl: 3, cat: 'deko',     w: 1, d: 1, solid: true },
  kachelofen:     { name: 'Kachelofen',      icon: '🔥', buy: 2600, lvl: 3, cat: 'licht',    w: 1, d: 1, solid: true, glow: true },
  bonsai:         { name: 'Bonsai',          icon: '🌳', buy: 1100, lvl: 2, cat: 'pflanzen', w: 1, d: 1, solid: true },
  zimmerpalme:    { name: 'Zimmerpalme',     icon: '🌴', buy: 800,  lvl: 1, cat: 'pflanzen', w: 1, d: 1, solid: true },
  orchideentopf:  { name: 'Orchideentopf',   icon: '🌸', buy: 700,  lvl: 2, cat: 'pflanzen', w: 1, d: 1, solid: true },
  haengepflanze:  { name: 'Hängepflanze',    icon: '🌿', buy: 500,  lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true },
  kuckucksuhr:    { name: 'Kuckucksuhr',     icon: '🕰️', buy: 1600, lvl: 3, cat: 'wand',     w: 1, d: 1, solid: false, wall: true },
  wandteppich:    { name: 'Wandteppich',     icon: '🧶', buy: 900,  lvl: 2, cat: 'wand',     w: 1, d: 1, solid: false, wall: true },
  sternenteppich: { name: 'Sternenteppich',  icon: '⭐', buy: 1200, lvl: 2, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true },
  // Aus dem Schiffswrack
  buddelschiff:   { name: 'Buddelschiff',    icon: '⛵', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'wreck' },
  schiffsglocke:  { name: 'Schiffsglocke',   icon: '🔔', buy: 0, lvl: 1, cat: 'wand', w: 1, d: 1, solid: false, wall: true, rare: 'wreck' },
  kapitaenstruhe: { name: 'Kapitänstruhe',   icon: '🧳', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'wreck' },
  // Dank der Nachbarn fürs Einrichten
  traumlampe:     { name: 'Traumlampe',      icon: '🌙', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'nroom' },
  kristallleuchte: { name: 'Kristall-Leuchte', icon: '💗', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'depths' },
  musterbild:     { name: 'Musterrahmen',    icon: '🖼️', buy: 400, lvl: 1, cat: 'wand',   w: 1, d: 1, solid: false, wall: true, pattern: true },
};

// [id, Name, Grundfarbe, Muster, Akzentfarbe] – Grundfarbe taugt auch als Farbfeld in der Oberfläche.
// Töpferware aus der Töpferscheibe: 4 Formen × 4 Glasuren
export const POT_FORMS = [['vase', 'Vase', '🏺'], ['schale', 'Schale', '🥣'], ['tasse', 'Tasse', '☕'], ['krug', 'Krug', '🫖']];
export const POT_GLAZES = [['rosa', 'rosa', 0xff9ab8], ['blau', 'blau', 0x6aa8e8], ['gruen', 'grün', 0x7ac88a], ['gelb', 'gelb', 0xf2c84a]];
for (const [f, fn, fi] of POT_FORMS) for (const [g, gn] of POT_GLAZES) FURNITURE[`topf_${f}_${g}`] = { name: `${fn} (${gn})`, icon: fi, buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'pottery' };
// Inselleben 6: Aquarium & Terrarium, Webstuhl und Gewebtes, Jahrmarkt-Preise, Schatz & Honig
Object.assign(FURNITURE, {
  terrarium:      { name: 'Terrarium',       icon: '🦗', buy: 2800, lvl: 2, cat: 'deko', w: 1, d: 1, solid: true, tank: 'bug' },
  webstuhl:       { name: 'Webstuhl',        icon: '🧶', buy: 4500, lvl: 2, cat: 'deko', w: 2, d: 1, solid: true },
  musterteppich:  { name: 'Gewebter Musterteppich', icon: '🧶', buy: 0, lvl: 1, cat: 'wand', w: 1, d: 1, solid: false, wall: true, pattern: true, rare: 'wool' },
  pluesch_baer:   { name: 'Plüschbär',       icon: '🧸', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fair' },
  pluesch_hase:   { name: 'Plüschhase',      icon: '🐰', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fair' },
  pluesch_ente:   { name: 'Plüschente',      icon: '🦆', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fair' },
  pluesch_drache: { name: 'Plüschdrache',    icon: '🐲', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fair' },
  riesenteddy:    { name: 'Riesenteddy',     icon: '🧸', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fair' },
  piratentruhe:   { name: 'Piratentruhe',    icon: '🏴‍☠️', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, store: true, rare: 'tmap' },
  honigvitrine:   { name: 'Honigvitrine',    icon: '🍯', buy: 0, lvl: 1, cat: 'kueche', w: 1, d: 1, solid: true, rare: 'bees' },
  bandposter:     { name: 'Bandposter',      icon: '🎸', buy: 0, lvl: 1, cat: 'wand', w: 1, d: 1, solid: false, wall: true, rare: 'band' },
});
// Inselleben 7: Bambus, Wetter, Feste
Object.assign(FURNITURE, {
  bambuslampe:    { name: 'Bambuslampe',     icon: '🏮', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true },
  blitzlampe:     { name: 'Blitzlampe',      icon: '⚡', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true },
  teeschale:      { name: 'Tee-Set',         icon: '🍵', buy: 0, lvl: 1, cat: 'tische', w: 1, d: 1, solid: true, rare: 'bamboo' },
  gymnastikmatte: { name: 'Gymnastikmatte',  icon: '🤸', buy: 0, lvl: 1, cat: 'teppiche', w: 1, d: 2, solid: false, rug: true, rare: 'gym' },
  neujahrsglocke: { name: 'Neujahrsglocke',  icon: '🔔', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'fest' },
  froschkoenig:   { name: 'Froschkönig-Figur', icon: '🐸', buy: 0, lvl: 1, cat: 'deko', w: 1, d: 1, solid: true, rare: 'moor' },
});
export const WOOL_COLORS = [['rot', 'rot', 0xe8505a], ['rosa', 'rosa', 0xff9ab8], ['gelb', 'gelb', 0xf2cf4a], ['orange', 'orange', 0xff9a3a], ['lila', 'lila', 0xa98bff], ['blau', 'blau', 0x5a9ae8], ['weiss', 'weiß', 0xf4f0e6]];
for (const [k, v] of Object.entries(FURN2)) if (!FURNITURE[k]) FURNITURE[k] = v; // 120 weitere Möbel in Serien (furni-data2.js)
// Inselleben 8: aus der Traumwelt (gegen Traumsterne bei Mondschaf Luna) und vom Sonnenuntergang auf der Klippenbank
Object.assign(FURNITURE, {
  traumfaenger:   { name: 'Traumfänger',     icon: '🕸️', buy: 0, lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true, rare: 'dream' },
  traummobile:    { name: 'Traum-Mobile',    icon: '✨', buy: 0, lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true, rare: 'dream' },
  wolkenlampe:    { name: 'Wolkenlampe',     icon: '☁️', buy: 0, lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true, rare: 'dream' },
  mondteppich:    { name: 'Mondteppich',     icon: '🌙', buy: 0, lvl: 1, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true, rare: 'dream' },
  traumschaf:     { name: 'Kuschelschaf Luna', icon: '🐑', buy: 0, lvl: 1, cat: 'deko',   w: 1, d: 1, solid: true, rare: 'dream' },
  abendrotbild:   { name: 'Abendrot-Bild',   icon: '🌅', buy: 0, lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true, rare: 'sunset' },
  // nur bei den Gebiets-Bewohnern (Eule Oskar, Hummel Hilde, Maulwurf Grubi)
  eulenuhr:       { name: 'Eulen-Wanduhr',   icon: '🦉', buy: 0, lvl: 1, cat: 'wand',     w: 1, d: 1, solid: false, wall: true, rare: 'wald' },
  baumstumpfhocker: { name: 'Baumstumpf-Hocker', icon: '🪵', buy: 0, lvl: 1, cat: 'sitzen', w: 1, d: 1, solid: true, sit: true, rare: 'wald' },
  geweihleuchter: { name: 'Geweih-Leuchter', icon: '🦌', buy: 0, lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true, rare: 'wald' },
  pusteblumenlampe: { name: 'Pusteblumen-Lampe', icon: '🌼', buy: 0, lvl: 1, cat: 'licht', w: 1, d: 1, solid: true, glow: true, rare: 'wiese' },
  kleeteppich:    { name: 'Kleeblatt-Teppich', icon: '🍀', buy: 0, lvl: 1, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true, rare: 'wiese' },
  hummelkissen:   { name: 'Hummel-Kissen',   icon: '🐝', buy: 0, lvl: 1, cat: 'deko',     w: 1, d: 1, solid: true, rare: 'wiese' },
  leuchtmoosglas: { name: 'Leuchtmoos-Glas', icon: '💚', buy: 0, lvl: 1, cat: 'licht',    w: 1, d: 1, solid: true, glow: true, rare: 'hoehle' },
  kristallspiegel: { name: 'Kristall-Spiegel', icon: '🪞', buy: 0, lvl: 1, cat: 'wand',   w: 1, d: 1, solid: false, wall: true, rare: 'hoehle' },
  geodentisch:    { name: 'Geoden-Tisch',    icon: '💎', buy: 0, lvl: 1, cat: 'tische',   w: 1, d: 1, solid: true, rare: 'hoehle' },
});
FURNITURE.aquarium.tank = 'fish'; // das bekannte Aquarium bekommt Bewohner (Größe bleibt, alte Spielstände unverändert)
for (const [c, cn] of WOOL_COLORS) {
  FURNITURE[`wollteppich_${c}`] = { name: `Wollteppich (${cn})`, icon: '🟫', buy: 0, lvl: 1, cat: 'teppiche', w: 2, d: 2, solid: false, rug: true, rare: 'wool' };
  FURNITURE[`strickkissen_${c}`] = { name: `Strickkissen (${cn})`, icon: '🟣', buy: 0, lvl: 1, cat: 'sitzen', w: 1, d: 1, solid: false, sit: true, rare: 'wool' };
}
export const WALLS = [
  ['vanille',   'Vanille',         '#fff1dc', 'plain'],
  ['rosa',      'Rosa Streifen',   '#ffe6ea', 'stripes', '#ffc9d4'],
  ['bluemchen', 'Blümchen',        '#fff5d9', 'flowers', '#ffb6c8'],
  ['holz',      'Holzvertäfelung', '#d39f6a', 'boards',  '#c58f5b'],
  ['ziegel',    'Backstein',       '#f4e6d6', 'bricks',  '#e3a28e'],
  ['sterne',    'Sternennacht',    '#3f4b80', 'stars',   '#ffe9a8'],
  ['karo',      'Himmelkaro',      '#e2f0ff', 'checker', '#b5d6f6'],
  ['mint',      'Mint',            '#cdeee0', 'wainscot', '#fffaf2'],
  ['pfingstrosen', 'Pfingstrosen',  '#ffe9ef', 'peonies',  '#ff9ac4'],
];
export const FLOORS = [
  ['dielen',  'Helle Dielen',  '#e6c595', 'planks'],
  ['dunkel',  'Dunkles Holz',  '#a0704a', 'planks'],
  ['schach',  'Schachbrett',   '#fff4e4', 'checker', '#f4bcc6'],
  ['teppich', 'Rosa Teppich',  '#f7c6d0', 'carpet',  '#fbdbe2'],
  ['stein',   'Steinboden',    '#cdc3b8', 'stones',  '#9e948a'],
  ['moos',    'Moosboden',     '#93c97c', 'moss',    '#aedb92'],
  ['parkett', 'Parkett',       '#dcaa70', 'parquet', '#c8925a'],
  ['fliesen', 'Blaue Fliesen', '#94bfe8', 'tiles',   '#fdfbf6'],
  ['rosadielen', 'Rosa Dielen', '#f4c9d2', 'planks'],
  ['rosenparkett', 'Pfingstrosen-Parkett', '#f8d6de', 'parquet', '#f0b8c6'],
];
