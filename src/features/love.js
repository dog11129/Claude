// Teil von extras10.js – Herzstücke: das Herzensbuch (gemeinsame Herzpunkte fürs Kuscheln, Küsschen, Blumen und
// Süßes schenken, mit Belohnungen), der Blumenbinde-Tisch (Sträuße und Blütenschmuck aus euren Blumen) und Mieze,
// die im Katzenkörbchen schläft und gestreichelt werden will.
import { ITEMS, isFlower } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import { note } from './util.js';
import * as X from '../extras.js';

// ---------- Herzensbuch ----------
// Zärtlichkeiten zählen je Art einmal am Tag, Geschenke an den Schatz bis GIFT_CAP Punkte am Tag.
export const LOVE_SOCIAL = ['hug', 'kiss', 'highfive', 'dance', 'hand', 'hide', 'cuddle', 'twirl', 'heart', 'nose', 'forehead', 'lap'];
export const GIFT_CAP = 6;
export const SWEETS = ['herzkekse', 'cupcake', 'macarons', 'herzchentorte'];
export const LOVE_STEPS = [
  { at: 5, icon: '🦋', name: 'Erste Schmetterlinge', furn: 'herzkissen' },
  { at: 12, icon: '💗', name: 'Frisch verliebt', hat: 'herzreif' },
  { at: 25, icon: '🕊️', name: 'Turteltauben', furn: 'liebesschaukel' },
  { at: 40, icon: '🌟', name: 'Sternengucker', furn: 'sternennachtlicht' },
  { at: 60, icon: '🌸', name: 'Blütenpaar', hat: 'blumenkrone' },
  { at: 85, icon: '💘', name: 'Herzklopfen', furn: 'herzbogen' },
  { at: 120, icon: '👑', name: 'Märchenpaar', furn: 'baldachinbett' },
  { at: 170, icon: '💞', name: 'Seelenverwandt', furn: 'herzbrunnen' },
  { at: 240, icon: '♾️', name: 'Für immer', hat: 'herzkrone' },
];
export const LOVE_HATS = { herzreif: 'Herz-Haarreif', blumenkrone: 'Blütenkrone', herzkrone: 'Herzkrone' };
export const loveLevel = s => LOVE_STEPS.filter(st => (s.love?.pts || 0) >= st.at).length;
export const nextStep = s => LOVE_STEPS.find(st => (s.love?.pts || 0) < st.at) || null;

function today(s) {
  const L = s.love ||= blankLove();
  if (L.day !== s.day) { L.day = s.day; L.did = {}; L.gift = 0; }
  return L;
}
export const loveDay = s => today(s);
const blankLove = () => ({ pts: 0, day: 0, did: {}, gift: 0, got: 0 });

// Punkte gutschreiben und erreichte Stufen belohnen (Post für euch beide, Hüte gleich in die Garderobe)
export function addLove(s, n, out = {}) {
  const L = today(s);
  L.pts += n;
  out.love10 = (out.love10 || 0) + n;
  while (L.got < LOVE_STEPS.length && L.pts >= LOVE_STEPS[L.got].at) {
    const st = LOVE_STEPS[L.got++];
    if (st.hat) (s.wardrobe ||= {})[st.hat] = s.day;
    const what = st.hat ? `den ${LOVE_HATS[st.hat]} – liegt schon in eurer Garderobe (Aussehen ➜ Extras)` : `${FURNITURE[st.furn].icon} ${FURNITURE[st.furn].name} – hängt an diesem Brief`;
    note(s, `${st.icon} Herzensbuch: ${st.name}`, `${L.pts} Herzpunkte! Ihr zwei seid einfach zu süß. 💕\n\nAls Erinnerung bekommt ihr ${what}.\n\nRosi 🐰`, st.furn || null, 1);
    X.moment(s, 'love' + st.at, st.icon, `Herzensbuch: ${st.name}`, `${L.pts} Herzpunkte zusammen gesammelt.`, out);
    out.loveStep = st;
  }
  return true;
}

