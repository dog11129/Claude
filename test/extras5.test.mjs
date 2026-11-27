// Inselleben 5 + Nachbarn laufen um Hindernisse herum
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, resolve, roomIdAt, roomOf, HOME_X } from '../src/state.js';
import * as V from '../src/extras5.js';
import { findWay, npcStep } from '../src/npc-walk.js';
import { BUILDINGS, ITEMS, PLACE } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { PLACE_X, FURN_X } from '../src/models-extra.js';
import { zoneOf } from '../src/newleaf.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; return s; };
const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const put = (s, k, at = '40,40') => { s.obj[at] = { k, r: 0 }; };

test('Nachbarn gehen um Gebäude und Deko herum', () => {
  const s = fresh(), M = BUILDINGS.museum, inM = (x, z) => x >= M.x0 - 0.3 && x <= M.x1 + 0.3 && z >= M.z0 - 0.3 && z <= M.z1 + 0.3;
  const w = findWay(s, M.x0 - 2, M.cz, M.x1 + 2, M.cz);
  assert.ok(w && w.length > 5 && !w.some(([x, z]) => inM(x, z)), 'Weg ums Museum');
  s.obj['3,8'] = { k: 'laterne', r: 0 };
  const e = { x: 3, z: 6 };
  for (let i = 0; i < 900; i++) { npcStep(s, e, 3, 10, 1 / 60, 5 / 60, i / 60); assert.ok(!blocked(s, e.x, e.z), `nie in einem Hindernis (${e.x.toFixed(2)},${e.z.toFixed(2)})`); }
  assert.ok(Math.hypot(e.x - 3, e.z - 10) < 0.6, 'kommt an');
});

test('Alte Spielstände bekommen Inselleben 5', () => {
  const s = migrate(old());
  for (const k of ['xrooms', 'kiln', 'compost', 'florist', 'pony', 'petschool', 'olymp', 'hunts', 'cinema', 'theater', 'deepsea', 'lighthouse', 'penpal', 'party']) assert.ok(s[k] !== undefined, k);
  for (const k of ['komposter', 'toepferscheibe', 'ponystall', 'gluehlaterne', 'baumhaus', 'freiluftkino', 'buehne', 'bahnhof']) assert.ok(PLACE[k] && PLACE_X[k], k);
  for (const k of ['treppe_hoch', 'vorratsregal', 'topf_vase_rosa']) assert.ok(FURNITURE[k] && FURN_X[k], k);
});

test('Dachboden: bauen, Treppe aufstellen, hinauf, einrichten', () => {
  const s = fresh();
  s.money = 100000; s.up.house = 3;
  assert.ok(act(s, { t: 'xroom', op: 'build', id: 'attic' }).ok);
  assert.equal(s.inv.treppe_hoch, 1);
  assert.equal(roomIdAt(V.XROOMS.attic.z0), 'attic');
  assert.equal(roomIdAt(0), null, 'eigenes Haus bleibt');
  s.home.items['1,0'] = { k: 'treppe_hoch', r: 0 };
  assert.equal(resolve(s, { x: HOME_X + 1, z: 1, ry: Math.PI }, 'hand').go, 'xroom:attic');
  s.inv.stuhl = 1;
  assert.ok(act(s, { t: 'hplace', x: 0, z: 0, item: 'stuhl', r: 0, room: 'attic' }).ok);
  assert.ok(roomOf(s, 'attic').items['0,0']);
  assert.equal(act(s, { t: 'hplace', x: 1, z: 0, item: 'stuhl', r: 0, room: 'cellar' }).ok, false, 'Keller noch nicht gebaut');
  assert.equal(zoneOf({ x: HOME_X, z: -50 }), 'home');
});

test('Möbel lackieren, Töpfern, Kompost', () => {
  const s = fresh();
  s.home.items['1,0'] = { k: 'stuhl', r: 0 };
  assert.equal(act(s, { t: 'hpaint', x: 1, z: 0, c: 2 }).ok, false, 'ohne Pinsel');
  s.inv.farbpinsel = 1;
  assert.ok(act(s, { t: 'hpaint', x: 1, z: 0, c: 2 }).ok);
  assert.equal(s.home.items['1,0'].c, 2);
  put(s, 'toepferscheibe');
  s.inv.lehm = 2;
  assert.ok(act(s, { t: 'pottery', op: 'make', form: 'vase', glaze: 'blau' }).ok);
  const mail = s.mail.length;
  s.day++; V.morningV(s);
  assert.equal(s.mail.at(-1).item, 'topf_vase_blau');
  assert.equal(s.mail.length, mail + 1);
  put(s, 'komposter', '41,41');
  s.inv.unkraut = 8;
  assert.ok(act(s, { t: 'compost', op: 'add', id: 'unkraut', n: 8 }).ok);
  V.morningV(s);
  assert.ok(act(s, { t: 'compost', op: 'take' }).ok);
  assert.ok(s.inv.kompost === 2 && s.inv.regenwurm >= 1);
  s.tiles['5,25'] = { c: { k: 'tulpe', g: 0 }, w: 0 };
  assert.ok(act(s, { t: 'compostfeed', x: 5, z: 25 }).ok);
  assert.ok(s.tiles['5,25'].c.g > 0);
});

