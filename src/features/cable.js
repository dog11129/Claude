// Teil von extras2.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { AREAS, nodeAt, inArea } from '../areas.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Seilbahn (Rathaus-Projekt): Station auf der Insel, Haltestellen in den freigeschalteten Gebieten.
// =====================================================================
export const cableBuilt = s => Object.entries(s.obj || {}).find(([, o]) => o?.k === 'seilbahn') || null;
const stops = {};
export function cableStop(id) { // Haltestelle im Gebiet: freier Platz vorne links (nicht auf Bäumen oder Erz)
  if (stops[id]) return stops[id];
  const A = AREAS[id];
  for (let lz = A.d - 2; lz > 0; lz--) for (let lx = -A.w + 2; lx < 0; lx++) {
    let free = true;
    for (let i = -1; i <= 1 && free; i++) for (let j = -1; j <= 1; j++) if (nodeAt(id, lx + i, lz + j) || !inArea(id, lx + i, lz + j)) { free = false; break; }
    if (free) return (stops[id] = [A.x + lx, A.z + lz]);
  }
  return (stops[id] = [A.x - A.w + 2, A.z + A.d - 2]);
}
