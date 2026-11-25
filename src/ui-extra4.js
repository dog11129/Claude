// Fenster für Inselleben 7. Knöpfe mit ui: 'f:…' landen in src/client/fun5.js, Aktionen (t: …) gehen an den Host.
import { ITEMS, NPC_DATA, WEEKDAYS, SEASONS, weekday } from './data.js';
import { itemIcon } from './icons.js';
import * as E from './extras7.js';
import * as X from './extras.js';

const myKey = g => g.players?.[g.me]?.key || 'host';
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const big = (icon, label, sub, data, cls = '', dis = false) => `<button class="big ${cls}" data-act='${JSON.stringify(data)}'${dis ? ' disabled' : ''}><span class="i">${icon}</span><span>${label}<small>${sub}</small></span></button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const npc = id => `${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id}`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const hour = s => 6 + s.dayTime * 18;
const bar = (p, txt = '') => `<div class="bar big"><i style="width:${Math.round(Math.min(1, p) * 100)}%"></i><span>${txt}</span></div>`;
const has = (s, need) => Object.entries(need).every(([id, n]) => (s.inv?.[id] || 0) >= n);
const nextSat = s => { let d = s.day; while (weekday(d) !== 6) d++; return d; };
const inDays = (s, d) => (d === s.day ? 'heute' : d === s.day + 1 ? 'morgen' : `${WEEKDAYS[weekday(d)]} (in ${d - s.day} Tagen)`);

export const TITLES_7 = { moorsteg: '🪷 Steg zum Moor', bambusgate: '⛩️ Bambustor', teahouse: '🍵 Teehaus', parade: '🏮 Laternenumzug', fireworks: '🎆 Silvesternacht', fwedit: '🎆 Eigenes Feuerwerk', gym: '🤸 Morgengymnastik', housing: '🏡 Neue Nachbarn', market: '🧺 Bauernmarkt', calendar: '📅 Insel-Kalender', review: '📽️ Jahresrückblick' };
export const APPS_7 = [['housing', '🏡', 'Wohnen', '#d8f0c8'], ['calendar', '📅', 'Kalender', '#cfe0ff'], ['fwedit', '🎆', 'Feuerwerk', '#e2d8ff'], ['review', '📽️', 'Rückblick', '#ffe0c8']];
export const APP_PANELS_7 = { housing: ['housing'], calendar: ['calendar'], fwedit: ['fwedit'], review: ['review'] };
// Was ein offenes Fenster neu zeichnen lässt
export const sig7 = (s, g, open) => [g.furnCat, s.moor, s.bambus, s.parade, s.newyear, s.rockets, s.gym, s.housing, s.moving, s.market, s.lastYear, g.fwEdit, g.mk, open === 'market' || open === 'calendar' ? Math.floor(s.dayTime * 36) : 0];

export const PANELS_7 = {
  moorsteg(s, g) {
    const M = s.moor || {}, n = M.steg || 0, today = M.last === s.day;
    let h = hero('🌼 Nordrand der Blütenwiese', 'Ein Steg ins Moor', 'Hinter der Wiese liegt ein verwunschenes Moor mit Seerosen, Fröschen und Libellen. Baut gemeinsam einen Steg hinüber – jeden Tag ein Stück, drei Tage lang. Bruno und Kalle helfen mit!');
    h += bar(n / E.STEG_DAYS, `${n}/${E.STEG_DAYS} Stücke`);
    if (M.by) h += `<div class="note">Mitgebaut: ${Object.entries(M.by).map(([k, v]) => `<b>${Object.values(g.players || {}).find(p => (p.key || 'host') === k)?.name || (k === 'host' ? 'Gastgeber' : 'Besuch')}</b> ${v}×`).join(' · ')}</div>`;
    h += big('🪵', 'Ein Stück Steg bauen', today ? 'heute schon gebaut – morgen weiter' : `${E.STEG_COST.holz} Holz und ${E.STEG_COST.stein} Steine (ihr habt ${s.inv?.holz || 0} / ${s.inv?.stein || 0})`, { t: 'moor', op: 'steg' }, 'pink', today || !has(s, E.STEG_COST));
    return h;
  },
  bambusgate(s) {
    let h = hero('🌲 Nordrand des Kiefernwalds', 'Das Bambustor', `Durch das alte Tor rauscht ein Bambushain: Steinlaternen, ein plätscherndes Wasserspiel und ein kleines Teehaus. Das Tor freizuräumen kostet ${fmt(E.BAMBUS_PRICE)} Taler aus der Inselkasse und ${E.BAMBUS_WOOD} Holz.`);
    h += big('⛩️', 'Tor öffnen', `${fmt(E.BAMBUS_PRICE)} Taler · ${E.BAMBUS_WOOD} Holz · danach gibt es Bambus, Sprossen, Tee und neue Baupläne`, { t: 'bambus', op: 'open' }, 'pink', s.money < E.BAMBUS_PRICE || (s.inv?.holz || 0) < E.BAMBUS_WOOD);
    return h;
  },
  teahouse(s, g) {
    const B = s.bambus || {}, done = B.tea?.[myKey(g)] === s.day;
    let h = hero(`${npc('wanda')} · Teehaus`, 'Eine Teezeremonie?', 'Wasser auf die richtige Wärme bringen, den Tee schaumig schlagen und die Schale ruhig servieren. Je achtsamer, desto besser schmeckt er – und Wanda und Kalle freuen sich.');
    h += big('🍵', 'Teezeremonie beginnen', done ? 'heute schon – morgen wieder' : 'drei kleine Schritte · bringt Grünen Tee', { ui: 'f:tea' }, 'pink', done);
    h += bar((B.perfect || 0) / E.TEA_REWARD, B.set ? '🍵 Tee-Set verdient!' : `vollkommene Zeremonien: ${B.perfect || 0}/${E.TEA_REWARD}`);
    h += '<h3>Aus dem Hain</h3>' + row(itemIcon('bambus'), 'Bambus', 'mit der Axt an den Büscheln · Bambuszaun & Bambuslampe an der Werkbank') + row(itemIcon('bambussprosse'), 'Bambussprossen', 'mit der Schaufel · jeden Tag woanders · Sprossenpfanne in der Gartenküche');
    return h;
  },
  parade(s) {
    const lamp = (s.inv?.papierlaterne || 0) > 0, on = E.paradeTime(s), done = s.parade?.done === s.day;
    let h = hero('🏮 Laternenumzug', done ? 'Was für ein schöner Abend!' : on ? 'Heute Abend ist Umzug!' : 'Im Herbst, abends', 'Mit der Laterne in der Hand loslaufen – alle Nachbarn kommen hinterher und singen. Lauft eine schöne Runde (mindestens eine halbe Minute) und kommt zurück zum Dorfplatz.');
    if (!lamp) h += big('🦔', 'Mira um eine Laterne bitten', 'oder selbst basteln: Werkbank (1 Holz, 1 Ast)', { t: 'fests2', op: 'lantern' }, '', !on);
    h += big('🏮', 'Umzug beginnen', done ? 'heute schon gelaufen' : lamp ? 'alle Nachbarn kommen mit' : 'erst eine Laterne holen', { ui: 'f:parade' }, 'pink', !on || done || !lamp);
    return h;
  },
  fireworks(s, g) {
    const mine = s.rockets?.[myKey(g)] || [], all = Object.values(s.rockets || {}).flat().length, done = s.newyear?.day === s.day;
    let h = hero('🎆 Silvesternacht', done ? 'Frohes neues Inseljahr!' : 'Gleich ist es so weit', `Zählt gemeinsam rückwärts – dann steigen alle selbst gestalteten Raketen auf (${all} gespeichert${mine.length ? `, ${mine.length} von dir` : ''}).`);
    h += big('🎆', 'Countdown starten!', done ? 'das Feuerwerk war schon' : E.fwTime(s) ? '10 … 9 … 8 …' : 'ab 22 Uhr', { t: 'fests2', op: 'launch' }, 'pink', done || !E.fwTime(s));
    h += big('🎨', 'Eigene Raketen gestalten', 'Farbe, Form und Höhe', { ui: 'f:fwedit' }, 'white');
    return h;
  },
  fwedit(s, g) {
    const list = g.fwEdit || s.rockets?.[myKey(g)] || [];
    let h = hero('🎆 Feuerwerk', 'Bis zu drei eigene Raketen', `Sie steigen in der Silvesternacht (${SEASONS.winter[0]}, letzter Tag des Jahres, ab 22 Uhr) zusammen mit denen der anderen auf.`);
    list.forEach((r, i) => {
      h += `<h3>🚀 Rakete ${i + 1} <button class="btn small white" data-act='${JSON.stringify({ ui: 'f:fwprev', i })}'>👀 Vorschau</button> <button class="btn small white" data-act='${JSON.stringify({ ui: 'f:fwdel', i })}'>🗑️</button></h3>`;
      h += `<div class="pattools">${E.FW_COLORS.map(([c, col]) => `<button class="btn small ${r.c === c ? 'pink' : 'white'}" data-act='${JSON.stringify({ ui: 'f:fwset', i, f: 'c', v: c })}'><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#${col.toString(16).padStart(6, '0')}"></span></button>`).join('')}</div>`;
      h += `<div class="pattools">${E.FW_SHAPES.map(([k, n, ic]) => `<button class="btn small ${r.sh === k ? 'pink' : 'white'}" data-act='${JSON.stringify({ ui: 'f:fwset', i, f: 'sh', v: k })}'>${ic} ${n}</button>`).join('')}</div>`;
      h += `<div class="pattools">${E.FW_HEIGHTS.map(([k, n]) => `<button class="btn small ${r.h === k ? 'pink' : 'white'}" data-act='${JSON.stringify({ ui: 'f:fwset', i, f: 'h', v: k })}'>⬆️ ${n}</button>`).join('')}</div>`;
    });
    if (list.length < 3) h += big('➕', 'Neue Rakete', 'bis zu drei', { ui: 'f:fwadd' }, 'white');
    h += big('💾', 'Raketen speichern', g.fwEdit ? 'noch nicht gespeichert' : 'gespeichert ✓', { ui: 'f:fwsave' }, 'pink', !g.fwEdit);
    return h;
  },
  gym(s, g) {
    const G = s.gym?.[myKey(g)] || { n: 0 }, done = G.last === s.day, n = Math.min(G.n, E.GYM_GOAL);
    let h = hero(`${npc('mira')} turnt vor`, 'Morgengymnastik', 'Jeden Morgen von 6 bis 8:30 Uhr vor dem Dorfbaum: Mira macht die Bewegung vor – macht sie im Takt nach! Für jeden Morgen gibt es einen Stempel.');
    h += `<div class="pattools">${Array.from({ length: E.GYM_GOAL }, (_, i) => `<span class="btn small ${i < n ? 'pink' : 'white'}">${i < n ? '🌟' : i + 1}</span>`).join('')}</div>`;
    if (G.n >= E.GYM_GOAL) h += '<div class="note">Stempelkarte voll – die 🤸 Gymnastikmatte gehört euch! Mitmachen lohnt sich trotzdem.</div>';
    h += big('🤸', 'Mitmachen', done ? 'heute schon – bis morgen früh!' : E.gymTime(s) ? '8 Bewegungen im Takt' : 'morgens 6–8:30 Uhr', { ui: 'f:gym' }, 'pink', done || !E.gymTime(s));
    return h;
  },
  housing(s) {
    const ap = E.applicants(s), H = s.housing || {}, week = H.week === E.weekOf(s.day), n = Object.keys(s.residents || {}).length + (s.pending || []).length;
    let h = hero('🏡 Neue Nachbarn', `${n}/${X.MAX_RESIDENTS} Häuschen vergeben`, 'Jede Woche bewerben sich drei Tiere um ein Grundstück. Lest die Briefe und sagt einem zu – das Grundstück stellt ihr selbst im Baumodus auf. Am Einzugstag stehen Umzugskartons herum: helft beim Tragen!');
    if (s.moving) h += `<div class="note">📦 Heute zieht ${X.VISITORS[s.moving.id]?.icon || ''} <b>${X.VISITORS[s.moving.id]?.name || ''}</b> ein: ${s.moving.done}/${s.moving.boxes.length} Kartons im Haus.</div>`;
    if (week) h += '<div class="note">Diese Woche habt ihr schon zugesagt. Nächsten Sonntag kommen neue Briefe.</div>';
    h += '<h3>Bewerbungen dieser Woche</h3>' + (ap.length ? ap.map(id => { const V = X.VISITORS[id]; return row(V?.icon || '🐾', V?.name || id, `„${E.APPLY_TEXT[id] || 'Ich würde so gern auf eurer Insel wohnen!'}“`, btn('✉️ Zusagen', { t: 'housing', op: 'accept', id }, 'pink', week || n >= X.MAX_RESIDENTS)); }).join('') : '<div class="note">Gerade bewirbt sich niemand – alle Gäste wohnen schon hier!</div>');
    return h;
  },
  market(s, g) {
    const k = g.uiAt?.k, [x, z] = (k || '0,0').split(',').map(Number), M = s.market?.day === s.day ? s.market : null, wishes = E.marketWishes(E.marketDay(s) ? s.day : nextSat(s));
    let h = hero('🧺 Bauernmarkt', E.marketDay(s) ? (E.marketOpen(s) ? 'Heute ist Markt bis 15 Uhr!' : hour(s) < E.MARKET_FROM ? 'Heute ab 8 Uhr' : 'Für heute vorbei') : `Nächster Markt: ${inDays(s, nextSat(s))}`, 'Samstags legt ihr bis zu sechs Sorten Obst, Gemüse, Honig, Eier, Wolle oder Gerichte aus. Die Nachbarn kaufen über den Vormittag – was sie sich wünschen, geht schneller weg und bringt das Doppelte.');
    h += '<h3>Wünsche der Nachbarn</h3>' + wishes.map(([id, it]) => row(itemIcon(it), ITEMS[it]?.name || it, `${npc(id)} sucht danach · ${fmt(Math.round(ITEMS[it].sell * 2))} Taler`)).join('');
    if (M) {
      const sold = E.marketSales(s, M), open = sold.reduce((a, b) => a + b, 0) - M.paid.reduce((a, b) => a + b, 0);
      h += '<h3>Auf dem Stand</h3>' + M.items.map((it, i) => row(itemIcon(it.id), ITEMS[it.id]?.name || it.id, `${sold[i]}/${it.n} verkauft · ${fmt(E.marketPrice(s, it.id))} Taler pro Stück`)).join('');
      h += M.closed ? '<div class="note">Der Markt ist vorbei – danke fürs Mitmachen!</div>' : big('🪙', 'Einnahmen abholen', open > 0 ? `${open} Stück verkauft, noch nicht abgeholt` : hour(s) >= E.MARKET_TO ? 'Markt vorbei: Rest zurück in die Tasche' : 'noch nichts Neues – später nochmal', { t: 'market', op: 'collect' }, 'pink');
      return h;
    }
    if (!E.marketOpen(s)) return h;
    const sel = g.mk || {}, inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && E.marketOk(id)), picked = Object.entries(sel).filter(([, n]) => n > 0);
    h += '<h3>Was kommt auf den Stand?</h3>' + (inv.length ? inv.map(([id, n]) => { const c = sel[id] || 0; return row(itemIcon(id), ITEMS[id].name, `${n}× in der Tasche · ${fmt(E.marketPrice(s, id))} Taler${wishes.some(w => w[1] === id) ? ' · 💕 gewünscht' : ''}`, `${btn('−', { ui: 'f:mk', id, d: -1 }, 'white', !c)} <b>${c}</b> ${btn('+', { ui: 'f:mk', id, d: 1 }, 'pink', c >= Math.min(n, E.MARKET_MAX) || (!c && picked.length >= E.MARKET_SLOTS))}`); }).join('') : '<div class="note">Nichts Passendes in der Tasche – Obst, Gemüse, Blumen, Honig, Eier, Milch, Wolle oder Gerichte gehen.</div>');
    h += big('🧺', 'Stand aufbauen', picked.length ? `${picked.reduce((a, [, n]) => a + n, 0)} Stück · bis zu ${E.MARKET_MAX} je Sorte` : 'erst etwas auswählen', { ui: 'f:mkopen', x, z }, 'pink', !picked.length);
    return h;
  },
  calendar(s) {
    let h = hero('📅 Insel-Kalender', 'Was steht an?', 'Feste, Geburtstage, Märkte und Jahrmarkt der nächsten drei Wochen.');
    h += big('📲', 'In den Handy-Kalender', s.real ? 'als Datei (.ics) für Apple, Google oder Outlook' : 'nur mit „🕰️ Echte Uhrzeit“ in den Optionen – dann ist ein Inseltag ein echter Tag', { ui: 'f:ics' }, 'white', !s.real);
    for (const d of E.calendarDays(s, 21)) {
      h += `<h3>${d.sea[1]} ${d.name} · Tag ${d.day}</h3>`;
      h += d.ev.length ? d.ev.map(([ic, t, when]) => row(ic, t, when || '')).join('') : '<div class="note">Ein ruhiger Inseltag.</div>';
    }
    return h;
  },
  review(s) {
    const cur = E.reviewData(s, false), L = s.lastYear;
    let h = hero('📽️ Jahresrückblick', L ? `Euer Inseljahr ${L.y}` : `Inseljahr ${cur.y} (läuft noch)`, 'Eine kleine Diashow mit euren Fotos, Tagebuch-Erinnerungen und Zahlen des Jahres. Am Ende jedes Jahres gibt es einen neuen Rückblick.');
    if (L) h += big('▶️', `Diashow: Jahr ${L.y}`, `Tag ${L.from}–${L.to}`, { ui: 'f:review', last: 1 }, 'pink');
    h += big('▶️', `Bisher in Jahr ${cur.y}`, `seit Tag ${cur.from}`, { ui: 'f:review', last: 0 }, L ? 'white' : 'pink');
    h += `<h3>Jahr ${cur.y} bisher</h3>` + E.REVIEW_KEYS.map(([k, ic, n]) => row(ic, n, fmt(cur.diff[k] || 0))).join('');
    return h;
  },
};
