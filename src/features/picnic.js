// Teil von extras6.js – Picknick: auf der Picknickdecke ein Gericht auslegen, drei Nachbarn setzen sich dazu.
import { ITEMS, NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { hour, shuffle } from './util.js';

export const picnicNow = s => (s.picnic?.day === s.day && hour(s) >= 9 && hour(s) < 19 && s.obj?.[s.picnic.k]?.k === 'picknickdecke' ? s.picnic : null);
export function picnic(s, a, out) {
  const k = `${a.x},${a.z}`;
  if (a.op !== 'lay' || s.obj?.[k]?.k !== 'picknickdecke') return false;
  if (s.picnic?.day === s.day) { out.msg = '🧺 Heute gab es schon ein Picknick – morgen wieder!'; return false; }
  if (hour(s) < 9 || hour(s) >= 18) { out.msg = '🧺 Picknick ist tagsüber (9–18 Uhr).'; return false; }
  if (ITEMS[a.dish]?.cat !== 'dish' || !S.takeInvX(s, a.dish, 1)) return false;
  const guests = shuffle(NPC_IDS).slice(0, 3);
  s.picnic = { k, day: s.day, dish: a.dish, guests };
  for (const id of guests) S.friendX(s, id).f += 15;
  out.msg = `🧺 ${ITEMS[a.dish].icon} ${ITEMS[a.dish].name} ausgelegt – die Nachbarn kommen schon!`;
  out.snd = 'love';
  S.questEventX(s, 'picnic', 1, out);
  return true;
}
// Wo sitzen die Gäste? (Welt: statt ihres üblichen Wegs)
export function picnicSeat(s, id) {
  const P = picnicNow(s), i = P ? P.guests.indexOf(id) : -1;
  if (i < 0) return null;
  const [x, z] = P.k.split(',').map(Number), a = i / 3 * Math.PI * 2 + 0.5;
  return { x: x + Math.sin(a) * 1.15, z: z + Math.cos(a) * 1.15, walking: false, face: [x, z] };
}