// Zärtlichkeit (Umarmen, Küsschen, Kuscheln …): je Art einmal am Tag ein Herzpunkt
export function loveSocial(s, k, out = {}) {
  if (!LOVE_SOCIAL.includes(k)) return false;
  const L = today(s);
  if (L.did[k]) return false;
  L.did[k] = 1;
  return addLove(s, 1, out);
}
// Geschenk an den Schatz: Strauß 3, Selbstgebackenes 2, andere Blumen oder Gerichte 1
export function giftValue(id) {
  if (BIND[id] && FURNITURE[id]) return 3;
  if (SWEETS.includes(id) || id.startsWith('kuscheltier_')) return 2;
  if (isFlower(id) || ITEMS[id]?.cat === 'dish' || ['pfingstrosenvase', 'blumenvase', 'sonnenblumenvase'].includes(id)) return 1;
  return 0;
}
export function loveGift(s, id, n, out = {}) {
  const v = giftValue(id);
  if (!v) return false;
  const L = today(s), add = Math.min(GIFT_CAP - L.gift, v * Math.max(1, Math.min(3, n)));
  if (add <= 0) return false;
  L.gift += add;
  return addLove(s, add, out);
}

// ---------- Blumenbinde-Tisch ----------
// '*pfingstrose' = beliebige Pfingstrosen (alle Farben), '*bunt' = verschiedene Blumensorten
export const BIND = {
  rosenstrauss: { in: { rose: 5 }, desc: 'Fünf Rosen mit Schleife' },
  tulpenstrauss: { in: { tulpe: 5 }, desc: 'Ein bunter Frühlingsgruß' },
  wiesenstrauss: { in: { kornblume: 2, mohn: 2, gaensebluemchen: 2 }, desc: 'Wie frisch von der Wiese' },
  lavendelstrauss: { in: { lavendel: 4 }, desc: 'Duftet nach Sommerurlaub' },
  sonnenblumenstrauss: { in: { sonnenblume: 4 }, desc: 'Macht jeden Tag hell' },
  vergissmeinnichtstrauss: { in: { vergissmeinnicht: 5 }, desc: 'Damit niemand niemanden vergisst' },
  pfingstrosenstrauss: { in: { '*pfingstrose': 5 }, desc: 'Fünf Pfingstrosen – Farben egal' },
  regenbogenstrauss: { in: { '*bunt': 7 }, desc: 'Sieben verschiedene Blumensorten' },
};
export const BIND_HATS = {
  rosenkranz: { in: { rose: 6, gaensebluemchen: 2 }, name: 'Rosenkranz', desc: 'Haarkranz aus Rosen' },
  bluetenspange: { in: { tulpe: 2, margerite: 2 }, name: 'Blüten-Haarspange', desc: 'Kleine Blüten fürs Haar' },
};
const peonies = s => Object.keys(s.inv || {}).filter(k => k.startsWith('pfingstrose') && isFlower(k) && s.inv[k] > 0).sort((a, b) => ITEMS[a].sell - ITEMS[b].sell);
const kinds = s => Object.keys(s.inv || {}).filter(k => isFlower(k) && s.inv[k] > 0).sort((a, b) => s.inv[b] - s.inv[a] || ITEMS[a].sell - ITEMS[b].sell);
// Wie viel ist da? (für die Anzeige) und was genau würde genommen?
export function bindHave(s, key) {
  if (key === '*pfingstrose') return peonies(s).reduce((a, k) => a + s.inv[k], 0);
  if (key === '*bunt') return kinds(s).length;
  return s.inv?.[key] || 0;
}
export function bindTake(s, need) {
  const take = {};
  for (const [k, n] of Object.entries(need)) {
    if (k === '*pfingstrose') { let left = n; for (const p of peonies(s)) { const t = Math.min(left, s.inv[p] - (take[p] || 0)); if (t > 0) { take[p] = (take[p] || 0) + t; left -= t; } if (!left) break; } if (left) return null; }
    else if (k === '*bunt') { const list = kinds(s).filter(p => !take[p] || s.inv[p] > take[p]).slice(0, n); if (list.length < n) return null; for (const p of list) take[p] = (take[p] || 0) + 1; }
    else { take[k] = (take[k] || 0) + n; if ((s.inv?.[k] || 0) < take[k]) return null; }
  }
  return take;
}
export function bind10(s, a, out) {
  const R = BIND[a.id] || BIND_HATS[a.id];
  if (!R) return false;
  if (BIND_HATS[a.id] && s.wardrobe?.[a.id]) { out.msg = `🌸 Den ${R.name} habt ihr schon in der Garderobe.`; return false; }
  const take = bindTake(s, R.in);
  if (!take) { out.msg = '🌷 Dafür fehlen noch Blumen.'; return false; }
  for (const [k, n] of Object.entries(take)) if ((s.inv[k] -= n) <= 0) delete s.inv[k];
  if (BIND_HATS[a.id]) {
    (s.wardrobe ||= {})[a.id] = s.day;
    out.msg = `🌸 ${R.name} gebunden! Ab in die Garderobe – Aussehen ➜ 🎩 Extras.`;
  } else {
    s.inv[a.id] = (s.inv[a.id] || 0) + 1;
    out.msg = `💐 ${FURNITURE[a.id].name} gebunden! Aufstellen oder deinem Schatz schenken (gibt 3 Herzpunkte).`;
    out.got = a.id;
  }
  (s.stats ||= {}).bound = (s.stats.bound || 0) + 1;
  out.snd = 'plopp';
  return true;
}

