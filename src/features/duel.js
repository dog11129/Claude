// Teil von extras8.js – 🏆 Duell der Woche: ein kleiner Wettstreit zu zweit. Jede Woche eine andere Disziplin,
// gezählt wird über die Insel-Statistik (wer was getan hat, weiß die Aktion). Wer vorne liegt, bekommt am Wochenende den Pokal.
import { note } from './util.js';

export const DUEL_CATS = [
  ['fish', '🎣', 'Fische fangen'], ['bugs', '🦋', 'Krabbeltiere fangen'], ['fruit', '🍎', 'Obst sammeln'], ['shells', '🐚', 'Muscheln sammeln'],
  ['wood', '🪵', 'Holz hacken'], ['dug', '✨', 'Ausgraben'], ['harvested', '🌷', 'Blumen & Gemüse ernten'],
];
export const DUEL_PRIZE = 3000;
export const weekOf = day => Math.floor((Math.max(1, day) - 1) / 7);
export const catOf = wk => DUEL_CATS[((wk % DUEL_CATS.length) + DUEL_CATS.length) % DUEL_CATS.length];
export const daysLeft = s => 7 - ((Math.max(1, s.day) - 1) % 7);
// Wer ist das? Gastgeber = Besitzer der Insel (s.owner), Gäste = ihre Geräte-ID (u_…)
export const personOf = (s, key) => (key === 'host' ? s.owner || 'host' : String(key || '').replace(/^u_/, ''));
const bagOf = (s, uid) => (uid === (s.owner || 'host') ? 'host' : /^[a-z0-9]{6,16}$/.test(uid) ? 'u_' + uid : /^n_\S{1,16}$/.test(uid) ? uid : null);
const ok = v => v && typeof v === 'object' && !Array.isArray(v);

export function migrateDuel(s) {
  const D = ok(s.duel) ? s.duel : {};
  s.duel = { wk: Number.isInteger(D.wk) ? D.wk : weekOf(s.day), sc: ok(D.sc) ? D.sc : {}, names: ok(D.names) ? D.names : {}, wins: ok(D.wins) ? D.wins : {}, hist: Array.isArray(D.hist) ? D.hist.slice(0, 8) : [] };
}
// Vor und nach jeder Aktion: was hat sich in der Disziplin dieser Woche getan?
export const duelStat = s => (s.duel ? s.stats?.[catOf(s.duel.wk)[0]] || 0 : 0);
export function duelCount(s, key, before, out) {
  const D = s.duel, add = duelStat(s) - before;
  if (!D || !(add > 0) || add > 50) return;
  const me = personOf(s, key), lead = Object.entries(D.sc).filter(([k]) => k !== me).reduce((m, [, v]) => Math.max(m, v), 0), was = D.sc[me] || 0;
  D.sc[me] = was + add;
  if (Object.keys(D.names).length > 1 && was <= lead && D.sc[me] > lead && out) out.duel = `🏆 Du führst im Duell der Woche! (${catOf(D.wk)[1]} ${D.sc[me]} : ${lead})`;
}
// Namen merkt sich der Gastgeber, sobald jemand mitspielt
export function duelName(s, key, name) {
  const D = s.duel, uid = personOf(s, key), n = String(name || '').trim().slice(0, 16);
  if (!D || !n || D.names[uid] === n) return false;
  D.names[uid] = n;
  return true;
}
// Montagmorgen: Sieger küren, Pokal verschicken, neue Disziplin
export function duelMorning(s) {
  if (!s.duel) migrateDuel(s);
  const D = s.duel, wk = weekOf(s.day);
  if (D.wk === wk) return;
  const ranked = Object.entries(D.sc).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), [c, icon, title] = catOf(D.wk);
  if (ranked.length) {
    const tie = ranked.length > 1 && ranked[0][1] === ranked[1][1], win = tie ? null : ranked[0][0], name = uid => D.names[uid] || 'Jemand';
    const score = ranked.map(([u, v]) => `${name(u)} ${v}`).join(' : ');
    D.hist.unshift({ wk: D.wk, c, sc: { ...D.sc }, win, tie });
    D.hist = D.hist.slice(0, 8);
    if (win && ranked.length > 1) {
      D.wins[win] = (D.wins[win] || 0) + 1;
      const bag = bagOf(s, win);
      if (bag) { const inv = (s.pinv ||= {})[bag] ||= {}; inv.duellpokal = (inv.duellpokal || 0) + 1; }
      s.money += DUEL_PRIZE;
      (s.diary ||= []).push({ day: s.day, icon: '🏆', text: `${name(win)} gewinnt das Duell der Woche (${icon} ${score})` });
      note(s, `🏆 ${name(win)} gewinnt das Duell!`, `Die Disziplin war „${title}“ – Ergebnis ${score}.\n\nDer Pokal steht schon in ${name(win)}s Tasche, und ${DUEL_PRIZE.toLocaleString('de-DE')} Taler gehen in die Inselkasse. Neue Woche, neues Glück! 💪`, null, 1, 'wanda');
    } else if (tie) (s.diary ||= []).push({ day: s.day, icon: '🤝', text: `Unentschieden im Duell der Woche (${icon} ${score})` });
  }
  D.wk = wk;
  D.sc = {};
}
