// Inselleben 14 „Lieblingsplätze“: Wege, Gelände (Teiche, Hügel, Stege, Treppen), Laternen, Hausfassade, Liebesschlösser,
// Kuscheln zu zweit, der Hase, Schneemänner, Sternschnuppen, Saisonkatalog, Lieferdienst, Salon, Sträuße & Kränze.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const S = await import('../src/state.js');
const E = await import('../src/extras14.js');
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const { BIND } = await import('../src/features/love.js');
const M14 = await import('../src/models-14.js');
const { merge } = await import('../src/models.js');
const A = await import('../src/avatar.js');
const I = await import('../src/island.js');

const fresh = () => { const s = S.migrate(S.newFarm()); s.money = 50000; return s; };
const act = (s, a, who = 'host') => S.act(s, a, who);
// drei freie Graskacheln nebeneinander (für Teich, Hügel, Treppe)
function spot(s, n = 4) {
  for (let z = -6; z < 14; z++) for (let x = -14; x < 14; x++) { let ok = true; for (let i = 0; i < n && ok; i++) for (let j = 0; j < 2 && ok; j++) ok = E.terraOk(s, x + i, z + j); if (ok) return [x, z]; }
  throw new Error('kein Platz');
}

test('Wege: zehn Sorten, die neuen lassen sich legen und wieder entfernen', () => {
  assert.equal(Object.keys(D.PAVE).length, 10);
  const s = fresh(), [x, z] = spot(s);
  for (const k of ['kies', 'sandstein', 'kopfstein', 'mosaik']) { assert.ok(D.PAVE[k].name); assert.ok(act(s, { t: 'pave', x, z, k }).ok, k); assert.equal(s.paths[x + ',' + z], k); }
  assert.ok(act(s, { t: 'pave', x, z, k: null }).ok);
});

test('Gelände: Wasser versperrt, Steg macht es begehbar; auf Hügel nur über die Treppe', () => {
  const s = fresh(), [x, z] = spot(s), m0 = s.money;
  assert.ok(act(s, { t: 'terra14', x, z, k: 'w' }).ok);
  assert.equal(s.money, m0 - E.TERRA_COST.w);
  assert.equal(S.blocked(s, x, z), true); assert.equal(S.canPlace(s, x, z), false);
  assert.ok(!act(s, { t: 'pave', x, z, k: 'kies' }).ok, 'kein Weg im Wasser');
  s.pinv.host = { holzbruecke: 1, holztreppe: 1, zaun: 2, pilztisch: 1, s_tulpe: 1 };
  assert.ok(!act(s, { t: 'place', x, z, item: 'zaun', r: 0 }).ok, 'kein Zaun im Wasser');
  assert.ok(!act(s, { t: 'place', x: x + 1, z, item: 'holzbruecke', r: 0 }).ok, 'Steg nur aufs Wasser');
  assert.ok(act(s, { t: 'place', x, z, item: 'holzbruecke', r: 0 }).ok);
  assert.equal(S.blocked(s, x, z), false, 'über den Steg kann man gehen');
  assert.ok(!act(s, { t: 'terra14', x, z, k: null }).ok, 'erst den Steg wegräumen');
  // Hügel + Treppe
  assert.ok(act(s, { t: 'terra14', x: x + 2, z, k: 'h' }).ok);
  assert.equal(S.blocked(s, x + 2, z), false);
  assert.equal(E.terraY(s, x + 2, z), E.HILL_H);
  assert.equal(E.terraPass(s, x + 3, z, x + 2, z), false, 'vom Boden nicht direkt auf den Hügel');
  assert.ok(act(s, { t: 'place', x: x + 2, z: z + 1, item: 'holztreppe', r: 2 }).ok); // steigt nach Norden (−z)
  assert.equal(E.terraPass(s, x + 2, z + 2, x + 2, z + 1), true);
  assert.equal(E.terraPass(s, x + 2, z + 1, x + 2, z), true, 'über die Treppe geht es hinauf');
  assert.ok(E.terraY(s, x + 2, z + 1.4) < 0.1 && E.terraY(s, x + 2, z + 0.6) > E.HILL_H - 0.1, 'Treppe steigt an');
  assert.ok(act(s, { t: 'place', x: x + 2, z, item: 'pilztisch', r: 0 }).ok, 'Deko darf auf den Hügel');
  assert.ok(!act(s, { t: 'plant', x: x + 2, z, item: 's_tulpe' }).ok, 'nichts pflanzen auf dem Hügel');
  assert.equal(E.resolveTerra(s, 'w', x + 1, z).a.t, 'terra14');
  assert.ok(E.resolveTerra(s, 'none', x, z).bad);
  // alter Stand: nichts geht verloren, kaputte Einträge fliegen raus
  const old = S.newFarm(); old.money = 4321; old.terra = { '1,1': 'x', '2,2': 'w' };
  const m = S.migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(m.money, 4321); assert.deepEqual(m.terra, { '2,2': 'w' });
});

