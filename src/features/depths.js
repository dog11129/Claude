// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS } from '../data.js';
import { AREAS, NODES } from '../areas.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { fmt } from './util.js';

// =====================================================================
// Höhlen-Tiefen: unter der Kristallhöhle drei dunkle Ebenen – nur mit Grubenlaterne.
// 1 Glühwurmgrotte: fünf Kristalle zum Leuchten bringen (jeder schaltet auch seine Nachbarn) → Kristalltür
// 2 Echohalle: die singende Tür summt vier Töne – auf den Klangsteinen nachspielen
// 3 Kristallsee: der Herzkristall (einmalig) – und in jeder Ebene Edelsteinadern, jeden Tag neu
// =====================================================================
export const DEPTH = { z: 2000, r: 9 };
export const DEPTH_LV = [
  { name: 'Glühwurmgrotte', icon: '✨', x: -40 },
  { name: 'Echohalle', icon: '🎵', x: 0 },
  { name: 'Kristallsee', icon: '💎', x: 40 },
];
export const depthAt = p => (p.z > 1900 ? Math.max(0, Math.min(2, Math.round((p.x + 40) / 40))) : -1);
export const DEPTH_UP = [0, DEPTH.r - 1.6]; // Treppe nach oben (Süden)
export const DEPTH_DOOR = [0, -(DEPTH.r - 1.4)]; // Tür nach unten (Norden) in Ebene 1 und 2
export const DEPTH_VEINS = [[-5.5, -2.2], [5.5, -2.2], [-4.6, 3.6], [4.6, 3.6]];
export const DEPTH_RING = Array.from({ length: 5 }, (_, i) => [Math.round(Math.sin(i * 2 * Math.PI / 5) * 320) / 100, Math.round(-Math.cos(i * 2 * Math.PI / 5) * 320) / 100 + 0.6]);
export const ECHO_STONES = [[-3, -4.6], [-1, -4.6], [1, -4.6], [3, -4.6]];
export const ECHO_NOTES = [60, 64, 67, 72]; // tief → hoch (C E G C)
export const ECHO_SYMS = ['🔵', '🟢', '🟡', '🟣'];
export const DEPTH_LAKE = 3.3;
// Die Treppe in der Kristallhöhle: hinten an der Felswand, wo keine Erzader steht
export const DEPTH_STAIRS = (() => {
  const A = AREAS.hoehle, back = -(A.d - 1);
  for (const [x, z] of [[0, back], [-2, back], [2, back], [0, back + 1], [-4, back], [4, back], [-2, back + 1], [2, back + 1]]) {
    if (!NODES.hoehle.some(n => Math.abs(n.x - x) < 2 && Math.abs(n.z - z) < 2)) return [A.x + x, A.z + z];
  }
  return [A.x, A.z - A.d + 2];
})();

const near = (lx, lz, [x, z], r) => Math.hypot(lx - x, lz - z) < r;
export function depthBlocked(s, x, z) {
  const lv = depthAt({ x, z }), lx = x - DEPTH_LV[lv].x, lz = z - DEPTH.z;
  if (Math.hypot(lx, lz) > DEPTH.r - 0.5) return true;
  if (DEPTH_VEINS.some(v => near(lx, lz, v, 0.65))) return true;
  if (lv === 0 && DEPTH_RING.some(c => near(lx, lz, c, 0.4))) return true;
  if (lv === 1 && ECHO_STONES.some(c => near(lx, lz, c, 0.45))) return true;
  if (lv === 2 && Math.hypot(lx, lz) < DEPTH_LAKE) return true;
  return lv < 2 && !s.depth?.open?.[lv] && Math.abs(lx) < 1.3 && lz < DEPTH_DOOR[1] + 0.5; // geschlossene Tür
}

