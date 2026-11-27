// Inselleben 15 „Winterzauber“: Adventskalender, Koi-Teich, Puzzle, Schmuck, Mühle & Würfelglück, Federball,
// Kostümfest, Erinnerungsbaum, Polaroid-Wand, Glückskeks.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const X = await import('../src/extras.js');
const E = await import('../src/extras15.js');
const E14 = await import('../src/extras14.js');
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const M15 = await import('../src/models-15.js');
const { merge } = await import('../src/models.js');
const A = await import('../src/avatar.js');
const G = await import('../src/features/games.js');

const fresh = () => { const s = S.migrate(S.newFarm()); s.money = 50000; return s; };
const act = (s, a, who = 'host') => S.act(s, a, who);
const P2 = 'u_abc123';
const known = id => !!(D.ITEMS[id] || FURNITURE[id] || D.PLACE[id]);
function pond(s, n) { // Platz für n × 5 Kacheln suchen und die erste Reihe als Teich graben
  for (let z = -6; z < 14; z++) for (let x = -14; x < 14; x++) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = 0; j < 5 && ok; j++) ok = E14.terraOk(s, x + i, z + j);
    if (ok) { for (let i = 0; i < n; i++) assert.ok(act(s, { t: 'terra14', x: x + i, z, k: 'w' }).ok); return [x, z]; }
  }
  throw new Error('kein Platz');
}

test('Alte Spielstände: neue Felder kommen dazu, nichts geht verloren', () => {
  const s = S.newFarm();
  for (const k of ['advent', 'koi', 'puzzle', 'rally', 'tree', 'pola', 'cookie', 'luck', 'i15']) delete s[k];
  s.money = 4321; s.pinv.host = { holz: 7 };
  const m = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(m.money, 4321); assert.equal(m.pinv.host.holz, 7);
  assert.deepEqual(m.tree, { seen: {}, days: 0, last: 0, notes: [], noted: {} });
  assert.deepEqual(m.pola, { img: {}, cap: {}, got: [] });
  assert.equal(m.koi, undefined); assert.equal(m.puzzle, undefined); assert.equal(m.advent, undefined);
  const again = S.migrate(JSON.parse(JSON.stringify(m)));
  assert.deepEqual(again.tree, m.tree);
  // kaputte Felder werden aufgeräumt statt die Insel zu sprengen
  const bad = S.migrate(JSON.parse(JSON.stringify({ ...m, koi: 5, puzzle: 'x', rally: [], advent: { y: 'nein' }, pola: { img: { 9: 'x', 1: 'kein bild' } }, tree: { notes: 'x', days: -4 } })));
  assert.equal(bad.koi, undefined); assert.equal(bad.puzzle, undefined); assert.equal(bad.advent, undefined);
  assert.deepEqual(bad.pola.img, {}); assert.equal(bad.tree.days, 0); assert.deepEqual(bad.tree.notes, []);
});

test('Begrüßungspost: einmal Erinnerungsbaum und Puzzletisch, danach nichts mehr', () => {
  E.setClock15(() => new Date(2026, 5, 10));
  const s = fresh(), n0 = s.mail.length;
  assert.equal(E.tick15(s), true);
  assert.equal(s.mail.length, n0 + 2);
  assert.deepEqual(s.mail.slice(-2).map(m => m.item), ['erinnerungsbaum', 'puzzletisch']);
  assert.equal(E.tick15(s), false);
  assert.equal(s.mail.length, n0 + 2);
  E.setClock15();
});

