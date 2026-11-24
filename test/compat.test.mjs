// Alte Spielstände müssen ohne Verlust weiterlaufen (Datei mit der Vorgänger-Version erzeugt)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrate, act, bindInv, claimHost } from '../src/state.js';
import { DAILY, STORY } from '../src/data.js';

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));

test('Alter Spielstand: nichts geht verloren', () => {
  const before = old(), s = migrate(old());
  assert.deepEqual(s.inv, before.inv, 'alte Tasche = Tasche des Gastgebers');
  assert.deepEqual(s.pinv.host, before.inv);
  assert.equal(s.money, before.money);
  assert.equal(s.level, before.level);
  assert.equal(s.day, before.day);
  assert.deepEqual(s.obj, before.obj, 'Aufgestelltes bleibt stehen');
  assert.deepEqual(s.home.items, before.home.items, 'Möbel bleiben');
  assert.deepEqual(s.tiles, before.tiles, 'Beete bleiben');
  assert.deepEqual(s.museum, before.museum);
  assert.deepEqual(s.album, before.album);
  for (const [id, n] of Object.entries(before.npc)) for (const [k, v] of Object.entries(n)) assert.deepEqual(s.npc[id][k], v, `Freundschaft ${id}.${k}`); // neue Felder (Briefliste) kommen nur dazu
  assert.deepEqual(s.ach, before.ach);
  assert.deepEqual(s.quest, before.quest);
  assert.deepEqual(s.daily, before.daily);
  // Tagesaufgaben zeigen weiter auf dieselben Aufgaben wie vorher
  assert.equal(DAILY[12][0], 'Grabt etwas aus');
  assert.equal(DAILY[16][0], 'Schießt einen Ballon ab');
  assert.equal(DAILY[3][0], 'Fangt 3 Fische');
  assert.equal(STORY[20].title, 'Insel-Stars', 'alte Kapitel behalten ihre Nummer');
  assert.ok(s.recipes.f_kiste, 'Lagerkiste als Bauplan dazu');
});

test('Gespeichert und wieder geladen: Taschen bleiben gleich, nichts doppelt', () => {
  const s = migrate(old());
  act(s, { t: 'buy', id: 'mehl', n: 2 });
  const json = JSON.stringify(s);
  assert.ok(!JSON.parse(json).inv, 's.inv wird nicht doppelt gespeichert');
  const t = migrate(JSON.parse(json));
  assert.deepEqual(t.pinv, s.pinv);
  assert.equal(t.inv.mehl, 2);
  assert.equal(t.inv.holz, 33);
});

test('Gäste haben eigene Taschen und können sich etwas schenken', () => {
  const s = migrate(old());
  act(s, { t: 'buy', id: 'mehl', n: 3 }, 'u_gast12345');
  assert.equal(s.pinv.u_gast12345.mehl, 3);
  assert.ok(!s.inv.mehl, 'nicht in der Tasche des Gastgebers');
  const r = act(s, { t: 'give', to: 'host', item: 'mehl', n: 2 }, 'u_gast12345');
  assert.ok(r.ok && r.gave);
  assert.equal(s.inv.mehl, 2);
  assert.equal(s.pinv.u_gast12345.mehl, 1);
  assert.ok(!act(s, { t: 'give', to: 'host', item: 'mehl', n: 5 }, 'u_gast12345').ok, 'nicht mehr als man hat');
  bindInv(s, 'u_gast12345');
  assert.equal(s.inv.mehl, 1, 'Gast sieht seine eigene Tasche');
});

test('Lagerkiste: nur mit Kiste im Haus, 40 Sorten je Kiste', () => {
  const s = migrate(old());
  assert.ok(!act(s, { t: 'stash', item: 'holz', n: 3 }).ok, 'ohne Kiste geht nichts');
  s.home.items['3,1'] = { k: 'kiste', r: 0 };
  assert.ok(act(s, { t: 'stash', item: 'holz', n: 3 }).ok);
  assert.equal(s.box.holz, 3);
  assert.equal(s.inv.holz, 30);
  assert.ok(act(s, { t: 'unstash', item: 'holz', n: 2 }, 'u_gast12345').ok, 'auch Gäste können herausnehmen');
  assert.equal(s.pinv.u_gast12345.holz, 2);
  assert.ok(!act(s, { t: 'unstash', item: 'holz', n: 5 }).ok);
});

test('Insel auf neuem Gerät öffnen: eigene Tasche bleibt; Kopie einer Freundin: eigene Gast-Tasche', () => {
  const s = migrate(old());
  claimHost(s, 'abcdef1234');
  assert.equal(s.owner, 'abcdef1234');
  claimHost(s, 'neuesgeraet9'); // gleiche Person, anderes Gerät/Profil
  assert.equal(s.inv.holz, 33, 'Tasche nicht weg');
  act(s, { t: 'buy', id: 'mehl', n: 1 }, 'u_freundin123');
  claimHost(s, 'freundin123'); // die Freundin öffnet ihre Sicherheitskopie
  assert.equal(s.inv.mehl, 1, 'Freundin sieht ihre Tasche');
  assert.equal(s.pinv.u_abcdef1234.holz, 33, 'Tasche der Gastgeberin liegt sicher unter ihrem Schlüssel');
});

test('Alter Spielstand nach dem großen Inselleben-Update: alles bleibt, Neues kommt dazu', async () => {
  const { tick, act } = await import('../src/state.js');
  const before = old(), s = migrate(old());
  // Neues ist da
  for (const k of ['paper', 'book', 'anniv', 'catalog', 'week', 'patterns', 'stall', 'residents', 'tmap', 'trees']) assert.ok(s[k] !== undefined, k);
  assert.equal(s.patterns.length, 8);
  // Altes ist unverändert
  assert.deepEqual(s.obj, before.obj);
  assert.deepEqual(s.home.items, before.home.items);
  assert.deepEqual(s.pinv.host, before.inv);
  assert.equal(s.money, before.money);
  // Ein ganzer Tag vergeht: nichts geht verloren, Möbel und Aufgestelltes bleiben
  const objs = JSON.stringify(s.obj), home = JSON.stringify(s.home.items), mus = JSON.stringify(s.museum);
  s.dayTime = 1; tick(s, 0.01, true);
  assert.equal(JSON.stringify(s.obj), objs);
  assert.equal(JSON.stringify(s.home.items), home);
  assert.equal(JSON.stringify(s.museum), mus);
  assert.equal(s.day, before.day + 1);
  // Speichern & Laden (wie localStorage/Cloud) ändert nichts
  const back = migrate(JSON.parse(JSON.stringify(s)));
  for (const k of ['book', 'anniv', 'week', 'patterns', 'catalog', 'residents']) assert.deepEqual(back[k], s[k], k);
  assert.ok(act(back, { t: 'patsave', i: 2, px: '3'.repeat(256), name: 'Herz' }).ok);
  assert.equal(migrate(JSON.parse(JSON.stringify(back))).patterns[2].name, 'Herz');
});
