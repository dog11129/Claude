// Inselleben 4: Winter, Vögel, Tümpel, Kanu & Grotte, Vulkan, Minigolf, Tanz, Zeitkapsel, Stempel, Café, Bibliothek,
// Radio, Gästebuch, Modenschau, Gartenwettbewerb, Riesengemüse – und alte Spielstände
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, resolve, canPlace, seasonOf, HOME_X } from '../src/state.js';
import * as W from '../src/extras4.js';
import { ITEMS, PLACE, PROJECTS, DAILY, STORY } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { PLACE_X, FURN_X } from '../src/models-extra.js';
import { inPond, POND } from '../src/island.js';
import { zoneOf } from '../src/newleaf.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; return s; };
const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const at = (s, h) => { s.dayTime = (h - 6) / 18; };
const place = (s, k) => { s.obj['40,40'] = { k, r: 0 }; };

test('Alte Spielstände: alle neuen Felder da, nichts geht verloren', () => {
  const o = old(), s = migrate(o);
  for (const k of ['winter', 'birds', 'tidepool', 'grotto', 'volcano', 'golf', 'dance', 'capsules', 'stamps', 'cafe', 'library', 'radio', 'guestbook', 'fashion', 'gardenc', 'giant']) assert.ok(s[k] !== undefined, k);
  assert.equal(s.money, migrate(old()).money);
  const again = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.capsules, s.capsules);
});

test('Daten: neue Deko, Projekte und Möbel haben Modelle', () => {
  for (const k of ['gaestebuch', 'gartenpokal', 'gemuesepokal', 'modepokal', 'rallyepokal', 'golfpokal', 'tanzpokal', 'minigolf', 'inselcafe', 'bibliothek']) assert.ok(PLACE[k] && PLACE_X[k], k);
  assert.ok(FURNITURE.inselradio && FURN_X.inselradio);
  for (const d of DAILY) assert.ok(typeof d[1] === 'string');
});

test('Winter: Schneebälle, Teich wird zur Eisbahn', () => {
  const s = fresh();
  s.day = 22; // Winter
  assert.equal(seasonOf(s.day), 'winter');
  assert.ok(act(s, { t: 'snow', op: 'hit', on: 'npc:mira', x: 1, z: 1 }).ok);
  assert.ok(!blocked(s, POND.cx, POND.cz), 'Eis begehbar');
  s.day = 2;
  assert.ok(blocked(s, POND.cx, POND.cz), 'im Frühling ist es Wasser');
  assert.equal(act(s, { t: 'snow', op: 'hit', on: 'npc:mira' }).ok, false);
});

test('Vögel: nur mit Fernglas, neue Vögel kommen ins Naturbuch', () => {
  const s = fresh();
  at(s, 10);
  assert.equal(act(s, { t: 'bird', op: 'look', x: 0, z: 4 }).ok, false);
  s.inv.fernglas = 1;
  for (let i = 0; i < 30; i++) act(s, { t: 'bird', op: 'look', x: 0, z: 4 });
  assert.ok(Object.keys(s.birds.seen).length >= 1);
  assert.ok(Object.keys(s.birds.seen).every(id => W.BIRD[id]));
  at(s, 22);
  assert.ok(W.birdsHere(s, 0, 4).every(b => b[4][1] > 22), 'nachts nur Nachtvögel');
});

test('Gezeiten-Tümpel: nur bei Ebbe, einmal am Tag', () => {
  const s = fresh();
  assert.equal(W.TIDE_POOLS.length, 5);
  for (const [x, z] of W.TIDE_POOLS) assert.equal(zoneOf({ x, z }), 'island');
  at(s, 12);
  assert.equal(act(s, { t: 'tide', op: 'pick', i: 0 }).ok, false, 'Flut');
  at(s, 7);
  const r = act(s, { t: 'tide', op: 'pick', i: 0 });
  assert.ok(r.ok && ITEMS[r.got]);
  assert.equal(act(s, { t: 'tide', op: 'pick', i: 0 }).ok, false);
  W.morningW(s);
  assert.ok(act(s, { t: 'tide', op: 'pick', i: 0 }).ok);
});

