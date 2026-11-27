// Teil von extras15.js – Adventskalender (echtes Datum: 1.–24. Dezember, nachholen geht bis Silvester) und der Glückskeks des Tages.
// s.advent = { y, open: { <Spieler>: [Türchen …] }, mail }, s.cookie = { day, who: { <Spieler>: Spruch-Nr. } }, s.luck = { day, k }.
import { ITEMS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, who, note } from './util.js';
import { addLove } from './love.js';
import { LUCKS, luckOf } from './pure15.js';

// Die Uhr lässt sich für Tests stellen
let clock = () => new Date();
export const setClock15 = fn => { clock = fn || (() => new Date()); };
export function adventInfo(d = clock()) {
  const m = d.getMonth(), day = d.getDate(), y = d.getFullYear();
  if (m === 11) return { y, on: true, max: Math.min(24, day), day };
  if (m === 10 && day >= 20) return { y, on: false, soon: 31 - day };
  return { y, on: false };
}
// Was hinter den Türchen steckt (jede:r öffnet seine eigenen)
export const ADVENT = [null,
  { item: 'kakao', n: 2 }, { money: 300 }, { item: 'bonbon', n: 5 }, { item: 'zuckerstange', n: 1 }, { stars: 2 },
  { item: 'nikolausstiefel', n: 1, extra: ['bratapfel', 2] }, { item: 'holz', n: 10 }, { money: 500 }, { item: 'honig', n: 2 }, { item: 'kakaotablett', n: 1 },
  { item: 'sternsplitter', n: 1 }, { item: 'nussknacker', n: 1 }, { item: 'duenger', n: 2 }, { stars: 3 }, { item: 'eislaterne', n: 1 },
  { money: 800 }, { item: 'kristall', n: 1 }, { item: 'adventsstern', n: 1 }, { item: 'bratapfel', n: 3 }, { item: 'geschenkestapel', n: 1 },
  { item: 'amethyst', n: 1 }, { money: 1000 }, { item: 'sternlichterkette', n: 1 }, { item: 'weihnachtspyramide', n: 1, extra: ['lebkuchenhaus', 1], money: 2400, love: 10 },
];
const nm = id => `${ITEMS[id]?.icon || '🎁'} ${ITEMS[id]?.name || id}`;
export function adventLabel(g) {
  const p = [];
  if (g.item) p.push(`${g.n > 1 ? g.n + '× ' : ''}${nm(g.item)}`);
  if (g.extra) p.push(`${g.extra[1] > 1 ? g.extra[1] + '× ' : ''}${nm(g.extra[0])}`);
  if (g.money) p.push(`${fmt(g.money)} Taler`);
  if (g.stars) p.push(`${g.stars} Sternchen ⭐`);
  if (g.love) p.push(`${g.love} Herzpunkte 💕`);
  return p.join(' + ');
}
const adv = (s, y) => (s.advent && s.advent.y === y ? s.advent : (s.advent = { y, open: {}, mail: s.advent?.mail || 0 }));
export const adventOpened = (s, key) => (s.advent?.y === adventInfo().y ? s.advent.open?.[key] || [] : []);
// Wie viele Türchen warten heute noch auf diese:n Spieler:in?
export function adventWaiting(s, key) {
  const I = adventInfo();
  if (!I.on) return 0;
  const o = adventOpened(s, key);
  let n = 0;
  for (let d = 1; d <= I.max; d++) if (!o.includes(d)) n++;
  return n;
}
export function advent15(s, a, out) {
  const I = adventInfo(), d = a.d | 0, me = who(s);
  if (!(d >= 1 && d <= 24)) return false;
  if (!I.on) { out.msg = 'Der Adventskalender öffnet am 1. Dezember.'; return false; }
  if (d > I.max) { out.msg = `Türchen ${d} ist noch zu – erst am ${d}. Dezember.`; return false; }
  const A = adv(s, I.y), mine = A.open[me] ||= [];
  if (mine.includes(d)) { out.msg = 'Dieses Türchen hast du schon geöffnet.'; return false; }
  mine.push(d);
  const g = ADVENT[d];
  if (g.item) S.addInvX(s, g.item, g.n || 1);
  if (g.extra) S.addInvX(s, g.extra[0], g.extra[1]);
  if (g.money) { s.money += g.money; s.stats.earned += g.money; }
  if (g.stars && s.plus) { s.plus.stars += g.stars; s.plus.total = (s.plus.total || 0) + g.stars; }
  if (g.love) addLove(s, g.love, out);
  out.advent15 = { d };
  out.msg = `🎄 Türchen ${d}: ${adventLabel(g)}`;
  out.snd = d === 24 ? 'fanfare' : 'coin';
  if (d === 24) X.moment(s, 'advent' + I.y, '🎄', 'Heiligabend auf der Insel', `Das letzte Türchen ist offen – frohe Weihnachten, ihr zwei! (${I.y})`, out);
  return true;
}
// Einmal im Jahr, sobald der Advent vor der Tür steht: Mira schickt den Wandkalender
export function adventMail(s) {
  const I = adventInfo();
  if (!(I.on || I.soon)) return false;
  const A = adv(s, I.y);
  if (A.mail === I.y) return false;
  A.mail = I.y;
  note(s, '🎄 Der Adventskalender ist da!', `Ihr Lieben,\n\n${I.on ? 'es ist Dezember' : `in ${I.soon === 1 ? 'einem Tag' : I.soon + ' Tagen'} ist der 1. Dezember`} – und auf der Insel gibt es jeden Tag ein Türchen: 24 kleine Überraschungen für jede:n von euch, am 24. etwas ganz Besonderes.\n\nIhr findet den Kalender im 📱 Handy (🎄 Advent) oder hängt euch diesen hier an die Wand. Verpasste Türchen könnt ihr bis Silvester nachholen.\n\nEine kuschelige Adventszeit!\nMira 🦔`, 'adventskalender', 1, 'mira');
  return true;
}
export function migrateAdvent(s) {
  const A = s.advent;
  if (A && !(typeof A === 'object' && Number.isInteger(A.y) && A.open && typeof A.open === 'object')) { delete s.advent; return; }
  if (A) for (const [k, v] of Object.entries(A.open)) A.open[k] = Array.isArray(v) ? [...new Set(v.filter(d => Number.isInteger(d) && d >= 1 && d <= 24))] : [];
  if (s.cookie && !(typeof s.cookie === 'object' && s.cookie.who && typeof s.cookie.who === 'object')) delete s.cookie;
  if (s.luck && !(typeof s.luck === 'object' && LUCKS[s.luck.k])) delete s.luck;
}

