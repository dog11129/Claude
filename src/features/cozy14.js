// Teil von extras14.js – Lieblingsplätze: Liebesschlösser an der Flussbrücke, Kuscheln zu zweit (Hängesessel, Hängematte,
// Sternguck-Decke), der streunende Hase, der einziehen kann, Schneemänner samt Bewertung durch die Nachbarn und
// mehr Sternschnuppen-Nächte.
import { PLACE, ITEMS, BUILDINGS, MAP, NPC_IDS, NPC_DATA, weekday } from '../data.js';
import { BRIDGES, BRIDGE_W, riverX, RIVER_W } from '../island.js';
import * as S from '../state.js';
import { addLove } from './love.js';
import { castleScore } from './beach.js';
import { hour, note, pick, who } from './util.js';

const key = (x, z) => x + ',' + z;
const fx = (out, x, z, t, k) => (out.fx ||= []).push({ x, z, t, k });

// ---------- Liebesschlösser ----------
export const LOCK_COLORS = [['Rot', 0xe8505a], ['Rosa', 0xff9ab8], ['Gold', 0xf2c84a], ['Silber', 0xd0d4dc], ['Türkis', 0x5cc8c0], ['Lila', 0xa98bff], ['Grün', 0x7fcf7a], ['Blau', 0x5a9ae8]];
export const LOCK_MAX = 60, LOCK_COST = 120, LOCK_BRIDGE = BRIDGES[0];
export const onLockBridge = (x, z) => Math.abs(z - LOCK_BRIDGE) < BRIDGE_W + 0.2 && Math.abs(x - riverX(LOCK_BRIDGE)) < RIVER_W + 0.9;
export const lockText = t => String(t || '').replace(/[^\p{L}\p{N}+& ♥]/gu, '').trim().slice(0, 7);
export function lock14(s, a, out) {
  const L = s.locks ||= [], me = who(s);
  if (L.length >= LOCK_MAX) { out.msg = '🔒 Die Brücke ist voller Schlösser – mehr passen nicht.'; return false; }
  if (L.some(l => l.day === s.day && l.by === me)) { out.msg = '🔒 Heute hast du schon ein Schloss aufgehängt. Morgen wieder!'; return false; }
  if (!Number.isInteger(a.c) || !LOCK_COLORS[a.c]) return false;
  if (s.money < LOCK_COST) { out.msg = 'Nicht genug Taler.'; return false; }
  s.money -= LOCK_COST;
  L.push({ c: a.c | 0, t: lockText(a.txt), by: me, day: s.day });
  addLove(s, 4, out);
  out.msg = `🔒 Klick! Euer Schloss hängt an der Brücke – für immer. (+4 Herzpunkte)`;
  out.snd = 'love';
  return true;
}

// ---------- Kuscheln zu zweit ----------
export function cuddle14(s, a, out) {
  const p = PLACE[s.obj?.[key(a.x, a.z)]?.k];
  if (!p?.cuddle) return false;
  const C = s.cuddle14 ||= { day: 0, n: 0 };
  if (C.day === s.day) return false;
  C.day = s.day; C.n = (C.n || 0) + 1;
  addLove(s, 3, out);
  fx(out, a.x, a.z, '💤', 'heart');
  out.msg = '💤 Zusammen eingekuschelt und eingenickt … (+3 Herzpunkte)';
  out.snd = 'love';
  return true;
}

