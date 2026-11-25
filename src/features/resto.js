// Teil von extras6.js – Inselrestaurant (Rathaus-Projekt): Bestellungen der Nachbarn kochen und servieren.
import { NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { who, hour, fmt, shuffle } from './util.js';

export const MENU = [['suppe', 'Suppe', '🍲', 2.2], ['salat', 'Salat', '🥗', 1.4], ['pfannkuchen', 'Pfannkuchen', '🥞', 2.8], ['kuchen', 'Kuchen', '🍰', 3.2], ['saft', 'Saft', '🧃', 1.0]]; // Kochzeit in s
export const RESTO_SECS = 90;
export const restoOpen = s => hour(s) >= 11 && hour(s) < 22;
const has = s => Object.values(s.obj || {}).some(o => o?.k === 'restaurant');
export const restoStars = (served, missed) => (served < 1 ? 0 : Math.max(1, Math.min(served < 6 ? 3 : 5, Math.round(5 * served / (served + missed)))));
export function resto(s, a, out) {
  if (!has(s) || a.op !== 'shift') return false;
  const R = s.resto, me = who(s);
  if (!restoOpen(s)) { out.msg = '🍽️ Das Restaurant öffnet um 11 Uhr.'; return false; }
  if (R.done[me] === s.day) { out.msg = '🍽️ Heute hast du schon eine Schicht gemacht.'; return false; }
  const served = a.served, missed = a.missed;
  if (![served, missed].every(n => Number.isInteger(n) && n >= 0 && n <= 40)) return false;
  R.done[me] = s.day;
  const stars = restoStars(served, missed), money = served * 150 + stars * 200;
  s.money += money; s.stats.earned += money;
  R.served = (R.served || 0) + served;
  R.best = Math.max(R.best || 0, served);
  R.stars = [...(R.stars || []), stars].slice(-10);
  for (const id of shuffle(NPC_IDS).slice(0, Math.min(3, Math.ceil(served / 4)))) S.friendX(s, id).f += 3;
  out.msg = served ? `🍽️ Schicht vorbei: ${served} Gäste satt, ${'⭐'.repeat(stars)} · +${fmt(money)} Taler` : '🍽️ Heute ist niemand satt geworden …';
  out.snd = stars >= 4 ? 'fanfare' : 'coin';
  S.questEventX(s, 'resto', served, out);
  if (stars === 5 && !R.five) { R.five = s.day; out.msg += ' – fünf Sterne! Die Inselzeitung berichtet.'; }
  return true;
}
export const restoRating = s => { const st = s.resto?.stars || []; return st.length ? Math.round(st.reduce((a, b) => a + b, 0) / st.length * 10) / 10 : 0; };
