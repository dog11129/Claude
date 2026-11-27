// Teil von extras14.js – Saisonkatalog (zehn Sachen je Jahreszeit, nur dann zu haben), Lieferdienst (Bestellungen der
// Nachbarn persönlich vorbeibringen, mit Trinkgeld), Salon (Frisuren, Haarfarben, Nagellack), Hausfassade
// (Dach, Tür, Fensterläden, Blumenkästen, Hausnummer, Türkranz) und neue Sträuße & Kränze am Blumenbinde-Tisch.
import { PLACE, ITEMS, SEASON_IDS, SEASONS } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import { SALON, SALON_PRICE, SALON_NAME, salonKey } from '../salon-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { BIND } from './love.js';
import { homeIds } from './nhomes.js';
import { pick, rnd, who, fmt } from './util.js';

// ---------- Saisonkatalog ----------
export const SCAT = {
  spring: ['osternest', 'tulpenkiste', 'hasenfigur', 'bluetenbogen', 'maibaum', 'bluetenlampe', 'pastellsessel', 'eierkorb', 'veilchenbild', 'fruehlingsteppich'],
  summer: ['planschbecken', 'eistruhe', 'melonentisch', 'strandmuschel', 'limostand', 'ventilator', 'muschelspiegel', 'limokrug', 'surfregal', 'hawaiilampe'],
  autumn: ['kuerbisstapel', 'laubhaufen', 'heubank', 'kastanienmann', 'apfelkarren', 'kuerbislampe', 'strickhocker', 'apfelkiste', 'laubgirlande', 'kastanienschale'],
  winter: ['iglu', 'eislaterne', 'geschenkestapel', 'zuckerstange', 'eisskulptur', 'winterdorf', 'kaminofen', 'kakaotablett', 'sternlichterkette', 'norwegerteppich'],
};
const SCAT_COST = { osternest: 450, tulpenkiste: 380, hasenfigur: 520, bluetenbogen: 1400, maibaum: 1600, bluetenlampe: 700, pastellsessel: 900, eierkorb: 350, veilchenbild: 480, fruehlingsteppich: 850,
  planschbecken: 1200, eistruhe: 950, melonentisch: 780, strandmuschel: 1100, limostand: 1500, ventilator: 620, muschelspiegel: 720, limokrug: 340, surfregal: 880, hawaiilampe: 660,
  kuerbisstapel: 420, laubhaufen: 300, heubank: 650, kastanienmann: 380, apfelkarren: 1300, kuerbislampe: 640, strickhocker: 560, apfelkiste: 360, laubgirlande: 440, kastanienschale: 320,
  iglu: 1800, eislaterne: 560, geschenkestapel: 480, zuckerstange: 390, eisskulptur: 1250, winterdorf: 900, kaminofen: 1500, kakaotablett: 340, sternlichterkette: 520, norwegerteppich: 880 };
export const scatPrice = id => SCAT_COST[id] || 0;
export const scatSeason = id => SEASON_IDS.find(k => SCAT[k]?.includes(id)) || null;
export const scatInfo = id => PLACE[id] || FURNITURE[id];
export const scatLeft = s => 7 - S.daySea(s.day) + 1; // so viele Tage gibt es die Seite noch (heute mitgezählt)
export function scat14(s, a, out) {
  const sea = S.seasonOf(s.day), I = scatInfo(a.id);
  if (!I || !scatPrice(a.id)) return false;
  if (!SCAT[sea].includes(a.id)) { out.msg = `📖 Das steht erst wieder im ${SEASONS[scatSeason(a.id)]?.[0] || 'nächsten Jahr'} im Katalog.`; return false; }
  if (s.money < scatPrice(a.id)) { out.msg = 'Nicht genug Taler.'; return false; }
  s.money -= scatPrice(a.id);
  S.addInvX(s, a.id, 1);
  const C = s.scat ||= { got: {} };
  C.got[a.id] = (C.got[a.id] || 0) + 1;
  out.got = a.id;
  out.msg = `📖 ${I.icon} ${I.name} ist da! ${PLACE[a.id] ? 'Im 🔨 Baumodus aufstellen.' : 'Zu Hause einrichten.'}`;
  out.snd = 'fanfare';
  return true;
}

