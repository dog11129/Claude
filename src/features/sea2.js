// Teil von extras5.js – Hochsee-Angeln mit Käpt'n Flossi und Leuchtturm-Nächte (Schiffe lotsen, Händler).
import { ITEMS, PLACE } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import { who, hour, fmt, rnd } from './util.js';

export const DEEPSEA = { x: 0, z: 3700, w: 2.2, d: 5 }; // das Boot: Deck um die Mitte
export const DEEPSEA_PRICE = 2000;
export const DEEPSEA_LVL = 3;
export const deepBlocked = (s, x, z) => Math.abs(x - DEEPSEA.x) > DEEPSEA.w - 0.35 || Math.abs(z - DEEPSEA.z) > DEEPSEA.d - 0.4;
export const BIGFISH = [['goldmakrele', 34], ['thunfisch', 28], ['mondfisch', 18], ['schwertfisch', 13], ['segelfisch', 7]];
export function resolveDeep(s, me) {
  const lz = me.z - DEEPSEA.z;
  if (lz > DEEPSEA.d - 1.6) return { ui: 'boatback', label: '⛵ Käpt\'n Flossi: zurück nach Hause', tiles: [] };
  if (Math.abs(me.x - DEEPSEA.x) > DEEPSEA.w - 1.2) return { bigfish: true, label: '🎣 Die Hochseeangel auswerfen', tiles: [] };
  return { label: '🌊 Zur Reling gehen und angeln', tiles: [] };
}
export function deepsea(s, a, out) {
  const D = s.deepsea, me = who(s);
  if (D.day !== s.day) { D.day = s.day; D.n = {}; }
  if (a.op === 'boat') {
    if (s.level < DEEPSEA_LVL) { out.msg = `🎣 Hochsee-Angeln gibt es ab Insel-Level ${DEEPSEA_LVL}.`; return false; }
    if (s.money < DEEPSEA_PRICE) { out.msg = `🎣 Die Ausfahrt kostet ${fmt(DEEPSEA_PRICE)} Taler.`; return false; }
    s.money -= DEEPSEA_PRICE;
    out.snd = 'splash';
    return true;
  }
  if (a.op === 'catch') {
    if ((D.n[me] || 0) >= 6) { out.msg = '🎣 Genug gefangen für heute – die großen Fische brauchen Ruhe.'; return false; }
    D.n[me] = (D.n[me] || 0) + 1;
    if (!a.ok) { out.msg = '🎣 Die Leine ist gerissen … der war zu stark!'; out.snd = 'fail'; return true; }
    let r = Math.random() * 100, id = BIGFISH[0][0];
    for (const [f, w] of BIGFISH) if ((r -= w) <= 0) { id = f; break; }
    S.addInvX(s, id, 1); S.collectX(s, id, out);
    s.tidebook[id] ||= s.day;
    out.got = id; out.msg = `🎣 Ein riesiger ${ITEMS[id].icon} ${ITEMS[id].name}!`; out.snd = 'fanfare';
    S.questEventX(s, 'bigfish', 1, out); S.questEventX(s, 'fish', 1, out);
    return true;
  }
  return false;
}

// ---------- Leuchtturm: nachts Schiffe lotsen, gerettete Händler kommen am nächsten Tag ----------
export const lighthouseNight = s => hour(s) >= 20 || hour(s) < 5;
const RARE = () => [...Object.keys(FURNITURE).filter(k => FURNITURE[k].rare && !['nroom', 'xroom', 'pottery', 'depths', 'wool', 'tmap', 'bees', 'band'].includes(FURNITURE[k].rare)), ...['kristallfels', 'pilzlaterne', 'sternlampe'].filter(k => PLACE[k])];
export function lighthouse(s, a, out) {
  const L = s.lighthouse;
  if (!Object.values(s.obj || {}).some(o => o?.k === 'leuchtturm')) return false;
  if (a.op === 'saved') {
    if (!lighthouseNight(s)) { out.msg = '🗼 Schiffe lotst man nachts.'; return false; }
    if (L.night === s.day || !Number.isInteger(a.n) || a.n < 0 || a.n > 3) return false;
    L.night = s.day;
    if (!a.n) { out.msg = '🗼 Diesmal haben die Schiffe den Weg nicht gefunden …'; return true; }
    L.saved = (L.saved || 0) + a.n;
    const pool = RARE(), offer = [];
    while (offer.length < Math.min(3, a.n + 1) && pool.length) offer.push(pool.splice(rnd(pool.length), 1)[0]);
    L.trader = { day: s.day + 1, offer };
    out.msg = `🗼 ${a.n} Schiff${a.n > 1 ? 'e' : ''} sicher im Hafen! Morgen kommt ein dankbarer Händler zum Leuchtturm.`;
    out.snd = 'fanfare';
    S.questEventX(s, 'ship', a.n, out);
    return true;
  }
  if (a.op === 'buy') {
    const T = L.trader, id = T?.offer?.[a.i];
    if (!T || T.day !== s.day || !id || !ITEMS[id]) return false;
    const price = 3000;
    if (s.money < price) { out.msg = `🗼 Das kostet ${fmt(price)} Taler.`; return false; }
    s.money -= price;
    S.addInvX(s, id, 1);
    T.offer.splice(a.i, 1);
    out.got = id; out.msg = `🗼 ${ITEMS[id].icon} ${ITEMS[id].name} gekauft!`; out.snd = 'coin';
    return true;
  }
  return false;
}
