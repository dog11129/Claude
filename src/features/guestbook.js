// Teil von extras4.js – Gästebuch (Deko): Einträge mit Stempel und kleiner 8×8-Zeichnung.
import { NPC_IDS, NPC_DATA } from '../data.js';
import { who } from './util.js';

export const GB_MAX = 60;
export const GB_STAMPS = ['🌸', '⭐', '🐚', '🍀', '🌈', '🐾', '💌', '🎈'];
const NPC_LINES = ['Schöne Insel! Ich komme bald wieder.', 'Danke für den gemütlichen Tag!', 'Die Blumen hier duften herrlich.', 'Ich habe heute drei Muscheln gefunden!', 'Liebe Grüße aus meinem Haus nebenan.', 'Wer hat die schönen Laternen aufgestellt?'];
export const hasGuestbook = s => Object.values(s.obj || {}).some(o => o?.k === 'gaestebuch');
export function guestbook(s, a, out) {
  if (a.op !== 'sign' || !hasGuestbook(s)) return false;
  const text = String(a.text || '').trim().slice(0, 80), st = GB_STAMPS.includes(a.st) ? a.st : GB_STAMPS[0], px = typeof a.px === 'string' && /^[01]{64}$/.test(a.px) ? a.px : '';
  if (!text && !px.includes('1')) return false;
  const me = who(s), G = s.guestbook;
  if (G.some(e => e.who === me && e.day === s.day)) { out.msg = '📖 Du hast heute schon unterschrieben.'; return false; }
  G.unshift({ who: me, name: String(a.name || 'Gast').slice(0, 16), text, st, px, day: s.day });
  s.guestbook = G.slice(0, GB_MAX);
  out.msg = '📖 Danke für deinen Eintrag!';
  out.snd = 'plopp';
  return true;
}
// Morgens schreibt manchmal ein Nachbar etwas hinein
export function guestbookMorning(s) {
  if (!hasGuestbook(s) || Math.random() > 0.35) return;
  const id = NPC_IDS[Math.floor(Math.random() * NPC_IDS.length)];
  s.guestbook.unshift({ who: 'npc:' + id, name: `${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id}`, text: NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)], st: GB_STAMPS[Math.floor(Math.random() * GB_STAMPS.length)], px: '', day: s.day });
  s.guestbook = s.guestbook.slice(0, GB_MAX);
}
