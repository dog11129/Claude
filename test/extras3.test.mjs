// Erweiterungen Teil 3: Nachbarzimmer, Schiffswrack, Spieleabend, Fotowettbewerb, Grillabend, Sternbilder, Ballonfahrt, Schmetterlingsgarten
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, tick, key, canPlace, blocked, resolve, friendX, homeAt, roomOf, nroomZ, roomIdAt, inside, HOME_X, seasonOf } from '../src/state.js';
import * as Z from '../src/extras3.js';
import { ITEMS, PLACE, CROPS, NPC_IDS } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { PLACE_X, FURN_X } from '../src/models-extra.js';

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const fresh = () => migrate(newFarm('T'));
const freeSpot = (s, skip = []) => { for (let x = -18; x <= 18; x++) for (let z = -6; z <= 20; z++) if (canPlace(s, x, z) && !skip.includes(key(x, z))) return [x, z]; };
const nextDay = s => { const d = s.day; s.dayTime = 1; tick(s, 0.01, true); assert.equal(s.day, d + 1); };

test('Alter Spielstand: neue Felder, eigenes Haus bleibt wie es war', () => {
  const o = old(), s = migrate(old());
  assert.equal(s.wreck.code.length, 4);
  assert.deepEqual([...s.wreck.code].sort(), [...Z.WRECK_SYMS].sort());
  assert.deepEqual(s.consts, []);
  // Nachbarn richten sich seit Inselleben 12 selbst ein: nur ihr Bett und eigene Stücke (npc), nichts vom Spieler erfunden
  for (const h of Object.values(s.nhome)) for (const o of Object.values(h.items)) assert.ok(o.npc || o.k === 'einzelbett', o.k);
  assert.equal(s.photoc.theme, Z.photoTheme(s));
  assert.deepEqual(s.home.items, o.home?.items || s.home.items);
  // der Code bleibt beim erneuten Laden gleich
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))).wreck.code, s.wreck.code);
  // kaputte Werte werden aufgeräumt
  const b = migrate({ ...old(), wreck: { code: ['x'] }, consts: [{ n: 1 }], nhome: { mira: { items: 5, w: 9 }, niemand: {} }, game: { k: 'c4' } });
  assert.equal(b.wreck.code.length, 4);
  assert.deepEqual(b.consts, []);
  assert.equal(typeof b.nhome.mira.items, 'object');
  for (const o of Object.values(b.nhome.mira.items)) assert.ok(o.npc || o.k === 'einzelbett', o.k);
  assert.equal(b.nhome.mira.w, 3);
  assert.ok(!b.nhome.niemand);
  assert.equal(b.game, null);
});

test('Jedes neue Teil hat ein Modell, Blumen und Gemüse sind kaufbar', () => {
  for (const [id, p] of Object.entries(PLACE)) if (['strandgrill', 'schmetterlingshaus', 'fotopokal', 'steuerrad', 'anker', 'trauerweide', 'musikbox', 'eiswagen', 'schaukel', 'seerosenbecken', 'ballonplatz'].includes(id)) assert.ok(PLACE_X[id], id);
  for (const id of ['spieltisch', 'ohrensessel', 'kachelofen', 'buddelschiff', 'schiffsglocke', 'kapitaenstruhe', 'traumlampe', 'sternenteppich']) { assert.ok(FURNITURE[id], id); assert.ok(FURN_X[id], id + ' Modell'); }
  for (const k of ['gaensebluemchen', 'dahlie', 'christrose', 'mais', 'erdbeere', 'melone']) { assert.ok(CROPS[k]); assert.ok(ITEMS['s_' + k]?.buy > 0, k); }
  assert.ok(Object.keys(CROPS).indexOf('christrose') < Object.keys(CROPS).indexOf('weizen'), 'Blumen vor dem Gemüse');
});

