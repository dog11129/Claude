// Inselleben 10 „Herzstücke“: Herzensbuch, neue Zärtlichkeiten, Blumenbinde-Tisch, Mieze, Make-up, Herzchen-Möbel, Süßes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const { newFarm, migrate, act, resolve, HOME_X } = await import('../src/state.js');
const E = await import('../src/extras10.js');
const { ITEMS, RECIPES, SOCIAL } = await import('../src/data.js');
const { FURNITURE, WALLS, FLOORS } = await import('../src/furni-data.js');
const { FURN_2 } = await import('../src/models-furn2.js');
const { FURN_14 } = await import('../src/models-14.js');
const { merge } = await import('../src/models.js');
const A = await import('../src/avatar.js');

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const fresh = () => { const s = migrate(newFarm()); s.level = 10; return s; };
const NEW_FURN = ['herzbett', 'herzsofa', 'herzsessel', 'zuckerwattelampe', 'herzspiegel', 'herzregal', 'zuckerwattebaum', 'wolkenteppich', 'herzlichterkette', 'herzfrisiertisch', 'toertchenetagere',
  'kratzbaum', 'wollkorb', 'blumentisch', 'herzkissen', 'liebesschaukel', 'sternennachtlicht', 'herzbogen', 'baldachinbett', 'herzbrunnen', ...Object.keys(E.BIND)];

test('Alte Spielstände bekommen die Herzstücke, ohne dass etwas verloren geht', () => {
  const o = old(), s = migrate(old());
  assert.equal(s.money, o.money);
  for (const [id, n] of Object.entries(o.inv || {})) assert.equal(s.inv[id], n, id);
  assert.deepEqual(s.love, { pts: 0, day: 0, did: {}, gift: 0, got: 0 });
  assert.ok(s.mieze && s.gift10);
  const m = s.mail.filter(x => x.item === 'blumentisch');
  assert.equal(m.length, 1, 'genau ein Blumenbinde-Tisch per Post');
  const a = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), a, 'zweimal migrieren ändert nichts');
  // kaputte Werte werden repariert statt zu stören
  const b = migrate({ ...old(), love: { pts: 'x', got: 99, did: 5 }, mieze: 'kaputt', gift10: 1 });
  assert.equal(b.love.pts, 0); assert.equal(b.love.got, E.LOVE_STEPS.length); assert.deepEqual(b.love.did, {});
  assert.deepEqual(b.mieze, { n: 0, day: 0, who: {}, gift: 0 });
});

test('Herzensbuch: jede Zärtlichkeit einmal am Tag, Stufen bringen Post und Haarschmuck', () => {
  const s = fresh();
  for (const k of E.LOVE_SOCIAL) assert.ok(SOCIAL[k], `${k} ist im Herz-Menü`);
  for (const k of E.LOVE_SOCIAL) assert.ok(E.loveSocial(s, k, {}), k);
  assert.ok(!E.loveSocial(s, 'hug', {}), 'Umarmen zählt nur einmal am Tag');
  assert.ok(!E.loveSocial(s, 'found', {}), 'Gefunden ist keine Zärtlichkeit');
  assert.equal(s.love.pts, E.LOVE_SOCIAL.length);
  assert.equal(E.loveLevel(s), 2, '12 Zärtlichkeiten = zwei Stufen');
  // Stufen: 5 → Herz-Kissen per Post, 12 → Herz-Haarreif in der Garderobe
  assert.ok(s.mail.some(m => m.item === 'herzkissen'));
  assert.ok(s.wardrobe.herzreif);
  s.day++;
  assert.ok(E.loveSocial(s, 'hug', {}), 'am nächsten Tag wieder');
  // alle Belohnungen gibt es wirklich
  for (const st of E.LOVE_STEPS) assert.ok(st.hat ? A.PREMIUM_HATS.includes(st.hat) : FURNITURE[st.furn]?.rare === 'love', st.name);
  const out = {}; E.addLove(s, 500, out);
  assert.equal(s.love.got, E.LOVE_STEPS.length);
  assert.ok(s.wardrobe.blumenkrone && s.wardrobe.herzkrone);
  assert.ok(['herzkissen', 'liebesschaukel', 'sternennachtlicht', 'herzbogen', 'baldachinbett', 'herzbrunnen'].every(k => s.mail.some(m => m.item === k)));
  assert.ok(s.book.some(p => p.k === 'love240'), 'Fotobuch-Seite');
});
test('Stufen zählen richtig', () => {
  const s = fresh();
  E.addLove(s, 11, {}); assert.equal(E.loveLevel(s), 1);
  E.addLove(s, 1, {}); assert.equal(E.loveLevel(s), 2);
  assert.equal(E.nextStep(s).at, 25);
});

