// Teil von extras5.js – Ponyhof (füttern, striegeln, ausreiten) und Haustierschule (Tricks, kleine Show).
import { NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { who, fmt } from './util.js';

export const PONY_FOOD = ['karotte', 'apfel'];
export const ponyHappy = s => s.pony?.fed === s.day || s.pony?.brushed === s.day;
export function pony(s, a, out) {
  if (!Object.values(s.obj || {}).some(o => o?.k === 'ponystall')) return false;
  const P = s.pony;
  if (a.op === 'name') { const n = String(a.name || '').trim().slice(0, 14); if (!n) return false; P.name = n; out.msg = `🐴 ${n} wiehert fröhlich!`; return true; }
  if (a.op === 'feed') {
    if (P.fed === s.day) { out.msg = `🐴 ${P.name || 'Das Pony'} ist schon satt.`; return false; }
    const food = PONY_FOOD.find(id => s.inv[id] > 0);
    if (!food) { out.msg = '🐴 Ponys mögen Karotten und Äpfel.'; return false; }
    S.takeInvX(s, food, 1); P.fed = s.day; P.love = Math.min(100, (P.love || 0) + 5);
    out.msg = `🐴 Mampf! ${P.name || 'Das Pony'} liebt ${food === 'apfel' ? 'Äpfel' : 'Karotten'}.`; out.snd = 'love';
    return true;
  }
  if (a.op === 'brush') {
    if (P.brushed === s.day) { out.msg = '🐴 Das Fell glänzt schon.'; return false; }
    P.brushed = s.day; P.love = Math.min(100, (P.love || 0) + 4);
    out.msg = '🐴 Bürste, bürste … das Fell glänzt!'; out.snd = 'plopp';
    return true;
  }
  if (a.op === 'ride') {
    if (!ponyHappy(s)) { out.msg = '🐴 Erst füttern oder striegeln – dann geht es los!'; return false; }
    S.questEventX(s, 'ride_pony', 1, out);
    return true;
  }
  return false;
}

export const TRICKS = [['sitz', 'Sitz', '🐾'], ['pfote', 'Pfote geben', '🤝'], ['rolle', 'Rolle', '🔄'], ['sprung', 'Hochsprung', '⬆️'], ['tanz', 'Tänzchen', '💃']];
export const TRICK_DAYS = 3; // so oft üben, bis ein Trick sitzt
export function petschool(s, a, out) {
  const me = who(s), P = s.petschool[me] ||= { t: {} };
  if (a.op === 'train') {
    const tr = TRICKS.find(x => x[0] === a.k);
    if (!tr) return false;
    if (P.day === s.day) { out.msg = '🐾 Für heute ist genug geübt – morgen weiter!'; return false; }
    if ((P.t[tr[0]] || 0) >= TRICK_DAYS) return false;
    P.day = s.day;
    P.t[tr[0]] = (P.t[tr[0]] || 0) + 1;
    out.msg = P.t[tr[0]] >= TRICK_DAYS ? `🎉 Geschafft! Dein Haustier kann jetzt „${tr[1]}“.` : `🐾 „${tr[1]}“ geübt (${P.t[tr[0]]}/${TRICK_DAYS}).`;
    out.snd = P.t[tr[0]] >= TRICK_DAYS ? 'fanfare' : 'plopp';
    return true;
  }
  if (a.op === 'show') {
    const n = TRICKS.filter(x => (P.t[x[0]] || 0) >= TRICK_DAYS).length;
    if (n < 3) { out.msg = '🐾 Für eine Show braucht es drei Tricks.'; return false; }
    if (P.show === s.day) { out.msg = '🐾 Heute war schon Show.'; return false; }
    P.show = s.day;
    const m = n * 300;
    s.money += m; s.stats.earned += m;
    for (const id of NPC_IDS) S.friendX(s, id).f += 2;
    out.msg = `🐾 Applaus! ${n} Tricks – die Nachbarn sind begeistert. +${fmt(m)} Taler`;
    out.snd = 'fanfare';
    return true;
  }
  return false;
}
