// Inselleben 9: lebendige Gebiete – Fundstücke nur dort, Bewohner-Tausch, Ereignisse
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const E = await import('../src/extras9.js');
const { AREAS, NODES } = await import('../src/areas.js');
const { ITEMS } = await import('../src/data.js');

const farm = () => { const s = S.migrate(S.newFarm()); s.areas = { wald: 1, wiese: 1, hoehle: 1 }; return s; };
const front = (id, x, z) => ({ x: AREAS[id].x + x, z: AREAS[id].z + z - 0.9, ry: 0 }); // steht südlich und schaut nach Norden

test('Fundstücke: jeden Tag neu, nie auf Bäumen/Erz/Bewohnern, begehbar, einmal aufheben', () => {
  for (const id of Object.keys(AREAS)) for (let day = 1; day <= 30; day++) {
    const f = E.findsToday(id, day);
    assert.ok(f.length >= 4, `${id} Tag ${day}`);
    assert.equal(new Set(f.map(q => q.x + ',' + q.z)).size, f.length, 'kein Platz doppelt');
    for (const q of f) {
      assert.ok(ITEMS[q.id], q.id);
      assert.ok(!NODES[id].some(n => n.x === q.x && n.z === q.z), `${id}: Fundstück auf einem Knoten`);
      assert.equal(S.blocked(farm(), AREAS[id].x + q.x, AREAS[id].z + q.z), false, `${id} ${q.x},${q.z} erreichbar`);
    }
  }
  const s = farm(); s.day = 3; s.dayTime = 0.25;
  const f = E.findsToday('wiese', 3).find(q => q.id === 'pusteblume');
  const r = S.resolve(s, front('wiese', f.x, f.z), 'hand', null);
  assert.equal(r.a?.op, 'find');
  assert.ok(S.act(s, r.a, 'host').ok);
  assert.equal(s.pinv.host.pusteblume, 1);
  assert.equal(S.act(s, r.a, 'host').ok, false, 'nicht zweimal');
});

test('Tageszeit: Morgentau nur morgens, Eulenfedern nur abends; Geoden nur mit Schaufel', () => {
  const s = farm();
  for (let day = 1; day < 60; day++) {
    s.day = day;
    const tau = E.findsToday('wiese', day).find(q => q.id === 'morgentau'), fed = E.findsToday('wald', day).find(q => q.id === 'eulenfeder');
    s.dayTime = (7 - 6) / 18; assert.equal(E.findVisible(s, 'wiese', tau), true); assert.equal(E.findVisible(s, 'wald', fed), false);
    s.dayTime = (20 - 6) / 18; assert.equal(E.findVisible(s, 'wiese', tau), false); assert.equal(E.findVisible(s, 'wald', fed), true);
  }
  s.day = 5; s.dayTime = 0.3;
  const g = E.findsToday('hoehle', 5).find(q => q.id === 'geode');
  assert.equal(S.resolve(s, front('hoehle', g.x, g.z), 'hand', null).a, undefined);
  assert.equal(S.resolve(s, front('hoehle', g.x, g.z), 'shovel', null).a?.op, 'find');
});

test('Bewohner: stehen im Weg, tauschen nur mit genug Material, Geoden knacken', () => {
  const s = farm();
  for (const [id, C] of Object.entries(E.CREATURES)) {
    assert.equal(S.blocked(s, AREAS[id].x + C.at[0], AREAS[id].z + C.at[1]), true);
    assert.equal(S.resolve(s, { x: AREAS[id].x + C.at[0], z: AREAS[id].z + C.at[1] + 1, ry: Math.PI }, 'hand', null).ui, C.panel);
    for (const [out, need] of E.TRADES[id]) {
      assert.ok(ITEMS[out], out);
      for (const k of Object.keys(need)) assert.ok(ITEMS[k], k);
    }
  }
  assert.equal(S.act(s, { t: 'area9', op: 'trade', area: 'wiese', id: 'pusteblumenlampe' }, 'host').ok, false);
  s.inv.pusteblume = 5;
  assert.ok(S.act(s, { t: 'area9', op: 'trade', area: 'wiese', id: 'pusteblumenlampe' }, 'host').ok);
  assert.equal(s.inv.pusteblume, undefined);
  assert.equal(s.inv.pusteblumenlampe, 1);
  assert.equal(S.act(s, { t: 'area9', op: 'trade', area: 'wiese', id: 'eulenuhr' }, 'host').ok, false, 'Eulenuhr gibt es nur bei Oskar');
  s.inv.geode = 1;
  const out = S.act(s, { t: 'area9', op: 'crack' }, 'host');
  assert.ok(out.ok && ITEMS[out.got]);
  assert.equal(s.inv.geode, undefined);
});

