// Fenster für Inselleben 11 „Für zwei“: Greifautomat mit Kuscheltier-Sammlung.
import { KUSCHEL } from './furni-data2.js';
import { itemIcon } from './icons.js';
import * as E from './extras11.js';

const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const chip = t => `<span class="chip">${t}</span>`;
const card = (icon, name, info, o = {}) => `<div class="pcard${o.have ? ' have' : ''}${o.locked ? ' locked' : ''}"><div class="pc-ic">${icon}</div><div class="pc-tx"><b>${name}</b><div class="pc-info">${info}</div></div></div>`;

function claw11(s) {
  const C = s.claw11 || { n: 0, won: {} }, got = Object.keys(C.won).filter(k => C.won[k] > 0).length;
  let h = hero('🕹️ Greifautomat', 'Kuschel-Greifer', 'Der Greifer pendelt hin und her – im richtigen Moment antippen, dann greift er zu und bringt das Kuscheltier zur Klappe. Je genauer, desto fester hält er. Der goldene Teddy ist ganz selten!');
  h += `<button class="big" data-ui="h:claw" ${s.money < E.CLAW_PRICE ? 'disabled' : ''}><span class="i">🕹️</span><span>Spielen<small>${E.CLAW_PRICE} Taler pro Versuch · ihr habt 🪙 ${s.money.toLocaleString('de-DE')}</small></span></button>`;
  h += `<h3>🧸 Eure Sammlung (${got}/${E.KUSCHEL_IDS.length})</h3>`;
  h += `<div class="pgrid">${Object.entries(KUSCHEL).map(([id, [name]]) => card(C.won[id] ? itemIcon(id) : '<span style="font-size:26px;filter:grayscale(1) opacity(.35)">❔</span>', C.won[id] ? name : '???', C.won[id] ? chip(`${C.won[id]}× gewonnen`) : chip('noch nicht gefangen'), { have: !!C.won[id], locked: !C.won[id] })).join('')}</div>`;
  h += `<div class="note">🎁 Kuscheltiere kann man aufstellen oder dem Schatz schenken (2 Herzpunkte). ${C.n ? `Bisher ${C.n} Versuch${C.n === 1 ? '' : 'e'}.` : ''}</div>`;
  return h;
}
export const PANELS_11 = { claw11 };
export const TITLES_11 = { claw11: '🕹️ Greifautomat' };
export const sig11 = (s, g, open) => (open === 'claw11' ? [s.claw11, s.money] : open === 'herz' ? [s.couple, s.dinner11] : 0);