test('Nachbarzimmer: ab 3 Herzen einrichten, Wünsche erfüllen, eigenes Haus bleibt unberührt', () => {
  const s = fresh();
  const z0 = nroomZ('mira');
  assert.equal(roomIdAt(z0), 'mira');
  assert.equal(roomIdAt(0), null);
  assert.ok(inside({ x: HOME_X, z: z0 }));
  assert.ok(!blocked(s, HOME_X + 1, z0), 'im Zimmer kann man laufen');
  assert.ok(blocked(s, HOME_X - 2, z0 - 1), 'das Bett steht im Weg');
  s.inv.herd = 1;
  assert.equal(act(s, { t: 'hplace', x: 2, z: -1, item: 'herd', r: 0, room: 'mira' }).ok, false, 'ohne Herzen nicht');
  friendX(s, 'mira').f = 400;
  assert.ok(act(s, { t: 'hplace', x: 2, z: -1, item: 'herd', r: 0, room: 'mira' }).ok);
  assert.equal(homeAt(s, 2, -1)?.o?.k, undefined, 'nicht im eigenen Haus');
  assert.equal(homeAt(s, 2, -1, false, roomOf(s, 'mira')).o.k, 'herd');
  assert.equal(act(s, { t: 'hpick', x: -2, z: -1, room: 'mira' }).ok, false, 'Miras Bett bleibt');
  // Wunsch 1 (Küche) ist erfüllt
  const m = s.money;
  const r = act(s, { t: 'nwish', id: 'mira' });
  assert.ok(r.ok && /Pflanzen/.test(r.taleSay));
  assert.equal(s.nhome.mira.w, 1);
  assert.ok(s.money > m);
  assert.ok(/noch nicht/.test(act(s, { t: 'nwish', id: 'mira' }).taleSay));
  s.inv.topfpflanze = 2; s.inv.teppich = 1;
  act(s, { t: 'hplace', x: -3, z: 1, item: 'topfpflanze', r: 0, room: 'mira' });
  act(s, { t: 'hplace', x: 3, z: 1, item: 'topfpflanze', r: 0, room: 'mira' });
  act(s, { t: 'nwish', id: 'mira' });
  act(s, { t: 'hplace', x: 0, z: -1, item: 'teppich', r: 0, room: 'mira' });
  const fin = act(s, { t: 'nwish', id: 'mira' });
  assert.equal(s.nhome.mira.w, 3);
  assert.equal(fin.got, 'traumlampe');
  assert.equal(s.inv.traumlampe, 1);
  assert.ok(s.book.some(b => b.k === 'nroom:mira'));
  // drinnen: Ansprechen und Hinausgehen
  const ex = resolve(s, { x: HOME_X, z: z0 + 2.3, ry: 0 }, 'hand');
  assert.equal(ex.exit, true);
  assert.equal(ex.room, 'mira');
});

test('Schiffswrack: Truhen, Seekarte, Bullaugen-Code', () => {
  const s = fresh();
  const dive = resolve(s, { x: Z.WRECK_BUOY[0], z: Z.WRECK_BUOY[1], ry: 0, sw: true }, 'hand');
  assert.ok(dive.dive && dive.wreck);
  assert.ok(act(s, { t: 'wreck', op: 'found' }).ok);
  assert.ok(blocked(s, Z.WRECK.x, Z.WRECK.z - 3), 'der Rumpf ist im Weg');
  assert.ok(!blocked(s, Z.WRECK.x, Z.WRECK.z + 5));
  const c0 = act(s, { t: 'wreck', op: 'chest', i: 0 });
  assert.equal(c0.got, 'seekarte');
  assert.equal(act(s, { t: 'wreck', op: 'chest', i: 0 }).ok, false, 'einmal am Tag');
  assert.ok(act(s, { t: 'wreck', op: 'chest', i: 1 }).ok);
  // Bullauge zeigt sein Zeichen
  const [px, pz] = Z.WRECK_PORTS[2];
  assert.ok(resolve(s, { x: Z.WRECK.x + px, z: Z.WRECK.z + pz + 0.5, ry: Math.PI }, 'hand').label.includes(s.wreck.code[2]));
  const wrong = [...s.wreck.code].reverse();
  const w = act(s, { t: 'wreck', op: 'open', code: wrong });
  assert.ok(!s.wreck.open && /Reihenfolge/.test(w.msg));
  const money = s.money;
  assert.ok(act(s, { t: 'wreck', op: 'open', code: s.wreck.code }).ok);
  assert.ok(s.wreck.open);
  assert.equal(s.money, money + 6000);
  for (const id of ['kapitaenstruhe', 'buddelschiff', 'schiffsglocke']) assert.equal(s.inv[id], 1);
  assert.equal(act(s, { t: 'wreck', op: 'open', code: s.wreck.code }).ok, false, 'nur einmal');
  nextDay(s);
  assert.ok(act(s, { t: 'wreck', op: 'chest', i: 0 }).ok, 'neuer Tag, neue Truhe');
});

