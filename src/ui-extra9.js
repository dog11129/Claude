// Fenster für Inselleben 13 „Gartenzeit“: Fleißkärtchen und Sternchen-Laden.
import { PLACE, ITEMS } from './data.js';
import { itemIcon } from './icons.js';
import * as E from './extras13.js';

const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const chip = t => `<span class="chip">${t}</span>`;
const act = a => `data-act='${JSON.stringify(a)}'`;
const row = (icon, title, sub, right = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${right}</div></div>`;
const bar = (p, n) => `<span class="pbar13"><i style="width:${Math.min(100, Math.round(p / n * 100))}%"></i></span>`;

function plus13(s, g, tab) {
  const P = s.plus || { cards: [], stars: 0 };
  if (tab === 'shop') {
    let h = hero('⭐ Sternchen-Laden', `${P.stars} Sternchen`, 'Hier gibt es den Feengarten und kleine Überraschungen – nur für Sternchen von den Fleißkärtchen.');
    h += `<div class="pgrid">${E.STAR_SHOP.map(id => { const x = E.STAR_EXTRA[id] || PLACE[id], c = E.starCost(id), have = s.inv[id] || 0;
      return `<div class="pcard${P.stars < c ? ' locked' : ''}"><div class="pc-ic">${ITEMS[id] ? itemIcon(id) : `<span style="font-size:30px">${x.icon}</span>`}</div><div class="pc-tx"><b>${x.name}</b><div class="pc-info">${x.glow ? chip('✨ leuchtet nachts') : ''}${x.sit ? chip('🪑 zum Sitzen') : ''}<small>${x.desc || ''}</small>${have ? chip(`${have}× in der Tasche`) : ''}</div></div><button class="btn small pink" ${act({ t: 'plus13', op: 'buy', id })} ${P.stars < c ? 'disabled' : ''}>⭐ ${c}</button></div>`; }).join('')}</div>`;
    return h;
  }
  const ready = P.cards.filter(c => c.done).length;
  let h = hero('⭐ Fleißkärtchen', `${P.stars} Sternchen`, `Fünf kleine Aufgaben, die nie ausgehen: Einlösen bringt Sternchen und Taler – und sofort rückt ein neues Kärtchen nach.${ready ? ` <b>${ready} ${ready === 1 ? 'Kärtchen ist' : 'Kärtchen sind'} fertig!</b>` : ''}`);
  h += P.cards.map((c, i) => { const n = E.cardNeed(c), st = E.cardStars(c);
    return row(`<span class="star13">${'⭐'.repeat(st)}</span>`, E.cardText(c), c.done ? 'Geschafft! Jetzt einlösen.' : `${bar(c.p, n)} ${Math.min(c.p, n).toLocaleString('de-DE')} / ${n.toLocaleString('de-DE')}`,
      c.done ? `<button class="btn small pink" ${act({ t: 'plus13', op: 'claim', i })}>🎁 Einlösen</button>` : `<button class="btn small white" ${act({ t: 'plus13', op: 'swap', i })} ${P.swap === s.day ? 'disabled' : ''} title="Einmal am Tag tauschen">🔄</button>`); }).join('');
  h += `<div class="note">🔄 Einmal am Tag könnt ihr ein Kärtchen tauschen. Bisher eingelöst: ${P.n || 0} Kärtchen, ${P.total || 0} Sternchen gesammelt.</div>`;
  return h;
}
export const PANELS_13 = { plus13 };
export const TITLES_13 = { plus13: '⭐ Fleißkärtchen' };
export const TABS_13 = { plus13: [['cards', '⭐ Kärtchen'], ['shop', '🧚 Sternchen-Laden']] };
export const sig13 = (s, g, open) => (open === 'plus13' || open === 'phone' ? [s.plus, s.day] : 0);
export const plusReady = s => (s.plus?.cards || []).filter(c => c.done).length;
