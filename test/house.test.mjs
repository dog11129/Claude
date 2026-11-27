// Haus umziehen, Möbel-Kollision nach echter Form, Brückengeländer
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, blocked, buildingAt, houseFit, HOUSE_HOME, HOUSE_MOVE_PRICE, FURN_HIT, furnBox, HOME_X } from '../src/state.js';
import { BUILDINGS } from '../src/data.js';
import { BRIDGES, riverX, bridgeY } from '../src/island.js';

const fresh = () => { const s = migrate(newFarm('T')); s._who = 'host'; return s; };
const free = s => { for (let x = -25; x <= 25; x++) for (let z = -15; z <= 20; z++) if (houseFit(s, x, z).ok && (Math.abs(x - HOUSE_HOME[0]) > 6 || Math.abs(z - HOUSE_HOME[1]) > 6)) return [x, z]; };

test('Haus umziehen: kostet Taler, Haus & Briefkasten wandern mit, alter Platz wird frei', () => {
  const s = fresh(), at = free(s), old = { ...BUILDINGS.house };
  assert.ok(at, 'es gibt einen freien Platz');
  s.money = 1000;
  assert.equal(act(s, { t: 'movehouse', x: at[0], z: at[1] }).ok, false, 'zu wenig Taler');
  s.money = HOUSE_MOVE_PRICE + 10;
  assert.ok(act(s, { t: 'movehouse', x: at[0], z: at[1] }).ok);
  assert.equal(s.money, 10);
  assert.equal(buildingAt(at[0], at[1]), 'house');
  assert.equal(buildingAt(Math.round(old.cx), Math.round(old.cz)), null, 'alter Platz ist frei');
  assert.equal(BUILDINGS.mail.x0, BUILDINGS.house.x0 - 1, 'Briefkasten zieht mit');
  // Spielstand speichern & laden: Haus bleibt am neuen Platz
  const back = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.housePos, s.housePos);
  assert.equal(buildingAt(at[0], at[1]), 'house');
  // ein anderer (alter) Spielstand setzt den Platz wieder zurück
  migrate(newFarm('X'));
  assert.equal(BUILDINGS.house.x0, old.x0);
});

test('Haus umziehen: nicht ins Wasser, nicht auf Bäume oder Deko, nicht an andere Häuser', () => {
  let s = fresh();
  for (let i = 0; i < 8 && !free(s); i++) s = fresh(); // Bäume stehen zufällig – eine Insel mit freiem Platz nehmen
  assert.equal(houseFit(s, 0, 40).ok, false);
  assert.equal(houseFit(s, BUILDINGS.museum.cx, BUILDINGS.museum.cz).ok, false);
  const at = free(s);
  s.obj[`${at[0]},${at[1]}`] = { k: 'laterne', r: 0 };
  assert.equal(houseFit(s, at[0], at[1]).ok, false);
  assert.equal(act(s, { t: 'movehouse', x: 1.5, z: 2 }).ok, false);
  const bad = migrate({ ...JSON.parse(JSON.stringify(newFarm('B'))), housePos: { dx: 'x', dz: 9999 } });
  assert.equal(bad.housePos, null);
});

test('Möbel-Kollision: echte Form statt ganzer Kachel, gedreht richtig', () => {
  const s = fresh();
  s.home.items['1,0'] = { k: 'stuhl', r: 0 };
  assert.ok(blocked(s, HOME_X + 1, 0), 'Mitte des Stuhls');
  assert.ok(blocked(s, HOME_X + 1.3, 0), 'ohne Maße: Raster mit kleinem Rand');
  FURN_HIT.stuhl = [0.2, 0.2, 0, 0];
  assert.ok(!blocked(s, HOME_X + 1.3, 0), 'mit Maßen: neben dem Stuhl ist frei');
  // gedreht um 90°: Breite und Tiefe tauschen
  assert.deepEqual(furnBox('stuhl', 1, 0, 1).map(v => Math.round(v * 100) / 100), [0.8, 1.2, -0.2, 0.2]);
  delete FURN_HIT.stuhl;
});

test('Brücken: Geländer ist fest, auf der Brücke läuft man oben drauf', () => {
  const s = fresh(), b = BRIDGES[0], x0 = riverX(b);
  assert.ok(!blocked(s, x0, b), 'Mitte der Brücke ist frei');
  assert.ok(blocked(s, x0, b + 0.82), 'Geländer');
  assert.ok(blocked(s, x0 + 0.8, b - 0.82), 'Geländer auf der anderen Seite');
  assert.ok(bridgeY(x0, b) > 0.15 && bridgeY(x0 + 1.7, b) < bridgeY(x0, b), 'Brücke ist gewölbt');
  assert.equal(bridgeY(x0 + 5, b + 3), 0);
});
