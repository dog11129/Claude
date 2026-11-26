// Teil von extras13.js – Fleißkärtchen: fünf kleine Aufgaben, die nie ausgehen. Wer eine einlöst, bekommt Sternchen
// und Taler, und sofort rückt ein neues Kärtchen nach. Für Sternchen gibt es im Sternchen-Laden den Feengarten und
// kleine Überraschungen. Die Aufgaben sind dieselben Ereignisse wie bei den Tagesaufgaben (DAILY), nur größer.
import { DAILY, PLACE, ITEMS, CROPS } from '../data.js';
import * as S from '../state.js';

export const PLUS_N = 5;
const SIZES = [[1, 1], [1.5, 2], [2.5, 3]]; // [Menge ×, Sternchen]
const need = c => Math.max(1, Math.ceil(DAILY[c.i][2] * SIZES[c.z][0] / (DAILY[c.i][2] >= 1000 ? 500 : 1)) * (DAILY[c.i][2] >= 1000 ? 500 : 1));
export const cardNeed = need;
export const cardStars = c => SIZES[c.z][1];
export const cardText = c => { const t = DAILY[c.i][0], n = need(c); return SIZES[c.z][0] === 1 ? t : t.replace(/\d[\d.]*/, m => (DAILY[c.i][2] === +m.replace(/\./g, '') ? n.toLocaleString('de-DE') : m)); };
const once = i => DAILY[i][2] === 1; // „Umarmt euch“, „Kocht ein Gericht“ … bleiben einfach
function draw(s, rnd = Math.random) {
  const P = s.plus, ok = S.dailyOk(s), used = new Set(P.cards.map(c => DAILY[c.i][1]));
  const pool = DAILY.map((d, i) => i).filter(i => ok(i) && !used.has(DAILY[i][1]) && DAILY[i][1] !== P.last);
  if (!pool.length) return null;
  const i = pool[Math.floor(rnd() * pool.length)], r = rnd();
  return { i, z: once(i) ? 0 : r < 0.5 ? 0 : r < 0.85 ? 1 : 2, p: 0 };
}
function fill(s, rnd) { while (s.plus.cards.length < PLUS_N) { const c = draw(s, rnd); if (!c) break; s.plus.cards.push(c); } }

export function plusEvent(s, ev, n = 1, out) {
  const P = s.plus;
  if (!P) return;
  for (const c of P.cards) {
    if (c.done || !DAILY[c.i] || DAILY[c.i][1] !== ev) continue;
    c.p += n;
    if (c.p >= need(c)) { c.done = 1; if (out && !out.quest) out.quest = '⭐ ' + cardText(c); }
  }
}

// Sternchen-Laden: Feengarten (PLACE mit star) und kleine Überraschungen
export const STAR_EXTRA = {
  samentuete: { name: 'Samen-Wundertüte', icon: '🌱', star: 1, desc: 'Fünf Samen von seltenen Gartenblumen' },
  zaunpaket: { name: 'Zaun-Paket', icon: '🤍', star: 2, desc: '12 weiße Lattenzäune und ein Gartentor' },
  herzpost: { name: 'Glücksklee', icon: '🍀', star: 3, desc: 'Ein vierblättriges Kleeblatt' },
};
export const STAR_SHOP = [...Object.keys(STAR_EXTRA), ...Object.keys(PLACE).filter(k => PLACE[k].star)];
export const starCost = id => STAR_EXTRA[id]?.star || PLACE[id]?.star || 0;
const FLOWER_SEEDS = () => Object.keys(CROPS).filter(k => CROPS[k].garden && ITEMS['s_' + k]);

