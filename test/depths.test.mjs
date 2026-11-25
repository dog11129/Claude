// Höhlen-Tiefen: Treppe, Kristallring, singende Tür, Edelsteinadern, Herzkristall, alte Spielstände
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, resolve, AREAS } from '../src/state.js';
import * as Z from '../src/extras3.js';
import { ITEMS, RECIPES, ALBUM, STORY } from '../src/data.js';
import { FURNITURE } from '../src/furni-data.js';
import { FURN_X } from '../src/models-extra.js';
import { zoneOf, clampPos } from '../src/newleaf.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; return s; };
const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const at = (lv, x, z, ry = Math.PI) => ({ x: Z.DEPTH_LV[lv].x + x, z: Z.DEPTH.z + z, ry });

test('Daten: Laterne an der Werkbank, neue Edelsteine im Museum, Belohnungs-Möbel mit Modell', () => {
  assert.ok(RECIPES.t_grubenlaterne?.gem, 'Grubenlaterne ohne Bauplan baubar');
  for (const id of ['mondstein', 'topas', 'smaragd', 'regenbogenkristall']) { assert.ok(ITEMS[id]?.sell > 0, id); assert.ok(ALBUM.gem.includes(id), id); }
  assert.ok(FURNITURE.kristallleuchte && FURN_X.kristallleuchte, 'Kristall-Leuchte');
  assert.ok(STORY.some(q => q.ev === 'depth') && STORY.some(q => q.ev === 'depth3'));
});

test('Orte: Tiefen liegen bei z = 2000 und sind eine eigene Zone', () => {
  for (let lv = 0; lv < 3; lv++) {
    const p = at(lv, 0, 0);
    assert.equal(zoneOf(p), 'depths');
    assert.equal(Z.depthAt(p), lv);
  }
  assert.deepEqual(clampPos(70, 2300, 40), [52, 2012]);
  const [sx, sz] = Z.DEPTH_STAIRS, A = AREAS.hoehle;
  assert.ok(Math.abs(sx - A.x) <= A.w && Math.abs(sz - A.z) <= A.d, 'Treppe liegt in der Kristallhöhle');
});

test('Treppe in der Kristallhöhle: nur mit Grubenlaterne', () => {
  const s = fresh(), [sx, sz] = Z.DEPTH_STAIRS, me = { x: sx, z: sz + 1, ry: Math.PI };
  s.areas.hoehle = { open: 1 };
  assert.ok(!resolve(s, me, 'hand').go, 'ohne Laterne kein Abstieg');
  s.inv.grubenlaterne = 1;
  assert.equal(resolve(s, me, 'hand').go, 'depth:0');
});

test('Kristallring: Kristall schaltet sich und seine Nachbarn, alle an öffnet die Tür', () => {
  const s = fresh();
  assert.equal(act(s, { t: 'depth', op: 'ring', i: 0 }).ok, false, 'erst hinabsteigen');
  assert.ok(act(s, { t: 'depth', op: 'enter', lv: 0 }).ok);
  assert.equal(s.depth.lv, 1);
  assert.equal(act(s, { t: 'depth', op: 'enter', lv: 1 }).ok, false, 'Tür noch zu');
  s.depth.ring = [0, 0, 0, 0, 0];
  act(s, { t: 'depth', op: 'ring', i: 0 });
  assert.deepEqual(s.depth.ring, [1, 1, 0, 0, 1]);
  assert.ok(blocked(s, ...Object.values(at(0, 0, Z.DEPTH_DOOR[1] + 0.2)).slice(0, 2)), 'Tür ist zu');
  // jeder Zustand ist lösbar: Breitensuche über alle 32 Zustände
  for (let m = 0; m < 31; m++) {
    const start = [0, 1, 2, 3, 4].map(i => (m >> i) & 1), seen = new Map([[start.join(''), []]]), q = [start];
    let found = null;
    while (q.length && !found) {
      const c = q.shift();
      for (let i = 0; i < 5; i++) {
        const n = [...c];
        for (const j of [i + 4, i, i + 1]) n[j % 5] ^= 1;
        const k = n.join('');
        if (seen.has(k)) continue;
        seen.set(k, [...seen.get(c.join('')), i]);
        if (n.every(Boolean)) { found = seen.get(k); break; }
        q.push(n);
      }
    }
    assert.ok(found, 'lösbar von ' + start.join(''));
  }
  s.depth.ring = [1, 1, 1, 0, 1];
  // 3 schaltet 2,3,4 → [1,1,0,1,0]; dann … einfacher: Lösung per Suche anwenden
  const solve = r => { for (let m = 0; m < 32; m++) { const x = [...r]; for (let i = 0; i < 5; i++) if ((m >> i) & 1) for (const j of [i + 4, i, i + 1]) x[j % 5] ^= 1; if (x.every(Boolean)) return [0, 1, 2, 3, 4].filter(i => (m >> i) & 1); } };
  for (const i of solve(s.depth.ring)) act(s, { t: 'depth', op: 'ring', i });
  assert.ok(s.depth.open[0], 'Kristalltür offen');
  assert.ok(!blocked(s, ...Object.values(at(0, 0, Z.DEPTH_DOOR[1] + 0.2)).slice(0, 2)), 'Tür ist offen');
  assert.equal(act(s, { t: 'depth', op: 'ring', i: 1 }).ok, false, 'gelöst bleibt gelöst');
  assert.equal(resolve(s, at(0, 0, Z.DEPTH_DOOR[1] + 1.2), 'hand').go, 'depth:1');
});

