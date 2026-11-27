// Alle Bäume und Dinge an den Ausflugsorten: Kann man sie erreichen, und passiert beim Drücken etwas?
// Für jedes Ding wird ein freier Platz rundherum gesucht (mit Blick darauf) und geprüft, was die Aktion ergibt.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const E9 = await import('../src/extras9.js');
const DT = await import('../src/decotrees.js');
const { AREAS, NODES, nodeToday } = await import('../src/areas.js');
const { TRIP, tripLayout } = await import('../src/trips.js');
const { TROPIC, TROPIC_TREES, zoneOf } = await import('../src/newleaf.js');
const { CLUMPS, BAMBUS } = await import('../src/features/bamboo.js');
const { REEDS, MOOR } = await import('../src/features/moor.js');

const farm = () => {
  const s = S.migrate(S.newFarm());
  s.areas = { wald: { open: 1 }, wiese: { open: 1 }, hoehle: { open: 1 } };
  s.moor.open = true; s.bambus.open = true; s.dayTime = 0.3; s.weather = 'sun'; s.level = 10;
  return s;
};
// Platz rundherum suchen, von dem aus die Aktion klappt (ok(r) = true)
function approach(s, x, z, sel, ok) {
  const zone = zoneOf({ x, z });
  for (const d of [0.9, 1.1, 1.3, 1.6, 1.9, 2.2, 2.6]) for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, me = { x: x - Math.sin(a) * d, z: z - Math.cos(a) * d, ry: a };
    if (zoneOf(me) !== zone || S.blocked(s, me.x, me.z)) continue;
    const r = S.resolve(s, me, sel, null);
    if (ok(r)) return r;
  }
  return null;
}
const missing = (list, f) => list.filter(x => !f(x));

test('Gebiete: jeder Baum, jedes Erz, jeder Strauch, jeder Pilz und Bienenstock ist erreichbar und reagiert', () => {
  const s = farm();
  for (const [id, A] of Object.entries(AREAS)) {
    const bad = [];
    for (const n of NODES[id]) {
      const x = A.x + n.x, z = A.z + n.z;
      let day = s.day; while (!nodeToday(id, n, day) && day < s.day + 60) day++; // einen Tag suchen, an dem dort etwas wächst
      s.day = day;
      const want = n.kind === 'pine' ? [['hand', 'shake'], ['axe', 'chop']] : n.kind === 'ore' ? [['shovel', 'mine']] : [['hand', 'pick']];
      for (const [sel, how] of want) if (!approach(s, x, z, sel, r => r?.a?.t === 'aact' && r.a.i === n.i && r.a.how === how)) bad.push(`${n.kind}#${n.i}@${n.x},${n.z} (${sel})`);
    }
    assert.deepEqual(bad, [], `${A.name}: ohne Aktion`);
  }
});

test('Gebiete: alle nahen Randbäume lassen sich schütteln und hacken – je einmal am Tag', () => {
  const s = farm();
  for (const id of ['wald', 'wiese']) {
    const trees = DT.decoTrees(id, s);
    assert.ok(trees.length >= 10, `${id}: ${trees.length} Randbäume`);
    const bad = missing(trees, t => approach(s, t.x, t.z, 'hand', r => r?.a?.t === 'dtree' && r.a.how === 'shake') && approach(s, t.x, t.z, 'axe', r => r?.a?.t === 'dtree' && r.a.how === 'chop'));
    assert.deepEqual(bad.map(t => `${Math.round(t.x - AREAS[id].x)},${Math.round(t.z - AREAS[id].z)}`), [], `${id}: Randbäume ohne Aktion`);
  }
  const t = DT.decoTrees('wald', s)[0], r = approach(s, t.x, t.z, 'hand', r => r?.a?.t === 'dtree');
  assert.ok(S.act(s, r.a, 'host').ok);
  assert.equal(S.act(s, r.a, 'host').ok, false, 'heute schon geschüttelt');
  assert.match(approach(s, t.x, t.z, 'hand', r => !!r?.label && !r.a)?.label || '', /schon geschüttelt/);
  const r2 = approach(s, t.x, t.z, 'axe', r => r?.a?.how === 'chop');
  const h0 = s.inv.holz || 0;
  assert.ok(S.act(s, r2.a, 'host').ok);
  assert.equal(s.inv.holz, h0 + 1);
  s.day++;
  assert.ok(S.act(s, r.a, 'host').ok, 'am nächsten Tag wieder');
  s.areas = {}; s.day++;
  assert.equal(S.act(s, r.a, 'host').ok, false, 'nur in freigeschalteten Gebieten');
});