test('Ereignisse: Hirsch, Pilzkreis, Schmetterlingstanz, Kristallklang – je Person einmal am Tag', () => {
  const s = farm();
  let d = 1; while (!(E.stagToday(s, d) && E.ringToday(s, d) && E.swarmToday(s, d))) d++;
  s.day = d; s.weather = 'sun';
  s.dayTime = (7 - 6) / 18;
  assert.ok(S.act(s, { t: 'area9', op: 'stag' }, 'host').ok);
  assert.equal(S.act(s, { t: 'area9', op: 'stag' }, 'host').ok, false);
  assert.ok(S.act(s, { t: 'area9', op: 'stag' }, 'u_gast12345').ok, 'der Gast auch');
  assert.equal(S.act(s, { t: 'area9', op: 'ring' }, 'host').ok, false, 'Pilzkreis erst abends');
  s.dayTime = (12 - 6) / 18;
  for (let i = 0; i < E.SWARM_MAX; i++) assert.ok(S.act(s, { t: 'area9', op: 'swarm' }, 'host').ok);
  assert.equal(S.act(s, { t: 'area9', op: 'swarm' }, 'host').ok, false);
  s.weather = 'rain'; assert.equal(S.act(s, { t: 'area9', op: 'swarm' }, 'u_gast12345').ok, false, 'bei Regen keine Schmetterlinge');
  s.dayTime = (21 - 6) / 18;
  assert.ok(S.act(s, { t: 'area9', op: 'ring' }, 'host').ok);
  assert.equal(S.act(s, { t: 'area9', op: 'chime', seq: [9, 9, 9, 9] }, 'host').ok, false, 'falsche Töne');
  assert.ok(S.act(s, { t: 'area9', op: 'chime', seq: E.chimeSeq(s.day) }, 'host').ok);
  assert.equal(s.pinv.host.kristallblume, 1);
  assert.ok(s.book.some(p => p.k === 'stag') && s.book.some(p => p.k === 'chime'));
  // Kristalle und Klangstein stehen im Weg
  for (const [x, z] of [...E.CHIME_CRYSTALS, E.CHIME_STONE]) assert.equal(S.blocked(s, AREAS.hoehle.x + x, AREAS.hoehle.z + z), true);
  // nächster Tag: alles wieder offen
  s.day++; s.dayTime = (21 - 6) / 18;
  assert.ok(S.act(s, { t: 'area9', op: 'chime', seq: E.chimeSeq(s.day) }, 'host').ok);
});

test('ohne freigeschaltetes Gebiet gibt es dort nichts', () => {
  const s = S.migrate(S.newFarm());
  s.areas = {};
  assert.equal(S.act(s, { t: 'area9', op: 'find', area: 'wald', i: 0 }, 'host').ok, false);
  assert.equal(S.act(s, { t: 'area9', op: 'chime', seq: E.chimeSeq(s.day) }, 'host').ok, false);
  assert.equal(E.stagToday(s), false);
});

test('Fundstücke liegen nie an der Seilbahn-Haltestelle', async () => {
  const { cableStop } = await import('../src/features/cable.js');
  for (const id of Object.keys(AREAS)) {
    const [cx, cz] = cableStop(id);
    for (const [x, z] of E.SPOTS9[id]) assert.ok(Math.hypot(AREAS[id].x + x - cx, AREAS[id].z + z - cz) >= 1.5, `${id} ${x},${z}`);
  }
});

test('Nachbarn besuchen die Gebiete zu festen Zeiten, nur wenn freigeschaltet', () => {
  const s = farm();
  for (const v of E.VISITS) {
    assert.ok(!NODES[v.area].some(n => n.x === v.at[0] && n.z === v.at[1]), v.npc);
    let seen = 0;
    for (let day = 1; day <= 9; day++) { s.day = day; s.dayTime = ((v.from + v.to) / 2 - 6) / 18; if (E.visitNow(s, v)) seen++; s.dayTime = (v.to + 0.5 - 6) / 18; assert.equal(E.visitNow(s, v), false); }
    assert.equal(seen, 6, `${v.npc}: an zwei von drei Tagen`);
  }
  s.areas = {}; s.dayTime = (10.5 - 6) / 18;
  assert.equal(E.VISITS.some(v => E.visitNow(s, v)), false);
});
