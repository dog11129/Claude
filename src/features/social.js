// Teil von extras5.js – Brieffreunde (Post an andere Inseln über den Verbindungsserver) und Geburtstagsparty.
import { ITEMS, NPC_IDS, NPC_DATA, BIRTHDAYS } from '../data.js';
import * as S from '../state.js';
import { who, note, fmt } from './util.js';

// ---------- Brieffreunde ----------
// Absenden: Host nimmt die Sache aus der Tasche und legt den Brief in den Postausgang; der Browser des Hosts schickt ihn ab.
export function penpal(s, a, out) {
  if (a.op === 'send') {
    const to = String(a.to || '').toUpperCase(), text = String(a.text || '').trim().slice(0, 400);
    if (!/^[A-Z0-9]{5}$/.test(to) || !text) return false;
    if (s.penpal.out.length >= 10) { out.msg = '📮 Der Postausgang ist voll – gleich geht er raus.'; return false; }
    let item = null;
    if (a.item) { if (!ITEMS[a.item] || ITEMS[a.item].gear || !(s.inv[a.item] > 0)) return false; S.takeInvX(s, a.item, 1); item = a.item; }
    s.penpal.out.push({ to, text, item, from: String(a.name || 'Gast').slice(0, 16), isle: String(s.name || 'Insel').slice(0, 24), day: s.day, id: Date.now().toString(36) + Math.floor(Math.random() * 999) });
    out.msg = `📮 Brief an Insel ${to} liegt im Postausgang!`;
    out.snd = 'plopp';
    return true;
  }
  if (a.op === 'sent') { s.penpal.out = s.penpal.out.filter(l => !(a.ids || []).includes(l.id)); return true; }
  if (a.op === 'failed') { const l = s.penpal.out.find(x => x.id === a.id); if (!l) return false; s.penpal.out = s.penpal.out.filter(x => x !== l); if (l.item && ITEMS[l.item]) note(s, '📮 Brief kam zurück', `Die Insel ${l.to} gibt es (noch) nicht. Dein Brief kommt zurück${l.item ? ' – samt Geschenk' : ''}.`, l.item, 1); return true; }
  if (a.op === 'receive') {
    const list = Array.isArray(a.letters) ? a.letters.slice(0, 20) : [];
    let n = 0;
    for (const l of list) {
      if (!l || typeof l.text !== 'string' || s.penpal.got.includes(l.id)) continue;
      s.penpal.got = [...s.penpal.got, String(l.id)].slice(-80);
      const item = ITEMS[l.item] && !ITEMS[l.item].gear ? l.item : null;
      note(s, `📮 Post von der Insel ${String(l.isle || '').slice(0, 24)}`, `${String(l.text).slice(0, 400)}\n\n– ${String(l.from || 'Unbekannt').slice(0, 16)} (Insel-Code ${String(l.fromCode || '?').slice(0, 5)})`, item, 1, 'post');
      n++;
    }
    if (n) { out.msg = `📮 ${n} Brief${n > 1 ? 'e' : ''} von anderen Inseln im Briefkasten!`; out.snd = 'love'; }
    return n > 0;
  }
  return false;
}

// ---------- Geburtstagsparty für einen Nachbarn ----------
const dayOfBirthday = (s, id) => { const [sea, d] = BIRTHDAYS[id], idx = ['spring', 'summer', 'autumn', 'winter'].indexOf(sea); const year = Math.floor((s.day - 1) / 28); for (const y of [year, year + 1]) { const day = y * 28 + idx * 7 + d; if (day >= s.day) return day; } return null; };
export const nextBirthday = s => NPC_IDS.filter(id => BIRTHDAYS[id]).map(id => [id, dayOfBirthday(s, id)]).filter(x => x[1]).sort((a, b) => a[1] - b[1])[0] || null;
export const CAKES = ['beerenkuchen', 'apfelkuchen', 'kirschtorte', 'sternentorte', 'torte'];
export function party(s, a, out) {
  const nb = nextBirthday(s);
  if (!nb) return false;
  const [id, day] = nb, P = s.party.id === id && s.party.day === day ? s.party : (s.party = { id, day, deco: 0, cake: null, guests: [], done: 0 });
  if (day - s.day > 7) { out.msg = 'Die Party plant man in der Woche vor dem Geburtstag.'; return false; }
  if (a.op === 'deco') { if (P.deco) return false; if (!(s.inv.partydeko > 0)) { out.msg = '🎊 Partydeko gibt es im Krämerladen (Handy ➜ Party).'; return false; } S.takeInvX(s, 'partydeko', 1); P.deco = 1; out.msg = '🎊 Girlanden und Luftballons sind bereit!'; out.snd = 'plopp'; return true; }
  if (a.op === 'cake') { if (P.cake) return false; const c = CAKES.find(k => s.inv[k] > 0); if (!c) { out.msg = '🎂 Backt in der Gartenküche einen Kuchen (z. B. Apfelkuchen).'; return false; } S.takeInvX(s, c, 1); P.cake = c; out.msg = `🎂 ${ITEMS[c].name} ist versteckt!`; out.snd = 'plopp'; return true; }
  if (a.op === 'guests') { const g = (a.guests || []).filter(x => NPC_IDS.includes(x) && x !== id).slice(0, 3); if (g.length < 1) return false; P.guests = [...new Set(g)]; out.msg = `💌 Eingeladen: ${P.guests.map(x => NPC_DATA[x]?.name).join(', ')} – psst, nichts verraten!`; out.snd = 'plopp'; return true; }
  if (a.op === 'start') {
    if (s.day !== day || P.done) { out.msg = s.day !== day ? 'Die Überraschung gibt es am Geburtstag!' : ''; return false; }
    if (!P.deco || !P.cake || !P.guests.length) { out.msg = 'Es fehlt noch etwas: Deko, Kuchen und Gäste.'; return false; }
    P.done = s.day;
    S.friendX(s, id).f += 150;
    for (const g of P.guests) S.friendX(s, g).f += 30;
    s.money += 2000; s.stats.earned += 2000;
    (s.diary ||= []).push({ day: s.day, icon: '🎉', text: `Überraschungsparty für ${NPC_DATA[id]?.name}!` });
    note(s, `🎉 Danke für die Party!`, `Ihr Lieben,\nich bin immer noch ganz gerührt – Deko, ${ITEMS[P.cake].name} und meine Freunde! Das war mein schönster Geburtstag. Hier ist ein kleines Dankeschön.\n\nEure/euer ${NPC_DATA[id]?.name} ${NPC_DATA[id]?.icon || ''}`, 'herzballon', 1, id);
    out.msg = `🎉 ÜBERRASCHUNG! ${NPC_DATA[id]?.name} ist zu Tränen gerührt – alle singen ein Ständchen. +${fmt(2000)} Taler`;
    out.snd = 'fanfare';
    return true;
  }
  return false;
}
