// Inselleben 6: Jahrmarkt, Inselrestaurant, Aquarium & Terrarium, Schatzkarten-Abenteuer, Schafe & Webstuhl,
// Imkerei, Wildtiere, Obstbäume veredeln, Picknick, Inselband, Einstieg für Neue. Teile in src/features/.
import { fair, fairBlocked, resolveFair, fairDay } from './features/fair.js';
import { resto } from './features/resto.js';
import { tank } from './features/tanks.js';
import { pirate, resolvePirate } from './features/pirate.js';
import { loom } from './features/wool.js';
import { bees, beeResolve } from './features/bees.js';
import { wild, resolveWild, wildMorning, WILD } from './features/wild.js';
import { graft, graftResolve } from './features/graft.js';
import { picnic } from './features/picnic.js';
import { band, resolveBand } from './features/band.js';
import * as S from './state.js';
export * from './features/fair.js';
export * from './features/resto.js';
export * from './features/tanks.js';
export * from './features/pirate.js';
export * from './features/wool.js';
export * from './features/bees.js';
export * from './features/wild.js';
export * from './features/graft.js';
export * from './features/picnic.js';
export * from './features/band.js';

const obj = (s, ...k) => Object.values(s.obj || {}).some(o => k.includes(o?.k));
export const DAILY_OK_6 = { fair: s => fairDay(s.day), resto: s => obj(s, 'restaurant'), wild: () => true, honey6: s => obj(s, 'bienenkasten'), band: () => true };
// Draußen: Dinge mit eigenem Fenster
export const OBJ_UI6 = { restaurant: ['resto', '🍽️ Inselrestaurant'], picknickdecke: ['picnic', '🧺 Picknick'] };
// Im Haus: Becken & Webstuhl
export const FURN_UI6 = { aquarium: ['tank', '🐠 Aquarium'], terrarium: ['tank', '🦗 Terrarium'], webstuhl: ['loom', '🧶 Webstuhl'] };
export const zone6 = z => (z < -450 && z >= -750 ? 'fair' : null);
export { fairBlocked as blocked6, resolveFair as resolveFair6 };

// Vor-Prüfung für alle Orte draußen: Zeichen der Schatzkarte, Wildtiere, Konzert, Veredeln
export function resolve6(s, me, sel, at) {
  const p = resolvePirate(s, me, sel, at);
  if (p) return p;
  if (S.zoneOf(me) !== 'island') return null;
  if (sel === 'graft') {
    const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, x = Math.round(px), z = Math.round(pz);
    return graftResolve(s, `${x},${z}`, x, z) || { label: '✂️ An einen Obstbaum gehen', tiles: [[x, z]] };
  }
  return resolveWild(s, me, at) || resolveBand(s, me, at);
}
// Insel-Dinge mit eigener Aktion (aus state: Objekt vor der Figur)
export function resolveObj6(s, o, k, x, z) {
  if (o.k === 'bienenkasten') return beeResolve(s, k, x, z);
  if (OBJ_UI6[o.k]) return { ui: OBJ_UI6[o.k][0], uid: { k }, label: OBJ_UI6[o.k][1], tiles: [[x, z]] };
  return null;
}

const objOr = (v, d = {}) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
const spot = v => (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) ? v : null);
export function migrate6(s) {
  s.fair = objOr(s.fair); s.fair.lose = objOr(s.fair.lose); s.fair.ducks = objOr(s.fair.ducks);
  s.resto = objOr(s.resto); s.resto.done = objOr(s.resto.done); s.resto.stars = Array.isArray(s.resto.stars) ? s.resto.stars.filter(Number.isFinite).slice(-10) : [];
  s.pirate = objOr(s.pirate); s.pirate.at = spot(s.pirate.at); s.pirate.stage = Number.isInteger(s.pirate.stage) ? Math.max(0, Math.min(4, s.pirate.stage)) : 0;
  if (s.pirate.on && !s.pirate.at) s.pirate.on = 0;
  s.bees = objOr(s.bees); s.honeys = objOr(s.honeys);
  s.wild = objOr(s.wild);
  for (const id of Object.keys(s.wild)) if (!WILD[id] || typeof s.wild[id] !== 'object') delete s.wild[id];
  s.graft = objOr(s.graft); s.hybrids = objOr(s.hybrids);
  for (const [k, g] of Object.entries(s.graft)) if (!g || typeof g.f !== 'string' || !Number.isFinite(g.day)) delete s.graft[k];
  s.picnic = s.picnic && typeof s.picnic === 'object' && typeof s.picnic.k === 'string' && Array.isArray(s.picnic.guests) ? s.picnic : null;
  s.band = s.band && typeof s.band === 'object' && s.band.parts && typeof s.band.parts === 'object' ? s.band : null;
  s.intro = s.intro && typeof s.intro === 'object' && s.intro.on ? { on: 1 } : null;
}
export function morning6(s) {
  if (!s.fair || !s.wild) migrate6(s);
  wildMorning(s);
  for (const k of Object.keys(s.graft)) if (S.resAt(s, k) !== 'tree') delete s.graft[k]; // Baum ausgegraben
}
// Einstieg: die Führung beenden oder überspringen
function intro(s, a) { if (!s.intro || (a.op !== 'skip' && a.op !== 'done')) return false; s.intro = null; return true; }
export const E6_ACTIONS = { fair, resto, tank, pirate, loom, bees, wild, graft, picnic, band, intro };
