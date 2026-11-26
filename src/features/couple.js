// Teil von extras11.js – „Für zwei“: Unser Tag (seit wann ihr zusammen seid, Monatstage und Jahrestag mit Post,
// Herzpunkten und Herzchenregen), Greifautomat mit Kuscheltieren, Dinner bei Kerzenschein, Liebesbriefe.
import { ITEMS, NPC_DATA } from '../data.js';
import { KUSCHEL } from '../furni-data2.js';
import { note } from './util.js';
import * as X from '../extras.js';
import { addLove, loveDay, SWEETS } from './love.js';

// ---------- Unser Tag ----------
export const UNSER = 'Unser Jahrestag 💕';
const DAY = 864e5;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const okDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T12:00'));
export function daysTogether(s, now = new Date()) {
  if (!okDate(s.couple?.since)) return null;
  return Math.floor((Date.parse(iso(now) + 'T12:00') - Date.parse(s.couple.since + 'T12:00')) / DAY);
}
// Ist heute ein Monatstag? (31. → im kurzen Monat am letzten Tag)
export function coupleToday(s, now = new Date()) {
  if (!okDate(s.couple?.since)) return null;
  const [y, m, d] = s.couple.since.split('-').map(Number), ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
  const months = (ty - y) * 12 + (tm - m), last = new Date(ty, tm, 0).getDate();
  if (months < 1 || td !== Math.min(d, last)) return null;
  return { months, years: months % 12 ? 0 : months / 12, key: iso(now) };
}
// nächster Monatstag (für die Anzeige)
export function nextMonthDay(s, now = new Date()) {
  if (!okDate(s.couple?.since)) return null;
  const d = +s.couple.since.slice(8), y = now.getFullYear(), m = now.getMonth(), today = new Date(y, m, now.getDate(), 12);
  const at = k => new Date(y, m + k, Math.min(d, new Date(y, m + k + 1, 0).getDate()), 12);
  const t = at(0) >= today ? at(0) : at(1);
  return Math.round((t - today) / DAY);
}
const MON_GIFTS = ['rosenstrauss', 'cupcake', 'pfingstrosenstrauss', 'macarons', 'tulpenstrauss', 'herzkekse', 'vergissmeinnichtstrauss', 'herzchentorte', 'lavendelstrauss', 'kuscheltier_teddy', 'regenbogenstrauss'];
export function coupleCheck(s, out = {}, now = new Date()) {
  const T = coupleToday(s, now);
  if (!T || s.couple.done === T.key) return false;
  s.couple.done = T.key;
  s.couple.party = T.key;
  if (T.years) {
    note(s, `💍 ${T.years} Jahr${T.years === 1 ? '' : 'e'} zusammen!`, `Ihr Lieben,\nheute vor ${T.years === 1 ? 'einem Jahr' : T.years + ' Jahren'} hat alles angefangen. 💕 Die ganze Insel freut sich mit euch – heute Abend gibt es ein Feuerwerk nur für euch zwei.\n\nFür euer Zuhause hab ich ein Bild gemalt.\n\nRosi 🐰`, 'jahrestagsbild', 1);
    addLove(s, 10, out);
  } else {
    const g = MON_GIFTS[(T.months - 1) % MON_GIFTS.length];
    note(s, `💕 Happy Monatstag!`, `Ihr Lieben,\nheute seid ihr ${T.months} Monat${T.months === 1 ? '' : 'e'} zusammen! Ich finde, das muss gefeiert werden. 🥰\n\nEine Kleinigkeit für euch liegt bei.\n\nRosi 🐰`, ITEMS[g] ? g : null, 1);
    addLove(s, 5, out);
  }
  (s.diary ||= []).push({ day: s.day, icon: T.years ? '💍' : '💕', text: T.years ? `${T.years} Jahr${T.years === 1 ? '' : 'e'} zusammen – Feuerwerk am Abend!` : `${T.months} Monat${T.months === 1 ? '' : 'e'} zusammen 💕` });
  X.moment(s, 'mon:' + T.key, T.years ? '💍' : '💕', T.years ? `${T.years}. Jahrestag` : `${T.months} Monate zusammen`, T.years ? 'Ein ganzes Jahr mehr – mit Feuerwerk über dem Meer.' : 'Ein Monatstag mit Post von Rosi und ganz vielen Herzchen.', out);
  return true;
}
function couple11(s, a, out) {
  if (a.op === 'since') {
    if (!okDate(a.date)) return false;
    if (a.date > iso(new Date())) { out.msg = '📅 Das Datum liegt in der Zukunft.'; return false; }
    s.couple = { since: a.date, done: s.couple?.done || '', party: s.couple?.party || '' };
    // Jahrestag auch bei den Jahrestagen im Fotobuch (dort gibt es abends das Feuerwerk)
    s.anniv ||= { dates: [], done: {} };
    s.anniv.dates = (s.anniv.dates || []).filter(d => d.name !== UNSER);
    if (s.anniv.dates.length < 8) s.anniv.dates.push({ name: UNSER, md: a.date.slice(5), y: +a.date.slice(0, 4) });
    const n = daysTogether(s);
    out.msg = `💕 Gespeichert! Ihr seid seit ${n} Tag${n === 1 ? '' : 'en'} zusammen.`;
    out.snd = 'love';
    coupleCheck(s, out);
    return true;
  }
  if (a.op === 'clear' && s.couple) {
    s.couple = null;
    if (s.anniv?.dates) s.anniv.dates = s.anniv.dates.filter(d => d.name !== UNSER);
    return true;
  }
  return false;
}

