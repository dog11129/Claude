// Baumschaufel & Inselerweiterung: Bäume ausgraben, umsetzen – alte Bäume bleiben, wo sie waren
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrate, act, resAt, spots, fruitOf, resolve, treeSpotOk, key } from '../src/state.js';
import { RES_SPOTS, TREE_FRUIT } from '../src/data.js';
import { grass, newLand } from '../src/island.js';

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));

test('Alte Bäume stehen nach dem Update am selben Platz', () => {
  const before = old(), s = migrate(old());
  for (const k of Object.keys(before.res)) assert.ok(resAt(s, k), `Platz ${k} fehlt`);
  for (const k of Object.keys(before.res)) assert.equal(s.res[k], before.res[k], `Holz/Steine an ${k} unverändert`);
  const fresh = Object.keys(RES_SPOTS).filter(k => before.res[k] === undefined);
  assert.ok(fresh.length >= 20, 'neue Bäume auf der Erweiterung');
  for (const k of fresh) { const [x, z] = k.split(',').map(Number); assert.ok(newLand(x, z), `${k} liegt auf neuem Land`); assert.equal(s.res[k], 3); }
});

test('Baumschaufel: ausgraben und woanders einpflanzen', () => {
  const s = migrate(old());
  s.level = 3; s.money = 10000;
  assert.ok(act(s, { t: 'buy', id: 'baumschaufel', n: 1 }).ok);
  const k = Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === 'tree');
  const [x, z] = k.split(',').map(Number), fruit = TREE_FRUIT[k];
  const r = resolve(s, { x, z: z - 1, ry: 0 }, 'spade', { x, z });
  assert.equal(r.a?.t, 'uproot');
  const o = act(s, r.a);
  assert.ok(o.ok, 'ausgegraben');
  assert.equal(resAt(s, k), null);
  assert.ok(!spots(s)[k]);
  const id = 'baum_' + fruit;
  assert.equal(s.inv[id], 1);
  // Neuer Platz: freie Wiese ohne Nachbarn
  let spot = null;
  for (let i = -20; i <= 20 && !spot; i++) for (let j = -18; j <= 18 && !spot; j++) if (treeSpotOk(s, i, j, false) && !(i === x && j === z)) spot = [i, j];
  assert.ok(spot, 'freier Platz gefunden');
  const p = act(s, { t: 'replant', x: spot[0], z: spot[1], item: id });
  assert.ok(p.ok, 'eingepflanzt');
  assert.equal(resAt(s, key(...spot)), 'tree');
  assert.equal(fruitOf(s, key(...spot)), fruit);
  assert.equal(s.inv[id] || 0, 0);
  // übers Netz/Speichern bleibt alles erhalten
  const back = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(resAt(back, key(...spot)), 'tree');
  assert.equal(resAt(back, k), null);
  // Zurücksetzen an den alten Platz stellt den Originalbaum wieder her
  assert.ok(act(back, { t: 'uproot', x: spot[0], z: spot[1] }).ok);
  assert.ok(act(back, { t: 'replant', x, z, item: id }).ok);
  assert.equal(resAt(back, k), 'tree');
  assert.deepEqual(back.trees.rm, {});
});

test('Ohne Baumschaufel geht nichts, Felsen bleiben fest', () => {
  const s = migrate(old());
  const k = Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === 'tree'), [x, z] = k.split(',').map(Number);
  assert.equal(act(s, { t: 'uproot', x, z }).ok, false);
  s.inv.baumschaufel = 1;
  const rk = Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === 'rock'), [rx, rz] = rk.split(',').map(Number);
  assert.equal(act(s, { t: 'uproot', x: rx, z: rz }).ok, false);
  assert.equal(act(s, { t: 'replant', x: 0, z: 0, item: 'baum_apfel' }).ok, false, 'ohne Ballen');
  // Kaputte Einträge aus dem Netz werden beim Laden verworfen
  const bad = migrate({ ...JSON.parse(JSON.stringify(s)), trees: { rm: { 'x': 1, [rk]: 1 }, add: { '1,1': { kind: 'rock', fruit: 'apfel' }, '2,2': { kind: 'tree', fruit: 'nix' } } } });
  assert.deepEqual(bad.trees, { rm: {}, add: {} });
  assert.ok(grass(0, 8) !== undefined);
});