test('Vier gewinnt: Gewinn erkennen, Nachbar blockt und gewinnt', () => {
  const b = Array(42).fill(-1);
  for (const c of [0, 1, 2, 3]) Z.c4Drop(b, c, 0);
  assert.equal(Z.c4Win(b), 0);
  const b2 = Array(42).fill(-1);
  for (const c of [0, 1, 2]) Z.c4Drop(b2, c, 1);
  assert.equal(Z.c4Ai(b2, 1, 1), 3, 'nimmt den Siegzug');
  assert.equal(Z.c4Ai(b2, 0, 1), 3, 'blockt den Gegner');
  const s = fresh();
  s._who = 'host';
  assert.ok(act(s, { t: 'game', op: 'start', k: 'c4', vs: 'npc:bruno', name: 'Lena' }).ok);
  let n = 0;
  while (s.game.win == null && n++ < 60) {
    const g = s.game;
    if (g.p[g.turn].npc) assert.ok(act(s, { t: 'game', op: 'ai' }).ok);
    else { const col = [3, 2, 4, 1, 5, 0, 6].find(c => g.b[c] < 0); assert.ok(act(s, { t: 'game', op: 'move', col }).ok); }
  }
  assert.ok(s.game.win !== null);
  assert.ok(s.npc.bruno.f > 0, 'Freundschaft wächst beim Spielen');
  assert.equal(act(s, { t: 'game', op: 'move', col: 0 }).ok, false, 'Spiel vorbei');
});

test('Memory gegen Nachbarn: Paare, Fehlversuche, Sieg', () => {
  const s = fresh();
  act(s, { t: 'game', op: 'start', k: 'mem', vs: 'npc:mira', name: 'Lena' });
  const g = s.game;
  assert.equal(g.b.length, 12);
  let n = 0;
  while (s.game && s.game.win == null && n++ < 200) {
    const G = s.game;
    if (G.p[G.turn].npc) { act(s, { t: 'game', op: 'ai' }); continue; }
    const free = G.b.map((_, i) => i).filter(i => G.found[i] === undefined);
    const i = free[0], j = free.find(k => k !== i && G.b[k] === G.b[i]);
    assert.ok(act(s, { t: 'game', op: 'flip', i }).ok);
    assert.ok(act(s, { t: 'game', op: 'flip', i: j }).ok);
  }
  assert.equal(Object.keys(s.game.found).length, 12);
  assert.ok(s.game.win !== null);
  assert.equal(s.game.score[0] + s.game.score[1], 6);
  // Fehlversuch wechselt den Zug
  act(s, { t: 'game', op: 'start', k: 'mem', vs: 'npc:mira', name: 'Lena' });
  const H = s.game;
  if (H.p[H.turn].npc) act(s, { t: 'game', op: 'ai' });
  if (!H.p[H.turn].npc) {
    const i = H.b.findIndex((v, k) => H.found[k] === undefined), j = H.b.findIndex((v, k) => k !== i && H.found[k] === undefined && v !== H.b[i]);
    const t0 = H.turn;
    act(s, { t: 'game', op: 'flip', i }); act(s, { t: 'game', op: 'flip', i: j });
    assert.deepEqual(H.miss, [i, j]);
    assert.notEqual(H.turn, t0);
  }
});

test('Fotowettbewerb: einreichen, sonntags bewerten, Pokal per Post', () => {
  const s = fresh();
  const img = 'data:image/jpeg;base64,' + 'A'.repeat(500);
  assert.equal(act(s, { t: 'photoentry', score: 120, img, name: 'Lena' }).ok, false);
  assert.equal(act(s, { t: 'photoentry', score: 50, img: 'x', name: 'Lena' }).ok, false);
  assert.ok(act(s, { t: 'photoentry', score: 80, img, name: 'Lena' }).ok);
  assert.equal(Object.keys(s.photoc.entries).length, 1);
  const theme = s.photoc.theme, mails = s.mail.length;
  for (let i = 0; i < 7; i++) nextDay(s);
  assert.equal(s.photoc.last.theme, theme);
  assert.equal(s.photoc.last.list[0].name, 'Lena');
  assert.equal(s.photoc.last.list[0].votes.length, 3);
  assert.ok(s.mail.slice(mails).some(m => m.item === 'fotopokal'));
  assert.deepEqual(s.photoc.entries, {});
  assert.notEqual(s.photoc.theme, theme, 'neue Woche, neues Thema');
});

