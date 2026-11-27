// Bürgermeister-Update: Rathaus, Verordnungen, Hauskredit, Wohnwert, Bummelgasse, Tropeninsel
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFarm, act, tick, resolve, canPlace, blocked, migrate, price, npcAwake, siteFree } from '../src/state.js';
import { DAY, ITEMS, PLACE, PROJECTS, BUILDINGS, RES_SPOTS, BUGS, CROPS } from '../src/data.js';
import { STREET, TROPIC, TROPIC_TREES, TOURS, zoneOf, clampPos, homeScore, islandScore, ORD_PRICE, BOAT_PRICE, tourTargets, tropicWalk } from '../src/newleaf.js';
import { walkable } from '../src/island.js';

const siteTile = s => {
  for (let r = 0; r < 20; r++) for (let x = -6 - r; x <= -6 + r; x++) for (let z = 2 - r; z <= 2 + r; z++) if (canPlace(s, x, z) && siteFree(s, x, z)) return [x, z];
  throw new Error('kein Platz');
};
const nextDay = s => { s.dayTime = 0.9999; tick(s, 1, true); };

test('Inselprojekt: planen, abstecken, spenden, am Morgen fertig', () => {
  const s = newFarm();
  s.money = 100000; s.level = 5;
  assert.ok(act(s, { t: 'plan', id: 'sonnenuhr' }).ok);
  assert.equal(s.inv.baustelle, 1);
  assert.ok(!act(s, { t: 'plan', id: 'picknick' }).ok, 'nur ein Projekt gleichzeitig');
  const [x, z] = siteTile(s);
  assert.ok(act(s, { t: 'place', x, z, item: 'baustelle', r: 0 }).ok);
  assert.equal(s.obj[x + ',' + z].p, 'sonnenuhr');
  assert.ok(act(s, { t: 'fund', x, z, n: 2000 }).ok);
  assert.equal(s.obj[x + ',' + z].paid, 2000);
  // Baustelle wieder abbauen: Spenden zurück, Bauplatz-Pflock zurück in die Tasche, neu abstecken
  const before = s.money;
  assert.ok(act(s, { t: 'pickup', x, z }).ok, 'Baustelle abbauen');
  assert.equal(s.money, before + 2000, 'Spenden zurück');
  assert.equal(s.inv.baustelle, 1);
  assert.ok(act(s, { t: 'place', x, z, item: 'baustelle', r: 0 }).ok, 'neu abstecken');
  assert.ok(act(s, { t: 'fund', x, z, n: 'rest' }).ok);
  assert.equal(s.obj[x + ',' + z].paid, PROJECTS.sonnenuhr.cost);
  const r = resolve(s, { x, z: z + 1, ry: Math.PI }, 'hand');
  assert.equal(r.ui, 'fund');
  nextDay(s);
  assert.equal(s.obj[x + ',' + z].k, 'sonnenuhr', 'eingeweiht');
  assert.ok(s.mail.some(m => m.kind === 'note' && m.title.includes('Sonnenuhr')));
  assert.ok(act(s, { t: 'plan', id: 'picknick' }).ok, 'danach geht das nächste');
  // Fertige Projekte lassen sich abbauen und woanders neu aufstellen
  assert.ok(act(s, { t: 'pickup', x, z }).ok, 'Projekt abbauen');
  assert.ok(!s.obj[x + ',' + z] && s.inv.sonnenuhr === 1);
  assert.ok(act(s, { t: 'place', x, z, item: 'sonnenuhr', r: 0 }).ok, 'neu aufstellen');
  assert.equal(s.obj[x + ',' + z].k, 'sonnenuhr');
});