test('Neue Stücke: jedes hat einen Gegenstand und ein Modell in Kachelgröße; Laternen leuchten', () => {
  for (const [id, fn] of Object.entries(M14.PLACE_14)) {
    const p = D.PLACE[id];
    assert.ok(p && D.ITEMS[id], id);
    const r = fn(), [a, gl] = Array.isArray(r[0]) ? r : [r, []], g = merge([...a, ...gl]); g.computeBoundingBox(); const b = g.boundingBox;
    assert.ok(b.min.x > -0.72 && b.max.x < 0.72 && b.min.z > -0.72 && b.max.z < 0.72 && b.min.y > -0.06 && b.max.y < 3, `${id}: ${[b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map(v => v.toFixed(2))}`);
    if (p.glow) assert.ok(gl.length, `${id} hat Leuchtteile`);
    if (p.light) assert.ok(p.glow && p.light > 1 && p.light < 4, id);
  }
  for (const [id, fn] of Object.entries(M14.FURN_14)) {
    const f = FURNITURE[id];
    assert.ok(f && D.ITEMS[id]?.furn === id, id);
    const r = fn(), [a, gl] = Array.isArray(r[0]) ? r : [r, []], g = merge([...a, ...gl]); g.computeBoundingBox(); const b = g.boundingBox, w = f.w / 2 + 0.12, d = f.d / 2 + 0.12;
    assert.ok(b.min.x > -w && b.max.x < w && b.min.z > -d && b.max.z < d && b.min.y > -0.06 && b.max.y < 2.35, `${id}: ${[b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map(v => v.toFixed(2))}`);
    if (f.rug) assert.ok(b.max.y < 0.12, `${id}: flach`);
    if (f.wall) assert.ok(b.max.z < 0 && b.min.y > 0.6, `${id}: an der Wand`);
    if (f.glow) assert.ok(gl.length, `${id} hat Leuchtteile`);
  }
  for (const id of ['strassenlaterne', 'doppellaterne', 'wegleuchte', 'lampionpfahl']) assert.ok(D.PLACE[id].buy > 0 && D.PLACE[id].light);
  for (const id of ['holzbruecke', 'steinbruecke']) assert.ok(D.PLACE[id].bridge && D.PLACE[id].buy > 0);
  for (const id of ['holztreppe', 'steintreppe']) assert.ok(D.PLACE[id].ramp && D.PLACE[id].buy > 0);
});