test('Singende Tür: richtige Melodie öffnet, falsche nicht', () => {
  const s = fresh();
  act(s, { t: 'depth', op: 'enter', lv: 0 });
  s.depth.open[0] = 1;
  assert.ok(act(s, { t: 'depth', op: 'enter', lv: 1 }).ok);
  assert.equal(resolve(s, at(1, 0, Z.DEPTH_DOOR[1] + 1.2), 'hand').ui, 'depthdoor');
  const wrong = s.depth.song.map(n => (n + 1) % 4);
  const r = act(s, { t: 'depth', op: 'song', notes: wrong });
  assert.ok(r.ok && !s.depth.open[1]);
  assert.equal(act(s, { t: 'depth', op: 'song', notes: [9, 9, 9] }).ok, false);
  assert.ok(act(s, { t: 'depth', op: 'song', notes: [...s.depth.song] }).ok);
  assert.ok(s.depth.open[1]);
  assert.ok(act(s, { t: 'depth', op: 'enter', lv: 2 }).ok);
  assert.equal(s.depth.lv, 3);
});

test('Edelsteinadern: einmal am Tag je Ader, nur wo man schon war; morgens wieder voll', () => {
  const s = fresh();
  assert.equal(act(s, { t: 'depth', op: 'mine', lv: 0, i: 0 }).ok, false, 'noch nicht unten');
  act(s, { t: 'depth', op: 'enter', lv: 0 });
  const before = Object.values(s.inv).reduce((a, b) => a + b, 0);
  const r = act(s, { t: 'depth', op: 'mine', lv: 0, i: 0 });
  assert.ok(r.ok && ['kristall', 'amethyst', 'mondstein', 'topas'].includes(r.got), r.got);
  assert.equal(Object.values(s.inv).reduce((a, b) => a + b, 0), before + 1);
  assert.equal(act(s, { t: 'depth', op: 'mine', lv: 0, i: 0 }).ok, false, 'heute leer');
  assert.equal(act(s, { t: 'depth', op: 'mine', lv: 1, i: 0 }).ok, false, 'Ebene 2 noch nicht erreicht');
  assert.equal(act(s, { t: 'depth', op: 'mine', lv: 0, i: 9 }).ok, false);
  Z.morningZ(s);
  assert.deepEqual(s.depth.got, {});
  assert.equal(resolve(s, at(0, Z.DEPTH_VEINS[1][0] - 1.2, Z.DEPTH_VEINS[1][1], Math.PI / 2), 'shovel').a?.op, 'mine');
  assert.ok(blocked(s, ...Object.values(at(0, ...Z.DEPTH_VEINS[2])).slice(0, 2)), 'Adern sind fest');
});

test('Herzkristall: nur ganz unten, nur einmal', () => {
  const s = fresh();
  assert.equal(act(s, { t: 'depth', op: 'heart' }).ok, false);
  s.depth.lv = 3;
  const m = s.money, r = act(s, { t: 'depth', op: 'heart' });
  assert.ok(r.ok);
  assert.equal(s.money, m + 8000);
  assert.equal(s.inv.regenbogenkristall, 1);
  assert.equal(s.inv.kristallleuchte, 1);
  assert.equal(act(s, { t: 'depth', op: 'heart' }).ok, false);
  assert.ok(blocked(s, ...Object.values(at(2, 0, 0)).slice(0, 2)), 'der See ist nicht begehbar');
});

test('Alte Spielstände bekommen die Tiefen, vorhandene Werte bleiben', () => {
  const s = migrate(old());
  assert.equal(s.depth.lv, 0);
  assert.equal(s.depth.ring.length, 5);
  assert.ok(!s.depth.ring.every(Boolean), 'Rätsel nicht schon gelöst');
  assert.equal(s.depth.song.length, 4);
  const k = migrate(JSON.parse(JSON.stringify({ ...s, depth: { lv: 2, ring: [1, 0, 1, 0, 1], open: [5, 0], song: [3, 2, 1, 0], heart: 0, got: { '0:1': 7 } } })));
  assert.deepEqual([k.depth.lv, k.depth.ring, k.depth.open, k.depth.song, k.depth.got], [2, [1, 0, 1, 0, 1], [5, 0], [3, 2, 1, 0], { '0:1': 7 }]);
  const bad = migrate(JSON.parse(JSON.stringify({ ...s, depth: { lv: 'x', ring: 'kaputt', song: [7, 7, 7, 7] } })));
  assert.equal(bad.depth.lv, 0);
  assert.ok(bad.depth.song.every(n => n >= 0 && n < 4));
});
