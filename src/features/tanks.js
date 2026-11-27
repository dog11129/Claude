// Teil von extras6.js – Aquarium & Terrarium: gefangene Fische und Krabbeltiere zu Hause ausstellen.
import { ITEMS, ALBUM } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import { XROOMS } from './home2.js';

export const TANK_MAX = 4;
export const tankOk = (kind, id) => (kind === 'fish' ? ALBUM.fish.includes(id) || ALBUM.sea.includes(id) : ALBUM.bug.includes(id));
// Ein Becken im eigenen Haus (auch Dachboden, Keller, Baumhaus)
export function tankAt(s, x, z, room) {
  if (room && !XROOMS[room]) return null;
  const R = S.roomOf(s, room || null), h = S.homeAt(s, x, z, false, R);
  return h && FURNITURE[h.o.k]?.tank ? h : null;
}
export function tank(s, a, out) {
  const h = Number.isInteger(a.x) && Number.isInteger(a.z) ? tankAt(s, a.x, a.z, a.room) : null;
  if (!h) return false;
  const kind = FURNITURE[h.o.k].tank, list = h.o.a ||= [];
  if (a.op === 'add') {
    if (!tankOk(kind, a.id) || !(s.inv[a.id] > 0)) return false;
    if (list.length >= TANK_MAX) { out.msg = `${kind === 'fish' ? '🐠' : '🦗'} Das Becken ist voll (höchstens ${TANK_MAX}).`; return false; }
    S.takeInvX(s, a.id, 1);
    list.push(a.id);
    out.msg = `${ITEMS[a.id].icon} ${ITEMS[a.id].name} ${kind === 'fish' ? 'schwimmt' : 'krabbelt'} jetzt im ${FURNITURE[h.o.k].name}!`;
    out.snd = kind === 'fish' ? 'splash' : 'plopp';
    S.questEventX(s, 'tank', 1, out);
    return true;
  }
  if (a.op === 'take') {
    if (!Number.isInteger(a.i) || !list[a.i]) return false;
    const [id] = list.splice(a.i, 1);
    S.addInvX(s, id, 1);
    if (!list.length) delete h.o.a;
    out.snd = 'plopp';
    return true;
  }
  return false;
}
// Becken abbauen: Bewohner zurück in die Tasche (aus state.hpick)
export function tankEmpty(s, o) { for (const id of o?.a || []) if (ITEMS[id]) S.addInvX(s, id, 1); if (o) delete o.a; }
