// Teil von extras7.js – Laternenumzug (Herbst), Silvesternacht mit eigenem Feuerwerk, Morgengymnastik auf dem Dorfplatz.
import { NPC_IDS } from '../data.js';
import { PLAZA } from '../island.js';
import * as S from '../state.js';
import { who, hour, fmt, note } from './util.js';

export const festIs = (s, k) => S.festOf(s.day) === k;
export const paradeTime = s => festIs(s, 'laternen') && hour(s) >= 18 && hour(s) < 22.5;
export const fwTime = s => festIs(s, 'silvester') && hour(s) >= 22;
export const gymTime = s => hour(s) >= 6 && hour(s) < 8.5;
export const PARADE_AT = [PLAZA.x - 2.7, PLAZA.z]; // Treffpunkt Umzug (Westseite des Dorfplatzes)
export const FW_AT = [PLAZA.x + 2.7, PLAZA.z]; // Silvester: hier zünden
export const GYM_AT = [PLAZA.x, PLAZA.z + 4.6]; // Gymnastik (vor dem Dorfbaum)
export const FW_COLORS = [['rosa', 0xff6b8a], ['gold', 0xffd23f], ['himmel', 0x7fd6ff], ['lila', 0xb39cff], ['gruen', 0x8fe3a0], ['orange', 0xff9a4a]];
export const FW_SHAPES = [['kugel', 'Kugel', '🔴'], ['herz', 'Herz', '💗'], ['stern', 'Stern', '⭐'], ['ring', 'Ring', '⭕'], ['weide', 'Trauerweide', '🌿']];
export const FW_HEIGHTS = [['tief', 'tief', 8], ['mittel', 'mittel', 11], ['hoch', 'hoch', 14]];
export const GYM_GOAL = 10;
export const GYM_MOVES = ['⬆️', '⬇️', '⬅️', '➡️'];
const near = (me, at, px, pz, r = 1.3) => Math.hypot(px - at[0], pz - at[1]) < r;
export function resolveFests(s, me, at) {
  if (S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  if (paradeTime(s) && near(me, PARADE_AT, px, pz) && s.parade?.done !== s.day) return { ui: 'parade', label: '🏮 Laternenumzug beginnen', tiles: [] };
  if (fwTime(s) && near(me, FW_AT, px, pz) && s.newyear?.day !== s.day) return { ui: 'fireworks', label: '🎆 Countdown starten!', tiles: [] };
  if (gymTime(s) && near(me, GYM_AT, px, pz)) return s.gym?.[who(s)]?.last === s.day ? { label: '🤸 Für heute geturnt – bis morgen früh!', tiles: [] } : { ui: 'gym', label: '🤸 Morgengymnastik mitmachen', tiles: [] };
  return null;
}
export function fests2(s, a, out) {
  const me = who(s);
  if (a.op === 'lantern') { // Mira schenkt eine Laterne, wenn man keine hat
    if (!paradeTime(s) || s.inv.papierlaterne > 0) return false;
    S.addInvX(s, 'papierlaterne', 1); out.msg = '🦔 Mira: „Hier, nimm meine Ersatzlaterne!“'; out.snd = 'love';
    return true;
  }
  if (a.op === 'pstart') { // Umzug beginnt: die Nachbarn folgen dieser Person (bei allen Mitspielern)
    if (!paradeTime(s) || s.parade?.done === s.day || (s.parade?.on === s.day && s.parade.by !== me) || !(s.inv.papierlaterne > 0)) return false;
    s.parade = { on: s.day, by: me };
    return true;
  }
  if (a.op === 'parade') {
    if (!paradeTime(s) || s.parade?.done === s.day || (s.parade?.on === s.day && s.parade.by !== me) || !(s.inv.papierlaterne > 0)) return false;
    if (!Number.isFinite(a.secs) || a.secs < 25) { out.msg = '🏮 Der Umzug war ja schnell vorbei … nochmal, etwas länger!'; return false; }
    s.parade = { done: s.day, by: me };
    for (const id of NPC_IDS) S.friendX(s, id).f += 15;
    s.money += 1500; s.stats.earned += 1500;
    (s.diary ||= []).push({ day: s.day, icon: '🏮', text: 'Laternenumzug mit allen Nachbarn durch die Herbstnacht.' });
    out.msg = `🏮 Was für ein schöner Umzug! Alle Nachbarn strahlen · +${fmt(1500)} Taler`; out.snd = 'fanfare';
    S.questEventX(s, 'parade', 1, out);
    return true;
  }
  if (a.op === 'rockets') { // eigene Raketen speichern (bis zu 3)
    const list = Array.isArray(a.list) ? a.list.slice(0, 3) : [];
    if (!list.every(r => r && FW_COLORS.some(c => c[0] === r.c) && FW_SHAPES.some(x => x[0] === r.sh) && FW_HEIGHTS.some(h => h[0] === r.h))) return false;
    (s.rockets ||= {})[me] = list.map(r => ({ c: r.c, sh: r.sh, h: r.h }));
    out.msg = `🎆 ${list.length} Rakete${list.length === 1 ? '' : 'n'} gespeichert – Silvester kann kommen!`; out.snd = 'plopp';
    return true;
  }
  if (a.op === 'launch') {
    if (!fwTime(s) || s.newyear?.day === s.day) return false;
    s.newyear = { day: s.day, by: me, t: s.time };
    for (const id of NPC_IDS) S.friendX(s, id).f += 10;
    const year = Math.floor((s.day - 1) / 28) + 1;
    if (!(s.bells || []).includes(year)) { (s.bells ||= []).push(year); S.addInvX(s, 'neujahrsglocke', 1); }
    out.msg = '🎆 3 … 2 … 1 … Frohes neues Inseljahr!'; out.snd = 'fanfare';
    S.questEventX(s, 'newyear', 1, out);
    return true;
  }
  if (a.op === 'gym') {
    if (!gymTime(s) || !Number.isInteger(a.score) || a.score < 0 || a.score > 8) return false;
    const G = (s.gym ||= {})[me] ||= { n: 0 };
    if (G.last === s.day) return false;
    G.last = s.day; G.n++;
    s.money += 100 + a.score * 25; s.stats.earned += 100 + a.score * 25;
    out.msg = `🤸 Stempel ${G.n}/${GYM_GOAL}! ${a.score >= 7 ? 'Super mitgeturnt!' : 'Gut gemacht!'} +${100 + a.score * 25} Taler`; out.snd = 'coin';
    if (G.n === GYM_GOAL) { S.addInvX(s, 'gymnastikmatte', 1); out.msg += ' – die Stempelkarte ist voll: eine Gymnastikmatte!'; out.snd = 'fanfare'; }
    S.questEventX(s, 'gym', 1, out);
    return true;
  }
  return false;
}
// Wo stehen die Nachbarn morgens bei der Gymnastik? (drei Reihen vor dem Dorfbaum)
export function gymSpot(s, id) {
  if (!gymTime(s)) return null;
  const i = NPC_IDS.indexOf(id);
  if (i < 0 || i > 5) return null;
  return { x: PLAZA.x - 2 + (i % 3) * 2, z: PLAZA.z + 5.4 + Math.floor(i / 3) * 1.4, walking: false };
}

