// Teil von extras6.js – Jahrmarkt hinter der Bummelgasse: Riesenrad, Karussell, Losbude, Entenangeln, Süßigkeiten.
import { ITEMS } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import { who, hour, fmt, rnd, pick } from './util.js';

export const FAIR = { x: 0, z: -600, w: 12, d: 8 }; // begehbar |lx| ≤ w, |lz| ≤ d, Tor im Süden
export const FAIR_DAYS = { spring: 2, summer: 4, autumn: 4, winter: 2 }; // einmal pro Jahreszeit (kein anderes Fest an dem Tag)
const seaDay = day => ((day - 1) % 7) + 1;
export const fairDay = day => FAIR_DAYS[S.seasonOf(day)] === seaDay(day);
export const fairOpen = s => fairDay(s.day) && hour(s) >= 10 && hour(s) < 22;
export const nextFair = s => { for (let d = s.day; d < s.day + 40; d++) if (fairDay(d) && (d > s.day || hour(s) < 22)) return d; return null; };
// Fahrgeschäfte & Buden (lokale Koordinaten), r = fest (man läuft drum herum)
export const FAIR_SPOTS = {
  rad: { x: 0, z: -5.2, r: 2.0, name: 'Riesenrad', icon: '🎡', price: 200, secs: 24 },
  karussell: { x: -7, z: -1, r: 1.9, name: 'Karussell', icon: '🎠', price: 150, secs: 16 },
  lose: { x: 7, z: -2.5, r: 1.0, name: 'Losbude', icon: '🎟️', price: 300 },
  enten: { x: 6.5, z: 3, r: 1.1, name: 'Entenangeln', icon: '🦆', price: 200 },
  suess: { x: -6.5, z: 4, r: 0.9, name: 'Süßigkeiten', icon: '🍭' },
};
export const SWEETS = [['zuckerwatte', 120], ['kandisapfel', 150], ['popcorn', 100]];
export const PLUSH = ['pluesch_baer', 'pluesch_hase', 'pluesch_ente'];
export const LOSE_MAX = 10, DUCK_MAX = 5;

export function fairBlocked(s, x, z) {
  const lx = x - FAIR.x, lz = z - FAIR.z;
  const inside = Math.abs(lx) <= FAIR.w && Math.abs(lz) <= FAIR.d, gate = Math.abs(lx) <= 1.1 && lz > 0 && lz <= FAIR.d + 0.9;
  if (!inside && !gate) return true;
  return Object.values(FAIR_SPOTS).some(p => Math.hypot(lx - p.x, lz - p.z) < p.r);
}
export function resolveFair(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - FAIR.x, lz = pz - FAIR.z;
  if (lz >= FAIR.d - 0.6 && Math.abs(lx) <= 1.2) return { go: 'fairback', label: '🛍️ Zurück zur Bummelgasse', tiles: [] };
  for (const [k, p] of Object.entries(FAIR_SPOTS)) {
    if (Math.hypot(lx - p.x, lz - p.z) > p.r + 1.1) continue;
    if (!fairOpen(s)) return { label: `${p.icon} ${p.name} · der Jahrmarkt hat zu`, tiles: [] };
    return { ui: 'fair', uid: { k }, label: `${p.icon} ${p.name}${p.price ? ` · ${fmt(p.price)} Taler` : ''}`, tiles: [] };
  }
  return { label: '', tiles: [] };
}

