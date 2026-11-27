// Baumodus: Aufgestelltes antippen hebt es auf (Möbel im Haus, Deko draußen) – danach woanders hinstellen
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFarm, migrate, act, resolveBuild, canPlace } from '../src/state.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; s.intro = null; return s; };

test('Im Haus: auf ein Möbelstück tippen = aufheben, dann woanders hinstellen (Farbe bleibt)', () => {
  const s = fresh();
  s.inv.stuhl = 1;
  assert.ok(act(s, { t: 'hplace', x: 0, z: 0, item: 'stuhl', r: 1 }).ok);
  s.home.items['0,0'].c = 3; // lackiert
  // nichts mehr in der Tasche: Antippen hebt auf
  let r = resolveBuild(s, { inside: true, mode: 'place', item: null, r: 0 }, 0, 0);
  assert.equal(r.a?.t, 'hpick');
  assert.deepEqual(r.pick, { id: 'stuhl', r: 1 });
  assert.match(r.label, /aufheben/);
  // anderes Möbel gewählt, das dort nicht hinpasst: auch aufheben
  s.inv.kommode = 1;
  r = resolveBuild(s, { inside: true, mode: 'place', item: 'kommode', r: 0 }, 0, 0);
  assert.equal(r.a?.t, 'hpick');
  // passt etwas hin (Teppich unter dem Stuhl), wird hingestellt statt aufgehoben
  s.inv.herzteppich = 1;
  r = resolveBuild(s, { inside: true, mode: 'place', item: 'herzteppich', r: 0 }, 0, 0);
  assert.equal(r.a?.t, 'hplace');
  // leeres Feld: normal hinstellen
  r = resolveBuild(s, { inside: true, mode: 'place', item: 'kommode', r: 0 }, 2, 0);
  assert.equal(r.a?.t, 'hplace');
  // Aufheben und woanders hinstellen
  assert.ok(act(s, { t: 'hpick', x: 0, z: 0 }).ok);
  assert.equal(s.inv.stuhl, 1);
  assert.ok(!s.home.items['0,0']);
  assert.ok(act(s, { t: 'hplace', x: -1, z: 1, item: 'stuhl', r: 1 }).ok);
  assert.equal(s.home.items['-1,1'].c, 3, 'Farbe bleibt beim Umstellen');
  // ein neu gekaufter Stuhl bekommt keine fremde Farbe
  s.inv.stuhl = 1;
  assert.ok(act(s, { t: 'hplace', x: 1, z: 1, item: 'stuhl', r: 0 }).ok);
  assert.ok(!s.home.items['1,1'].c);
  // Modus „Aufheben“ packt weiter ein
  r = resolveBuild(s, { inside: true, mode: 'remove' }, 1, 1);
  assert.equal(r.a?.t, 'hpick');
});

test('Draußen: Deko antippen = aufheben, Projekte und Nachbarhäuser nicht aus Versehen', () => {
  const s = fresh();
  let spot = null;
  for (let x = -20; x <= 20 && !spot; x++) for (let z = -15; z <= 15 && !spot; z++) if (canPlace(s, x, z) && canPlace(s, x + 3, z)) spot = [x, z];
  const [x, z] = spot;
  s.inv.laterne = 1;
  assert.ok(act(s, { t: 'place', x, z, item: 'laterne', r: 2 }).ok);
  let r = resolveBuild(s, { inside: false, mode: 'place', item: null, r: 0 }, x, z);
  assert.equal(r.a?.t, 'pickup');
  assert.deepEqual(r.pick, { id: 'laterne', r: 2 });
  s.inv.pilz = 1;
  r = resolveBuild(s, { inside: false, mode: 'place', item: 'pilz', r: 0 }, x, z);
  assert.equal(r.a?.t, 'pickup', 'besetzt: aufheben statt Fehlermeldung');
  r = resolveBuild(s, { inside: false, mode: 'place', item: 'pilz', r: 0 }, x + 3, z);
  assert.equal(r.a?.t, 'place');
  assert.ok(act(s, { t: 'pickup', x, z }).ok && s.inv.laterne === 1);
  s.obj[`${x + 3},${z}`] = { k: 'nachbarhaus', r: 0, who: 'pingo' };
  r = resolveBuild(s, { inside: false, mode: 'place', item: 'pilz', r: 0 }, x + 3, z);
  assert.ok(!r.pick, 'Nachbarhaus nie aufheben');
});