// ---------- Glückskeks des Tages ----------
export const FORTUNES = [
  'Heute ist ein guter Tag, um jemandem zu sagen, wie gern du ihn hast.',
  'Wer zusammen gießt, erntet doppelt so viel Freude.',
  'Ein kleiner Umweg führt heute zu etwas Schönem.',
  'Das Glück sitzt oft direkt neben dir auf der Bank.',
  'Auch ein Regentag hat seinen eigenen Glanz – und Pfützen zum Hüpfen.',
  'Jemand denkt gerade an dich. Rate mal, wer.',
  'Geteilter Kuchen schmeckt immer nach mehr.',
  'Die schönsten Schätze liegen nicht im Sand, sondern laufen neben dir.',
  'Heute lohnt es sich, einmal mehr die Angel auszuwerfen.',
  'Ein Lächeln ist die kürzeste Brücke zwischen zwei Ufern.',
  'Wer langsam geht, sieht mehr Schmetterlinge.',
  'Der Tag wird so kuschelig, wie ihr ihn macht.',
  'Mut wächst wie Tulpen: erst klein, dann plötzlich überall.',
  'Etwas, worauf du wartest, ist schon unterwegs.',
  'Zwei Paar Fußspuren am Strand sind schöner als eins.',
  'Heute darfst du stolz auf dich sein – einfach so.',
  'Ein Kompliment kostet nichts und wärmt den ganzen Tag.',
  'Wo ihr zusammen lacht, ist euer Zuhause.',
  'Die Sterne haben heute Abend Zeit für eure Wünsche.',
  'Was du mit Liebe pflanzt, wächst auch im Winter.',
  'Ein guter Nachbar ist ein Geschenk – sag es ihm ruhig.',
  'Nimm dir heute Zeit für etwas, das keinen Zweck hat außer Freude.',
  'Hinter der nächsten Ecke wartet eine kleine Überraschung.',
  'Du bist für jemanden der schönste Teil des Tages.',
  'Wer teilt, hat am Ende mehr.',
  'Heute passt alles ein bisschen besser zusammen als sonst.',
  'Eine Umarmung löst mehr Knoten als jede Schere.',
  'Der beste Platz der Insel ist der neben deinem Lieblingsmenschen.',
  'Ein neues Lieblingsfoto wartet darauf, gemacht zu werden.',
  'Kleine Schritte bauen große Inseln.',
  'Heute findest du etwas, das du gar nicht gesucht hast.',
  'Das Meer bringt zurück, was man ihm anvertraut – meistens als Muschel.',
  'Gemeinsam ist selbst Unkrautjäten ein Abenteuer.',
  'Frag heute einmal: „Wie geht es dir wirklich?“',
  'Die Insel ist schöner, weil ihr zwei darauf seid.',
  'Morgen wirst du froh sein über das, was du heute anfängst.',
];
export const cookieOpen = (s, key) => (s.cookie?.day === s.day && s.cookie.who?.[key] !== undefined ? s.cookie.who[key] : null);
export function cookie15(s, a, out) {
  const me = who(s);
  if (cookieOpen(s, me) !== null) { out.msg = 'Deinen Glückskeks hast du heute schon geknackt – morgen gibt es einen neuen.'; return false; }
  const C = s.cookie = s.cookie?.day === s.day ? s.cookie : { day: s.day, who: {} };
  const i = rnd(FORTUNES.length), coins = 50 + rnd(4) * 50;
  C.who[me] = i;
  let fresh = false;
  if (!luckOf(s)) { s.luck = { day: s.day, k: pick(Object.keys(LUCKS)) }; fresh = true; }
  s.money += coins; s.stats.earned += coins;
  s.stats.cookies = (s.stats.cookies || 0) + 1;
  const L = LUCKS[s.luck.k];
  out.cookie15 = { i, k: s.luck.k, coins, fresh };
  out.msg = `🥠 Knack! +${coins} Taler${fresh ? ` · ${L[0]} Tagesglück: ${L[1]}` : ''}`;
  out.snd = 'coin';
  return true;
}
