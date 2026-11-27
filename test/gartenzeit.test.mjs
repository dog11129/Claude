// Inselleben 13 „Gartenzeit“: Zugezogene als richtige Nachbarn, Zäune & Tore, Fleißkärtchen mit Sternchen-Laden,
// Wunschbrunnen und die neu gebauten Gebiete. Alte Spielstände bekommen alles nur dazu.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const X = await import('../src/extras.js');
const E12 = await import('../src/extras12.js');
const E13 = await import('../src/extras13.js');
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const { NWISH } = await import('../src/features/nrooms.js');
const A = await import('../src/areas.js');
const M13 = await import('../src/models-13.js');
const { merge } = await import('../src/models.js');

const withFlocke = (f = 95) => { const s = S.newFarm(); s.obj['5,5'] = { k: 'nachbarhaus', r: 0, who: 'flocke' }; s.residents = { flocke: { day: 1, home: '5,5', f } }; return S.migrate(JSON.parse(JSON.stringify(s))); };

test('Zugezogene: eigene Zimmer hinter den Nachbarn, Geschmack und Wünsche für alle sechs', () => {
  assert.deepEqual(D.VISITOR_IDS, X.VISITOR_KEYS);
  assert.equal(new Set(S.ROOM_IDS.map(S.nroomZ)).size, S.ROOM_IDS.length);
  for (const id of D.VISITOR_IDS) {
    assert.equal(S.roomIdAt(S.nroomZ(id)), id);
    assert.equal(NWISH[id].length, 3, id);
    const T = E12.NTASTE[id];
    assert.ok(T.furn.length >= 10 && T.furn.every(k => FURNITURE[k] && !FURNITURE[k].rare), id);
    assert.ok(S.nroomBlank(id).wall && S.nroomBlank(id).floor);
  }
});

test('Zugezogene: Haus betreten, plaudern, ein Geschenk am Tag, Herzen, Wünsche – wie bei allen Nachbarn', () => {
  const s = withFlocke();
  assert.equal(S.hearts(s, 'flocke'), 3);
  assert.ok(s.nhome.flocke && Object.values(s.nhome.flocke.items).some(o => o.npc), 'richtet sich selbst ein');
  const r = S.resolve(s, { x: 5, z: 6.2, ry: Math.PI }, 'hand', { x: 5, z: 5 });
  assert.equal(r.visit, 'flocke');
  assert.ok(S.act(s, { t: 'vtalk', id: 'flocke' }, 'host').ok);
  assert.equal(s.residents.flocke.f, 101);
  s.pinv.host.kirsche = 2;
  const g1 = S.act(s, { t: 'vgift', id: 'flocke', item: 'kirsche' }, 'host'), g2 = S.act(s, { t: 'vgift', id: 'flocke', item: 'kirsche' }, 'host');
  assert.ok(g1.ok && g1.reaction === 'like');
  assert.ok(!g2.ok && s.pinv.host.kirsche === 1, 'zweites Geschenk am selben Tag kommt zurück');
  s.pinv.host.sessel = 1;
  assert.ok(S.act(s, { t: 'hplace', item: 'sessel', x: 0, z: 0, room: 'flocke' }, 'host').ok);
  const money = s.money;
  assert.ok(S.act(s, { t: 'nwish', id: 'flocke' }, 'host').ok);
  assert.equal(s.nhome.flocke.w, 1);
  assert.ok(s.money > money && s.residents.flocke.f > 116);
  // unter 3 Herzen darf man nicht einrichten; wer nicht hier wohnt, hat kein Zimmer
  const t = withFlocke(40); t.pinv.host.sessel = 1;
  assert.ok(!S.act(t, { t: 'hplace', item: 'sessel', x: 0, z: 0, room: 'flocke' }, 'host').ok);
  assert.ok(!S.act(t, { t: 'hplace', item: 'sessel', x: 0, z: 0, room: 'pingo' }, 'host').ok);
});

