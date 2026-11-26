// Inselleben 10 „Herzstücke“: Herzensbuch (gemeinsame Herzpunkte mit Belohnungen), neue Zärtlichkeiten, Blumenbinde-Tisch,
// Mieze im Katzenkörbchen, Schminktisch & Make-up, Herzchen-Möbel, Selbstgebackenes. Logik in src/features/love.js,
// Grafik world-extra7.js, Fenster ui-extra7.js, Browser client/fun8.js.
import { bind10, mieze10 as miezeAct, migrate10, morning10 } from './features/love.js';
import { roomOf, homeAt } from './state.js';
import { XROOMS } from './features/home2.js';
export * from './features/love.js';

// Schminktische öffnen den Spiegel (Make-up im Aussehen-Editor)
export const MAKEUP_FURN = ['pfingstrosenschminktisch', 'herzfrisiertisch', 'standspiegel', 'kristallspiegel', 'pfingstrosenspiegel', 'herzspiegel'];
export function resolveFurn10(s, h, R, base, tiles) {
  const k = h.o.k, at = { x: h.x, z: h.z, room: R.id || null };
  if (MAKEUP_FURN.includes(k)) return { ...base, makeup: true, label: k.includes('spiegel') ? '🪞 In den Spiegel schauen' : '💄 Schminken & frisieren', tiles };
  if (k === 'blumentisch') return { ...base, ui: 'bind10', label: '💐 Blumen binden', tiles };
  if (k === 'katzenbett') {
    const M = s.mieze, done = M?.day === s.day && M.who?.[s._who || 'host'];
    return { ...base, a: { t: 'mieze10', ...at }, label: done ? '🐈 Mieze schläft …' : '🐈 Mieze streicheln', tiles };
  }
  return null;
}
function mieze10(s, a, out) {
  if (!Number.isInteger(a.x) || !Number.isInteger(a.z) || (a.room && !XROOMS[a.room])) return false;
  const R = roomOf(s, a.room || null);
  return miezeAct(s, a, out, homeAt(s, a.x, a.z, false, R));
}
export const E10_ACTIONS = { bind10, mieze10 };
export { migrate10, morning10 };
