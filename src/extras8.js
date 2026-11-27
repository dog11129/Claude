// Inselleben 8: Klippenbank (Sonnenuntergang zu zweit), Inselhochzeit, Duell der Woche, Traumwelt und Surfen.
// Teile in src/features/ (bench, wedding, duel, dream, surf). Grafik: world-extra5.js, Fenster: ui-extra5.js, Browser: client/fun6.js.
import { migrateDuel, duelMorning } from './features/duel.js';
import { giveBench, seats, sunsetTogether } from './features/bench.js';
import { wed, wedTick, chapels } from './features/wedding.js';
import { dream, blockedDream, resolveDream } from './features/dream.js';
import { surf, giveBoard, surfSpot } from './features/surf.js';
export * from './features/duel.js';
export * from './features/bench.js';
export * from './features/wedding.js';
export * from './features/dream.js';
export * from './features/surf.js';

export const DREAM_Z = 4500;                 // alles dahinter (z > 4500) ist die Traumwelt
export const inDream = p => p.z > DREAM_Z;
export const blocked8 = (s, x, z) => blockedDream(s, x, z);
export const resolveZone8 = (s, me, sel, at) => resolveDream(s, me, sel, at);

// Vor-Prüfung draußen: mit dem Surfbrett in der Hand am Strand aufs Meer schauen
export function resolve8(s, me, sel, at) {
  if (at || sel !== 'surfbrett' || !(s.inv?.surfbrett > 0) || Math.abs(me.x) > 150 || Math.abs(me.z) > 150) return null;
  return surfSpot(me) ? { surf: true, label: '🏄 Lospaddeln!', tiles: [] } : { label: '🏄 Am Strand aufs Meer schauen', tiles: [] };
}
export function resolveObj8(s, o, k, x, z, me) {
  if (o.k === 'klippenbank') { // freien Platz nehmen: der näher gelegene der beiden
    const st = seats(x, z, o.r | 0), d = st.map(([sx, sz]) => Math.hypot(sx - (me?.x ?? x), sz - (me?.z ?? z))), [sx, sz] = st[d[0] <= d[1] ? 0 : 1];
    return { sit: { x: sx, z: sz, r: o.r | 0 }, bench8: true, label: '🌅 Hinsetzen', tiles: [[x, z]] };
  }
  if (o.k === 'kapelle') return { ui: 'wedding', label: s.wedding ? '💒 Hochzeit!' : '💒 Inselkapelle', tiles: [[x, z]] };
  if (o.k === 'surfbrett') return { surf: true, label: '🏄 Surfen gehen', tiles: [[x, z]] };
  return null;
}

const objOr = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export function migrate8(s) {
  migrateDuel(s);
  s.bench8 = objOr(s.bench8);
  s.surf = objOr(s.surf);
  if (s.dream && !(Number.isInteger(s.dream.day) && s.dream.got && typeof s.dream.got === 'object')) s.dream = null;
  const W = s.wedding;
  if (W && !(Number.isFinite(W.t0) && W.yes && typeof W.yes === 'object' && chapels(s).some(([x, z]) => x === W.x && z === W.z))) s.wedding = null;
  if (s.married && !(Array.isArray(s.married.names) && Number.isInteger(s.married.day))) s.married = null;
  giveBench(s); // Geschenke kommen einmalig per Post
  giveBoard(s);
}
export function morning8(s) {
  if (!s.duel) migrate8(s);
  duelMorning(s);
  giveBench(s);
  giveBoard(s);
}
export const tick8 = s => wedTick(s);

// Sonnenuntergang zu zweit: der Gastgeber meldet es (er sieht, wer wo sitzt)
function bench8(s, a, out) {
  if (a.op !== 'sunset' || !Array.isArray(a.names)) return false;
  const names = a.names.map(n => String(n || '').trim().slice(0, 16)).filter(Boolean);
  if (names.length < 2) return false;
  return sunsetTogether(s, names, out);
}
export const E8_ACTIONS = { wed, dream, surf, bench8 };