test('Kanu & Grotte: Einstieg am Fluss, Angeln und Truhe in der Grotte', () => {
  const s = fresh();
  assert.ok(!blocked(s, ...W.CANOE_START), 'Einstieg erreichbar');
  assert.ok(!blocked(s, ...W.GROTTO_EXIT), 'Ausgang am Wasserfall begehbar');
  for (const k of ['shells', 'drift', 'weeds', 'eggs', 'ground']) s[k] = {}; // zufällige Funde am Ufer stören nicht
  s.digs = [];
  const me = { x: W.CANOE_START[0], z: W.CANOE_START[1], ry: 0, key: 'host' };
  assert.ok(!resolve(s, me, 'hand').canoe, 'ohne Kanu nicht');
  s.inv.kanu = 1;
  assert.ok(resolve(s, me, 'hand').canoe);
  assert.ok(act(s, { t: 'canoe', op: 'grotto' }).ok);
  const r = act(s, { t: 'canoe', op: 'fish', i: 0 });
  assert.ok(r.ok && ['grottenforelle', 'kristallgrundel', 'leuchtsalmler'].includes(r.got));
  assert.equal(act(s, { t: 'canoe', op: 'fish', i: 0 }).ok, false);
  assert.ok(act(s, { t: 'canoe', op: 'chest' }).ok);
  assert.ok(blocked(s, W.GROTTO.x, W.GROTTO.z), 'Becken ist Wasser');
  assert.equal(zoneOf({ x: 0, z: 2700 }), 'grotto');
  assert.ok(W.CANOE_PATH.length > 10);
});

test('Vulkaninsel: Überfahrt, Quelle, Obsidian, Feuerfalter', () => {
  const s = fresh();
  s.level = 2; s.money = 5000;
  assert.equal(act(s, { t: 'volc', op: 'boat' }).ok, false, 'erst ab Level 4');
  s.level = 4;
  assert.ok(act(s, { t: 'volc', op: 'boat' }).ok);
  assert.equal(s.money, 5000 - W.VOLCANO_PRICE);
  const [sx, sz] = W.VOLC_SPRINGS[0];
  const r = resolve(s, { x: W.VOLCANO.x + sx, z: W.VOLCANO.z + sz, ry: 0 }, 'hand');
  assert.ok(r.bath && r.sit);
  assert.ok(act(s, { t: 'volc', op: 'bath' }).ok);
  const m = act(s, { t: 'volc', op: 'mine', i: 0 });
  assert.ok(m.ok && ['obsidian', 'lavastein', 'opal'].includes(m.got));
  assert.ok(act(s, { t: 'volc', op: 'bug', i: 0 }).ok);
  assert.equal(act(s, { t: 'volc', op: 'bug', i: 0 }).ok, false);
  assert.ok(blocked(s, W.VOLCANO.x, W.VOLCANO.z - 9), 'Krater');
  assert.ok(!blocked(s, W.VOLCANO.x + W.VOLC_DOCK[0], W.VOLCANO.z + W.VOLC_DOCK[1]), 'Steg');
});

test('Minigolf und Tanzabend: Ergebnisse, Rekorde, Pokale', () => {
  const s = fresh();
  const strokes = W.HOLES.map(h => h.par);
  assert.equal(act(s, { t: 'golf', op: 'score', strokes }).ok, false, 'erst den Platz bauen');
  place(s, 'minigolf');
  assert.ok(act(s, { t: 'golf', op: 'score', strokes, name: 'Lena' }).ok);
  assert.equal(s.golf.rec.n, W.GOLF_PAR);
  assert.equal(s.inv.golfpokal, 1);
  assert.equal(act(s, { t: 'golf', op: 'score', strokes: [0, 1] }).ok, false);
  const song = W.SONGS[0], max = W.danceMax(song);
  assert.ok(act(s, { t: 'dance', op: 'score', song: song.id, score: max }).ok);
  assert.equal(s.inv.tanzpokal, 1);
  assert.equal(act(s, { t: 'dance', op: 'score', song: song.id, score: max + 1 }).ok, false);
});

test('Zeitkapsel: vergraben, warten, ausgraben', () => {
  const s = fresh();
  let p = null;
  for (let x = -10; x <= 10 && !p; x++) for (let z = -5; z <= 10 && !p; z++) if (canPlace(s, x, z)) p = [x, z];
  s.inv.apfel = 3;
  assert.ok(act(s, { t: 'capsule', op: 'bury', x: p[0], z: p[1], days: 7, text: 'Hallo Zukunft!', items: { apfel: 2 }, name: 'Lena' }).ok);
  assert.equal(s.inv.apfel, 1);
  assert.equal(canPlace(s, p[0], p[1]), false, 'Kapsel belegt das Feld');
  assert.equal(act(s, { t: 'capsule', op: 'open', x: p[0], z: p[1] }).ok, false, 'noch zu früh');
  s.day += 7;
  const mail = s.mail.length;
  assert.ok(act(s, { t: 'capsule', op: 'open', x: p[0], z: p[1] }).ok);
  assert.equal(s.inv.apfel, 3);
  assert.equal(s.mail.length, mail + 1);
});

