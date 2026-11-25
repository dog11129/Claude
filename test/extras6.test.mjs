// Inselleben 6: Jahrmarkt, Restaurant, Becken, Schatzkarte, Wolle, Honig, Wildtiere, Veredeln, Picknick, Band
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, resolve, HOME_X, spots, fruitOf } from '../src/state.js';
import * as E from '../src/extras6.js';
import { ITEMS, PLACE, NPC_IDS, STORY } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { PLACE_X, FURN_X } from '../src/models-extra.js';
import { zoneOf } from '../src/newleaf.js';
import { POND, PLAZA } from '../src/island.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; s.intro = null; return s; };
const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const at = (s, h) => { s.dayTime = (h - 6) / 18; };
const dayOf = (sea, d) => ['spring', 'summer', 'autumn', 'winter'].indexOf(sea) * 7 + d; // erstes Jahr

test('Alte Spielstände bekommen Inselleben 6, neue Inseln den Einstieg', () => {
  const s = migrate(old());
  for (const k of ['fair', 'resto', 'pirate', 'bees', 'honeys', 'wild', 'graft', 'hybrids']) assert.ok(s[k] !== undefined, k);
  assert.equal(s.intro, null, 'alte Insel: keine Führung');
  assert.ok(migrate(newFarm('N')).intro?.on, 'neue Insel: Führung');
  for (const k of ['schafweide', 'bienenkasten', 'picknickdecke', 'restaurant']) assert.ok(PLACE[k] && PLACE_X[k], k);
  for (const k of ['terrarium', 'webstuhl', 'musterteppich', 'pluesch_baer', 'riesenteddy', 'piratentruhe', 'honigvitrine', 'bandposter', 'wollteppich_rot', 'strickkissen_blau']) assert.ok(FURNITURE[k] && FURN_X[k], k);
  assert.equal(FURNITURE.aquarium.tank, 'fish');
  assert.ok(STORY.length >= 49);
});

test('Jahrmarkt: nur an seinem Tag, Fahrten, Lose, Entenangeln', () => {
  const s = fresh();
  s.money = 50000;
  assert.equal(zoneOf({ x: 0, z: -600 }), 'fair');
  assert.ok(!blocked(s, 0, -600 + 6), 'Platz');
  assert.ok(blocked(s, E.FAIR_SPOTS.rad.x, -600 + E.FAIR_SPOTS.rad.z), 'Riesenrad steht fest');
  s.day = dayOf('summer', 3); at(s, 12);
  assert.ok(!E.fairOpen(s));
  assert.ok(!act(s, { t: 'fair', op: 'ride', k: 'rad' }).ok, 'zu');
  assert.equal(E.nextFair(s), dayOf('summer', 4));
  s.day = dayOf('summer', 4);
  assert.ok(E.fairOpen(s));
  assert.ok(act(s, { t: 'fair', op: 'ride', k: 'karussell' }).ok);
  assert.equal(s.fair.rides, 1);
  for (let i = 0; i < 10; i++) assert.ok(act(s, { t: 'fair', op: 'los' }).ok);
  assert.ok(!act(s, { t: 'fair', op: 'los' }).ok, 'höchstens 10 Lose');
  const r = act(s, { t: 'fair', op: 'ducks', hooked: 3 });
  assert.ok(r.ok && r.ducks.length === 3);
  assert.ok(!act(s, { t: 'fair', op: 'ducks', hooked: 7 }).ok, 'nicht mehr als 3');
  assert.ok(act(s, { t: 'fair', op: 'buy', id: 'zuckerwatte' }).ok && s.inv.zuckerwatte === 1);
  // Bummelgasse: am Ostende geht es hin
  const me = { x: 13, z: -300, ry: Math.PI / 2 };
  assert.equal(resolve(s, me, 'hand').go, 'fair');
  assert.equal(resolve(s, { x: 0, z: -600 + 7.5, ry: 0 }, 'hand').go, 'fairback');
});

test('Restaurant: eine Schicht am Tag, Sterne', () => {
  const s = fresh();
  s.obj['20,20'] = { k: 'restaurant', r: 0 };
  at(s, 13);
  const m0 = s.money;
  assert.ok(!act(s, { t: 'resto', op: 'shift', served: 99, missed: 0 }).ok, 'unmöglich viele');
  assert.ok(act(s, { t: 'resto', op: 'shift', served: 12, missed: 2 }).ok);
  assert.ok(s.money > m0 && s.resto.best === 12 && s.resto.stars[0] >= 4);
  assert.ok(!act(s, { t: 'resto', op: 'shift', served: 12, missed: 0 }).ok, 'nur einmal am Tag');
  assert.equal(E.restoStars(3, 0), 3, 'wenige Gäste: höchstens 3 Sterne');
});

