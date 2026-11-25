// Teil von extras4.js – Modenschau: jeden Tag ein Thema, drei Nachbarn bewerten das Outfit.
import { NPC_IDS, NPC_DATA } from '../data.js';
import * as S from '../state.js';
import { who } from './util.js';

// Thema: was gut ankommt (Oberteil, Hut, Brille, Farben)
export const THEMES = [
  { id: 'sommer', name: 'Sommerfrisch', icon: '🌞', top: ['tshirt', 'dress'], hat: ['straw', 'sunhat', 'flowers'], glasses: ['sun'], col: ['#ffe066', '#8fd694', '#6cc4ff', '#ffb86b', '#7fd8d0'] },
  { id: 'gemuetlich', name: 'Gemütlich', icon: '🧣', top: ['hoodie', 'overalls'], hat: ['beanie', 'cat', 'bunny'], glasses: ['round'], col: ['#ffd0a8', '#c9b48a', '#8a5a3a', '#b39cff', '#ff8fab'] },
  { id: 'elegant', name: 'Elegant', icon: '🎩', top: ['vest', 'dress'], hat: ['tophat', 'tiara', 'beret', 'crown'], glasses: ['round'], col: ['#3b3b4a', '#2f3e5c', '#f5f5f5', '#5a5f73', '#4a6fa5'] },
  { id: 'bunt', name: 'Kunterbunt', icon: '🌈', top: ['tshirt', 'hoodie', 'dress'], hat: ['flowers', 'bow', 'pirate', 'cap'], glasses: ['heart'], col: ['#ff6b6b', '#ffe066', '#b39cff', '#ff8fab', '#8fd694'] },
  { id: 'sport', name: 'Sportlich', icon: '🏃', top: ['tshirt', 'hoodie'], hat: ['cap', 'none'], glasses: ['sun', 'none'], col: ['#6cc4ff', '#ff6b6b', '#f5f5f5', '#8fd694', '#3b3b4a'] },
];
export const themeOf = s => THEMES[s.day % THEMES.length];
export const judges = s => { const r = (s.day * 17 + 3) % NPC_IDS.length; return [NPC_IDS[r], NPC_IDS[(r + 1) % NPC_IDS.length], NPC_IDS[(r + 3) % NPC_IDS.length]]; };
const str = v => (typeof v === 'string' ? v.slice(0, 20) : '');
// Punkte 0–10 für einen Look zum Thema (ohne Zufall, damit die Vorschau stimmt)
export function lookPoints(T, look) {
  const l = look && typeof look === 'object' ? look : {};
  let p = 0;
  if (T.top.includes(str(l.top))) p += 3;
  if (T.hat.includes(str(l.hat))) p += 3;
  if (T.glasses.includes(str(l.glasses))) p += 1;
  p += ['topColor', 'bottomColor'].filter(k => T.col.includes(str(l[k]))).length * 1.5;
  if (str(l.pat)) p += 0.5; // eigenes Muster zeigt Mut
  return Math.min(10, p);
}
export function fashion(s, a, out) {
  if (a.op !== 'walk') return false;
  const F = s.fashion, me = who(s), T = themeOf(s);
  if (F.day !== s.day) { F.day = s.day; F.walked = {}; }
  if (F.walked[me]) { out.msg = '👗 Heute bist du schon über den Laufsteg gelaufen – morgen gibt es ein neues Thema!'; return false; }
  F.walked[me] = 1;
  const p = lookPoints(T, a.look), J = judges(s);
  const stars = J.map((id, i) => Math.max(1, Math.min(5, Math.round(p / 2 + ((s.day + i * 7 + id.length) % 3 - 1) * 0.6))));
  const total = stars.reduce((t, v) => t + v, 0), m = total * 60;
  s.money += m; s.stats.earned += m;
  F.last[me] = { day: s.day, theme: T.id, stars, by: J };
  for (const id of J) S.friendX(s, id).f += 2;
  out.msg = `👗 ${T.icon} ${T.name}: ${J.map((id, i) => `${NPC_DATA[id]?.name || id} ${'⭐'.repeat(stars[i])}`).join(' · ')} · +${m} Taler`;
  if (total === 15 && !F.cup) { F.cup = s.day; S.addInvX(s, 'modepokal', 1); out.msg += ' · Alle Sterne – der Mode-Pokal!'; }
  out.snd = total >= 12 ? 'fanfare' : 'coin';
  S.questEventX(s, 'fashion', 1, out);
  return true;
}
