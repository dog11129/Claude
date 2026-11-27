// Teil von extras15.js – Koi-Teich: Fische in selbst gegrabene Teiche setzen, füttern und neue Farben züchten.
// s.koi = { fish: [{ v, n?, b }], fed: { day, by: [Spieler] }, book: { <Sorte>: Tag }, news: { day, v } | null, got: { f, s } }
import * as X from '../extras.js';
import { pick, fmt, who, note } from './util.js';
import { addLove } from './love.js';
import { koiCap, waterCount, KOI_MAX } from './pure15.js';
export { koiCap, waterCount, KOI_MAX };

// Sorte: [Name, Zeichen, Grundfarbe, Fleckenfarbe | null, Kaufpreis (0 = nur gezüchtet), Wert beim Verkauf]
export const KOI = {
  schnee: ['Schneekoi', '🤍', 0xf7f4ee, null, 300, 120],
  feuer: ['Feuerkoi', '❤️', 0xe8553a, null, 300, 120],
  gold: ['Goldkoi', '💛', 0xf2b63a, null, 500, 200],
  kirsch: ['Kirschblüten-Koi', '🌸', 0xf7f4ee, 0xe8553a, 0, 600],
  sonne: ['Sonnenkoi', '🧡', 0xf2903a, 0xffe07a, 0, 600],
  mond: ['Mondkoi', '🌙', 0xfff0c0, 0xcfe0ff, 0, 600],
  nacht: ['Nachtkoi', '🖤', 0x34343c, null, 0, 900],
  drei: ['Dreifarben-Koi', '🎨', 0xf7f4ee, 0xe8553a, 0, 1400],
  stern: ['Sternenkoi', '✨', 0x34343c, 0xf7f4ee, 0, 1600],
  tiger: ['Tigerkoi', '🐯', 0xf2b63a, 0x34343c, 0, 1600],
  herz: ['Herzkoi', '💗', 0xffb7c8, 0xe8445e, 0, 2200],
  regen: ['Regenbogen-Koi', '🌈', 0x9fd4ff, 0xff8fab, 0, 4000],
};
export const KOI_IDS = Object.keys(KOI);
// Wer mit wem? (Schlüssel alphabetisch sortiert)
export const KOI_MIX = { 'feuer+schnee': 'kirsch', 'feuer+gold': 'sonne', 'gold+schnee': 'mond', 'gold+kirsch': 'drei', 'nacht+schnee': 'stern', 'gold+nacht': 'tiger', 'kirsch+kirsch': 'herz', 'drei+stern': 'regen' };
export const koiHint = v => { const e = Object.entries(KOI_MIX).find(([, r]) => r === v); return v === 'nacht' ? 'Eine seltene Laune der Natur – taucht manchmal einfach auf.' : e ? e[0].split('+').map(p => KOI[p][0]).join(' + ') + (v === 'herz' ? ' (nur wenn ihr beide gefüttert habt)' : '') : 'Gibt es bei Wanda zu kaufen.'; };
const blank = () => ({ fish: [], fed: { day: 0, by: [] }, book: {}, news: null, got: {} });
export const koiState = s => (s.koi ||= blank());
export const koiFedBy = (s, key) => s.koi?.fed?.day === s.day && s.koi.fed.by.includes(key);

