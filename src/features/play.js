// Teil von extras5.js – Inselolympiade, Schnitzeljagd, Freiluftkino, Inseltheater, Bimmelbahn.
import { ITEMS, NPC_IDS, NPC_DATA } from '../data.js';
import { coast } from '../island.js';
import * as S from '../state.js';
import { who, hour, fmt } from './util.js';

// ---------- Inselolympiade: drei Disziplinen, Medaillen gegen die Bestwerte der Nachbarn ----------
export const OLYMPIA = [['sack', 'Sackhüpfen', '🛍️', [12, 18, 24]], ['ei', 'Eierlauf', '🥚', [10, 16, 22]], ['wurf', 'Weitwurf', '🎯', [18, 28, 36]]]; // Bronze/Silber/Gold
export const medalOf = (d, score) => { const L = OLYMPIA.find(x => x[0] === d)?.[3] || []; return score >= L[2] ? 3 : score >= L[1] ? 2 : score >= L[0] ? 1 : 0; };
export function olymp(s, a, out) {
  const D = OLYMPIA.find(x => x[0] === a.d);
  if (a.op !== 'result' || !D || !Number.isFinite(a.score) || a.score < 0 || a.score > 60) return false;
  const me = who(s), O = s.olymp[me] ||= { best: {}, paid: {} }, m = medalOf(D[0], a.score);
  O.best[D[0]] = Math.max(O.best[D[0]] || 0, Math.round(a.score * 10) / 10);
  const k = D[0] + s.day;
  let msg = `${D[2]} ${D[1]}: ${Math.round(a.score * 10) / 10} · ${['keine Medaille', '🥉 Bronze', '🥈 Silber', '🥇 Gold'][m]}`;
  if (m && !O.paid[k]) { O.paid = { [k]: 1, ...Object.fromEntries(Object.entries(O.paid).filter(([x]) => x.endsWith(String(s.day)))) }; const p = m * 250; s.money += p; s.stats.earned += p; msg += ` · +${p} Taler`; S.questEventX(s, 'medal', 1, out); }
  if (OLYMPIA.every(x => medalOf(x[0], O.best[x[0]] || 0) === 3) && !O.cup) { O.cup = s.day; S.addInvX(s, 'olympiapokal', 1); msg += ' · Dreimal Gold – der Olympia-Pokal!'; }
  out.msg = msg;
  out.snd = m === 3 ? 'fanfare' : m ? 'coin' : 'fail';
  return true;
}

// ---------- Schnitzeljagd: Mitspieler verstecken Dinge mit einem Hinweis ----------
export const HUNT_MAX = 12;
export const huntAt = (s, x, z, me) => (s.hunts || []).find(h => !h.found && h.who !== me && Math.hypot(h.x - x, h.z - z) < 1.3) || null;
export function hunt(s, a, out) {
  const me = who(s);
  if (a.op === 'hide') {
    const clue = String(a.clue || '').trim().slice(0, 120);
    if (!Number.isFinite(a.x) || !Number.isFinite(a.z) || !ITEMS[a.item] || ITEMS[a.item].gear || !(s.inv[a.item] > 0) || clue.length < 3) return false;
    if (s.hunts.filter(h => !h.found).length >= HUNT_MAX) { out.msg = '🔍 Gerade sind genug Schätze versteckt.'; return false; }
    S.takeInvX(s, a.item, 1);
    s.hunts.push({ id: Date.now().toString(36) + Math.floor(Math.random() * 999), who: me, by: String(a.name || 'Gast').slice(0, 16), x: Math.round(a.x * 2) / 2, z: Math.round(a.z * 2) / 2, item: a.item, clue, day: s.day });
    out.msg = '🔍 Versteckt! Die anderen sehen jetzt deinen Hinweis (Handy ➜ Suche).';
    out.snd = 'till';
    return true;
  }
  if (a.op === 'find') {
    const h = s.hunts.find(x => x.id === a.id && !x.found && x.who !== me);
    if (!h) return false;
    h.found = s.day; h.finder = String(a.name || 'Gast').slice(0, 16);
    S.addInvX(s, h.item, 1);
    out.got = h.item;
    out.msg = `🔍 Gefunden! ${ITEMS[h.item].icon} ${ITEMS[h.item].name} – versteckt von ${h.by}.`;
    out.fx.push({ x: h.x, z: h.z, txt: '🎉', k: 'coin' });
    out.snd = 'fanfare';
    s.hunts = s.hunts.filter(x => !x.found || s.day - x.found < 3);
    return true;
  }
  return false;
}