// ---------- Mieze im Katzenkörbchen ----------
const MIEZE_GIFTS = ['gaensebluemchen', 'feder', 'muschel', 'ast', 'wolle', 'kleeblatt'];
export function mieze10(s, a, out, R) {
  if (!R || !['katzenbett'].includes(R.o?.k)) return false;
  const M = s.mieze ||= { n: 0, day: 0, who: {}, gift: 0 };
  if (M.day !== s.day) { M.day = s.day; M.who = {}; }
  const me = s._who || 'host';
  if (M.who[me]) { out.msg = '🐈 Mieze schnurrt im Schlaf … sie hat heute schon genug Streicheleinheiten.'; out.snd = 'love'; return false; }
  M.who[me] = 1;
  M.n = (M.n || 0) + 1;
  out.msg = M.n === 1 ? '🐈 Eine kleine Katze hat es sich in eurem Körbchen gemütlich gemacht! Sie heißt Mieze und schnurrt laut.' : `🐈 Mieze schnurrt und streckt sich. ${'💗'.repeat(Math.min(5, 1 + Math.floor(M.n / 5)))}`;
  out.snd = 'love';
  M.gift = 1; // morgen vielleicht ein Mitbringsel
  return true;
}
export function miezeMorning(s) {
  const M = s.mieze;
  if (!M?.gift) return;
  M.gift = 0;
  if (Math.random() > 0.45) return;
  const it = MIEZE_GIFTS.filter(k => ITEMS[k]);
  const g = it[Math.floor(Math.random() * it.length)];
  if (g) note(s, '🐈 Ein Mitbringsel von Mieze', `Heute früh lag ${ITEMS[g].icon} ${ITEMS[g].name} neben dem Katzenkörbchen. Mieze tut so, als wüsste sie von nichts. 😸`, g, 1);
}

// ---------- Spielstand ----------
const num = (v, d = 0) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d);
export function migrate10(s) {
  const L = s.love;
  s.love = L && typeof L === 'object' ? { pts: num(L.pts), day: num(L.day), did: L.did && typeof L.did === 'object' ? L.did : {}, gift: num(L.gift), got: Math.min(LOVE_STEPS.length, num(L.got)) } : blankLove();
  const M = s.mieze;
  s.mieze = M && typeof M === 'object' ? { n: num(M.n), day: num(M.day), who: M.who && typeof M.who === 'object' ? M.who : {}, gift: M.gift ? 1 : 0 } : { n: 0, day: 0, who: {}, gift: 0 };
  if (!s.gift10) { // einmalig: ein Blumenbinde-Tisch und ein Brief, was es Neues gibt
    s.gift10 = s.day || 1;
    note(s, '💐 Für euch zwei', 'Ich hab euch einen Blumenbinde-Tisch gebaut! Stellt ihn ins Haus – daran bindet ihr aus euren Blumen Sträuße und Haarschmuck.\n\nUnd schaut mal ins Handy: Im 💗 Herzensbuch sammelt ihr ab jetzt gemeinsam Herzpunkte – fürs Kuscheln, Küsschen, Sträuße und Selbstgebackenes. Dafür gibt es ganz besondere Möbel und Haarschmuck.\n\nÜbrigens: Am Frisiertisch oder vor einem Spiegel im Haus könnt ihr euch jetzt schminken – Rouge, Lippenstift, Lidschatten und süße Wangen-Sticker. 💄\n\nRosi 🐰', 'blumentisch', 1);
  }
}
export function morning10(s) {
  if (!s.love) migrate10(s);
  miezeMorning(s);
}
