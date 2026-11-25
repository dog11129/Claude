// Teil von extras2.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { AREAS, nodeAt, inArea } from '../areas.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Strand-Wettbewerbe: samstags 10–17 Uhr. Sommer: Sandburgen. Frühling & Herbst: Drachen steigen lassen.
// =====================================================================
export const beachKind = s => weekday(s.day) !== 6 ? null : { summer: 'sand', spring: 'kite', autumn: 'kite' }[S.seasonOf(s.day)] || null;
export const beachOpen = s => !!beachKind(s) && hour(s) >= 10 && hour(s) < 17 && !s.beach?.done;
export const CASTLE_MAX = 5;
export const castleScore = c => c.lv * 12 + Math.min(10, c.sh?.length || 0) * 4 + new Set(c.sh || []).size * 5;
export const SHELL_IDS = SHELLS.map(x => x[0]);
export function beachStart(s) {
  const k = beachKind(s);
  s.beach = k ? { day: s.day, kind: k, judges: [...NPC_IDS].sort(() => Math.random() - 0.5).slice(0, 3), entries: {}, done: 0 } : null;
}
export function beachFinish(s) {
  const b = s.beach;
  if (!b || b.done) return false;
  b.done = s.day;
  if (b.kind === 'sand') for (const [k, c] of Object.entries(s.castles || {})) if (c.by) b.entries[c.by] = { name: c.name, score: castleScore(c) + rnd(7), k };
  const list = Object.values(b.entries).sort((x, y) => y.score - x.score);
  if (!list.length) return true;
  const win = list[0], prize = b.kind === 'sand' ? 'strandpokal' : 'windpokal';
  b.winner = win.name;
  s.money += 3000; s.stats.earned += 3000;
  s.stats.beachWins = (s.stats.beachWins || 0) + 1;
  const jury = b.judges.map(id => NPC_DATA[id].icon + ' ' + NPC_DATA[id].name).join(', ');
  note(s, `🏆 ${b.kind === 'sand' ? 'Sandburgen' : 'Drachen'}-Wettbewerb: ${win.name} gewinnt!`, `Liebe Insel,\n${b.kind === 'sand' ? `die schönste Sandburg hat ${win.name} gebaut – ${win.score} Punkte!` : `${win.name}s Drache flog am höchsten – ${win.score} Meter!`} 3.000 Taler gehen in die Inselkasse, und der Pokal steht bereit.\n\nDie Jury: ${jury}`, prize, 1);
  (s.diary ||= []).push({ day: s.day, icon: b.kind === 'sand' ? '🏰' : '🪁', text: `${win.name} gewinnt den ${b.kind === 'sand' ? 'Sandburgen' : 'Drachen'}-Wettbewerb!` });
  X.moment(s, 'beach:' + s.day, b.kind === 'sand' ? '🏰' : '🪁', b.kind === 'sand' ? 'Sandburgen-Wettbewerb' : 'Drachenfest', `${win.name} hat gewonnen – mit ${win.score} ${b.kind === 'sand' ? 'Punkten' : 'Metern'}.`);
  return true;
}
export function castleResolve(s, x, z, sel) {
  const k = `${x},${z}`, c = s.castles?.[k], one = [[x, z]];
  if (c) {
    if (sel === 'shovel' && c.lv < CASTLE_MAX) return { a: { t: 'castle', op: 'grow', x, z }, label: `🏰 Weiterbauen (${c.lv}/${CASTLE_MAX})`, tiles: one };
    return { ui: 'castle', castle: k, label: `🏰 Sandburg von ${c.name}${c.sh?.length ? ' · 🐚 ' + c.sh.length : ''}`, tiles: one };
  }
  return null;
}
export const castleOk = (s, x, z) => { const k = `${x},${z}`; return !s.obj[k] && !s.shells?.[k] && !s.ground?.[k] && !S.resAt(s, k) && !s.drift?.[k] && Object.keys(s.castles || {}).length < 12; };
export function castle(s, a, out) {
  s.castles ||= {};
  const k = `${a.x},${a.z}`, c = s.castles[k];
  if (a.op === 'build') {
    if (c || !S.sandX(a.x, a.z) || !castleOk(s, a.x, a.z)) return false;
    s.castles[k] = { lv: 1, sh: [], by: s._who || 'host', name: (a.name || 'Gast').slice(0, 16), day: s.day };
    out.msg = '🏰 Eine Sandburg! Mit der Schaufel weiterbauen, mit der Hand Muscheln draufsetzen.';
    out.fx.push({ x: a.x, z: a.z, txt: '🏰', k: 'dust' });
    out.snd = 'till';
    S.questEventX(s, 'castle', 1, out);
    return true;
  }
  if (!c) return false;
  if (a.op === 'grow') {
    if (c.lv >= CASTLE_MAX) return false;
    c.lv++;
    out.fx.push({ x: a.x, z: a.z, txt: '🏰'.repeat(Math.min(3, c.lv)), k: 'dust' });
    out.snd = 'till';
    return true;
  }
  if (a.op === 'shell') {
    if (!SHELL_IDS.includes(a.item) || (c.sh || []).length >= 10 || !S.takeInvX(s, a.item, 1)) return false;
    (c.sh ||= []).push(a.item);
    out.msg = `${ITEMS[a.item].icon} Schön! Burg-Punkte: ${castleScore(c)}`;
    out.snd = 'place';
    return true;
  }
  if (a.op === 'flat') { // Burg einebnen (eigene oder als Gastgeber)
    if (c.by !== (s._who || 'host') && (s._who || 'host') !== 'host') return false;
    for (const id of c.sh || []) S.addInvX(s, id, 1);
    delete s.castles[k];
    return true;
  }
  return false;
}
export function kitescore(s, a, out) { // Ergebnis vom Drachen-Minispiel
  if (!(s.inv.drache > 0) || !Number.isInteger(a.score) || a.score < 0 || a.score > 120) return false;
  s.stats.kiteBest = Math.max(s.stats.kiteBest || 0, a.score);
  const b = s.beach;
  if (b?.kind === 'kite' && beachOpen(s)) {
    const who = s._who || 'host', e = b.entries[who];
    if (!e || a.score > e.score) b.entries[who] = { name: (a.name || 'Gast').slice(0, 16), score: a.score };
    out.msg = `🪁 ${a.score} Meter! ${e && a.score <= e.score ? `(Dein bester Flug: ${e.score} m)` : 'Neuer Bestwert beim Drachenfest!'}`;
  } else out.msg = `🪁 ${a.score} Meter hoch! (Rekord: ${s.stats.kiteBest} m)`;
  out.snd = a.score >= 60 ? 'fanfare' : 'ach';
  S.questEventX(s, 'kite', 1, out);
  return true;
}