// ---------- Der streunende Hase ----------
export const RABBIT_FOOD = ['karotte', 'salat', 'erdbeere', 'apfel', 'radieschen', 'gurke'], RABBIT_TAME = 5;
export const RABBIT_BOWS = [['Ohne', 0], ['Rosa', 0xff8fab], ['Rot', 0xe8505a], ['Himmelblau', 0x7cc4ff], ['Flieder', 0xb39cff], ['Sonnengelb', 0xffd95c], ['Mint', 0x8fe0c0]];
const RABBIT_GIFTS = ['karotte', 'gaensebluemchen', 'veilchen', 'erdbeere', 'gluecksklee'];
export const rabbitAwake = s => hour(s) >= 7 && hour(s) < 20.5;
export const rabbitName = s => s.pet14?.name || 'Hoppel';
function rabbitSpot(s) {
  const P = s.pet14;
  if (P.in) { const B = BUILDINGS.house; for (const [dx, dz] of [[2.4, 2.4], [-2.4, 2.4], [0, 3.4], [3.4, 1.2]]) { const x = Math.round(B.cx + dx), z = Math.round(B.z1 + dz); if (!S.blocked(s, x, z)) return [x, z]; } return [Math.round(B.cx), Math.round(B.z1 + 3)]; }
  for (let t = 0; t < 200; t++) {
    const x = Math.floor(Math.random() * (2 * MAP + 1)) - MAP, z = Math.floor(Math.random() * (2 * MAP + 1)) - MAP;
    if (S.canPlace(s, x, z) && !s.terra?.[key(x, z)] && !S.blocked(s, x, z)) return [x, z];
  }
  return [0, 4];
}
export function pet14(s, a, out) {
  const P = s.pet14, me = who(s);
  if (!P) return false;
  if (a.op === 'feed') {
    if (P.in || P.fed === s.day || !RABBIT_FOOD.includes(a.item)) return false;
    if (!S.takeInvX(s, a.item, 1)) return false;
    P.fed = s.day; P.t = (P.t || 0) + 1;
    fx(out, P.at[0], P.at[1], '💗', 'heart');
    out.snd = 'love';
    if (P.t >= RABBIT_TAME) {
      P.in = s.day; P.at = rabbitSpot(s);
      note(s, '🐇 Ein Hase zieht ein!', 'Liebe Insel,\n\nder kleine Streuner hat sich entschieden: Er bleibt bei euch! Ab heute hoppelt er vor eurem Haus herum.\n\nGebt ihm einen Namen, streichelt ihn jeden Tag – und wenn ihr mögt, kommt er mit auf Spaziergänge.\n\nRosi 🐰', null, 1);
      addLove(s, 5, out);
      out.msg = '🐇 Der Hase stupst dich an und hoppelt hinter dir her – er zieht bei euch ein! 💕';
    } else out.msg = `🐇 Mjam! Der Hase traut euch schon ein bisschen mehr (${P.t}/${RABBIT_TAME}).`;
    return true;
  }
  if (!P.in) return false;
  if (a.op === 'pet') {
    const D = P.pet?.day === s.day ? P.pet : (P.pet = { day: s.day, who: {} });
    if (D.who[me]) { out.msg = `🐇 ${rabbitName(s)} döst zufrieden.`; return false; }
    D.who[me] = 1;
    addLove(s, 1, out);
    if (Math.random() < 0.3) { const g = pick(RABBIT_GIFTS.filter(k => ITEMS[k])); S.addInvX(s, g, 1); out.got = g; out.msg = `🐇 ${rabbitName(s)} hat dir etwas mitgebracht: ${ITEMS[g].icon} ${ITEMS[g].name}!`; }
    else out.msg = `🐇 ${rabbitName(s)} kuschelt sich an deine Hand. 💗`;
    out.snd = 'love';
    return true;
  }
  if (a.op === 'name') { const n = String(a.name || '').replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 12); if (!n) return false; P.name = n; out.msg = `🐇 Ab jetzt heißt er ${n}.`; return true; }
  if (a.op === 'bow') { if (!Number.isInteger(a.i) || !RABBIT_BOWS[a.i]) return false; P.bow = a.i | 0; return true; }
  if (a.op === 'follow') { P.follow = a.on ? me : null; out.msg = a.on ? `🐇 ${rabbitName(s)} hoppelt dir hinterher!` : `🐇 ${rabbitName(s)} bleibt beim Haus.`; return true; }
  return false;
}

