// Teil von extras6.js – Schatzkarten-Abenteuer: fünf Etappen an fünf Tagen (Insel, Riff, Tropeninsel, Wrack, Strand),
// am Ende eine Piratentruhe. Jede Etappe wird erst am nächsten Morgen lesbar.
import { MAP, BUILDINGS } from '../data.js';
import { grass, isBeach } from '../island.js';
import * as S from '../state.js';
import { REEF } from './reef.js';
import { WRECK } from './wreck.js';
import { fmt, note } from './util.js';

export const PIRATE = [
  { zone: 'island', name: 'Insel', icon: '🏝️', dig: true, clue: 'Ein Kreuz auf eurer Insel – auf der Karte unten eingezeichnet. Mit der Schaufel graben!' },
  { zone: 'reef', name: 'Korallenriff', icon: '🪸', clue: 'Unter der rot-weißen Boje, zwischen den Korallen, liegt eine Muschel mit einem Zeichen. (Mit Neoprenanzug hinschwimmen und abtauchen.)' },
  { zone: 'tropic', name: 'Tropeninsel', icon: '🌴', clue: 'Auf der Tropeninsel ist ein Zeichen in den Sand geritzt – irgendwo zwischen den Palmen. (Käpt\'n Flossi fährt hin.)' },
  { zone: 'wreck', name: 'Schiffswrack', icon: '⚓', clue: 'Im alten Segelschiff unter der gelben Boje hat jemand etwas in die Planken geritzt.' },
  { zone: 'beach', name: 'Strand', icon: '🏖️', dig: true, clue: 'Das letzte Kreuz liegt am Strand – auf der Karte eingezeichnet. Dort wartet die Truhe!' },
];
export const PIRATE_LVL = 3;
const free = (s, x, z) => !S.blocked(s, x, z) && !s.obj?.[x + ',' + z] && !s.tiles?.[x + ',' + z] && !s.paths?.[x + ',' + z];
function spotFor(s, zone) {
  for (let i = 0; i < 400; i++) {
    if (zone === 'island' || zone === 'beach') {
      const x = Math.round((Math.random() - 0.5) * 2 * (MAP - 2)), z = Math.round((Math.random() - 0.5) * 2 * (MAP - 2));
      const ok = zone === 'beach' ? isBeach(x, z) : grass(x, z) && !S.buildingAt(x, z);
      if (ok && free(s, x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => !S.blocked(s, x + a, z + b))) return [x, z];
      continue;
    }
    const C = zone === 'reef' ? [REEF.x, REEF.z, 4, 8] : zone === 'wreck' ? [WRECK.x, WRECK.z, 2, 8] : [S.TROPIC.x, S.TROPIC.z, 3, 6];
    const a = Math.random() * Math.PI * 2, r = C[2] + Math.random() * (C[3] - C[2]), x = Math.round((C[0] + Math.sin(a) * r) * 2) / 2, z = Math.round((C[1] + Math.cos(a) * r) * 2) / 2;
    if ([[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].every(([u, v]) => !S.blocked(s, x + u, z + v))) return [x, z];
  }
  return null;
}
// Wo man gerade ist (für die Zielprüfung)
const zoneOfP = p => { const z = S.zoneOf(p); return z === 'island' ? 'island' : z; };
export const pirateReady = s => !!s.pirate?.on && s.pirate.at && s.day > (s.pirate.day ?? -1);
// Vor der Figur das Zeichen? (Vor-Prüfung in state.resolve)
export function resolvePirate(s, me, sel, at) {
  const P = s.pirate;
  if (!pirateReady(s)) return null;
  const st = PIRATE[P.stage], z = zoneOfP(me);
  if (!st || (st.zone === 'beach' || st.zone === 'island' ? z !== 'island' : z !== st.zone)) return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  if (Math.hypot(px - P.at[0], pz - P.at[1]) > (st.dig ? 0.75 : 1.2)) return null;
  if (st.dig && sel !== 'shovel') return { label: '🗺️ Hier ist das Kreuz! Mit der Schaufel graben', tiles: [[P.at[0], P.at[1]]] };
  return { a: { t: 'pirate', op: 'find' }, label: st.dig ? (P.stage === 4 ? '🏴‍☠️ Die Truhe ausgraben!' : '🗺️ Hier graben!') : '🗺️ Das Zeichen der Karte!', tiles: st.dig ? [[P.at[0], P.at[1]]] : [] };
}
export function pirate(s, a, out) {
  const P = s.pirate;
  if (a.op === 'start') {
    if (P.on || P.done) return false;
    if (s.level < PIRATE_LVL) { out.msg = `🗺️ Die Seekarte gibt es ab Insel-Level ${PIRATE_LVL}.`; return false; }
    const at = spotFor(s, 'island');
    if (!at) { out.msg = '🗺️ Die Insel ist zu voll für ein Kreuz – räumt ein bisschen auf!'; return false; }
    Object.assign(P, { on: 1, stage: 0, at, day: s.day - 1 });
    out.msg = '🗺️ Käpt\'n Flossi gibt euch eine uralte Seekarte! Die erste Spur führt über eure Insel (Handy ➜ Schatz).';
    out.snd = 'level';
    return true;
  }
  if (a.op === 'find') {
    if (!pirateReady(s)) return false;
    P.stage++;
    P.day = s.day;
    if (P.stage >= PIRATE.length) {
      Object.assign(P, { on: 0, done: s.day, at: null });
      s.money += 10000; s.stats.earned += 10000;
      S.addInvX(s, 'piratentruhe', 1); S.addInvX(s, 'steuerrad', 1);
      const hat = !s.wardrobe.pirate;
      if (hat) s.wardrobe.pirate = s.day;
      note(s, '🏴‍☠️ Der Schatz der Seekarte', `Ihr habt alle fünf Zeichen gefunden! In der Truhe: ${fmt(10000)} Taler, ein Steuerrad${hat ? ' und ein echter Piratenhut (⚙️ ➜ Aussehen ➜ Extras)' : ''}.`, null, 1, 'post');
      out.msg = `🏴‍☠️ DIE PIRATENTRUHE! +${fmt(10000)} Taler, Piratentruhe & Steuerrad!`;
      out.snd = 'fanfare';
      S.questEventX(s, 'pirate', 1, out);
      return true;
    }
    const nx = PIRATE[P.stage];
    P.at = spotFor(s, nx.zone) || P.at;
    out.msg = `📜 Kartenstück ${P.stage}/${PIRATE.length} gefunden! Morgen verrät es die nächste Spur: ${nx.icon} ${nx.name}.`;
    out.snd = 'level';
    S.questEventX(s, 'pirate', 1, out);
    return true;
  }
  return false;
}
// In welcher Nähe liegt ein Insel-Kreuz? (Hinweis im Fenster)
export function pirateNear(at) {
  let best = null, bd = Infinity;
  for (const [id, B] of Object.entries(BUILDINGS)) {
    if (id === 'plaza' || id === 'house' || id === 'mail') continue;
    const d = Math.hypot((B.x0 + B.x1) / 2 - at[0], (B.z0 + B.z1) / 2 - at[1]);
    if (d < bd) { bd = d; best = B.name; }
  }
  return best;
}
