// Inselleben 7: Seerosenmoor, Bambushain, Wetter-Abenteuer, Laternenumzug, Silvester, Gymnastik, Nistkästen,
// neue Nachbarn, Bauernmarkt, Kalender und Jahresrückblick
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, resolve, spots, hearts } from '../src/state.js';
import * as E from '../src/extras7.js';
import * as X from '../src/extras.js';
import { ITEMS, PLACE, NPC_IDS, STORY, RECIPES, DAILY, FESTS } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { AREAS } from '../src/areas.js';
import { zoneOf } from '../src/newleaf.js';
import { PLAZA } from '../src/island.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; s.intro = null; return s; };
const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const at = (s, h) => { s.dayTime = (h - 6) / 18; };
const dayOf = (sea, d) => ['spring', 'summer', 'autumn', 'winter'].indexOf(sea) * 7 + d;

test('Alte Spielstände bekommen Inselleben 7, ohne dass etwas verloren geht', () => {
  const o = old(), s = migrate(old());
  for (const k of ['moor', 'bambus', 'nests', 'gym', 'rockets', 'wx7', 'wisps']) assert.ok(s[k] && typeof s[k] === 'object', k);
  assert.equal(s.money, o.money);
  for (const [id, n] of Object.entries(o.inv || {})) assert.equal(s.inv[id], n, id);
  for (const [k, v] of Object.entries(o.obj || {})) assert.equal(s.obj[k]?.k, v.k, k);
  // zweimal migrieren ändert nichts
  const a = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), a);
  for (const k of ['seerose', 'schilf', 'blitzstein', 'irrlicht', 'gruener_tee', 'papierlaterne', 'feder', 'sprossenpfanne', 'laubfrosch', 'goldfrosch', 'feuerlibelle']) assert.ok(ITEMS[k], k);
  for (const k of ['nistkasten', 'marktstand', 'bambuszaun', 'irrlichtlaterne']) assert.ok(PLACE[k], k);
  for (const k of ['bambuslampe', 'blitzlampe', 'teeschale', 'gymnastikmatte', 'neujahrsglocke', 'froschkoenig']) assert.ok(FURNITURE[k], k);
  for (const k of ['b_bambuszaun', 'w_irrlichtlaterne', 'l_papierlaterne', 'sprossenpfanne']) assert.ok(RECIPES[k], k);
  assert.ok(FESTS.laternen && FESTS.silvester);
  assert.ok(STORY.length >= 51 && DAILY.some(d => d[1] === 'moor'));
});

test('Zonen: Jahrmarkt bleibt, Moor und Bambushain liegen dahinter', () => {
  assert.equal(zoneOf({ x: 0, z: -600 }), 'fair');
  assert.equal(zoneOf({ x: 0, z: -900 }), 'moor');
  assert.equal(zoneOf({ x: 0, z: -1200 }), 'bambus');
  const s = fresh();
  assert.ok(!blocked(s, 0, -600 + 6), 'Jahrmarkt-Platz frei');
  assert.ok(!blocked(s, -10, -900 + 7), 'Moorufer frei');
  assert.ok(blocked(s, 3, -900 - 1), 'im Teich');
  assert.ok(!blocked(s, 0, -900 - 1), 'auf dem Steg über den Teich');
  assert.ok(blocked(s, 0, -1200 + E.TEAHOUSE.z), 'Teehaus steht fest');
  assert.ok(!blocked(s, 0, -1200 + 2), 'Weg im Bambushain');
});

