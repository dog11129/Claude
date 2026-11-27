// Teil von extras7.js – Seerosenmoor hinter der Blütenwiese: erst gemeinsam einen Steg bauen (drei Tage),
// dann Frösche und Libellen fangen, Seerosen pflücken, Schilf schneiden und mit dem Floß über den Teich fahren.
import { ITEMS, BUGS } from '../data.js';
import { AREAS } from '../areas.js';
import * as S from '../state.js';
import { who, hour, note } from './util.js';

export const MOOR = { x: 0, z: -900, w: 12, d: 9 };
export const MOOR_GATE = { area: 'wiese', at: [0, -AREAS.wiese.d] }; // Nordrand der Blütenwiese
export const STEG_DAYS = 3, STEG_COST = { holz: 10, stein: 5 };
export const POND7 = { x: 0, z: -1, rx: 6.5, rz: 3.6 };
const inPond = (lx, lz, m = 0) => ((lx - POND7.x) / (POND7.rx + m)) ** 2 + ((lz - POND7.z) / (POND7.rz + m)) ** 2 < 1;
const onBoardwalk = (lx, lz) => Math.abs(lx) <= 0.75 && lz > POND7.z - POND7.rz - 1 && lz < POND7.z + POND7.rz + 1;
export const LILIES = [[-2.2, -2.4], [2.4, -2.0], [-3.6, 0.4], [3.8, 0.6], [-1.8, 1.6], [2.0, 1.8], [-4.8, -1.2], [5.0, -1.4]]; // Seerosenblätter
export const DRAGON = [[-5.5, -4.2], [5.8, -4.4], [-6.8, 2.8], [6.5, 2.6]]; // Libellen schwirren hier
export const REEDS = [[-9, -6], [-7.5, -6.8], [8.6, -6.2], [9.6, 3.4], [-9.4, 4.2], [7, 5.2]];
export const RAFT = [-7.6, -1]; // Floß-Anleger
const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0; };
export const moorOpen = s => !!s.moor?.open;
// Welche Seerosenblätter tragen heute einen Frosch, welche blühen?
export const frogPads = day => [0, 1, 2, 3, 4, 5, 6, 7].filter(i => h32(day, i + 11) % 8 < 3);
export const bloomPads = day => [0, 1, 2, 3, 4, 5, 6, 7].filter(i => h32(day, i + 47) % 8 < 4);
const moorBugs = (s, kind) => BUGS.filter(b => b[5] === 'moor' && b[4].includes(S.seasonOf(s.day)) && (kind === 'frog' ? b[2] === '🐸' : b[2] !== '🐸'));
export const flyAwake = s => hour(s) >= 8 && hour(s) < 19;

