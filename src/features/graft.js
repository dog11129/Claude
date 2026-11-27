// Teil von extras6.js – Obstbäume veredeln: eine zweite Sorte aufpfropfen. Nach zwei Tagen trägt der Baum beide,
// und manche Paare bringen ab und zu eine ganz neue Frucht.
import { ITEMS, FRUITS } from '../data.js';
import * as S from '../state.js';

export const HYBRID = { 'apfel+birne': 'birnapfel', 'kirsche+pfirsich': 'kirschpfirsich', 'orange+pfirsich': 'sonnenpfirsich', 'apfel+kirsche': 'rubinapfel', 'birne+orange': 'goldbirne' };
export const GRAFT_DAYS = 2;
export const pairOf = (a, b) => [a, b].sort().join('+');
export const graftGrown = (s, k) => !!s.graft?.[k] && s.day >= s.graft[k].day + GRAFT_DAYS;
// Mit dem Veredelungsmesser an einem Obstbaum (aus der Vor-Prüfung in state.resolve)
export function graftResolve(s, k, x, z) {
  const one = [[x, z]];
  if (S.resAt(s, k) !== 'tree') return null;
  const base = S.fruitOf(s, k);
  if (!FRUITS.includes(base)) return { label: '✂️ Nur an Obstbäumen', tiles: one };
  const g = s.graft[k];
  if (g) return { label: graftGrown(s, k) ? `✂️ Trägt schon ${ITEMS[base].icon} + ${ITEMS[g.f].icon}` : `✂️ ${ITEMS[g.f].icon} wächst noch an (${Math.max(1, g.day + GRAFT_DAYS - s.day)} Tag${g.day + GRAFT_DAYS - s.day > 1 ? 'e' : ''})`, tiles: one };
  const id = FRUITS.find(f => f !== base && s.inv[f] > 0);
  return id ? { a: { t: 'graft', x, z, id }, label: `✂️ Mit ${ITEMS[id].icon} ${ITEMS[id].name} veredeln`, tiles: one } : { label: `✂️ Dafür eine andere Obstsorte als ${ITEMS[base].icon} mitbringen`, tiles: one };
}
export function graft(s, a, out) {
  const k = `${a.x},${a.z}`;
  if (!(s.inv.veredelmesser > 0) || S.resAt(s, k) !== 'tree' || s.graft[k]) return false;
  const base = S.fruitOf(s, k);
  if (!FRUITS.includes(base) || !FRUITS.includes(a.id) || a.id === base || !S.takeInvX(s, a.id, 1)) return false;
  s.graft[k] = { f: a.id, day: s.day };
  const h = HYBRID[pairOf(base, a.id)];
  out.msg = `✂️ ${ITEMS[a.id].icon} aufgepfropft! In ${GRAFT_DAYS} Tagen trägt der Baum zwei Sorten${h ? ' – und vielleicht etwas ganz Neues …' : '.'}`;
  out.snd = 'till';
  S.questEventX(s, 'graft', 1, out);
  return true;
}
// Beim Schütteln eines reifen Baums (aus state.shake): die zweite Sorte und mit Glück eine neue Frucht
export function graftShake(s, k, out, drop) {
  if (!graftGrown(s, k)) return;
  const g = s.graft[k], base = S.fruitOf(s, k), h = HYBRID[pairOf(base, g.f)];
  drop({ id: g.f, n: 1 });
  if (Math.random() < 0.5) drop({ id: g.f, n: 1 });
  if (h && Math.random() < 0.3) { drop({ id: h, n: 1 }); out.msg = `✨ Eine ganz neue Frucht: ${ITEMS[h].icon} ${ITEMS[h].name}!`; s.hybrids[h] = s.hybrids[h] || s.day; }
}
