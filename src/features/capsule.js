// Teil von extras4.js – Zeitkapsel: Brief und Sachen vergraben, nach 7 oder 30 Spieltagen wieder ausgraben.
import { ITEMS } from '../data.js';
import * as S from '../state.js';
import { who, note } from './util.js';

export const CAPSULE_MAX = 6;
export const CAPSULE_DAYS = [7, 30];
export const capsuleAt = (s, k) => (s.capsules || []).find(c => c.k === k && !c.opened) || null;
export function capsule(s, a, out) {
  if (a.op === 'bury') {
    const k = `${a.x},${a.z}`;
    if (!Number.isInteger(a.x) || !Number.isInteger(a.z) || !CAPSULE_DAYS.includes(a.days)) return false;
    if (s.capsules.filter(c => !c.opened).length >= CAPSULE_MAX) { out.msg = `⏳ Höchstens ${CAPSULE_MAX} Zeitkapseln auf einmal.`; return false; }
    if (!S.canPlace(s, a.x, a.z) || capsuleAt(s, k)) { out.msg = '⏳ Hier kann man nichts vergraben – such dir ein freies Stück Rasen.'; return false; }
    const items = Object.entries(a.items && typeof a.items === 'object' ? a.items : {}).filter(([id, n]) => ITEMS[id] && Number.isInteger(n) && n > 0 && !ITEMS[id].gear).slice(0, 3);
    if (items.some(([id, n]) => (s.inv[id] || 0) < n)) return false;
    for (const [id, n] of items) S.takeInvX(s, id, n);
    s.capsules.push({ k, by: String(a.name || 'Gast').slice(0, 16), who: who(s), day: s.day, open: s.day + a.days, items: Object.fromEntries(items), text: String(a.text || '').slice(0, 300) });
    out.msg = `⏳ Vergraben! In ${a.days} Tagen könnt ihr die Zeitkapsel mit der Schaufel wieder ausgraben.`;
    out.fx.push({ x: a.x, z: a.z, txt: '⏳', k: 'dust' });
    out.snd = 'till';
    return true;
  }
  if (a.op === 'open') {
    const c = capsuleAt(s, `${a.x},${a.z}`);
    if (!c || s.day < c.open) return false;
    c.opened = s.day;
    for (const [id, n] of Object.entries(c.items)) if (ITEMS[id]) S.addInvX(s, id, n);
    note(s, `⏳ Zeitkapsel von Tag ${c.day}`, `${c.text || '(ohne Brief)'}\n\n– ${c.by}, vor ${s.day - c.day} Tagen`, null, 1, 'rosi');
    (s.diary ||= []).push({ day: s.day, icon: '⏳', text: `Die Zeitkapsel von Tag ${c.day} ausgegraben!` });
    out.msg = `⏳ Die Zeitkapsel ist offen! ${Object.keys(c.items).length ? 'Die Sachen sind in deiner Tasche, ' : ''}der Brief liegt im Briefkasten.`;
    out.fx.push({ x: a.x, z: a.z, txt: '✨⏳✨', k: 'dust' });
    out.snd = 'fanfare';
    s.capsules = s.capsules.filter(x => !x.opened || s.day - x.opened < 2);
    return true;
  }
  return false;
}
