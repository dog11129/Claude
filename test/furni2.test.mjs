// 120 weitere Möbel: Daten, Modelle (passen auf ihre Grundfläche), Laden, Serien-Bonus, alte Spielstände
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import { FURN2, FURN_SETS, SET_MIN, SET_BONUS, setsIn } from '../src/furni-data2.js';
import { FURNITURE } from '../src/furni-data.js';
import { FURN_2 } from '../src/models-furn2.js';
import { merge } from '../src/models.js';
import { ITEMS } from '../src/data.js';
import { newFarm, migrate, act } from '../src/state.js';
import { homeScore } from '../src/newleaf.js';

test('120 neue Möbel, zwölf Serien, nichts Altes überschrieben', () => {
  const ids = Object.keys(FURN2);
  assert.ok(ids.length >= 100, `${ids.length} Möbel`);
  assert.equal(Object.keys(FURN_SETS).length, 14);
  assert.ok(ids.filter(id => FURN2[id].set === 'pfingstrose').length >= 12, 'Pfingstrosen-Serie');
  for (const [k, n] of Object.entries(FURN_SETS)) assert.ok(ids.filter(id => FURN2[id].set === k).length >= SET_MIN, `${n[1]} hat genug Stücke`);
  const snap = JSON.parse(readFileSync(new URL('./fixtures/catalog-snapshot.json', import.meta.url), 'utf8'));
  const old = snap.F;
  assert.ok(old && Object.keys(old).length > 50, 'Schnappschuss der alten Möbel');
  for (const id of ids) {
    assert.ok(!(id in old), `${id} gab es schon`);
    assert.equal(FURNITURE[id], FURN2[id], id);
    assert.equal(ITEMS[id]?.furn, id, `${id} ist ein Möbel-Gegenstand`);
    assert.ok(ITEMS[id].buy > 0 && FURN2[id].name && FURN2[id].icon, id);
    assert.ok(['sitzen', 'tische', 'betten', 'licht', 'deko', 'pflanzen', 'teppiche', 'kueche', 'bad', 'wand'].includes(FURN2[id].cat), id);
  }
});

test('Jedes neue Möbel hat ein Modell, das auf seine Grundfläche passt', () => {
  for (const [id, f] of Object.entries(FURN2)) {
    assert.ok(FURN_2[id], `Modell für ${id}`);
    const r = FURN_2[id](), [p, gl] = Array.isArray(r[0]) ? r : [r, []];
    assert.ok(p.length + gl.length > 2, `${id}: Teile`);
    for (const q of [...p, ...gl]) assert.ok(q && q.g?.attributes?.position, `${id}: Teil ohne Form`);
    const g = merge([...p, ...gl]);
    g.computeBoundingBox();
    const b = g.boundingBox, w = f.w / 2 + 0.12, d = f.d / 2 + 0.12;
    assert.ok(b.min.x > -w && b.max.x < w, `${id}: Breite ${b.min.x.toFixed(2)}…${b.max.x.toFixed(2)}`);
    assert.ok(b.min.z > -d && b.max.z < d, `${id}: Tiefe ${b.min.z.toFixed(2)}…${b.max.z.toFixed(2)}`);
    assert.ok(b.min.y > -0.06 && b.max.y < 2.35, `${id}: Höhe ${b.min.y.toFixed(2)}…${b.max.y.toFixed(2)}`);
    if (f.rug) assert.ok(b.max.y < 0.12, `${id}: Teppich liegt flach`);
    if (f.wall) assert.ok(b.max.z < 0.0 && b.min.y > 0.6, `${id}: hängt an der Wand`);
    assert.ok(b.max.y > 0.01, id);
    g.dispose();
  }
  assert.ok(new THREE.Vector3(), 'three geladen');
});

