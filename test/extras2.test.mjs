// Erweiterungen 5–9: Nachbar-Geschichten, Bauernhof-Ecke, Korallenriff, Strand-Wettbewerbe, Fahrrad & Seilbahn
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, tick, key, canPlace, blocked, resolve, seasonOf, sandX, hearts, friendX } from '../src/state.js';
import * as Y from '../src/extras2.js';
import { ITEMS, PLACE, DAY, weekday } from '../src/data.js';
import { AREAS, nodeAt, inArea } from '../src/areas.js';

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const freeSpot = s => { for (let x = -18; x <= 18; x++) for (let z = -6; z <= 20; z++) if (canPlace(s, x, z)) return [x, z]; };
const nextDay = s => { const d = s.day; s.dayTime = 1; tick(s, 0.01, true); assert.equal(s.day, d + 1); };
const sandSpot = s => { for (let x = -30; x <= 30; x++) for (let z = -30; z <= 30; z++) if (sandX(x, z) && Y.castleOk(s, x, z) && !s.digs.includes(key(x, z))) return [x, z]; };
const dayWith = (kind, from = 1) => { for (let d = from; d < from + 400; d++) if (weekday(d) === 6 && { summer: 'sand', spring: 'kite', autumn: 'kite' }[seasonOf(d)] === kind) return d; };

test('Alter Spielstand: neue Felder kommen dazu, nichts geht verloren', () => {
  const o = old(), s = migrate(old());
  assert.deepEqual(s.tales, {});
  assert.equal(s.reef.found, 0);
  assert.deepEqual(s.reef.slots, {});
  assert.deepEqual(s.castles, {});
  assert.equal(s.money, o.money);
  for (const k of Object.keys(o.obj || {})) assert.ok(s.obj[k], 'Objekt ' + k + ' ist noch da');
  // kaputte Werte werden aufgeräumt statt abzustürzen
  const b = migrate({ ...old(), tales: { mira: { ch: 99, on: 1 }, nobody: { ch: 1 } }, reef: { slots: { 0: 'koralle', 3: 'schwert', 99: 'perle' } }, castles: { 'x,y': { lv: 1 }, '3,4': { lv: 2, sh: [] } } });
  assert.equal(b.tales.mira.ch, Y.TALES.mira.ch.length);
  assert.ok(!b.tales.nobody);
  assert.deepEqual(b.reef.slots, { 0: 'koralle' });
  assert.deepEqual(Object.keys(b.castles), ['3,4']);
  // zweimal laden ändert nichts mehr
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))).tales, s.tales);
});

test('Nachbar-Geschichten: Kapitel mit Herzen freischalten, am Ende ein besonderes Geschenk', () => {
  const s = migrate(newFarm('T'));
  const T = Y.TALES.bruno;
  assert.ok(!Y.taleState(s, 'bruno').ready, 'ohne Herzen noch keine Geschichte');
  assert.equal(act(s, { t: 'tale', id: 'bruno', op: 'start' }).ok, false);
  friendX(s, 'bruno').f = 900;
  assert.ok(hearts(s, 'bruno') >= 7);
  for (let ch = 0; ch < T.ch.length; ch++) {
    const C = T.ch[ch], st = Y.taleState(s, 'bruno');
    assert.ok(st.ready, 'Kapitel ' + (ch + 1) + ' bereit');
    assert.equal(Y.taleMark(s, 'bruno'), ' 📖');
    const r = act(s, { t: 'tale', id: 'bruno', op: 'start' });
    assert.ok(r.ok && r.taleSay === C.ask);
    if (C.kind === 'give') {
      delete s.inv[C.item];
      assert.equal(act(s, { t: 'tale', id: 'bruno', op: 'finish' }).ok, false, 'ohne Sachen geht es nicht');
      s.inv[C.item] = C.n;
      assert.equal(Y.taleMark(s, 'bruno'), ' ✨');
    } else {
      assert.equal(act(s, { t: 'tale', id: 'bruno', op: 'finish' }).ok, false);
      const out = { fx: [] };
      Y.taleEvent(s, C.ev, C.n, out);
      assert.equal(out.taleReady, 'Bruno');
    }
    const m = s.money, f = s.npc.bruno.f;
    const done = act(s, { t: 'tale', id: 'bruno', op: 'finish' });
    assert.ok(done.ok && done.taleSay === C.done);
    assert.ok(s.money > m && s.npc.bruno.f > f);
    if (C.kind === 'give') assert.equal(s.inv[C.item] || 0, 0);
  }
  assert.equal(s.inv[T.gift], 1, 'Geschenk ' + T.gift);
  assert.ok(Y.taleState(s, 'bruno').done);
  assert.equal(Y.taleMark(s, 'bruno'), '');
  assert.ok(s.book.some(b => b.k === 'tale:bruno'));
  assert.equal(act(s, { t: 'tale', id: 'bruno', op: 'start' }).ok, false, 'nur einmal');
});

