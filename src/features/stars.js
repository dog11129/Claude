// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Sternbilder: helle Sterne verbinden und benennen – sie leuchten jede Nacht am Himmel
// =====================================================================
export const STAR_SECTORS = 8, STARS_PER = 9, CONST_MAX = 16, CONST_LINES = 14;
export const BRIGHT = Array.from({ length: STAR_SECTORS }, (_, sec) => {
  let seed = 9173 + sec * 7919;
  const r = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  return Array.from({ length: STARS_PER }, (_, i) => ({ az: sec * 45 - 18 + (i % 3) * 12 + r() * 10, el: 15 + Math.floor(i / 3) * 10 + r() * 7, m: 0.6 + r() * 0.6 }));
});
export function constellation(s, a, out) {
  s.consts ||= [];
  if (a.op === 'del') {
    const c = s.consts[a.i];
    if (!c || (c.who !== who(s) && who(s) !== 'host')) return false;
    s.consts.splice(a.i, 1);
    return true;
  }
  if (a.op !== 'add' || s.consts.length >= CONST_MAX) return false;
  const name = String(a.n || '').trim().slice(0, 24);
  if (!name || !Number.isInteger(a.sec) || a.sec < 0 || a.sec >= STAR_SECTORS || !Array.isArray(a.l) || !a.l.length || a.l.length > CONST_LINES) return false;
  const lines = a.l.filter(l => Array.isArray(l) && l.length === 2 && l.every(v => Number.isInteger(v) && v >= 0 && v < STARS_PER) && l[0] !== l[1]).map(l => [l[0], l[1]]);
  if (!lines.length) return false;
  s.consts.push({ n: name, sec: a.sec, l: lines, by: String(a.by || 'Gast').slice(0, 16), who: who(s), day: s.day });
  X.moment(s, 'sternbild', '✨', 'Ein eigenes Sternbild', `„${name}“ leuchtet jetzt jede Nacht über der Insel.`, out);
  S.questEventX(s, 'star', 1, out);
  out.msg = `✨ Das Sternbild „${name}“ leuchtet ab heute jede Nacht!`;
  out.snd = 'ach';
  return true;
}