test('Kaufen, aufstellen, Serien-Bonus beim Wohnwert', () => {
  const s = migrate(newFarm('T'));
  s._who = 'host'; s.money = 100000; s.level = 10;
  assert.ok(act(s, { t: 'buy', id: 'pilztisch', n: 1 }).ok);
  assert.equal(s.inv.pilztisch, 1);
  const before = homeScore(s).pts;
  const pilz = Object.keys(FURN2).filter(id => FURN2[id].set === 'pilz' && !FURN2[id].wall && !FURN2[id].rug && FURN2[id].w === 1 && FURN2[id].d === 1).slice(0, 4);
  assert.equal(pilz.length, 4);
  pilz.forEach((id, i) => { s.inv[id] = 1; assert.ok(act(s, { t: 'hplace', x: -2 + i, z: -1, item: id, r: 0 }).ok, id); });
  const h = homeScore(s);
  assert.deepEqual(h.sets, ['pilz']);
  assert.ok(h.pts >= before + SET_BONUS, 'Serien-Bonus');
  assert.deepEqual(setsIn(pilz.slice(0, 3), FURNITURE), [], 'drei reichen noch nicht');
});

test('Alter Spielstand bleibt heil', () => {
  const o = JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8')), s = migrate(JSON.parse(JSON.stringify(o)));
  assert.deepEqual(s.home.items, o.home?.items ?? s.home.items);
  for (const [id, n] of Object.entries(o.inv || {})) assert.equal(s.inv[id], n);
});

test('Pfingstrosen in allen Farben: Gärtnerei, Kreuzungen, Modelle, Tapete & Boden', async () => {
  const { CROPS, HYBRIDS } = await import('../src/data.js');
  const { WALLS, FLOORS } = await import('../src/furni-data.js');
  const { flowerColor } = await import('../src/features/florist.js');
  const peonies = Object.keys(CROPS).filter(k => k.startsWith('pfingstrose'));
  assert.ok(peonies.length >= 13, `${peonies.length} Pfingstrosen`);
  const cols = new Set(peonies.map(flowerColor));
  for (const c of ['weiss', 'rosa', 'rot', 'gelb', 'orange', 'lila', 'blau']) assert.ok(cols.has(c), `Farbe ${c}`);
  // jede Sorte ist erreichbar: Gärtnerei, Blütenwiese oder Kreuzung aus erreichbaren Eltern
  const ok = new Set(peonies.filter(k => CROPS[k].garden || CROPS[k].wild).concat(Object.keys(CROPS).filter(k => CROPS[k].seed > 0)));
  for (let r = 0; r < 6; r++) for (const [pair, h] of Object.entries(HYBRIDS)) if (pair.split('+').every(p => ok.has(p))) ok.add(h);
  for (const k of peonies) assert.ok(ok.has(k), `${k} erreichbar`);
  for (const [pair] of Object.entries(HYBRIDS)) assert.equal(pair, pair.split('+').sort().join('+'), 'Kreuzungen sortiert');
  // Pflanze & Samentüte
  const { crop } = await import('../src/plants.js');
  for (const k of peonies) for (const st of [1, 2, 3]) assert.ok(crop(k, st), `${k} Stufe ${st}`);
  // Laden: seltene nicht im Krämerladen
  const s = migrate(newFarm('T')); s._who = 'host'; s.money = 9999; s.level = 5;
  assert.ok(act(s, { t: 'buy', id: 's_pfingstrose_weiss', n: 1 }).ok);
  assert.ok(!act(s, { t: 'buy', id: 's_pfingstrose_blau', n: 1 }).ok, 'blaue nur durch Kreuzen');
  // Wohnung
  assert.ok(WALLS.some(w => w[0] === 'pfingstrosen' && w[3] === 'peonies'));
  assert.ok(FLOORS.some(f => f[0] === 'rosadielen') && FLOORS.some(f => f[0] === 'rosenparkett'));
  s.money = 9999;
  assert.ok(act(s, { t: 'hstyle', kind: 'wall', id: 'pfingstrosen' }).ok && s.home.wall === 'pfingstrosen');
});