test('Zugezogene: morgens und abends zu Hause, tagsüber vor der Tür, nachts im Bett', () => {
  const s = withFlocke(), at = h => { s.dayTime = (h - 6) / 18; return E12.nhomeState(s, 'flocke'); };
  s.weather = 'sun';
  assert.equal(at(8), 'home'); assert.equal(at(13), 'away'); assert.equal(at(19), 'home'); assert.equal(at(23), 'sleep');
  s.weather = 'rain'; assert.equal(at(13), 'home');
  assert.match(E12.doorNote({ ...s, weather: 'sun', dayTime: (13 - 6) / 18 }, 'flocke'), /Flocke/);
  assert.equal(E12.nhomeState(s, 'pingo'), 'away', 'wohnt nicht hier');
});

test('Zäune: acht Sorten, verbinden sich in alle Richtungen, bleiben in ihrer Kachel; Tore sind offen', () => {
  const kinds = Object.values(D.PLACE).filter(p => p.fence).map(p => p.fence);
  assert.equal(kinds.length, 8);
  for (const k of kinds) {
    assert.ok(M13.FENCES[k], k);
    for (let m = 0; m < 16; m++) {
      const g = merge(M13.fenceParts(k, m)); g.computeBoundingBox(); const b = g.boundingBox;
      assert.ok(b.min.x > -0.6 && b.max.x < 0.6 && b.min.z > -0.6 && b.max.z < 0.6 && b.min.y > -0.05 && b.max.y < 1.1, `${k} ${m}`);
      if (m & 2) assert.ok(b.max.x > 0.45, `${k}: Arm nach Osten`);
      if (m && !(m & 2)) assert.ok(b.max.x < 0.45, `${k} ${m}: kein Arm nach Osten`);
      g.dispose();
    }
  }
  const s = S.migrate(S.newFarm());
  for (const [id, p] of Object.entries(D.PLACE)) if (p.fence || p.gate) assert.ok(D.ITEMS[id] && (p.buy > 0 || id === 'bambuszaun'), id);
  let spot = null;
  for (let x = -12; x < 12 && !spot; x++) for (let z = -8; z < 12 && !spot; z++) if (!S.blocked(s, x, z) && !S.blocked(s, x + 1, z) && !s.obj[x + ',' + z] && !s.tiles[x + ',' + z]) spot = [x, z];
  s.obj[spot[0] + ',' + spot[1]] = { k: 'lattenzaun', r: 0 }; s.obj[(spot[0] + 1) + ',' + spot[1]] = { k: 'lattentor', r: 0 };
  assert.equal(S.blocked(s, spot[0], spot[1]), true, 'Zaun versperrt den Weg');
  assert.equal(S.blocked(s, spot[0] + 1, spot[1]), false, 'durchs Tor kann man gehen');
});

