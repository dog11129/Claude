// Teil von extras15.js – der Erinnerungsbaum (wächst mit jedem Tag, schneller an gemeinsamen Tagen; Anhänger für Meilensteine,
// kleine Zettel) und die Polaroid-Wand (Fotos aus dem Fotomodus als kleine Bilder im Haus).
// s.tree = { seen: { <Spieler>: Tag }, days, last, notes: [{ d, w, n, t }], noted: { <Spieler>: Tag } }
// s.pola = { img: { <Platz>: 'data:image/jpeg;base64,…' }, cap: { <Platz>: Text }, got: [Plätze] }
import * as S from '../state.js';
import { who } from './util.js';
import { addLove, loveLevel } from './love.js';

export const TREE_ID = 'erinnerungsbaum', TREE_STAGES = [0, 20, 50, 100, 180], TREE_NOTES = 60, NOTE_LEN = 80;
export const TREE_NAMES = ['Setzling', 'Bäumchen', 'Junger Baum', 'Stattlicher Baum', 'Uralter Erinnerungsbaum'];
export const treeState = s => (s.tree ||= { seen: {}, days: 0, last: 0, notes: [], noted: {} });
export const treePts = s => s.day + 2 * (s.tree?.days || 0);
export const treeStage = s => TREE_STAGES.filter(v => treePts(s) >= v).length - 1;
export const treeNext = s => TREE_STAGES.find(v => v > treePts(s)) || null;
// Meilensteine: hängen als Anhänger im Baum (aus dem Spielstand abgeleitet, nichts Eigenes gespeichert)
export const TREE_MARKS = [
  ['d1', '🌱', 'Der erste gemeinsame Tag', s => (s.tree?.days || 0) >= 1],
  ['d10', '🍃', '10 gemeinsame Tage', s => (s.tree?.days || 0) >= 10],
  ['d30', '🌳', '30 gemeinsame Tage', s => (s.tree?.days || 0) >= 30],
  ['d100', '🏆', '100 gemeinsame Tage', s => (s.tree?.days || 0) >= 100],
  ['love3', '💕', 'Herzensbuch: Stufe 3', s => loveLevel(s) >= 3],
  ['love6', '💖', 'Herzensbuch: Stufe 6', s => loveLevel(s) >= 6],
  ['wed', '💍', 'Hochzeit auf der Insel', s => !!s.married],
  ['locks', '🔒', '5 Liebesschlösser an der Brücke', s => (s.locks?.length || 0) >= 5],
  ['year', '🎂', 'Ein ganzes Inseljahr', s => s.day > 28],
  ['koi', '🐟', '5 Koi-Sorten im Teich', s => Object.keys(s.koi?.book || {}).length >= 5],
  ['puzzle', '🧩', 'Das erste Puzzle fertig', s => (s.puzzle?.done || 0) >= 1],
  ['rally', '🏸', '25 Schläge beim Federball', s => (s.rally?.best || 0) >= 25],
  ['games', '🎲', '10 Spieleabende', s => (s.stats?.games || 0) >= 10],
  ['advent', '🎄', 'Heiligabend zusammen', s => Object.values(s.advent?.open || {}).filter(o => o.includes(24)).length >= 2],
  ['notes', '💌', '10 Zettel am Baum', s => (s.tree?.notes?.length || 0) >= 10],
];
export const treeMarks = s => TREE_MARKS.filter(m => m[3](s));
export const treePlaced = s => Object.entries(s.obj || {}).find(([, o]) => o?.k === TREE_ID)?.[0] || null;
// Nach jeder Aktion: Wer war heute da? Sind es zwei, zählt der Tag als gemeinsamer Tag.
export function treeSeen(s) {
  const T = s.tree, w = who(s);
  if (!T || T.seen[w] === s.day) return;
  T.seen[w] = s.day;
  if (T.last !== s.day && Object.values(T.seen).filter(d => d === s.day).length >= 2) { T.last = s.day; T.days++; }
}
export function tree15(s, a, out) {
  const T = treeState(s), me = who(s);
  if (a.op === 'note') {
    const t = String(a.txt || '').replace(/\s+/g, ' ').trim().slice(0, NOTE_LEN);
    if (!t) return false;
    if (T.noted[me] === s.day) { out.msg = 'Heute hängt schon ein Zettel von dir am Baum – morgen wieder.'; return false; }
    if (T.notes.length >= TREE_NOTES) { out.msg = 'Der Baum hängt voll – nehmt erst einen alten Zettel ab.'; return false; }
    T.noted[me] = s.day;
    T.notes.push({ d: s.day, w: me, n: String(a.name || 'Gast').slice(0, 16), t });
    addLove(s, 1, out);
    out.msg = '💌 Dein Zettel hängt am Erinnerungsbaum. +1 💕';
    out.snd = 'love';
    return true;
  }
  if (a.op === 'del') {
    const n = Number.isInteger(a.i) ? T.notes[a.i] : null;
    if (!n || (n.w !== me && me !== 'host')) return false;
    T.notes.splice(a.i, 1);
    return true;
  }
  return false;
}
export function migrateTree(s) {
  const T = s.tree;
  if (!T || typeof T !== 'object') { s.tree = { seen: {}, days: 0, last: 0, notes: [], noted: {} }; return; }
  T.seen = T.seen && typeof T.seen === 'object' ? T.seen : {};
  T.noted = T.noted && typeof T.noted === 'object' ? T.noted : {};
  T.days = Math.max(0, T.days | 0); T.last = T.last | 0;
  T.notes = (Array.isArray(T.notes) ? T.notes : []).filter(n => n && typeof n.t === 'string').slice(-TREE_NOTES).map(n => ({ d: n.d | 0, w: String(n.w || 'host'), n: String(n.n || '').slice(0, 16), t: n.t.slice(0, NOTE_LEN) }));
}