test('Seerosenmoor: Steg an drei Tagen gemeinsam bauen, dann fangen, pflücken, schneiden', () => {
  const s = fresh();
  s.areas.wiese = { open: 1 };
  const A = AREAS.wiese, me = { x: A.x, z: A.z - A.d + 1, ry: Math.PI };
  assert.equal(zoneOf(me), 'wiese');
  assert.equal(resolve(s, me, 'hand').ui, 'moorsteg');
  assert.ok(!act(s, { t: 'moor', op: 'steg' }).ok, 'ohne Material');
  s.inv.holz = 40; s.inv.stein = 20;
  for (let d = 0; d < 3; d++) {
    assert.ok(act(s, { t: 'moor', op: 'steg' }).ok, 'Tag ' + d);
    assert.ok(!act(s, { t: 'moor', op: 'steg' }).ok, 'nur einmal am Tag');
    s.day++;
  }
  assert.ok(s.moor.open);
  assert.equal(s.inv.holz, 10); assert.equal(s.inv.stein, 5);
  assert.equal(resolve(s, me, 'hand').go, 'moor');
  // im Moor
  s.day = dayOf('summer', 2) + 28; at(s, 12);
  const f = E.frogPads(s.day)[0], [fx, fz] = E.LILIES[f];
  assert.ok(f !== undefined);
  const r = resolve(s, { x: E.MOOR.x + fx, z: E.MOOR.z + fz + 1.6, ry: Math.PI }, 'net');
  assert.equal(r.a?.op, 'catch');
  let caught = 0;
  for (let i = 0; i < 20 && !caught; i++) { s.moor.caught = {}; const o = act(s, r.a); if (o.caught) caught++; }
  assert.ok(caught, 'Frosch gefangen');
  assert.ok(!act(s, r.a).ok, 'derselbe Frosch nur einmal am Tag');
  const b = E.bloomPads(s.day)[0];
  assert.ok(act(s, { t: 'moor', op: 'lily', i: b }).ok && s.inv.seerose === 1);
  assert.ok(!act(s, { t: 'moor', op: 'lily', i: b }).ok);
  assert.equal(resolve(s, { x: E.MOOR.x + E.REEDS[0][0] + 0.9, z: E.MOOR.z + E.REEDS[0][1], ry: -Math.PI / 2 }, 'axe').a?.op, 'reed');
  assert.ok(act(s, { t: 'moor', op: 'reed', i: 0 }).ok && s.inv.schilf === 2);
  assert.ok(resolve(s, { x: E.MOOR.x + E.RAFT[0] + 0.5, z: E.MOOR.z + E.RAFT[1] + 0.8, ry: 0 }, 'hand').raft);
  assert.ok(act(s, { t: 'moor', op: 'raft' }).ok);
  assert.equal(resolve(s, { x: E.MOOR.x, z: E.MOOR.z + E.MOOR.d - 0.3, ry: 0 }, 'hand').go, 'moorback');
  // Winter: Frösche schlafen
  s.day = dayOf('winter', 2) + 28; s.moor.caught = {};
  const w = E.frogPads(s.day)[0];
  if (w !== undefined) assert.ok(!act(s, { t: 'moor', op: 'catch', kind: 'frog', i: w }).ok);
});

test('Bambushain: Tor freischalten, Bambus hacken, Sprossen graben, Teezeremonie', () => {
  const s = fresh();
  s.areas.wald = { open: 1 };
  const A = AREAS.wald, me = { x: A.x, z: A.z - A.d + 1, ry: Math.PI };
  assert.equal(resolve(s, me, 'hand').ui, 'bambusgate');
  s.money = 1000;
  assert.ok(!act(s, { t: 'bambus', op: 'open' }).ok, 'zu teuer');
  s.money = 40000; s.inv.holz = 25;
  assert.ok(act(s, { t: 'bambus', op: 'open' }).ok);
  assert.ok(s.money >= 10000 && s.money <= 12000, 'Kosten (+ evtl. Erfolg)'); assert.equal(s.inv.holz, 5);
  assert.ok(s.recipes.b_bambuszaun && s.recipes.b_bambuslampe);
  assert.equal(resolve(s, me, 'hand').go, 'bambus');
  const [cx, cz] = E.CLUMPS[0];
  assert.equal(resolve(s, { x: E.BAMBUS.x + cx + 1, z: E.BAMBUS.z + cz, ry: -Math.PI / 2 }, 'axe').a?.op, 'cut');
  assert.ok(act(s, { t: 'bambus', op: 'cut', i: 0 }).ok && s.inv.bambus === 2);
  assert.ok(!act(s, { t: 'bambus', op: 'cut', i: 0 }).ok);
  const sh = E.shootsToday(s.day)[0];
  assert.ok(act(s, { t: 'bambus', op: 'dig', i: sh }).ok && s.inv.bambussprosse === 1);
  assert.equal(resolve(s, { x: E.BAMBUS.x, z: E.BAMBUS.z + E.TEAHOUSE.z + E.TEAHOUSE.d + 0.6, ry: Math.PI }, 'hand').ui, 'teahouse');
  assert.ok(!act(s, { t: 'bambus', op: 'tea', score: 101 }).ok);
  assert.ok(act(s, { t: 'bambus', op: 'tea', score: 90 }).ok && s.inv.gruener_tee === 2);
  assert.ok(!act(s, { t: 'bambus', op: 'tea', score: 90 }).ok, 'einmal am Tag');
  for (let i = 0; i < 2; i++) { s.day++; assert.ok(act(s, { t: 'bambus', op: 'tea', score: 95 }).ok); }
  assert.ok(s.mail.some(m => m.item === 'teeschale'));
  // Bauen mit Bambus
  assert.ok(act(s, { t: 'craft', id: 'b_bambuszaun' }).ok || s.inv.bambus < 3);
});