export function plus13(s, a, out) {
  const P = s.plus;
  if (!P) return false;
  if (a.op === 'claim') {
    const c = P.cards[a.i];
    if (!c || !c.done) return false;
    const st = cardStars(c), pay = 120 * st;
    P.stars += st; P.total = (P.total || 0) + st; P.n = (P.n || 0) + 1; P.last = DAILY[c.i][1];
    s.money += pay; s.stats.earned += pay;
    P.cards.splice(a.i, 1);
    fill(s);
    S.addXpX?.(s, 4, out);
    out.msg = `⭐ Fleißkärtchen eingelöst: +${st} Sternchen, +${pay} Taler`;
    out.snd = 'level';
    return true;
  }
  if (a.op === 'swap') { // einmal am Tag ein Kärtchen tauschen
    const c = P.cards[a.i];
    if (!c || c.done || P.swap === s.day) return false;
    P.swap = s.day; P.last = DAILY[c.i][1];
    P.cards.splice(a.i, 1);
    fill(s);
    out.snd = 'click';
    return true;
  }
  if (a.op === 'buy') {
    const cost = starCost(a.id);
    if (!STAR_SHOP.includes(a.id) || !cost) return false;
    if (P.stars < cost) { out.msg = 'Dafür reichen eure Sternchen noch nicht.'; return false; }
    P.stars -= cost;
    if (a.id === 'samentuete') { const pool = FLOWER_SEEDS(); for (let i = 0; i < 5; i++) S.addInvX(s, 's_' + pool[Math.floor(Math.random() * pool.length)], 1); out.msg = '🌱 Fünf Samen aus der Wundertüte – schaut in die Tasche!'; }
    else if (a.id === 'zaunpaket') { S.addInvX(s, 'lattenzaun', 12); S.addInvX(s, 'lattentor', 1); out.msg = '🤍 12 Lattenzäune und ein Gartentor liegen in der Tasche.'; }
    else if (a.id === 'herzpost') { S.addInvX(s, 'gluecksklee', 1); out.got = 'gluecksklee'; out.msg = '🍀 Ein Glücksklee für euch!'; }
    else { S.addInvX(s, a.id, 1); out.got = a.id; out.msg = `${PLACE[a.id].icon} ${PLACE[a.id].name} liegt in der Tasche – im 🔨 Baumodus aufstellen.`; (P.got ||= {})[a.id] = (P.got[a.id] || 0) + 1; }
    out.snd = 'fanfare';
    return true;
  }
  return false;
}

// Wunschbrunnen: einmal am Tag (pro Spieler) eine Münze hineinwerfen
export function wish13(s, a, out) {
  const o = s.obj?.[a.x + ',' + a.z];
  if (o?.k !== 'wunschbrunnen') return false;
  const W = s.wishwell ||= { day: 0, who: {} }, me = s._who || 'host';
  if (W.day !== s.day) { W.day = s.day; W.who = {}; }
  if (W.who[me]) { out.msg = '⛲ Heute habt ihr schon eine Münze hineingeworfen. Morgen wieder!'; return false; }
  if (s.money < 10) { out.msg = 'Dafür braucht ihr eine Münze (10 Taler).'; return false; }
  s.money -= 10; W.who[me] = 1; W.n = (W.n || 0) + 1;
  const r = Math.random();
  if (r < 0.5) { const m = 60 + Math.floor(Math.random() * 25) * 10; s.money += m; out.msg = `⛲ Plitsch! Der Brunnen glitzert … und spuckt ${m} Taler zurück.`; }
  else if (r < 0.8) { const pool = FLOWER_SEEDS(), k = pool[Math.floor(Math.random() * pool.length)]; S.addInvX(s, 's_' + k, 3); out.msg = `⛲ Plitsch! Am Brunnenrand liegen drei Samen: ${CROPS[k].icon} ${CROPS[k].name}.`; }
  else if (r < 0.93 && ITEMS.sternsplitter) { S.addInvX(s, 'sternsplitter', 1); out.got = 'sternsplitter'; out.msg = '⛲ Plitsch! Im Wasser funkelt ein Sternsplitter.'; }
  else { if (s.plus) { s.plus.stars += 1; s.plus.total = (s.plus.total || 0) + 1; } out.msg = '⛲ Plitsch! Ein Wunsch geht in Erfüllung: +1 Sternchen ⭐'; }
  (out.fx ||= []).push({ x: a.x, z: a.z, t: '✨', k: 'heart' });
  out.snd = 'splash';
  return true;
}

export function migratePlus(s) {
  const P = s.plus && typeof s.plus === 'object' ? s.plus : (s.plus = { cards: [], stars: 0, total: 0, n: 0 });
  P.cards = Array.isArray(P.cards) ? P.cards.filter(c => c && DAILY[c.i] && SIZES[c.z] && Number.isFinite(c.p)).slice(0, PLUS_N) : [];
  P.stars = Number.isFinite(P.stars) ? Math.max(0, Math.floor(P.stars)) : 0;
  fill(s);
}
export function morningPlus(s) { if (s.plus) fill(s); }