// ---------- Freiluftkino (abends) ----------
export const cinemaOpen = s => hour(s) >= 18;
export function cinema(s, a, out) {
  if (a.op !== 'watch' || !Object.values(s.obj || {}).some(o => o?.k === 'freiluftkino')) return false;
  if (!cinemaOpen(s)) { out.msg = '🎬 Kino ist abends ab 18 Uhr.'; return false; }
  const me = who(s), C = s.cinema;
  if (C.day !== s.day) { C.day = s.day; C.seen = {}; }
  if (C.seen[me]) return true;
  C.seen[me] = 1;
  for (const id of NPC_IDS) S.friendX(s, id).f += 3;
  S.addInvX(s, 'popcorn', 1);
  out.msg = '🎬 Licht aus, Film ab! Die Nachbarn kuscheln sich auf die Decken – und es gibt Popcorn 🍿.';
  out.snd = 'chat';
  return true;
}

// ---------- Inseltheater: Sätze in die richtige Reihenfolge bringen, dann aufführen ----------
export const PLAYS = [
  ['muschel', 'Die verlorene Muschel', ['Am Strand liegt eine silberne Muschel.', 'Mira hebt sie auf und hört das Meer darin.', 'Da ruft eine kleine Krabbe: „Das ist mein Haus!“', 'Mira legt die Muschel vorsichtig zurück.', 'Zum Dank bringt die Krabbe ihr eine Perle.']],
  ['sterne', 'Der Stern, der fallen wollte', ['Ein kleiner Stern langweilt sich am Himmel.', 'Er springt hinunter und landet im Teich.', 'Die Frösche staunen über das Leuchten.', 'Nachts sehnt er sich zurück nach oben.', 'Der Mond hebt ihn sanft wieder hinauf.']],
  ['kuchen', 'Brunos großer Kuchen', ['Bruno will den größten Kuchen backen.', 'Er nimmt viel zu viel Mehl.', 'Der Teig quillt aus dem Ofen!', 'Alle Nachbarn kommen mit Tellern.', 'Am Ende ist kein Krümel mehr übrig.']],
];
export function theater(s, a, out) {
  const P = PLAYS.find(x => x[0] === a.p);
  if (a.op !== 'play' || !P || !Number.isInteger(a.miss) || a.miss < 0 || a.miss > 20 || !Object.values(s.obj || {}).some(o => o?.k === 'buehne')) return false;
  const T = s.theater, stars = Math.max(1, 5 - a.miss);
  if (T.day === s.day) { out.msg = '🎭 Heute war schon Vorstellung – morgen wieder!'; return false; }
  T.day = s.day;
  T.best[P[0]] = Math.max(T.best[P[0]] || 0, stars);
  for (const id of NPC_IDS) S.friendX(s, id).f += stars;
  const m = stars * 400;
  s.money += m; s.stats.earned += m;
  out.msg = `🎭 „${P[1]}“: ${'⭐'.repeat(stars)} – die Nachbarn klatschen! +${fmt(m)} Taler`;
  if (stars === 5 && !T.cup) { T.cup = s.day; S.addInvX(s, 'theaterpokal', 1); out.msg += ' Der Theater-Pokal!'; }
  out.snd = stars >= 4 ? 'fanfare' : 'coin';
  return true;
}

// ---------- Bimmelbahn: einmal rund um die Insel am Strand entlang ----------
export const TRAIN_SECS = 40;
export const TRAIN_PATH = (() => {
  const p = [];
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    let r = 40;
    while (r > 4 && coast(Math.cos(a) * r, Math.sin(a) * r) > -3.2) r -= 0.25;
    p.push([Math.round(Math.cos(a) * r * 10) / 10, Math.round(Math.sin(a) * r * 10) / 10]);
  }
  return p;
})();
export function train(s, a, out) {
  if (a.op !== 'ride' || !Object.values(s.obj || {}).some(o => o?.k === 'bahnhof')) return false;
  S.questEventX(s, 'train', 1, out);
  return true;
}
