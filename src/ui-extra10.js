// Fenster für Inselleben 14 „Lieblingsplätze“: Liebesschlösser, Hase, Schneemann, Saisonkatalog, Lieferdienst, Salon,
// Hausfassade und Outfit-Speicherplätze.
import { PLACE, ITEMS, SEASONS, SEASON_IDS, NPC_DATA } from './data.js';
import { FURNITURE } from './furni-data.js';
import { itemIcon } from './icons.js';
import * as S from './state.js';
import * as X from './extras.js';
import * as E from './extras14.js';
import { outfits, outfitLabel, OUTFIT_SLOTS } from './client/fun10.js';
import { jewelTab } from './ui-extra11.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const chip = t => `<span class="chip">${t}</span>`;
const act = a => `data-act='${JSON.stringify(a)}'`;
const btn = (label, a, cls = 'pink', dis = false) => `<button class="btn small ${cls}" ${act(a)} ${dis ? 'disabled' : ''}>${label}</button>`;
const ubtn = (label, ui, data = {}, cls = 'pink', dis = false) => `<button class="btn small ${cls}" data-ui="x:${ui}" ${Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(' ')} ${dis ? 'disabled' : ''}>${label}</button>`;
const row = (icon, title, sub, right = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${right}</div></div>`;
const hex = c => '#' + c.toString(16).padStart(6, '0');
const dot = (c, on) => `<span class="dot14${on ? ' on' : ''}" style="background:${typeof c === 'number' ? hex(c) : c}"></span>`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const picon = id => NPC_DATA[id]?.icon || X.VISITORS[id]?.icon || '🙂';
const myKey = g => g.players?.[g.me]?.key || 'host';

function lock14(s, g) {
  const L = s.locks || [], ini = Object.values(g.players || {}).map(p => (p.name || '?').trim()[0]?.toUpperCase() || '?'), def = ini.length > 1 ? ini.slice(0, 2).join('+') : (ini[0] || '') + '♥';
  let h = hero('🔒 Liebesschlösser', `${L.length} von ${E.LOCK_MAX} Schlössern`, 'Hängt ein Schloss mit euren Anfangsbuchstaben ans Brückengeländer – eins am Tag, und es bleibt für immer. Jedes Schloss bringt 4 Herzpunkte.');
  h += row('✏️', 'Aufschrift', 'bis zu 7 Zeichen, zum Beispiel S+A', `<input id="locktxt" class="tin14" maxlength="7" value="${esc(def)}">`);
  h += `<h3>Farbe antippen – klick, und es hängt (${E.LOCK_COST} Taler)</h3><div class="swrow14">${E.LOCK_COLORS.map(([n, c], i) => `<button class="lock14" data-ui="x:lock" data-c="${i}" title="${n}" style="background:${hex(c)}">🔒</button>`).join('')}</div>`;
  if (L.length) h += `<h3>An der Brücke</h3><div class="swrow14">${L.slice().reverse().map(l => `<span class="lchip14" style="border-color:${hex(E.LOCK_COLORS[l.c][1])}">🔒 ${esc(l.t || '♥')} <small>Tag ${l.day}</small></span>`).join('')}</div>`;
  return h;
}

function pet14(s, g) {
  const P = s.pet14;
  if (!P?.in) return '<div class="note">🐇 Hier hoppelt noch niemand herum.</div>';
  const me = myKey(g), done = P.pet?.day === s.day && P.pet.who?.[me], mine = P.follow === me;
  let h = hero(`🐇 ${esc(E.rabbitName(s))}`, `wohnt seit Tag ${P.in} bei euch`, 'Er hoppelt vor eurem Haus herum, lässt sich jeden Tag streicheln – und kommt gern mit auf einen Spaziergang über die Insel.');
  h += row('💗', 'Streicheln', done ? 'Heute schon gestreichelt – er döst zufrieden.' : 'Ein Herzpunkt für euch, und manchmal bringt er etwas mit.', btn('💗 Streicheln', { t: 'pet14', op: 'pet' }, 'pink', !!done));
  h += row('🐾', 'Spaziergang', P.follow ? (mine ? 'Er hoppelt dir gerade hinterher.' : 'Er ist gerade mit jemand anderem unterwegs.') : 'Er bleibt beim Haus.', btn(mine ? '🏡 Bleib hier' : '🐾 Komm mit!', { t: 'pet14', op: 'follow', on: !mine }, 'white'));
  h += `<h3>🎀 Schleife</h3><div class="swrow14">${E.RABBIT_BOWS.map(([n, c], i) => `<button class="btn small ${(P.bow | 0) === i ? 'pink' : 'white'}" ${act({ t: 'pet14', op: 'bow', i })}>${i ? dot(c) : '🚫'} ${n}</button>`).join('')}</div>`;
  h += row('✏️', 'Name', 'bis zu 12 Zeichen', `<input id="petname" class="tin14" maxlength="12" value="${esc(E.rabbitName(s))}"> ${ubtn('Speichern', 'petname', {}, 'white')}`);
  return h;
}

function snow14(s, g) {
  const k = g.uiAt, m = s.snowmen?.[k];
  if (!m) return '<div class="note">Der Schneemann ist geschmolzen … ☀️</div>';
  const [x, z] = k.split(',').map(Number), n = Object.keys(m.deco || {}).length;
  let h = hero('⛄ Schneemann', `von ${esc(m.name)} · ${m.lv}/${E.SNOW_MAX} Kugeln`, m.lv < E.SNOW_MAX ? 'Rollt an anderen Schneehaufen eine Kugel und setzt sie hier obendrauf.' : n < 5 ? 'Fertig gebaut! Jetzt fehlt noch der Schmuck.' : `Ein Prachtkerl!${m.stars ? ' Beste Bewertung: ' + '⭐'.repeat(m.stars) : ''}`);
  if (m.lv >= E.SNOW_MAX) h += Object.entries(E.SNOW_PARTS).map(([p, [item, ic, name]]) => row(ic, name, m.deco[p] ? 'Sitzt!' : `braucht 1× ${ITEMS[item].icon} ${ITEMS[item].name} (ihr habt ${s.inv[item] || 0})`, m.deco[p] ? chip('✔') : btn('Anbringen', { t: 'snow14', op: 'deco', x, z, part: p }, 'pink', !(s.inv[item] > 0)))).join('');
  h += row('⭐', 'Was sagen die Nachbarn?', m.rate === s.day ? 'Heute schon bewertet – morgen wieder.' : 'Drei Nachbarn schauen vorbei und vergeben Sterne (bis zu 200 Taler).', btn('⭐ Nachbarn fragen', { t: 'rate14', kind: 'snow', k }, 'pink', m.rate === s.day));
  h += `<div class="pattools">${btn('☀️ Abbauen', { t: 'snow14', op: 'melt', x, z }, 'white')}</div>`;
  return h;
}

function scat14(s) {
  const sea = S.seasonOf(s.day), next = SEASON_IDS[(SEASON_IDS.indexOf(sea) + 1) % 4], left = E.scatLeft(s);
  const card = (id, on) => { const I = E.scatInfo(id), c = E.scatPrice(id), have = s.inv[id] || 0;
    return `<div class="pcard${on && s.money >= c ? '' : ' locked'}"><div class="pc-ic">${itemIcon(id)}</div><div class="pc-tx"><b>${I.name}</b><div class="pc-info">${I.glow ? chip('✨ leuchtet') : ''}${I.sit ? chip('🪑 zum Sitzen') : ''}${chip(PLACE[id] ? '🌳 für draußen' : '🏠 für drinnen')}${have ? chip(`${have}× in der Tasche`) : ''}</div></div>${on ? btn(`🪙 ${fmt(c)}`, { t: 'scat14', id }, 'pink', s.money < c) : `<small>🪙 ${fmt(c)}</small>`}</div>`; };
  let h = hero(`${SEASONS[sea][1]} Saisonkatalog`, `${SEASONS[sea][0]} · noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`, 'Zehn Sachen, die es nur in dieser Jahreszeit gibt. Was ihr jetzt nicht bestellt, kommt erst im nächsten Jahr wieder.');
  h += `<div class="pgrid">${E.SCAT[sea].map(id => card(id, true)).join('')}</div>`;
  h += `<h3>${SEASONS[next][1]} Vorschau: ${SEASONS[next][0]}</h3><div class="pgrid">${E.SCAT[next].map(id => card(id, false)).join('')}</div>`;
  return h;
}

function deliv14(s) {
  const L = s.deliv?.list || [];
  let h = hero('📦 Lieferdienst', `${L.length} ${L.length === 1 ? 'Bestellung' : 'Bestellungen'} offen`, 'Die Nachbarn bestellen bei euch – bringt es persönlich vorbei (ansprechen ➜ 📦). Wer noch am selben Tag liefert, bekommt ein dickes Trinkgeld.');
  if (!L.length) return h + '<div class="note">Gerade wünscht sich niemand etwas. Morgen früh kommen neue Bestellungen.</div>';
  h += L.map(d => { const I = ITEMS[d.item], have = s.inv[d.item] || 0, fast = d.day === s.day;
    return row(picon(d.id), `${esc(X.pname(d.id))} wünscht sich ${d.n}× ${I.icon} ${I.name}`, `${d.due === s.day ? '⏰ bis heute Abend' : 'bis morgen Abend'} · ${fmt(d.pay)} Taler + ${fmt(Math.round(d.pay * (fast ? 0.4 : 0.15) / 10) * 10)} Trinkgeld${fast ? ' (Eil-Bonus)' : ''}`, chip(have >= d.n ? '✔ dabei' : `${have}/${d.n}`)); }).join('');
  h += `<div class="note">Bisher ausgeliefert: ${s.stats?.deliv || 0}. Jede Lieferung bringt auch Freundschaft.</div>`;
  return h;
}

function salon14(s, g, tab) {
  if (tab === 'jewel') return jewelTab(s, g); // Goldschmiede (Inselleben 15, ui-extra11.js)
  const W = s.wardrobe || {}, kind = ['hair', 'hcol', 'nails'].includes(tab) ? tab : 'hair', price = E.SALON_PRICE[kind];
  let h = hero('💇 Salon Schnipp & Glanz', { hair: 'Friseur', hcol: 'Haarfarben', nails: 'Nagelstudio' }[kind], 'Was ihr hier aussucht, tragt ihr sofort – und es bleibt für euch beide in der Garderobe (Aussehen ➜ Haare bzw. Make-up).');
  h += `<div class="pgrid">${E.SALON[kind].map(([id, name, col]) => { const own = W[E.salonKey(kind, id)];
    return `<div class="pcard"><div class="pc-ic">${kind === 'hair' ? '<span style="font-size:30px">💇</span>' : `<span class="bigdot14" style="background:${kind === 'hcol' ? id : col}"></span>`}</div><div class="pc-tx"><b>${name}</b><div class="pc-info">${own ? chip('✔ in der Garderobe') : ''}</div></div>${own ? '' : btn(`🪙 ${fmt(price)}`, { t: 'salon14', kind, id }, 'pink', s.money < price)}</div>`; }).join('')}</div>`;
  return h;
}

function ext14(s) {
  const X_ = E.extOf(s), sec = (k, title, sub) => `<h3>${title}</h3>${sub ? `<small class="sub14">${sub}</small>` : ''}<div class="swrow14">${E.EXT[k].map(([v, n, c]) => { const on = (X_[k] || '') === v, need = k === 'wreath' && v && !on && !(s.inv[v] > 0);
    return `<button class="btn small ${on ? 'pink' : 'white'}" ${on ? '' : act({ t: 'ext14', k, v })} ${need ? 'disabled' : ''}>${on ? '✔ ' : ''}${k === 'roof' && v ? dot(`hsl(${Math.round(c * 360)} 62% 58%)`) : typeof c === 'number' && c ? dot(c) : ''} ${n}${need ? ' 🔒' : ''}</button>`; }).join('')}</div>`;
  let h = hero('🏡 Hausfassade', 'Euer Haus von außen', `Dach, Tür, Fensterläden und Blumenkästen umgestalten – jede neue Farbe kostet ${E.EXT_COST} Taler, „Wie gebaut“ ist gratis.`);
  h += sec('roof', '🏠 Dach') + sec('door', '🚪 Haustür') + sec('shut', '🪟 Fensterläden') + sec('box', '🌸 Blumenkästen') + sec('wreath', '🌿 Türkranz', 'Kränze bindet ihr am Blumenbinde-Tisch – der Kranz aus der Tasche kommt an die Tür.');
  h += row('🔢', 'Hausnummer', '0 = kein Schild', `<input id="extnr" class="tin14" type="number" min="0" max="99" value="${X_.nr || 0}" style="width:70px"> <button class="btn small white" data-ui="x:nr">Anbringen</button>`);
  return h;
}

function outfits14() {
  const L = outfits();
  let h = hero('👗 Outfits', 'Lieblings-Looks mit einem Tipp', 'Speichert, was ihr gerade tragt (Frisur, Kleidung, Hut, Brille, Make-up, Nägel) – und wechselt später mit einem Tipp. Die Outfits liegen auf diesem Gerät.');
  h += `<div class="swrow14">${ubtn('✨ Posieren', 'pose')} ${ubtn('💄 Schminken & Frisieren', 'editor', { tab: 'makeup' }, 'white')} ${ubtn('👕 Umziehen', 'editor', { tab: 'outfit' }, 'white')}</div>`;
  for (let i = 0; i < OUTFIT_SLOTS; i++) { const o = L[i];
    h += o ? row('👗', `Outfit ${i + 1}`, esc(outfitLabel(o.look)), `${ubtn('✨ Anziehen', 'outwear', { i })} ${ubtn('💾', 'outsave', { i }, 'white')} ${ubtn('🗑️', 'outdel', { i }, 'white')}`)
      : row('➕', `Platz ${i + 1}`, 'Noch frei', ubtn('💾 Jetzt speichern', 'outsave', { i }, 'white')); }
  return h + `<div class="note">Neue Frisuren, Haarfarben und Nagellack gibt es im 💇 Salon in der Bummelgasse.</div>`;
}

export const PANELS_14 = { lock14, pet14, snow14, scat14, deliv14, salon14, ext14, outfits14 };
export const TITLES_14 = { lock14: '🔒 Liebesschlösser', pet14: '🐇 Unser Hase', snow14: '⛄ Schneemann', scat14: '📖 Saisonkatalog', deliv14: '📦 Lieferdienst', salon14: '💇 Salon', ext14: '🏡 Hausfassade', outfits14: '👗 Outfits' };
export const TABS_14 = { salon14: [['hair', '💇 Friseur'], ['hcol', '🎨 Haarfarben'], ['nails', '💅 Nagelstudio'], ['jewel', '💎 Goldschmiede']] };
export const KIND_14 = { love: ['lock14', 'pet14', 'outfits14', 'salon14'], green: ['scat14'], blue: ['snow14', 'ext14'] };
export const sig14 = (s, g, open) => (PANELS_14[open] ? [s.locks?.length, s.pet14, s.snowmen, s.deliv, s.wardrobe, s.home?.ext, s.scat, s.money, s.day, g.uiAt] : open === 'phone' ? [s.deliv?.list?.length] : 0);
export const delivOpen = s => s.deliv?.list?.length || 0;