// ---------- Schneemänner (und Bewertung durch die Nachbarn) ----------
export const SNOW_PARTS = { nose: ['karotte', '🥕', 'Karottennase'], eyes: ['stein', '⚫', 'Augen & Knöpfe'], arms: ['ast', '🪵', 'Arme'], scarf: ['wolle', '🧣', 'Schal'], hat: ['wolle', '🎩', 'Mütze'] };
export const SNOW_MAX = 3, SNOW_PILES = 6;
export const isWinter = s => S.seasonOf(s.day) === 'winter';
export const snowScore = m => m.lv * 15 + Object.keys(m.deco || {}).length * 11;
const stars = n => Math.max(1, Math.min(5, n));
export const rateStars = (kind, o) => (kind === 'snow' ? stars(Math.ceil(snowScore(o) / 20)) : stars(Math.round(castleScore(o) / 25)));
const RATE_LINES = [null, ['Hm … da geht noch was!', 'Ein Anfang ist gemacht.', 'Ich drücke die Daumen fürs Weiterbauen.'], ['Niedlich!', 'Schon ganz hübsch.', 'Da fehlt noch ein bisschen Schmuck.'],
  ['Der sieht richtig gut aus!', 'Gefällt mir!', 'Da hat sich jemand Mühe gegeben.'], ['Wunderschön!', 'Ich bin begeistert!', 'Fast perfekt – toll gemacht!'], ['Ein Meisterwerk!', 'Das Schönste, was ich je gesehen habe!', 'Zehn von zehn – äh, fünf von fünf!']];