test('Nachbar-Geschichten zählen echte Aktionen mit (Holz hacken)', () => {
  const s = migrate(newFarm('T'));
  friendX(s, 'bruno').f = 900;
  s.tales.bruno = { ch: 1, on: 0, p: 0, ok: 0 };
  act(s, { t: 'tale', id: 'bruno', op: 'start' });
  for (let i = 0; i < 10; i++) act(s, { t: 'chop', x: 0, z: 0 }); // ungültige Hiebe zählen nicht
  assert.equal(s.tales.bruno.p, 0);
  const out = { fx: [] };
  Y.taleEvent(s, 'chop', 4, out);
  assert.equal(s.tales.bruno.p, 4);
  assert.ok(!s.tales.bruno.ok);
});

test('Bauernhof-Ecke: nur gefütterte Tiere geben etwas, glückliche Tiere mehr', () => {
  const s = migrate(newFarm('T'));
  const [x, z] = freeSpot(s), k = key(x, z);
  s.obj[k] = { k: 'huehnerstall', r: 0, t: 0 };
  const P = PLACE.huehnerstall;
  tick(s, P.every + 5, true);
  assert.equal(s.obj[k].t, 0, 'hungrig wächst nichts');
  // füttern: nur mit passendem Futter
  s.inv.weizen = 0; s.inv.karotte = 3;
  assert.equal(act(s, { t: 'farm', op: 'feed', x, z, item: 'karotte' }).ok, false, 'Hühner fressen keine Karotten');
  s.inv.weizen = 2;
  const r = resolve(s, { x, z: z - 1, ry: 0 }, 'hand', { x, z });
  assert.equal(r.a?.op, 'feed');
  assert.ok(act(s, r.a).ok);
  assert.equal(s.inv.weizen, 1);
  assert.equal(act(s, { t: 'farm', op: 'feed', x, z, item: 'weizen' }).ok, false, 'einmal am Tag reicht');
  assert.ok(act(s, { t: 'farm', op: 'pet', x, z }).ok);
  assert.equal(act(s, { t: 'farm', op: 'pet', x, z }).ok, false);
  assert.equal(s.obj[k].h, 1);
  tick(s, P.every + 5, true);
  assert.equal(s.obj[k].t, P.every);
  const eggs = s.inv.ei || 0;
  assert.ok(act(s, { t: 'use', x, z }).ok);
  assert.equal(s.inv.ei, eggs + P.n);
  // glücklich (5+ Herzen): eins mehr
  s.obj[k].h = 6; s.obj[k].t = P.every;
  act(s, { t: 'use', x, z });
  assert.equal(s.inv.ei, eggs + P.n * 2 + 1);
  // gestern gefüttert reicht noch, vorgestern nicht
  s.obj[k].fed = s.day - 1; s.obj[k].t = 0;
  tick(s, 10, true);
  assert.ok(s.obj[k].t > 0);
  s.obj[k].fed = s.day - 2; s.obj[k].t = 0;
  tick(s, 10, true);
  assert.equal(s.obj[k].t, 0);
  // Kuhweide gibt Milch
  const [x2, z2] = freeSpot(s);
  s.obj[key(x2, z2)] = { k: 'kuhweide', r: 0, t: PLACE.kuhweide.every, fed: s.day };
  const milk = s.inv.milch || 0;
  act(s, { t: 'use', x: x2, z: z2 });
  assert.equal(s.inv.milch, milk + 1);
  // im Laden: Hof-Tab statt Bäume
  assert.ok(PLACE.huehnerstall.buy > 0 && PLACE.kuhweide.buy > 0);
});