export function resolveDepth(s, me, sel, at) {
  const lv = depthAt(me), L = DEPTH_LV[lv], D = s.depth || {};
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const lx = px - L.x, lz = pz - DEPTH.z, mx = me.x - L.x, mz = me.z - DEPTH.z, none = { label: '', tiles: [] };
  if (near(mx, mz, DEPTH_UP, 1.6)) return { go: 'depthup:' + lv, label: lv ? `⬆️ Hinauf: ${DEPTH_LV[lv - 1].icon} ${DEPTH_LV[lv - 1].name}` : '⬆️ Hinauf zur Kristallhöhle', tiles: [] };
  if (lv < 2 && (near(lx, lz, DEPTH_DOOR, 1.6) || near(mx, mz, DEPTH_DOOR, 1.8))) {
    if (D.open?.[lv]) return { go: 'depth:' + (lv + 1), label: `⬇️ Hinab: ${DEPTH_LV[lv + 1].icon} ${DEPTH_LV[lv + 1].name}`, tiles: [] };
    return lv === 0 ? { label: '🔒 Die Kristalltür ist zu. Bringt alle fünf Kristalle zum Leuchten!', tiles: [] } : { ui: 'depthdoor', label: '🎵 Die Tür summt eine Melodie …', tiles: [] };
  }
  const v = DEPTH_VEINS.findIndex(p => near(lx, lz, p, 1.1));
  if (v >= 0) {
    const got = D.got?.[lv + ':' + v] === s.day;
    if (sel !== 'shovel') return { label: got ? '💎 Für heute leer' : '💎 Edelsteinader · mit der Schaufel draufhauen', tiles: [] };
    return got ? { label: '💎 Morgen wieder', tiles: [] } : { a: { t: 'depth', op: 'mine', lv, i: v }, label: '⛏️ Edelsteinader abbauen', tiles: [] };
  }
  if (lv === 0) {
    const c = DEPTH_RING.findIndex(p => near(lx, lz, p, 0.9));
    if (c >= 0) return D.open?.[0] ? { label: '✨ Der Kristall leuchtet', tiles: [] } : { a: { t: 'depth', op: 'ring', i: c }, label: D.ring?.[c] ? '✨ Kristall antippen (leuchtet)' : '🔮 Kristall antippen', tiles: [] };
  }
  if (lv === 1 && ECHO_STONES.some(p => near(lx, lz, p, 1))) return D.open?.[1] ? { label: '🎵 Die Klangsteine summen leise', tiles: [] } : { ui: 'depthdoor', label: '🎵 Klangsteine', tiles: [] };
  if (lv === 2 && Math.hypot(mx, mz) < DEPTH_LAKE + 1.7) return D.heart ? { label: '💗 Der Herzkristall leuchtet still', tiles: [] } : { a: { t: 'depth', op: 'heart' }, label: '💗 Den Herzkristall berühren', tiles: [] };
  return none;
}

// Start der Kristall-Aufgabe: zufällig, aber nie schon gelöst (jeder Zustand ist lösbar)
export function startRing() {
  let r;
  do r = Array.from({ length: 5 }, () => (Math.random() < 0.5 ? 1 : 0)); while (r.every(Boolean));
  return r;
}
export const startSong = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));

const LOOT = [
  [['kristall', 26], ['amethyst', 22], ['mondstein', 30], ['topas', 22]],
  [['mondstein', 22], ['topas', 26], ['smaragd', 26], ['rubin', 13], ['saphir', 13]],
  [['smaragd', 30], ['opal', 22], ['saphir', 18], ['rubin', 18], ['regenbogenkristall', 12]],
];
const lootOf = lv => { const L = LOOT[lv]; let r = Math.random() * L.reduce((t, l) => t + l[1], 0); for (const [id, w] of L) if ((r -= w) <= 0) return id; return L[0][0]; };