test('Grillabend: grillen, abends kommen alle Nachbarn', () => {
  const s = fresh();
  const [x, z] = freeSpot(s);
  s.obj[key(x, z)] = { k: 'strandgrill', r: 0 };
  s.inv.mais = 2; s.inv.kartoffel = 1; s.inv.barsch = 1; s.inv.seestern = 1;
  assert.equal(act(s, { t: 'grill', x, z, item: 'seestern' }).ok, false, 'Seesterne grillt man nicht');
  s.dayTime = (12 - 6) / 18;
  assert.ok(act(s, { t: 'grill', x, z, item: 'mais' }).ok);
  assert.equal(s.inv.grillmais, 1);
  assert.equal(s.grill.n, 0, 'mittags zählt noch nicht für den Grillabend');
  s.dayTime = (18 - 6) / 18;
  const f0 = NPC_IDS.map(id => friendX(s, id).f);
  act(s, { t: 'grill', x, z, item: 'mais' });
  act(s, { t: 'grill', x, z, item: 'kartoffel' });
  assert.equal(Z.grillParty(s), null);
  const r = act(s, { t: 'grill', x, z, item: 'barsch' });
  assert.equal(r.got, 'grillfisch');
  assert.equal(Z.grillParty(s), key(x, z));
  NPC_IDS.forEach((id, i) => assert.equal(friendX(s, id).f, f0[i] + 25));
  assert.ok(s.book.some(b => b.k === 'grillabend'));
  assert.equal(resolve(s, { x, z: z + 1, ry: Math.PI }, 'hand', { x, z }).ui, 'grill');
});

test('Sternbilder: speichern, prüfen, löschen', () => {
  const s = fresh();
  s._who = 'u_a';
  assert.equal(act(s, { t: 'sternbild', op: 'add', n: '', sec: 0, l: [[0, 1]] }).ok, false);
  assert.equal(act(s, { t: 'sternbild', op: 'add', n: 'Katze', sec: 9, l: [[0, 1]] }).ok, false);
  assert.equal(act(s, { t: 'sternbild', op: 'add', n: 'Katze', sec: 1, l: [[0, 99]] }).ok, false);
  assert.ok(act(s, { t: 'sternbild', op: 'add', n: 'Katze', sec: 1, l: [[0, 1], [1, 2]], by: 'Lena' }).ok);
  assert.equal(s.consts[0].n, 'Katze');
  s._who = 'u_b';
  assert.equal(act(s, { t: 'sternbild', op: 'del', i: 0 }).ok, false, 'nur das eigene');
  s._who = 'u_a';
  assert.ok(act(s, { t: 'sternbild', op: 'del', i: 0 }).ok);
  assert.equal(Z.BRIGHT.length, Z.STAR_SECTORS);
  assert.ok(Z.BRIGHT.flat().every(b => b.el > 10 && b.el < 50));
});

test('Ballonfahrt: Ballonplatz nötig, Geschenke am Himmel, Landung am Start', () => {
  const s = fresh();
  assert.equal(act(s, { t: 'ride' }).ok, false);
  const [x, z] = freeSpot(s);
  s.obj[key(x, z)] = { k: 'ballonplatz', r: 0 };
  s.money = 1000;
  const r = act(s, { t: 'ride' });
  assert.ok(r.ok && r.ride);
  assert.equal(s.money, 1000 - Z.RIDE_PRICE);
  for (let i = 0; i < Z.SKY_GIFTS; i++) assert.ok(act(s, { t: 'skygift' }).ok);
  assert.equal(act(s, { t: 'skygift' }).ok, false, 'drei am Tag');
  assert.ok(act(s, { t: 'rideshot' }).ok);
  assert.equal(act(s, { t: 'rideshot' }).ok, false);
  const a = Z.ridePos(0, x, z), b = Z.ridePos(Z.RIDE_SECS, x, z), mid = Z.ridePos(Z.RIDE_SECS / 2, x, z);
  assert.ok(Math.hypot(a.x - x, a.z - z) < 0.01 && Math.hypot(b.x - x, b.z - z) < 0.01);
  assert.ok(mid.y > 6, 'oben in der Luft');
});

test('Schmetterlingsgarten: seltene Falter nur am Haus bei ihren Blumen', () => {
  const s = fresh();
  s.day = 1; // Frühling
  assert.equal(seasonOf(s.day), 'spring');
  const [x, z] = freeSpot(s);
  s.tiles[key(x + 1, z)] = { w: 0, c: { k: 'tulpe', g: 999 } };
  s.tiles[key(x - 1, z)] = { w: 0, c: { k: 'tulpe', g: 999 } };
  assert.deepEqual(Z.gardenBugs(s, x, z), [], 'ohne Schmetterlingshaus nichts');
  s.obj[key(x, z + 2)] = { k: 'schmetterlingshaus', r: 0 };
  assert.deepEqual(Z.gardenBugs(s, x, z).map(b => b[0]), ['tulpenfalter']);
  s.dayTime = (12 - 6) / 18;
  const got = new Set();
  for (let i = 0; i < 80; i++) got.add(act(s, { t: 'bug', x, z }).caught);
  assert.ok(got.has('tulpenfalter'));
  const far = migrate(newFarm('T'));
  far.dayTime = s.dayTime;
  for (let i = 0; i < 80; i++) assert.notEqual(act(far, { t: 'bug', x, z }).caught, 'tulpenfalter');
});
