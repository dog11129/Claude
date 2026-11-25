// Teil von extras5.js – Dachboden & Keller, Baumhaus (Extra-Zimmer), Möbel lackieren, Töpferei, Kompost.
import { ITEMS, CROPS } from '../data.js';
import { FURNITURE, POT_FORMS, POT_GLAZES } from '../furni-data.js';
import * as S from '../state.js';
import { who, note, fmt } from './util.js';

// Extra-Zimmer liegen wie das Haus bei x = 300, aber nördlich (z < -30)
export const XROOMS = {
  attic: { name: 'Dachboden', icon: '🪜', z0: -50, size: [7, 5], wall: 'holz', floor: 'dielen', price: 60000, lvl: 5, item: 'treppe_hoch' },
  cellar: { name: 'Keller', icon: '🕯️', z0: -90, size: [7, 5], wall: 'stein', floor: 'stein', price: 60000, lvl: 5, item: 'treppe_runter' },
  tree: { name: 'Baumhaus', icon: '🌳', z0: -130, size: [5, 4], wall: 'holz', floor: 'parkett' },
};
export const xroomAt = z => (z > -30 ? null : Object.keys(XROOMS).reduce((b, id) => (Math.abs(XROOMS[id].z0 - z) < Math.abs(XROOMS[b].z0 - z) ? id : b), 'attic'));
export const xroomOpen = (s, id) => id === 'tree' ? Object.values(s.obj || {}).some(o => o?.k === 'baumhaus') : !!s.xrooms?.[id];
export const xroomBlank = id => ({ wall: XROOMS[id].wall, floor: XROOMS[id].floor, items: {}, rugs: {}, walls: {} });
export function xroom(s, a, out) {
  const X = XROOMS[a.id];
  if (a.op !== 'build' || !X?.price || s.xrooms[a.id]) return false;
  if (s.up.house < 3) { out.msg = 'Erst braucht ihr ein größeres Haus (Ausbau-Stufe 3).'; return false; }
  if (s.money < X.price) { out.msg = `${X.icon} ${X.name}: ${fmt(X.price)} Taler aus der Inselkasse.`; return false; }
  s.money -= X.price;
  s.xrooms[a.id] = xroomBlank(a.id);
  S.addInvX(s, X.item, 1);
  out.msg = `${X.icon} Der ${X.name} ist fertig! Stellt die Treppe (in eurer Tasche) im Haus auf – dann geht es ${a.id === 'attic' ? 'hinauf' : 'hinunter'}.`;
  out.snd = 'level';
  return true;
}

// ---------- Möbel lackieren (Farbpinsel, Baumodus im Haus) ----------
export const TINTS = ['#ffffff', '#ffc4d0', '#c4dcff', '#cdf0c4', '#fff0a8', '#e0ccff', '#b8b8c0', '#ffd0a8'];
export function hpaint(s, a, out) {
  if (!(s.inv.farbpinsel > 0) || !Number.isInteger(a.x) || !Number.isInteger(a.z) || !Number.isInteger(a.c) || a.c < 0 || a.c >= TINTS.length) return false;
  const R = a.room ? S.roomOf(s, a.room) : S.roomOf(s), h = S.homeAt(s, a.x, a.z, false, R) || S.homeAt(s, a.x, a.z, true, R);
  if (!h) return false;
  if (a.c) h.o.c = a.c; else delete h.o.c;
  out.snd = 'plopp';
  return true;
}

// ---------- Töpferei: Lehm formen, über Nacht im Ofen ----------
export function pottery(s, a, out) {
  const f = POT_FORMS.find(x => x[0] === a.form), g = POT_GLAZES.find(x => x[0] === a.glaze);
  if (a.op !== 'make' || !f || !g || !Object.values(s.obj || {}).some(o => o?.k === 'toepferscheibe')) return false;
  if ((s.inv.lehm || 0) < 2) { out.msg = '🏺 Dafür braucht es 2 Lehm (mit der Schaufel an Lehm-Stellen graben).'; return false; }
  if (s.kiln.length >= 6) { out.msg = '🏺 Der Ofen ist voll – morgen ist Platz.'; return false; }
  S.takeInvX(s, 'lehm', 2);
  s.kiln.push({ id: `topf_${f[0]}_${g[0]}`, day: s.day });
  out.msg = `🏺 ${f[1]} (${g[1]}) geformt und in den Ofen gestellt – morgen früh ist sie im Briefkasten!`;
  out.snd = 'till';
  return true;
}
export function kilnMorning(s) {
  const done = s.kiln.filter(k => k.day < s.day && FURNITURE[k.id]);
  if (!done.length) return;
  s.kiln = s.kiln.filter(k => !done.includes(k));
  for (const k of done) note(s, '🏺 Frisch aus dem Ofen', `Eure ${FURNITURE[k.id].name} ist fertig gebrannt und glänzt wunderschön!`, k.id, 1);
}

// ---------- Kompost: Unkraut & Ernte-Reste hinein, morgens Kompost und Regenwürmer ----------
export const COMPOST_IN = id => id === 'unkraut' || id === 'ast' || ITEMS[id]?.cat === 'fruit' || !!CROPS[id];
export function compost(s, a, out) {
  const C = s.compost;
  if (!Object.values(s.obj || {}).some(o => o?.k === 'komposter')) return false;
  if (a.op === 'add') {
    if (!COMPOST_IN(a.id) || !Number.isInteger(a.n) || a.n < 1 || a.n > 99 || (s.inv[a.id] || 0) < a.n) return false;
    S.takeInvX(s, a.id, a.n);
    C.pts = (C.pts || 0) + a.n;
    out.msg = `🟫 ${a.n}× ${ITEMS[a.id].name} im Komposter (${C.pts} Teile – je 4 werden über Nacht zu Kompost).`;
    out.snd = 'plopp';
    return true;
  }
  if (a.op === 'take') {
    if (!(C.ready > 0) && !(C.worms > 0)) { out.msg = '🟫 Noch nichts fertig – morgen früh schauen.'; return false; }
    if (C.ready) S.addInvX(s, 'kompost', C.ready);
    if (C.worms) S.addInvX(s, 'regenwurm', C.worms);
    out.msg = `🟫 ${C.ready || 0}× Kompost${C.worms ? ` und ${C.worms}× Regenwurm` : ''} geholt!`;
    C.ready = 0; C.worms = 0;
    out.snd = 'harvest';
    S.questEventX(s, 'compost', 1, out);
    return true;
  }
  return false;
}
export function compostMorning(s) {
  const C = s.compost, n = Math.floor((C.pts || 0) / 4);
  if (!n) return;
  C.pts -= n * 4; C.ready = Math.min(40, (C.ready || 0) + n); C.worms = Math.min(20, (C.worms || 0) + Math.ceil(n / 2));
}
// Kompost aufs Beet: wächst sofort ein gutes Stück
export function feedCompost(s, a, out) {
  const t = s.tiles?.[`${a.x},${a.z}`];
  if (!t?.c || S.stage(t.c) === 3 || !(s.inv.kompost > 0) || t.c.kd === s.day) { if (t?.c?.kd === s.day) out.msg = '🟫 Hier ist heute schon Kompost drauf.'; return false; }
  S.takeInvX(s, 'kompost', 1);
  t.c.kd = s.day;
  t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + CROPS[t.c.k].grow * 0.5);
  out.fx.push({ x: a.x, z: a.z, txt: '🟫✨', k: 'leaf' });
  out.snd = 'plopp';
  return true;
}