test('Adventskalender: echtes Datum, jede:r öffnet seine Türchen, nachholen geht, am 24. das Besondere', () => {
  for (let d = 1; d <= 24; d++) { const g = E.ADVENT[d]; if (g.item) assert.ok(known(g.item), g.item); if (g.extra) assert.ok(known(g.extra[0]), g.extra[0]); assert.ok(E.adventLabel(g).length > 3); }
  assert.equal(E.ADVENT.length, 25);
  const s = fresh();
  E.setClock15(() => new Date(2026, 10, 27));
  assert.deepEqual(E.adventInfo(), { y: 2026, on: false, soon: 4 });
  assert.ok(!act(s, { t: 'advent15', d: 1 }).ok, 'im November noch zu');
  s.pinv.host = { erinnerungsbaum: 1, puzzletisch: 1 }; s.i15 = 1; // Begrüßungspost ist schon lange da
  const n0 = s.mail.length;
  assert.equal(E.tick15(s), true, 'der Wandkalender kommt schon Ende November');
  assert.equal(s.mail.at(-1).item, 'adventskalender');
  assert.equal(E.tick15(s), false); assert.equal(s.mail.length, n0 + 1);
  E.setClock15(() => new Date(2026, 11, 3));
  assert.equal(E.adventWaiting(s, 'host'), 3);
  assert.ok(!act(s, { t: 'advent15', d: 4 }).ok, 'morgen erst');
  const m0 = s.money;
  assert.ok(act(s, { t: 'advent15', d: 2 }).ok);
  assert.equal(s.money, m0 + 300);
  assert.ok(!act(s, { t: 'advent15', d: 2 }).ok, 'nur einmal');
  assert.ok(act(s, { t: 'advent15', d: 2 }, P2).ok, 'die zweite Person hat ihre eigenen Türchen');
  assert.ok(act(s, { t: 'advent15', d: 1 }).ok, 'nachholen');
  assert.equal(s.pinv.host.kakao, 2);
  assert.equal(E.adventWaiting(s, 'host'), 1); assert.equal(E.adventWaiting(s, P2), 2);
  E.setClock15(() => new Date(2026, 11, 28));
  assert.equal(E.adventInfo().max, 24);
  const love0 = s.love.pts;
  const r = act(s, { t: 'advent15', d: 24 });
  assert.ok(r.ok);
  assert.equal(s.pinv.host.weihnachtspyramide, 1); assert.equal(s.pinv.host.lebkuchenhaus, 1);
  assert.ok(s.love.pts >= love0 + 10);
  assert.ok(!act(s, { t: 'advent15', d: 25 }).ok);
  E.setClock15(() => new Date(2027, 11, 1));
  assert.equal(E.adventWaiting(s, 'host'), 1, 'neues Jahr, neuer Kalender');
  assert.ok(act(s, { t: 'advent15', d: 1 }).ok);
  assert.equal(s.advent.y, 2027);
  E.setClock15(() => new Date(2026, 6, 1));
  assert.equal(E.adventInfo().on, false);
  E.setClock15();
});

test('Glückskeks: einer am Tag für jede:n, der erste bestimmt das Tagesglück der Insel', () => {
  const s = fresh(), m0 = s.money;
  const r = act(s, { t: 'cookie15' });
  assert.ok(r.ok); assert.ok(s.money > m0);
  assert.ok(E.LUCKS[s.luck.k]); assert.equal(E.luckOf(s), s.luck.k);
  assert.ok(E.FORTUNES[E.cookieOpen(s, 'host')]);
  assert.ok(!act(s, { t: 'cookie15' }).ok);
  const k = s.luck.k;
  assert.ok(act(s, { t: 'cookie15' }, P2).ok);
  assert.equal(s.luck.k, k, 'das Tagesglück bleibt');
  s.day++;
  assert.equal(E.luckOf(s), null);
  assert.equal(E.cookieOpen(s, 'host'), null);
  assert.ok(act(s, { t: 'cookie15' }).ok);
  assert.equal(new Set(E.FORTUNES).size, E.FORTUNES.length);
  // Herzensglück: anderthalbfach
  s.luck = { day: s.day, k: 'love' };
  const l0 = s.love.pts;
  const L = S.act(s, { t: 'tree15', op: 'note', txt: 'Hallo', name: 'S' }, 'host');
  assert.ok(L.ok); assert.equal(s.love.pts, l0 + 2);
});