// ---------- Polaroid-Wand ----------
export const POLA_SLOTS = 6, POLA_MAX = 5200, POLA_CAP = 18;
const POLA_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
export const polaItem = n => 'polaroid' + n;
export const polaSlot = k => (/^polaroid[1-6]$/.test(k || '') ? +k.slice(8) : 0);
export const polaState = s => (s.pola ||= { img: {}, cap: {}, got: [] });
export function pola15(s, a, out) {
  const P = polaState(s), n = a.slot | 0;
  if (!(n >= 1 && n <= POLA_SLOTS)) return false;
  if (a.op === 'set') {
    if (typeof a.img !== 'string' || a.img.length > POLA_MAX || !POLA_RE.test(a.img)) { out.msg = 'Das Foto ließ sich nicht verkleinern.'; return false; }
    P.img[n] = a.img;
    const cap = String(a.cap || '').replace(/\s+/g, ' ').trim().slice(0, POLA_CAP).trim();
    if (cap) P.cap[n] = cap; else delete P.cap[n];
    out.msg = '🖼️ Polaroid entwickelt!';
    if (!P.got.includes(n)) { P.got.push(n); S.addInvX(s, polaItem(n), 1); out.msg += ' Das Bild liegt in deiner Tasche – zu Hause an die Wand hängen.'; }
    out.snd = 'shutter';
    out.pola15 = n;
    return true;
  }
  if (a.op === 'cap') {
    if (!P.img[n]) return false;
    const cap = String(a.cap || '').replace(/\s+/g, ' ').trim().slice(0, POLA_CAP).trim();
    if (cap) P.cap[n] = cap; else delete P.cap[n];
    return true;
  }
  return false;
}
export function migratePola(s) {
  const P = s.pola;
  if (!P || typeof P !== 'object' || !P.img || typeof P.img !== 'object') { s.pola = { img: {}, cap: {}, got: [] }; return; }
  for (const [k, v] of Object.entries(P.img)) if (!(+k >= 1 && +k <= POLA_SLOTS) || typeof v !== 'string' || v.length > POLA_MAX || !POLA_RE.test(v)) delete P.img[k];
  P.cap = P.cap && typeof P.cap === 'object' ? P.cap : {};
  for (const [k, v] of Object.entries(P.cap)) if (!P.img[k] || typeof v !== 'string') delete P.cap[k]; else P.cap[k] = v.slice(0, POLA_CAP);
  P.got = (Array.isArray(P.got) ? P.got : []).filter(n => Number.isInteger(n) && n >= 1 && n <= POLA_SLOTS);
}