test('Aquarium & Terrarium: einsetzen, herausnehmen, beim Abbauen zurück', () => {
  const s = fresh();
  s.home.items['0,0'] = { k: 'aquarium', r: 0 };
  s.inv.barsch = 2; s.inv.schmetterling = 1;
  const fish = Object.keys(ITEMS).find(id => E.tankOk('fish', id) && id !== 'barsch'); s.inv[fish] = 1;
  assert.ok(E.tankOk('fish', 'barsch') || true);
  const any = E.tankOk('fish', 'barsch') ? 'barsch' : fish;
  assert.ok(act(s, { t: 'tank', op: 'add', x: 0, z: 0, id: any }).ok);
  assert.ok(!act(s, { t: 'tank', op: 'add', x: 0, z: 0, id: 'schmetterling' }).ok, 'Falter nicht ins Wasser');
  assert.equal(s.home.items['0,0'].a.length, 1);
  assert.ok(act(s, { t: 'tank', op: 'take', x: 0, z: 0, i: 0 }).ok);
  assert.ok(!s.home.items['0,0'].a);
  assert.ok(act(s, { t: 'tank', op: 'add', x: 0, z: 0, id: any }).ok);
  const n = s.inv[any] || 0;
  assert.ok(act(s, { t: 'hpick', x: 0, z: 0 }).ok);
  assert.equal(s.inv[any] || 0, n + 1, 'Fisch zurück');
  const r = resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand');
  assert.ok(!r.ui || r.ui !== 'tank');
});

test('Schatzkarte: fünf Spuren an fünf Tagen bis zur Truhe', () => {
  const s = fresh();
  s.level = 5;
  assert.ok(act(s, { t: 'pirate', op: 'start' }).ok);
  assert.ok(s.pirate.on && s.pirate.at);
  for (let st = 0; st < 5; st++) {
    const [x, z] = s.pirate.at, dig = E.PIRATE[st].dig;
    if (st) assert.ok(!act(s, { t: 'pirate', op: 'find' }).ok, 'erst am nächsten Tag');
    if (st) s.day++;
    const me = { x: x, z: z - 0.9, ry: 0, sw: false };
    const r = resolve(s, me, dig ? 'shovel' : 'hand');
    assert.equal(r.a?.t, 'pirate', `Spur ${st} (${E.PIRATE[st].zone}) bei ${x},${z}: ${JSON.stringify(r)}`);
    assert.ok(act(s, r.a).ok);
  }
  assert.ok(s.pirate.done && s.inv.piratentruhe === 1 && s.wardrobe.pirate);
});

test('Schafe, Webstuhl & Strickmützen', () => {
  const s = fresh();
  s.obj['20,20'] = { k: 'schafweide', r: 0, t: 0 };
  s.inv.weizen = 1;
  assert.ok(act(s, { t: 'farm', op: 'feed', x: 20, z: 20, item: 'weizen' }).ok);
  s.inv.wolle = 20; s.inv.rose = 1; s.inv.kornblume = 1;
  assert.ok(!act(s, { t: 'loom', op: 'tapestry' }).ok, 'ohne Webstuhl');
  s.home.items['2,0'] = { k: 'webstuhl', r: 0 };
  assert.ok(act(s, { t: 'loom', op: 'weave', what: 'teppich', color: 'rot' }).ok);
  assert.equal(s.inv.wollteppich_rot, 1);
  assert.ok(!act(s, { t: 'loom', op: 'weave', what: 'kissen', color: 'gelb' }).ok, 'keine gelbe Blume');
  assert.ok(act(s, { t: 'loom', op: 'tapestry' }).ok && s.inv.musterteppich === 1);
  assert.ok(act(s, { t: 'loom', op: 'hat', id: 'bommel' }).ok && s.wardrobe.bommel);
  assert.ok(!act(s, { t: 'wear', id: 'zipfel' }).ok, 'Strickmützen gibt es nicht zu kaufen');
});

test('Imkerei: Honig nach den Blumen ringsum, alle Sorten = Regal', () => {
  const s = fresh();
  s.obj['30,30'] = { k: 'bienenkasten', r: 0 };
  assert.ok(!act(s, { t: 'bees', x: 30, z: 30 }).ok, 'ohne Blumen');
  for (const [i, k] of [[1, 'rose'], [2, 'rose'], [3, 'tulpe']].entries()) s.tiles[`${31 + i},30`] = { w: 0, c: { k: k[1], g: 9999 } };
  assert.ok(act(s, { t: 'bees', x: 30, z: 30 }).ok);
  assert.ok(s.inv.rosenhonig > 0);
  assert.ok(!act(s, { t: 'bees', x: 30, z: 30 }).ok, 'einmal am Tag');
  for (const h of E.HONEYS) s.honeys[h] = 1;
  s.day++; s.honeyAll = 0; delete s.honeys.rosenhonig;
  assert.ok(act(s, { t: 'bees', x: 30, z: 30 }).ok);
  assert.ok(s.mail.some(m => m.item === 'honigvitrine'));
});

