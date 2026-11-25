// Teil von extras4.js – Inselcafé (Rathausprojekt): Getränke zubereiten, Stempelkarte, ein Nachbar auf einen Plausch.
import { ITEMS, NPC_IDS, NPC_DATA } from '../data.js';
import * as S from '../state.js';
import { who, fmt } from './util.js';

export const DRINKS = [['kakao', 120], ['milchkaffee', 150], ['kraeutertee', 100], ['beerenschorle', 140]];
export const CARD_FULL = 10;
export const cafeGuest = s => NPC_IDS[(s.day * 13 + 5) % NPC_IDS.length];
export const hasCafe = s => Object.values(s.obj || {}).some(o => o?.k === 'inselcafe');
export function cafe(s, a, out) {
  if (!hasCafe(s)) return false;
  const C = s.cafe, me = who(s);
  if (C.day !== s.day) { C.day = s.day; C.stamped = {}; C.chat = {}; }
  if (a.op === 'brew') {
    const d = DRINKS.find(x => x[0] === a.k);
    if (!d || !Number.isInteger(a.q) || a.q < 0 || a.q > 3) return false;
    if (s.money < d[1]) { out.msg = `☕ Das kostet ${d[1]} Taler.`; return false; }
    s.money -= d[1];
    const id = a.q === 3 && Math.random() < 0.5 ? 'inselmelange' : d[0];
    S.addInvX(s, id, a.q >= 2 ? 2 : 1);
    out.got = id;
    out.msg = `☕ ${['Hm, etwas dünn', 'Gar nicht schlecht', 'Lecker', 'Perfekt'][a.q]}: ${ITEMS[id].icon} ${ITEMS[id].name}${a.q >= 2 ? ' ×2' : ''}!`;
    if (!C.stamped[me]) {
      C.stamped[me] = 1;
      C.card[me] = (C.card[me] || 0) + 1;
      if (C.card[me] >= CARD_FULL) { C.card[me] = 0; s.money += 2500; s.stats.earned += 2500; S.addInvX(s, 'inselmelange', 3); out.msg += ` · Stempelkarte voll: ${fmt(2500)} Taler und 3× Insel-Melange!`; }
      else out.msg += ` · Stempel ${C.card[me]}/${CARD_FULL}`;
    }
    out.snd = a.q === 3 ? 'fanfare' : 'coin';
    S.questEventX(s, 'cafe', 1, out);
    return true;
  }
  if (a.op === 'chat') {
    if (C.chat[me]) { out.msg = 'Ihr habt heute schon geplaudert.'; return false; }
    C.chat[me] = 1;
    const id = cafeGuest(s);
    S.friendX(s, id).f += 5;
    out.msg = `☕ Du plauderst mit ${NPC_DATA[id]?.name || id} bei einer Tasse – herrlich!`;
    out.snd = 'chat';
    return true;
  }
  return false;
}
