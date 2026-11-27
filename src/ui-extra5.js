// Fenster für Inselleben 8: Inselkapelle (Hochzeit), Duell der Woche & Surf-Rekorde (Handy), Mondschaf Luna (Traum-Tausch).
// Knöpfe mit ui: 'g:…' landen in src/client/fun6.js, Aktionen (t: …) gehen an den Host.
import { ITEMS } from './data.js';
import { itemIcon } from './icons.js';
import * as E from './extras8.js';

const big = (icon, label, sub, data, cls = '', dis = false) => `<button class="big ${cls}" data-act='${JSON.stringify(data)}'${dis ? ' disabled' : ''}><span class="i">${icon}</span><span>${label}<small>${sub}</small></span></button>`;
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const myUid = (s, g) => E.personOf(s, g.players?.[g.me]?.key || 'host');

export const TITLES_8 = { wedding: '💒 Inselkapelle', duel: '🏆 Duell der Woche', dreamshop: '🐑 Mondschaf Luna' };
export const APPS_8 = [['duel', '🏆', 'Duell', '#ffe3a8']];
export const APP_PANELS_8 = { duel: ['duel'] };
export const sig8 = (s, g, open) => [s.duel, s.surf, s.wedding && [s.wedding.t0, s.wedding.done, Object.keys(s.wedding.yes || {})], s.married, s.dream, open === 'duel' ? s.day : 0];

export const PANELS_8 = {
  wedding(s, g) {
    const c = E.chapels(s)[0], M = s.married, n = Object.keys(g.players || {}).length;
    if (!c) return hero('🦌 Rosi', 'Die Inselkapelle', 'Die Kapelle könnt ihr im Rathaus als Inselprojekt bauen lassen.');
    let h = M ? hero('🦔 Mira', `💍 ${esc(M.names.join(' & '))}`, `Verheiratet seit Tag ${M.day}${M.iso ? ` (${new Date(M.iso).toLocaleDateString('de-DE')})` : ''}${M.renew ? ` · ${M.renew}× Gelübde erneuert` : ''}. Euer Hochzeitstag steht im Kalender – dann gibt es abends ein Feuerwerk!`)
      : hero('🦔 Mira', 'Eine Hochzeit auf der Insel?', 'Wenn ihr beide da seid, lade ich alle Nachbarn ein: Sie setzen sich vor die Kapelle, ich halte eine kleine Rede – und dann fragt euch die ganze Insel … Danach gibt es Ringe, einen Kuss, Feuerwerk und ein Foto fürs Fotobuch. 💕');
    if (s.wedding) return h + `<div class="note">💐 Die Feier läuft schon – geht vor die Kapelle!</div>` + (s.wedding.done ? '' : btn('Abbrechen', { t: 'wed', op: 'cancel' }, 'white'));
    h += big(M ? '💐' : '💍', M ? 'Gelübde erneuern' : 'Hochzeit feiern', n < 2 ? 'Dafür müsst ihr zu zweit auf der Insel sein' : 'Alle Nachbarn kommen – stellt euch vor die Kapelle', { ui: 'g:wedstart', x: c[0], z: c[1] }, 'pink', n < 2);
    if (M) h += `<div class="note">🎀 Den Brautschleier findet ihr unter ⚙️ → Aussehen ändern → Hüte.</div>`;
    return h;
  },
  duel(s, g) {
    const D = s.duel || { sc: {}, names: {}, wins: {}, hist: [] }, [, icon, title] = E.catOf(D.wk ?? E.weekOf(s.day)), me = myUid(s, g), left = E.daysLeft(s);
    const name = u => esc(D.names[u] || (u === me ? 'Du' : 'Jemand'));
    let h = hero('🦉 Wanda', `${icon} Diese Woche: ${title}`, `Wer bis Sonntagabend mehr schafft, bekommt den 🏆 Duell-Pokal und ${fmt(E.DUEL_PRIZE)} Taler für die Inselkasse. Noch ${left} ${left === 1 ? 'Tag' : 'Tage'}!`);
    const people = [...new Set([...Object.keys(D.names), ...Object.keys(D.sc)])], top = Math.max(1, ...Object.values(D.sc));
    h += people.length ? people.sort((a, b) => (D.sc[b] || 0) - (D.sc[a] || 0)).map(u => `<div class="row"><div class="ic">${u === me ? '⭐' : '💕'}</div><div class="tx"><b>${name(u)} · ${D.sc[u] || 0}</b><div class="bar"><i style="width:${Math.round((D.sc[u] || 0) / top * 100)}%"></i></div><small>${D.wins[u] || 0}× Pokal gewonnen</small></div></div>`).join('')
      : '<div class="note">Noch hat niemand etwas geschafft – los geht’s!</div>';
    if (D.hist?.length) h += `<h3>Letzte Wochen</h3>` + D.hist.slice(0, 4).map(x => { const c = E.DUEL_CATS.find(q => q[0] === x.c) || ['', '🏆', '']; return row(c[1], x.tie ? '🤝 Unentschieden' : `🏆 ${name(x.win)}`, Object.entries(x.sc || {}).map(([u, v]) => `${name(u)} ${v}`).join(' : ')); }).join('');
    const S8 = s.surf || {};
    h += `<h3>🏄 Surf-Rekorde</h3>`;
    h += S8.rec ? row('🏆', `Inselrekord: ${fmt(S8.rec.n)} Punkte`, `von ${esc(S8.rec.name)} · Tag ${S8.rec.day}`) : '<div class="note">Noch niemand ist gesurft. Brett in die Hand, am Strand aufs Meer schauen und ✋!</div>';
    h += Object.entries(S8.best || {}).map(([u, v]) => row(u === me ? '⭐' : '🏄', `${esc(S8.names?.[u] || 'Jemand')}: ${fmt(v)}`, 'persönliche Bestleistung')).join('');
    if ((s.inv?.surfbrett || 0) > 0) h += big('🏄', 'Jetzt surfen', '60 Sekunden auf der Welle – halten, loslassen, springen!', { ui: 'g:surf' }, 'pink');
    return h;
  },
  dreamshop(s) {
    const have = s.inv?.traumstern || 0, D = s.dream?.day === s.day ? s.dream : null;
    let h = hero('🐑 Luna', 'Mäh … schön, dass du träumst!', `Bring mir Traumsterne 🌠 – jede Nacht glitzern neue auf den Wolkeninseln (heute: ${D ? Object.keys(D.got).length : 0}/${E.STAR_N}). Dafür gebe ich dir Dinge, die es nur im Traum gibt.`);
    h += `<div class="note">🌠 Du hast <b>${have}</b> Traumsterne.</div>`;
    h += E.DREAM_SHOP.map(([id, n]) => row(itemIcon(id), ITEMS[id]?.name || id, `${n} 🌠 · ${(s.inv?.[id] || 0) ? `schon ${s.inv[id]}× in der Tasche` : 'nur im Traum'}`, btn(`${n} 🌠`, { t: 'dream', op: 'buy', id }, 'pink', have < n))).join('');
    return h;
  },
};