test('Gebiete: Bewohner, Kristalle, Klangstein und Fundstücke reagieren', () => {
  const s = farm();
  for (const [id, C] of Object.entries(E9.CREATURES)) assert.ok(approach(s, AREAS[id].x + C.at[0], AREAS[id].z + C.at[1], 'hand', r => r?.ui === C.panel), C.name);
  const H = AREAS.hoehle;
  assert.ok(approach(s, H.x + E9.CHIME_STONE[0], H.z + E9.CHIME_STONE[1], 'hand', r => r?.chime9 === 'start'), 'Klangstein');
  E9.CHIME_CRYSTALS.forEach(([x, z], k) => assert.ok(approach(s, H.x + x, H.z + z, 'hand', r => r?.chime9 === k), 'Kristall ' + k));
  for (let day = 1; day <= 10; day++) {
    s.day = day;
    for (const id of Object.keys(AREAS)) for (const f of E9.findsToday(id, day)) {
      s.dayTime = f.when.from ? (f.when.from + 0.5 - 6) / 18 : f.when.to ? 0.05 : 0.3;
      const sel = f.tool === 'shovel' ? 'shovel' : 'hand';
      assert.ok(approach(s, AREAS[id].x + f.x, AREAS[id].z + f.z, sel, r => r?.a?.op === 'find' && r.a.i === f.i), `${id} Tag ${day}: ${f.id}`);
    }
  }
});

test('Seerosenmoor, Bambushain, Tropeninsel, Bummelgasse: Bäume, Schilf und Bambus reagieren', () => {
  const s = farm();
  assert.deepEqual(missing(DT.decoTrees('moor', s), t => approach(s, t.x, t.z, 'hand', r => r?.a?.t === 'dtree') && approach(s, t.x, t.z, 'axe', r => r?.a?.how === 'chop')).map(t => [t.x, t.z]), [], 'Birken im Moor');
  assert.deepEqual(missing(REEDS, ([x, z]) => approach(s, MOOR.x + x, MOOR.z + z, 'axe', r => !!r?.a)), [], 'Schilf');
  assert.deepEqual(missing(CLUMPS, ([x, z]) => approach(s, BAMBUS.x + x, BAMBUS.z + z, 'axe', r => !!r?.a)), [], 'Bambus');
  assert.deepEqual(missing(TROPIC_TREES, ([x, z]) => approach(s, TROPIC.x + x, TROPIC.z + z, 'hand', r => r?.a?.t === 'tpick')), [], 'Tropen-Obstbäume');
  const palms = DT.decoTrees('tropic', s);
  assert.deepEqual(missing(palms, t => approach(s, t.x, t.z, 'hand', r => r?.a?.t === 'dtree')), [], 'Kokospalmen');
  const r = approach(s, palms[0].x, palms[0].z, 'hand', r => r?.a?.t === 'dtree');
  S.act(s, r.a, 'host');
  assert.ok(s.pinv.host.kokosnuss >= 1, 'Kokosnuss');
  assert.deepEqual(missing(DT.decoTrees('street', s), t => approach(s, t.x, t.z, 'hand', r => !!r?.petals)), [], 'Kirschbäumchen in der Gasse');
});

test('Ausflugsinseln (alle Arten): jeder Baum, Bambus, Felsen, Busch und jede Palme reagiert', () => {
  const s = farm(), seen = new Set();
  for (let k = 1; seen.size < 6 && k < 500; k++) {
    const seed = (k * 2654435761) % 2147483646 + 1, L = tripLayout(seed);
    if (seen.has(L.kind)) continue;
    seen.add(L.kind);
    s.trip = { seed, day: s.day, used: {} };
    const tool = { bamboo: 'axe', ore: 'shovel', bugs: 'net' };
    const bad = missing(L.nodes, n => approach(s, TRIP.x + n.x, TRIP.z + n.z, tool[n.kind] || 'hand', r => r?.a?.t === 'tact' && r.a.i === n.i)).map(n => `${n.kind}@${n.x},${n.z}`);
    assert.deepEqual(bad, [], `${L.kind}: Knoten ohne Aktion`);
    const pb = missing(DT.decoTrees('trip', s), t => approach(s, t.x, t.z, 'hand', r => r?.a?.t === 'dtree')).map(t => `${(t.x - TRIP.x).toFixed(1)},${(t.z - TRIP.z).toFixed(1)}`);
    assert.deepEqual(pb, [], `${L.kind}: Palmen ohne Aktion`);
  }
  assert.equal(seen.size, 6);
});

test('Sitzplätze: Baumstämme im Wald und die Schaukel auf der Wiese', () => {
  const s = farm();
  for (const [x, z] of E9.LOGS9) assert.ok(approach(s, AREAS.wald.x + x, AREAS.wald.z + z, 'hand', r => !!r?.sit), `Stamm ${x},${z}`);
  assert.ok(approach(s, AREAS.wiese.x + E9.SWING9[0], AREAS.wiese.z + E9.SWING9[1], 'hand', r => !!r?.sit && /Schaukel/.test(r.label)), 'Schaukel');
});