test('Koi-Teich: zwei Wasser-Kacheln je Fisch, füttern, Nachwuchs, Teich darf nicht zu klein werden', () => {
  const s = fresh();
  assert.ok(!act(s, { t: 'koi15', op: 'buy', v: 'schnee' }).ok, 'ohne Teich kein Koi');
  const [x, z] = pond(s, 4);
  assert.equal(E.koiCap(s), 2);
  assert.ok(act(s, { t: 'koi15', op: 'buy', v: 'schnee' }).ok);
  assert.ok(!act(s, { t: 'koi15', op: 'buy', v: 'kirsch' }).ok, 'gezüchtete Sorten gibt es nicht zu kaufen');
  assert.ok(act(s, { t: 'koi15', op: 'buy', v: 'feuer' }).ok);
  assert.ok(!act(s, { t: 'koi15', op: 'buy', v: 'gold' }).ok, 'voll');
  assert.ok(!act(s, { t: 'terra14', x, z, k: null }).ok, 'Teich nicht unter die Fische wegbaggern');
  assert.ok(!act(s, { t: 'terra14', x, z, k: 'h' }).ok, 'auch nicht zum Hügel machen');
  assert.equal(S.resolve(s, { x: x + 1, z: z - 1, ry: 0 }, 'hand').ui, 'koi15');
  for (let i = 0; i < 4; i++) assert.ok(act(s, { t: 'terra14', x: x + i, z: z + 1, k: 'w' }).ok);
  assert.equal(E.koiCap(s), 4);
  assert.ok(act(s, { t: 'koi15', op: 'feed' }).ok);
  assert.ok(!act(s, { t: 'koi15', op: 'feed' }).ok);
  const l0 = s.love.pts;
  assert.ok(act(s, { t: 'koi15', op: 'feed' }, P2).ok);
  assert.ok(s.love.pts > l0, 'zusammen füttern gibt Herzpunkte');
  const rnd = Math.random;
  Math.random = () => 0.3; // Nachwuchs ja, keine Laune der Natur, Mischung ja
  s.day++; E.morningKoi(s);
  Math.random = rnd;
  assert.equal(s.koi.fish.length, 3);
  assert.ok(['kirsch', 'schnee', 'feuer'].includes(s.koi.fish[2].v));
  assert.equal(s.koi.news.day, s.day);
  assert.ok(act(s, { t: 'koi15', op: 'name', i: 0, name: 'Flöckchen' }).ok);
  assert.equal(s.koi.fish[0].n, 'Flöckchen');
  const m0 = s.money;
  assert.ok(act(s, { t: 'koi15', op: 'sell', i: 2 }).ok);
  assert.ok(s.money > m0); assert.equal(s.koi.fish.length, 2);
  // alle Mischungen führen zu echten Sorten, jede gezüchtete Sorte ist erreichbar
  for (const [k, v] of Object.entries(E.KOI_MIX)) { assert.ok(E.KOI[v], v); for (const p of k.split('+')) assert.ok(E.KOI[p], p); assert.equal(k, k.split('+').sort().join('+')); }
  for (const v of E.KOI_IDS) assert.ok(E.KOI[v][4] > 0 || v === 'nacht' || Object.values(E.KOI_MIX).includes(v), v);
  assert.equal(E.KOI_IDS.length, 12);
  // Belohnungen
  const n0 = s.mail.length;
  s.koi.fish = []; s.koi.book = { schnee: 1, feuer: 1, gold: 1, kirsch: 1 };
  for (let i = 0; i < 12; i++) act(s, { t: 'terra14', x: x + (i % 4), z: z + 2 + (i / 4 | 0), k: 'w' });
  s.koi.fish = [{ v: 'gold', b: 1 }, { v: 'feuer', b: 1 }]; s.koi.fed = { day: s.day, by: ['host', P2] };
  Math.random = () => 0.3; s.day++; E.morningKoi(s); Math.random = rnd;
  assert.equal(s.koi.fish.at(-1).v, 'sonne');
  assert.equal(s.mail.length, n0 + 1); assert.equal(s.mail.at(-1).item, 'koifahne');
});

test('Puzzle: vier Teile am Tag für jede:n, fertig gibt es das Bild für die Wand', () => {
  const s = fresh();
  assert.equal(E.puzzleLeft(s, 'host'), 4);
  for (let i = 0; i < 4; i++) assert.ok(act(s, { t: 'puzzle15', i }).ok);
  assert.ok(!act(s, { t: 'puzzle15', i: 4 }).ok, 'genug für heute');
  assert.ok(!act(s, { t: 'puzzle15', i: 0 }, P2).ok, 'liegt schon');
  for (let i = 4; i < 8; i++) assert.ok(act(s, { t: 'puzzle15', i }, P2).ok);
  assert.equal(E.puzzleLeft(s, P2), 0);
  let i = 8;
  while (i < 24) { s.day++; for (let k = 0; k < 4 && i < 24; k++) assert.ok(act(s, { t: 'puzzle15', i: i++ }).ok); }
  assert.equal(s.pinv.host.puzzlebild1, 1);
  assert.equal(s.puzzle.m, 1); assert.deepEqual(s.puzzle.got, []); assert.equal(s.puzzle.done, 1);
  assert.equal(E.PUZZLES.length, 6);
  for (let m = 0; m < 6; m++) assert.ok(FURNITURE[E.puzzleItem(m)]?.wall);
  assert.ok(!act(s, { t: 'puzzle15', i: 24 }).ok);
});

test('Schmuck: aus Edelsteinen geschmiedet, liegt in der Garderobe, lässt sich tragen', () => {
  const s = fresh();
  for (const [slot] of E.JEWEL_SLOTS) for (const j of E.JEWELS[slot]) { for (const id of Object.keys(j[2])) assert.ok(D.ITEMS[id], id); assert.ok(A.LOOKS[slot].some(o => o[0] === j[0]), j[0]); }
  assert.ok(!act(s, { t: 'jewel15', slot: 'neck', id: 'herzkette' }).ok, 'ohne Rubin geht nichts');
  s.pinv.host = { rubin: 2, eisen: 4, saphir: 1 };
  assert.ok(act(s, { t: 'jewel15', slot: 'neck', id: 'herzkette' }).ok);
  assert.equal(s.pinv.host.rubin, 1); assert.equal(s.pinv.host.eisen, 2);
  assert.ok(s.wardrobe.jw_herzkette);
  assert.ok(!act(s, { t: 'jewel15', slot: 'neck', id: 'herzkette' }).ok, 'schon da');
  assert.ok(!act(s, { t: 'jewel15', slot: 'ear', id: 'herzkette' }).ok, 'falscher Platz');
  const l0 = s.love.pts;
  assert.ok(act(s, { t: 'jewel15', slot: 'wrist', id: 'partnerband' }).ok);
  assert.ok(s.love.pts >= l0 + 15);
  const look = A.cleanLook({ ...A.defaultLook(), neck: 'herzkette', ear: 'goldringe', wrist: 'partnerband' });
  assert.equal(look.neck, 'herzkette'); assert.equal(look.wrist, 'partnerband');
  assert.equal(A.cleanLook({ neck: 'quatsch' }).neck, 'none');
  assert.equal(A.cleanLook({}).ear, 'none');
  for (let i = 0; i < 20; i++) { const r = A.randomLook(); assert.equal(r.neck, 'none'); assert.equal(r.wrist, 'none'); assert.ok(!E.COSTUMES.some(c => c[0] === r.hat)); }
});

