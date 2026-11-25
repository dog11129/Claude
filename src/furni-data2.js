// 120 weitere Möbel in zwölf Serien (reine Daten, ohne three.js). Modelle: src/models-furn2.js.
// Wer vier verschiedene Stücke einer Serie im Haus hat, bekommt beim Wohnwert-Verein einen Serien-Bonus.
// Neue Schlüssel nur anhängen – nichts Bestehendes überschreiben (siehe test/furni2.test.mjs).
export const FURN_SETS = {
  landhaus: ['🏡', 'Landhaus'], strand: ['🏖️', 'Strandhaus'], pilz: ['🍄', 'Pilzwald'], retro: ['🎵', 'Retro-Diner'],
  sterne: ['🚀', 'Sternenreise'], kinder: ['🧸', 'Kinderzimmer'], musik: ['🎻', 'Musikzimmer'], atelier: ['🎨', 'Atelier & Büro'],
  bad: ['🛁', 'Badezimmer'], winter: ['❄️', 'Winterhütte'], cafe: ['☕', 'Café & Bäckerei'], garten: ['🌻', 'Gartenzimmer'],
};
export const SET_MIN = 4, SET_BONUS = 1500;
// [id, Name, Icon, Preis, Level, Kategorie, Breite, Tiefe, Extras]
const L = [
  // 🏡 Landhaus
  ['landbuffet', 'Küchenbuffet', '🍽️', 1400, 2, 'kueche'], ['holzherd', 'Holzherd', '🔥', 1800, 3, 'kueche', 1, 1, { glow: true }],
  ['spuelstein', 'Spülstein', '🚰', 900, 2, 'kueche'], ['brotregal', 'Brotregal', '🥖', 700, 1, 'kueche'],
  ['eckbank', 'Eckbank', '🪑', 1200, 2, 'sitzen', 2, 1, { sit: true }], ['bauerntisch', 'Bauerntisch', '🍽️', 900, 2, 'tische', 2, 1],
  ['kraeuterbund', 'Kräuterbund', '🌿', 260, 1, 'wand', 1, 1, { wall: true }], ['milchkanne', 'Milchkanne', '🥛', 300, 1, 'deko'],
  ['flickenteppich', 'Flickenteppich', '🟫', 600, 1, 'teppiche', 2, 2, { rug: true }], ['petroleumlampe', 'Petroleumlampe', '🪔', 520, 1, 'licht', 1, 1, { glow: true }],
  // 🏖️ Strandhaus
  ['strandkorbsessel', 'Strandkorb-Sessel', '🏖️', 1600, 2, 'sitzen', 1, 1, { sit: true }], ['zimmerhaengematte', 'Zimmer-Hängematte', '🌴', 2200, 3, 'sitzen', 2, 1, { sit: true }],
  ['rettungsring', 'Rettungsring', '🛟', 400, 1, 'wand', 1, 1, { wall: true }], ['bullauge', 'Bullauge', '🪟', 650, 2, 'wand', 1, 1, { wall: true, glow: true }],
  ['fischernetz', 'Fischernetz', '🎣', 380, 1, 'wand', 1, 1, { wall: true }], ['seekiste', 'Seemannskiste', '🧳', 700, 1, 'deko'],
  ['ankerlampe', 'Ankerlampe', '⚓', 800, 2, 'licht', 1, 1, { glow: true }], ['muschelregal', 'Muschelregal', '🐚', 900, 2, 'deko'],
  ['wellenteppich', 'Wellenteppich', '🌊', 700, 1, 'teppiche', 2, 2, { rug: true }], ['surfdeko', 'Surfbrett zum Anlehnen', '🏄', 1100, 2, 'deko'],
  // 🍄 Pilzwald
  ['pilztisch', 'Pilztisch', '🍄', 600, 1, 'tische'], ['pilzbett', 'Pilzbett', '🛏️', 1800, 3, 'betten', 1, 2, { bed: true }],
  ['pilzschrank', 'Pilzschrank', '🍄', 1400, 2, 'betten'], ['moossessel', 'Moossessel', '🌿', 900, 2, 'sitzen', 1, 1, { sit: true }],
  ['wurzelregal', 'Wurzelregal', '🪵', 800, 2, 'deko'], ['glockenlampe', 'Glockenblumen-Lampe', '🔔', 650, 1, 'licht', 1, 1, { glow: true }],
  ['moosteppich', 'Moosteppich', '🟩', 500, 1, 'teppiche', 2, 2, { rug: true }], ['eichelvase', 'Eichelvase', '🌰', 350, 1, 'pflanzen'],
  ['farntopf', 'Farn im Topf', '🌿', 420, 1, 'pflanzen'], ['schneckenhocker', 'Schneckenhocker', '🐌', 480, 1, 'sitzen', 1, 1, { sit: true }],
  // 🎵 Retro-Diner
  ['dinerjukebox', 'Diner-Musikbox', '🎵', 3800, 4, 'deko', 1, 1, { glow: true }], ['dinerbank', 'Diner-Bank', '🛋️', 1500, 3, 'sitzen', 2, 1, { sit: true }],
  ['dinertisch', 'Diner-Tisch', '🍔', 700, 2, 'tische'], ['barhocker', 'Barhocker', '🪑', 450, 2, 'sitzen', 1, 1, { sit: true }],
  ['shaketheke', 'Milchshake-Theke', '🥤', 1600, 3, 'kueche'], ['neonherz', 'Neon-Herz', '💗', 900, 2, 'wand', 1, 1, { wall: true, glow: true }],
  ['flipper', 'Flipperautomat', '🎰', 4200, 5, 'deko', 1, 1, { glow: true }], ['lavalampe', 'Lavalampe', '🫧', 600, 1, 'licht', 1, 1, { glow: true }],
  ['karoteppich', 'Karoteppich', '🏁', 650, 2, 'teppiche', 2, 2, { rug: true }], ['roehrenfernseher', 'Röhrenfernseher', '📺', 1300, 2, 'deko', 1, 1, { glow: true }],
  // 🚀 Sternenreise
  ['raketenregal', 'Raketenregal', '🚀', 1200, 2, 'deko'], ['planetenlampe', 'Planetenlampe', '🪐', 900, 2, 'licht', 1, 1, { glow: true }],
  ['mondbett', 'Mondbett', '🌙', 3200, 4, 'betten', 2, 2, { bed: true }], ['sternhocker', 'Sternhocker', '⭐', 380, 1, 'sitzen', 1, 1, { sit: true }],
  ['ufolampe', 'UFO-Leuchte', '🛸', 1500, 3, 'licht', 1, 1, { glow: true }], ['astronautenhelm', 'Raumfahrerhelm', '👩‍🚀', 1100, 2, 'deko'],
  ['galaxieteppich', 'Galaxie-Teppich', '🌌', 900, 2, 'teppiche', 2, 2, { rug: true }], ['sternbildposter', 'Sternbild-Poster', '✨', 450, 1, 'wand', 1, 1, { wall: true }],
  ['meteorit', 'Meteorit', '☄️', 1600, 3, 'deko', 1, 1, { glow: true }], ['saturnsessel', 'Ringplaneten-Sessel', '🪐', 1800, 3, 'sitzen', 1, 1, { sit: true }],
  // 🧸 Kinderzimmer
  ['schaukelpferd', 'Schaukelpferd', '🐴', 900, 1, 'deko'], ['bauklotzturm', 'Bauklötze', '🧱', 300, 1, 'deko'],
  ['spielzeugkiste', 'Spielzeugkiste', '🧸', 600, 1, 'deko'], ['spielzelt', 'Spielzelt', '⛺', 1200, 2, 'deko'],
  ['hochbett', 'Hochbett', '🛏️', 2400, 3, 'betten', 1, 2, { bed: true }], ['maltafel', 'Maltafel', '🖍️', 500, 1, 'deko'],
  ['holzeisenbahn', 'Holzeisenbahn', '🚂', 800, 2, 'deko', 2, 2], ['wolkenkissen', 'Wolkenkissen', '☁️', 350, 1, 'sitzen', 1, 1, { sit: true, solid: false }],
  ['sternmobile', 'Sternen-Mobile', '🌟', 400, 1, 'wand', 1, 1, { wall: true }], ['abcteppich', 'ABC-Teppich', '🔤', 550, 1, 'teppiche', 2, 2, { rug: true }],
  // 🎻 Musikzimmer
  ['harfe', 'Harfe', '🎵', 3400, 4, 'deko'], ['cello', 'Cello', '🎻', 2600, 3, 'deko'],
  ['schlagzeug', 'Schlagzeug', '🥁', 3000, 3, 'deko', 2, 1], ['notenpult', 'Notenpult', '🎼', 400, 1, 'deko'],
  ['gitarrenstaender', 'Gitarre im Ständer', '🎸', 1200, 2, 'deko'], ['grammophon', 'Grammophon', '📯', 2200, 3, 'deko'],
  ['fluegel', 'Flügel', '🎹', 6500, 6, 'deko', 2, 2], ['xylophon', 'Xylophon', '🎶', 700, 1, 'deko'],
  ['notenrahmen', 'Notenblatt-Rahmen', '🎼', 350, 1, 'wand', 1, 1, { wall: true }], ['akkordeon', 'Akkordeon', '🪗', 1500, 2, 'deko'],
  // 🎨 Atelier & Büro
  ['zeichentisch', 'Zeichentisch', '📐', 1300, 2, 'tische'], ['drehstuhl', 'Drehstuhl', '💺', 700, 1, 'sitzen', 1, 1, { sit: true }],
  ['aktenschrank', 'Aktenschrank', '🗄️', 900, 2, 'betten'], ['pinnwand', 'Pinnwand', '📌', 350, 1, 'wand', 1, 1, { wall: true }],
  ['globus', 'Globus', '🌍', 1100, 2, 'deko'], ['kreidetafel', 'Kreidetafel', '🖍️', 500, 1, 'wand', 1, 1, { wall: true }],
  ['farbregal', 'Farbregal', '🎨', 800, 1, 'deko'], ['schneiderpuppe', 'Schneiderpuppe', '👗', 1200, 2, 'deko'],
  ['leselampe', 'Leselampe', '💡', 450, 1, 'licht', 1, 1, { glow: true }], ['papierkorb', 'Papierkorb', '🗑️', 150, 1, 'deko'],
  // 🛁 Badezimmer
  ['badewanne', 'Badewanne', '🛁', 2400, 2, 'bad', 2, 1], ['waschtisch', 'Waschtisch', '🚰', 1100, 1, 'bad'],
  ['toilette', 'Toilette', '🚽', 900, 1, 'bad', 1, 1, { sit: true }], ['dusche', 'Dusche', '🚿', 1600, 2, 'bad'],
  ['spiegelschrank', 'Spiegelschrank', '🪞', 700, 1, 'bad', 1, 1, { wall: true }], ['handtuchhalter', 'Handtuchhalter', '🧺', 300, 1, 'bad', 1, 1, { wall: true }],
  ['badvorleger', 'Badvorleger', '🟦', 250, 1, 'bad', 1, 1, { rug: true }], ['waeschekorb', 'Wäschekorb', '🧺', 350, 1, 'bad'],
  ['badregal', 'Badregal mit Entchen', '🦆', 600, 1, 'bad'], ['badschrank', 'Badschrank', '🧴', 800, 1, 'bad'],
  // ❄️ Winterhütte
  ['kaminholz', 'Kaminholz', '🪵', 300, 1, 'deko'], ['holzschlitten', 'Holzschlitten', '🛷', 700, 1, 'deko'],
  ['huettensofa', 'Hüttensofa', '🛋️', 2000, 3, 'sitzen', 2, 1, { sit: true }], ['fellteppich', 'Schaffell-Teppich', '🐑', 900, 2, 'teppiche', 2, 2, { rug: true }],
  ['kakaoecke', 'Kakao-Ecke', '☕', 1100, 2, 'kueche'], ['schneeflockenlampe', 'Schneeflockenlampe', '❄️', 700, 1, 'licht', 1, 1, { glow: true }],
  ['sternlaterne', 'Sternlaterne', '🌟', 550, 1, 'licht', 1, 1, { glow: true }], ['adventskranz', 'Adventskranz', '🕯️', 600, 1, 'deko', 1, 1, { glow: true }],
  ['tannenbaum', 'Tannenbäumchen', '🎄', 1500, 2, 'pflanzen', 1, 1, { glow: true }], ['schneemannfigur', 'Schneemann-Figur', '⛄', 500, 1, 'deko'],
  // ☕ Café & Bäckerei
  ['tortenvitrine', 'Tortenvitrine', '🍰', 2200, 3, 'kueche', 1, 1, { glow: true }], ['kaffeemaschine', 'Kaffeemaschine', '☕', 1400, 2, 'kueche'],
  ['bistrotisch', 'Bistrotisch', '🥐', 600, 1, 'tische'], ['bistrostuhl', 'Bistrostuhl', '🪑', 400, 1, 'sitzen', 1, 1, { sit: true }],
  ['etagere', 'Kuchen-Etagere', '🧁', 650, 1, 'deko'], ['steinbackofen', 'Steinbackofen', '🍞', 2600, 3, 'kueche', 1, 1, { glow: true }],
  ['menuetafel', 'Menütafel', '📋', 450, 1, 'wand', 1, 1, { wall: true }], ['tassenregal', 'Tassenregal', '☕', 500, 1, 'wand', 1, 1, { wall: true }],
  ['donutkissen', 'Donut-Sitzkissen', '🍩', 380, 1, 'sitzen', 1, 1, { sit: true, solid: false }], ['bonbonglas', 'Bonbonglas', '🍬', 300, 1, 'deko'],
  // 🌻 Gartenzimmer
  ['pflanzenleiter', 'Pflanzenleiter', '🪜', 900, 2, 'pflanzen'], ['blumenampel', 'Blumenampel', '🌸', 450, 1, 'wand', 1, 1, { wall: true }],
  ['zitronenbaum', 'Zitronenbäumchen', '🍋', 1400, 2, 'pflanzen'], ['sukkulenten', 'Sukkulentenschale', '🌵', 350, 1, 'pflanzen'],
  ['sonnenblumenvase', 'Sonnenblumenvase', '🌻', 400, 1, 'pflanzen'], ['kraeutertoepfe', 'Kräutertöpfe', '🌱', 450, 1, 'kueche'],
  ['zinkkanne', 'Zinkgießkanne', '🫗', 300, 1, 'deko'], ['gartenbank', 'Gartenbank', '🪑', 1100, 1, 'sitzen', 2, 1, { sit: true }],
  ['rosenspalier', 'Rosenspalier', '🌹', 650, 2, 'pflanzen'], ['lavendeltopf', 'Lavendeltopf', '💜', 380, 1, 'pflanzen'],
];
const SET_ORDER = Object.keys(FURN_SETS);
export const FURN2 = {};
L.forEach(([id, name, icon, buy, lvl, cat, w = 1, d = 1, x = {}], i) => {
  const set = SET_ORDER[Math.floor(i / 10)];
  FURN2[id] = { name, icon, buy, lvl, cat, w, d, solid: !(x.rug || x.wall) && x.solid !== false, set, ...x };
});
// Serien-Bonus: wie viele Serien sind mit mindestens vier verschiedenen Stücken vertreten?
export function setsIn(keys, FURN) {
  const by = {};
  for (const k of keys) { const st = FURN[k]?.set; if (st) (by[st] ||= new Set()).add(k); }
  return Object.entries(by).filter(([, v]) => v.size >= SET_MIN).map(([k]) => k);
}
