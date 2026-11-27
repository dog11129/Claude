// Inselleben 14 „Lieblingsplätze“: Gelände formen (Teiche, Hügel, Brücken, Treppen), Liebesschlösser, Kuscheln zu zweit,
// der Hase, der einzieht, Schneemänner mit Bewertung, mehr Sternschnuppen, Saisonkatalog, Lieferdienst, Salon,
// Hausfassade und neue Sträuße & Kränze. (Neue Wegsorten und Laternen sind reine Daten in data.js.)
import { STREET } from './newleaf.js';
import * as S from './state.js';
import { terra14, migrateTerra, morningTerra } from './features/terra.js';
import { lock14, cuddle14, pet14, snow14, rate14, resolveCozy, migrateCozy, morningCozy } from './features/cozy14.js';
import { scat14, deliver14, salon14, ext14, migrateTrade, morningTrade } from './features/trade14.js';
export * from './features/terra.js';
export * from './features/cozy14.js';
export * from './features/trade14.js';
export * from './salon-data.js';

export const SALON_AT = [7, 3.05]; // der Salon-Stand in der Bummelgasse (lokal)
export function resolve14(s, me, sel, at) {
  if (S.inside(me)) return null;
  if (S.zoneOf(me) === 'street') {
    const px = (at ? at.x : me.x + Math.sin(me.ry) * 0.9) - STREET.x, pz = (at ? at.z : me.z + Math.cos(me.ry) * 0.9) - STREET.z;
    return Math.hypot(px - SALON_AT[0], pz - SALON_AT[1]) < 1.35 ? { ui: 'salon14', label: '💇 Salon Schnipp & Glanz', tiles: [] } : null;
  }
  return resolveCozy(s, me, sel, at);
}
export function migrate14(s) { migrateTerra(s); migrateCozy(s); migrateTrade(s); }
export function morning14(s) { morningTerra(s); morningCozy(s); morningTrade(s); }
export const E14_ACTIONS = { terra14, lock14, cuddle14, pet14, snow14, rate14, scat14, deliver14, salon14, ext14 };