function learn(s, K, v) {
  if (!K.book[v]) K.book[v] = s.day;
  const n = Object.keys(K.book).length;
  if (n >= 5 && !K.got.f) { K.got.f = 1; note(s, '🎏 Fünf Koi-Sorten!', 'Ihr Lieben,\n\nin eurem Teich schwimmt es ja schon richtig bunt! Für so fleißige Züchter habe ich eine Koi-Fahne genäht – sie flattert am schönsten direkt am Ufer.\n\nWanda 🦉', 'koifahne', 1, 'wanda'); }
  if (n >= KOI_IDS.length && !K.got.s) { K.got.s = 1; note(s, '🏆 Alle Koi-Sorten gezüchtet!', 'Ihr Lieben,\n\nalle zwölf Sorten – das hat auf dieser Insel noch niemand geschafft. Diese Statue hat der alte Bildhauer vom Festland für euch gemeißelt. Stellt sie an euren Teich!\n\nWanda 🦉', 'koistatue', 1, 'wanda'); }
}
export function koi15(s, a, out) {
  const K = koiState(s), me = who(s), cap = koiCap(s);
  if (a.op === 'buy') {
    const d = KOI[a.v];
    if (!d || !d[4]) return false;
    if (cap < 1) { out.msg = 'Dafür braucht ihr einen Teich: mindestens zwei Wasser-Kacheln (🔨 Bauen ➜ ⛰️ Gelände).'; return false; }
    if (K.fish.length >= cap) { out.msg = cap >= KOI_MAX ? 'Mehr als zwölf Koi werden es nicht.' : 'Der Teich ist voll – grabt ihn größer (zwei Wasser-Kacheln je Fisch).'; return false; }
    if (s.money < d[4]) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= d[4];
    K.fish.push({ v: a.v, b: s.day });
    learn(s, K, a.v);
    out.msg = `${d[1]} Ein ${d[0]} zieht in euren Teich!`;
    out.snd = 'splash';
    return true;
  }
  if (a.op === 'feed') {
    if (!K.fish.length) return false;
    if (K.fed.day !== s.day) K.fed = { day: s.day, by: [] };
    if (K.fed.by.includes(me)) { out.msg = 'Du hast die Koi heute schon gefüttert.'; return false; }
    K.fed.by.push(me);
    out.msg = '🐟 Die Koi schnappen nach den Flocken!';
    if (K.fed.by.length === 2) { addLove(s, 2, out); out.msg += ' Zusammen gefüttert: +2 💕'; }
    out.snd = 'water';
    out.koi15 = 'feed';
    return true;
  }
  const f = Number.isInteger(a.i) ? K.fish[a.i] : null;
  if (!f) return false;
  if (a.op === 'sell') {
    const val = KOI[f.v][5];
    K.fish.splice(a.i, 1);
    s.money += val; s.stats.earned += val;
    out.msg = `${KOI[f.v][1]} ${f.n || KOI[f.v][0]} zieht in einen anderen Teich um. +${fmt(val)} Taler`;
    out.snd = 'coin';
    return true;
  }
  if (a.op === 'name') {
    const n = String(a.name || '').trim().slice(0, 12);
    if (n) f.n = n; else delete f.n;
    return true;
  }
  return false;
}
// Jeden Morgen: Wurden die Koi gestern gefüttert und ist noch Platz, gibt es manchmal Nachwuchs.
export function morningKoi(s) {
  const K = s.koi;
  if (!K || K.fish.length < 2 || K.fed.day !== s.day - 1 || K.fish.length >= koiCap(s)) return;
  const both = K.fed.by.length >= 2;
  if (Math.random() > (both ? 0.6 : 0.35)) return;
  const a = pick(K.fish), b = pick(K.fish.filter(f => f !== a)), mix = KOI_MIX[[a.v, b.v].sort().join('+')];
  let v = pick([a.v, b.v]);
  if (Math.random() < 0.06) v = 'nacht';
  else if (mix && (mix !== 'herz' || both) && Math.random() < 0.55) v = mix;
  K.fish.push({ v, b: s.day });
  const isNew = !K.book[v];
  learn(s, K, v);
  K.news = { day: s.day, v, neu: isNew ? 1 : 0 };
  if (isNew) X.moment(s, 'koi_' + v, KOI[v][1], `Neue Koi-Sorte: ${KOI[v][0]}`, 'In eurem Teich ist über Nacht ein ganz besonderer Fisch geschlüpft.', {});
}
export function migrateKoi(s) {
  const K = s.koi;
  if (!K) return;
  if (typeof K !== 'object' || !Array.isArray(K.fish)) { delete s.koi; return; }
  K.fish = K.fish.filter(f => f && KOI[f.v]).slice(0, KOI_MAX).map(f => ({ v: f.v, b: f.b | 0, ...(typeof f.n === 'string' && f.n ? { n: f.n.slice(0, 12) } : {}) }));
  K.fed = K.fed && Array.isArray(K.fed.by) ? { day: K.fed.day | 0, by: K.fed.by.filter(x => typeof x === 'string').slice(0, 8) } : { day: 0, by: [] };
  K.book = K.book && typeof K.book === 'object' ? Object.fromEntries(Object.entries(K.book).filter(([v]) => KOI[v])) : {};
  for (const f of K.fish) if (!K.book[f.v]) K.book[f.v] = f.b || s.day;
  K.got = K.got && typeof K.got === 'object' ? K.got : {};
  if (K.news && !KOI[K.news.v]) K.news = null;
}
