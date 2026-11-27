// Fenster für Inselleben 6. Knöpfe mit ui: 'e:…' landen in src/client/fun4.js, Aktionen (t: …) gehen an den Host.
import { ITEMS, NPC_DATA, WEEKDAYS, SEASONS } from './data.js';
import { FURNITURE, WOOL_COLORS } from './furni-data.js';
import { itemIcon } from './icons.js';
import * as E from './extras6.js';
import { seasonOf } from './state.js';

const myKey = g => g.players?.[g.me]?.key || 'host';
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const big = (icon, label, sub, data, cls = '', dis = false) => `<button class="big ${cls}" data-act='${JSON.stringify(data)}'${dis ? ' disabled' : ''}><span class="i">${icon}</span><span>${label}<small>${sub}</small></span></button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const npc = id => `${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id}`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const hour = s => 6 + s.dayTime * 18;
const dayName = (s, d) => d === s.day ? 'heute' : d === s.day + 1 ? 'morgen' : `${WEEKDAYS[(d - 1) % 7]} (in ${d - s.day} Tagen, ${SEASONS[seasonOf(d)][1]})`;

export const TITLES_6 = { fair: '🎡 Jahrmarkt', fairinfo: '🎡 Jahrmarkt', resto: '🍽️ Inselrestaurant', tank: '🐠 Becken', pirate: '🗺️ Die alte Seekarte', loom: '🧶 Webstuhl', picnic: '🧺 Picknick', band: '🎸 Inselband', nature6: '🦔 Garten & Tiere' };
export const APPS_6 = [['pirate', '🗺️', 'Schatz', '#f0dcb0'], ['band', '🎸', 'Band', '#ffd0b8'], ['fairinfo', '🎡', 'Rummel', '#ffc8d8'], ['nature6', '🦔', 'Tiere', '#d8ecc0']];
export const APP_PANELS_6 = { pirate: ['pirate'], band: ['band'], fairinfo: ['fairinfo'], nature6: ['nature6'] };

function fairBooth(s, g, k) {
  const P = E.FAIR_SPOTS[k], open = E.fairOpen(s), F = s.fair?.day === s.day ? s.fair : { lose: {}, ducks: {} }, me = myKey(g);
  if (k === 'rad' || k === 'karussell') return big(P.icon, `${P.name} fahren`, `${fmt(P.price)} Taler · ${P.secs} Sekunden`, { ui: 'e:ride', k }, 'pink', !open || s.money < P.price);
  if (k === 'lose') return big('🎟️', 'Ein Los ziehen', `${fmt(P.price)} Taler · noch ${E.LOSE_MAX - (F.lose?.[me] || 0)} heute · Plüschtiere, Lutscher, mit Glück der Riesenteddy`, { t: 'fair', op: 'los' }, 'pink', !open || s.money < P.price || (F.lose?.[me] || 0) >= E.LOSE_MAX);
  if (k === 'enten') return big('🦆', 'Enten angeln', `${fmt(P.price)} Taler für 3 Versuche · unter jeder Ente steht eine Zahl · noch ${E.DUCK_MAX - (F.ducks?.[me] || 0)} heute`, { ui: 'e:ducks' }, 'pink', !open || s.money < P.price || (F.ducks?.[me] || 0) >= E.DUCK_MAX);
  if (k === 'suess') return E.SWEETS.map(([id, p]) => row(itemIcon(id), ITEMS[id].name, `${fmt(p)} Taler`, btn(`🪙 ${p}`, { t: 'fair', op: 'buy', id }, 'pink', !open || s.money < p))).join('');
  return '';
}

export const PANELS_6 = {
  fair(s, g) {
    const k = g.uiAt?.k, open = E.fairOpen(s);
    let h = hero('🎡 Jahrmarkt', open ? 'Heute ist Rummel!' : 'Gerade zu', open ? 'Bis 22 Uhr: Riesenrad, Karussell, Losbude, Entenangeln und Süßes. Die Nachbarn sind auch da!' : `Nächster Jahrmarkt: ${dayName(s, E.nextFair(s))}, 10–22 Uhr.`);
    if (k && E.FAIR_SPOTS[k]) h += `<h3>${E.FAIR_SPOTS[k].icon} ${E.FAIR_SPOTS[k].name}</h3>` + fairBooth(s, g, k);
    for (const kk of Object.keys(E.FAIR_SPOTS)) if (kk !== k) h += `<h3>${E.FAIR_SPOTS[kk].icon} ${E.FAIR_SPOTS[kk].name}</h3>` + fairBooth(s, g, kk);
    return h;
  },
  fairinfo(s) {
    const d = E.nextFair(s), plush = ['pluesch_baer', 'pluesch_hase', 'pluesch_ente', 'pluesch_drache', 'riesenteddy'];
    let h = hero('🎡 Jahrmarkt', d === s.day ? (E.fairOpen(s) ? 'Heute ist Rummel!' : 'Heute ab 10 Uhr') : `Nächster: ${dayName(s, d)}`, 'Einmal pro Jahreszeit steht der Jahrmarkt hinter der Bummelgasse: am Ende der Gasse (nach Osten) geht es hinein. Riesenrad, Karussell, Losbude, Entenangeln und Zuckerwatte.');
    h += '<h3>Preise</h3>' + plush.map(id => row(itemIcon(id), FURNITURE[id].name, s.inv?.[id] ? `${s.inv[id]}× in der Tasche` : id === 'riesenteddy' ? 'Hauptgewinn der Losbude' : id === 'pluesch_drache' ? 'selten: Losbude oder 20 Punkte beim Entenangeln' : 'Losbude oder Entenangeln')).join('');
    return h;
  },
  resto(s, g) {
    const R = s.resto || {}, me = myKey(g), done = R.done?.[me] === s.day, open = E.restoOpen(s);
    let h = hero('🍽️ Inselrestaurant', `Bewertung ${E.restoRating(s) ? '⭐ ' + E.restoRating(s) : '–'} · Rekord ${R.best || 0} Gäste`, 'Die Nachbarn kommen zum Essen! Bestellung ansehen, das Gericht an der Station kochen lassen und an den richtigen Tisch bringen – bevor die Geduld aufgebraucht ist. Eine Schicht dauert 90 Sekunden.');
    h += big('👩‍🍳', 'Schicht beginnen', done ? 'heute schon gearbeitet – morgen wieder' : open ? '150 Taler je Gast, Trinkgeld für Sterne' : 'geöffnet 11–22 Uhr', { ui: 'e:resto' }, 'pink', done || !open);
    h += `<div class="note">Bisher bewirtet: <b>${fmt(R.served || 0)}</b> Gäste.${R.five ? ' ⭐⭐⭐⭐⭐ schon einmal geschafft!' : ''}</div>`;
    return h;
  },
  tank(s, g) {
    const u = g.uiAt || {}, h0 = E.tankAt(s, u.x, u.z, u.room), f = h0 && FURNITURE[h0.o.k];
    if (!h0) return '<div class="note">Hier steht kein Becken.</div>';
    const kind = f.tank, list = h0.o.a || [], inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && E.tankOk(kind, id));
    let h = hero(`${f.icon} ${f.name}`, `${list.length}/${E.TANK_MAX} ${kind === 'fish' ? 'Fische & Meerestiere' : 'Krabbeltiere'}`, kind === 'fish' ? 'Setzt gefangene Fische und Meerestiere hinein – sie schwimmen im Becken herum.' : 'Setzt gefangene Insekten hinein – sie krabbeln und flattern im Glas.');
    h += list.map((id, i) => row(itemIcon(id), ITEMS[id]?.name || id, 'wohnt hier', btn('↩️ Herausnehmen', { t: 'tank', op: 'take', x: u.x, z: u.z, room: u.room || null, i }, 'white'))).join('');
    h += '<h3>Aus der Tasche</h3>' + (inv.length ? inv.map(([id, n]) => row(itemIcon(id), ITEMS[id].name, `${n}× in der Tasche`, btn('➕ Hinein', { t: 'tank', op: 'add', x: u.x, z: u.z, room: u.room || null, id }, 'pink', list.length >= E.TANK_MAX))).join('') : `<div class="note">${kind === 'fish' ? 'Fangt Fische mit der Angel oder taucht nach Meerestieren.' : 'Fangt Insekten mit dem Kescher.'}</div>`);
    return h;
  },
  pirate(s) {
    const P = s.pirate || {};
    if (P.done) return hero('🏴‍☠️ Geschafft!', 'Der Schatz ist gehoben', 'Alle fünf Zeichen gefunden – Truhe, Steuerrad und Piratenhut gehören euch.');
    if (!P.on) return hero('🦭 Käpt\'n Flossi', 'Eine alte Seekarte …', `Käpt'n Flossi hat eine uralte Seekarte mit fünf Zeichen. Fragt ihn am Steg danach (ab Insel-Level ${E.PIRATE_LVL}). Jeden Tag lässt sich eine Spur lesen.`);
    const st = E.PIRATE[P.stage], ready = E.pirateReady(s);
    let h = hero(`📜 Spur ${P.stage + 1} von ${E.PIRATE.length}`, `${st.icon} ${st.name}`, ready ? st.clue : 'Die nächste Spur ist noch verwischt … morgen früh lässt sie sich lesen.');
    h += `<div class="pattools">${E.PIRATE.map((x, i) => `<span class="btn small ${i < P.stage ? 'pink' : 'white'}">${i < P.stage ? '✅' : x.icon} ${x.name}</span>`).join('')}</div>`;
    if (ready && st.dig && P.at) h += `<div class="note">Das ❌ liegt in der Nähe: <b>${E.pirateNear(P.at)}</b>.</div><div class="mapwrap"><canvas id="mapcv" width="480" height="480"></canvas></div>`;
    return h;
  },
  loom(s, g) {
    const col = g.woolCol || 'rot', C = WOOL_COLORS.find(c => c[0] === col), w = s.inv?.wolle || 0, fl = E.dyeFlower(s, col);
    let h = hero('🧶 Webstuhl', `${w}× Wolle in der Tasche`, 'Wolle gibt es auf der Schafweide (Krämerladen). Zum Färben braucht ihr eine Blume in der Farbe.');
    h += `<div class="pattools">${WOOL_COLORS.map(([id, n, c]) => `<button class="btn small ${col === id ? 'pink' : 'white'}" data-act='${JSON.stringify({ ui: 'e:woolcol', c: id })}'><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#${c.toString(16).padStart(6, '0')};vertical-align:-2px"></span> ${n}</button>`).join('')}</div>`;
    h += `<div class="note">${fl ? `Färben mit ${ITEMS[fl].icon} ${ITEMS[fl].name}` : `Keine ${C[1]}e Blume in der Tasche`}</div>`;
    for (const [what, L] of Object.entries(E.LOOM)) h += big(what === 'teppich' ? '🟫' : '🟣', `${L.name} (${C[1]})`, `${L.wool} Wolle + 1 Blume`, { t: 'loom', op: 'weave', what, color: col }, 'pink', w < L.wool || !fl);
    h += big('🖼️', 'Wandteppich mit eigenem Muster', `${E.TAPESTRY_WOOL} Wolle · zeigt eure Muster aus dem Muster-Editor`, { t: 'loom', op: 'tapestry' }, '', w < E.TAPESTRY_WOOL);
    h += '<h3>Stricken</h3>' + E.KNIT_HATS.map(([id, n, c]) => row('🧶', n, s.wardrobe?.[id] ? '✓ in der Garderobe' : `${c} Wolle · für alle auf der Insel`, s.wardrobe?.[id] ? '' : btn('🧶 Stricken', { t: 'loom', op: 'hat', id }, 'pink', w < c))).join('');
    return h;
  },
  picnic(s, g) {
    const k = g.uiAt?.k, P = E.picnicNow(s), dishes = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id]?.cat === 'dish');
    if (P && P.k === k) return hero('🧺 Picknick', `${ITEMS[P.dish]?.icon || ''} ${ITEMS[P.dish]?.name || ''}`, `Zu Gast: ${P.guests.map(npc).join(', ')}. Setzt euch dazu!`);
    if (s.picnic?.day === s.day) return hero('🧺 Picknick', 'Heute schon', 'Morgen gibt es wieder ein Picknick.');
    const [x, z] = (k || '0,0').split(',').map(Number), ok = hour(s) >= 9 && hour(s) < 18;
    let h = hero('🧺 Picknickdecke', 'Was kommt auf die Decke?', 'Legt ein Gericht aus der Gartenküche aus – drei Nachbarn kommen dazu und freuen sich (tagsüber 9–18 Uhr).');
    h += dishes.length ? dishes.map(([id, n]) => row(itemIcon(id), ITEMS[id].name, `${n}× in der Tasche`, btn('🧺 Auslegen', { t: 'picnic', op: 'lay', x, z, dish: id }, 'pink', !ok))).join('') : '<div class="note">Kocht erst etwas in der Gartenküche 🍳.</div>';
    return h;
  },
  band(s, g) {
    const B = E.bandToday(s), me = myKey(g), mine = B?.parts?.[me];
    let h = hero('🎸 Inselband', B?.done ? `Heute: ${B.rating} Punkte!` : E.concertTime(s) ? 'Konzert-Zeit!' : 'Bandprobe', 'Übt ein Instrument im Takt (Noten antippen, wenn sie die Linie erreichen). Abends ab 19 Uhr steht die Band auf dem Dorfplatz – vor der Band „Konzert beginnen“. Je mehr verschiedene Instrumente mitspielen, desto besser!');
    h += E.INSTR.map(([id, n, ic]) => row(ic, n, mine?.inst === id ? `geübt: ${mine.score} Punkte` : 'üben', btn('▶️ Üben', { ui: 'e:band', inst: id }, mine?.inst === id ? 'white' : 'pink'))).join('');
    if (B) h += `<div class="note">Heute dabei: ${Object.values(B.parts).map(p => `${E.INSTR.find(i => i[0] === p.inst)?.[2]} ${p.score}`).join(' · ')} – und ${E.bandNpcs(s).map(npc).join(', ')}.</div>`;
    return h;
  },
  nature6(s) {
    let h = hero('🦔 Garten & Tiere', 'Wildtiere, Honig & Obst', 'Füttert die Wildtiere jeden Tag – nach fünf Tagen sind sie zahm und kommen in euren Garten.');
    for (const [id, W] of Object.entries(E.WILD)) { const w = s.wild?.[id] || {}; h += row(W.icon, W.name, `${E.wildTame(s, id) ? '🏡 zahm – kommt in den Garten' : '💗'.repeat(w.t || 0) || 'noch scheu'} · ${id === 'ente' ? 'am Teich' : 'unter einem Obstbaum'}, ${W.from}–${W.to === 24 ? 'Mitternacht' : W.to + ' Uhr'} · mag ${W.food.map(f => ITEMS[f]?.icon).join(' ')}`, w.fed === s.day ? '✓ heute' : ''); }
    h += `<h3>🍯 Honigsorten ${E.HONEYS.filter(id => s.honeys?.[id]).length}/${E.HONEYS.length}</h3><div class="pattools">${E.HONEYS.map(id => `<span class="btn small ${s.honeys?.[id] ? 'pink' : 'white'}">${s.honeys?.[id] ? ITEMS[id].name : '?'}</span>`).join('')}</div><div class="note">Bienenkästen neben blühende Blumen stellen: die häufigste Blütenfarbe ringsum bestimmt die Sorte.</div>`;
    const hy = Object.values(E.HYBRID);
    h += `<h3>✂️ Neue Früchte ${hy.filter(id => s.hybrids?.[id]).length}/${hy.length}</h3><div class="pattools">${hy.map(id => `<span class="btn small ${s.hybrids?.[id] ? 'pink' : 'white'}">${s.hybrids?.[id] ? `${ITEMS[id].icon} ${ITEMS[id].name}` : '?'}</span>`).join('')}</div><div class="note">Mit dem Veredelungsmesser eine zweite Sorte auf einen Obstbaum pfropfen – manche Paare bringen neue Früchte.</div>`;
    return h;
  },
};