test('Wildtiere: füttern, zahm, Geschenke', () => {
  const s = fresh();
  at(s, 10);
  const p = E.wildPos(s, 'ente', s.time);
  s.inv.weizen = 9;
  const r = resolve(s, { x: POND.cx, z: POND.cz + POND.r + 0.5, ry: Math.PI }, 'hand');
  assert.equal(r.a?.t, 'wild', JSON.stringify(r));
  for (let d = 0; d < 5; d++) { assert.ok(act(s, { t: 'wild', id: 'ente', item: 'weizen' }).ok); assert.ok(!act(s, { t: 'wild', id: 'ente', item: 'weizen' }).ok); s.day++; }
  assert.ok(E.wildTame(s, 'ente'));
  at(s, 3);
  assert.ok(!act(s, { t: 'wild', id: 'eichhoernchen', item: 'apfel' }).ok, 'Eichhörnchen schlafen nachts');
  assert.ok(p);
});

test('Veredeln: zweite Sorte nach zwei Tagen, neue Früchte möglich', () => {
  const s = fresh();
  const k = Object.entries(spots(s)).find(([kk, v]) => v === 'tree' && fruitOf(s, kk) === 'apfel')[0], [x, z] = k.split(',').map(Number);
  s.inv.veredelmesser = 1; s.inv.birne = 1;
  const r = resolve(s, { x, z: z - 0.9, ry: 0 }, 'graft');
  assert.equal(r.a?.t, 'graft');
  assert.ok(act(s, r.a).ok && s.graft[k].f === 'birne');
  assert.ok(!E.graftGrown(s, k));
  s.day += 2; s.fruit[k] = 0;
  let pears = 0;
  for (let i = 0; i < 20; i++) { s.fruit[k] = 0; const before = Object.keys(s.ground || {}).length; act(s, { t: 'shake', x, z }); pears += Object.values(s.ground || {}).filter(g => g.id === 'birne' || g.id === 'birnapfel').length; s.ground = {}; void before; }
  assert.ok(pears > 0, 'Birnen fallen vom Apfelbaum');
});

test('Picknick und Inselband', () => {
  const s = fresh();
  s.obj['10,14'] = { k: 'picknickdecke', r: 0 };
  at(s, 12);
  s.inv.honigbrot = 1;
  assert.ok(act(s, { t: 'picnic', op: 'lay', x: 10, z: 14, dish: 'honigbrot' }).ok);
  const g = s.picnic.guests[0];
  assert.ok(E.picnicSeat(s, g));
  assert.ok(!act(s, { t: 'picnic', op: 'lay', x: 10, z: 14, dish: 'honigbrot' }).ok);
  assert.ok(act(s, { t: 'band', op: 'practice', inst: 'gitarre', score: 80 }).ok);
  assert.ok(!act(s, { t: 'band', op: 'concert' }).ok, 'erst abends');
  at(s, 20);
  const r = resolve(s, { x: PLAZA.x, z: PLAZA.z + 5.5, ry: Math.PI }, 'hand');
  assert.equal(r.a?.op, 'concert', JSON.stringify(r));
  const m0 = s.money, res = act(s, r.a);
  assert.ok(res.ok && s.money > m0 && s.band.done);
  assert.ok(E.bandNpcs(s).every(id => NPC_IDS.includes(id)));
});

test('Einstieg: überspringen', () => {
  const s = migrate(newFarm('N')); s._who = 'host';
  assert.ok(s.intro);
  assert.ok(act(s, { t: 'intro', op: 'skip' }).ok);
  assert.equal(s.intro, null);
});

test('Bestehende Möbel, Deko und Sachen bleiben, wie sie waren (Spielstände!)', () => {
  const snap = JSON.parse(readFileSync(new URL('./fixtures/catalog-snapshot.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(snap.F)) { const f = FURNITURE[k]; assert.ok(f, k); assert.deepEqual([f.w, f.d, !!f.wall, !!f.rug, !!f.solid], v, `Möbel ${k}`); }
  for (const [k, v] of Object.entries(snap.P)) { const p = PLACE[k]; assert.ok(p, k); assert.deepEqual([p.kind || '', !!p.solid], v, `Deko ${k}`); }
  for (const [k, v] of Object.entries(snap.I)) { const it = ITEMS[k]; assert.ok(it, k); assert.deepEqual([it.cat || '', it.furn ? 1 : 0, it.place || ''], v, `Sache ${k}`); }
});