test('Korallenriff: entdecken, absuchen, gestalten – fünf Sterne bringen Post', () => {
  const s = migrate(newFarm('T'));
  const swim = { x: Y.REEF_BUOY[0], z: Y.REEF_BUOY[1], ry: 0, sw: true };
  const r = resolve(s, swim, 'hand');
  assert.ok(r.dive && r.reef, 'an der Boje kann man zum Riff tauchen');
  assert.ok(act(s, { t: 'reef', op: 'found' }).ok);
  assert.equal(act(s, { t: 'reef', op: 'found' }).ok, false);
  assert.ok(s.book.some(b => b.k === 'reef'));
  // unten: Rand ist blockiert, Mitte frei, Ausgang am Seil
  assert.ok(!blocked(s, Y.REEF.x, Y.REEF.z));
  assert.ok(blocked(s, Y.REEF.x + Y.REEF.r + 1, Y.REEF.z));
  const exit = resolve(s, { x: Y.REEF.x, z: Y.REEF.z + Y.REEF.r - 1.5, ry: 0 }, 'hand');
  assert.equal(exit.go, 'reefup');
  // Fundstelle: einmal pro Tag
  const [sx, sz] = Y.REEF_SPOTS[0];
  const f = resolve(s, { x: Y.REEF.x + sx, z: Y.REEF.z + sz - 0.9, ry: 0 }, 'hand');
  assert.deepEqual(f.a, { t: 'reef', op: 'find', i: 0 });
  const n0 = Object.values(s.inv).reduce((a, b) => a + b, 0);
  const got = act(s, f.a);
  assert.ok(got.ok && ITEMS[got.got]);
  assert.equal(Object.values(s.inv).reduce((a, b) => a + b, 0), n0 + 1);
  assert.equal(act(s, f.a).ok, false, 'heute schon abgesucht');
  // gestalten
  s.inv.koralle = 1;
  assert.equal(act(s, { t: 'reef', op: 'set', i: 0, item: 'schwert' }).ok, false);
  assert.ok(act(s, { t: 'reef', op: 'set', i: 0, item: 'koralle' }).ok);
  assert.equal(s.inv.koralle || 0, 0);
  assert.ok(blocked(s, Y.REEF.x + Y.REEF_SLOTS[0][0], Y.REEF.z + Y.REEF_SLOTS[0][1]), 'Deko steht im Weg');
  assert.ok(act(s, { t: 'reef', op: 'set', i: 0, item: null }).ok);
  assert.equal(s.inv.koralle, 1, 'zurück in die Tasche');
  // alle Plätze bunt füllen = 5 Sterne
  const mails = s.mail.length;
  Y.REEF_SLOTS.forEach((_, i) => { const id = Y.REEF_DECO[i % Y.REEF_DECO.length]; s.inv[id] = (s.inv[id] || 0) + 1; assert.ok(act(s, { t: 'reef', op: 'set', i, item: id }).ok); });
  assert.equal(Y.reefScore(s).stars, 5);
  assert.equal(s.mail.length, mails + 1);
  assert.equal(s.mail.at(-1).item, 'korallenlampe');
  // am nächsten Tag kann man wieder suchen, die Deko bleibt
  nextDay(s);
  assert.ok(act(s, f.a).ok);
  assert.equal(Object.keys(s.reef.slots).length, Y.REEF_SLOTS.length);
});

test('Sandburgen-Wettbewerb: bauen, schmücken, Jury, Pokal – die Flut holt die Burgen', () => {
  const s = migrate(newFarm('T'));
  s.day = dayWith('sand', 2) - 1;
  nextDay(s);
  assert.equal(Y.beachKind(s), 'sand');
  assert.equal(s.beach.kind, 'sand');
  assert.equal(s.beach.judges.length, 3);
  s.dayTime = (12 - 6) / 18; // 12 Uhr
  assert.ok(Y.beachOpen(s));
  const [x, z] = sandSpot(s);
  const r = resolve(s, { x, z: z - 1, ry: 0 }, 'shovel', { x, z });
  assert.equal(r.a?.op, 'build');
  assert.ok(act(s, { ...r.a, name: 'Lena' }).ok);
  const c = s.castles[key(x, z)];
  assert.equal(c.name, 'Lena');
  for (let i = 0; i < 6; i++) act(s, { t: 'castle', op: 'grow', x, z });
  assert.equal(c.lv, Y.CASTLE_MAX);
  s.inv.herzmuschel = 2; s.inv.kauri = 1;
  assert.ok(act(s, { t: 'castle', op: 'shell', x, z, item: 'herzmuschel' }).ok);
  assert.ok(act(s, { t: 'castle', op: 'shell', x, z, item: 'kauri' }).ok);
  assert.equal(act(s, { t: 'castle', op: 'shell', x, z, item: 'perle' }).ok, false);
  assert.ok(Y.castleScore(c) > Y.CASTLE_MAX * 12);
  // ab 17 Uhr entscheidet die Jury
  const money = s.money, mails = s.mail.length;
  s.dayTime = (17.2 - 6) / 18;
  tick(s, 0.01, true);
  assert.ok(s.beach.done);
  assert.equal(s.beach.winner, 'Lena');
  assert.equal(s.money, money + 3000);
  assert.equal(s.mail.length, mails + 1);
  assert.equal(s.mail.at(-1).item, 'strandpokal');
  assert.ok(!Y.beachOpen(s));
  // über Nacht: Burgen weg
  nextDay(s);
  assert.deepEqual(s.castles, {});
});

