// Fenster für Inselleben 4 (Naturbuch, Stempelpass, Zeitkapsel, Minigolf, Tanzabend, Café, Bibliothek, Radio,
// Gästebuch, Modenschau, Garten). Knöpfe mit ui: 'w:…' landen in src/client/fun2.js.
import { ITEMS, NPC_DATA } from './data.js';
import { itemIcon } from './icons.js';
import { esc } from './world.js';
import * as W from './extras4.js';

const myKey = g => g.players?.[g.me]?.key || 'host';
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const big = (icon, label, sub, data, cls = '', dis = false) => `<button class="big ${cls}" data-act='${JSON.stringify(data)}'${dis ? ' disabled' : ''}><span class="i">${icon}</span><span>${label}<small>${sub}</small></span></button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const npc = id => `${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id}`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const SEASON_DE = { spring: 'Frühling', summer: 'Sommer', autumn: 'Herbst', winter: 'Winter' };

export const TITLES_W = { nature: '🔭 Naturbuch', stamps: '📮 Stempelpass', capsule: '⏳ Zeitkapsel', golf: '⛳ Minigolf', dancegame: '💃 Tanzabend', cafe: '☕ Inselcafé', library: '📚 Bibliothek', radio: '📻 Inselradio', guestbook: '📖 Gästebuch', fashion: '👗 Modenschau', gardenc: '🌷 Garten & Riesengemüse' };
export const TABS_W = { nature: [['birds', '🐦 Vögel'], ['finds', '🌊 Tümpel & Funde']], gardenc: [['contest', '🌷 Wettbewerb'], ['giant', '🎃 Riesengemüse']] };
export const APPS_W = [['nature', '🔭', 'Naturbuch', '#b8e0a8'], ['stamps', '📮', 'Stempel', '#f7c6a0'], ['capsule', '⏳', 'Zeitkapsel', '#d8c8f0'], ['fashion', '👗', 'Mode', '#ffc0d8'], ['garden', '🌷', 'Garten', '#c8eab0']];
export const APP_PANELS_W = { nature: ['nature'], stamps: ['stamps'], capsule: ['capsule'], fashion: ['fashion'], garden: ['gardenc'] };

export const PANELS_W = {
  nature(s, g, tab) {
    if (tab === 'finds') {
      const all = [...W.TIDE_ANIMALS.map(a => a[0]), 'grottenforelle', 'kristallgrundel', 'leuchtsalmler', 'feuerfalter', 'glutkaefer'];
      const got = all.filter(id => s.tidebook?.[id]).length;
      let h = `<div class="note">🌊 Bei Ebbe (6–9 und 15–18 Uhr) sitzen in den Felsbecken am Strand kleine Tiere. ${W.tideLow(s) ? '<b>Gerade ist Ebbe!</b>' : 'Gerade ist Flut.'} Dazu: Fische aus der Grotte hinter dem Wasserfall und Falter von der Vulkaninsel. <b>${got}/${all.length}</b></div><div class="pgrid">`;
      for (const id of all) h += `<div class="pcard">${s.tidebook?.[id] ? itemIcon(id) : '<span class="iic emo">❔</span>'}<small>${s.tidebook?.[id] ? esc(ITEMS[id].name) : '???'}</small></div>`;
      return h + '</div>';
    }
    const seen = s.birds?.seen || {}, n = Object.keys(seen).length;
    let h = `<div class="note">🔭 Mit dem Fernglas (Krämerladen) in der Leiste Ausschau halten. Manche Vögel gibt es nur zu bestimmten Zeiten, Jahreszeiten oder Orten – ein Vogelhäuschen lockt seltene an. <b>${n}/${W.BIRDS.length}</b></div><div class="pgrid">`;
    for (const b of W.BIRDS) {
      const ok = seen[b[0]], when = `${b[4][0]}–${b[4][1]} Uhr${b[3].length ? ' · ' + b[3].map(x => SEASON_DE[x]).join(', ') : ''}`, where = { insel: 'Insel', wald: 'Kiefernwald', fluss: 'am Fluss', strand: 'Strand', wiese: 'Blütenwiese', tropen: 'Tropeninsel', vulkan: 'Vulkaninsel' }[b[5]];
      h += `<div class="pcard"><span class="iic emo">${ok ? b[2] : '❔'}</span><b>${ok ? b[1] : '???'}</b><small>${ok ? `${s.birds.n?.[b[0]] || 1}× · ${where}<br>${when}` : where}</small></div>`;
    }
    return h + '</div>';
  },
  stamps(s, g) {
    const me = myKey(g), pass = s.stamps?.[me] || {}, n = Object.keys(pass).length;
    let h = hero('📮 Stempelrallye', `${n} von ${W.STAMPS.length} Stempeln`, `Überall auf der Insel und in den Gebieten stehen kleine Stempelpfosten. Jede/r hat einen eigenen Pass – wer ihn vollmacht, bekommt ${fmt(W.STAMP_PRIZE)} Taler und den Rallye-Pokal.${s.stampsDone?.[me] ? ' <b>Geschafft! 🏆</b>' : ''}`);
    h += '<div class="pgrid">' + W.STAMPS.map(P => `<div class="pcard"><span class="iic emo" style="${pass[P[0]] ? '' : 'opacity:.25;filter:grayscale(1)'}">${P[2]}</span><b>${P[1]}</b><small>${pass[P[0]] ? `Tag ${pass[P[0]]}` : P[5] && !s.areas?.[P[5]] ? '🔒 Gebiet noch zu' : 'fehlt noch'}</small></div>`).join('') + '</div>';
    return h;
  },
  capsule(s, g) {
    const open = (s.capsules || []).filter(c => !c.opened);
    let h = hero('⏳ Zeitkapsel', 'Ein Gruß an euch in der Zukunft', 'Schreibt einen Brief, legt bis zu drei Sachen aus der Tasche dazu und vergrabt alles auf dem Rasen vor dir. Nach 7 oder 30 Spieltagen glitzert die Stelle – dann mit der Schaufel ausgraben.');
    h += `<textarea id="captext" maxlength="300" rows="3" placeholder="Liebe Zukunft …" style="width:100%;font:inherit;border-radius:12px;border:2px solid var(--line);padding:8px"></textarea>`;
    const inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id] && !ITEMS[id].gear && !ITEMS[id].place).slice(0, 40);
    const sel = g.capSel || {};
    h += `<div class="note">Dazulegen (höchstens 3 Sorten, je 1 Stück): ${Object.keys(sel).map(id => ITEMS[id]?.icon).join(' ') || '–'}</div><div class="pattools">${inv.map(([id]) => btn(`${ITEMS[id].icon}`, { ui: 'w:capitem', id }, sel[id] ? 'pink' : 'white')).join('')}</div>`;
    h += `<div class="pattools">${btn('⏳ 7 Tage', { ui: 'w:capbury', days: 7 }, 'pink', open.length >= W.CAPSULE_MAX)}${btn('⏳ 30 Tage', { ui: 'w:capbury', days: 30 }, 'pink', open.length >= W.CAPSULE_MAX)}</div>`;
    if (open.length) h += '<h3>Vergraben</h3>' + open.map(c => row('⏳', `Von ${esc(c.by)} · Tag ${c.day}`, s.day >= c.open ? '✨ Jetzt ausgraben! (Schaufel)' : `noch ${c.open - s.day} Tage · Feld ${c.k}`)).join('');
    return h;
  },
  golf(s, g) {
    const me = myKey(g), G = s.golf || {};
    let h = hero('⛳ Minigolfplatz', `9 Bahnen · Par ${W.GOLF_PAR}`, 'Ziehen und loslassen: je weiter du ziehst, desto fester der Schlag. Die erste Runde am Tag bringt Taler, und wer Par oder besser spielt, holt den Pokal.');
    h += big('⛳', 'Runde spielen', G.best?.[me] ? `Deine Bestleistung: ${G.best[me]} Schläge` : 'Noch keine Runde gespielt', { ui: 'w:golf' }, 'pink');
    if (G.rec) h += `<div class="note">🏆 Platzrekord: <b>${G.rec.n} Schläge</b> von ${esc(G.rec.name)} (Tag ${G.rec.day})</div>`;
    return h;
  },
  dancegame(s, g) {
    const me = myKey(g), D = s.dance || {};
    let h = hero('🌙 Mondschein-Club', 'Tanzabend!', `Drück im Takt die Pfeiltasten (oder tippe auf die Spuren), wenn die Noten unten ankommen. Heute tanzen mit: ${W.dancers(s).map(npc).join(', ')}.`);
    for (const song of W.SONGS) { const b = D.best?.[me + ':' + song.id] || 0, r = b ? W.danceRank(song, b) : null; h += row({ gold: '🥇', silber: '🥈', bronze: '🥉' }[r] || '🎵', song.name, `${song.bpm} Schläge/min · Bestwert ${b}`, btn('💃 Tanzen', { ui: 'w:dance', song: song.id }, 'pink')); }
    return h;
  },
  cafe(s, g) {
    const me = myKey(g), C = s.cafe || {}, guest = W.cafeGuest(s);
    let h = hero('☕ Inselcafé', 'Was darf es sein?', 'Getränk wählen und selbst zubereiten: dreimal im richtigen Moment tippen, wenn der Zeiger im grünen Feld ist. Perfekt gemacht gibt es manchmal eine Insel-Melange mit Herz.');
    for (const [id, price] of W.DRINKS) h += row(itemIcon(id), ITEMS[id].name, `${price} Taler aus der Inselkasse`, btn('☕ Zubereiten', { ui: 'w:brew', k: id }, 'pink', s.money < price));
    h += `<div class="note">🎫 Stempelkarte: <b>${C.card?.[me] || 0}/${W.CARD_FULL}</b> (ein Stempel pro Tag) · Heute im Café: ${npc(guest)}</div>`;
    h += btn(`💬 Mit ${NPC_DATA[guest]?.name || guest} plaudern`, { t: 'cafe', op: 'chat' }, 'white', !!C.chat?.[me] && C.day === s.day);
    return h;
  },
  library(s, g) {
    const me = myKey(g), L = s.library || {}, b = W.bookToday(s), n = Object.keys(L.books || {}).length, tried = L.day === s.day && L.tried?.[me];
    let h = hero('📚 Bibliothek', `${n} von ${W.BOOKS.length} Büchern im Regal`, 'Jeden Tag liegt ein Rätselbuch aus. Wer das Rätsel löst, darf es ins Regal stellen. Abends von 17 bis 20 Uhr ist Lesestunde – dann hören die Nachbarn zu.');
    if (b) h += `<div class="note">📖 <b>„${esc(b[1])}“</b><br>${esc(b[2])}</div><div class="pattools">${b[3].map((o, i) => btn(esc(o), { t: 'library', op: 'answer', i }, 'white', tried)).join('')}</div>`;
    else h += '<div class="note">Alle Bücher stehen im Regal – was für eine Sammlung! 🎉</div>';
    h += btn('📖 Lesestunde', { t: 'library', op: 'read' }, 'pink', !W.readingHour(s) || (L.day === s.day && L.read));
    h += '<h3>Regal</h3><div class="pgrid">' + W.BOOKS.filter(x => L.books?.[x[0]]).map(x => `<div class="pcard"><span class="iic emo">📕</span><small>${esc(x[1])}</small></div>`).join('') + '</div>';
    return h;
  },
  radio(s) {
    const R = s.radio || {}, host = W.host(s);
    let h = hero(`📻 Kuschelfunk · ${npc(host)}`, 'Ihr hört: Inselradio!', W.radioNews(s).map(esc).join(' '));
    h += '<div class="pattools">' + W.RADIO_SONGS.map(([id, name]) => btn(`🎶 ${name}`, { ui: 'w:radio', song: id }, 'white')).join('') + (s.melody ? btn('🎹 Unsere Inselmelodie', { ui: 'w:radiomel' }, 'pink') : '') + '</div>';
    if (R.log?.length) h += '<h3>Wünsche</h3>' + R.log.slice(0, 5).map(e => row('💌', esc(e.name), `${W.RADIO_SONGS.find(x => x[0] === e.song)?.[1] || ''} · Tag ${e.day}`)).join('');
    return h;
  },
  guestbook(s, g) {
    const px = g.gbPx || '0'.repeat(64);
    let h = hero('📖 Gästebuch', 'Ein Gruß für die Insel', 'Schreib etwas hinein, such dir einen Stempel aus und mal ein kleines Bild (antippen = Kästchen an/aus). Einmal am Tag.');
    h += `<input id="gbtext" maxlength="80" placeholder="Liebe Grüße …" style="width:100%;font:inherit;border-radius:12px;border:2px solid var(--line);padding:8px">`;
    h += `<div class="pattools">${W.GB_STAMPS.map(st => btn(st, { ui: 'w:gbst', st }, g.gbSt === st ? 'pink' : 'white')).join('')}</div>`;
    h += `<div class="gbdraw" style="display:grid;grid-template-columns:repeat(8,22px);gap:2px;justify-content:center;margin:6px 0">${[...px].map((c, i) => `<button data-act='${JSON.stringify({ ui: 'w:gbpx', i })}' style="width:22px;height:22px;border-radius:4px;border:1px solid #e8dcc6;background:${c === '1' ? '#ff8fab' : '#fff'}"></button>`).join('')}</div>`;
    h += btn('✍️ Eintragen', { ui: 'w:gbsign' }, 'pink');
    h += '<h3>Einträge</h3>' + (s.guestbook || []).slice(0, 20).map(e => `<div class="row"><div class="ic">${e.st}</div><div class="tx"><b>${esc(e.name)}</b><small>${esc(e.text)} · Tag ${e.day}</small></div>${e.px ? `<div class="bt"><span style="display:grid;grid-template-columns:repeat(8,4px);gap:0">${[...e.px].map(c => `<i style="width:4px;height:4px;background:${c === '1' ? '#ff8fab' : 'transparent'}"></i>`).join('')}</span></div>` : ''}</div>`).join('');
    return h;
  },
  fashion(s, g) {
    const T = W.themeOf(s), me = myKey(g), F = s.fashion || {}, look = g.players?.[g.me]?.look || {}, p = W.lookPoints(T, look), last = F.last?.[me];
    let h = hero(`👗 Modenschau · ${T.icon} ${T.name}`, 'Auf den Laufsteg!', `Heute in der Jury: ${W.judges(s).map(npc).join(', ')}. Passend zum Thema kommen gut an: ${T.top.join(', ')} · Hüte: ${T.hat.join(', ')}. Dein Outfit änderst du unter ⚙️ ➜ Aussehen.`);
    h += `<div class="note">🪞 So passt dein Outfit gerade zum Thema: <b>${'💖'.repeat(Math.round(p / 2)) || '🤍'}</b></div>`;
    h += big('👠', 'Über den Laufsteg', F.day === s.day && F.walked?.[me] ? 'Heute schon gelaufen – morgen neues Thema' : 'einmal am Tag', { ui: 'w:walk' }, 'pink', F.day === s.day && !!F.walked?.[me]);
    if (last) h += `<div class="note">Zuletzt (Tag ${last.day}): ${last.by.map((id, i) => `${npc(id)} ${'⭐'.repeat(last.stars[i])}`).join(' · ')}</div>`;
    return h;
  },
  gardenc(s, g, tab) {
    if (tab === 'giant') {
      const G = s.giant || {};
      let h = hero('🎃 Riesengemüse', 'Wer zieht den Schwersten?', `Reife Kürbisse, Melonen und Kartoffeln wachsen mit Riesendünger weiter: jeden Tag erst gießen, dann düngen (Dünger in der Leiste wählen). Ab ${W.GIANT_MIN} Dünger-Tagen ist es ein Riese. Beim Kürbisfest (Herbst, Tag 5) wird gewogen!`);
      h += row(itemIcon('duenger'), 'Riesendünger', '400 Taler · in der Leiste auswählen und aufs reife Gemüse', btn('🪙 400', { t: 'buy', id: 'duenger', n: 1 }, 'pink', s.money < 400 || s.level < 2));
      const growing = Object.entries(s.tiles || {}).filter(([, t]) => t?.c && W.GIANT[t.c.k] && t.c.gs);
      if (growing.length) h += '<h3>Im Beet</h3>' + growing.map(([k, t]) => { const [x, z] = k.split(',').map(Number); return row(itemIcon(W.GIANT[t.c.k][0]), ITEMS[W.GIANT[t.c.k][0]].name, `${t.c.gs} Dünger-Tage · etwa ${fmt(W.giantKg(t.c.k, t.c.gs, x * 31 + z))} kg${t.c.gs >= W.GIANT_MIN ? ' · Riese!' : ''}`); }).join('');
      if (G.log?.length) h += '<h3>Schwerste Ernten</h3>' + G.log.slice(0, 5).map((e, i) => row(['🥇', '🥈', '🥉', '4.', '5.'][i], `${ITEMS[W.GIANT[e.k][0]].name}: ${fmt(e.kg)} kg`, `${esc(e.by)} · Tag ${e.day}`)).join('');
      if (G.rec) h += `<div class="note">🏆 Inselrekord: ${fmt(G.rec.kg)} kg</div>`;
      return h;
    }
    const r = W.gardenScore(s), last = s.gardenc?.last, days = 7 - ((s.day - 1) % 7);
    let h = hero('🌷 Gartenwettbewerb', `${'⭐'.repeat(r.stars)} – so steht es gerade`, `Am letzten Tag jeder Jahreszeit kommt die Jury. Punkte gibt es für blühende Blumen, viele Sorten und Farben und Deko zwischen den Beeten. ${days === 7 ? '<b>Heute war Wettbewerb!</b>' : `Noch ${days === 1 ? 'einen Tag' : days + ' Tage'}.`}`);
    h += row('🌸', `${r.flowers} blühende Blumen`, `${r.kinds} Sorten · ${r.cols} Farben · ${r.deco} Deko-Stücke bei den Beeten`, `<b>${r.pts} Punkte</b>`);
    if (last) h += `<div class="note">Letztes Urteil (Tag ${last.day}): ${'⭐'.repeat(last.stars)} mit ${last.pts} Punkten</div>`;
    return h;
  },
};