test('Wetter: Goldtopf am Regenbogen, Blitzsteine nach Gewitter, Irrlichter im Nebel', () => {
  const s = fresh();
  s.wx7.w = 'storm';
  s.weather = 'sun'; s.rainbowDay = s.day;
  E.morningWeather(s);
  assert.equal(Object.values(s.ground).filter(g => g.id === 'blitzstein').length, 3);
  assert.ok(s.rbpot?.at);
  at(s, 9);
  const [px, pz] = s.rbpot.at;
  assert.equal(resolve(s, { x: px, z: pz - 0.9, ry: 0 }, 'shovel').a?.op, 'pot');
  const m0 = s.money;
  assert.ok(act(s, { t: 'weather7', op: 'pot' }).ok);
  assert.equal(s.money, m0 + 3000); assert.equal(s.inv.goldnugget, 2);
  assert.ok(!act(s, { t: 'weather7', op: 'pot' }).ok, 'nur ein Topf');
  // Nachmittags ist der Regenbogen weg
  s.rbpot.found = 0; at(s, 14);
  assert.ok(!act(s, { t: 'weather7', op: 'pot' }).ok);
  // Nebel
  s.weather = 'fog'; at(s, 7); s.wisps = {};
  const w = E.wispPos(s, 0, s.time);
  assert.equal(resolve(s, { x: w.x, z: w.z - 0.9, ry: 0 }, 'net').a?.op, 'wisp');
  assert.ok(act(s, { t: 'weather7', op: 'wisp', i: 0 }).ok && s.inv.irrlicht === 1);
  assert.ok(!act(s, { t: 'weather7', op: 'wisp', i: 0 }).ok);
  assert.ok(!act(s, { t: 'weather7', op: 'wisp', i: 9 }).ok);
  at(s, 12);
  assert.ok(!act(s, { t: 'weather7', op: 'wisp', i: 1 }).ok, 'nur morgens');
});

test('Laternenumzug, Silvester-Feuerwerk und Morgengymnastik', () => {
  const s = fresh();
  s.day = dayOf('autumn', 6); at(s, 19);
  const me = { x: E.PARADE_AT[0], z: E.PARADE_AT[1] + 0.9, ry: Math.PI };
  assert.equal(resolve(s, me, 'hand').ui, 'parade');
  assert.ok(!act(s, { t: 'fests2', op: 'parade', secs: 30 }).ok, 'ohne Laterne');
  assert.ok(act(s, { t: 'fests2', op: 'lantern' }).ok && s.inv.papierlaterne === 1);
  assert.ok(!act(s, { t: 'fests2', op: 'parade', secs: 5 }).ok, 'zu kurz');
  const h0 = hearts(s, 'mira');
  assert.ok(act(s, { t: 'fests2', op: 'parade', secs: 40 }).ok);
  assert.ok(hearts(s, 'mira') >= h0);
  assert.ok(!act(s, { t: 'fests2', op: 'parade', secs: 40 }).ok, 'einmal');
  // Silvester
  assert.ok(act(s, { t: 'fests2', op: 'rockets', list: [{ c: 'gold', sh: 'herz', h: 'hoch' }, { c: 'rosa', sh: 'stern', h: 'tief' }] }).ok);
  assert.ok(!act(s, { t: 'fests2', op: 'rockets', list: [{ c: 'schwarz', sh: 'herz', h: 'hoch' }] }).ok);
  assert.equal(s.rockets.host.length, 2);
  assert.ok(!s.fw || Number.isInteger(s.fw.day), 'Sternenraketen-Feld bleibt unberührt');
  assert.ok(!act(s, { t: 'fests2', op: 'launch' }).ok, 'nicht an Silvester');
  s.day = dayOf('winter', 7); at(s, 23);
  assert.equal(resolve(s, { x: E.FW_AT[0], z: E.FW_AT[1] + 0.9, ry: Math.PI }, 'hand').ui, 'fireworks');
  assert.ok(act(s, { t: 'fests2', op: 'launch' }).ok && s.inv.neujahrsglocke === 1);
  assert.ok(!act(s, { t: 'fests2', op: 'launch' }).ok);
  // Gymnastik
  s.day = dayOf('spring', 3) + 28; at(s, 7);
  assert.equal(resolve(s, { x: E.GYM_AT[0], z: E.GYM_AT[1] - 0.9, ry: 0 }, 'hand').ui, 'gym');
  assert.ok(E.gymSpot(s, NPC_IDS[0]));
  assert.ok(!act(s, { t: 'fests2', op: 'gym', score: 12 }).ok);
  for (let i = 0; i < E.GYM_GOAL; i++) { assert.ok(act(s, { t: 'fests2', op: 'gym', score: 8 }).ok, 'Tag ' + i); assert.ok(!act(s, { t: 'fests2', op: 'gym', score: 8 }).ok); s.day++; }
  assert.equal(s.inv.gymnastikmatte, 1);
  at(s, 12);
  assert.ok(!act(s, { t: 'fests2', op: 'gym', score: 8 }).ok, 'nur morgens');
  assert.equal(E.gymSpot(s, NPC_IDS[0]), null);
});