test('Geschenke an den Schatz: Strauß 3, Selbstgebackenes 2, höchstens 6 am Tag', () => {
  const s = fresh();
  s.inv.rosenstrauss = 1; s.inv.cupcake = 3; s.inv.holz = 5;
  assert.ok(act(s, { t: 'give', item: 'holz', n: 1, to: 'u_schatz1234' }).ok);
  assert.equal(s.love?.pts || 0, 0, 'Holz ist nicht romantisch');
  assert.ok(act(s, { t: 'give', item: 'rosenstrauss', n: 1, to: 'u_schatz1234' }).ok);
  assert.equal(s.love.pts, 3);
  assert.equal(s.pinv.u_schatz1234.rosenstrauss, 1, 'Strauß ist beim Schatz');
  assert.ok(act(s, { t: 'give', item: 'cupcake', n: 3, to: 'u_schatz1234' }).ok);
  assert.equal(s.love.pts, 6, 'Deckel: 6 Punkte am Tag');
  assert.equal(E.giftValue('herzchentorte'), 2);
  assert.equal(E.giftValue('rose'), 1);
  assert.equal(E.giftValue('apfelkuchen'), 1);
});

test('Blumenbinde-Tisch: Sträuße, Pfingstrosen jeder Farbe, Regenbogen, Haarschmuck', () => {
  const s = fresh();
  assert.ok(!act(s, { t: 'bind10', id: 'rosenstrauss' }).ok, 'ohne Rosen nichts');
  assert.ok(!act(s, { t: 'bind10', id: 'quatsch' }).ok);
  s.inv.rose = 5;
  assert.ok(act(s, { t: 'bind10', id: 'rosenstrauss' }).ok);
  assert.equal(s.inv.rosenstrauss, 1); assert.ok(!s.inv.rose);
  s.inv.pfingstrose_lila = 2; s.inv.pfingstrose_weiss = 2; s.inv.pfingstrose_regenbogen = 1; s.inv.pfingstrosenvase = 3;
  assert.ok(act(s, { t: 'bind10', id: 'pfingstrosenstrauss' }).ok);
  assert.ok(!s.inv.pfingstrose_weiss && !s.inv.pfingstrose_lila && !s.inv.pfingstrose_regenbogen, 'fünf Pfingstrosen genommen');
  assert.equal(s.inv.pfingstrosenvase, 3, 'Vasen sind keine Blumen');
  for (const k of ['rose', 'tulpe', 'lilie', 'mohn', 'kornblume', 'sonnenblume']) s.inv[k] = 3;
  assert.ok(!act(s, { t: 'bind10', id: 'regenbogenstrauss' }).ok, 'nur sechs Sorten');
  s.inv.lavendel = 1;
  assert.ok(act(s, { t: 'bind10', id: 'regenbogenstrauss' }).ok);
  assert.equal(s.inv.lavendel || 0, 0);
  s.inv.rose = 6; s.inv.gaensebluemchen = 2;
  assert.ok(act(s, { t: 'bind10', id: 'rosenkranz' }).ok);
  assert.ok(s.wardrobe.rosenkranz && A.PREMIUM_HATS.includes('rosenkranz'));
  s.inv.rose = 6; s.inv.gaensebluemchen = 2;
  assert.ok(!act(s, { t: 'bind10', id: 'rosenkranz' }).ok, 'nicht doppelt');
  for (const [id, R] of Object.entries(E.BIND)) {
    assert.equal(FURNITURE[id]?.rare, 'bind', id);
    for (const k of Object.keys(R.in)) assert.ok(k.startsWith('*') || ITEMS[k], `${id}: ${k}`);
  }
});

test('Mieze im Katzenkörbchen: streicheln einmal am Tag je Person, manchmal ein Mitbringsel', () => {
  const s = fresh();
  s.home.items['0,0'] = { k: 'katzenbett', r: 0 };
  const r = resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand');
  assert.equal(r.a?.t, 'mieze10');
  assert.ok(act(s, r.a).ok);
  assert.ok(!act(s, r.a).ok, 'heute schon gestreichelt');
  assert.ok(act(s, r.a, 'u_schatz1234').ok, 'der Schatz darf auch');
  assert.ok(!act(s, { t: 'mieze10', x: 3, z: 3 }).ok, 'da steht kein Körbchen');
  assert.ok(!act(s, { t: 'mieze10', x: 0, z: 0, room: 'quatsch' }).ok);
  const n = s.mail.length;
  let got = 0;
  for (let i = 0; i < 40; i++) { s.mieze.gift = 1; E.morning10(s); }
  got = s.mail.length - n;
  assert.ok(got > 3 && got < 37, `Mitbringsel manchmal (${got}/40)`);
  assert.ok(s.mail.slice(n).every(m => ITEMS[m.item]));
});