export function rate14(s, a, out) {
  const o = a.kind === 'snow' ? s.snowmen?.[a.k] : a.kind === 'castle' ? s.castles?.[a.k] : null;
  if (!o) return false;
  if (o.rate === s.day) { out.msg = 'Heute haben die Nachbarn schon bewertet. Baut weiter und fragt morgen wieder!'; return false; }
  o.rate = s.day;
  const n = rateStars(a.kind, o), pay = n * 40, ids = [...NPC_IDS].sort(() => Math.random() - 0.5).slice(0, 3);
  s.money += pay; s.stats.earned += pay;
  out.rate14 = { stars: n, pay, lines: ids.map((id, i) => ({ id, name: NPC_DATA[id].name, icon: NPC_DATA[id].icon, st: stars(n + (i === 1 ? -1 : 0) + (i === 2 && n < 5 ? 1 : 0)), t: pick(RATE_LINES[n]) })) };
  o.stars = Math.max(o.stars || 0, n);
  out.msg = `${'⭐'.repeat(n)} Die Nachbarn vergeben ${n} von 5 Sternen! +${pay} Taler`;
  out.snd = n >= 4 ? 'fanfare' : 'level';
  return true;
}
export function snow14(s, a, out) {
  if (!isWinter(s)) return false;
  const k = key(a.x, a.z), me = who(s), M = s.snowmen ||= {}, piles = s.snowpiles ||= [], R = s.snowroll ||= {};
  if (a.op === 'start') {
    const i = piles.indexOf(k);
    if (i < 0) return false;
    if (Object.keys(M).length >= 6) { out.msg = '⛄ Sechs Schneemänner reichen – mehr Schnee ist nicht da.'; return false; }
    piles.splice(i, 1);
    M[k] = { lv: 1, by: me, name: a.name ? String(a.name).slice(0, 16) : 'jemand', deco: {}, day: s.day };
    fx(out, a.x, a.z, '❄️', 'dust'); out.snd = 'place';
    out.msg = '⛄ Die erste Kugel liegt! Rollt an anderen Schneehaufen weitere Kugeln und setzt sie obendrauf.';
    return true;
  }
  if (a.op === 'roll') {
    const i = piles.indexOf(k);
    if (i < 0 || (R[me] || 0) >= 2) return false;
    piles.splice(i, 1); R[me] = (R[me] || 0) + 1;
    fx(out, a.x, a.z, '❄️', 'dust'); out.snd = 'till';
    out.msg = '⚪ Eine Schneekugel gerollt – ab damit zum Schneemann!';
    return true;
  }
  const m = M[k];
  if (!m) return false;
  if (a.op === 'grow') {
    if (m.lv >= SNOW_MAX || !(R[me] > 0)) { out.msg = m.lv >= SNOW_MAX ? '' : '⚪ Rolle erst an einem Schneehaufen eine Kugel.'; return false; }
    R[me]--; m.lv++;
    fx(out, a.x, a.z, '⛄', 'dust'); out.snd = 'place';
    if (m.lv === SNOW_MAX) out.msg = '⛄ Drei Kugeln – fertig! Jetzt fehlen noch Nase, Augen, Arme, Schal und Mütze.';
    return true;
  }
  if (a.op === 'deco') {
    const P = Object.hasOwn(SNOW_PARTS, a.part) ? SNOW_PARTS[a.part] : null;
    if (!P || m.lv < SNOW_MAX || m.deco[a.part]) return false;
    if (!S.takeInvX(s, P[0], 1)) { out.msg = `Dafür braucht ihr ${ITEMS[P[0]].icon} ${ITEMS[P[0]].name}.`; return false; }
    m.deco[a.part] = 1;
    out.snd = 'plopp';
    if (Object.keys(m.deco).length === 5) { out.msg = '⛄ Was für ein Prachtkerl! Fragt die Nachbarn, wie er ihnen gefällt.'; addLove(s, 2, out); (s.stats ||= {}).snowmen = (s.stats.snowmen || 0) + 1; }
    return true;
  }
  if (a.op === 'melt') { delete M[k]; fx(out, a.x, a.z, '', 'dust'); return true; }
  return false;
}
function morningSnow(s) {
  if (!isWinter(s)) { if (s.snowmen && Object.keys(s.snowmen).length) s.snowmen = {}; s.snowpiles = []; s.snowroll = {}; return; }
  s.snowmen ||= {}; s.snowroll = {};
  const piles = s.snowpiles = [];
  for (let t = 0; t < 400 && piles.length < SNOW_PILES; t++) {
    const x = Math.floor(Math.random() * (2 * MAP + 1)) - MAP, z = Math.floor(Math.random() * (2 * MAP + 1)) - MAP, k = key(x, z);
    if (S.canPlace(s, x, z) && !s.terra?.[k] && !s.paths?.[k] && !s.snowmen[k] && !piles.includes(k) && !S.blocked(s, x, z)) piles.push(k);
  }
}

// ---------- Sternschnuppen: jeden Freitag, einmal je Jahreszeit ein ganzer Schauer, gemeinsames Wünschen ----------
export function wished14(s) { const W = s.wish14?.day === s.day ? s.wish14 : (s.wish14 = { day: s.day, by: {} }); W.by[who(s)] = (W.by[who(s)] || 0) + 1; }
function morningStars(s) {
  const W = s.wish14;
  if (W && W.day === s.day - 1 && Object.keys(W.by).length >= 2) {
    note(s, '🌠 Zwillingsstern', 'Ihr habt euch letzte Nacht gemeinsam etwas gewünscht – und zwei Sterne sind zusammen gefallen.\n\nMan sagt, solche Wünsche gehen ganz bestimmt in Erfüllung. 💫\n\nRosi 🐰', ITEMS.sternsplitter ? 'sternsplitter' : null, 2);
    addLove(s, 5, {});
  }
  s.wish14 = null;
  const fine = !['rain', 'storm', 'snow', 'fog'].includes(s.weather);
  s.starShower = fine && S.daySea(s.day) === 4;
  if (fine && (weekday(s.day) === 5 || s.starShower)) s.starNight = true;
}