test('Verordnungen: erste gratis, dann 20.000; Wohlstand, Schöne Insel, Nachteule', () => {
  const s = newFarm();
  s.money = 0;
  const base = price(s, 'apfel');
  assert.ok(act(s, { t: 'ordinance', id: 'reich' }).ok, 'erste Verordnung gratis');
  assert.equal(price(s, 'apfel'), Math.round(base * 1.2));
  s.money = 1000;
  assert.ok(act(s, { t: 'buy', id: 's_tulpe', n: 10 }).ok);
  assert.equal(s.money, 1000 - Math.round(20 * 1.2) * 10, 'Kaufen kostet 20 % mehr');
  assert.ok(!act(s, { t: 'ordinance', id: 'nacht' }).ok, 'zweite kostet Geld');
  s.money = ORD_PRICE;
  assert.ok(act(s, { t: 'ordinance', id: 'nacht' }).ok);
  s.dayTime = (22.5 - 6) / 18;
  assert.ok(npcAwake(s), 'Nachteule: Nachbarn um 22:30 wach');
  s.money = ORD_PRICE;
  act(s, { t: 'ordinance', id: 'schoen' });
  s.weeds = {};
  nextDay(s);
  assert.equal(Object.keys(s.weeds).length, 0, 'kein neues Unkraut');
});

test('Hauskredit: sofort ausbauen, abbezahlen, dann weiter', () => {
  const s = newFarm();
  s.level = 20; s.money = 5000;
  assert.ok(act(s, { t: 'upgrade', id: 'house', lvl: 1 }).ok);
  assert.equal(s.up.house, 2);
  assert.equal(s.loan, 9800);
  assert.ok(s.money >= 5000, 'Ausbau kostet erstmal nichts');
  assert.ok(!act(s, { t: 'upgrade', id: 'house', lvl: 2 }).ok, 'erst abbezahlen');
  s.money = 5000;
  assert.ok(act(s, { t: 'repay', n: 'all' }).ok);
  assert.equal(s.loan, 4800);
  s.money = 10000;
  assert.ok(act(s, { t: 'repay', n: 'all' }).ok);
  assert.equal(s.loan, 0);
  assert.ok(act(s, { t: 'upgrade', id: 'house', lvl: 2 }).ok);
  for (let l = 3; l < 5; l++) { s.loan = 0; assert.ok(act(s, { t: 'upgrade', id: 'house', lvl: l }).ok); }
  assert.equal(s.up.house, 5);
});

test('Wohnwert-Verein schreibt samstags, Inselbewertung steigt', () => {
  const s = newFarm();
  s.home.items['0,0'] = { k: Object.keys(ITEMS).find(k => ITEMS[k].furn), r: 0 };
  const pts = homeScore(s).pts;
  assert.ok(pts > 0);
  while ((s.day) % 7 !== 6) nextDay(s); // nächster Tag ist Samstag (weekday 6 = Tag 7, 14, …)
  const n = s.mail.length;
  nextDay(s);
  assert.ok(s.mail.slice(n).some(m => m.from === 'hha'), 'Brief vom Wohnwert-Verein');
  assert.ok(islandScore(s).stars >= 1);
});

test('Bummelgasse: begehbar, Läden, Tor zurück', () => {
  const s = newFarm();
  assert.ok(blocked(s, BUILDINGS.gate.cx, BUILDINGS.gate.cz), 'Tor auf der Insel');
  assert.equal(resolve(s, { x: BUILDINGS.gate.cx, z: BUILDINGS.gate.z1 + 1, ry: Math.PI }, 'hand').go, 'street');
  const me = { x: STREET.x, z: STREET.z, ry: Math.PI };
  assert.equal(zoneOf(me), 'street');
  assert.ok(!blocked(s, me.x, me.z));
  assert.ok(blocked(s, STREET.x, STREET.z - 5), 'Läden blockieren');
  assert.equal(resolve(s, { x: STREET.x - 8, z: STREET.z - 3.2, ry: Math.PI }, 'hand').ui, 'tailor');
  assert.equal(resolve(s, { x: STREET.x, z: STREET.z - 3.2, ry: Math.PI }, 'hand').ui, 'garden');
  assert.equal(resolve(s, { x: STREET.x + 8, z: STREET.z - 3.2, ry: Math.PI }, 'hand').ui, 'club');
  assert.deepEqual(clampPos(0, -300, 23), [0, -300]);
  assert.deepEqual(clampPos(30, 300, 23), [16, 300]);
});