test('Stempelrallye: eigener Pass je Spieler, voll = Pokal', () => {
  const s = fresh();
  s.areas = { wald: { open: 1 }, wiese: { open: 1 } };
  for (const P of W.STAMPS) assert.ok(act(s, { t: 'stamp', op: 'take', id: P[0] }).ok, P[0]);
  assert.equal(s.inv.rallyepokal, 1);
  assert.equal(act(s, { t: 'stamp', op: 'take', id: 'dorf' }).ok, false);
  s._who = 'u_mia';
  assert.ok(act(s, { t: 'stamp', op: 'take', id: 'dorf' }).ok, 'anderer Spieler hat eigenen Pass');
});

test('Café, Bibliothek, Radio, Gästebuch', () => {
  const s = fresh();
  s.money = 10000;
  assert.equal(act(s, { t: 'cafe', op: 'brew', k: 'kakao', q: 3 }).ok, false, 'erst bauen');
  place(s, 'inselcafe');
  const r = act(s, { t: 'cafe', op: 'brew', k: 'kakao', q: 2 });
  assert.ok(r.ok && s.inv[r.got] === 2);
  assert.equal(s.cafe.card.host, 1);
  assert.ok(act(s, { t: 'cafe', op: 'chat' }).ok);
  s.obj['41,41'] = { k: 'bibliothek', r: 0 };
  const b = W.bookToday(s);
  assert.ok(act(s, { t: 'library', op: 'answer', i: b[4] }).ok);
  assert.ok(s.library.books[b[0]]);
  assert.equal(act(s, { t: 'library', op: 'answer', i: 0 }).ok, false, 'einmal am Tag');
  assert.ok(act(s, { t: 'radio', op: 'wish', song: W.RADIO_SONGS[0][0], name: 'Lena' }).ok);
  assert.ok(W.radioNews(s).length >= 2);
  assert.equal(act(s, { t: 'guestbook', op: 'sign', text: 'Hallo!' }).ok, false, 'erst aufstellen');
  s.obj['42,42'] = { k: 'gaestebuch', r: 0 };
  assert.ok(act(s, { t: 'guestbook', op: 'sign', text: 'Hallo!', st: '⭐', px: '1'.repeat(64), name: 'Lena' }).ok);
  assert.equal(act(s, { t: 'guestbook', op: 'sign', text: 'Nochmal' }).ok, false);
});

test('Modenschau: Thema passt = mehr Sterne', () => {
  const s = fresh(), T = W.themeOf(s);
  const good = { top: T.top[0], hat: T.hat[0], glasses: T.glasses[0], topColor: T.col[0], bottomColor: T.col[1] };
  assert.ok(W.lookPoints(T, good) > W.lookPoints(T, { top: 'x' }));
  assert.ok(act(s, { t: 'fashion', op: 'walk', look: good }).ok);
  assert.equal(act(s, { t: 'fashion', op: 'walk', look: good }).ok, false, 'einmal am Tag');
  assert.ok(s.fashion.last.host.stars.length === 3);
});

test('Gartenwettbewerb und Riesengemüse', () => {
  const s = fresh();
  const g0 = W.gardenScore(s);
  for (let i = 0; i < 12; i++) s.tiles[`${i},20`] = { c: { k: i % 2 ? 'tulpe' : 'rose', g: 999 }, w: 0 };
  const g = W.gardenScore(s);
  assert.ok(g.flowers === g0.flowers + 12 && g.pts > g0.pts && g.stars >= 1);
  const mail = s.mail.length;
  W.gardenJudge(s);
  assert.equal(s.mail.length, mail + 1);
  s.tiles['5,25'] = { c: { k: 'kuerbis', g: 9999 }, w: 0 };
  s.inv.duenger = 5;
  assert.equal(act(s, { t: 'giant', op: 'feed', x: 5, z: 25 }).ok, false, 'erst gießen');
  for (let d = 0; d < W.GIANT_MIN; d++) { s.tiles['5,25'].w = 10; assert.ok(act(s, { t: 'giant', op: 'feed', x: 5, z: 25 }).ok); s.day++; }
  const r = act(s, { t: 'harvest', x: 5, z: 25, name: 'Lena' });
  assert.ok(r.ok && s.inv.riesenkuerbis === 1);
  assert.ok(s.giant.log[0].kg > 9);
  assert.ok(!s.tiles['5,25']);
});

test('Radio im Haus und Projekte öffnen ihr Fenster', () => {
  const s = fresh();
  s.home.items['1,0'] = { k: 'inselradio', r: 0 };
  assert.equal(resolve(s, { x: HOME_X + 1, z: 1, ry: Math.PI }, 'hand').ui, 'radio');
  s.obj['30,30'] = { k: 'minigolf', r: 0 };
  assert.equal(resolve(s, { x: 30, z: 31.2, ry: Math.PI }, 'hand').ui, 'golf');
  assert.ok(STORY.at(-1).ev === 'stamp');
  void PROJECTS; void inPond;
});