export function blockedMoor(s, x, z) {
  const lx = x - MOOR.x, lz = z - MOOR.z;
  if (Math.abs(lx) <= 1.1 && lz > MOOR.d - 0.2 && lz <= MOOR.d + 0.9) return false; // Tor nach Süden
  if (Math.abs(lx) > MOOR.w || Math.abs(lz) > MOOR.d) return true;
  if (inPond(lx, lz) && !onBoardwalk(lx, lz)) return true;
  return REEDS.some(([rx, rz]) => Math.hypot(lx - rx, lz - rz) < 0.6) || Math.hypot(lx - RAFT[0] - 0.9, lz - RAFT[1]) < 0.5;
}
export function resolveMoor(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - MOOR.x, lz = pz - MOOR.z;
  const mx = me.x - MOOR.x, mz = me.z - MOOR.z, M = s.moor;
  if (lz >= MOOR.d - 0.6 && Math.abs(lx) <= 1.2) return { go: 'moorback', label: '🌼 Zurück zur Blütenwiese', tiles: [] };
  if (Math.hypot(mx - RAFT[0], mz - RAFT[1]) < 1.6) return { raft: true, label: '🛶 Mit dem Floß über den Teich', tiles: [] };
  for (const [i, [rx, rz]] of REEDS.entries()) if (Math.hypot(lx - rx, lz - rz) < 1.0) {
    if (M.reed?.[i] === s.day) return { label: '🌾 Schilf · morgen wächst es nach', tiles: [] };
    return sel === 'axe' ? { a: { t: 'moor', op: 'reed', i }, label: '🌾 Schilf schneiden', tiles: [] } : { label: '🌾 Schilf · mit der Axt schneiden', tiles: [] };
  }
  const frogs = frogPads(s.day), blooms = bloomPads(s.day);
  for (const [i, [fx, fz]] of LILIES.entries()) {
    if (Math.hypot(lx - fx, lz - fz) > 1.5 && Math.hypot(mx - fx, mz - fz) > 2.4) continue;
    if (frogs.includes(i) && M.caught?.['f' + i] !== s.day) return sel === 'net' ? { a: { t: 'moor', op: 'catch', kind: 'frog', i }, label: '🐸 Frosch fangen!', tiles: [] } : { label: '🐸 Ein Frosch · mit dem Kescher fangen', tiles: [] };
    if (blooms.includes(i) && M.lily?.[i] !== s.day && Math.hypot(lx - fx, lz - fz) < 1.5) return { a: { t: 'moor', op: 'lily', i }, label: '🪷 Seerose pflücken', tiles: [] };
  }
  if (flyAwake(s)) for (const [i, [dx, dz]] of DRAGON.entries()) {
    if (Math.hypot(lx - dx, lz - dz) > 1.6 || M.caught?.['d' + i] === s.day) continue;
    return sel === 'net' ? { a: { t: 'moor', op: 'catch', kind: 'fly', i }, label: '🦋 Libelle fangen!', tiles: [] } : { label: '🦋 Eine Libelle · mit dem Kescher fangen', tiles: [] };
  }
  return { label: '', tiles: [] };
}
// Am Nordrand der Blütenwiese: Steg bauen oder hinüber
export function resolveMoorGate(s, me, at) {
  if (S.zoneOf(me) !== MOOR_GATE.area) return null;
  const A = AREAS[MOOR_GATE.area], px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  if (Math.hypot(px - A.x - MOOR_GATE.at[0], pz - A.z - MOOR_GATE.at[1]) > 1.3) return null;
  return moorOpen(s) ? { go: 'moor', label: '🪷 Zum Seerosenmoor', tiles: [] } : { ui: 'moorsteg', label: `🪵 Steg zum Moor bauen (${s.moor?.steg || 0}/${STEG_DAYS})`, tiles: [] };
}
export function moor(s, a, out) {
  const M = s.moor, me = who(s);
  if (a.op === 'steg') {
    if (M.open) return false;
    if (!s.areas?.wiese) return false;
    if (M.last === s.day) { out.msg = '🪵 Für heute ist genug gebaut – morgen geht es weiter!'; return false; }
    if (Object.entries(STEG_COST).some(([id, n]) => (s.inv[id] || 0) < n)) { out.msg = `🪵 Für ein Stück Steg: ${STEG_COST.holz} Holz und ${STEG_COST.stein} Steine.`; return false; }
    for (const [id, n] of Object.entries(STEG_COST)) S.takeInvX(s, id, n);
    M.steg = (M.steg || 0) + 1; M.last = s.day; (M.by ||= {})[me] = (M.by[me] || 0) + 1;
    if (M.steg >= STEG_DAYS) {
      M.open = s.day;
      out.msg = '🪷 Der Steg ist fertig! Hinter der Blütenwiese liegt jetzt das Seerosenmoor.';
      out.snd = 'fanfare';
      note(s, '🪷 Das Seerosenmoor ist offen!', 'Was für eine Gemeinschaftsarbeit! Hinter der Blütenwiese führt jetzt ein Steg ins Moor: Frösche, Libellen, Seerosen und ein Floß warten auf euch.', null, 1);
    } else { out.msg = `🪵 Ein Stück Steg geschafft (${M.steg}/${STEG_DAYS}). Bruno und Kalle helfen mit – morgen geht es weiter!`; out.snd = 'till'; }
    S.questEventX(s, 'steg', 1, out);
    return true;
  }
  if (!M.open) return false;
  if (a.op === 'catch') {
    const key = (a.kind === 'frog' ? 'f' : 'd') + a.i;
    if (!Number.isInteger(a.i) || M.caught[key] === s.day) return false;
    if (a.kind === 'frog' ? !frogPads(s.day).includes(a.i) || !LILIES[a.i] : !DRAGON[a.i] || !flyAwake(s)) return false;
    const pool = moorBugs(s, a.kind);
    if (!pool.length) { out.msg = a.kind === 'frog' ? '🐸 Die Frösche halten Winterschlaf.' : '🦋 Jetzt fliegen keine Libellen.'; return false; }
    M.caught[key] = s.day;
    let r = Math.random() * pool.reduce((t, b) => t + b[6], 0), id = pool[0][0];
    for (const b of pool) if ((r -= b[6]) <= 0) { id = b[0]; break; }
    if (Math.random() < 0.15) { out.msg = a.kind === 'frog' ? '🐸 Platsch – weggehüpft!' : '🦋 Zu langsam …'; out.snd = 'splash'; return true; }
    S.addInvX(s, id, 1); S.collectX(s, id, out);
    s.stats.bugs = (s.stats.bugs || 0) + 1;
    out.got = id; out.caught = id; out.msg = `${ITEMS[id].icon} ${ITEMS[id].name} gefangen!`; out.snd = 'harvest';
    S.questEventX(s, 'bug', 1, out); S.questEventX(s, 'moor', 1, out);
    if (id === 'goldfrosch' && !M.king) { M.king = s.day; note(s, '🐸 Ein goldener Frosch!', 'Im Moor erzählt man sich, dass ein goldener Frosch Glück bringt. Für eure Sammlung: eine kleine Froschkönig-Figur.', 'froschkoenig', 1); }
    return true;
  }
  if (a.op === 'lily') {
    if (!bloomPads(s.day).includes(a.i) || M.lily[a.i] === s.day) return false;
    M.lily[a.i] = s.day;
    S.addInvX(s, 'seerose', 1);
    out.msg = '🪷 Eine Seerose!'; out.snd = 'harvest';
    S.questEventX(s, 'moor', 1, out);
    return true;
  }
  if (a.op === 'reed') {
    if (!REEDS[a.i] || M.reed[a.i] === s.day) return false;
    M.reed[a.i] = s.day;
    S.addInvX(s, 'schilf', 2);
    out.msg = '🌾 2× Schilf'; out.snd = 'chop';
    return true;
  }
  if (a.op === 'raft') { M.rafts = (M.rafts || 0) + 1; S.questEventX(s, 'moor', 1, out); return true; }
  return false;
}
// Floßfahrt: einmal um den Teich (Weltkoordinaten)
export const RAFT_SECS = 22;
export function raftAt(t) {
  const a = Math.PI + t / RAFT_SECS * Math.PI * 2, rx = POND7.rx - 1.6, rz = POND7.rz - 1.0;
  return { x: MOOR.x + POND7.x + Math.cos(a) * rx, z: MOOR.z + POND7.z + Math.sin(a) * rz, ry: Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz) };
}