test('Sandburg einebnen gibt die Muscheln zurück', () => {
  const s = migrate(newFarm('T'));
  const [x, z] = sandSpot(s);
  act(s, { t: 'castle', op: 'build', x, z, name: 'Tom' });
  s.inv.sanddollar = 1;
  act(s, { t: 'castle', op: 'shell', x, z, item: 'sanddollar' });
  assert.equal(s.inv.sanddollar || 0, 0);
  assert.ok(act(s, { t: 'castle', op: 'flat', x, z }).ok);
  assert.equal(s.inv.sanddollar, 1);
  assert.ok(!s.castles[key(x, z)]);
  // nicht auf Rasen
  const [gx, gz] = freeSpot(s);
  if (!sandX(gx, gz)) assert.equal(act(s, { t: 'castle', op: 'build', x: gx, z: gz }).ok, false);
});

test('Drachenfest: höchster Flug gewinnt den Pokal', () => {
  const s = migrate(newFarm('T'));
  assert.equal(act(s, { t: 'kitescore', score: 50 }).ok, false, 'ohne Drachen kein Flug');
  s.inv.drache = 1;
  assert.equal(act(s, { t: 'kitescore', score: 500 }).ok, false, 'Schummeln geht nicht');
  s.day = dayWith('kite', 2) - 1;
  nextDay(s);
  assert.equal(s.beach.kind, 'kite');
  s.dayTime = (11 - 6) / 18;
  assert.ok(act(s, { t: 'kitescore', score: 64, name: 'Mia' }).ok);
  assert.ok(act(s, { t: 'kitescore', score: 40, name: 'Mia' }).ok);
  assert.equal(s.beach.entries.host.score, 64, 'der beste Flug zählt');
  s.dayTime = (17.5 - 6) / 18;
  tick(s, 0.01, true);
  assert.equal(s.beach.winner, 'Mia');
  assert.equal(s.mail.at(-1).item, 'windpokal');
  assert.equal(s.stats.kiteBest, 64);
});

test('Seilbahn: Haltestellen liegen frei in den Gebieten, Station führt dorthin', () => {
  const s = migrate(newFarm('T'));
  for (const id of Object.keys(AREAS)) {
    const [x, z] = Y.cableStop(id), A = AREAS[id];
    const lx = x - A.x, lz = z - A.z;
    assert.ok(inArea(id, lx, lz) && !nodeAt(id, lx, lz), id + ': Haltestelle auf freiem Boden');
    assert.ok(!blocked(s, x + 1.1, z), id + ': Ankunft frei');
  }
  assert.equal(Y.cableBuilt(s), null);
  const [x, z] = freeSpot(s);
  s.obj[key(x, z)] = { k: 'seilbahn', r: 0 };
  assert.equal(Y.cableBuilt(s)[0], key(x, z));
  const r = resolve(s, { x, z: z + 1.2, ry: Math.PI }, 'hand', { x, z });
  assert.equal(r.ui, 'cable');
  s.areas = { wald: 1 };
  const [cx, cz] = Y.cableStop('wald');
  assert.ok(blocked(s, cx, cz), 'Haltestelle ist ein Hindernis');
  assert.equal(resolve(s, { x: cx + 1.1, z: cz, ry: -Math.PI / 2 }, 'hand').ui, 'cable');
  // Fahrrad gibt es im Laden
  assert.ok(ITEMS.fahrrad.buy > 0 && ITEMS.drache.buy > 0);
  s.money = 99999; s.level = 5;
  assert.ok(act(s, { t: 'buy', id: 'fahrrad', n: 1 }).ok);
  assert.equal(s.inv.fahrrad, 1);
});