test('Hausfassade: Farben kosten, „wie gebaut“ ist gratis, der Türkranz kommt aus der Tasche', () => {
  const s = fresh(), m0 = s.money;
  assert.ok(act(s, { t: 'ext14', k: 'roof', v: 'lila' }).ok); assert.equal(s.money, m0 - E.EXT_COST);
  assert.ok(!act(s, { t: 'ext14', k: 'roof', v: 'lila' }).ok);
  assert.ok(act(s, { t: 'ext14', k: 'roof', v: '' }).ok); assert.equal(s.money, m0 - E.EXT_COST);
  assert.ok(!act(s, { t: 'ext14', k: 'door', v: 'neon' }).ok);
  assert.ok(act(s, { t: 'ext14', k: 'nr', v: 250 }).ok); assert.equal(s.home.ext.nr, 99);
  assert.ok(!act(s, { t: 'ext14', k: 'wreath', v: 'kranz_sommer' }).ok, 'erst einen Kranz binden');
  s.pinv.host = { kranz_sommer: 1, kranz_winter: 1 };
  assert.ok(act(s, { t: 'ext14', k: 'wreath', v: 'kranz_sommer' }).ok); assert.equal(s.pinv.host.kranz_sommer, undefined);
  assert.ok(act(s, { t: 'ext14', k: 'wreath', v: 'kranz_winter' }).ok); assert.equal(s.pinv.host.kranz_sommer, 1, 'der alte Kranz kommt zurück');
  for (const k of Object.keys(E.EXT)) assert.equal(E.EXT[k][0][0], '');
});

test('Liebesschlösser: eins am Tag pro Person, kostet Taler, bringt Herzpunkte', () => {
  const s = fresh(), m0 = s.money, love0 = s.love?.pts || 0;
  assert.ok(act(s, { t: 'lock14', c: 1, txt: 'S+A<script>' }).ok);
  assert.equal(s.locks[0].t, 'S+Ascri'); assert.equal(s.money, m0 - E.LOCK_COST); assert.equal((s.love?.pts || 0), love0 + 4);
  assert.ok(!act(s, { t: 'lock14', c: 2, txt: 'x' }).ok, 'heute schon eins');
  assert.ok(act(s, { t: 'lock14', c: 2, txt: 'A' }, 'u_abc123').ok, 'die andere Person darf auch');
  assert.ok(!act(s, { t: 'lock14', c: 99 }, 'u_zzz999').ok);
  assert.ok(E.onLockBridge(I.riverX(E.LOCK_BRIDGE), E.LOCK_BRIDGE) && !E.onLockBridge(I.riverX(E.LOCK_BRIDGE) + 6, E.LOCK_BRIDGE));
});

test('Kuscheln zu zweit: Hängesessel, Hängematte und Sternguck-Decke – einmal am Tag Herzpunkte', () => {
  const s = fresh(), [x, z] = spot(s);
  for (const id of ['kuschelschaukel', 'doppelhaengematte', 'sternendecke']) assert.ok(D.PLACE[id].sit && D.PLACE[id].cuddle && D.PLACE[id].buy > 0, id);
  assert.ok(!act(s, { t: 'cuddle14', x, z }).ok);
  s.obj[x + ',' + z] = { k: 'kuschelschaukel', r: 0 };
  const r = S.resolve(s, { x, z: z + 1, ry: Math.PI }, 'hand', { x, z });
  assert.equal(r.sit?.two, 1); assert.match(r.label, /Einkuscheln/);
  const love0 = s.love?.pts || 0;
  assert.ok(act(s, { t: 'cuddle14', x, z }).ok); assert.equal(s.love.pts, love0 + 3);
  assert.ok(!act(s, { t: 'cuddle14', x, z }).ok, 'nur einmal am Tag');
});

