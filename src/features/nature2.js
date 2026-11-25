// Teil von extras4.js – Vogelbeobachtung (Fernglas) und Gezeiten-Tümpel am Strand.
import { ITEMS } from '../data.js';
import { coast, isBeach, riverX, RIVER_W } from '../island.js';
import * as S from '../state.js';
import { zoneOf } from '../newleaf.js';
import { who, hour } from './util.js';

// [id, Name, Symbol, Jahreszeiten (leer = immer), [von, bis] Uhr, wo, Häufigkeit]
export const BIRDS = [
  ['spatz', 'Spatz', '🐦', [], [6, 20], 'insel', 10], ['amsel', 'Amsel', '🐦‍⬛', [], [5, 21], 'insel', 8],
  ['rotkehlchen', 'Rotkehlchen', '🔴', ['autumn', 'winter', 'spring'], [6, 18], 'insel', 6], ['blaumeise', 'Blaumeise', '🔵', [], [7, 17], 'wald', 6],
  ['kohlmeise', 'Kohlmeise', '🟡', [], [7, 17], 'insel', 6], ['buntspecht', 'Buntspecht', '🪵', [], [7, 16], 'wald', 4],
  ['eisvogel', 'Eisvogel', '💎', ['spring', 'summer'], [7, 12], 'fluss', 2], ['moewe', 'Möwe', '🕊️', [], [6, 21], 'strand', 10],
  ['graureiher', 'Graureiher', '🩶', [], [6, 19], 'fluss', 4], ['stieglitz', 'Stieglitz', '🌈', ['summer', 'autumn'], [8, 17], 'wiese', 4],
  ['gimpel', 'Gimpel', '🍒', ['winter'], [8, 15], 'insel', 4], ['seidenschwanz', 'Seidenschwanz', '❄️', ['winter'], [9, 14], 'wald', 2],
  ['kranich', 'Kranich', '🦢', ['spring', 'autumn'], [8, 12], 'wiese', 2], ['uhu', 'Uhu', '🦉', [], [20, 24], 'wald', 2],
  ['waldkauz', 'Waldkauz', '🦉', [], [19, 24], 'insel', 3], ['nachtigall', 'Nachtigall', '🎶', ['spring', 'summer'], [20, 24], 'insel', 2],
  ['papagei', 'Papagei', '🦜', [], [8, 18], 'tropen', 6], ['flamingo', 'Flamingo', '🦩', [], [7, 18], 'tropen', 3],
  ['kolibri', 'Kolibri', '🌺', [], [9, 16], 'tropen', 2], ['glutschwalbe', 'Glutschwalbe', '🔥', [], [7, 19], 'vulkan', 3],
];
export const BIRD = Object.fromEntries(BIRDS.map(b => [b[0], b]));
// Wo steht man? Insel (mit Strand/Fluss), Gebiete, Tropen, Vulkan
export function birdPlace(x, z) {
  const zn = zoneOf({ x, z });
  if (zn === 'island') return isBeach(x, z) ? 'strand' : Math.abs(x - riverX(z)) < RIVER_W + 2.5 ? 'fluss' : 'insel';
  return { wald: 'wald', wiese: 'wiese', tropic: 'tropen', volcano: 'vulkan' }[zn] || null;
}
export function birdsHere(s, x, z) {
  const where = birdPlace(x, z), h = hour(s), sea = S.seasonOf(s.day);
  if (!where) return [];
  return BIRDS.filter(b => (b[5] === where || (b[5] === 'insel' && (where === 'strand' || where === 'fluss'))) && (!b[3].length || b[3].includes(sea)) && h >= b[4][0] && h < b[4][1]);
}
export function bird(s, a, out) {
  if (a.op !== 'look' || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return false;
  if (!(s.inv.fernglas > 0)) return false;
  const B = s.birds, me = who(s);
  if (B.day !== s.day) Object.assign(B, { day: s.day, looks: {} });
  if ((B.looks[me] || 0) >= 40) { out.msg = '🔭 Genug geguckt für heute – die Vögel brauchen auch mal Ruhe.'; return false; }
  B.looks[me] = (B.looks[me] || 0) + 1;
  const feeder = Object.values(s.obj || {}).some(o => o?.k === 'vogelhaus'), list = birdsHere(s, a.x, a.z);
  if (!list.length || Math.random() > (feeder ? 0.85 : 0.7)) { out.msg = '🔭 Gerade ist kein Vogel zu sehen … nochmal versuchen?'; return true; }
  let r = Math.random() * list.reduce((t, b) => t + b[6] * (feeder && b[6] <= 4 ? 2 : 1), 0), b = list[0];
  for (const x of list) if ((r -= x[6] * (feeder && x[6] <= 4 ? 2 : 1)) <= 0) { b = x; break; }
  const fresh = !B.seen[b[0]];
  B.seen[b[0]] ||= s.day;
  B.n[b[0]] = (B.n[b[0]] || 0) + 1;
  S.questEventX(s, 'bird', 1, out);
  out.fx.push({ x: a.x, z: a.z, txt: b[2], k: 'leaf' });
  if (fresh) { const m = 150 + (10 - b[6]) * 60; s.money += m; s.stats.earned += m; out.msg = `🔭 ${b[2]} ${b[1]} – neu im Naturbuch! +${m} Taler`; out.snd = 'found'; }
  else out.msg = `🔭 ${b[2]} ${b[1]} (${B.n[b[0]]}× gesehen)`;
  return true;
}

// ---------- Gezeiten-Tümpel: bei Ebbe (6–9 und 15–18 Uhr) sitzen Tiere in den Felsbecken am Strand ----------
export const TIDE_ANIMALS = [['einsiedlerkrebs', 20], ['strandkrabbe', 26], ['napfschnecke', 24], ['seepocke', 24], ['schlangenstern', 9], ['glasgarnele', 14], ['seestern', 8], ['seeigel', 6]];
export const tideLow = s => { const h = hour(s); return (h >= 6 && h < 9) || (h >= 15 && h < 18); };
// fünf Felsbecken am Sandstrand, weit auseinander (aus der Inselform berechnet, auf allen Geräten gleich)
export const TIDE_POOLS = (() => {
  const c = [];
  for (let x = -30; x <= 30; x++) for (let z = -10; z <= 32; z++) { const k = coast(x, z); if (k > -1.5 && k < -1.0 && isBeach(x, z) && Math.abs(x - riverX(z)) > RIVER_W + 3 && !(Math.abs(x + 9) < 3 && z > 13)) c.push([x, z]); }
  const out = [];
  while (out.length < 5 && c.length) {
    let best = null, bd = -Infinity;
    for (const p of c) { const d = out.length ? Math.min(...out.map(q => Math.hypot(q[0] - p[0], q[1] - p[1]))) : -Math.hypot(p[0] - 12, p[1] - 20); if (d > bd) { bd = d; best = p; } }
    out.push(best);
    c.splice(c.indexOf(best), 1);
  }
  return out;
})();
export const tidePoolAt = (x, z) => TIDE_POOLS.findIndex(([px, pz]) => Math.hypot(px - x, pz - z) < 1.2);
const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return ((Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0) / 4294967296; };
export function tideAnimal(day, i) { let r = hash(day * 7 + i, 4242) * TIDE_ANIMALS.reduce((t, a) => t + a[1], 0); for (const [id, w] of TIDE_ANIMALS) if ((r -= w) <= 0) return id; return 'seepocke'; }
export function tide(s, a, out) {
  const i = a.i;
  if (a.op !== 'pick' || !Number.isInteger(i) || !TIDE_POOLS[i]) return false;
  if (!tideLow(s)) { out.msg = '🌊 Gerade ist Flut – bei Ebbe (6–9 und 15–18 Uhr) wieder vorbeischauen.'; return false; }
  if (s.tidepool[i] === s.day) { out.msg = '🌊 Dieses Becken ist für heute leer.'; return false; }
  s.tidepool[i] = s.day;
  const id = tideAnimal(s.day, i);
  S.addInvX(s, id, 1);
  S.collectX(s, id, out);
  s.tidebook[id] ||= s.day;
  out.got = id;
  out.msg = `🌊 ${ITEMS[id].icon} ${ITEMS[id].name} aus dem Felsbecken!`;
  out.fx.push({ x: TIDE_POOLS[i][0], z: TIDE_POOLS[i][1], txt: ITEMS[id].icon, k: 'leaf' });
  out.snd = 'found';
  S.questEventX(s, 'tide', 1, out);
  return true;
}