test('Blumenladen: Strauß nach Farben', () => {
  const s = fresh(), [npc, want] = V.bouquetOrders(s.day)[0];
  const f0 = s.npc[npc]?.f || 0;
  assert.equal(act(s, { t: 'bouquet', op: 'deliver', i: 0 }).ok, false);
  for (const id of ['tulpe', 'kosmee', 'stiefmuetterchen', 'hyazinthe', 'lilie', 'pfingstrose', 'ringelblume']) s.inv[id] = 5;
  assert.ok(act(s, { t: 'bouquet', op: 'deliver', i: 0 }).ok, JSON.stringify(want));
  assert.ok(s.npc[npc].f > f0);
  assert.equal(act(s, { t: 'bouquet', op: 'deliver', i: 0 }).ok, false);
});

test('Pony & Haustierschule', () => {
  const s = fresh();
  put(s, 'ponystall');
  assert.equal(act(s, { t: 'pony', op: 'ride' }).ok, false, 'erst füttern');
  s.inv.karotte = 1;
  assert.ok(act(s, { t: 'pony', op: 'feed' }).ok);
  assert.ok(act(s, { t: 'pony', op: 'ride' }).ok);
  for (let i = 0; i < 9; i++) { act(s, { t: 'petschool', op: 'train', k: V.TRICKS[Math.floor(i / 3)][0] }); s.day++; }
  assert.ok(act(s, { t: 'petschool', op: 'show' }).ok);
});

test('Olympiade, Schnitzeljagd, Kino, Theater, Bahn', () => {
  const s = fresh();
  for (const d of V.OLYMPIA) assert.ok(act(s, { t: 'olymp', op: 'result', d: d[0], score: d[3][2] }).ok);
  assert.equal(s.inv.olympiapokal, 1);
  s.inv.apfel = 1;
  assert.ok(act(s, { t: 'hunt', op: 'hide', x: 3, z: 5, item: 'apfel', clue: 'Beim Dorfbaum!', name: 'Lena' }).ok);
  const h = s.hunts[0];
  assert.equal(act(s, { t: 'hunt', op: 'find', id: h.id }).ok, false, 'eigenes nicht');
  s._who = 'u_mia';
  assert.ok(resolve(s, { x: 3, z: 4.1, ry: 0, key: 'u_mia' }, 'hand').a?.t === 'hunt');
  assert.ok(act(s, { t: 'hunt', op: 'find', id: h.id }).ok);
  s._who = 'host';
  put(s, 'freiluftkino'); s.dayTime = (19 - 6) / 18;
  assert.ok(act(s, { t: 'cinema', op: 'watch' }).ok);
  put(s, 'buehne', '42,42');
  assert.ok(act(s, { t: 'theater', op: 'play', p: 'muschel', miss: 0 }).ok);
  assert.equal(s.inv.theaterpokal, 1);
  assert.ok(V.TRAIN_PATH.length > 30);
});

test('Hochsee-Angeln & Leuchtturm', () => {
  const s = fresh();
  s.level = 3; s.money = 5000;
  assert.ok(act(s, { t: 'deepsea', op: 'boat' }).ok);
  const r = act(s, { t: 'deepsea', op: 'catch', ok: true });
  assert.ok(r.ok && ITEMS[r.got]?.cat === 'fish');
  assert.equal(zoneOf({ x: 0, z: 3700 }), 'deepsea');
  assert.ok(blocked(s, 5, 3700) && !blocked(s, 0, 3700));
  put(s, 'leuchtturm');
  s.dayTime = (21 - 6) / 18;
  assert.ok(act(s, { t: 'lighthouse', op: 'saved', n: 2 }).ok);
  s.day++; s.money = 9000;
  assert.ok(act(s, { t: 'lighthouse', op: 'buy', i: 0 }).ok);
});

test('Brieffreunde & Geburtstagsparty', () => {
  const s = fresh();
  s.inv.apfel = 1;
  assert.ok(act(s, { t: 'penpal', op: 'send', to: 'ab12c', text: 'Hallo!', item: 'apfel', name: 'Lena' }).ok);
  assert.equal(s.penpal.out[0].to, 'AB12C');
  assert.ok(!(s.inv.apfel > 0));
  const n = s.mail.length;
  assert.ok(act(s, { t: 'penpal', op: 'receive', letters: [{ id: 'x1', text: 'Grüße!', from: 'Mia', isle: 'Sonnenland', fromCode: 'ZZZZZ', item: 'birne' }] }).ok);
  assert.equal(s.mail.length, n + 1);
  assert.equal(act(s, { t: 'penpal', op: 'receive', letters: [{ id: 'x1', text: 'Grüße!' }] }).ok, false, 'nicht doppelt');
  const [id, day] = V.nextBirthday(s);
  s.day = day - 2;
  s.inv.partydeko = 1; s.inv.apfelkuchen = 1;
  assert.ok(act(s, { t: 'party', op: 'deco' }).ok);
  assert.ok(act(s, { t: 'party', op: 'cake' }).ok);
  assert.ok(act(s, { t: 'party', op: 'guests', guests: ['mira', 'bruno', 'lio'].filter(x => x !== id) }).ok);
  assert.equal(act(s, { t: 'party', op: 'start' }).ok, false, 'erst am Geburtstag');
  s.day = day;
  const f = s.npc[id]?.f || 0;
  assert.ok(act(s, { t: 'party', op: 'start' }).ok);
  assert.ok(s.npc[id].f >= f + 150);
});
