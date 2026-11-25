// Teil von extras6.js – Inselband: tagsüber ein Instrument üben (Handy ➜ Band), abends auf dem Dorfplatz das Konzert.
import { NPC_IDS } from '../data.js';
import { PLAZA } from '../island.js';
import * as S from '../state.js';
import { who, hour, fmt, note } from './util.js';

export const INSTR = [['gitarre', 'Gitarre', '🎸'], ['trommel', 'Trommel', '🥁'], ['floete', 'Flöte', '🪈'], ['glocken', 'Glockenspiel', '🔔']];
export const concertTime = s => hour(s) >= 19 && hour(s) < 22.5;
export const bandToday = s => (s.band?.day === s.day ? s.band : null);
// Wer spielt die übrigen Instrumente? Drei Nachbarn, jeden Tag andere
export const bandNpcs = s => { const o = NPC_IDS.slice(), n = o.length, st = s.day % n; return [o[st], o[(st + 2) % n], o[(st + 4) % n]]; };
export function band(s, a, out) {
  const me = who(s);
  if (a.op === 'practice') {
    if (!INSTR.some(i => i[0] === a.inst) || !Number.isInteger(a.score) || a.score < 0 || a.score > 100) return false;
    if (s.band?.day !== s.day) s.band = { day: s.day, parts: {}, done: 0 };
    const P = s.band.parts[me];
    s.band.parts[me] = { inst: a.inst, score: Math.max(a.score, P?.inst === a.inst ? P.score : 0) };
    out.msg = `🎶 Geübt: ${INSTR.find(i => i[0] === a.inst)[2]} ${a.score} Punkte. ${concertTime(s) ? 'Jetzt auf den Dorfplatz – das Konzert kann beginnen!' : 'Abends ab 19 Uhr ist Konzert auf dem Dorfplatz.'}`;
    out.snd = 'coin';
    return true;
  }
  if (a.op === 'concert') {
    const B = bandToday(s);
    if (!B || B.done || !concertTime(s) || !Object.keys(B.parts).length) return false;
    const parts = Object.values(B.parts), avg = parts.reduce((t, p) => t + p.score, 0) / parts.length, kinds = new Set(parts.map(p => p.inst)).size;
    const rating = Math.min(100, Math.round(avg + (kinds - 1) * 6));
    B.done = s.day; B.rating = rating;
    const money = 400 * parts.length + rating * 25;
    s.money += money; s.stats.earned += money;
    for (const id of NPC_IDS) S.friendX(s, id).f += rating >= 70 ? 10 : 5;
    s.bandBest = Math.max(s.bandBest || 0, rating);
    out.msg = `🎤 Was für ein Konzert! ${rating} Punkte, die Nachbarn tanzen mit · +${fmt(money)} Taler`;
    out.snd = 'fanfare';
    out.concert = rating;
    S.questEventX(s, 'band', 1, out);
    if (rating >= 85 && !s.bandPoster) { s.bandPoster = s.day; note(s, '🎸 Ein Poster für die Band', 'Das Konzert war der Hammer! Hier ist ein Poster zum Aufhängen.', 'bandposter', 1); }
    return true;
  }
  return false;
}
export function resolveBand(s, me, at) {
  const B = bandToday(s);
  if (!B || B.done || !concertTime(s) || S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  if (Math.hypot(px - PLAZA.x, pz - (PLAZA.z + 4.6)) > 1.3) return null;
  return { a: { t: 'band', op: 'concert' }, label: '🎤 Das Konzert beginnen!', tiles: [] };
}
// Band auf dem Dorfplatz (Welt: Nachbarn stehen in einem Halbkreis)
export function bandSpot(s, id) {
  if (!bandToday(s) || !concertTime(s) || (s.band.done && hour(s) > 21)) return null;
  const i = bandNpcs(s).indexOf(id);
  if (i < 0) return null;
  return { x: PLAZA.x - 1.6 + i * 1.6, z: PLAZA.z + 3.4 - (i === 1 ? 0.4 : 0), walking: false, face: [PLAZA.x, PLAZA.z + 7] };
}