test('Mühle: setzen, Mühle schließen, Stein nehmen, ziehen, springen – und der Nachbar spielt mit', () => {
  for (let i = 0; i < 24; i++) for (const j of E.MILL_ADJ[i]) assert.ok(E.MILL_ADJ[j].includes(i), `${i}-${j}`);
  assert.equal(E.MILLS.length, 16);
  for (const m of E.MILLS) { assert.ok(E.MILL_ADJ[m[0]].includes(m[1]) && E.MILL_ADJ[m[1]].includes(m[2]), m.join()); }
  for (let i = 0; i < 24; i++) assert.equal(E.MILLS.filter(m => m.includes(i)).length, 2);
  const s = fresh();
  assert.ok(act(s, { t: 'game', op: 'start', k: 'muehle', vs: P2, vsName: 'Adriana', name: 'Shawn' }).ok);
  const g = s.game, w = p => g.p[p].who;
  g.turn = 0;
  const put = (p, i) => assert.ok(act(s, { t: 'game', op: 'mplace', i }, w(p)).ok, `p${p} auf ${i}`);
  put(0, 0); put(1, 3); put(0, 1);
  assert.ok(!act(s, { t: 'game', op: 'mplace', i: 2 }, w(0)).ok, 'nicht dran');
  put(1, 4); put(0, 2);
  assert.equal(g.rm, true); assert.equal(g.turn, 0);
  assert.ok(!act(s, { t: 'game', op: 'mplace', i: 9 }, w(0)).ok, 'erst einen Stein nehmen');
  assert.ok(!act(s, { t: 'game', op: 'mtake', i: 0 }, w(0)).ok, 'keinen eigenen');
  assert.ok(act(s, { t: 'game', op: 'mtake', i: 4 }, w(0)).ok);
  assert.equal(g.b[4], -1); assert.equal(g.turn, 1); assert.equal(g.rm, false);
  assert.deepEqual(g.hand, [6, 7]);
  // Ziehen und Springen
  Object.assign(g, { b: Array(24).fill(-1), hand: [0, 0], turn: 0, rm: false });
  [0, 1, 9, 21].forEach(i => { g.b[i] = 0; }); [3, 4, 22].forEach(i => { g.b[i] = 1; });
  assert.ok(!act(s, { t: 'game', op: 'mmove', from: 0, to: 2 }, w(0)).ok, 'nur zum Nachbarpunkt');
  assert.ok(act(s, { t: 'game', op: 'mmove', from: 1, to: 2 }, w(0)).ok);
  assert.ok(E.millFly(g, 1));
  assert.ok(act(s, { t: 'game', op: 'mmove', from: 22, to: 5 }, w(1)).ok, 'mit drei Steinen springen');
  assert.equal(g.rm, true, 'Mühle 3-4-5');
  assert.ok(E.inMill(g.b, 9));
  assert.ok(!act(s, { t: 'game', op: 'mtake', i: 9 }, w(1)).ok, 'Steine in einer Mühle sind geschützt');
  assert.ok(act(s, { t: 'game', op: 'mtake', i: 2 }, w(1)).ok);
  // Gewinn: weniger als drei Steine
  Object.assign(g, { b: Array(24).fill(-1), hand: [0, 0], turn: 0, rm: false });
  [0, 1, 14, 21].forEach(i => { g.b[i] = 0; }); [3, 10, 18].forEach(i => { g.b[i] = 1; });
  assert.ok(act(s, { t: 'game', op: 'mmove', from: 14, to: 2 }, w(0)).ok);
  assert.ok(act(s, { t: 'game', op: 'mtake', i: 3 }, w(0)).ok, 'stehen nur Mühlen da, darf man auch daraus nehmen');
  assert.equal(g.win, 0, 'mit zwei Steinen ist die Partie verloren');
  // gegen einen Nachbarn: das Spiel läuft bis zum Ende durch, ohne hängen zu bleiben
  for (let round = 0; round < 6; round++) {
    s.game = null;
    assert.ok(act(s, { t: 'game', op: 'start', k: 'muehle', vs: 'npc:wanda', name: 'Shawn' }).ok);
    let n = 0;
    while (s.game.win == null && n++ < 900) {
      const q = s.game, cur = q.p[q.turn];
      if (cur.npc) assert.ok(act(s, { t: 'game', op: 'ai' }).ok, 'Nachbar zieht');
      else if (q.rm) assert.ok(act(s, { t: 'game', op: 'mtake', i: E.millTakes(q, q.turn)[0] }).ok);
      else { const mv = E.millMoves(q, q.turn), [f, to] = mv[Math.floor(Math.random() * mv.length)]; assert.ok(act(s, f < 0 ? { t: 'game', op: 'mplace', i: to } : { t: 'game', op: 'mmove', from: f, to }).ok); }
    }
    assert.ok(s.game.win != null, 'Partie zu Ende');
  }
  assert.equal(G.gameName('muehle'), 'Mühle');
});

