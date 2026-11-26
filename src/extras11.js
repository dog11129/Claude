// Inselleben 11 „Für zwei“: Unser Tag (Monatstage & Jahrestag), Greifautomat mit Kuscheltieren, Dinner bei Kerzenschein,
// Liebesbriefe & neues Briefpapier, Kleider und Frisuren. Logik in src/features/couple.js, Fenster ui-extra8.js,
// Browser client/fun9.js.
import { dinner11 as dinnerAct, migrate11, coupleCheck, E11_ACTIONS as ACTS } from './features/couple.js';
import { roomOf, homeAt, HOME_X } from './state.js';
import { XROOMS } from './features/home2.js';
export * from './features/couple.js';

export function resolveFurn11(s, h, R, base, tiles) {
  const k = h.o.k;
  if (k === 'greifautomat') return { ...base, ui: 'claw11', label: '🕹️ Greifautomat', tiles };
  if (k === 'dinnertisch') {
    const done = s.dinner11?.day === s.day;
    return { ...base, a: { t: 'dinner11', x: h.x, z: h.z, room: R.id || null }, label: done ? '🕯️ Heute schon zusammen gegessen' : '🕯️ Dinner zu zweit', tiles };
  }
  return null;
}
function dinner11(s, a, out) {
  if (!Number.isInteger(a.x) || !Number.isInteger(a.z) || (a.room && !XROOMS[a.room])) return false;
  const R = roomOf(s, a.room || null), h = homeAt(s, a.x, a.z, false, R);
  if (!dinnerAct(s, a, out, h?.o?.k === 'dinnertisch')) return false;
  out.fx.push({ x: HOME_X + h.x + (h.o.r % 2 ? 0 : 0.5), z: R.z0 + h.z + (h.o.r % 2 ? 0.5 : 0), txt: '🕯️💕', k: 'heart' });
  return true;
}
export const E11_ACTIONS = { ...ACTS, dinner11 };
export { migrate11, coupleCheck };
