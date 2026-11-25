// Teil von extras4.js – Stempelrallye: zehn Stempelstellen, jede/r hat einen eigenen Pass.
import { BUILDINGS } from '../data.js';
import { PIER, POND, riverX, cliffZ } from '../island.js';
import { STREET, TROPIC } from '../newleaf.js';
import { AREAS } from '../areas.js';
import * as S from '../state.js';
import { who, fmt } from './util.js';

const O = BUILDINGS.office, MU = BUILDINGS.museum, wfz = cliffZ(riverX(-12)) + 2.2;
// [id, Name, Symbol, x, z, Gebiet (muss offen sein)]
export const STAMPS = [
  ['dorf', 'Dorfplatz', '🌳', 2.6, 3.2], ['rathaus', 'Rathaus', '🏛️', O.x1 + 1.6, O.z1 + 1.2], ['museum', 'Museum', '🦴', MU.x0 - 1.4, MU.z1 + 1.4],
  ['steg', 'Steg', '⛵', PIER.x + 1.6, PIER.z0 - 0.6], ['teich', 'Teich', '🐸', POND.cx + POND.r + 1.3, POND.cz + 0.6], ['wasserfall', 'Wasserfall', '💧', Math.round((riverX(wfz) - 2.4) * 10) / 10, Math.round(wfz * 10) / 10],
  ['gasse', 'Bummelgasse', '🛍️', STREET.x + 2.5, STREET.z + 2.2], ['tropen', 'Tropeninsel', '🌴', TROPIC.x + 2.8, TROPIC.z + 7.5],
  ['wald', 'Kiefernwald', '🌲', AREAS.wald.x + 2.2, AREAS.wald.z + AREAS.wald.d - 1.4, 'wald'], ['wiese', 'Blütenwiese', '🌼', AREAS.wiese.x + 2.2, AREAS.wiese.z + AREAS.wiese.d - 1.4, 'wiese'],
];
export const STAMP_PRIZE = 5000;
export const stampAt = (x, z) => STAMPS.findIndex(p => Math.hypot(p[3] - x, p[4] - z) < 1.3);
export function stamp(s, a, out) {
  const i = STAMPS.findIndex(p => p[0] === a.id);
  if (a.op !== 'take' || i < 0) return false;
  const P = STAMPS[i], me = who(s), pass = s.stamps[me] ||= {};
  if (P[5] && !s.areas?.[P[5]]) return false;
  if (pass[P[0]]) { out.msg = `📮 ${P[2]} ${P[1]}: Den Stempel hast du schon.`; return false; }
  pass[P[0]] = s.day;
  out.msg = `📮 Stempel ${P[2]} ${P[1]}! (${Object.keys(pass).length}/${STAMPS.length})`;
  out.fx.push({ x: P[3], z: P[4], txt: P[2], k: 'coin' });
  out.snd = 'plopp';
  S.questEventX(s, 'stamp', 1, out);
  if (Object.keys(pass).length === STAMPS.length && !s.stampsDone[me]) {
    s.stampsDone[me] = s.day;
    s.money += STAMP_PRIZE; s.stats.earned += STAMP_PRIZE;
    S.addInvX(s, 'rallyepokal', 1);
    out.msg = `📮 Der Stempelpass ist voll! ${fmt(STAMP_PRIZE)} Taler und der Rallye-Pokal für dich.`;
    out.snd = 'fanfare';
  }
  return true;
}
