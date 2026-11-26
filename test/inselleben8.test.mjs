// Inselleben 8: Klippenbank, Hochzeit, Duell der Woche, Traumwelt, Surfen – Logik beim Gastgeber
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const E = await import('../src/extras8.js');
const { zoneOf, clampPos } = await import('../src/newleaf.js');
const { FURNITURE } = await import('../src/furni-data.js');

const farm = () => { const s = S.migrate(S.newFarm()); s.owner = 'hostuid01'; return s; };
const G1 = 'u_gastuid01';

test('alte Spielstände: Migration ist sanft und wiederholbar, nichts wird überschrieben', () => {
  const s = farm();
  s.money = 12345; s.inv.holz = 7;
  const before = JSON.stringify({ money: s.money, inv: s.inv, obj: s.obj, home: s.home });
  const t = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(JSON.stringify({ money: t.money, inv: t.inv, obj: t.obj, home: t.home }), before);
  assert.equal(t.mail.filter(m => m.item === 'klippenbank').length, 1, 'Bank kommt genau einmal per Post');
  assert.equal(FURNITURE.sternmobile.set, 'kinder', 'bestehendes Möbel bleibt unverändert');
  for (const id of E.DREAM_SHOP.map(([id]) => id)) assert.ok(FURNITURE[id]?.rare === 'dream', id);
});

test('Duell der Woche: zählt pro Person, Sieger bekommt am Wochenende den Pokal', () => {
  const s = farm(), [c] = E.catOf(s.duel.wk);
  const doIt = (who, n) => { const d0 = E.duelStat(s); s.stats[c] = (s.stats[c] || 0) + n; E.duelCount(s, who, d0, {}); };
  E.duelName(s, 'host', 'Ola'); E.duelName(s, G1, 'Jan');
  doIt('host', 4); doIt(G1, 2); doIt(G1, 99); // unrealistisch viel auf einmal zählt nicht
  assert.deepEqual(s.duel.sc, { hostuid01: 4, gastuid01: 2 });
  const money = s.money;
  s.day += 7; E.duelMorning(s);
  assert.equal(s.pinv.host.duellpokal, 1);
  assert.equal(s.money, money + E.DUEL_PRIZE);
  assert.deepEqual(s.duel.sc, {});
  assert.equal(s.duel.wins.hostuid01, 1);
});

test('Hochzeit: Kapelle nötig, beide sagen Ja → verheiratet, Ringe, Hochzeitstag', () => {
  const s = farm();
  assert.equal(S.act(s, { t: 'wed', op: 'start', x: 3, z: 4 }, 'host').ok, false, 'ohne Kapelle');
  s.obj['3,4'] = { k: 'kapelle', r: 0 }; s.time = 50;
  assert.ok(S.act(s, { t: 'wed', op: 'start', x: 3, z: 4, name: 'Ola' }, 'host').ok);
  assert.equal(S.act(s, { t: 'wed', op: 'yes', name: 'Ola' }, 'host').ok, false, 'erst nach der Frage');
  s.time = 50 + E.WED.ask;
  assert.ok(S.act(s, { t: 'wed', op: 'yes', name: 'Ola' }, 'host').ok);
  assert.equal(S.act(s, { t: 'wed', op: 'yes', name: 'Ola' }, 'host').ok, false, 'nicht zweimal');
  const out = S.act(s, { t: 'wed', op: 'yes', name: 'Jan' }, G1);
  assert.ok(out.ok && out.moment);
  assert.deepEqual(s.married.names, ['Ola', 'Jan']);
  assert.equal(s.pinv.host.ehering, 1); assert.equal(s.pinv[G1].ehering, 1);
  assert.ok(s.anniv.dates.some(d => d.name.startsWith('Hochzeitstag') && d.y));
  assert.ok(s.wardrobe.veil);
  s.time += E.WED.party + 1; E.tick8(s);
  assert.equal(s.wedding, null);
});

