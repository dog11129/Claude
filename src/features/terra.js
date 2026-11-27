// Teil von extras14.js – Gelände formen: Teiche und Bäche graben (Wasser-Kacheln), kleine Hügel aufschütten,
// Brücken übers eigene Wasser und Treppen auf die Hügel. s.terra = { 'x,z': 'w' | 'h' }.
import { PLACE } from '../data.js';
import { onPath, onPlaza } from '../island.js';
import * as S from '../state.js';
import { koiNeedsWater } from './pure15.js';

export const HILL_H = 0.55, TERRA_COST = { w: 30, h: 50 }, TERRA_MAX = 400;
export const TERRA_NAME = { w: ['💧', 'Wasser graben'], h: ['⛰️', 'Hügel aufschütten'] };
const key = (x, z) => x + ',' + z;
export const terraAt = (s, x, z) => s.terra?.[key(Math.round(x), Math.round(z))] || null;
// Wo darf man graben oder aufschütten? Freies Gras, nicht auf Dorfwegen oder dem Dorfplatz, nicht direkt an Gebäuden.
export function terraOk(s, x, z) {
  if (!S.canPlace(s, x, z) || onPath(x, z, 0.6) || onPlaza(x, z, 0.8) || s.paths?.[key(x, z)]) return false;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (S.buildingAt(x + dx, z + dz)) return false;
  return true;
}
// Darf dieses Stück auf diese Kachel? Brücken nur aufs eigene Wasser, alles andere nicht ins Wasser, auf Hügel nur Deko.
export function placeOk14(s, item, x, z) {
  const t = s.terra?.[key(x, z)], p = PLACE[item];
  if (p?.bridge) return t === 'w' && !s.obj[key(x, z)];
  if (t === 'w') return false;
  if (t === 'h') return p?.kind === 'deco' && !p.ramp && !p.gate;
  return true;
}
export function terra14(s, a, out) {
  if (!Number.isInteger(a.x) || !Number.isInteger(a.z)) return false;
  const k = key(a.x, a.z), T = s.terra ||= {}, old = T[k];
  if (a.k === null) {
    if (!old) return false;
    if (s.obj[k]) { out.msg = 'Erst wegräumen, was hier steht.'; return false; }
    if (old === 'w' && koiNeedsWater(s)) { out.msg = 'Dann wird es den Koi zu eng – erst einen Fisch abgeben oder den Teich woanders vergrößern.'; return false; }
    delete T[k];
    (out.fx ||= []).push({ x: a.x, z: a.z, t: '', k: 'dust' });
    out.snd = 'till';
    return true;
  }
  if (!TERRA_COST[a.k] || old === a.k) return false;
  if (old ? !!s.obj[k] : !terraOk(s, a.x, a.z)) { out.msg = 'Hier lässt sich das Gelände nicht formen.'; return false; }
  if (old === 'w' && koiNeedsWater(s)) { out.msg = 'Dann wird es den Koi zu eng – erst einen Fisch abgeben oder den Teich woanders vergrößern.'; return false; }
  if (!old && Object.keys(T).length >= TERRA_MAX) { out.msg = `Mehr als ${TERRA_MAX} Gelände-Kacheln gehen nicht.`; return false; }
  if (s.money < TERRA_COST[a.k]) { out.msg = 'Nicht genug Taler.'; return false; }
  s.money -= TERRA_COST[a.k];
  T[k] = a.k;
  if (s.weeds?.[k]) delete s.weeds[k];
  (s.stats ||= {}).terra = (s.stats.terra || 0) + 1;
  (out.fx ||= []).push({ x: a.x, z: a.z, t: '', k: a.k === 'w' ? 'splash' : 'dust' });
  out.snd = a.k === 'w' ? 'splash' : 'till';
  return true;
}
// Baumodus „Gelände“: was passiert auf dieser Kachel?
export function resolveTerra(s, kind, x, z) {
  const k = key(x, z), one = [[x, z]], old = s.terra?.[k];
  if (kind === 'none' || old === kind) return old ? (s.obj[k] ? { label: 'Erst wegräumen, was hier steht', tiles: one, bad: true } : { a: { t: 'terra14', x, z, k: null }, label: '🧹 Einebnen', tiles: one }) : { label: 'Hier ist nichts zu ebnen', tiles: one, bad: true };
  if (!TERRA_COST[kind]) return null;
  if (old ? s.obj[k] : !terraOk(s, x, z)) return { label: 'Hier geht das nicht', tiles: one, bad: true };
  return { a: { t: 'terra14', x, z, k: kind }, label: `${TERRA_NAME[kind][0]} ${TERRA_NAME[kind][1]} (${TERRA_COST[kind]} Taler)`, tiles: one };
}
// Wasser versperrt den Weg – außer es liegt eine Brücke darauf
export const waterBlocked = (s, tx, tz) => !!s.terra && s.terra[key(tx, tz)] === 'w' && !PLACE[s.obj[key(tx, tz)]?.k]?.bridge;
// Höhenstufen: 0 = Boden, 1 = Treppe, 2 = Hügel. Vom Boden auf den Hügel kommt man nur über eine Treppe.
const lvl = (s, x, z) => { const k = key(x, z); return s.terra[k] === 'h' ? 2 : PLACE[s.obj[k]?.k]?.ramp ? 1 : 0; };
export function terraPass(s, x0, z0, x1, z1) {
  if (!s.terra) return true;
  const ax = Math.round(x0), az = Math.round(z0), bx = Math.round(x1), bz = Math.round(z1);
  return (ax === bx && az === bz) || Math.abs(lvl(s, ax, az) - lvl(s, bx, bz)) < 2;
}
// Wie hoch steht man hier? (Hügel, Treppe steigt in ihre Blickrichtung an, Brücke leicht gewölbt)
export function terraY(s, x, z) {
  if (!s.terra) return 0;
  const tx = Math.round(x), tz = Math.round(z), k = key(tx, tz), t = s.terra[k];
  if (t === 'h') return HILL_H;
  const o = s.obj[k], p = o && PLACE[o.k];
  if (p?.ramp) { const a = (o.r | 0) * Math.PI / 2; return HILL_H * Math.max(0, Math.min(1, (x - tx) * Math.sin(a) + (z - tz) * Math.cos(a) + 0.5)); }
  if (p?.bridge && t === 'w') return 0.08;
  return 0;
}
export function migrateTerra(s) {
  if (!s.terra || typeof s.terra !== 'object' || Array.isArray(s.terra)) s.terra = {};
  for (const [k, v] of Object.entries(s.terra)) if (v !== 'w' && v !== 'h') delete s.terra[k];
}
export function morningTerra(s) { for (const k of Object.keys(s.terra || {})) if (s.weeds?.[k]) delete s.weeds[k]; }