test('Der Hase: fünf Tage füttern, dann zieht er ein – streicheln, Name, Schleife, Spaziergang', () => {
  const s = fresh(); s.dayTime = 0.3; s.pinv.host = { karotte: 9 };
  assert.ok(Array.isArray(s.pet14.at) && !s.pet14.in);
  const near = () => S.resolve(s, { x: s.pet14.at[0], z: s.pet14.at[1] + 0.9, ry: Math.PI }, 'hand', null);
  assert.equal(near().a?.op, 'feed');
  for (let i = 1; i <= E.RABBIT_TAME; i++) {
    assert.ok(act(s, { t: 'pet14', op: 'feed', item: 'karotte' }).ok, 'Tag ' + i);
    assert.ok(!act(s, { t: 'pet14', op: 'feed', item: 'karotte' }).ok, 'nur einmal am Tag');
    if (i < E.RABBIT_TAME) { s.day++; E.morning14(s); }
  }
  assert.ok(s.pet14.in); assert.ok(s.mail.some(m => /Hase zieht ein/.test(m.title)));
  assert.equal(near().ui, 'pet14');
  assert.ok(act(s, { t: 'pet14', op: 'pet' }).ok); assert.ok(!act(s, { t: 'pet14', op: 'pet' }).ok); assert.ok(act(s, { t: 'pet14', op: 'pet' }, 'u_abc123').ok);
  assert.ok(act(s, { t: 'pet14', op: 'name', name: 'Mümmel <b>' }).ok); assert.equal(E.rabbitName(s), 'Mümmel b');
  assert.ok(act(s, { t: 'pet14', op: 'bow', i: 2 }).ok); assert.ok(!act(s, { t: 'pet14', op: 'bow', i: 99 }).ok);
  assert.ok(act(s, { t: 'pet14', op: 'follow', on: true }).ok); assert.equal(s.pet14.follow, 'host');
  s.day++; E.morning14(s); assert.equal(s.pet14.follow, null, 'morgens ist er wieder beim Haus');
  s.dayTime = 0.95; assert.equal(E.rabbitAwake(s), false);
});

test('Schneemänner: nur im Winter – Kugeln rollen, schmücken, Nachbarn bewerten; im Frühling schmelzen sie', () => {
  const s = fresh(); s.day = 22; E.morning14(s);
  assert.ok(E.isWinter(s)); assert.equal(s.snowpiles.length, E.SNOW_PILES);
  const P = () => s.snowpiles[0].split(',').map(Number);
  let [x, z] = P();
  assert.equal(S.resolve(s, { x, z: z + 0.9, ry: Math.PI }, 'hand', null).a?.op, 'start');
  assert.ok(act(s, { t: 'snow14', op: 'start', x, z, name: 'Adriana' }).ok);
  assert.equal(S.blocked(s, x, z), true, 'der Schneemann steht im Weg');
  for (let lv = 2; lv <= 3; lv++) { const [px, pz] = P(); assert.equal(S.resolve(s, { x: px, z: pz + 0.9, ry: Math.PI }, 'hand', null).a?.op, 'roll'); assert.ok(act(s, { t: 'snow14', op: 'roll', x: px, z: pz }).ok); assert.ok(act(s, { t: 'snow14', op: 'grow', x, z }).ok); assert.equal(s.snowmen[x + ',' + z].lv, lv); }
  assert.ok(!act(s, { t: 'snow14', op: 'grow', x, z }).ok);
  assert.equal(E.rateStars('snow', s.snowmen[x + ',' + z]), 3);
  s.pinv.host = { karotte: 1, stein: 1, ast: 1, wolle: 2 };
  for (const p of Object.keys(E.SNOW_PARTS)) assert.ok(act(s, { t: 'snow14', op: 'deco', x, z, part: p }).ok, p);
  assert.ok(!act(s, { t: 'snow14', op: 'deco', x, z, part: 'nose' }).ok);
  const m0 = s.money, r = act(s, { t: 'rate14', kind: 'snow', k: x + ',' + z });
  assert.ok(r.ok && r.rate14.stars === 5 && r.rate14.lines.length === 3); assert.equal(s.money, m0 + 200);
  assert.ok(!act(s, { t: 'rate14', kind: 'snow', k: x + ',' + z }).ok, 'einmal am Tag');
  s.day = 29; E.morning14(s);
  assert.deepEqual(s.snowmen, {}); assert.deepEqual(s.snowpiles, []);
  assert.ok(!act(s, { t: 'snow14', op: 'start', x, z }).ok);
  // Sandburgen lassen sich genauso bewerten
  s.castles = { '0,0': { lv: 5, sh: ['muschel', 'muschel'], by: 'host', name: 'A' } };
  assert.ok(act(s, { t: 'rate14', kind: 'castle', k: '0,0' }).ok);
});

