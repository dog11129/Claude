// Teil von extras15.js – Schmuckwerkstatt (Goldschmiede im Salon) und das Kostümfest (Kürbisse schnitzen, Kostüme für Bonbons).
// Schmuck und Kostüm-Hüte liegen wie Frisuren in der Garderobe der Insel (s.wardrobe) – wer sie hat, trägt sie im Aussehen.
import { ITEMS } from '../data.js';
import * as S from '../state.js';
import { addLove } from './love.js';
import { JEWELS, jewelKey, jewelOf, COSTUMES, FACES, carvedId } from '../jewel-data.js';

export const costText = c => Object.entries(c).map(([id, n]) => `${n}× ${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`).join(', ');
export const canPay = (s, c) => Object.entries(c).every(([id, n]) => (s.inv?.[id] || 0) >= n);
export function jewel15(s, a, out) {
  const j = jewelOf(a.slot, a.id);
  if (!j) return false;
  const W = s.wardrobe ||= {};
  if (W[jewelKey(j[0])]) { out.msg = 'Das habt ihr schon – im Aussehen (💎 Schmuck) anlegen.'; return false; }
  if (!canPay(s, j[2])) { out.msg = `Dafür brauchst du ${costText(j[2])}.`; return false; }
  for (const [id, n] of Object.entries(j[2])) S.takeInvX(s, id, n);
  W[jewelKey(j[0])] = s.day;
  s.stats.jewels = (s.stats.jewels || 0) + 1;
  out.jewel15 = { slot: a.slot, id: j[0] };
  out.msg = `💎 ${j[1]} – frisch aus der Goldschmiede!`;
  if (j[0] === 'partnerband') { addLove(s, 15, out); out.msg = '💞 Zwei Partner-Armbänder, eins für jede:n von euch. +15 💕'; }
  out.snd = 'fanfare';
  return true;
}
export function costume15(s, a, out) {
  const c = COSTUMES.find(x => x[0] === a.id);
  if (!c) return false;
  const W = s.wardrobe ||= {};
  if (W[c[0]]) { out.msg = 'Das Kostüm habt ihr schon.'; return false; }
  if ((s.inv.bonbon || 0) < c[2]) { out.msg = `Dafür brauchst du ${c[2]} Bonbons 🍬.`; return false; }
  S.takeInvX(s, 'bonbon', c[2]);
  W[c[0]] = s.day;
  out.costume15 = c[0];
  out.msg = `🎃 ${c[1]} – liegt in eurer Garderobe!`;
  out.snd = 'fanfare';
  return true;
}
// Ist heute Kürbisfest?
export const kostuemFest = s => s.fest?.k === 'kuerbis' && s.fest.day === s.day;
export const CARVE_CANDY = 3; // so viele geschnitzte Kürbisse bringen am Festtag Bonbons
export function carve15(s, a, out) {
  const f = FACES.find(x => x[0] === a.face);
  if (!f) return false;
  if ((s.inv.kuerbis || 0) < 1) { out.msg = 'Zum Schnitzen brauchst du einen 🎃 Kürbis (wächst im Herbst).'; return false; }
  S.takeInvX(s, 'kuerbis', 1);
  S.addInvX(s, carvedId(f[0]), 1);
  s.stats.carved = (s.stats.carved || 0) + 1;
  out.msg = `${f[2]} ${f[1]} geschnitzt – stellt ihn draußen auf, nachts leuchtet er.`;
  if (kostuemFest(s) && (s.fest.carved || 0) < CARVE_CANDY) { s.fest.carved = (s.fest.carved || 0) + 1; S.addInvX(s, 'bonbon', 2); out.msg += ' +2 🍬'; }
  out.snd = 'chop';
  return true;
}
// Am Kürbisfest: Wer schon einen Kürbis geschnitzt hat, bekommt von den Nachbarn ein Bonbon mehr
export const candyBonus = s => (kostuemFest(s) && s.fest.carved ? 1 : 0);
export { JEWELS, COSTUMES, FACES, jewelKey, carvedId };