// ---------- Lieferdienst ----------
export const DELIV_MAX = 4;
export const delivFor = (s, id) => s.deliv?.list?.find(d => d.id === id) || null;
function newDelivery(s) {
  const ids = homeIds(s).filter(id => !delivFor(s, id));
  if (!ids.length) return null;
  const have = {};
  for (const inv of [...Object.values(s.pinv || {}), s.box || {}]) for (const [k, n] of Object.entries(inv || {})) if (n > 0) have[k] = (have[k] || 0) + n;
  const cand = S.orderCandidatesX(s).filter(k => ITEMS[k]?.sell > 0), owned = cand.filter(k => have[k] > 0);
  if (!cand.length) return null;
  const item = owned.length && Math.random() < 0.65 ? pick(owned) : pick(cand), cat = ITEMS[item].cat;
  const n = cat === 'fruit' || cat === 'veg' ? 2 + rnd(4) : cat === 'mat' ? 2 + rnd(3) : 1 + rnd(2);
  return { id: pick(ids), item, n, pay: Math.round(ITEMS[item].sell * n * 1.7 / 10) * 10 + 60, day: s.day, due: s.day + 1 };
}
export function deliver14(s, a, out) {
  const L = s.deliv?.list, i = L ? L.findIndex(d => d.id === a.id) : -1;
  if (i < 0) return false;
  const d = L[i];
  if (!S.takeInvX(s, d.item, d.n)) { out.msg = `📦 Dafür fehlt noch etwas: ${d.n}× ${ITEMS[d.item].icon} ${ITEMS[d.item].name}.`; return false; }
  const fast = d.day === s.day, tip = Math.round(d.pay * (fast ? 0.4 : 0.15) / 10) * 10;
  s.money += d.pay + tip; s.stats.earned += d.pay + tip;
  s.stats.deliv = (s.stats.deliv || 0) + 1;
  X.befriend(s, d.id, 30);
  S.questEventX(s, 'order', 1, out);
  S.addXpX(s, 6, out);
  L.splice(i, 1);
  out.msg = `📦 ${X.pname(d.id)} freut sich riesig! +${fmt(d.pay)} Taler und ${fmt(tip)} Taler Trinkgeld${fast ? ' (Eil-Bonus)' : ''}.`;
  out.snd = 'level';
  return true;
}
function morningDeliv(s) {
  const D = s.deliv ||= { list: [] };
  D.list = D.list.filter(d => d.due >= s.day && ITEMS[d.item] && homeIds(s).includes(d.id));
  for (let i = 0; i < 2 && D.list.length < DELIV_MAX; i++) { const d = newDelivery(s); if (d) D.list.push(d); }
}

// ---------- Salon ----------
export function salon14(s, a, out) {
  const list = SALON[a.kind];
  if (!list || !list.some(o => o[0] === a.id)) return false;
  const k = salonKey(a.kind, a.id), W = s.wardrobe ||= {};
  if (W[k]) { out.msg = '💇 Das habt ihr schon – einfach unter „Aussehen“ auswählen.'; return false; }
  if (s.money < SALON_PRICE[a.kind]) { out.msg = 'Nicht genug Taler.'; return false; }
  s.money -= SALON_PRICE[a.kind];
  W[k] = s.day;
  (s.stats ||= {}).salon = (s.stats.salon || 0) + 1;
  out.salon14 = { kind: a.kind, id: a.id, me: who(s) };
  out.msg = `💇 Neue ${SALON_NAME[a.kind]} freigeschaltet – für euch beide!`;
  out.snd = 'fanfare';
  return true;
}