test('Würfelglück: fünf Runden, zweimal nachwürfeln, Wertung', () => {
  assert.equal(E.diceScore([6, 6, 6, 6, 6]).pts, 80);
  assert.equal(E.diceScore([1, 2, 3, 4, 5]).pts, 45);
  assert.equal(E.diceScore([2, 3, 4, 5, 6]).name, 'Straße');
  assert.equal(E.diceScore([3, 3, 3, 3, 1]).pts, 13 + 25);
  assert.equal(E.diceScore([2, 2, 2, 5, 5]).pts, 16 + 20);
  assert.equal(E.diceScore([4, 4, 4, 1, 2]).pts, 15 + 10);
  assert.equal(E.diceScore([1, 1, 3, 3, 6]).pts, 14 + 5);
  assert.equal(E.diceScore([1, 2, 3, 5, 6]).pts, 17);
  const s = fresh();
  assert.ok(act(s, { t: 'game', op: 'start', k: 'dice', vs: 'npc:lio', name: 'Shawn' }).ok);
  let n = 0;
  while (s.game.win == null && n++ < 200) {
    const g = s.game, cur = g.p[g.turn];
    if (cur.npc) { assert.ok(act(s, { t: 'game', op: 'ai' }).ok); continue; }
    assert.ok(!act(s, { t: 'game', op: 'dbank' }).ok, 'erst würfeln');
    assert.ok(act(s, { t: 'game', op: 'droll' }).ok);
    assert.ok(g.d.every(v => v >= 1 && v <= 6)); assert.equal(g.left, 2);
    const keep = g.d.slice();
    assert.ok(act(s, { t: 'game', op: 'droll', hold: [1, 1, 0, 0, 0] }).ok);
    assert.equal(g.d[0], keep[0]); assert.equal(g.d[1], keep[1]);
    assert.ok(!act(s, { t: 'game', op: 'droll', hold: [1, 1, 1, 1, 1] }).ok, 'alle halten ist kein Wurf');
    assert.ok(act(s, { t: 'game', op: 'droll', hold: [1, 1, 1, 0, 0] }).ok);
    assert.ok(!act(s, { t: 'game', op: 'droll', hold: [] }).ok, 'kein vierter Wurf');
    assert.ok(act(s, { t: 'game', op: 'dbank' }).ok);
  }
  assert.ok(s.game.win != null);
  assert.deepEqual(s.game.rd, [5, 5]);
  assert.ok(s.game.score[0] > 0 && s.game.score[1] > 0);
  assert.ok(s.stats.games >= 1);
});

