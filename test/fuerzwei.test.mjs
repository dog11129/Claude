// Inselleben 11 „Für zwei“: Unser Tag (Monatstage, Jahrestag), Greifautomat & Kuscheltiere, Dinner zu zweit,
// Liebesbriefe mit neuem Briefpapier, neue Kleider und Frisuren.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
const { newFarm, migrate, act, resolve, HOME_X } = await import('../src/state.js');
const E = await import('../src/extras11.js');
const L = await import('../src/extras10.js');
const { ITEMS } = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const { FURN_2 } = await import('../src/models-furn2.js');
const { merge } = await import('../src/models.js');
const { WARDROBE } = await import('../src/newleaf.js');
const A = await import('../src/avatar.js');

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const fresh = () => { const s = migrate(newFarm()); s.level = 10; return s; };
const at = (y, m, d) => new Date(y, m - 1, d, 12);

test('Alte Spielstände: nichts geht verloren, zweimal migrieren ändert nichts', () => {
  const o = old(), s = migrate(old());
  assert.equal(s.money, o.money);
  for (const [id, n] of Object.entries(o.inv || {})) assert.equal(s.inv[id], n, id);
  assert.equal(s.couple, null);
  assert.deepEqual(s.claw11, { n: 0, won: {} });
  const a = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), a);
  const b = migrate({ ...old(), couple: { since: 'quatsch' }, claw11: { n: 'x', won: { kuscheltier_teddy: 2, kaputt: 1 } }, dinner11: 7 });
  assert.equal(b.couple, null); assert.deepEqual(b.claw11, { n: 0, won: { kuscheltier_teddy: 2 } }); assert.deepEqual(b.dinner11, { day: 0, n: 0 });
});

test('Unser Tag: Tage zählen, Monatstage (auch am Monatsende), Jahrestag mit Bild', () => {
  const s = fresh();
  assert.ok(!act(s, { t: 'couple11', op: 'since', date: '2099-01-01' }).ok, 'nicht in der Zukunft');
  assert.ok(!act(s, { t: 'couple11', op: 'since', date: '1.2.2026' }).ok);
  assert.ok(act(s, { t: 'couple11', op: 'since', date: '2025-01-31' }).ok);
  assert.ok(s.anniv.dates.some(d => d.name === E.UNSER && d.md === '01-31'), 'Jahrestag mit Feuerwerk');
  assert.equal(E.daysTogether(s, at(2025, 2, 1)), 1);
  assert.equal(E.coupleToday(s, at(2025, 1, 31)), null, 'am ersten Tag noch kein Monatstag');
  assert.deepEqual(E.coupleToday(s, at(2025, 2, 28)), { months: 1, years: 0, key: '2025-02-28' }, 'kurzer Monat: letzter Tag');
  assert.equal(E.coupleToday(s, at(2025, 3, 28)), null);
  assert.equal(E.coupleToday(s, at(2025, 3, 31)).months, 2);
  assert.equal(E.nextMonthDay(s, at(2025, 3, 30)), 1);
  assert.equal(E.nextMonthDay(s, at(2025, 4, 1)), 29);
  const p0 = s.love.pts, m0 = s.mail.length;
  s.couple.done = '';
  assert.ok(E.coupleCheck(s, {}, at(2025, 6, 30)));
  assert.ok(!E.coupleCheck(s, {}, at(2025, 6, 30)), 'nur einmal');
  assert.equal(s.love.pts, p0 + 5);
  assert.equal(s.mail.slice(m0).filter(m => m.title.includes('Monatstag')).length, 1);
  assert.ok(ITEMS[s.mail.slice(m0).find(m => m.title.includes('Monatstag')).item], 'Geschenk liegt bei');
  assert.ok(E.coupleCheck(s, {}, at(2026, 1, 31)), 'Jahrestag');
  assert.ok(s.mail.some(m => m.item === 'jahrestagsbild'));
  assert.equal(s.love.pts, p0 + 15);
  assert.ok(s.book.some(p => p.k === 'mon:2026-01-31'));
  assert.ok(act(s, { t: 'couple11', op: 'clear' }).ok);
  assert.ok(!s.couple && !s.anniv.dates.some(d => d.name === E.UNSER));
});

