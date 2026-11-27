// Teil von extras7.js – Bauernmarkt: samstags 8–15 Uhr am eigenen Marktstand verkaufen. Die Nachbarn kaufen
// über den Vormittag; was sie sich wünschen, geht schneller weg und bringt mehr.
import { ITEMS, NPC_IDS, weekday } from '../data.js';
import * as S from '../state.js';
import { hour, fmt } from './util.js';

export const MARKET_FROM = 8, MARKET_TO = 15, MARKET_SLOTS = 6, MARKET_MAX = 5;
export const marketDay = s => weekday(s.day) === 6;
export const marketOpen = s => marketDay(s) && hour(s) >= MARKET_FROM && hour(s) < MARKET_TO;
export const marketOk = id => { const it = ITEMS[id]; return !!it && it.sell > 0 && !it.gear && !it.furn && !it.place && (['fruit', 'veg', 'dish'].includes(it.cat) || !!it.honey || id === 'honig' || id === 'seerose' || id === 'milch' || id === 'ei' || id === 'wolle'); };
const GOODS = ['apfel', 'birne', 'kirsche', 'orange', 'pfirsich', 'erdbeermarmelade', 'apfelmus', 'kirschkompott', 'honig', 'tulpe', 'rose', 'karotte', 'kartoffel', 'tomate', 'kuerbis', 'ei', 'milch', 'apfelkuchen', 'honigbrot', 'wolle', 'sonnenhonig'];
const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0; };
// Wünsche der Nachbarn für diesen Samstag
export function marketWishes(day) {
  const goods = GOODS.filter(id => ITEMS[id]), out = [];
  for (let i = 0; out.length < 3 && i < 20; i++) { const id = NPC_IDS[h32(day, i) % NPC_IDS.length], g = goods[h32(day, i + 50) % goods.length]; if (!out.some(w => w[0] === id || w[1] === g)) out.push([id, g]); }
  return out;
}
const rate = (s, id) => (marketWishes(s.day).some(w => w[1] === id) ? 1.8 : ITEMS[id].cat === 'dish' ? 1.1 : 0.8); // Stück pro Stunde
export function marketSales(s, M = s.market) { // wie viel ist bis jetzt verkauft? (für alle gleich ausgerechnet)
  const h = Math.min(hour(s), MARKET_TO) - M.t0;
  return M.items.map((it, i) => Math.min(it.n, Math.floor(Math.max(0, h) * rate(s, it.id) + (h32(s.day, i) % 100) / 100)));
}
export const marketPrice = (s, id) => Math.round(ITEMS[id].sell * (marketWishes(s.day).some(w => w[1] === id) ? 2 : 1.35));
export function market(s, a, out) {
  const k = `${a.x},${a.z}`;
  if (a.op === 'open') {
    if (s.obj?.[k]?.k !== 'marktstand' || !marketOpen(s)) { out.msg = '🧺 Bauernmarkt ist samstags von 8 bis 15 Uhr.'; return false; }
    if (s.market?.day === s.day) { out.msg = '🧺 Der Stand ist heute schon aufgebaut.'; return false; }
    const list = Array.isArray(a.items) ? a.items.slice(0, MARKET_SLOTS) : [];
    if (!list.length || !list.every(it => it && marketOk(it.id) && Number.isInteger(it.n) && it.n >= 1 && it.n <= MARKET_MAX && (s.inv[it.id] || 0) >= it.n) || new Set(list.map(i => i.id)).size !== list.length) return false;
    for (const it of list) S.takeInvX(s, it.id, it.n);
    s.market = { day: s.day, k, t0: hour(s), items: list.map(it => ({ id: it.id, n: it.n })), paid: list.map(() => 0) };
    out.msg = '🧺 Der Stand ist aufgebaut! Die Nachbarn kommen nach und nach vorbei – später die Einnahmen abholen.'; out.snd = 'place';
    S.questEventX(s, 'market', 1, out);
    return true;
  }
  if (a.op === 'collect') {
    const M = s.market;
    if (!M || M.day !== s.day) return false;
    const sold = marketSales(s, M);
    let money = 0;
    M.items.forEach((it, i) => { const n = sold[i] - M.paid[i]; if (n > 0) { money += n * marketPrice(s, it.id); M.paid[i] = sold[i]; } });
    s.money += money; s.stats.earned += money;
    const closed = hour(s) >= MARKET_TO;
    if (closed) { M.items.forEach((it, i) => { const left = it.n - M.paid[i]; if (left > 0) S.addInvX(s, it.id, left); }); M.closed = 1; }
    out.msg = money ? `🧺 +${fmt(money)} Taler eingenommen${closed ? ' – Markt vorbei, der Rest ist wieder in der Tasche.' : '.'}` : closed ? '🧺 Markt vorbei – der Rest ist wieder in der Tasche.' : '🧺 Noch nichts Neues verkauft – später nochmal schauen.';
    out.snd = money ? 'coin' : 'click';
    return true;
  }
  return false;
}
