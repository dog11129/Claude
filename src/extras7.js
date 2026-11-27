// Inselleben 7: Seerosenmoor, Bambushain, Wetter-Abenteuer, Laternenumzug, Silvester, Morgengymnastik, Nistkästen,
// neue Nachbarn (Bewerbungen & Umzugskartons), Bauernmarkt, Insel-Kalender und Jahresrückblick. Teile in src/features/.
import { moor, blockedMoor, resolveMoor, resolveMoorGate } from './features/moor.js';
import { bambus, blockedBambus, resolveBambus, resolveBambusGate } from './features/bamboo.js';
import { weather7, resolveWeather, morningWeather } from './features/weather2.js';
import { fests2, resolveFests } from './features/fests2.js';
import { nestMorning, nestResolve } from './features/nests.js';
import { housing, movingMorning, resolveMoving } from './features/housing.js';
import { market } from './features/market.js';
import { reviewMorning } from './features/calendar.js';
import * as S from './state.js';
import { weekday } from './data.js';
export * from './features/moor.js';
export * from './features/bamboo.js';
export * from './features/weather2.js';
export * from './features/fests2.js';
export * from './features/nests.js';
export * from './features/housing.js';
export * from './features/market.js';
export * from './features/calendar.js';

export const DAILY_OK_7 = { moor: s => !!s.moor?.open, bamboo: s => !!s.bambus?.open, gym: () => true, market: s => Object.values(s.obj || {}).some(o => o?.k === 'marktstand') && weekday(s.day) === 6 };
export const zone7 = z => (z < -1050 ? 'bambus' : z < -750 ? 'moor' : null);
export const blocked7 = (s, x, z) => (z < -1050 ? blockedBambus(s, x, z) : blockedMoor(s, x, z));
export const resolveZone7 = (s, me, sel, at) => (me.z < -1050 ? resolveBambus(s, me, sel, at) : resolveMoor(s, me, sel, at));
// Vor-Prüfung (alle Orte draußen): Wege ins Moor/in den Bambushain, Umzugskartons, Wetter, Feste
export function resolve7(s, me, sel, at) {
  return resolveMoorGate(s, me, at) || resolveBambusGate(s, me, at) || (S.zoneOf(me) === 'island' ? resolveMoving(s, me, at) || resolveWeather(s, me, sel, at) || resolveFests(s, me, at) : null);
}
export function resolveObj7(s, o, k, x, z) {
  if (o.k === 'nistkasten') return nestResolve(s, k, x, z);
  if (o.k === 'marktstand') return { ui: 'market', uid: { k }, label: '🧺 Marktstand', tiles: [[x, z]] };
  return null;
}

const objOr = (v, d = {}) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
export function migrate7(s) {
  s.moor = objOr(s.moor); for (const k of ['caught', 'lily', 'reed']) s.moor[k] = objOr(s.moor[k]);
  s.bambus = objOr(s.bambus); for (const k of ['cut', 'dug', 'tea']) s.bambus[k] = objOr(s.bambus[k]);
  s.nests = objOr(s.nests);
  s.gym = objOr(s.gym);
  s.rockets = objOr(s.rockets); // eigene Silvester-Raketen (s.fw gehört der Sternenrakete!)
  s.wx7 = objOr(s.wx7); s.wisps = objOr(s.wisps);
  if (s.rbpot && !(Array.isArray(s.rbpot.at) && s.rbpot.at.length === 2)) s.rbpot = null;
  if (s.moving && !(Array.isArray(s.moving.boxes) && s.moving.hold && typeof s.moving.home === 'string')) s.moving = null;
  if (s.market && !Array.isArray(s.market.items)) s.market = null;
}
export function morning7(s) {
  if (!s.moor || !s.nests) migrate7(s);
  morningWeather(s);
  nestMorning(s);
  movingMorning(s);
  reviewMorning(s);
}
export const E7_ACTIONS = { moor, bambus, weather7, fests2, housing, market };
