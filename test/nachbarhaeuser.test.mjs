// Inselleben 12: Nachbarn richten ihr Zuhause selbst ein; ihre Häuser stehen immer offen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const { newFarm, migrate, act, roomOf, canFurnish, homeAt } = await import('../src/state.js');
const E = await import('../src/extras12.js');
const { wishOk, roomStuff, NWISH } = await import('../src/features/nrooms.js');
const { NPC_IDS } = await import('../src/data.js');
const { FURNITURE, WALLS, FLOORS } = await import('../src/furni-data.js');

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const all = h => ['items', 'rugs', 'walls'].flatMap(m => Object.entries(h[m]).map(([key, o]) => ({ m, key, o })));

test('Geschmack: alles, was Nachbarn sich aussuchen, gibt es wirklich', () => {
  for (const id of NPC_IDS) {
    const T = E.NTASTE[id];
    assert.ok(T, id);
    for (const k of T.furn) assert.ok(FURNITURE[k] && FURNITURE[k].w * FURNITURE[k].d <= 4, `${id}: ${k}`);
    for (const w of T.walls) assert.ok(WALLS.some(x => x[0] === w), `${id}: Tapete ${w}`);
    for (const f of T.floors) assert.ok(FLOORS.some(x => x[0] === f), `${id}: Boden ${f}`);
    assert.equal(new Set(T.furn).size, T.furn.length, `${id}: nichts doppelt`);
  }
});

test('Alte Spielstände: eure Möbel bei Nachbarn bleiben, Nachbarn stellen nur Freies voll', () => {
  const o = old();
  o.nhome = { mira: { wall: 'rosa', floor: 'dielen', items: { '-2,-1': { k: 'einzelbett', r: 0 }, '1,-2': { k: 'herd', r: 0 }, '2,-2': { k: 'sofa', r: 0 } }, rugs: { '0,0': { k: 'teppich', r: 0 } }, walls: {}, w: 1 } };
  const before = JSON.stringify(o.nhome.mira.items['1,-2']) + JSON.stringify(o.nhome.mira.rugs);
  const s = migrate(o);
  assert.equal(s.money, old().money);
  assert.equal(JSON.stringify(s.nhome.mira.items['1,-2']) + JSON.stringify(Object.fromEntries(Object.entries(s.nhome.mira.rugs).filter(([, r]) => !r.npc))), before);
  assert.equal(s.nhome.mira.items['2,-2'].k, 'sofa');
  assert.equal(s.nhome.mira.w, 1);
  for (const id of NPC_IDS) {
    const h = s.nhome[id], mine = all(h).filter(e => e.o.npc);
    assert.ok(mine.length >= 3, `${id} hat schon eigene Sachen (${mine.length})`);
    assert.ok(h.items['-2,-1']?.k === 'einzelbett', `${id}: Bett steht`);
    // nichts überlappt, die Tür bleibt frei
    const seen = new Set();
    for (const [key, it] of Object.entries(h.items)) { const [x, z] = key.split(',').map(Number); assert.ok(homeAt(s, x, z, false, roomOf(s, id))); assert.ok(!seen.has(key)); seen.add(key); assert.ok(!(x === 0 && z === 2), 'Tür frei'); }
  }
  const a = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), a, 'zweimal migrieren ändert nichts');
  // kaputte Angaben werden repariert
  const b = migrate({ ...old(), nhome: { mira: { items: 5, self: { n: 'x', last: null, news: 'kaputt' } } } });
  assert.deepEqual(b.nhome.mira.self, { n: 0, last: b.day, news: null });
});

test('Jeden Morgen höchstens ein Nachbar: neue Stücke bis zur Obergrenze, dann Umgestalten', () => {
  const s = migrate(newFarm());
  const log = [];
  for (let d = 0; d < 80; d++) { s.day++; const before = JSON.stringify(s.nhome); const id = E.nhomeMorning(s); const changed = NPC_IDS.filter(n => JSON.stringify(s.nhome[n]) !== JSON.stringify(JSON.parse(before)[n])); assert.ok(changed.length <= 1); if (id) log.push(s.nhome[id].self.news.kind); }
  assert.ok(log.filter(k => k === 'new').length >= 15, 'viele Neuanschaffungen');
  assert.ok(log.some(k => k !== 'new'), 'später wird umgestaltet');
  for (const id of NPC_IDS) {
    const h = s.nhome[id], mine = all(h).filter(e => e.o.npc);
    for (const m of ['items', 'rugs', 'walls']) assert.ok(mine.filter(e => e.m === m).length <= E.NPC_CAP[m], `${id}: ${m}`);
    assert.ok(E.NTASTE[id].walls.includes(h.wall) && E.NTASTE[id].floors.includes(h.floor), `${id}: Tapete/Boden aus dem eigenen Geschmack`);
    for (const e of mine) assert.ok(E.NTASTE[id].furn.includes(e.o.k));
    // die Zimmermitte vor der Tür bleibt frei
    assert.ok(!h.items['0,1'] && !h.items['0,2']);
  }
});

