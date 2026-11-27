// Teil von extras2.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { AREAS, nodeAt, inArea } from '../areas.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Korallenriff: An der Riffboje abtauchen (Neoprenanzug), unten sammeln und 14 Plätze selbst gestalten.
// =====================================================================
export const REEF = { x: 0, z: 1200, r: 11 };
export const REEF_BUOY = [26, -17];
export const REEF_SLOTS = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = i % 2 ? 6.6 : 4.4; return [Math.round(Math.cos(a) * r * 10) / 10, Math.round(Math.sin(a) * r * 10) / 10 - 1]; });
export const REEF_DECO = ['koralle', 'seestern', 'seeanemone', 'auster', 'seeigel', 'perle', 'herzmuschel', 'jakobsmuschel', 'sanddollar', 'kauri', 'seeglas', 'riffkoralle'];
export const REEF_FINDS = [['koralle', 22], ['seestern', 16], ['seeanemone', 14], ['seeglas', 16], ['riffkoralle', 12], ['auster', 8], ['jakobsmuschel', 8], ['perle', 2]];
export const REEF_SPOTS = [[-7, 3], [7, 3], [-3, -7], [4, -6], [-8, -4], [8, -3], [0, 6]];
export const onReefExit = (lx, lz) => Math.abs(lx) <= 1.2 && lz >= REEF.r - 2.2;
export const reefWalk = (lx, lz) => Math.hypot(lx, lz) <= REEF.r - 0.4;
export function reefScore(s) {
  const v = Object.values(s.reef?.slots || {}).filter(Boolean);
  return { n: v.length, kinds: new Set(v).size, stars: Math.min(5, Math.floor((v.length + new Set(v).size * 2) / 6)) };
}
export function reefBlocked(s, x, z) {
  const lx = x - REEF.x, lz = z - REEF.z;
  if (!reefWalk(lx, lz)) return true;
  return REEF_SLOTS.some(([sx, sz], i) => s.reef?.slots?.[i] && Math.hypot(lx - sx, lz - sz) < 0.45);
}
export function resolveReef(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - REEF.x, lz = pz - REEF.z;
  if (onReefExit(me.x - REEF.x, me.z - REEF.z)) return { go: 'reefup', label: '🫧 Auftauchen', tiles: [] };
  const sp = REEF_SPOTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.1);
  if (sp >= 0) return s.reef?.got?.[sp] === s.day ? { label: '🫧 Heute schon abgesucht', tiles: [] } : { a: { t: 'reef', op: 'find', i: sp }, label: '🤿 Absuchen', tiles: [] };
  const sl = REEF_SLOTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 0.8);
  if (sl >= 0) return { ui: 'reef', slot: sl, label: s.reef?.slots?.[sl] ? `🪸 ${ITEMS[s.reef.slots[sl]].name} · ändern` : '🪸 Hier etwas hinsetzen', tiles: [] };
  return { label: '', tiles: [] };
}
export function reef(s, a, out) {
  s.reef ||= { found: 0, slots: {}, got: {} };
  const R = s.reef;
  if (a.op === 'found') {
    if (R.found) return false;
    R.found = s.day;
    X.moment(s, 'reef', '🪸', 'Das Korallenriff entdeckt', 'Unter der Boje lag ein ganzes Riff voller Farben – und es wartet darauf, gestaltet zu werden.', out);
    out.msg = '🪸 Ihr habt ein Korallenriff entdeckt! Sucht die Fundstellen ab und gestaltet die 14 Plätze mit Korallen und Muscheln.';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'find') {
    const i = a.i;
    if (!Number.isInteger(i) || !REEF_SPOTS[i] || R.got[i] === s.day) return false;
    R.got[i] = s.day;
    const tot = REEF_FINDS.reduce((t, f) => t + f[1], 0);
    let r = Math.random() * tot, id = 'koralle';
    for (const [f, w] of REEF_FINDS) if ((r -= w) <= 0) { id = f; break; }
    S.addInvX(s, id, 1);
    S.collectX(s, id, out);
    S.questEventX(s, 'dive', 1, out);
    out.fx.push({ x: REEF.x + REEF_SPOTS[i][0], z: REEF.z + REEF_SPOTS[i][1], txt: `+1 ${ITEMS[id].icon}`, k: 'splash' });
    out.got = id;
    out.snd = 'harvest';
    return true;
  }
  if (a.op === 'set') {
    if (!Number.isInteger(a.i) || !REEF_SLOTS[a.i]) return false;
    const old = R.slots[a.i];
    if (a.item === null) { if (!old) return false; delete R.slots[a.i]; S.addInvX(s, old, 1); out.msg = `${ITEMS[old].icon} zurück in die Tasche`; return true; }
    if (!REEF_DECO.includes(a.item) || !S.takeInvX(s, a.item, 1)) return false;
    if (old) S.addInvX(s, old, 1);
    R.slots[a.i] = a.item;
    const sc = reefScore(s);
    if (sc.stars >= 5 && !R.prize) {
      R.prize = s.day;
      note(s, '🪸 Euer Riff ist ein Wunder!', 'Liebe Riff-Gestalter,\nich bin mit Taucherbrille und Notizbuch zu eurem Riff getaucht – fünf Sterne! So viele Farben, so viele Fische! Als Dank: meine Korallenlampe. Sie leuchtet wie das Riff bei Nacht.\n\nEure Wanda 🔬', 'korallenlampe', 1, 'wanda');
      X.moment(s, 'reef5', '🐠', 'Ein Fünf-Sterne-Riff', 'Bunte Fische schwärmen jetzt um eure Korallen.', out);
    }
    out.msg = `🪸 ${ITEMS[a.item].icon} ${ITEMS[a.item].name} gesetzt · Riff: ${'⭐'.repeat(sc.stars) || '–'}`;
    out.snd = 'place';
    return true;
  }
  return false;
}