test('Schneiderei & Club: Hüte freischalten, Samstagskonzert', () => {
  const s = newFarm();
  s.money = 10000;
  assert.ok(act(s, { t: 'wear', id: 'tophat' }).ok);
  assert.ok(s.wardrobe.tophat);
  assert.ok(!act(s, { t: 'wear', id: 'tophat' }).ok, 'nur einmal');
  s.day = 7; s.dayTime = (21 - 6) / 18; // Samstag 21 Uhr
  assert.ok(act(s, { t: 'song' }).ok);
  assert.equal(Object.keys(s.songs).length, 1);
  assert.ok(!act(s, { t: 'song' }).ok, 'ein Lied pro Samstag');
  s.day = 8;
  assert.ok(!act(s, { t: 'song' }).ok, 'sonntags kein Konzert');
});

test('Tropeninsel: Boot, Bäume, Touren, Medaillen, Tauschhütte', () => {
  const s = newFarm();
  s.money = BOAT_PRICE;
  assert.ok(act(s, { t: 'boat' }).ok);
  assert.equal(s.money, 0);
  assert.ok(!act(s, { t: 'boat' }).ok, 'Überfahrt kostet');
  const [tx, tz, fruit] = TROPIC_TREES[0];
  assert.ok(blocked(s, TROPIC.x + tx, TROPIC.z + tz), 'Baum blockiert');
  assert.ok(act(s, { t: 'tpick', i: 0 }).ok);
  assert.equal(s.inv[fruit], 3);
  assert.ok(!act(s, { t: 'tpick', i: 0 }).ok, 'einmal am Tag');
  assert.ok(act(s, { t: 'tour', k: 'frucht' }).ok);
  assert.equal(s.tour.targets.length, TOURS.frucht.n);
  for (const g of s.tour.targets) assert.ok(tropicWalk(g.x, g.z) && !blocked(s, TROPIC.x + g.x, TROPIC.z + g.z), 'Ziel erreichbar');
  const g0 = s.tour.targets[0];
  const r = resolve(s, { x: TROPIC.x + g0.x, z: TROPIC.z + g0.z - 0.9, ry: 0 }, 'hand');
  assert.equal(r.a?.t, 'hit');
  assert.ok(!act(s, { t: 'hit', i: 0, kind: 'net' }).ok, 'falsche Art');
  for (let i = 0; i < TOURS.frucht.n; i++) assert.ok(act(s, { t: 'hit', i, kind: 'pick' }).ok);
  assert.equal(s.tour, null);
  assert.equal(s.medals, TOURS.frucht.medals);
  assert.ok(act(s, { t: 'mbuy', id: 'sandburg' }).ok);
  assert.equal(s.inv.sandburg, 1);
  // Zeit abgelaufen
  act(s, { t: 'tour', k: 'kaefer' });
  tick(s, TOURS.kaefer.time + 1, true);
  assert.equal(s.tour, null);
  assert.equal(s.tourEnd.ok, false);
  // Tropen-Insekten nur dort
  assert.ok(act(s, { t: 'tbug' }).ok);
  assert.ok(BUGS.some(b => b[5] === 'tropic' && s.inv[b[0]]));
  for (let i = 0; i < 40; i++) act(s, { t: 'bug', x: 0, z: 0 });
  assert.ok(!BUGS.some(b => b[5] === 'tropic' && (s.inv[b[0]] || 0) > 1), 'auf der Insel keine Tropen-Insekten');
});

test('Neue Gebäude verschieben keine Bäume, Migration alter Stände', () => {
  for (const id of ['gate', 'boat']) {
    const B = BUILDINGS[id];
    for (let x = B.x0; x <= B.x1; x++) for (let z = B.z0; z <= B.z1; z++) assert.ok(!RES_SPOTS[x + ',' + z], 'kein Baum im Gebäude');
  }
  const old = newFarm();
  delete old.mayor; delete old.loan; delete old.tropic;
  old.tiles['-1,-15'] = { w: 0, c: { k: 'tulpe', g: 0 } };
  const s = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.mayor.ord, 'none');
  assert.equal(s.loan, 0);
  assert.ok(!s.tiles['-1,-15'], 'Beet unter dem Tor entfernt');
  for (const k of ['lilie', 'mohn', 'kornblume']) assert.ok(ITEMS['s_' + k] && CROPS[k].garden);
  for (const k of Object.keys(PROJECTS)) assert.equal(PLACE[k].kind, 'project');
});