// ---------- Was steht vor der Figur? ----------
let rabbitHint = null; // wo der Hase auf diesem Gerät gerade hoppelt (wenn er jemandem folgt)
export const setRabbitHint = p => { rabbitHint = p; };
export function resolveCozy(s, me, sel, at) {
  if (S.zoneOf(me) !== 'island' || S.inside(me)) return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, tx = Math.round(px), tz = Math.round(pz), k = key(tx, tz), one = [[tx, tz]];
  const P = s.pet14;
  if (P?.at && rabbitAwake(s)) {
    const [rx, rz] = P.in && P.follow && rabbitHint ? rabbitHint : P.at;
    if (Math.hypot(px - rx, pz - rz) < 1.05) {
      if (P.in) return { ui: 'pet14', label: `🐇 ${rabbitName(s)}`, tiles: [], px: rx, pz: rz };
      if (P.fed === s.day) return { label: `🐇 Satt und zufrieden ${'💗'.repeat(Math.min(RABBIT_TAME, P.t || 0))}`, tiles: [] };
      const food = RABBIT_FOOD.find(f => s.inv?.[f] > 0);
      return food ? { a: { t: 'pet14', op: 'feed', item: food }, label: `🐇 Füttern (${ITEMS[food].icon} ${ITEMS[food].name})`, tiles: [], px: rx, pz: rz } : { label: `🐇 Ein scheuer Hase – er mag ${RABBIT_FOOD.slice(0, 4).map(f => ITEMS[f].icon).join(' ')}`, tiles: [] };
    }
  }
  if (isWinter(s)) {
    const m = s.snowmen?.[k];
    if (m) return m.lv < SNOW_MAX && s.snowroll?.[who(s)] > 0 ? { a: { t: 'snow14', op: 'grow', x: tx, z: tz }, label: `⛄ Kugel aufsetzen (${m.lv}/${SNOW_MAX})`, tiles: one } : { ui: 'snow14', uid: k, label: `⛄ Schneemann von ${m.name}`, tiles: one };
    if (s.snowpiles?.includes(k)) {
      const mine = Object.values(s.snowmen || {}).some(q => q.lv < SNOW_MAX);
      if (mine) return (s.snowroll?.[who(s)] || 0) >= 2 ? { label: '⚪ Mehr als zwei Kugeln kannst du nicht tragen', tiles: one } : { a: { t: 'snow14', op: 'roll', x: tx, z: tz }, label: '⚪ Schneekugel rollen', tiles: one };
      return { a: { t: 'snow14', op: 'start', x: tx, z: tz }, snowStart: 1, label: '⛄ Schneemann bauen', tiles: one };
    }
  }
  if (sel === 'hand' && !at && onLockBridge(me.x, me.z)) return { ui: 'lock14', label: `🔒 Liebesschlösser${s.locks?.length ? ' (' + s.locks.length + ')' : ''}`, tiles: [] };
  return null;
}
export const snowBlocked = (s, tx, tz) => !!s.snowmen?.[key(tx, tz)];

export function migrateCozy(s) {
  if (!Array.isArray(s.locks)) s.locks = [];
  s.locks = s.locks.filter(l => l && LOCK_COLORS[l.c]).slice(0, LOCK_MAX);
  if (!s.pet14 || typeof s.pet14 !== 'object') s.pet14 = { t: 0, fed: 0, in: 0, name: '', bow: 0, follow: null };
  if (!Array.isArray(s.pet14.at)) s.pet14.at = rabbitSpot(s);
  if (!s.snowmen || typeof s.snowmen !== 'object') s.snowmen = {};
  if (!Array.isArray(s.snowpiles)) s.snowpiles = [];
}
export function morningCozy(s) {
  const P = s.pet14;
  if (P) { P.at = rabbitSpot(s); if (P.follow) P.follow = null; }
  morningSnow(s);
  morningStars(s);
}