test('Nistkästen: einziehen, brüten, flügge', () => {
  const s = fresh();
  const tree = Object.entries(spots(s)).find(([, v]) => v === 'tree')[0].split(',').map(Number);
  let k = null;
  for (let dx = -2; dx <= 2 && !k; dx++) for (let dz = -2; dz <= 2 && !k; dz++) { const x = tree[0] + dx, z = tree[1] + dz; if ((dx || dz) && !s.obj[`${x},${z}`] && !blocked(s, x, z)) k = `${x},${z}`; }
  s.obj[k] = { k: 'nistkasten', r: 0 };
  const [x, z] = k.split(',').map(Number);
  assert.match(resolve(s, { x, z: z - 0.9, ry: 0 }, 'hand').label, /Nistkasten/);
  for (let d = 0; d < 30 && !s.mail.some(m => m.item === 'feder'); d++) { s.day++; E.nestMorning(s); }
  assert.ok(s.mail.some(m => m.item === 'feder'), 'Küken flügge');
  assert.ok(s.stats.fledged >= 1);
  delete s.obj[k]; E.nestMorning(s);
  assert.ok(!s.nests[k], 'aufgeräumt');
});

test('Neue Nachbarn: drei Bewerbungen pro Woche, eine Zusage, Kartons tragen', () => {
  const s = fresh();
  const ap = E.applicants(s);
  assert.equal(ap.length, 3);
  assert.deepEqual(E.applicants(s), ap, 'gleich für alle');
  assert.ok(!act(s, { t: 'housing', op: 'accept', id: 'niemand' }).ok);
  assert.ok(act(s, { t: 'housing', op: 'accept', id: ap[0] }).ok);
  assert.ok(s.pending.includes(ap[0]) && s.inv.grundstueck >= 1);
  assert.ok(!act(s, { t: 'housing', op: 'accept', id: ap[1] }).ok, 'eine pro Woche');
  // Einzug simulieren: Häuschen steht, Kartons liegen
  s.residents = { [ap[0]]: { home: '10,10', day: s.day + 1, f: 0 } };
  s.day++;
  E.movingMorning(s);
  assert.ok(s.moving && s.moving.boxes.length >= 1);
  const n = s.moving.boxes.length;
  for (let i = 0; i < n; i++) {
    assert.ok(act(s, { t: 'housing', op: 'pick', i }).ok);
    assert.ok(!act(s, { t: 'housing', op: 'pick', i: (i + 1) % n }).ok, 'nur ein Karton auf einmal');
    assert.ok(act(s, { t: 'housing', op: 'drop' }).ok);
  }
  if (n >= E.BOXES) assert.equal(s.moving, null);
  migrate(s);
});

