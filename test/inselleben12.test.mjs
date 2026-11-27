// Inselleben 12 „Blütenzeit“: neue Blumen und Gemüse, Garten-Deko, Wintergarten-Serie, neue Gerichte,
// Wetter-Lautstärke. Alles kommt nur dazu – alte Spielstände bleiben, wie sie sind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const { FURN_SETS } = await import('../src/furni-data2.js');
const { PLACE_12, FURN_12 } = await import('../src/models-12.js');
const P = await import('../src/plants.js');
const IM = await import('../src/itemmodels.js');
const { newFarm, migrate } = await import('../src/state.js');

const FLOWERS = ['veilchen', 'anemone', 'iris', 'ranunkel', 'sonnenhut', 'aster', 'lupine', 'chrysantheme'];
const VEG = ['radieschen', 'gurke', 'paprika', 'aubergine'];
const DISHES = ['gurkensalat', 'paprikapfanne', 'ofengemuese', 'blaubeermuffin'];
const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; };

test('Zwölf neue Pflanzen: Samen, Ernte, drei Wachstumsstufen', () => {
  for (const k of [...FLOWERS, ...VEG]) {
    const c = D.CROPS[k];
    assert.ok(c && c.name && c.icon && c.seed > 0 && c.sell > c.seed / 2 && c.grow > 0, k);
    assert.ok(D.ITEMS[k], `${k}: Ernte ist ein Gegenstand`);
    assert.ok(D.ITEMS['s_' + k], `${k}: Samentüte`);
    for (const st of [1, 2, 3]) assert.ok(tris(P.crop(k, st)) > 4, `${k}: Stufe ${st}`);
  }
  for (const k of FLOWERS) assert.ok(D.CROPS[k].garden && D.CROPS[k].flower, `${k} zählt für den Garten`);
});

test('Garten-Deko: jedes Stück hat ein Modell in Kachelgröße', () => {
  const ids = Object.keys(PLACE_12);
  assert.ok(ids.length >= 14);
  for (const k of ids) {
    const d = D.PLACE[k];
    assert.ok(d && d.name && d.icon && d.buy > 0, k);
    const m = P.placeable(k, true);
    assert.ok(tris(m) > 8, `${k}: Modell`);
    m.updateMatrixWorld(true);
    const lo = [9, 9, 9], hi = [-9, -9, -9];
    m.traverse(o => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      lo[0] = Math.min(lo[0], b.min.x); lo[1] = Math.min(lo[1], b.min.y); lo[2] = Math.min(lo[2], b.min.z); hi[0] = Math.max(hi[0], b.max.x); hi[1] = Math.max(hi[1], b.max.y); hi[2] = Math.max(hi[2], b.max.z); });
    assert.ok(lo[0] > -1.3 && hi[0] < 1.3 && lo[2] > -1.3 && hi[2] < 1.3, `${k}: Breite ${lo[0].toFixed(2)}…${hi[0].toFixed(2)}, Tiefe ${lo[2].toFixed(2)}…${hi[2].toFixed(2)}`);
    assert.ok(lo[1] > -0.1 && hi[1] < 3.2, `${k}: Höhe ${hi[1].toFixed(2)}`);
  }
});

test('Wintergarten-Serie: dreizehn Möbel im Katalog', () => {
  assert.ok(FURN_SETS.wintergarten);
  const ids = Object.keys(FURNITURE).filter(k => FURNITURE[k].set === 'wintergarten');
  assert.equal(ids.length, 13);
  for (const k of ids) { assert.ok(FURN_12[k], k); assert.equal(D.ITEMS[k]?.furn, k); }
});

test('Neue Gerichte: Rezepte gehen auf, Zutaten gibt es', () => {
  for (const k of DISHES) {
    const r = D.RECIPES[k];
    assert.ok(D.ITEMS[k]?.cat === 'dish' && r?.st === 'cook' && r.out === k, k);
    for (const z of Object.keys(r.in)) assert.ok(D.ITEMS[z], `${k}: Zutat ${z}`);
    const cost = Object.entries(r.in).reduce((a, [z, n]) => a + (D.ITEMS[z].sell || 0) * n, 0);
    assert.ok(D.ITEMS[k].sell >= cost * 0.9, `${k}: Kochen lohnt sich (${D.ITEMS[k].sell} ≥ ${cost})`);
    assert.ok(IM.ITEM_MODEL_IDS.includes(k), `${k}: Modell`);
  }
});

test('Alter Spielstand: nichts geht verloren, Wetter-Regler ist da', () => {
  const s0 = newFarm(); s0.money = 4321; s0.pinv = { host: { apfel: 3, s_rose: 2 }, u_abc123: { holz: 2 } }; s0.box = { holz: 7 }; s0.home.items = { '0,0': { k: 'einzelbett', r: 0 } };
  const before = JSON.parse(JSON.stringify(s0));
  const s = migrate(JSON.parse(JSON.stringify(s0)));
  assert.equal(s.money, before.money);
  assert.deepEqual(s.pinv, before.pinv);
  assert.deepEqual(s.box, before.box);
  assert.deepEqual(s.home.items, before.home.items);
  assert.deepEqual(s.tiles, before.tiles);
  assert.match(readFileSync(new URL('../src/menu.js', import.meta.url), 'utf8'), /weather: 1/);
  assert.match(readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8'), /wxGain/);
});