test('Greifautomat: 100 Taler pro Versuch, Kuscheltiere in die Tasche und Sammlung', () => {
  const s = migrate(newFarm());
  s.home.items = { '0,0': { k: 'greifautomat', r: 0 } };
  assert.equal(resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand').ui, 'claw11');
  s.money = 250;
  assert.ok(act(s, { t: 'claw11', op: 'play', win: null }).ok);
  assert.equal(s.money, 150);
  assert.ok(!act(s, { t: 'claw11', op: 'play', win: 'holz' }).ok, 'nur Kuscheltiere');
  assert.ok(act(s, { t: 'claw11', op: 'play', win: 'kuscheltier_gold' }).ok);
  assert.equal(s.inv.kuscheltier_gold, 1); assert.equal(s.claw11.won.kuscheltier_gold, 1);
  assert.ok(s.book.some(p => p.k === 'goldteddy'));
  assert.ok(!act(s, { t: 'claw11', op: 'play', win: null }).ok, 'kein Geld mehr');
  // seltene seltener
  let gold = 0, n = 0;
  for (let i = 0; i < 300; i++) for (const id of E.clawFill()) { n++; if (id === 'kuscheltier_gold') gold++; }
  assert.ok(gold > 0 && gold / n < 0.08, `goldener Teddy selten (${gold}/${n})`);
  assert.equal(L.giftValue('kuscheltier_panda'), 2);
});

test('Dinner zu zweit: nur mit Schatz am Tisch und einem Gericht, einmal am Tag', () => {
  const s = fresh();
  s.home.items = { '0,0': { k: 'dinnertisch', r: 0 } };
  const r = resolve(s, { x: HOME_X, z: 1.2, ry: Math.PI }, 'hand');
  assert.equal(r.a?.t, 'dinner11');
  assert.ok(!act(s, { ...r.a, names: ['Adriana'] }).ok, 'allein nicht');
  assert.ok(!act(s, { ...r.a, names: ['Adriana', 'Shawn'] }).ok, 'ohne Essen nicht');
  s.inv.apfelkuchen = 1; s.inv.cupcake = 1;
  const p0 = s.love?.pts || 0;
  const out = act(s, { ...r.a, names: ['Adriana', 'Shawn'] });
  assert.ok(out.ok);
  assert.equal(s.inv.cupcake || 0, 0, 'Selbstgebackenes zuerst');
  assert.equal(s.inv.apfelkuchen, 1);
  assert.equal(s.love.pts, p0 + 3);
  assert.ok(s.diary.at(-1).text.includes('Adriana & Shawn'));
  assert.ok(!act(s, { ...r.a, names: ['Adriana', 'Shawn'] }).ok, 'einmal am Tag');
  assert.ok(!act(s, { t: 'dinner11', x: 4, z: 4, names: ['a', 'b'] }).ok, 'kein Tisch');
});

test('Liebesbriefe: neues Briefpapier, einmal am Tag 2 Herzpunkte, Nachbarn zählen nicht', () => {
  const s = fresh();
  assert.ok(act(s, { t: 'letter', to: 'Mira', text: 'Hallo', name: 'Adriana' }).ok);
  assert.equal(s.love?.pts || 0, 0, 'Brief an eine Nachbarin');
  assert.ok(act(s, { t: 'letter', to: 'Shawn', text: 'Hab dich lieb', name: 'Adriana', paper: 6 }).ok);
  assert.equal(s.mail.at(-1).paper, 6);
  assert.equal(s.love.pts, 2);
  assert.ok(act(s, { t: 'letter', to: 'Shawn', text: 'Nochmal', name: 'Adriana', paper: 99 }).ok);
  assert.equal(s.mail.at(-1).paper, 0, 'unbekanntes Papier = Standard');
  assert.equal(s.love.pts, 2, 'einmal am Tag');
  const css = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const i of [4, 5, 6, 7]) assert.ok(css.includes(`.letter.paper${i}`), `Papier ${i}`);
});

test('Kleider & Frisuren: Ballkleid aus der Schneiderei, alles hat Formen', () => {
  const s = fresh();
  s.money = 10000;
  assert.ok(WARDROBE.ballkleid?.top && A.PREMIUM_TOPS.includes('ballkleid'));
  assert.ok(act(s, { t: 'wear', id: 'ballkleid' }).ok);
  assert.ok(s.wardrobe.ballkleid);
  const d = A.defaultLook();
  for (const top of ['rueschenkleid', 'bluemchenkleid', 'kuschelpulli', 'ballkleid']) {
    assert.equal(A.cleanLook({ top }).top, top);
    assert.ok(A.__parts.torsoParts({ ...d, top }).length > 4, top);
    assert.ok(A.__parts.armParts({ ...d, top }).length >= 3, top);
  }
  for (const st of ['zoepfe', 'wellen']) assert.ok(A.__parts.hairParts(st, '#6b4428').length > 8, st);
  for (let i = 0; i < 40; i++) assert.ok(!A.PREMIUM_TOPS.includes(A.randomLook().top));
});

test('Neue Möbel & Kuscheltiere: Modell passt, Icon da, nicht im Laden (außer Automat & Tisch)', () => {
  const ids = ['greifautomat', 'dinnertisch', 'jahrestagsbild', ...E.KUSCHEL_IDS];
  for (const id of ids) {
    const f = FURNITURE[id];
    assert.ok(f && ITEMS[id]?.furn === id, id);
    assert.ok(existsSync(new URL(`../assets/icons/${id}.webp`, import.meta.url)), `Icon ${id}`);
    const r = FURN_2[id](), [p, gl] = Array.isArray(r[0]) ? r : [r, []];
    const g = merge([...p, ...gl]); g.computeBoundingBox();
    const b = g.boundingBox, w = f.w / 2 + 0.12, d = f.d / 2 + 0.12;
    assert.ok(b.min.x > -w && b.max.x < w && b.min.z > -d && b.max.z < d && b.max.y < 2.35, `${id} passt`);
    if (f.wall) assert.ok(b.max.z < 0 && b.min.y > 0.6, `${id}: an der Wand`);
  }
  assert.ok(FURNITURE.greifautomat.buy > 0 && FURNITURE.dinnertisch.buy > 0);
  for (const id of E.KUSCHEL_IDS) assert.equal(FURNITURE[id].rare, 'plush');
});