test('Federball: abwechselnd schlagen, Rekord zu zweit, einmal am Tag Herzpunkte', () => {
  const s = fresh();
  s.pinv.host = { federballnetz: 1 };
  let at = null;
  for (let z = -6; z < 14 && !at; z++) for (let x = -14; x < 14 && !at; x++) if (S.canPlaceItem(s, 'federballnetz', x, z)) at = [x, z];
  assert.ok(act(s, { t: 'place', x: at[0], z: at[1], item: 'federballnetz', r: 0 }).ok);
  assert.equal(S.resolve(s, { x: at[0], z: at[1] - 1, ry: 0 }, 'hand').ui, 'rally15');
  assert.ok(D.PLACE.federballnetz.buy > 0);
  assert.ok(act(s, { t: 'rally15', op: 'start', vs: P2, vsName: 'Adriana', name: 'Shawn' }).ok);
  assert.ok(!act(s, { t: 'rally15', op: 'hit' }, P2).ok, 'Aufschlag hat, wer angefangen hat');
  const m0 = s.money, l0 = s.love.pts;
  for (let i = 0; i < 12; i++) assert.ok(act(s, { t: 'rally15', op: 'hit' }, i % 2 ? P2 : 'host').ok);
  assert.ok(!act(s, { t: 'rally15', op: 'hit' }, P2).ok);
  assert.ok(act(s, { t: 'rally15', op: 'miss' }).ok);
  assert.equal(s.rally.best, 12); assert.equal(s.rally.on, 0);
  assert.equal(s.money, m0 + 200); assert.ok(s.love.pts > l0);
  assert.ok(act(s, { t: 'rally15', op: 'start', vs: P2, vsName: 'Adriana', name: 'Shawn' }).ok);
  for (let i = 0; i < 10; i++) act(s, { t: 'rally15', op: 'hit' }, i % 2 ? P2 : 'host');
  act(s, { t: 'rally15', op: 'miss' }, P2);
  assert.equal(s.money, m0 + 200, 'Belohnung nur einmal am Tag'); assert.equal(s.rally.best, 12);
  // allein üben
  assert.ok(act(s, { t: 'rally15', op: 'start', vs: 'solo', name: 'Shawn' }).ok);
  for (let i = 0; i < 5; i++) assert.ok(act(s, { t: 'rally15', op: 'hit' }).ok);
  assert.ok(act(s, { t: 'rally15', op: 'miss' }).ok);
  assert.equal(s.rally.solo, 5); assert.equal(s.rally.best, 12);
});

test('Kostümfest: Kürbisse schnitzen, Bonbons sammeln, Kostüme eintauschen', () => {
  const s = fresh();
  for (const [f] of E.FACES) assert.ok(D.PLACE[E.carvedId(f)]?.glow, f);
  for (const [id] of E.COSTUMES) { assert.ok(A.LOOKS.hat.some(o => o[0] === id), id); assert.ok(A.PREMIUM_HATS.includes(id), id); }
  assert.ok(!act(s, { t: 'carve15', face: 'froh' }).ok, 'ohne Kürbis');
  s.pinv.host = { kuerbis: 5 };
  assert.ok(act(s, { t: 'carve15', face: 'herz' }).ok);
  assert.equal(s.pinv.host.schnitzkuerbis_herz, 1); assert.equal(s.pinv.host.kuerbis, 4);
  assert.equal(s.pinv.host.bonbon || 0, 0, 'Bonbons nur am Festtag');
  s.fest = { k: 'kuerbis', day: s.day, candy: [], done: 0 };
  assert.equal(E.candyBonus(s), 0);
  for (let i = 0; i < 4; i++) assert.ok(act(s, { t: 'carve15', face: 'grusel' }).ok);
  assert.equal(s.pinv.host.bonbon, 6, 'höchstens drei Kürbisse bringen Bonbons');
  assert.equal(E.candyBonus(s), 1);
  assert.ok(act(s, { t: 'costume15', id: 'hexenhut' }).ok, 'sechs Bonbons reichen für den Hexenhut');
  assert.ok(s.wardrobe.hexenhut); assert.equal(s.pinv.host.bonbon || 0, 0);
  assert.ok(!act(s, { t: 'costume15', id: 'hexenhut' }).ok);
  assert.ok(!act(s, { t: 'costume15', id: 'kuerbishut' }).ok, 'keine Bonbons mehr');
  assert.equal(A.cleanLook({ hat: 'hexenhut' }).hat, 'hexenhut');
});

test('Erinnerungsbaum: wächst mit den Tagen, doppelt an gemeinsamen; Anhänger und Zettel', () => {
  const s = fresh();
  assert.equal(E.treeStage(s), 0);
  act(s, { t: 'cookie15' });
  assert.equal(s.tree.days, 0, 'allein ist kein gemeinsamer Tag');
  act(s, { t: 'cookie15' }, P2);
  assert.equal(s.tree.days, 1);
  act(s, { t: 'cookie15' }, P2); act(s, { t: 'koi15', op: 'feed' });
  assert.equal(s.tree.days, 1, 'ein Tag zählt nur einmal');
  assert.ok(E.treeMarks(s).some(m => m[0] === 'd1'));
  s.day = 30;
  assert.equal(E.treePts(s), 32); assert.equal(E.treeStage(s), 1); assert.equal(E.treeNext(s), 50);
  s.tree.days = 100; s.day = 60;
  assert.equal(E.treeStage(s), 4);
  assert.ok(act(s, { t: 'tree15', op: 'note', txt: '  Unser erster   Abend am Meer  ', name: 'Shawn' }).ok);
  assert.equal(s.tree.notes[0].t, 'Unser erster Abend am Meer');
  assert.ok(!act(s, { t: 'tree15', op: 'note', txt: 'noch einer', name: 'Shawn' }).ok, 'ein Zettel am Tag');
  assert.ok(act(s, { t: 'tree15', op: 'note', txt: 'x'.repeat(200), name: 'Adriana' }, P2).ok);
  assert.equal(s.tree.notes[1].t.length, E.NOTE_LEN);
  assert.ok(!act(s, { t: 'tree15', op: 'del', i: 0 }, P2).ok, 'fremde Zettel bleiben hängen');
  assert.ok(act(s, { t: 'tree15', op: 'del', i: 1 }, P2).ok);
  assert.equal(s.tree.notes.length, 1);
  s.pinv.host = { erinnerungsbaum: 1 };
  let at = null;
  for (let z = -6; z < 14 && !at; z++) for (let x = -14; x < 14 && !at; x++) if (S.canPlaceItem(s, 'erinnerungsbaum', x, z)) at = [x, z];
  assert.ok(act(s, { t: 'place', x: at[0], z: at[1], item: 'erinnerungsbaum', r: 0 }).ok);
  assert.equal(E.treePlaced(s), at.join());
  assert.equal(S.resolve(s, { x: at[0], z: at[1] - 1, ry: 0 }, 'hand').ui, 'tree15');
  assert.equal(new Set(E.TREE_MARKS.map(m => m[0])).size, E.TREE_MARKS.length);
});

