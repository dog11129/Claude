// Teil von extras4.js – Winterspaß: Schneeballschlacht, Schlitten, Eislaufen auf dem zugefrorenen Teich.
import { NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { who } from './util.js';

export const isWinter = s => S.seasonOf(s.day) === 'winter';
export const SNOW_PRIZE = 10; // Treffer am Tag für den Preis

export function snow(s, a, out) {
  if (!isWinter(s)) return false;
  const W = s.winter;
  if (W.day !== s.day) Object.assign(W, { day: s.day, hits: {}, npc: {}, laps: {}, sled: {} });
  const me = who(s);
  if (a.op === 'hit') {
    if (typeof a.on !== 'string' || a.on.length > 40) return false;
    if (a.on.startsWith('npc:')) {
      const id = a.on.slice(4);
      if (!NPC_IDS.includes(id) || (W.npc[id] || 0) >= 2) return false;
      W.npc[id] = (W.npc[id] || 0) + 1;
      S.friendX(s, id).f += 4;
    }
    W.hits[me] = (W.hits[me] || 0) + 1;
    if (Number.isFinite(a.x) && Number.isFinite(a.z)) out.fx.push({ x: a.x, z: a.z, txt: '❄️', k: 'dust' });
    S.questEventX(s, 'snowball', 1, out);
    out.snd = 'plopp';
    if (W.hits[me] === SNOW_PRIZE) { s.money += 800; s.stats.earned += 800; out.msg = `❄️ ${SNOW_PRIZE} Treffer heute – Schneeball-Champion! +800 Taler`; }
    return true;
  }
  if (a.op === 'lap') { // eine Runde auf dem Eis
    W.laps[me] = (W.laps[me] || 0) + 1;
    S.questEventX(s, 'skate', 1, out);
    out.msg = W.laps[me] === 3 ? '⛸️ Drei Runden auf dem Eis – wie ein Profi! +300 Taler' : `⛸️ Runde ${W.laps[me]}!`;
    if (W.laps[me] === 3) { s.money += 300; s.stats.earned += 300; }
    out.snd = 'plopp';
    return true;
  }
  if (a.op === 'sled') {
    if (W.sled[me]) return false;
    W.sled[me] = 1;
    S.questEventX(s, 'sled', 1, out);
    return true;
  }
  return false;
}
