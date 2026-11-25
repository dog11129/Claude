// Teil von extras7.js – Nistkästen: Vögel ziehen ein, legen Eier, Küken schlüpfen und werden flügge.
import * as S from '../state.js';
import { pick, note } from './util.js';

export const NEST_BIRDS = [['kohlmeise', 'Kohlmeise'], ['blaumeise', 'Blaumeise'], ['spatz', 'Spatz'], ['rotkehlchen', 'Rotkehlchen']];
export const NEST_STAGES = ['leer', 'eingezogen', 'Eier', 'Küken', 'flügge'];
export const NEST_DAYS = [1, 1, 2, 2]; // Tage bis zur nächsten Stufe
const treeNear = (s, x, z) => Object.entries(S.spots(s)).some(([k, v]) => v === 'tree' && Math.hypot(+k.split(',')[0] - x, +k.split(',')[1] - z) <= 3.5);
export function nestMorning(s) {
  s.nests ||= {};
  for (const [k, o] of Object.entries(s.obj || {})) {
    if (o?.k !== 'nistkasten') continue;
    const [x, z] = k.split(',').map(Number), N = s.nests[k] ||= { st: 0, day: s.day };
    if (N.st === 0) { if (treeNear(s, x, z) && s.day - N.day >= NEST_DAYS[0] && Math.random() < 0.7) Object.assign(N, { st: 1, day: s.day, bird: pick(NEST_BIRDS)[0] }); continue; }
    if (s.day - N.day < NEST_DAYS[N.st]) continue;
    N.st++; N.day = s.day;
    if (N.st === 4) { // flügge: die Familie fliegt weiter, eine Feder bleibt
      const name = NEST_BIRDS.find(b => b[0] === N.bird)?.[1] || 'Vogel';
      ((s.birds ||= {}).seen ||= {})[N.bird] ||= s.day;
      note(s, '🐦 Die Küken sind flügge!', `Im Nistkasten ist es still geworden: Die kleinen ${name}n sind heute früh ausgeflogen. Eine Feder lag noch da.`, 'feder', 1);
      s.stats.fledged = (s.stats.fledged || 0) + 1;
      s.nests[k] = { st: 0, day: s.day };
    }
  }
  for (const k of Object.keys(s.nests)) if (s.obj?.[k]?.k !== 'nistkasten') delete s.nests[k];
}
export function nestResolve(s, k, x, z) {
  const N = s.nests?.[k] || { st: 0 }, name = NEST_BIRDS.find(b => b[0] === N.bird)?.[1];
  const txt = N.st === 0 ? (treeNear(s, x, z) ? 'noch leer – bald zieht jemand ein' : 'leer · steht zu weit weg von Bäumen') : N.st === 1 ? `${name} ist eingezogen` : N.st === 2 ? `🥚 ${name} brütet` : `🐣 Kleine ${name}n piepsen`;
  return { label: `🐦 Nistkasten: ${txt}`, tiles: [[x, z]] };
}