test('Polaroid-Wand: sechs Plätze, kleine Bilder, beim ersten Mal gibt es den Rahmen', () => {
  const s = fresh(), img = 'data:image/jpeg;base64,' + 'A'.repeat(3000);
  assert.ok(!act(s, { t: 'pola15', op: 'set', slot: 7, img }).ok);
  assert.ok(!act(s, { t: 'pola15', op: 'set', slot: 1, img: 'data:image/png;base64,AAAA' }).ok, 'nur JPEG');
  assert.ok(!act(s, { t: 'pola15', op: 'set', slot: 1, img: 'data:image/jpeg;base64,' + 'A'.repeat(E.POLA_MAX) }).ok, 'zu groß');
  assert.ok(!act(s, { t: 'pola15', op: 'set', slot: 1, img: 'data:image/jpeg;base64,<script>' }).ok);
  assert.ok(act(s, { t: 'pola15', op: 'set', slot: 2, img, cap: '  Am   Strand mit dir und noch viel mehr Text ' }).ok);
  assert.equal(s.pola.img[2], img); assert.equal(s.pola.cap[2], 'Am Strand mit dir');
  assert.equal(s.pinv.host.polaroid2, 1);
  assert.ok(act(s, { t: 'pola15', op: 'set', slot: 2, img: img + 'B' }).ok);
  assert.equal(s.pinv.host.polaroid2, 1, 'den Rahmen gibt es nur einmal');
  assert.equal(s.pola.cap[2], undefined);
  assert.ok(act(s, { t: 'pola15', op: 'cap', slot: 2, cap: 'Sommer' }).ok);
  assert.equal(E.polaSlot('polaroid2'), 2); assert.equal(E.polaSlot('polaroid7'), 0); assert.equal(E.polaSlot('sofa'), 0);
  for (let n = 1; n <= 6; n++) assert.ok(FURNITURE['polaroid' + n]?.wall);
  const back = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(back.pola.img[2], img + 'B');
});

test('Tagesglück wirkt: Sternchen doppelt, Trinkgeld doppelt', () => {
  const s = fresh();
  s.luck = { day: s.day, k: 'stars' };
  assert.equal(E.lucky(s, 'stars'), true); assert.equal(E.lucky(s, 'fish'), false);
  s.luck = { day: s.day - 1, k: 'stars' };
  assert.equal(E.lucky(s, 'stars'), false, 'gilt nur heute');
});

test('Modelle: alles Neue hat ein Modell und passt auf seine Kachel', () => {
  const box = parts => { const g = merge(Array.isArray(parts[0]) ? [...parts[0], ...parts[1]] : parts); g.computeBoundingBox(); return g.boundingBox; };
  for (const [k, fn] of Object.entries(M15.PLACE_15)) {
    assert.ok(D.PLACE[k], k);
    const b = box(fn());
    assert.ok(b.min.y > -0.02, `${k} steht auf dem Boden`);
    if (k !== 'erinnerungsbaum') assert.ok(b.max.x < 0.62 && b.min.x > -0.62 && b.max.z < 0.62 && b.min.z > -0.62, `${k} passt auf die Kachel`);
  }
  for (const [k, fn] of Object.entries(M15.FURN_15)) {
    assert.ok(FURNITURE[k], k);
    const b = box(fn());
    assert.ok(b.max.x < 0.56 && b.min.x > -0.56 && b.min.z > -0.52 && b.max.z < 0.52, `${k} passt auf die Kachel`);
    if (FURNITURE[k].wall) assert.ok(b.max.z < -0.2 && b.min.y > 0.9, `${k} hängt an der Wand`);
  }
  for (const id of ['federballnetz', 'erinnerungsbaum', 'koifahne', 'koistatue', 'lebkuchenhaus', 'schnitzkuerbis_froh', 'schnitzkuerbis_grusel', 'schnitzkuerbis_herz']) assert.ok(M15.PLACE_15[id], id);
  for (const id of ['puzzletisch', 'adventskalender', 'nikolausstiefel', 'nussknacker', 'adventsstern', 'weihnachtspyramide']) assert.ok(M15.FURN_15[id], id);
  for (let st = 0; st < 5; st++) for (const sea of ['spring', 'summer', 'autumn', 'winter']) assert.ok(M15.memTreeParts(st, sea).length >= 3);
  assert.ok(M15.treeHangParts(4, 15, 8).length === 46);
  for (const v of E.KOI_IDS) { const b = box(M15.koiParts(E.KOI[v][2], E.KOI[v][3], v)); assert.ok(b.max.z - b.min.z < 0.5, v); }
});

