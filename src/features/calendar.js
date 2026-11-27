// Teil von extras7.js – Insel-Kalender (alle Termine der nächsten Wochen) und Jahresrückblick.
import { FESTS, NPC_DATA, NPC_IDS, WEEKDAYS, weekday, SEASONS, BIRTHDAYS } from '../data.js';
import * as S from '../state.js';
import { fairDay } from './fair.js';

const seaDay = day => ((day - 1) % 7) + 1;
export const YEAR = 28;
export const yearOf = day => Math.floor((day - 1) / YEAR) + 1;
// Termine eines Tages: [Symbol, Text, Uhrzeit]
export function eventsOn(s, day) {
  const E = [], sea = S.seasonOf(day), wd = weekday(day), f = S.festOf(day);
  if (f) E.push([FESTS[f].icon, FESTS[f].name, f === 'laternen' ? 'ab 18 Uhr' : f === 'silvester' ? 'ab 22 Uhr' : 'den ganzen Tag']);
  if (fairDay(day)) E.push(['🎡', 'Jahrmarkt hinter der Bummelgasse', '10–22 Uhr']);
  for (const id of NPC_IDS) { const b = BIRTHDAYS?.[id]; if (b && b[0] === sea && b[1] === seaDay(day)) E.push(['🎂', `Geburtstag: ${NPC_DATA[id].icon} ${NPC_DATA[id].name}`, '']); }
  if (wd === 0) E.push(['🍠', 'Rübenverkauf bei Hoppel', '6–12 Uhr'], ['🏆', 'Kochwettbewerb', '9–18 Uhr']);
  if (wd === 5) E.push(['🏮', 'Nachtmarkt', 'ab 18 Uhr']);
  if (wd === 6) E.push(['🧺', 'Bauernmarkt am eigenen Stand', '8–15 Uhr'], ['🎸', 'Konzert im Mondschein-Club', 'abends']);
  if (sea === 'summer' && wd === 6) E.push(['🏰', 'Sandburgen-Wettbewerb', '']);
  if (day % YEAR === 0) E.push(['📽️', 'Jahresende – morgen gibt es den Rückblick', '']);
  return E;
}
export function calendarDays(s, n = 21) {
  const out = [];
  for (let d = s.day; d < s.day + n; d++) out.push({ day: d, name: d === s.day ? 'Heute' : d === s.day + 1 ? 'Morgen' : WEEKDAYS[weekday(d)], sea: SEASONS[S.seasonOf(d)], ev: eventsOn(s, d) });
  return out;
}
// Jahresrückblick: Stand der Statistik zu Jahresbeginn merken
export const REVIEW_KEYS = [['fish', '🐟', 'Fische'], ['bugs', '🦋', 'Insekten'], ['harvested', '🌷', 'Geerntet'], ['earned', '🪙', 'Taler verdient'], ['cooked', '🍳', 'Gekocht'], ['crafted', '🔨', 'Gebaut'], ['dives', '🤿', 'Tauchgänge'], ['shells', '🐚', 'Muscheln']];
export function reviewMorning(s) {
  const y = yearOf(s.day);
  if (!s.yearStart || s.yearStart.y !== y) {
    if (s.yearStart && s.yearStart.y === y - 1) s.lastYear = { y: y - 1, diff: Object.fromEntries(REVIEW_KEYS.map(([k]) => [k, (s.stats[k] || 0) - (s.yearStart.st[k] || 0)])), from: s.yearStart.day, to: s.day - 1, hearts: NPC_IDS.map(id => [id, S.hearts(s, id)]) };
    s.yearStart = { y, day: s.day, st: Object.fromEntries(REVIEW_KEYS.map(([k]) => [k, s.stats[k] || 0])) };
    if (s.lastYear) s.mail.push({ kind: 'note', from: 'rosi', title: `📽️ Euer Inseljahr ${s.lastYear.y}`, text: 'Was für ein Jahr! Im Handy unter „Rückblick“ gibt es eine kleine Diashow mit euren Fotos, Erinnerungen und Zahlen.', item: null, n: 1, day: s.day });
  }
}
export function reviewData(s, last = true) {
  if (last && s.lastYear) return s.lastYear;
  const st = s.yearStart || { y: yearOf(s.day), day: 1, st: {} };
  return { y: st.y, diff: Object.fromEntries(REVIEW_KEYS.map(([k]) => [k, (s.stats[k] || 0) - (st.st[k] || 0)])), from: st.day, to: s.day, hearts: NPC_IDS.map(id => [id, S.hearts(s, id)]), running: true };
}