test('Traumwelt: Sterne einmal pro Nacht, Luna tauscht, Ort und Wege', () => {
  const s = farm();
  s.dayTime = 0.1;
  assert.equal(S.act(s, { t: 'dream', op: 'enter' }, 'host').ok, false, 'tagsüber nicht');
  s.dayTime = 0.8;
  assert.ok(S.act(s, { t: 'dream', op: 'enter' }, 'host').ok);
  for (let i = 0; i < E.STAR_N; i++) assert.ok(S.act(s, { t: 'dream', op: 'star', i }, 'host').ok);
  assert.equal(S.act(s, { t: 'dream', op: 'star', i: 0 }, 'host').ok, false);
  assert.equal(s.pinv.host.traumstern, E.STAR_N);
  assert.ok(S.act(s, { t: 'dream', op: 'buy', id: 'traumfaenger' }, 'host').ok);
  assert.equal(s.pinv.host.traumfaenger, 1);
  assert.equal(zoneOf({ x: 0, z: 5000 }), 'dream');
  assert.equal(zoneOf({ x: 0, z: 3700 }), 'deepsea');
  assert.deepEqual(clampPos(99, 5099, 30), [30, 5030]);
  const [sx, sz] = E.DREAM_START;
  assert.equal(S.blocked(s, E.DREAM.x + sx, E.DREAM.z + sz), false, 'Startpunkt begehbar');
  for (const [x1, z1, x2, z2] of E.DREAM_BRIDGES) assert.equal(S.blocked(s, E.DREAM.x + (x1 + x2) / 2, E.DREAM.z + (z1 + z2) / 2), false, 'Brücke begehbar');
  assert.equal(S.blocked(s, E.DREAM.x + 12, E.DREAM.z + 12), true, 'daneben ist Himmel');
  for (const [x, z] of E.dreamStars(s.day)) assert.equal(S.blocked(s, E.DREAM.x + x, E.DREAM.z + z), false, 'Stern erreichbar');
});

test('Surfen: Punkte geprüft, Rekord, Taler nur ein paar Mal am Tag', () => {
  const s = farm();
  assert.equal(S.act(s, { t: 'surf', op: 'score', pts: -5 }, 'host').ok, false);
  assert.equal(S.act(s, { t: 'surf', op: 'score', pts: 1e9 }, 'host').ok, false);
  const m0 = s.money;
  for (let i = 0; i < E.SURF_PAY + 2; i++) S.act(s, { t: 'surf', op: 'score', pts: 800, name: 'Ola' }, 'host');
  assert.equal(s.money - m0, E.SURF_PAY * 200);
  S.act(s, { t: 'surf', op: 'score', pts: 3000, name: 'Jan' }, G1);
  assert.equal(s.surf.rec.name, 'Jan');
  assert.equal(s.surf.best.gastuid01, 3000);
});

test('Klippenbank: Sonnenuntergang zu zweit zählt einmal am Tag, nur abends', () => {
  const s = farm();
  s.dayTime = 0.2;
  assert.equal(S.act(s, { t: 'bench8', op: 'sunset', names: ['Ola', 'Jan'] }, 'host').ok, false);
  s.dayTime = (18.5 - 6) / 18; s.weather = 'sun';
  assert.equal(S.act(s, { t: 'bench8', op: 'sunset', names: ['Ola'] }, 'host').ok, false, 'allein zählt nicht');
  assert.ok(S.act(s, { t: 'bench8', op: 'sunset', names: ['Ola', 'Jan'] }, 'host').ok);
  assert.equal(S.act(s, { t: 'bench8', op: 'sunset', names: ['Ola', 'Jan'] }, 'host').ok, false);
  const [a, b] = E.seats(5, 5, 1);
  assert.equal(Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2), (E.BENCH_SEAT * 2).toFixed(2));
  s.obj['5,5'] = { k: 'klippenbank', r: 1 };
  const r = E.resolveObj8(s, s.obj['5,5'], '5,5', 5, 5, { x: 5, z: 4.5 });
  assert.ok(r.sit && r.sit.z < 5, 'nimmt den näheren Platz');
});