test('Sternschnuppen: jeden Freitag, einmal je Jahreszeit ein Schauer, gemeinsames Wünschen bringt Post', () => {
  const s = fresh();
  s.day = 6; s.weather = 'sun'; s.starNight = false; E.morning14(s);
  assert.equal(D.WEEKDAYS[D.weekday(6)], 'Freitag'); assert.equal(s.starNight, true); assert.equal(s.starShower, false);
  s.day = 4; s.starNight = false; E.morning14(s); assert.ok(s.starNight && s.starShower);
  s.day = 4; s.weather = 'rain'; s.starNight = false; E.morning14(s); assert.ok(!s.starNight && !s.starShower);
  s.weather = 'sun'; s.starNight = true; s.starShower = true; s.dayTime = 0.9; s.wishes = 25;
  assert.ok(act(s, { t: 'wish' }).ok, 'im Schauer bis zu 40 Wünsche'); assert.ok(act(s, { t: 'wish' }, 'u_abc123').ok);
  const mails = s.mail.length; s.day++; E.morning14(s);
  assert.ok(s.mail.length > mails && s.mail.some(m => /Zwillingsstern/.test(m.title)));
});

test('Saisonkatalog: zehn Sachen je Jahreszeit, nur dann zu kaufen', () => {
  const all = Object.values(E.SCAT).flat();
  assert.deepEqual(Object.keys(E.SCAT), D.SEASON_IDS); assert.equal(all.length, 40); assert.equal(new Set(all).size, 40);
  for (const id of all) { assert.ok(E.scatInfo(id) && D.ITEMS[id] && E.scatPrice(id) > 0, id); assert.ok(!(E.scatInfo(id).buy > 0), `${id} gibt es nicht im normalen Laden`); assert.ok(M14.PLACE_14[id] || M14.FURN_14[id], id); }
  const s = fresh(), sea = S.seasonOf(s.day), other = D.SEASON_IDS.find(k => k !== sea), id = E.SCAT[sea][0], m0 = s.money;
  assert.ok(act(s, { t: 'scat14', id }).ok); assert.equal(s.pinv.host[id], 1); assert.equal(s.money, m0 - E.scatPrice(id));
  const r = act(s, { t: 'scat14', id: E.SCAT[other][0] }); assert.ok(!r.ok && /Katalog/.test(r.msg));
  s.money = 0; assert.ok(!act(s, { t: 'scat14', id }).ok);
  assert.ok(E.scatLeft(s) >= 1 && E.scatLeft(s) <= 7);
});

test('Lieferdienst: jeden Morgen Bestellungen, persönlich abgeben, Trinkgeld fürs schnelle Liefern', () => {
  const s = fresh(); s.day = 3; s.deliv = { list: [] }; E.morning14(s);
  assert.ok(s.deliv.list.length >= 1 && s.deliv.list.length <= E.DELIV_MAX);
  assert.equal(new Set(s.deliv.list.map(d => d.id)).size, s.deliv.list.length, 'höchstens eine Bestellung pro Nachbar');
  const d = { ...s.deliv.list[0] }, m0 = s.money;
  assert.ok(D.ITEMS[d.item] && d.n > 0 && d.pay > 0 && d.due === s.day + 1);
  assert.ok(!act(s, { t: 'deliver14', id: d.id }).ok, 'ohne die Ware geht es nicht');
  s.pinv.host = { [d.item]: d.n };
  const r = act(s, { t: 'deliver14', id: d.id });
  assert.ok(r.ok); assert.equal(s.money, m0 + d.pay + Math.round(d.pay * 0.4 / 10) * 10, 'Eil-Bonus am selben Tag'); assert.equal(E.delivFor(s, d.id), null);
  assert.equal(s.stats.deliv, 1);
  for (let i = 0; i < 6; i++) { s.day++; E.morning14(s); assert.ok(s.deliv.list.length <= E.DELIV_MAX); assert.ok(s.deliv.list.every(q => q.due >= s.day), 'abgelaufene verschwinden'); }
});