export function fair(s, a, out) {
  const F = s.fair, me = who(s);
  if (F.day !== s.day) { F.day = s.day; F.lose = {}; F.ducks = {}; }
  if (!fairOpen(s)) { out.msg = '🎡 Der Jahrmarkt hat gerade zu.'; return false; }
  const pay = n => { if (s.money < n) { out.msg = `Das kostet ${fmt(n)} Taler.`; return false; } s.money -= n; return true; };
  if (a.op === 'ride') {
    const P = FAIR_SPOTS[a.k];
    if (!P?.secs || !pay(P.price)) return false;
    F.rides = (F.rides || 0) + 1;
    S.questEventX(s, 'fair', 1, out);
    out.snd = 'gondola';
    return true;
  }
  if (a.op === 'los') {
    if ((F.lose[me] || 0) >= LOSE_MAX) { out.msg = '🎟️ Für heute sind alle Lose verkauft.'; return false; }
    if (!pay(FAIR_SPOTS.lose.price)) return false;
    F.lose[me] = (F.lose[me] || 0) + 1;
    const r = Math.random(), id = r < 0.02 ? 'riesenteddy' : r < 0.07 ? 'pluesch_drache' : r < 0.42 ? pick(PLUSH) : r < 0.75 ? 'lutscher' : null;
    if (id) { S.addInvX(s, id, 1); out.got = id; }
    out.msg = !id ? '🎟️ Niete … beim nächsten Mal!' : id === 'riesenteddy' ? '🎉 HAUPTGEWINN! Ein riesiger Teddy!' : `🎟️ Gewonnen: ${ITEMS[id].icon} ${ITEMS[id].name}!`;
    out.snd = !id ? 'fail' : id === 'lutscher' ? 'coin' : 'fanfare';
    S.questEventX(s, 'fair', 1, out);
    return true;
  }
  if (a.op === 'ducks') {
    const n = a.hooked;
    if (!Number.isInteger(n) || n < 0 || n > 3) return false;
    if ((F.ducks[me] || 0) >= DUCK_MAX) { out.msg = '🦆 Die Enten brauchen eine Pause – morgen wieder!'; return false; }
    if (!pay(FAIR_SPOTS.enten.price)) return false;
    F.ducks[me] = (F.ducks[me] || 0) + 1;
    const nums = Array.from({ length: n }, () => 1 + rnd(9)), sum = nums.reduce((a, b) => a + b, 0);
    const id = sum >= 20 ? 'pluesch_drache' : sum >= 13 ? pick(PLUSH) : sum > 0 ? 'lutscher' : null;
    if (id) S.addInvX(s, id, 1);
    out.msg = n ? `🦆 Unter den Enten: ${nums.join(' + ')} = ${sum}. ${id ? `${ITEMS[id].icon} ${ITEMS[id].name}!` : ''}` : '🦆 Keine Ente erwischt …';
    out.snd = id && id !== 'lutscher' ? 'fanfare' : n ? 'coin' : 'fail';
    out.ducks = nums;
    S.questEventX(s, 'fair', 1, out);
    return true;
  }
  if (a.op === 'buy') {
    const it = SWEETS.find(x => x[0] === a.id);
    if (!it || !pay(it[1])) return false;
    S.addInvX(s, it[0], 1);
    out.msg = `${ITEMS[it[0]].icon} ${ITEMS[it[0]].name} – lecker!`;
    out.snd = 'coin';
    return true;
  }
  return false;
}
export const isFairPrize = id => FURNITURE[id]?.rare === 'fair';
// Riesenrad & Karussell drehen sich nach der Weltzeit – Welt und Fahrgast rechnen gleich
export const WHEEL = { hub: 3.5, r: 2.7, n: 8, period: 24, dz: 0.5 };
export const CAROUSEL = { r: 1.35, n: 6, period: 9 };
export function wheelSeat(t, i) {
  const P = FAIR_SPOTS.rad, a = t / WHEEL.period * Math.PI * 2 + i / WHEEL.n * Math.PI * 2;
  return { x: FAIR.x + P.x + Math.sin(a) * WHEEL.r, y: WHEEL.hub - Math.cos(a) * WHEEL.r - 0.55, z: FAIR.z + P.z + WHEEL.dz, a };
}
export function carouselSeat(t, i) {
  const P = FAIR_SPOTS.karussell, a = t / CAROUSEL.period * Math.PI * 2 + i / CAROUSEL.n * Math.PI * 2;
  return { x: FAIR.x + P.x + Math.sin(a) * CAROUSEL.r, y: 0.42 + Math.sin(t * 3 + i * 1.7) * 0.12, z: FAIR.z + P.z + Math.cos(a) * CAROUSEL.r, ry: a + Math.PI / 2, a };
}