// ---------- Hausfassade ----------
export const EXT = {
  roof: [['', 'Wie gebaut'], ['rot', 'Ziegelrot', 0.01], ['orange', 'Orange', 0.07], ['gelb', 'Sonnengelb', 0.13], ['gruen', 'Moosgrün', 0.34], ['tuerkis', 'Türkis', 0.48], ['blau', 'Blau', 0.6], ['lila', 'Lila', 0.74], ['rosa', 'Rosa', 0.93]],
  door: [['', 'Wie gebaut'], ['weiss', 'Weiß', 0xfaf6ee], ['rot', 'Rot', 0xd9534f], ['gelb', 'Gelb', 0xf2c84a], ['gruen', 'Grün', 0x6fb56a], ['mint', 'Mint', 0x8fd9c0], ['blau', 'Blau', 0x5a8fd8], ['lila', 'Lila', 0xa98bff], ['rosa', 'Rosa', 0xff9ab8], ['holz', 'Dunkles Holz', 0x8a5a36]],
  shut: [['', 'Wie gebaut'], ['weiss', 'Weiß', 0xfaf6ee], ['mint', 'Mint', 0x8cc7b0], ['blau', 'Blau', 0x6f9fe0], ['rosa', 'Rosa', 0xff9ab8], ['gelb', 'Gelb', 0xf2cf5a], ['rot', 'Rot', 0xd9534f], ['gruen', 'Tannengrün', 0x4f8f5a]],
  box: [['', 'Wie gebaut'], ['rosa', 'Rosa Blüten', 0xff8fab], ['rot', 'Rote Geranien', 0xe8404a], ['gelb', 'Gelbe Blüten', 0xffd23f], ['lila', 'Lavendel', 0xb39cff], ['weiss', 'Weiße Blüten', 0xffffff], ['bunt', 'Kunterbunt', 0]],
  wreath: [['', 'Ohne'], ['kranz_fruehling', 'Frühlingskranz'], ['kranz_sommer', 'Sommerkranz'], ['kranz_herbst', 'Herbstkranz'], ['kranz_winter', 'Winterkranz']],
};
export const EXT_COST = 120;
export const extOf = s => s.home?.ext || {};
export function ext14(s, a, out) {
  const E = s.home.ext ||= {};
  if (a.k === 'nr') { const n = Math.max(0, Math.min(99, a.v | 0)); if (E.nr === n) return false; E.nr = n; out.snd = 'click'; return true; }
  const opt = EXT[a.k]?.find(o => o[0] === a.v);
  if (!opt || (E[a.k] || '') === a.v) return false;
  if (a.k === 'wreath') {
    if (a.v && !S.takeInvX(s, a.v, 1)) { out.msg = '🌿 Bindet erst einen Kranz am Blumenbinde-Tisch.'; return false; }
    if (E.wreath) S.addInvX(s, E.wreath, 1); // der alte Kranz kommt zurück in die Tasche
  } else if (a.v) {
    if (s.money < EXT_COST) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= EXT_COST;
  }
  E[a.k] = a.v;
  (s.stats ||= {}).ext = (s.stats.ext || 0) + 1;
  out.snd = 'place';
  return true;
}

// ---------- Blumenbinden: neue Sträuße und Kränze zum Aufhängen ----------
Object.assign(BIND, {
  veilchenstrauss: { in: { veilchen: 5 }, desc: 'Klein, zart und herrlich lila' },
  irisstrauss: { in: { iris: 4 }, desc: 'Schwertlilien, stolz und elegant' },
  ranunkelstrauss: { in: { ranunkel: 5 }, desc: 'Rund und üppig wie kleine Rosen' },
  herbststrauss: { in: { aster: 2, chrysantheme: 2, sonnenhut: 2 }, desc: 'Warme Farben für goldene Tage' },
  kranz_fruehling: { in: { tulpe: 3, veilchen: 3, gaensebluemchen: 2 }, desc: 'Kranz für Wand oder Haustür' },
  kranz_sommer: { in: { sonnenblume: 2, lavendel: 3, rose: 2 }, desc: 'Kranz für Wand oder Haustür' },
  kranz_herbst: { in: { aster: 3, chrysantheme: 2, sonnenhut: 2 }, desc: 'Kranz für Wand oder Haustür' },
  kranz_winter: { in: { '*bunt': 3, ast: 4 }, desc: 'Zweige und drei verschiedene Blumen' },
});

export function migrateTrade(s) {
  if (!s.deliv || !Array.isArray(s.deliv.list)) s.deliv = { list: [] };
  s.deliv.list = s.deliv.list.filter(d => d && ITEMS[d.item] && d.n > 0);
  if (!s.deliv.list.length && s.day) morningDeliv(s);
  if (s.home && (!s.home.ext || typeof s.home.ext !== 'object')) s.home.ext = {};
}
export function morningTrade(s) { morningDeliv(s); }
