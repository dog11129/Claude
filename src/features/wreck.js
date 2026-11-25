// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Schiffswrack: an der gelben Boje abtauchen, Truhen jeden Tag, Bullaugen-Rätsel für die Kapitänskajüte
// =====================================================================
export const WRECK = { x: 0, z: 1500, r: 12 };
export const WRECK_BUOY = [-31, 12];
export const WRECK_SYMS = ['⚓', '🐚', '⭐', '🐟'];
export const WRECK_CHESTS = [[-7, 3.5], [7, 4.5], [-1.5, 6.5]];
export const WRECK_PORTS = [[-4.5, -1.15], [-1.5, -1.15], [1.5, -1.15], [4.5, -1.15]]; // vom Bug (Westen) zum Heck
export const WRECK_DOOR = [6.9, -2.6];
const HULL = { x0: -6.6, x1: 6.6, z0: -4.6, z1: -1.4 };
export const onWreckExit = (lx, lz) => Math.abs(lx) <= 1.2 && lz >= WRECK.r - 2.2;
export function wreckBlocked(s, x, z) {
  const lx = x - WRECK.x, lz = z - WRECK.z;
  if (Math.hypot(lx, lz) > WRECK.r - 0.4) return true;
  if (lx > HULL.x0 && lx < HULL.x1 && lz > HULL.z0 && lz < HULL.z1) return true;
  return WRECK_CHESTS.some(([cx, cz]) => Math.hypot(lx - cx, lz - cz) < 0.5);
}
export function resolveWreck(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - WRECK.x, lz = pz - WRECK.z;
  if (onWreckExit(me.x - WRECK.x, me.z - WRECK.z)) return { go: 'wreckup', label: '🫧 Auftauchen', tiles: [] };
  const c = WRECK_CHESTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.1);
  if (c >= 0) return s.wreck?.got?.[c] === s.day ? { label: '🧰 Leer – morgen wieder', tiles: [] } : { a: { t: 'wreck', op: 'chest', i: c }, label: '🧰 Truhe öffnen', tiles: [] };
  if (Math.hypot(lx - WRECK_DOOR[0], lz - WRECK_DOOR[1]) < 1.4) return s.wreck?.open ? { label: '🚪 Die Kapitänskajüte – schon geplündert', tiles: [] } : { ui: 'wrecklock', label: '🔒 Kapitänskajüte', tiles: [] };
  const p = WRECK_PORTS.findIndex(([x, z]) => Math.abs(lx - x) < 0.9 && Math.abs(lz - z) < 1.2);
  if (p >= 0) return { label: `🪟 Bullauge ${p + 1}: ${s.wreck?.code?.[p] || '?'}`, tiles: [] };
  return { label: '', tiles: [] };
}
const WRECK_LOOT = [['money', 40], ['dublone', 10], ['perle', 10], ['seeglas', 14], ['goldnugget', 8], ['flaschenpost', 8], ['koralle', 10]];
export function wreck(s, a, out) {
  const W = s.wreck;
  if (a.op === 'found') {
    if (W.found) return false;
    W.found = s.day;
    X.moment(s, 'wreck', '⚓', 'Ein Schiffswrack!', 'Unter der gelben Boje liegt ein altes Segelschiff – mit Truhen und einer verschlossenen Kajüte.', out);
    out.msg = '⚓ Ein versunkenes Schiff! Öffnet die Truhen – und findet heraus, wie die Kapitänskajüte aufgeht.';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'chest') {
    const i = a.i;
    if (!Number.isInteger(i) || !WRECK_CHESTS[i] || W.got[i] === s.day) return false;
    W.got[i] = s.day;
    if (!W.chart) { // die erste Truhe hat die Seekarte
      W.chart = s.day;
      S.addInvX(s, 'seekarte', 1);
      out.got = 'seekarte';
      S.questEventX(s, 'chest', 1, out);
      out.msg = '🗺️ Eine alte Seekarte! Darauf steht: „Der Schlüssel zur Kajüte – lies die Bullaugen vom Bug bis zum Heck.“ (Der Bug ist vorne, bei der Galionsfigur im Westen.)';
      out.snd = 'found';
      return true;
    }
    const tot = WRECK_LOOT.reduce((t, l) => t + l[1], 0);
    let r = Math.random() * tot, id = 'money';
    for (const [l, w] of WRECK_LOOT) if ((r -= w) <= 0) { id = l; break; }
    if (id === 'money' || !ITEMS[id]) { const m = 400 + rnd(9) * 100; s.money += m; s.stats.earned += m; out.msg = `🧰 ${fmt(m)} Taler in der Truhe!`; }
    else { S.addInvX(s, id, 1); S.collectX(s, id, out); out.got = id; out.msg = `🧰 ${ITEMS[id].icon} ${ITEMS[id].name}!`; }
    out.fx.push({ x: WRECK.x + WRECK_CHESTS[i][0], z: WRECK.z + WRECK_CHESTS[i][1], txt: '✨', k: 'coin' });
    out.snd = 'found';
    S.questEventX(s, 'chest', 1, out);
    return true;
  }
  if (a.op === 'open') {
    if (W.open || !Array.isArray(a.code) || a.code.length !== 4) return false;
    if (a.code.join('') !== W.code.join('')) { out.msg = '🔒 Klack … die Tür bleibt zu. Die Reihenfolge stimmt noch nicht.'; out.snd = 'lock'; return true; }
    W.open = s.day;
    const m = 6000;
    s.money += m; s.stats.earned += m;
    for (const id of ['kapitaenstruhe', 'buddelschiff', 'schiffsglocke']) S.addInvX(s, id, 1);
    S.addInvX(s, 'dublone', 3);
    note(s, '⚓ Der Schatz des Kapitäns', 'Ahoi!\nIhr habt die Kajüte geöffnet. Steuerrad und Anker sind zu schwer für eure Taschen – die bringe ich euch per Post.\n\nEure Rosi 🐰', 'steuerrad', 1);
    note(s, '⚓ Und noch der Anker', 'Hier ist der Anker – er sieht am Strand bestimmt toll aus!', 'anker', 1);
    (s.diary ||= []).push({ day: s.day, icon: '⚓', text: 'Die Kapitänskajüte im Schiffswrack geöffnet!' });
    X.moment(s, 'wreckopen', '🧭', 'Der Schatz des Kapitäns', 'Truhe, Buddelschiff, Schiffsglocke, Golddublonen – und 6.000 Taler!', out);
    out.got = 'kapitaenstruhe';
    out.msg = `🧭 Die Kajüte springt auf! ${fmt(m)} Taler, Golddublonen, Kapitänstruhe, Buddelschiff und Schiffsglocke!`;
    out.snd = 'unlock';
    return true;
  }
  return false;
}
