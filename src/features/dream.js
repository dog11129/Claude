// Teil von extras8.js – 🌙 Traumwelt: nachts im Bett einschlafen und zusammen eine verträumte Insel im Himmel besuchen.
// Schwebende Inseln mit Wolkenbrücken: Mondschaf Luna (tauscht Traumsterne gegen Traum-Möbel), Erinnerungsinsel (eure
// Fotobuch-Momente schweben vorbei), eure Insel als kleine Traum-Miniatur und das Aufwach-Kissen. Jede Nacht neue Traumsterne.
import { ITEMS } from '../data.js';
import { rng } from '../island.js';
import * as X from '../extras.js';
import { hour } from './util.js';

export const DREAM = { x: 0, z: 5000 };
export const DREAM_ISLES = [
  { k: 'main', x: 0, z: 0, r: 8.5 }, { k: 'luna', x: 0, z: -17, r: 5 }, { k: 'memory', x: 16, z: -2, r: 4.6 },
  { k: 'mini', x: -16, z: -2, r: 4.6 }, { k: 'wake', x: 0, z: 15, r: 4.2 },
];
export const DREAM_BRIDGES = DREAM_ISLES.slice(1).map(I => { const d = Math.hypot(I.x, I.z), ux = I.x / d, uz = I.z / d; return [ux * 7.6, uz * 7.6, I.x - ux * (I.r - 0.6), I.z - uz * (I.r - 0.6)]; });
export const BRIDGE_W = 0.85;
export const LUNA = [0, -19];          // Mondschaf Luna (relativ zur Traumwelt)
export const PILLOW = [0, 16.3];       // Aufwach-Kissen
export const MINI = [-16, -2.6];       // Insel-Miniatur
export const MEMO = [16, -2.6];        // Erinnerungen
export const DREAM_START = [0, 12.2];  // hier wacht man im Traum auf
export const STAR_N = 10;
export const DREAM_HOUR = 18;          // ab dann kann man im Bett träumen
export const DREAM_SHOP = [['traumfaenger', 6], ['traummobile', 8], ['wolkenlampe', 10], ['mondteppich', 12], ['traumschaf', 15]];
export const dreamOk = s => hour(s) >= DREAM_HOUR;
const isle = id => DREAM_ISLES.find(I => I.k === id);
const segD = (px, pz, [x1, z1, x2, z2]) => { const dx = x2 - x1, dz = z2 - z1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - x1 - dx * t, pz - z1 - dz * t); };
export const onDream = (lx, lz) => DREAM_ISLES.some(I => Math.hypot(lx - I.x, lz - I.z) < I.r - 0.45) || DREAM_BRIDGES.some(b => segD(lx, lz, b) < BRIDGE_W);
// Sterne der Nacht (für alle gleich): fest pro Spieltag
export function dreamStars(day) {
  const r = rng(day * 7919 + 13), out = [];
  for (let i = 0; out.length < STAR_N && i < 200; i++) {
    const I = DREAM_ISLES[1 + Math.floor(r() * 4)] || DREAM_ISLES[0], use = r() < 0.35 ? DREAM_ISLES[0] : I, a = r() * Math.PI * 2, d = 1.2 + r() * (use.r - 2.2);
    const x = Math.round((use.x + Math.cos(a) * d) * 10) / 10, z = Math.round((use.z + Math.sin(a) * d) * 10) / 10;
    if ([LUNA, PILLOW, MINI, MEMO, DREAM_START].some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.6) || out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 1.5)) continue;
    out.push([x, z]);
  }
  return out;
}
export function blockedDream(s, x, z) {
  const lx = x - DREAM.x, lz = z - DREAM.z;
  return !onDream(lx, lz) || Math.hypot(lx - LUNA[0], lz - LUNA[1]) < 0.7 || Math.hypot(lx - PILLOW[0], lz - PILLOW[1]) < 0.9 || Math.hypot(lx - MINI[0], lz - MINI[1]) < 1.1;
}
const today = s => (s.dream?.day === s.day ? s.dream : { day: s.day, got: {} });
export function resolveDream(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - DREAM.x, lz = pz - DREAM.z, mx = me.x - DREAM.x, mz = me.z - DREAM.z;
  const D = today(s), stars = dreamStars(s.day);
  const free = stars.findIndex(([x, z], k) => !D.got[k] && Math.hypot(lx - x, lz - z) < 0.75);
  if (free >= 0) return { a: { t: 'dream', op: 'star', i: free }, label: '🌠 Traumstern pflücken', tiles: [] };
  if (Math.hypot(lx - LUNA[0], lz - LUNA[1]) < 1.5) return { ui: 'dreamshop', label: '🐑 Mondschaf Luna', tiles: [] };
  if (Math.hypot(mx - PILLOW[0], mz - PILLOW[1]) < 2 || Math.hypot(lx - PILLOW[0], lz - PILLOW[1]) < 1.4) return { go: 'dreamwake', label: '☀️ Aufwachen', tiles: [] };
  if (Math.hypot(lx - MEMO[0], lz - MEMO[1]) < 2.2) return { ui: 'book', label: '📸 Eure Erinnerungen', tiles: [] };
  if (Math.hypot(lx - MINI[0], lz - MINI[1]) < 1.9) return { label: '🏝️ Eure Insel – im Traum ganz klein', tiles: [] };
  return { label: '', tiles: [] };
}
export function dream(s, a, out) {
  if (a.op === 'enter') {
    if (!dreamOk(s)) { out.msg = '🌙 Träumen geht nur nachts (ab 18 Uhr).'; return false; }
    X.moment(s, 'dream1', '🌙', 'Der erste Traum', 'Schwebende Inseln, Wolkenbrücken und ein Schaf, das Sterne sammelt.', out);
    return true;
  }
  if (a.op === 'star') {
    const st = dreamStars(s.day);
    if (!Number.isInteger(a.i) || !st[a.i]) return false;
    if (s.dream?.day !== s.day) s.dream = { ...(s.dream || {}), day: s.day, got: {} };
    if (s.dream.got[a.i]) return false;
    s.dream.got[a.i] = 1;
    s.dream.total = (s.dream.total || 0) + 1;
    s.inv.traumstern = (s.inv.traumstern || 0) + 1;
    out.got = 'traumstern';
    out.snd = 'egg';
    out.fx.push({ x: DREAM.x + st[a.i][0], z: DREAM.z + st[a.i][1], k: 'sparkle' });
    const left = st.length - Object.keys(s.dream.got).length;
    out.msg = left ? `🌠 Traumstern! (noch ${left} heute Nacht)` : '🌠 Alle Traumsterne dieser Nacht gefunden!';
    return true;
  }
  if (a.op === 'buy') {
    const e = DREAM_SHOP.find(([id]) => id === a.id);
    if (!e || !ITEMS[e[0]]) return false;
    if ((s.inv.traumstern || 0) < e[1]) { out.msg = `🌠 Dafür brauchst du ${e[1]} Traumsterne.`; return false; }
    s.inv.traumstern -= e[1];
    if (!s.inv.traumstern) delete s.inv.traumstern;
    s.inv[e[0]] = (s.inv[e[0]] || 0) + 1;
    (s.catalog ||= {})[e[0]] = 1;
    out.got = e[0];
    out.msg = `🐑 „${ITEMS[e[0]].name} – schlaf schön damit!“`;
    out.snd = 'coin';
    return true;
  }
  return false;
}