test('Fleißkärtchen: fünf Aufgaben, die nie ausgehen; Sternchen-Laden; Wunschbrunnen einmal am Tag', () => {
  const s = S.migrate(S.newFarm()), P = s.plus;
  assert.equal(P.cards.length, E13.PLUS_N);
  assert.equal(new Set(P.cards.map(c => D.DAILY[c.i][1])).size, E13.PLUS_N, 'fünf verschiedene Aufgaben');
  const c = P.cards[0], ev = D.DAILY[c.i][1], money = s.money;
  S.questEventX(s, ev, E13.cardNeed(c) - 1, {});
  assert.ok(!c.done && !S.act(s, { t: 'plus13', op: 'claim', i: 0 }, 'host').ok);
  S.questEventX(s, ev, 1, {});
  assert.ok(c.done);
  const st = E13.cardStars(c);
  assert.ok(S.act(s, { t: 'plus13', op: 'claim', i: 0 }, 'host').ok);
  assert.equal(P.stars, st); assert.equal(s.money, money + 120 * st); assert.equal(P.cards.length, E13.PLUS_N);
  assert.ok(!P.cards.some(q => D.DAILY[q.i][1] === ev), 'nicht gleich dieselbe Aufgabe noch einmal');
  assert.ok(S.act(s, { t: 'plus13', op: 'swap', i: 1 }, 'host').ok);
  assert.ok(!S.act(s, { t: 'plus13', op: 'swap', i: 1 }, 'host').ok, 'nur einmal am Tag tauschen');
  for (const id of E13.STAR_SHOP) assert.ok(E13.starCost(id) > 0 && (E13.STAR_EXTRA[id] || D.PLACE[id]), id);
  assert.ok(!S.act(s, { t: 'plus13', op: 'buy', id: 'wunschbrunnen' }, 'host').ok, 'zu wenig Sternchen');
  P.stars = 60;
  for (const id of E13.STAR_SHOP) assert.ok(S.act(s, { t: 'plus13', op: 'buy', id }, 'host').ok, id);
  assert.equal(s.pinv.host.wunschbrunnen, 1); assert.equal(s.pinv.host.lattenzaun, 12);
  s.obj['3,3'] = { k: 'wunschbrunnen', r: 0 };
  const r = S.resolve(s, { x: 3, z: 4.2, ry: Math.PI }, 'hand', { x: 3, z: 3 });
  assert.equal(r.a?.t, 'wish13');
  assert.ok(S.act(s, r.a, 'host').ok); assert.ok(!S.act(s, r.a, 'host').ok);
  // alter Stand: Kärtchen kommen dazu, kaputte Werte werden aufgeräumt, sonst bleibt alles
  const old = S.newFarm(); old.money = 777; old.plus = { cards: [{ i: 9999, z: 0, p: 0 }, 'x'], stars: 'viele' };
  const m = S.migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(m.money, 777); assert.equal(m.plus.stars, 0); assert.equal(m.plus.cards.length, E13.PLUS_N);
});

test('Gebiete neu: größer, Weg bleibt frei, Fundstellen, Teich und See versperrt, alles erreichbar', () => {
  assert.ok(A.AREAS.wald.w >= 15 && A.AREAS.wiese.w >= 15 && A.AREAS.hoehle.w >= 13);
  const s = S.migrate(S.newFarm()); s.areas = { wald: 1, wiese: 1, hoehle: 1 };
  for (const [id, AR] of Object.entries(A.AREAS)) {
    const N = A.NODES[id];
    assert.equal(N.filter(n => n.kind === 'spot').length, 6, id);
    assert.equal(new Set(N.map(n => n.x + ',' + n.z)).size, N.length, 'kein Platz doppelt');
    for (const n of N) { assert.ok(Math.abs(n.x) <= AR.w && Math.abs(n.z) <= AR.d); assert.ok(!A.areaBlock(id, n.x, n.z), `${id}: ${n.kind} im Wasser`); }
    for (const [k, p] of A.SPOT_LOOT[id]) assert.ok(D.ITEMS[k] && p > 0, k);
    // der Weg vom Eingang bis zur Mitte (Wald/Wiese: bis zum Nordrand) ist begehbar
    for (let lz = AR.d; lz >= (AR.cave ? 0 : -AR.d + 1); lz -= 0.5) assert.equal(S.blocked(s, AR.x + A.pathX(id, lz), AR.z + lz), false, `${id}: Weg bei ${lz}`);
    // jede Sammelstelle hat mindestens eine freie Nachbarkachel
    for (const n of N) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !S.blocked(s, AR.x + n.x + dx, AR.z + n.z + dz)), `${id}: ${n.kind} ${n.x},${n.z} erreichbar`);
    for (const [bx, bz] of A.AREA_BLOCK[id]) assert.equal(S.blocked(s, AR.x + bx, AR.z + bz), true, `${id}: gesperrt`);
  }
  // Fundstelle durchstöbern: einmal am Tag etwas aus der Liste
  const n = A.NODES.wald.find(q => q.kind === 'spot'), AR = A.AREAS.wald, loot = A.nodeToday('wald', n, s.day);
  const r = S.resolve(s, { x: AR.x + n.x, z: AR.z + n.z + 0.9, ry: Math.PI }, 'hand', null);
  assert.equal(r.a?.t, 'aact');
  assert.ok(S.act(s, r.a, 'host').ok);
  assert.ok(s.pinv.host[loot] >= 1, loot);
  assert.ok(!S.act(s, r.a, 'host').ok, 'heute schon durchstöbert');
});
