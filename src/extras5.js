// Inselleben 5: Dachboden & Keller, Möbel lackieren, Baumhaus, Töpferei, Kompost, Einmachen (Rezepte), Blumenladen,
// Glühwürmchen (Käfer), Ponyhof, Haustierschule, Olympiade, Schnitzeljagd, Kino, Theater, Bimmelbahn, Hochsee-Angeln,
// Leuchtturm-Nächte, Brieffreunde, Geburtstagsparty. Teile in src/features/, hier zusammengesteckt.
import { xroom, hpaint, pottery, compost, feedCompost, kilnMorning, compostMorning, XROOMS, xroomBlank } from './features/home2.js';
import { bouquet } from './features/florist.js';
import { pony, petschool } from './features/animals.js';
import { olymp, hunt, cinema, theater, train, huntAt } from './features/play.js';
import { deepsea, lighthouse, deepBlocked, resolveDeep } from './features/sea2.js';
import { penpal, party } from './features/social.js';
import * as S from './state.js';
export * from './features/home2.js';
export * from './features/florist.js';
export * from './features/animals.js';
export * from './features/play.js';
export * from './features/sea2.js';
export * from './features/social.js';

const obj = (s, k) => Object.values(s.obj || {}).some(o => o?.k === k);
export const DAILY_OK_V = { bouquet: () => true, ride_pony: s => obj(s, 'ponystall'), bigfish: s => s.level >= 3, medal: () => true, ship: s => obj(s, 'leuchtturm') };

// Draußen: Dinge mit eigenem Fenster bzw. Weg
export const OBJ_UI5 = { komposter: ['compost', '🟫 Komposter'], toepferscheibe: ['pottery', '🏺 Töpfern'], ponystall: ['pony', '🐴 Zum Pony'], freiluftkino: ['cinema', '🎬 Freiluftkino'], buehne: ['theater', '🎭 Inselbühne'], bahnhof: ['train', '🚂 Bimmelbahn'], leuchtturm: ['lighthouse', '🗼 Leuchtturm'] };
export const OBJ_GO5 = { baumhaus: ['xroom:tree', '🌳 Ins Baumhaus klettern'] };
// Im Haus: Treppen in die Extra-Zimmer
export const FURN_GO5 = { treppe_hoch: ['xroom:attic', '🪜 Hinauf zum Dachboden'], treppe_runter: ['xroom:cellar', '🪜 Hinab in den Keller'] };
// Insel: Kompost aufs Beet, versteckte Schätze
export function resolveIslandV(s, me, sel, at, x, z) {
  if (sel === 'kompost') { const t = s.tiles[`${x},${z}`]; return t?.c && S.stage(t.c) < 3 ? { a: { t: 'compostfeed', x, z }, label: '🟫 Kompost aufs Beet', tiles: [[x, z]] } : { label: '🟫 Kompost: auf ein wachsendes Beet', tiles: [[x, z]] }; }
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, h = huntAt(s, px, pz, me.key || s._who || 'host');
  if (h) return { a: { t: 'hunt', op: 'find', id: h.id }, label: '🔍 Hier ist etwas versteckt!', tiles: [] };
  return null;
}
export const zoneV = z => (z > 3600 && z < 4500 ? 'deepsea' : null);
export { deepBlocked as blockedV, resolveDeep as resolveV };

// Extra-Zimmer: wie die Nachbarzimmer, aber eigene
export function xroomOf(s, id) {
  const X = XROOMS[id], h = s.xrooms?.[id] || (s.xrooms ||= {})[id] || (id === 'tree' ? (s.xrooms.tree = xroomBlank('tree')) : xroomBlank(id));
  return { id, z0: X.z0, size: X.size, items: h.items, rugs: h.rugs, walls: h.walls, wall: h.wall, floor: h.floor, x: true };
}

const objOr = (v, d = {}) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
export function migrateV(s) {
  s.xrooms = objOr(s.xrooms);
  for (const [id, h] of Object.entries(s.xrooms)) { if (!XROOMS[id] || !h || typeof h !== 'object') { delete s.xrooms[id]; continue; } for (const m of ['items', 'rugs', 'walls']) h[m] = objOr(h[m]); h.wall ||= XROOMS[id].wall; h.floor ||= XROOMS[id].floor; }
  s.kiln = Array.isArray(s.kiln) ? s.kiln.filter(k => k && typeof k.id === 'string').slice(0, 12) : [];
  s.compost = objOr(s.compost);
  s.florist = objOr(s.florist); s.florist.done = objOr(s.florist.done);
  s.pony = objOr(s.pony);
  s.petschool = objOr(s.petschool);
  s.olymp = objOr(s.olymp);
  s.hunts = Array.isArray(s.hunts) ? s.hunts.filter(h => h && typeof h.id === 'string' && Number.isFinite(h.x)).slice(0, 30) : [];
  s.cinema = objOr(s.cinema); s.cinema.seen = objOr(s.cinema.seen);
  s.theater = objOr(s.theater); s.theater.best = objOr(s.theater.best);
  s.deepsea = objOr(s.deepsea); s.deepsea.n = objOr(s.deepsea.n);
  s.lighthouse = objOr(s.lighthouse);
  s.penpal = objOr(s.penpal); s.penpal.out = Array.isArray(s.penpal.out) ? s.penpal.out.slice(0, 10) : []; s.penpal.got = Array.isArray(s.penpal.got) ? s.penpal.got.slice(-80) : [];
  s.party = objOr(s.party); s.party.guests = Array.isArray(s.party.guests) ? s.party.guests : [];
}
export function morningV(s) {
  if (!s.compost || !s.kiln) migrateV(s);
  kilnMorning(s);
  compostMorning(s);
}
export const V_ACTIONS = { xroom, hpaint, pottery, compost, compostfeed: feedCompost, bouquet, pony, petschool, olymp, hunt, cinema, theater, train, deepsea, lighthouse, penpal, party };
