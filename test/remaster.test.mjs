// Blender-Nachbau (blender/remaster.py) und Blender-Icons: Pakete vollständig, Namen passen, Icons gehören zu echten Dingen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const IM = await import('../src/itemmodels.js');
const R = new URL('../', import.meta.url);
const glb = f => {
  const b = readFileSync(new URL(`assets/models/${f}.glb`, R)), len = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
};
const roots = j => j.scenes[j.scene || 0].nodes.map(i => j.nodes[i].name);
// Modelle, die es (noch) nur im Code gibt – neue Stücke kommen hier hinein, bis der nächste Blender-Lauf sie nachbaut.
const CODE_ONLY = new Set([]); // seit dem Blender-Lauf zu Inselleben 15 ist wieder alles nachgebaut

test('alle Modell-Pakete aus packs.json gibt es, die neuen Blender-Pakete stehen hinten', () => {
  const packs = JSON.parse(readFileSync(new URL('assets/models/packs.json', R), 'utf8'));
  for (const p of packs) assert.ok(existsSync(new URL(`assets/models/${p}.glb`, R)), p);
  for (const p of ['place2', 'furniture2', 'items2', 'crops2']) assert.ok(packs.indexOf(p) > packs.indexOf('extras'), p);
});

test('jedes Möbelstück, jede Deko, jedes Beet hat ein Blender-Modell', () => {
  const all = new Set();
  for (const f of JSON.parse(readFileSync(new URL('assets/models/packs.json', R), 'utf8'))) for (const n of roots(glb(f))) all.add(n);
  const missF = Object.keys(FURNITURE).filter(k => !all.has(k) && !CODE_ONLY.has(k));
  assert.deepEqual(missF, [], 'Möbel ohne Modell');
  const alias = { kuerbislaterne: 'lantern_pumpkin', schneemann: 'snowman', herzballon: 'heart_balloon', torte: 'cake', angelpokal: 'pokal', kaeferpokal: 'pokal' };
  const garden = ['apfelbaum', 'orangenbaum', 'pfirsichbaum', 'kirschenbaum', 'birnbaum', 'mangobaum', 'bananenbaum', 'eiernest'];
  const missP = Object.keys(D.PLACE).filter(k => !garden.includes(k) && !CODE_ONLY.has(k) && !all.has(alias[k] || k));
  assert.deepEqual(missP, [], 'Deko ohne Modell');
  const missC = Object.keys(D.CROPS).flatMap(k => [1, 2, 3].map(st => `crop_${k}_${st}`)).filter(n => !all.has(n));
  assert.deepEqual(missC, [], 'Beete ohne Modell');
  const missS = Object.keys(D.CROPS).filter(k => D.ITEMS['s_' + k] && !all.has('item_s_' + k));
  assert.deepEqual(missS, [], 'Samentüten ohne Modell');
  const missI = IM.ITEM_MODEL_IDS.filter(id => D.ITEMS[id] && !['ehering', 'traumstern'].includes(id) && !CODE_ONLY.has(id) && !all.has('item_' + id));
  assert.deepEqual(missI, [], 'Gegenstände ohne Modell');
  for (const id of ['laubfrosch', 'azurjungfer', 'rosenhonig', 'thunfisch', 'tandem', 'papierlaterne', 'riesenkuerbis']) assert.ok(all.has('item_' + id), id);
});

test('neue Pakete: Vertex-Farben, Draco, Leuchtteile heißen __glow und hängen am richtigen Modell', () => {
  for (const f of ['place2', 'furniture2', 'items2', 'crops2']) {
    const j = glb(f);
    assert.ok(j.extensionsUsed?.includes('KHR_draco_mesh_compression'), f + ' ist Draco-komprimiert');
    for (const m of j.meshes) for (const p of m.primitives) assert.ok('COLOR_0' in p.attributes, `${f}: ${m.name} hat Farben`);
    const byName = new Map(j.nodes.map((n, i) => [i, n]));
    for (const i of j.scenes[0].nodes) {
      const n = byName.get(i);
      assert.ok(!n.name.includes('__glow'), `${f}: Wurzel ${n.name} ist kein Leuchtteil`);
      for (const c of n.children || []) if (j.nodes[c].name.includes('__glow')) assert.ok(j.nodes[c].name.startsWith(n.name), j.nodes[c].name);
    }
  }
});

