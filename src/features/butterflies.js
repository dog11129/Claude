// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Schmetterlingsgarten: Schmetterlingshaus + blühende Lieblingsblumen in der Nähe = seltene Falter
// =====================================================================
export const GARDEN_BUGS = BUGS.filter(b => b[5] === 'garden');
export function gardenBugs(s, x, z) {
  const house = near(s, 'schmetterlingshaus', x, z, 7);
  if (!house) return [];
  const [hx, hz] = house[0].split(',').map(Number), cnt = {};
  for (const [k, t] of Object.entries(s.tiles || {})) {
    if (!t?.c || !CROPS[t.c.k]) continue;
    const [tx, tz] = k.split(',').map(Number);
    if (Math.hypot(tx - hx, tz - hz) > 5 || S.stage(t.c) < 3) continue;
    cnt[t.c.k] = (cnt[t.c.k] || 0) + 1;
  }
  const sea = S.seasonOf(s.day);
  return GARDEN_BUGS.filter(b => b[4].includes(sea) && (cnt[b[8]] || 0) >= 2);
}
// Welche Blumen locken welchen Falter? (für die Anzeige)
export const gardenInfo = () => GARDEN_BUGS.map(b => ({ id: b[0], flower: b[8], sea: b[4] }));