test('Salon: Frisuren, Haarfarben und Nagellack kaufen – landen in der Garderobe, sonst gesperrt', () => {
  const s = fresh(), m0 = s.money;
  assert.equal(E.SALON.hair.length, 6); assert.equal(E.SALON.hcol.length, 6); assert.equal(E.SALON.nails.length, 9);
  assert.ok(act(s, { t: 'salon14', kind: 'hair', id: 'hochsteck' }).ok); assert.ok(s.wardrobe.hochsteck); assert.equal(s.money, m0 - 600);
  assert.ok(!act(s, { t: 'salon14', kind: 'hair', id: 'hochsteck' }).ok, 'schon gekauft');
  assert.ok(act(s, { t: 'salon14', kind: 'hcol', id: '#ff7ab8' }).ok); assert.ok(s.wardrobe.hc_ff7ab8);
  assert.ok(act(s, { t: 'salon14', kind: 'nails', id: 'gold' }).ok); assert.ok(s.wardrobe.nl_gold);
  assert.ok(!act(s, { t: 'salon14', kind: 'hair', id: 'short' }).ok); assert.ok(!act(s, { t: 'salon14', kind: 'zaehne', id: 'x' }).ok);
  for (const [id] of E.SALON.hair) assert.ok(A.LOOKS.hairStyle.some(h => h[0] === id) && A.PREMIUM_HAIR.includes(id), id);
  const look = A.cleanLook({ ...A.defaultLook(), hairStyle: 'spacebuns', hairColor: '#7ad0d9', nails: 'french' });
  assert.equal(look.hairStyle, 'spacebuns'); assert.equal(look.nails, 'french'); assert.equal(A.cleanLook({ nails: 'quatsch' }).nails, 'none');
  for (let i = 0; i < 60; i++) { const l = A.randomLook(); assert.ok(!A.PREMIUM_HAIR.includes(l.hairStyle) && !A.PREMIUM_HCOL.includes(l.hairColor) && l.nails === 'none'); }
  const r = S.resolve(s, { x: S.STREET.x + E.SALON_AT[0], z: S.STREET.z + E.SALON_AT[1] - 0.8, ry: 0 }, 'hand', null);
  assert.equal(r.ui, 'salon14');
});

test('Blumenbinden: vier neue Sträuße und vier Kränze für Wand und Haustür', () => {
  const s = fresh();
  for (const id of ['veilchenstrauss', 'irisstrauss', 'ranunkelstrauss', 'herbststrauss', 'kranz_fruehling', 'kranz_sommer', 'kranz_herbst', 'kranz_winter']) {
    assert.ok(BIND[id] && FURNITURE[id]?.rare === 'bind', id);
    for (const k of Object.keys(BIND[id].in)) assert.ok(k.startsWith('*') || D.ITEMS[k], `${id}: ${k}`);
  }
  s.pinv.host = { tulpe: 3, veilchen: 8, gaensebluemchen: 2 };
  assert.ok(act(s, { t: 'bind10', id: 'kranz_fruehling' }).ok); assert.equal(s.pinv.host.kranz_fruehling, 1);
  assert.ok(act(s, { t: 'bind10', id: 'veilchenstrauss' }).ok);
  assert.ok(FURNITURE.kranz_fruehling.wall);
});

test('Alter Spielstand: alles Neue kommt dazu, nichts Altes ändert sich', () => {
  const o = S.newFarm(); o.money = 777; o.pinv = { host: { apfel: 3 } }; o.paths = { '1,1': 'stein' }; o.obj['2,2'] = { k: 'zaun', r: 0 }; o.home.items = { '0,0': { k: 'einzelbett', r: 0 } };
  const before = JSON.parse(JSON.stringify(o)), s = S.migrate(JSON.parse(JSON.stringify(o)));
  assert.equal(s.money, 777); assert.deepEqual(s.pinv.host, before.pinv.host); assert.deepEqual(s.paths, before.paths); assert.deepEqual(s.obj['2,2'], before.obj['2,2']); assert.deepEqual(s.home.items, before.home.items);
  assert.deepEqual(s.terra, {}); assert.deepEqual(s.locks, []); assert.ok(s.pet14 && s.deliv && s.home.ext && s.snowmen);
  const again = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.locks, s.locks); assert.deepEqual(again.terra, s.terra); assert.equal(again.pet14.t, s.pet14.t);
});