test('Erinnerungsbaum und Puzzletisch gehen nicht verloren: unverkäuflich bzw. kommen per Post zurück', () => {
  E.setClock15(() => new Date(2026, 5, 10));
  const s = fresh();
  E.tick15(s);
  assert.equal(E.tick15(s), false, 'liegt in der Post: nichts zu tun');
  while (s.mail.length) assert.ok(act(s, { t: 'mail', i: 0 }).ok);
  assert.equal(s.pinv.host.erinnerungsbaum, 1);
  assert.equal(E.tick15(s), false, 'liegt in der Tasche');
  assert.ok(!act(s, { t: 'sell', id: 'erinnerungsbaum', n: 1 }).ok, 'der Baum lässt sich nicht verkaufen');
  assert.equal(S.price(s, 'schnitzkuerbis_froh'), 400);
  s.pinv.host.erinnerungsbaum = 0; delete s.pinv.host.puzzletisch; // verschenkt …
  assert.equal(E.tick15(s), true);
  assert.deepEqual(s.mail.map(m => m.item), ['erinnerungsbaum', 'puzzletisch']);
  assert.equal(E.tick15(s), false, 'nur einmal');
  // aufgestellt und eingerichtet zählt als vorhanden
  s.mail = []; s.obj['3,3'] = { k: 'erinnerungsbaum', r: 0 }; s.home.items['0,0'] = { k: 'puzzletisch', r: 0 };
  assert.equal(E.tick15(s), false);
  delete s.home.items['0,0']; (s.xrooms ||= {}).attic = { items: { '1,1': { k: 'puzzletisch', r: 0 } }, rugs: {}, walls: {} };
  assert.equal(E.owns15(s, 'puzzletisch'), true, 'auch auf dem Dachboden');
  E.setClock15();
});

test('Unsinnige Angaben (auch Namen wie „toString“) bringen den Host nicht aus dem Tritt', () => {
  const s = fresh(), odd = ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'length', '', null, undefined, -1, 1e9, NaN, {}, []];
  s.snowmen = { '3,3': { lv: 3, deco: {} } };
  const tries = v => [{ t: 'jewel15', slot: v, id: v }, { t: 'salon14', kind: v, id: v }, { t: 'ext14', k: v, v }, { t: 'terra14', x: 2, z: 2, k: v }, { t: 'lock14', c: v, txt: 'x' },
    { t: 'pet14', op: 'bow', i: v }, { t: 'snow14', op: 'deco', x: 3, z: 3, part: v }, { t: 'tale', id: v }, { t: 'wild', id: v, item: v }, { t: 'koi15', op: 'buy', v }, { t: 'koi15', op: v, i: v },
    { t: 'costume15', id: v }, { t: 'carve15', face: v }, { t: 'pola15', op: 'set', slot: v, img: v }, { t: 'tree15', op: 'note', txt: v }, { t: 'tree15', op: 'del', i: v }, { t: 'puzzle15', i: v },
    { t: 'advent15', d: v }, { t: 'rally15', op: v, vs: v }, { t: 'game', op: 'start', k: v, vs: v }, { t: 'hplace', x: 0, z: 0, item: 'puzzletisch', room: v }, { t: 'hpick', x: 0, z: 0, room: v }];
  for (const v of odd) for (const a of tries(v)) assert.doesNotThrow(() => act(s, a), JSON.stringify(a));
  assert.ok(Number.isFinite(s.money), 'das Geld bleibt eine Zahl');
  assert.doesNotThrow(() => S.roomOf(s, 'toString'));
  assert.notEqual(S.roomOf(s, 'toString').items, s.home.items, 'unbekanntes Zimmer ist nicht das eigene Zuhause');
  assert.equal(typeof S.roomOf(s, 'toString').items, 'object');
  JSON.parse(JSON.stringify(s));
});