test('Bauernmarkt: samstags, Wünsche, Einnahmen, Rest zurück', () => {
  const s = fresh();
  s.obj['8,8'] = { k: 'marktstand', r: 0 };
  s.inv.apfel = 5; s.inv.honig = 3; s.inv.holz = 5;
  s.day = dayOf('spring', 3); at(s, 9);
  assert.ok(!act(s, { t: 'market', op: 'open', x: 8, z: 8, items: [{ id: 'apfel', n: 3 }] }).ok, 'kein Samstag');
  s.day = dayOf('spring', 7); at(s, 9);
  assert.ok(E.marketOpen(s));
  assert.ok(!act(s, { t: 'market', op: 'open', x: 8, z: 8, items: [{ id: 'holz', n: 3 }] }).ok, 'Holz nicht');
  assert.ok(!act(s, { t: 'market', op: 'open', x: 8, z: 8, items: [{ id: 'apfel', n: 9 }] }).ok, 'zu viel');
  assert.ok(act(s, { t: 'market', op: 'open', x: 8, z: 8, items: [{ id: 'apfel', n: 5 }, { id: 'honig', n: 2 }] }).ok);
  assert.equal(s.inv.apfel || 0, 0);
  assert.equal(E.marketWishes(s.day).length, 3);
  at(s, 12);
  const m0 = s.money;
  assert.ok(act(s, { t: 'market', op: 'collect' }).ok);
  assert.ok(s.money > m0, 'etwas verkauft');
  at(s, 16);
  assert.ok(act(s, { t: 'market', op: 'collect' }).ok);
  assert.ok(s.market.closed);
  assert.equal(resolve(s, { x: 8, z: 8 - 0.9, ry: 0 }, 'hand').ui, 'market');
});

test('Kalender und Jahresrückblick', () => {
  const s = fresh();
  const days = E.calendarDays(s, 28);
  assert.equal(days.length, 28);
  assert.ok(days.some(d => d.ev.some(e => e[1] === 'Laternenumzug' || e[1].includes('Bauernmarkt'))));
  s.stats.fish = 5;
  E.reviewMorning(s);
  s.stats.fish = 17;
  s.day = E.YEAR + 1;
  E.reviewMorning(s);
  assert.equal(s.lastYear?.y, 1);
  assert.equal(s.lastYear.diff.fish, 12);
  assert.ok(s.mail.some(m => /Inseljahr 1/.test(m.title)));
  assert.equal(E.reviewData(s).y, 1);
  assert.ok(E.reviewData(s, false).running);
});

test('Modelle, Fenster und Kalender-Termine sind vollständig', async () => {
  const { PLACE_X, FURN_X } = await import('../src/models-extra.js');
  for (const k of ['nistkasten', 'marktstand', 'bambuszaun', 'irrlichtlaterne']) assert.ok(PLACE_X[k], k);
  for (const k of ['bambuslampe', 'blitzlampe', 'teeschale', 'gymnastikmatte', 'neujahrsglocke', 'froschkoenig']) assert.ok(FURN_X[k], k);
  const { PANELS_7, TITLES_7 } = await import('../src/ui-extra4.js');
  const s = fresh(), g = { players: { h: { key: 'host' } }, me: 'h', uiAt: { k: '8,8' } };
  s.obj['8,8'] = { k: 'marktstand', r: 0 }; s.inv.apfel = 3;
  for (const day of [dayOf('spring', 7), dayOf('autumn', 6), dayOf('winter', 7)]) for (const h of [7, 10, 19, 23]) {
    s.day = day; at(s, h);
    for (const [k, fn] of Object.entries(PANELS_7)) { const html = fn(s, g); assert.equal(typeof html, 'string', k); assert.ok(TITLES_7[k], k); }
  }
  s.market = { day: s.day, k: '8,8', t0: 9, items: [{ id: 'apfel', n: 2 }], paid: [0] };
  assert.match(PANELS_7.market(s, g), /Auf dem Stand/);
  assert.ok(E.eventsOn(s, dayOf('winter', 7)).some(e => e[1] === 'Silvesternacht'));
});

test('Blitzsteine und Goldtopf verdecken nichts (Ostereier, Muscheln, Grabstellen)', () => {
  for (let run = 0; run < 30; run++) {
    const s = fresh();
    s.eggs = {};
    for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) if ((x + z) % 2 === 0) s.eggs[`${x},${z}`] = 1;
    s.wx7.w = 'storm'; s.weather = 'sun'; s.rainbowDay = s.day;
    E.morningWeather(s);
    for (const [k, g] of Object.entries(s.ground)) if (g.id === 'blitzstein') { assert.ok(!s.eggs[k] && !s.shells[k] && !s.digs.includes(k), k); }
    if (s.rbpot) assert.ok(!s.eggs[s.rbpot.at.join()] && !s.shells[s.rbpot.at.join()], 'Goldtopf');
  }
});