test('Erzeuger haben ein zweites Modell mit Ernte (<name>_ready)', () => {
  const r = roots(glb('place2'));
  for (const n of r.filter(n => n.endsWith('_ready'))) assert.ok(r.includes(n.slice(0, -6)), n);
  assert.ok(r.includes('beerenstrauch_ready') && r.includes('beerenstrauch'));
});

test('eigene Icons: jede Datei gehört zu einem Gegenstand und ist eingetragen', () => {
  const ids = JSON.parse(readFileSync(new URL('assets/icons/index.json', R), 'utf8'));
  assert.ok(ids.length > 700, 'Blender-Icons sind eingetragen');
  for (const id of ids) {
    assert.ok(D.ITEMS[id], 'unbekanntes Icon ' + id);
    assert.ok(existsSync(new URL(`assets/icons/${id}.webp`, R)), id);
  }
  for (const id of ['pfingstrosensofa', 'pfingstrose_koralle', 's_pfingstrose_weiss', 'marktstand', 'nistkasten', 'laubfrosch', 'kleehonig', 'holz']) assert.ok(ids.includes(id), id);
  const missing = Object.keys(D.ITEMS).filter(id => !ids.includes(id));
  assert.deepEqual(missing, [], 'jeder Gegenstand hat ein eigenes Bild');
});

test('zusammengesetzte Stücke (Hase, Schneemann, Salon, Fassade, Erinnerungsbaum, Koi) und Zaunstücke sind im Paket', async () => {
  const names = new Set(roots(glb('place2')));
  const M14 = await import('../src/models-14.js'), M15 = await import('../src/models-15.js'), E14 = await import('../src/extras14.js'), E15 = await import('../src/extras15.js');
  for (const n of [...Object.keys(M14.BLEND_14), ...Object.keys(M15.BLEND_15)]) assert.ok(names.has(n), n);
  for (const kind of ['door', 'shut', 'box']) for (const o of E14.EXT[kind]) if (o[0]) assert.ok(names.has(M14.FACADE_NAME[kind] + o[0]), kind + ' ' + o[0]);
  for (const v of E15.KOI_IDS) assert.ok(names.has('koi15_' + v), v);
  for (const kind of new Set(Object.values(D.PLACE).map(p => p.fence).filter(Boolean))) for (let m = 1; m < 16; m++) assert.ok(names.has(`zaun_${kind}_${m}`), `zaun_${kind}_${m}`);
  for (const kind of new Set(Object.values(D.PLACE).map(p => p.gate).filter(Boolean))) assert.ok(names.has(`tor_${kind}_rahmen`) && names.has(`tor_${kind}_fluegel`), kind);
});

test('Welt-Stücke aus Blender (world2.glb) passen zu den Namen im Code', () => {
  const names = new Set(roots(glb('world2')));
  for (const n of ['zone_fair', 'fair_wheel', 'fair_carousel', 'zone_moor', 'zone_bambus', 'zone_reef', 'zone_wreck', 'zone_grotto', 'zone_volcano', 'zone13_cave_hoehle', 'zone13_path_wald', 'zone13_brook', 'zone9_deer',
    'zone_depth_0', 'gate_wald', 'gate_wald_open', 'ride_pony', 'ride_tandem', 'ride_sled', 'wild_igel', 'zone_hive', 'eiernest_nest', 'bambus_clump_0_cut']) assert.ok(names.has(n), n);
  const pre = ['zone_', 'zone13_', 'zone9_', 'fair_', 'gate_', 'ride_', 'wild_', 'moor_', 'bambus_', 'graft_', 'move_box', 'fish_bobber', 'eiernest_nest'];
  for (const n of names) assert.ok(pre.some(p => n.startsWith(p)), n);
});

test('Figuren: alle Nachbarn, Besucher und Hüte haben Blender-Teile', async () => {
  const N = await import('../src/npc.js'), A = await import('../src/avatar.js');
  const names = new Set(roots(glb('characters')));
  for (const id of Object.keys(N.NPCS)) assert.ok(names.has(`npc_${id}_body`), id);
  for (const h of A.LOOKS.hat.map(o => (Array.isArray(o) ? o[0] : o)).filter(h => h !== 'none' && !CODE_ONLY.has(h))) assert.ok(names.has('av_hat_' + h), h);
});