test('Schminktisch & Spiegel öffnen das Make-up, Blumentisch das Binde-Fenster', () => {
  const s = fresh();
  for (const k of ['pfingstrosenschminktisch', 'herzfrisiertisch', 'standspiegel']) {
    s.home.items = { '0,0': { k, r: 0 } };
    const r = resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand');
    assert.ok(r.makeup, k);
  }
  s.home.items = { '0,0': { k: 'blumentisch', r: 0 } };
  assert.equal(resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand').ui, 'bind10');
});

test('Make-up und neuer Haarschmuck im Aussehen', () => {
  const d = A.defaultLook();
  for (const k of ['blush', 'lips', 'lid', 'mark']) { assert.equal(d[k], 'none'); assert.ok(A.LOOKS[k].length >= 4, k); }
  const l = A.cleanLook({ blush: 'herz', lips: 'glanz', lid: 'gold', mark: 'stern', hat: 'herzkrone' });
  assert.equal(l.blush, 'herz'); assert.equal(l.lips, 'glanz'); assert.equal(l.hat, 'herzkrone');
  const bad = A.cleanLook({ blush: '<b>', lips: 1, hat: 'quatsch' });
  assert.equal(bad.blush, 'none'); assert.equal(bad.lips, 'none');
  const old = A.cleanLook({ skin: '#ffd8b8', hat: 'tiara' });
  assert.equal(old.mark, 'none', 'alte Profile: ohne Make-up');
  for (let i = 0; i < 30; i++) { const r = A.randomLook(); assert.ok(!A.PREMIUM_HATS.includes(r.hat) && r.lips === 'none'); }
  for (const h of ['rosenkranz', 'bluetenspange', 'herzreif', 'blumenkrone', 'herzkrone']) {
    assert.ok(A.PREMIUM_HATS.includes(h) && A.HAT_FROM[h], h);
    assert.ok(A.__parts.hatParts({ ...d, hat: h }).length > 3, h);
  }
});

test('Neue Möbel: Modell passt auf die Grundfläche, Icon da, Laden & Serie stimmen', () => {
  const icons = JSON.parse(readFileSync(new URL('../assets/icons/index.json', import.meta.url), 'utf8'));
  const has = id => (Array.isArray(icons) ? icons.includes(id) : icons[id] || icons.icons?.includes?.(id)) || existsSync(new URL(`../assets/icons/${id}.webp`, import.meta.url));
  for (const id of [...NEW_FURN, ...E.SWEETS]) assert.ok(has(id), `Icon für ${id}`);
  for (const id of NEW_FURN) {
    const f = FURNITURE[id];
    assert.ok(f && ITEMS[id]?.furn === id, id);
    const r = (FURN_2[id] || FURN_14[id])(), [p, gl] = Array.isArray(r[0]) ? r : [r, []]; // neue Sträuße & Kränze: models-14.js
    const g = merge([...p, ...gl]); g.computeBoundingBox();
    const b = g.boundingBox, w = f.w / 2 + 0.12, d = f.d / 2 + 0.12;
    assert.ok(b.min.x > -w && b.max.x < w, `${id}: Breite ${b.min.x.toFixed(2)}…${b.max.x.toFixed(2)}`);
    assert.ok(b.min.z > -d && b.max.z < d, `${id}: Tiefe ${b.min.z.toFixed(2)}…${b.max.z.toFixed(2)}`);
    assert.ok(b.min.y > -0.06 && b.max.y < 2.35, `${id}: Höhe`);
    if (f.rug) assert.ok(b.max.y < 0.12, `${id}: flach`);
    if (f.wall) assert.ok(b.max.z < 0 && b.min.y > 0.6, `${id}: an der Wand`);
  }
  assert.ok(Object.values(FURNITURE).filter(f => f.set === 'herzchen').length >= 10);
  for (const id of ['herzkissen', 'baldachinbett', 'rosenstrauss']) assert.ok(FURNITURE[id].rare && !FURNITURE[id].buy, `${id} nicht im Laden`);
  for (const id of E.SWEETS) { assert.equal(ITEMS[id].cat, 'dish'); assert.ok(Object.values(RECIPES).some(r => r.out === id && r.st === 'cook'), id); }
  for (const r of Object.values(RECIPES)) for (const k of Object.keys(r.in)) assert.ok(ITEMS[k], k);
  assert.ok(WALLS.some(w => w[0] === 'herzchen') && WALLS.some(w => w[0] === 'wolken') && FLOORS.some(f => f[0] === 'flieder'));
  for (const t of ['wall_herzchen', 'wall_wolken', 'floor_flieder']) assert.ok(existsSync(new URL(`../assets/tex/${t}.webp`, import.meta.url)), t);
});