export function depth(s, a, out) {
  const D = s.depth;
  const lvOk = lv => Number.isInteger(lv) && lv >= 0 && lv <= 2;
  if (a.op === 'enter') { // jemand ist hinabgestiegen: wie tief war die Insel schon?
    const lv = a.lv;
    if (!lvOk(lv) || D.lv > lv || (lv > 0 && !D.open[lv - 1])) return false;
    D.lv = lv + 1;
    if (lv === 0) {
      X.moment(s, 'depth', '🏮', 'Hinab in die Tiefe', 'Unter der Kristallhöhle: eine Grotte voller Glühwürmchen – und eine verschlossene Kristalltür.', out);
      S.questEventX(s, 'depth', 1, out);
      out.msg = '✨ Die Glühwurmgrotte! Bringt alle fünf Kristalle zum Leuchten – jeder Kristall schaltet auch seine Nachbarn um.';
    } else if (lv === 1) out.msg = '🎵 Die Echohalle! Hört der singenden Tür gut zu und spielt ihre Melodie auf den Klangsteinen nach.';
    else {
      S.questEventX(s, 'depth3', 1, out);
      out.msg = '💎 Der Kristallsee – ganz unten im Berg. In der Mitte schimmert etwas …';
    }
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'ring') {
    const i = a.i;
    if (D.open[0] || D.lv < 1 || !Number.isInteger(i) || i < 0 || i > 4) return false;
    for (const j of [i + 4, i, i + 1]) D.ring[j % 5] = D.ring[j % 5] ? 0 : 1;
    out.snd = 'plopp';
    if (D.ring.every(Boolean)) {
      D.open[0] = s.day;
      out.msg = '🚪 Alle fünf Kristalle leuchten – die Kristalltür gleitet zur Seite!';
      out.snd = 'unlock';
    }
    return true;
  }
  if (a.op === 'song') {
    if (D.open[1] || !D.open[0] || D.lv < 2 || !Array.isArray(a.notes) || a.notes.length !== 4) return false;
    if (a.notes.join() !== D.song.join()) { out.msg = '🎵 Die Tür brummt tief … das war noch nicht ihre Melodie.'; out.snd = 'fail'; return true; }
    D.open[1] = s.day;
    out.msg = '🚪 Die Tür singt die Melodie mit – und öffnet sich! Dahinter geht es hinab zum Kristallsee.';
    out.snd = 'unlock';
    return true;
  }
  if (a.op === 'mine') {
    const { lv, i } = a;
    if (!lvOk(lv) || !Number.isInteger(i) || !DEPTH_VEINS[i] || D.lv < lv + 1) return false;
    const k = lv + ':' + i;
    if (D.got[k] === s.day) { out.msg = '💎 Diese Ader ist für heute leer.'; return false; }
    D.got[k] = s.day;
    const id = lootOf(lv);
    S.addInvX(s, id, 1);
    S.collectX(s, id, out);
    out.got = id;
    out.msg = `💎 ${ITEMS[id].icon} ${ITEMS[id].name}!`;
    out.fx.push({ x: DEPTH_LV[lv].x + DEPTH_VEINS[i][0], z: DEPTH.z + DEPTH_VEINS[i][1], txt: '✨', k: 'coin' });
    out.snd = 'found';
    S.questEventX(s, 'gem', 1, out);
    S.questEventX(s, 'deepgem', 1, out);
    return true;
  }
  if (a.op === 'heart') {
    if (D.heart || D.lv < 3) return false;
    D.heart = s.day;
    const m = 8000;
    s.money += m; s.stats.earned += m;
    S.addInvX(s, 'regenbogenkristall', 1);
    S.collectX(s, 'regenbogenkristall', out);
    S.addInvX(s, 'kristallleuchte', 1);
    (s.diary ||= []).push({ day: s.day, icon: '💗', text: 'Den Herzkristall am Kristallsee gefunden!' });
    X.moment(s, 'depthheart', '💗', 'Das Herz der Höhle', 'Am Kristallsee leuchtet der Herzkristall – dazu ein Regenbogenkristall und eine Kristall-Leuchte fürs Zuhause.', out);
    out.got = 'regenbogenkristall';
    out.msg = `💗 Der Herzkristall leuchtet auf! ${fmt(m)} Taler, ein Regenbogenkristall und eine Kristall-Leuchte für euer Zuhause.`;
    out.snd = 'fanfare';
    return true;
  }
  return false;
}

export function migrateDepth(s) {
  const d = s.depth && typeof s.depth === 'object' ? s.depth : {};
  const ring = Array.isArray(d.ring) && d.ring.length === 5 ? d.ring.map(v => (v ? 1 : 0)) : startRing();
  const song = Array.isArray(d.song) && d.song.length === 4 && d.song.every(n => Number.isInteger(n) && n >= 0 && n < 4) ? d.song : startSong();
  const open = Array.isArray(d.open) ? [d.open[0] || 0, d.open[1] || 0] : [0, 0];
  s.depth = { lv: Number.isInteger(d.lv) ? Math.max(0, Math.min(3, d.lv)) : 0, ring, open, song, heart: d.heart || 0, got: d.got && typeof d.got === 'object' ? d.got : {} };
}
