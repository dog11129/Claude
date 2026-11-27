// Teil von extras6.js – Imkerei: Bienenkästen neben blühenden Blumen. Der Honig schmeckt nach den Blumen ringsum.
import { ITEMS, CROPS } from '../data.js';
import * as S from '../state.js';
import { flowerColor } from './florist.js';
import { note } from './util.js';

export const HONEY_OF = { rot: 'rosenhonig', rosa: 'bluetenhonig', gelb: 'sonnenhonig', orange: 'bernsteinhonig', lila: 'lavendelhonig', blau: 'himmelshonig', weiss: 'kleehonig' };
export const HONEYS = Object.values(HONEY_OF);
export const BEE_R = 3, BEE_MIN = 3;
// Blühende Blumen um den Kasten, nach Farbe gezählt
export function beeFlowers(s, x, z) {
  const n = {};
  for (let i = -BEE_R; i <= BEE_R; i++) for (let j = -BEE_R; j <= BEE_R; j++) {
    const c = s.tiles?.[`${x + i},${z + j}`]?.c;
    if (!c || !CROPS[c.k]?.flower || S.stage(c) < 3) continue;
    const col = flowerColor(c.k);
    if (col) n[col] = (n[col] || 0) + 1;
  }
  return n;
}
export const beeTotal = n => Object.values(n).reduce((a, b) => a + b, 0);
export const beeFlavor = n => Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
export function beeResolve(s, k, x, z) {
  const one = [[x, z]];
  if (s.bees[k] === s.day) return { label: '🐝 Summ … morgen gibt es wieder Honig', tiles: one };
  const n = beeFlowers(s, x, z), t = beeTotal(n);
  if (t < BEE_MIN) return { label: `🐝 Die Bienen brauchen ${BEE_MIN} blühende Blumen ringsum (${t}/${BEE_MIN})`, tiles: one };
  const id = HONEY_OF[beeFlavor(n)];
  return { a: { t: 'bees', x, z }, label: `🍯 ${ITEMS[id].name} ernten`, tiles: one };
}
export function bees(s, a, out) {
  const k = `${a.x},${a.z}`;
  if (s.obj?.[k]?.k !== 'bienenkasten' || s.bees[k] === s.day) return false;
  const n = beeFlowers(s, a.x, a.z), t = beeTotal(n);
  if (t < BEE_MIN) return false;
  const id = HONEY_OF[beeFlavor(n)], cnt = t >= 8 ? 2 : 1;
  s.bees[k] = s.day;
  S.addInvX(s, id, cnt);
  out.got = id;
  out.msg = `🍯 ${cnt}× ${ITEMS[id].name}!${s.honeys[id] ? '' : ' Eine neue Sorte!'}`;
  out.snd = 'harvest';
  out.fx.push({ x: a.x, z: a.z, txt: '🐝', k: 'leaf' });
  s.honeys[id] = s.honeys[id] || s.day;
  s.stats.honey = (s.stats.honey || 0) + 1;
  S.questEventX(s, 'honey', 1, out);
  if (!s.honeyAll && HONEYS.every(h => s.honeys[h])) { s.honeyAll = s.day; note(s, '🍯 Alle sieben Honigsorten!', 'Was für eine Sammlung! Für eure Gläser gibt es eine eigene Honigvitrine.', 'honigvitrine', 1); }
  return true;
}