// ---------- Greifautomat ----------
export const CLAW_PRICE = 100;
export const KUSCHEL_IDS = Object.keys(KUSCHEL);
// Welche Kuscheltiere liegen bei diesem Versuch im Automaten? (seltene seltener)
export function clawFill(rnd = Math.random, n = 7) {
  const all = Object.entries(KUSCHEL), tot = all.reduce((a, [, v]) => a + v[2], 0), out = [];
  for (let i = 0; i < n; i++) { let r = rnd() * tot; for (const [id, v] of all) { r -= v[2]; if (r <= 0) { out.push(id); break; } } }
  return out;
}
function claw11(s, a, out) {
  if (a.op !== 'play' || (a.win != null && !KUSCHEL[a.win])) return false;
  if (s.money < CLAW_PRICE) { out.msg = '🪙 Ein Versuch kostet 100 Taler.'; return false; }
  s.money -= CLAW_PRICE;
  const C = s.claw11 ||= { n: 0, won: {} };
  C.n++;
  if (!a.win) { out.msg = '🕹️ Knapp daneben! Noch ein Versuch?'; out.snd = 'fail'; return true; }
  s.inv[a.win] = (s.inv[a.win] || 0) + 1;
  const first = !C.won[a.win];
  C.won[a.win] = (C.won[a.win] || 0) + 1;
  const [name, icon] = KUSCHEL[a.win];
  out.msg = `${icon} ${name} gewonnen!${first ? ' Neu in eurer Sammlung!' : ''} Zum Aufstellen oder Verschenken (gibt 2 Herzpunkte).`;
  out.snd = 'fanfare';
  out.got = a.win;
  if (a.win === 'kuscheltier_gold') X.moment(s, 'goldteddy', '🌟', 'Der goldene Teddy', 'Aus dem Greifautomaten gefischt – das seltenste Kuscheltier von allen!', out);
  if (KUSCHEL_IDS.every(k => C.won[k])) X.moment(s, 'kuschelalle', '🧸', 'Alle Kuscheltiere', 'Die ganze Sammlung aus dem Greifautomaten ist komplett.', out);
  return true;
}

// ---------- Dinner bei Kerzenschein ----------
// a.names trägt der Gastgeber ein (wer gerade am Tisch steht), nicht der Browser
function dinnerDish(s) {
  const own = Object.keys(s.inv || {}).filter(k => s.inv[k] > 0 && ITEMS[k]?.cat === 'dish');
  return own.sort((x, y) => (SWEETS.includes(y) - SWEETS.includes(x)) || (ITEMS[y].sell || 0) - (ITEMS[x].sell || 0))[0] || null;
}
export function dinner11(s, a, out, ok) {
  if (!ok) return false;
  const names = Array.isArray(a.names) ? a.names.map(n => String(n || '').trim().slice(0, 16)).filter(Boolean) : [];
  if (names.length < 2) { out.msg = '🕯️ Ein Dinner bei Kerzenschein ist zu zweit am schönsten – hol deinen Schatz an den Tisch!'; return false; }
  const D = s.dinner11 ||= { day: 0, n: 0 };
  if (D.day === s.day) { out.msg = '🕯️ Heute habt ihr schon zusammen gegessen. Morgen wieder! 💕'; return false; }
  const dish = dinnerDish(s);
  if (!dish) { out.msg = '🍽️ Bringt etwas zu essen mit – ein Gericht vom Herd oder etwas Selbstgebackenes.'; return false; }
  if ((s.inv[dish] -= 1) <= 0) delete s.inv[dish];
  D.day = s.day; D.n++;
  const who = names.slice(0, 2).join(' & '), it = ITEMS[dish];
  (s.diary ||= []).push({ day: s.day, icon: '🕯️', text: `${who} haben bei Kerzenschein ${it.name} gegessen` });
  X.moment(s, 'dinner', '🕯️', 'Dinner bei Kerzenschein', `${who} – mit ${it.name} und ganz viel Kerzenlicht.`, out);
  addLove(s, 3, out);
  out.msg = `🕯️ Dinner bei Kerzenschein: ${it.icon} ${it.name} für zwei. 💕 (+3 Herzpunkte)`;
  out.snd = 'love';
  out.dinner = true;
  return true;
}

// ---------- Liebesbriefe: ein Brief an einen Menschen (keine Nachbarin) bringt einmal am Tag 2 Herzpunkte ----------
const NPC_NAMES = new Set(Object.values(NPC_DATA || {}).map(n => n.name));
export function loveLetter(s, to, from, out = {}) {
  if (!to || to === from || NPC_NAMES.has(to)) return false;
  const L = loveDay(s);
  if (L.did.letter) return false;
  L.did.letter = 1;
  return addLove(s, 2, out);
}

// ---------- Spielstand ----------
export function migrate11(s) {
  const C = s.couple;
  s.couple = C && typeof C === 'object' && okDate(C.since) ? { since: C.since, done: typeof C.done === 'string' ? C.done : '', party: typeof C.party === 'string' ? C.party : '' } : null;
  const K = s.claw11;
  s.claw11 = K && typeof K === 'object' ? { n: Number.isInteger(K.n) ? K.n : 0, won: Object.fromEntries(Object.entries(K.won || {}).filter(([k, v]) => KUSCHEL[k] && Number.isInteger(v))) } : { n: 0, won: {} };
  const D = s.dinner11;
  s.dinner11 = D && typeof D === 'object' ? { day: Number.isInteger(D.day) ? D.day : 0, n: Number.isInteger(D.n) ? D.n : 0 } : { day: 0, n: 0 };
  coupleCheck(s);
}
export const E11_ACTIONS = { couple11, claw11 };
