// Fenster für Inselleben 9: die Gebiets-Bewohner Eule Oskar (Kiefernwald), Hummel Hilde (Blütenwiese) und
// Maulwurf Grubi (Kristallhöhle) tauschen Fundstücke gegen Dinge, die es nur bei ihnen gibt.
import { ITEMS } from './data.js';
import { itemIcon } from './icons.js';
import * as E from './extras9.js';

const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const AREA_NAME = { wald: 'Kiefernwald', wiese: 'Blütenwiese', hoehle: 'Kristallhöhle' };

function trader(s, g, id) {
  const C = E.CREATURES[id], key = g.players?.[g.me]?.key || 'host', ev = s.area9?.day === s.day ? s.area9.ev || {} : {};
  let h = hero(`${C.icon} ${C.name}`, AREA_NAME[id], C.hello);
  // Heute im Gebiet
  const left = E.findsToday(id, s.day).filter(f => E.findVisible(s, id, f));
  const count = {}; for (const f of left) count[f.id] = (count[f.id] || 0) + 1;
  const evs = id === 'wald' ? [E.stagToday(s) && `🦌 Weißer Hirsch: morgens 6–9:30 Uhr auf der Lichtung${ev['stag:' + key] ? ' ✔' : ''}`, E.ringToday(s) && `🍄 Pilzkreis: heute ab 19 Uhr${ev['ring:' + key] ? ' ✔' : ''}`]
    : id === 'wiese' ? [E.swarmToday(s) && `🦋 Schmetterlingstanz: 10–16 Uhr bei Sonne (${ev['swarm:' + key] || 0}/${E.SWARM_MAX} Goldstaub)`]
      : [`🎵 Kristallklang: am Klangstein anhören, Kristalle nachspielen${ev['chime:' + key] ? ' ✔ (heute gelöst)' : ''}`];
  h += `<div class="note">🔍 Heute noch zu finden: ${Object.keys(count).length ? Object.entries(count).map(([k, n]) => `${ITEMS[k].icon} ${n}× ${ITEMS[k].name}`).join(' · ') : 'alles gefunden – morgen liegt Neues da!'}${evs.filter(Boolean).length ? '<br>' + evs.filter(Boolean).join('<br>') : ''}</div>`;
  h += '<h3>Tauschen</h3>';
  h += E.TRADES[id].map(([out, need]) => {
    const ok = Object.entries(need).every(([k, n]) => (s.inv?.[k] || 0) >= n);
    const cost = Object.entries(need).map(([k, n]) => `${ITEMS[k]?.icon || ''} ${s.inv?.[k] || 0}/${n} ${ITEMS[k]?.name || k}`).join(' · ');
    return row(itemIcon(out), ITEMS[out]?.name || out, `${cost}${s.area9?.done?.[out] ? ` · schon ${s.area9.done[out]}× getauscht` : ' · gibt es nur hier'}`, btn('Tauschen', { t: 'area9', op: 'trade', area: id, id: out }, 'pink', !ok));
  }).join('');
  if (id === 'hoehle') h += '<h3>Geoden knacken</h3>' + row(itemIcon('geode'), `Geode knacken (du hast ${s.inv?.geode || 0})`, 'Drin sind Edelsteine – mit etwas Glück sogar eine Kristallblume', btn('Knack!', { t: 'area9', op: 'crack' }, '', !(s.inv?.geode > 0)));
  return h;
}
export const TITLES_9 = { oskar: '🦉 Eule Oskar', hilde: '🐝 Hummel Hilde', grubi: '⛏️ Maulwurf Grubi' };
export const PANELS_9 = { oskar: (s, g) => trader(s, g, 'wald'), hilde: (s, g) => trader(s, g, 'wiese'), grubi: (s, g) => trader(s, g, 'hoehle') };
export const sig9 = (s, g, open) => (E.PANEL_AREA[open] ? [s.area9, Math.floor(s.dayTime * 36)] : 0);