test('Eure Wünsche bleiben eure Aufgabe: Eigenes der Nachbarn zählt nicht und kauft keinen Wunsch weg', () => {
  const s = migrate(newFarm());
  for (let d = 0; d < 60; d++) { s.day++; E.nhomeMorning(s); }
  for (const id of NPC_IDS) {
    assert.equal(roomStuff(s, id).length, 0, `${id}: nur Eigenes im Zimmer`);
    assert.ok(!wishOk(s, id, 0), `${id}: erster Wunsch noch offen`);
    const mine = all(s.nhome[id]).filter(e => e.o.npc).map(e => e.o.k);
    for (const W of NWISH[id]) for (const k of mine) assert.ok(!(W.keys ? W.keys.includes(k) : W.cat && FURNITURE[k].cat === W.cat), `${id}: ${k} wäre ein Wunsch`);
  }
});

test('Eigene Möbel der Nachbarn kann man nicht einstecken – eure schon', () => {
  const s = migrate(newFarm());
  s.npc.mira = { f: 600, talk: 0, gift: 0, sent: [] };
  const h = s.nhome.mira, [key] = Object.entries(h.items).find(([, o]) => o.npc);
  const [x, z] = key.split(',').map(Number);
  const out = act(s, { t: 'hpick', room: 'mira', x, z });
  assert.ok(!out.ok && /selbst ausgesucht/.test(out.msg));
  assert.ok(h.items[key]);
  s.inv.sofa = 1;
  const spot = [[-1, 1], [1, 1], [2, 1], [-2, 1]].find(([i, j]) => canFurnish(s, 'sofa', i, j, 0, roomOf(s, 'mira')));
  assert.ok(act(s, { t: 'hplace', room: 'mira', item: 'sofa', x: spot[0], z: spot[1], r: 0 }).ok);
  assert.ok(act(s, { t: 'hpick', room: 'mira', x: spot[0], z: spot[1] }).ok);
  assert.equal(s.inv.sofa, 1);
});

test('Wo steckt wer? Morgens und abends zu Hause, tagsüber unterwegs, nachts im Bett', () => {
  const s = migrate(newFarm());
  const at = h => { s.dayTime = (h - 6) / 18; };
  at(8); assert.equal(E.nhomeState(s, 'mira'), 'home');
  at(13); assert.equal(E.nhomeState(s, 'mira'), 'away');
  assert.match(E.doorNote(s, 'mira'), /Bin .+ – Mira/);
  at(20.8); assert.equal(E.nhomeState(s, 'mira'), 'home');
  at(23.5); assert.equal(E.nhomeState(s, 'mira'), 'sleep');
  assert.match(E.doorNote(s, 'mira'), /schläft/);
  at(13);
  for (const id of NPC_IDS) assert.ok(E.whereabouts(s, id).length > 4, id);
});

test('Neuigkeiten: im Gespräch, im Inselboten – und nur einmal erzählt', () => {
  const s = migrate(newFarm());
  s.day += 3;
  const id = E.nhomeMorning(s, seq(0));
  assert.ok(id);
  const N = E.nhomeNews(s, id);
  assert.ok(N && N.kind === 'new' && N.say.includes(FURNITURE[N.k].name));
  assert.ok(E.gossip12(s).some(l => l.includes(FURNITURE[N.k].name)));
  assert.ok(act(s, { t: 'nhome12', op: 'told', id }).ok);
  assert.ok(E.nhomeNews(s, id).told);
  s.day += 9;
  assert.equal(E.nhomeNews(s, id), null, 'alte Neuigkeiten verschwinden');
  // Umgestalten: Tapete, Boden, Tauschen
  assert.equal(E.npcRestyle(s, 'pippa', seq(0.1)), 'wall');
  assert.equal(E.npcRestyle(s, 'pippa', seq(0.5)), 'floor');
  const r = E.npcRestyle(s, 'pippa', seq(0.9, 0.2));
  assert.ok(['swap', 'move'].includes(r), r);
});
