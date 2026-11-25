// Fenster-Inhalte (Laden, Lager, Aufträge, Freunde, Einstellungen). Reines HTML, Klicks gehen an Callbacks.
import { CROPS, ITEMS, PLACE, UPGRADES, EMOTE_LIST, AREA_NAME, ACHIEVEMENTS, needXp, SEASONS, RECIPES, ALBUM, BUGS, FOSSILS, FISH, SHELLS, SEA, SOCIAL, STORY, DAILY, MUSEUM, MUSEUM_ALL, isFlower, PAVE, WEEKDAYS, weekday, TURNIP_STACK, DIY_IDS, FESTS, BIRTHDAYS, NPC_DATA } from './data.js';
import { settingsHtml } from './menu.js';
import { boxCap, AREAS } from './state.js';
import { itemIcon, fillIcons } from './icons.js';
import { price, upgradeInfo, seasonOf, hearts, halfDay, turnipSeller, turnipPrice, festOf, birthdayOf, contestOpen, daySea } from './state.js';
import { NPCS, letter, requestLine, npcLine } from './npc.js';
import { FURNITURE, WALLS, FLOORS } from './furni-data.js';
import { esc } from './world.js';
import { TRIP_KINDS, TRIP_PRICE, tripLayout } from './trips.js';
import { REEF_DECO, reefScore, castleScore, CASTLE_MAX, SHELL_IDS, beachKind, beachOpen, cableBuilt, TALES } from './extras2.js';
import { VISITORS, vhearts, MEL_NOTES, MEL_DEFAULT, WEATHER, WEEK_GOALS, catalogPrice, annivToday, cookDay, cookOpen, nightOpen, STALL_MAX } from './extras.js';
import {
  PROJECTS, ORDS, ORD_PRICE, ord, WARDROBE, SONGS, TOURS, MEDAL_SHOP, BOAT_PRICE, STREET_SHOPS, TROPIC_HUT, shopHours, shopOpen, concertNow,
  homeScore, hhaRank, HHA_RANKS, islandScore, buyPrice, fmt, hourOf,
} from './newleaf.js';

const $ = id => document.getElementById(id);
const lines = {}; // Sprüche/Briefe einmal würfeln, damit sie beim Neuzeichnen gleich bleiben
const money = n => `<span class="money">🪙 ${n.toLocaleString('de-DE')}</span>`;
const lvTag = l => `<span class="lv">ab Lv ${l}</span>`;
const pips = (l, max) => `<span class="pips">${'●'.repeat(l)}${'○'.repeat(Math.max(0, max - l))}</span>`;
const time = s => s >= 60 ? `${Math.round(s / 6) / 10} Min` : `${s} s`;

export const TABS = {
  shop: [['seeds', '🌷 Samen'], ['trees', '🌳 Bäume'], ['hof', '🐔 Hof'], ['food', '🥛 Zutaten'], ['furn', '🛋️ Möbel'], ['deco', '🏮 Deko'], ['farm', '🏡 Haus'], ['tools', '🛠️ Werkzeug'], ['goods', '💎 Preise']],
  orders: [['quests', '📜 Quests'], ['orders', '💬 Wünsche'], ['friends', '🏘️ Nachbarn'], ['album', '📖 Sammelbuch'], ['goals', '🏆 Erfolge'], ['stats', '📊 Insel']],
  mayor: [['projects', '🏗️ Projekte'], ['areas', '🗺️ Erweiterungen'], ['ords', '📜 Verordnungen'], ['house', '🏡 Haus & Kredit'], ['hha', '🛋️ Wohnwert'], ['stars', '⭐ Inselbewertung']],
  garden: [['seeds', '🌱 Samen'], ['plants', '🌳 Pflanzen']],
  settings: [['menu', '⚙️ Menü'], ['options', '🎨 Optionen'], ['help', '❓ Hilfe']],
  piano: [['keys', '🎹 Klavier'], ['song', '🎶 Inselmelodie']],
  news: [['paper', '📰 Zeitung'], ['week', '🤝 Wochenziele']],
  book: [['pages', '📸 Momente'], ['photos', '🖼️ Fotos'], ['anniv', '🎂 Jahrestage']],
};
const TITLES = { cable: '🚡 Seilbahn', reef: '🪸 Korallenriff', castle: '🏰 Sandburg', visitor: '💬 Besuch', piano: '🎹 Klavier & Inselmelodie', patterns: '🎨 Muster-Editor', night: '🏮 Nachtmarkt', stall: '🏪 Tauschstand', news: '📰 Inselbote', book: '📸 Fotobuch', catalog: '📦 Möbelkatalog', chest: '🧰 Lagerkiste', give: '🎁 Etwas schenken', mayor: '🏛️ Rathaus', fund: '🏗️ Baustelle', boat: '⛵ Käpt\'n Flossis Boot', boatback: '⛵ Käpt\'n Flossis Boot', tailor: '🧵 Schneiderei Wollknäuel', garden: '🌱 Gärtnerei Knolle', club: '🌙 Mondschein-Club', hut: '🦜 Kikis Tauschhütte', phone: '📱 Inselhandy', map: '🗺️ Inselkarte', turnip: '📈 Rübenbörse', designer: '🧱 Insel-Designer', recipes: '🔨 Rezepte', shop: '🛒 Krämerladen', sell: '🎒 Taschen & Verkauf', orders: '📋 Inselbuch', museum: '🏛️ Museum', friends: '👥 Freunde', emotes: '😊 Emotes', settings: '⚙️ Menü', craft: '🔨 Werkbank', cook: '🍳 Gartenküche', together: '💞 Zusammen', mail: '💌 Briefkasten', contest: '🏆 Turnierstand', diary: '📔 Kuschel-Tagebuch', fests: '🎉 Festkalender', letter: '✍️ Brief schreiben' };

function row(icon, title, sub, buttons, locked) {
  return `<div class="row${locked ? ' locked' : ''}"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
}
// Gegenstand als Kachel mit eigenem Bild (wird von icons.js nachgeladen)
const itemCell = (id, n, buttons) => `<div class="icell" title="${esc(ITEMS[id].name)}">${itemIcon(id)}<b>${esc(ITEMS[id].name)}</b><span class="icn">${n}×</span><div class="ib">${buttons}</div></div>`;
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;

function upgradeRow(s, id) {
  const u = UPGRADES[id], i = upgradeInfo(s, id);
  const sub = `${pips(i.level, i.max)} Jetzt: ${u.desc(i.level)}` + (i.done ? '' : `<br>➜ ${u.desc(i.level + 1)}`);
  if (i.done) return row(u.icon, u.name, sub, '<span class="lv">MAX</span>');
  const locked = i.req > s.level;
  return row(u.icon, u.name + (locked ? lvTag(i.req) : ''), sub, btn(`🪙 ${i.cost}`, { t: 'upgrade', id, lvl: i.level }, 'pink', locked || s.money < i.cost), locked);
}

function placeRow(s, id) {
  const p = PLACE[id], locked = p.lvl > s.level, have = s.inv[id] || 0;
  let sub = p.desc || '';
  if (p.kind === 'deco') sub = 'Zum Dekorieren eurer Insel';
  sub += have ? ` · <b>${have}× im Lager</b>` : '';
  return row(p.icon, p.name + (locked ? lvTag(p.lvl) : ''), sub, btn(`🪙 ${p.buy}`, { t: 'buy', id, n: 1 }, '', locked || s.money < p.buy), locked);
}

const SHOP = {
  seeds(s) {
    const sea = seasonOf(s.day);
    let h = `<div class="note">Samen kaufen ➜ unten in der Leiste wählen ➜ irgendwo auf den Rasen pflanzen ➜ gießen 💧 (gegossen wachsen sie dreimal so schnell). Blumen blühen nach dem Pflücken immer wieder nach. Jetzt ist ${SEASONS[sea][1]} ${SEASONS[sea][0]}.</div>`;
    for (const [k, c] of Object.entries(CROPS)) {
      if (c.garden || c.wild) continue;
      if (k === 'weizen') h += '<h3>🥕 Gemüse</h3>';
      const id = 's_' + k, locked = c.lvl > s.level, have = s.inv[id] || 0, ok = c.sea.includes(sea);
      const sub = `${ok ? '<b style="color:#5aa84a">✓ Saison</b> · ' : ''}${c.sea.map(x => SEASONS[x][1]).join('')} · Wächst in ${time(c.grow)}${c.regrow ? (isFlower(k) ? ' · blüht immer wieder' : ' · trägt immer wieder') : ''}${c.yield ? ` · ${c.yield}× Ernte` : ''} · Verkauf ${money(price(s, k))}${have ? ` · <b>${have} Samen</b>` : ''}`;
      h += row(c.icon, c.name + (locked ? lvTag(c.lvl) : ''), sub,
        btn(`1× 🪙${c.seed}`, { t: 'buy', id, n: 1 }, '', locked || s.money < c.seed) + btn(`10× 🪙${c.seed * 10}`, { t: 'buy', id, n: 10 }, '', locked || s.money < c.seed * 10), locked);
    }
    return h;
  },
  trees(s) {
    let h = '<div class="note">Obstbäume tragen alle zwei Tage frisches Obst 🍎 – einfach davorstellen und pflücken. Kaufen ➜ in der Leiste wählen ➜ auf den Rasen setzen.</div>';
    for (const [id, p] of Object.entries(PLACE)) if (p.kind === 'producer' && p.buy && !p.farm) h += placeRow(s, id);
    return h;
  },
  hof(s) { // Bauernhof-Ecke
    let h = '<div class="note">🐔 Hühnerstall und 🐄 Kuhweide aufstellen ➜ jeden Tag füttern (Weizen, Kartoffeln, Karotten oder Äpfel aus eurem Garten) ➜ streicheln. Gefütterte Tiere legen Eier und geben Milch für die Küche – glückliche Tiere (💗💗💗) geben sogar mehr, und manchmal gibt es eine Überraschung!</div>';
    for (const [id, p] of Object.entries(PLACE)) if (p.farm) h += placeRow(s, id);
    const farms = Object.values(s.obj || {}).filter(o => PLACE[o?.k]?.farm);
    if (farms.length) h += '<h3>🏡 Eure Tiere</h3>' + farms.map(o => row(PLACE[o.k].icon, PLACE[o.k].name, `${o.fed === s.day ? '🌾 heute gefüttert' : '😋 hat Hunger'} · ${o.pet === s.day ? '🤗 gestreichelt' : 'möchte gestreichelt werden'} · ${'💗'.repeat(Math.ceil(Math.min(10, o.h || 0) / 2)) || '🤍'}`, '')).join('');
    return h;
  },
  food(s) {
    let h = '<div class="note">Zutaten für die Gartenküche 🍳 – zusammen mit eurem Obst, Gemüse und Fisch werden daraus leckere Gerichte.</div>';
    for (const id of ['mehl', 'zucker', 'milch', 'ei']) {
      const it = ITEMS[id];
      h += row(it.icon, it.name, `${s.inv[id] || 0} in der Tasche`, btn(`1× 🪙${it.buy}`, { t: 'buy', id, n: 1 }, '', s.money < it.buy) + btn(`5× 🪙${it.buy * 5}`, { t: 'buy', id, n: 5 }, '', s.money < it.buy * 5));
    }
    return h;
  },
  farm(s) {
    const i = upgradeInfo(s, 'house');
    return `<div class="note">Mehr Platz für Möbel: Ein größeres Haus hat ein größeres Zimmer. Den Ausbau macht jetzt das 🏛️ <b>Rathaus</b> (Tab „Haus & Kredit“) – bezahlt wird bequem über den Hauskredit.</div>`
      + row('🏡', UPGRADES.house.desc(i.level), `${pips(i.level, i.max)}${s.loan ? ` · Hauskredit offen: ${money(s.loan)}` : ''}`, '');
  },
  tools(s) {
    let h = `<div class="note">Bessere Werkzeuge: Die Gießkanne gießt mehr Blumen auf einmal (${AREA_NAME.slice(1).join(' ➜ ')}), mit der besseren Angel beißen seltene Fische.</div>`;
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'tools') h += upgradeRow(s, id);
    const ws = s.inv.neopren > 0;
    h += row('🤿', 'Neoprenanzug' + (ws ? ' <span class="lv">✓ gekauft</span>' : ''), 'Damit könnt ihr alle im Meer schwimmen und bei Luftblasen 🫧 nach Meerestieren tauchen.', ws ? '' : btn('🪙 3000', { t: 'buy', id: 'neopren', n: 1 }, 'pink', s.money < 3000));
    for (const [id, price, lv, text] of [['drache', 1800, 1, 'Am Strand steigen lassen: Im richtigen Moment ziehen, wenn eine Böe kommt. Frühlings- und Herbst-Samstage: Drachenfest!'], ['fahrrad', 4500, 2, 'Fast doppelt so schnell über die Insel – in der Leiste wählen und auf- oder absteigen.']]) {
      const got = s.inv[id] > 0, lk = s.level < lv;
      h += row(itemIcon(id), ITEMS[id].name + (got ? ' <span class="lv">✓ gekauft</span>' : lk ? lvTag(lv) : ''), text, got ? '' : btn(`🪙 ${price}`, { t: 'buy', id, n: 1 }, 'pink', lk || s.money < price));
    }
    const bs = s.inv.baumschaufel > 0, bl = s.level < 2;
    h += row(itemIcon('baumschaufel'), 'Baumschaufel' + (bs ? ' <span class="lv">✓ gekauft</span>' : bl ? lvTag(2) : ''), 'Gräbt Bäume und Palmen samt Wurzelballen aus – in der Leiste wählen und woanders auf den Rasen (Palmen auch auf Sand) setzen.', bs ? '' : btn('🪙 2800', { t: 'buy', id: 'baumschaufel', n: 1 }, 'pink', bl || s.money < 2800), bl && !bs);
    return h;
  },
  goods(s) {
    let h = '<div class="note">Gute Beziehungen zum Krämerladen: Er zahlt euch mehr für eure Sachen.</div>';
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'goods') h += upgradeRow(s, id);
    return h;
  },
  furn(s) {
    const cats = { sitzen: '🪑 Sitzen', tische: '🍽️ Tische', betten: '🛏️ Schlafen & Schränke', licht: '💡 Licht', kueche: '🍳 Küche', teppiche: '🟫 Teppiche', pflanzen: '🪴 Pflanzen', deko: '🧸 Deko', wand: '🖼️ Wand' };
    let h = '<div class="note">Möbel fürs Haus: kaufen ➜ ins Haus gehen 🚪 ➜ 🔨 Baumodus öffnen ➜ Möbel wählen ➜ aufs Feld tippen. „Abbauen“ packt sie wieder ein. Manche Möbel gibt es nur an der Werkbank.</div>';
    const sw = (kind, list) => `<div class="swatches">${list.map(([id, l, c]) => `<button title="${l}" style="background:${c};width:44px;height:44px;border-radius:12px" data-act='${JSON.stringify({ t: 'hstyle', kind, id })}' class="${s.home[kind] === id ? 'on' : ''}"></button>`).join('')}</div>`;
    h += `<div class="row"><div class="ic">🖌️</div><div class="tx"><b>Tapete <span class="lv">🪙 350</span></b><small>${WALLS.find(w => w[0] === s.home.wall)?.[1] || ''}</small>${sw('wall', WALLS)}</div></div>`;
    h += `<div class="row"><div class="ic">🪵</div><div class="tx"><b>Boden <span class="lv">🪙 350</span></b><small>${FLOORS.find(w => w[0] === s.home.floor)?.[1] || ''}</small>${sw('floor', FLOORS)}</div></div>`;
    for (const [c, label] of Object.entries(cats)) {
      h += `<h3>${label}</h3>`;
      for (const [id, f] of Object.entries(FURNITURE)) {
        if (f.cat !== c || f.rare) continue;
        const locked = f.lvl > s.level, have = s.inv[id] || 0;
        h += row(itemIcon(id), f.name + (locked ? lvTag(f.lvl) : ''), `${f.w}×${f.d}${f.sit ? ' · zum Sitzen' : ''}${f.bed ? ' · zum Schlafen' : ''}${f.store ? ' · Lagerkiste für alle' : ''}${f.craft ? (f.buy ? ' · auch an der Werkbank' : ' · nur an der Werkbank') : ''}${have ? ` · <b>${have}× in der Tasche</b>` : ''}`,
          f.buy ? btn(`🪙 ${f.buy}`, { t: 'buy', id, n: 1 }, '', locked || s.money < f.buy) : '<span class="lv">🔨</span>', locked);
      }
    }
    return h;
  },
  deco(s) {
    let h = '<div class="note">Macht eure Insel schön! Kaufen ➜ in der Leiste wählen ➜ aufstellen. Drehen: in die gewünschte Richtung schauen. Aufheben mit der Hand ✋.</div>';
    for (const [id, p] of Object.entries(PLACE)) if (p.kind === 'deco' && p.buy && !p.garden) h += placeRow(s, id);
    return h;
  },
};

const PANELS = {
  shop: (s, g, tab) => SHOP[tab](s),
  sell(s) {
    const sellable = Object.entries(s.inv).filter(([id, n]) => n > 0 && price(s, id) > 0);
    const total = sellable.filter(([id]) => !ITEMS[id].turnip).reduce((t, [id, n]) => t + price(s, id) * n, 0);
    let h = sellable.length ? `<div class="row"><div class="ic">💰</div><div class="tx"><b>Alles verkaufen</b><small>${sellable.length} Sorten</small></div><div class="bt">${btn(`+🪙 ${total}`, { t: 'sellAll' }, 'pink')}</div></div>` : '<div class="note">Noch nichts zu verkaufen. Schüttelt Bäume, sammelt Muscheln, angelt! 🍎🐚🎣</div>';
    for (const [id, n] of sellable) {
      const p = price(s, id);
      h += row(itemIcon(id), `${ITEMS[id].name} <span class="lv">${n}×</span>`, `je ${money(p)}`, btn('1', { t: 'sell', id, n: 1 }, 'white') + btn(`Alle +${p * n}`, { t: 'sell', id, n }));
    }
    const rest = Object.entries(s.inv).filter(([id, n]) => n > 0 && !(price(s, id) > 0) && ITEMS[id]);
    if (rest.length) {
      h += '<h3>Behalten</h3>';
      for (const [id, n] of rest) h += row(itemIcon(id), `${ITEMS[id].name} <span class="lv">${n}×</span>`, ITEMS[id].seed ? 'Samen' : ITEMS[id].place ? 'Zum Aufstellen' : ITEMS[id].furn ? 'Möbel fürs Haus' : ITEMS[id].turnip ? 'Heute kauft der Laden keine Rüben (sonntags nie)' : id === 'faule_ruebe' ? 'Leider verfault …' : 'Zutat', '');
    }
    return h;
  },
  orders(s, g, tab) {
    if (tab === 'goals') {
      const done = ACHIEVEMENTS.filter(a => s.ach[a.id]).length;
      let h = `<div class="note">Gemeinsame Ziele – jedes bringt eine Belohnung. Geschafft: <b>${done}/${ACHIEVEMENTS.length}</b></div><div class="bar"><i style="width:${done / ACHIEVEMENTS.length * 100}%"></i></div><br>`;
      for (const a of ACHIEVEMENTS) {
        const ok = s.ach[a.id];
        h += `<div class="row${ok ? ' done' : ' locked'}"><div class="ic">${ok ? a.icon : '🔒'}</div><div class="tx"><b>${a.name}</b><small>${a.desc}${ok ? ` · geschafft an Tag ${ok}` : ''}</small></div><div class="bt">${money(a.reward)}</div></div>`;
      }
      return h;
    }
    if (tab === 'quests') {
      const q = STORY[s.quest.i], rw = x => [x.money ? money(x.money) : '', ...Object.entries(x.items || {}).map(([id, n]) => `${n}× ${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`)].filter(Boolean).join(' · ');
      let h = `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">Kapitel ${Math.min(s.quest.i + 1, STORY.length)}/${STORY.length}</span><b>📜 Insel-Geschichte</b></div>`;
      h += q ? `<h3>${q.title}</h3><p>${q.desc}</p><div class="bar big"><i style="width:${Math.min(1, s.quest.p / q.n) * 100}%"></i><span>${Math.min(s.quest.p, q.n)}/${q.n}</span></div>
        <div class="qh-rw">🎁 ${rw(q)}</div>${s.quest.done ? btn('Belohnung abholen 🎁', { t: 'claim', q: 'story' }, 'pink glow') : ''}`
        : '<h3>🎉 Geschichte abgeschlossen!</h3><p>Ihr habt alle Kapitel geschafft. Ihr seid echte Insel-Stars!</p>';
      h += '</div><h3>☀️ Aufgaben für heute</h3><div class="note">Jeden Morgen gibt es drei neue Aufgaben.</div>';
      s.daily.forEach((d, i) => {
        const [title, , n, reward] = DAILY[d.i];
        h += `<div class="row${d.claimed ? ' done' : ''}"><div class="ic">${d.claimed ? '✅' : d.done ? '🎁' : '⭐'}</div><div class="tx"><b>${title}</b><small>Belohnung ${money(reward)} + 10 ⭐</small><div class="bar"><i style="width:${Math.min(1, d.p / n) * 100}%"></i></div></div>
          <div class="bt">${d.claimed ? '<span class="lv">erledigt</span>' : d.done ? btn('Abholen', { t: 'claim', q: i }, 'pink') : `<span class="lv">${Math.min(d.p, n)}/${n}</span>`}</div></div>`;
      });
      return h;
    }
    if (tab === 'friends') {
      let h = '<div class="note">Plaudert jeden Tag mit euren Nachbarn und macht ihnen Geschenke – je mehr Herzen, desto mehr verraten sie über sich (und schicken euch Briefe 💌).</div>';
      for (const [id, N] of Object.entries(NPCS)) {
        if (N.visitor) continue;
        const hh = hearts(s, id), n = s.npc[id] || {};
        const lk = hh >= 2 ? N.likes.map(i => ITEMS[i].icon).join(' ') : '❔❔', lv = hh >= 4 ? N.loves.map(i => ITEMS[i].icon).join(' ') : '❔';
        h += `<div class="row"><div class="ic">${N.icon}</div><div class="tx"><b>${N.name} <span class="lv">${N.role}</span></b><small>${N.bio}</small>
          <small>💕 ${'❤️'.repeat(hh)}${'🤍'.repeat(10 - hh)}</small><small>Mag: ${lk} · Liebt: ${lv}${n.talk === s.day ? ' · 💬 heute geplaudert' : ''}${n.gift === s.day ? ' · 🎁 beschenkt' : ''}</small></div></div>`;
      }
      return h;
    }
    if (tab === 'album') {
      const n = Object.keys(s.album).filter(k => !['flaschenpost', 'schatz', 'sternsplitter'].includes(k)).length, all = ALBUM.fish.length + ALBUM.sea.length + ALBUM.bug.length + ALBUM.fossil.length + ALBUM.shell.length + ALBUM.gem.length + ALBUM.mush.length;
      const where = { river: '🏞️ Fluss', sea: '🌊 Meer', pond: '🪷 Teich' };
      const info = { ...Object.fromEntries(FISH.map(f => [f[0], `${where[f[6]]} ${(f[5] || []).map(x => SEASONS[x][1]).join('') || ''}`])), ...Object.fromEntries(SHELLS.map(f => [f[0], '🏖️ Strand'])), ...Object.fromEntries(SEA.map(f => [f[0], '🤿 Tauchen'])),
        ...Object.fromEntries(BUGS.map(b => [b[0], b[5] === 'tropic' ? '🏝️ Tropeninsel' : b[4].map(x => SEASONS[x][1]).join('') + (b[5] === 'night' ? ' 🌙' : b[5] === 'day' ? ' ☀️' : '')])),
        ...Object.fromEntries(FOSSILS.map(f => [f[0], 'Ausgraben'])), ...Object.fromEntries(ALBUM.gem.map(k => [k, k === 'goldnugget' ? 'Felsen & Höhle' : '💎 Kristallhöhle'])), ...Object.fromEntries(ALBUM.mush.map(k => [k, '🌲 Kiefernwald'])) };
      const sec = (t, ids) => `<h3>${t}</h3><div class="album">${ids.map(id => s.album[id]
        ? `<div class="got" title="${ITEMS[id].name}"><span>${itemIcon(id)}</span><small>${ITEMS[id].name}</small><i>${s.album[id]}×</i></div>`
        : `<div title="${info[id] || ''}"><span>❔</span><small>${info[id] || '???'}</small></div>`).join('')}</div>`;
      return `<div class="note">Alles, was ihr fangt und ausgrabt, wird hier eingetragen. Gesammelt: <b>${n}/${all}</b></div><div class="bar"><i style="width:${n / all * 100}%"></i></div>` +
        sec('🎣 Fische', ALBUM.fish) + sec('🤿 Meerestiere', ALBUM.sea) + sec('🦋 Insekten', ALBUM.bug) + sec('🦴 Funde', ALBUM.fossil) + sec('🐚 Muscheln', ALBUM.shell) + sec('💎 Edelsteine', ALBUM.gem) + sec('🍄 Pilze', ALBUM.mush);
    }
    if (tab === 'stats') {
      const st = s.stats, pct = Math.round(s.xp / needXp(s.level) * 100);
      const line = (i, l, v) => row(i, l, '', `<b>${v}</b>`);
      return line('🏝️', esc(s.name), `Tag ${s.day}`) + line('⭐', 'Insel-Level', `${s.level} (${pct}%)`) + line('🍎', 'Obst gepflückt', st.fruit || 0) + line('🌷', 'Blumen & Gemüse geerntet', st.harvested) + line('🎣', 'Fische gefangen', st.fish) +
        line('🐚', 'Muscheln gesammelt', st.shells || 0) + line('🏛️', 'Im Museum', `${Object.keys(s.museum || {}).length}/${MUSEUM_ALL.length}`) + line('💬', 'Wünsche erfüllt', st.orders) + line('💰', 'Taler verdient', st.earned.toLocaleString('de-DE')) + line('🏮', 'Aufgestellte Dinge', Object.keys(s.obj).length);
    }
    let h = '<div class="note">Eure Nachbarn wünschen sich Dinge von der Insel – sie zahlen extra und mögen euch danach noch mehr! Alle 3 Tage kommen neue Wünsche.</div>';
    s.orders.forEach((o, i) => {
      const have = s.inv[o.item] || 0, it = ITEMS[o.item], N = NPCS[o.npc];
      const say = N ? (lines[o.day + o.item + o.npc] ||= requestLine(o.npc, it.name, o.n)) : '';
      h += row(N ? `<span title="${N.name}">${N.icon}</span>` : it.icon, `${N ? N.name + ': ' : ''}${o.n}× ${it.icon} ${it.name}`, (say ? `„${esc(say)}“<br>` : '') + `Ihr habt ${Math.min(have, o.n)}/${o.n} · Lohn ${money(o.reward)} + ${o.xp} ⭐<div class="bar"><i style="width:${Math.min(1, have / o.n) * 100}%"></i></div>`, btn('Abgeben', { t: 'order', i, item: o.item, n: o.n }, 'pink', have < o.n));
    });
    return h;
  },
  friends(s, g) {
    const link = g.code ? `${location.origin}${location.pathname}?join=${g.code}` : '';
    let h = g.code
      ? `<div class="row"><div class="ic">💌</div><div class="tx"><b style="font-size:28px;letter-spacing:5px">${esc(g.code)}</b><small>Schick diesen Code (oder den Link) an deinen Lieblingsmenschen. Sie öffnet das Spiel und gibt ihn bei „Mit Code beitreten“ ein.</small></div>
         <div class="bt"><button class="btn small pink" data-ui="share">Link teilen</button><button class="btn small white" data-ui="copy">Kopieren</button></div></div>`
      : `<div class="note">${g.role === 'host' ? '⏳ Einladen gerade nicht möglich (keine Verbindung zum Vermittlungs-Server). Spielen geht trotzdem!' : ''}</div>`;
    h += `<input type="hidden" id="invlink" value="${esc(link)}">`;
    for (const p of Object.values(g.players)) {
      const kick = (p.id !== g.me ? btn('🎁 Geben', { ui: 'give', id: p.id }, 'pink') + btn('Hinbeamen ✨', { ui: 'goto', id: p.id }) : '') + (g.role === 'host' && p.id !== g.me ? btn('Entfernen', { ui: 'kick', id: p.id }, 'white') : '');
      h += row(`<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${esc(p.look?.topColor || '#ccc')};border:3px solid ${esc(p.look?.hairColor || '#fff')}"></span>`, esc(p.name) + (p.id === 'h' ? ' 👑' : '') + (p.id === g.me ? ' (du)' : ''), p.id === 'h' ? 'Host – die Insel wird auf diesem Gerät gespeichert' : 'Gast – bekommt automatisch eine Kopie der Insel', kick);
    }
    h += '<div class="note">Jede/r hat eine eigene Tasche – mit „🎁 Geben“ schenkt ihr euch Sachen, oder ihr legt sie in die 🧰 Lagerkiste im Haus. Geteilt sind Taler, Museum und Fortschritt. Jede/r bekommt eine Sicherheitskopie und kann die Insel später auch selbst hosten.</div>';
    return h;
  },
  chest(s) {
    const cap = boxCap(s), used = Object.keys(s.box || {}).length;
    let h = `<div class="note">🧰 Die Kiste gehört allen auf der Insel – praktisch zum Tauschen. Platz: <b>${used}/${cap}</b> Sorten (jede weitere Kiste im Haus = 40 mehr).</div>`;
    const inBox = Object.entries(s.box || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
    h += '<h3>In der Kiste</h3>';
    h += inBox.length ? `<div class="itemgrid">${inBox.map(([id, n]) => itemCell(id, n, btn('1', { t: 'unstash', item: id, n: 1 }, 'white') + (n > 1 ? btn('Alle', { t: 'unstash', item: id, n }) : ''))).join('')}</div>` : '<div class="note">Noch leer.</div>';
    const mine = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id]);
    h += '<h3>Deine Tasche</h3>';
    h += mine.length ? `<div class="itemgrid">${mine.map(([id, n]) => itemCell(id, n, btn('1', { t: 'stash', item: id, n: 1 }, 'white') + (n > 1 ? btn('Alle', { t: 'stash', item: id, n }) : ''))).join('')}</div>` : '<div class="note">Deine Tasche ist leer.</div>';
    return h;
  },
  give(s, g) {
    const p = g.players[g.giveTo];
    if (!p) return '<div class="note">Dein Lieblingsmensch ist gerade nicht auf der Insel.</div>';
    const mine = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id]);
    let h = `<div class="note">Was möchtest du <b>${esc(p.name)}</b> schenken? Es landet sofort in ihrer/seiner Tasche.</div>`;
    h += mine.length ? `<div class="itemgrid">${mine.map(([id, n]) => itemCell(id, n, btn('1', { t: 'give', to: p.id, item: id, n: 1 }, 'white') + (n > 1 ? btn('Alle', { t: 'give', to: p.id, item: id, n }, 'pink') : ''))).join('')}</div>` : '<div class="note">Deine Tasche ist leer.</div>';
    return h;
  },
  emotes() {
    return `<div class="emogrid">${EMOTE_LIST.map(([e, l]) => `<button data-ui="emote" data-e="${e}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>`;
  },
  together(s, g) {
    const p = g.players[g.together];
    if (!p) return '<div class="note">Dein Lieblingsmensch ist gerade nicht in der Nähe.</div>';
    return `<div class="note">Was möchtest du mit <b>${esc(p.name)}</b> machen?</div><div class="emogrid">${Object.entries(SOCIAL).filter(([k]) => k !== 'found').map(([k, [e, l]]) => `<button data-ui="soc" data-k="${k}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>`;
  },
  phone(s, g) {
    const ready = s.orders.filter(o => (s.inv[o.item] || 0) >= o.n).length + (s.quest.done ? 1 : 0) + s.daily.filter(d => d.done && !d.claimed).length;
    const canMuseum = MUSEUM_ALL.filter(id => !s.museum?.[id] && s.inv[id] > 0).length;
    const apps = [['map', '🗺️', 'Karte', '#7fd3a8'], ['shop', '🛍️', 'Bestellen', '#ffb36b'], ['sell', '🎒', 'Taschen', '#f7a8c4'], ['quests', '📜', 'Inselbuch', '#ffd66b', ready],
      ['album', '📖', 'Sammelbuch', '#9fd0ff'], ['museum', '🏛️', 'Museum', '#b8c8d8', canMuseum], ['recipes', '🔨', 'Rezepte', '#e3b47c'], ['turnip', '📈', 'Rübenkurs', '#c9b2ff', turnipSeller(s) ? '!' : 0],
      ['build', '🔨', 'Bauen', '#f4a582'], ['designer', '🧱', 'Wege', '#e8b896'], ['friends', '👥', 'Freunde', '#a8e2cf'], ['goals', '🏆', 'Erfolge', '#ffe08a'], ['emotes', '😊', 'Gefühle', '#ffc8dc'],
      ['camera', '📷', 'Kamera', '#c4ccd4'], ['sky', '🔭', 'Himmel', '#7f8fd8'], ['diary', '📔', 'Tagebuch', '#ffb7c8'], ['fests', '🎉', 'Feste', '#ffd09a', festOf(s.day) || birthdayOf(s.day) ? '!' : 0],
      ['news', '📰', 'Zeitung', '#f2e6c9', s.paper?.day === s.day && g.readPaper !== s.day ? '1' : 0], ['book', '📸', 'Fotobuch', '#ffcfb8'], ['patterns', '🎨', 'Muster', '#e9c6ff'], ['piano', '🎹', 'Melodie', '#c9e4ff'], ['catalog', '📦', 'Katalog', '#cfe3c4'], ['settings', '⚙️', 'Optionen', '#d8cfc2']];
    const hour = 6 + s.dayTime * 18, hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    return `<div class="phone-top"><b>${s.real ? new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : `${hh}:${String(mm).padStart(2, '0')}`}</b><span>${WEEKDAYS[weekday(s.day)]} · ${esc(s.name)}</span></div>
      <div class="apps">${apps.map(([id, ic, l, c, dot]) => `<button data-ui="app" data-app="${id}"><span class="ai" style="background:${c}">${ic}${dot ? `<i>${dot}</i>` : ''}</span><small>${l}</small></button>`).join('')}</div>`;
  },
  map(s) {
    return `<div class="mapwrap"><canvas id="mapcv" width="480" height="480"></canvas></div>
      <div class="note">Tippe auf die Karte – deine Figur läuft dorthin. 🔴 du · 🟣 Mitspieler · Tiere = Nachbarn</div>`;
  },
  designer(s, g) {
    const cur = g.pathType || 'erde';
    return `<div class="note">Verlegt eigene Wege auf der Insel! Wegart wählen ➜ unten das Designer-Werkzeug 🧱 nehmen ➜ auf Rasen oder Sand tippen. Nochmal auf dieselbe Stelle = Weg entfernen. Auf Wegen wachsen keine Blumen und kein Unkraut.</div>
      <div class="emogrid">${Object.entries(PAVE).map(([k, P]) => `<button data-ui="pave" data-k="${k}" class="${cur === k ? 'on' : ''}"><span style="display:block;width:46px;height:46px;margin:0 auto 4px;border-radius:10px;background:${P.col};box-shadow:inset 0 -4px 0 rgba(0,0,0,.12)"></span><small>${P.name}</small></button>`).join('')}
      <button data-ui="pave" data-k="none" class="${cur === 'none' ? 'on' : ''}"><span>🧹</span><small>Nur entfernen</small></button></div>
      <div class="note">Verlegt: <b>${Object.keys(s.paths || {}).length}</b> Wegstücke</div>`;
  },
  turnip(s) {
    const wd = weekday(s.day), T = s.turnip, have = s.inv.ruebe || 0, now = turnipPrice(s);
    let h = '';
    if (turnipSeller(s) && T) {
      h += `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">Sonntag bis 12 Uhr</span><b>🐰 Hoppel</b></div><h3>„Frische Rüben! Heute nur ${T.buy} Taler das Stück!“</h3>
        <p>Kauft Rüben und verkauft sie diese Woche im Krämerladen. Die Preise ändern sich zweimal am Tag – mit Glück zahlt er ein Vielfaches! Aber Achtung: Am nächsten Sonntag sind übrige Rüben verfault.</p>
        <div class="bt" style="display:flex;gap:6px;flex-wrap:wrap">${[10, 50, 100].map(n => btn(`${n}× 🪙${(T.buy * n).toLocaleString('de-DE')}`, { t: 'buyTurnip', n }, 'pink', s.money < T.buy * n)).join('')}</div></div>`;
    } else h += `<div class="note">🐰 Hoppel verkauft jeden <b>Sonntag von 6 bis 12 Uhr</b> am Dorfplatz Rüben. Heute ist ${WEEKDAYS[wd]}.</div>`;
    if (T) {
      const cur = wd === 0 ? -1 : halfDay(s), max = Math.max(T.buy, ...T.p.filter((v, i) => i <= cur)) * 1.15;
      const bars = T.p.map((v, i) => { const known = i <= cur, hgt = known ? Math.max(6, v / max * 100) : 18;
        return `<div class="tb${i === cur ? ' now' : ''}${known && v > T.buy ? ' up' : ''}"><i style="height:${hgt}%">${known ? v : '?'}</i><small>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][Math.floor(i / 2)]}${i % 2 ? ' ☾' : ' ☀'}</small></div>`; }).join('');
      h += `<h3>📈 Kurs dieser Woche <span class="lv">Einkauf ${T.buy}</span></h3><div class="tchart"><div class="tline" style="bottom:${T.buy / max * 100}%"></div>${bars}</div>`;
    }
    h += row('🍠', `Eure Rüben <span class="lv">${have}×</span>`, have ? (now ? `Jetzt zahlt der Laden ${money(now)} pro Rübe = ${money(now * have)} (${now >= (T?.buy || 0) ? 'Gewinn' : 'Verlust'})` : 'Heute kauft der Laden keine Rüben.') : 'Ihr habt gerade keine Rüben.', have && now ? btn(`Alle verkaufen +${now * have}`, { t: 'sell', id: 'ruebe', n: have }, 'pink') : '');
    return h + `<div class="note">Bisheriger Börsen-Gewinn: ${money(s.stats.turnipProfit || 0)}</div>`;
  },
  recipes(s) {
    const known = DIY_IDS.filter(k => s.recipes?.[k]).length;
    let h = `<div class="note">Bauen könnt ihr an der 🔨 Werkbank neben eurem Haus, kochen in der 🍳 Gartenküche. Baupläne gelernt: <b>${known}/${DIY_IDS.length}</b> – neue findet ihr in der 🍾 Flaschenpost am Strand, in 🎈 Geschenkballons oder bekommt sie von Nachbarn.</div><div class="bar"><i style="width:${known / DIY_IDS.length * 100}%"></i></div>`;
    for (const [st, t] of [['craft', '🔨 Werkbank'], ['cook', '🍳 Gartenküche']]) {
      h += `<h3>${t}</h3>`;
      for (const [rid, r] of Object.entries(RECIPES)) {
        if (r.st !== st) continue;
        if (st === 'craft' && !s.recipes?.[rid]) continue;
        const it = ITEMS[r.out], can = Object.entries(r.in).every(([k, n]) => (s.inv[k] || 0) >= n);
        h += row(it.icon, `${r.n > 1 ? r.n + '× ' : ''}${it.name}${(r.lvl || 1) > s.level ? lvTag(r.lvl) : ''}`, Object.entries(r.in).map(([k, n]) => `<span style="color:${(s.inv[k] || 0) >= n ? '#5aa84a' : '#a08a76'}">${ITEMS[k].icon} ${s.inv[k] || 0}/${n}</span>`).join(' · '), can ? '<span class="lv">✓ bereit</span>' : '');
      }
    }
    return h;
  },
  museum(s) {
    const n = Object.keys(s.museum || {}).length;
    let h = `<div class="note">Hier stellt ihr eure Fische 🐟, Meerestiere 🤿, Insekten 🦋, Fossilien 🦴 und Edelsteine 💎 aus – jedes Stück einmal. Ausgestellt: <b>${n}/${MUSEUM_ALL.length}</b></div><div class="bar"><i style="width:${n / MUSEUM_ALL.length * 100}%"></i></div>`;
    const can = MUSEUM_ALL.filter(id => !s.museum?.[id] && s.inv[id] > 0);
    if (can.length) {
      h += '<h3>🎁 Kann ausgestellt werden</h3>';
      for (const id of can) h += row(itemIcon(id), ITEMS[id].name, `${s.inv[id]}× in der Tasche · Wert ${money(price(s, id))}`, btn('Ausstellen', { t: 'donate', id }, 'pink'));
    } else h += '<div class="note">Gerade habt ihr nichts Neues dabei. Angelt, fangt Insekten oder grabt an den Stern-Rissen ✨!</div>';
    const sec = (t, ids) => `<h3>${t} <span class="lv">${ids.filter(id => s.museum?.[id]).length}/${ids.length}</span></h3><div class="album">${ids.map(id => s.museum?.[id]
      ? `<div class="got" title="${ITEMS[id].name}"><span>${itemIcon(id)}</span><small>${ITEMS[id].name}</small></div>`
      : `<div><span>❔</span><small>???</small></div>`).join('')}</div>`;
    return h + sec('🐟 Aquarium', MUSEUM.fish) + sec('🤿 Meeresbecken', MUSEUM.sea) + sec('🦋 Insektenhaus', MUSEUM.bug) + sec('🦴 Fossilienhalle', MUSEUM.fossil) + sec('💎 Edelsteinhalle', MUSEUM.gem);
  },
  craft: (s, g) => recipes(s, 'craft'),
  cook: (s, g) => cookContest(s, g) + recipes(s, 'cook'),
  mail(s, g) {
    const write = `<button class="big" data-ui="write"><span class="i">✍️</span><span>Brief schreiben<small>An deinen Lieblingsmenschen – kommt am nächsten Morgen an, auch wenn ihr gerade nicht zusammen spielt</small></span></button>`;
    const mine = m => m.kind !== 'letter' || ((!m.to || m.to === g.myName) && s.day >= (m.arrive || 0));
    const away = s.mail.filter(m => m.kind === 'letter' && m.from === g.myName && s.day < m.arrive).map(m => `<div class="note">📮 Dein Brief an <b>${esc(m.to)}</b> ist unterwegs und kommt morgen früh an.</div>`).join('');
    if (!s.mail.some(mine)) return write + away + '<div class="note">📭 Der Briefkasten ist leer. Freundet euch mit den Nachbarn an – manchmal schreiben sie euch!</div>';
    return write + away + s.mail.map((m, i) => { if (!mine(m)) return ''; if (m.kind === 'letter') return `<div class="letter paper${m.paper || 0}"><h3>💌 Von ${esc(m.from)}</h3><p>${esc(m.text).replace(/\n/g, '<br>')}</p>
      ${m.item ? `<div class="row"><div class="ic">${ITEMS[m.item]?.icon || '🎁'}</div><div class="tx"><b>Beigelegt: ${ITEMS[m.item]?.name || m.item}</b></div><div class="bt">${btn('Annehmen', { t: 'mail', i, from: m.from })}</div></div>` : `<div class="bt">${btn('Gelesen ✓', { t: 'mail', i, from: m.from }, 'white')}</div>`}</div>`;
      const L = m.kind ? { title: m.title, text: m.text } : (lines['mail' + i + m.from + m.hearts] ||= letter(m.from, m.hearts, g.myName)); return `<div class="letter"><h3>${m.kind ? '' : NPCS[m.from]?.icon || '💌'} ${esc(L.title)}</h3><p>${esc(L.text).replace(/\n/g, '<br>')}</p>
      ${m.item ? `<div class="row"><div class="ic">${ITEMS[m.item]?.icon || '🎁'}</div><div class="tx"><b>Geschenk: ${m.n || 1}× ${ITEMS[m.item]?.name || m.item}</b></div><div class="bt">${btn('Annehmen', { t: 'mail', i, from: m.from, hearts: m.hearts })}</div></div>` : `<div class="bt">${btn('Gelesen ✓', { t: 'mail', i, from: m.from, hearts: m.hearts }, 'white')}</div>`}</div>`; }).join('');
  },
  letter(s, g) {
    const others = Object.values(g.players).filter(p => p.id !== g.me).map(p => p.name), known = [...new Set([...others, ...(s.friends || []).filter(n => n !== g.myName)])];
    const items = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id] && !ITEMS[id].seed && !['hand', 'axe', 'shovel', 'can', 'net', 'rod', 'sling'].includes(id)).slice(0, 60);
    return `<div class="note">Schreib einen Brief! Er liegt morgen früh im Briefkasten – auch wenn ihr gerade nicht zusammen spielt.</div>
      <label class="field">An:<input id="ltto" maxlength="16" list="ltnames" value="${esc(known[0] || '')}" placeholder="Name"></label><datalist id="ltnames">${known.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <label class="field">Briefpapier:<span class="papers">${['🌸', '🌊', '🍂', '❄️'].map((e, i) => `<button class="chip${i ? '' : ' on'}" data-paper="${i}">${e}</button>`).join('')}</span></label>
      <textarea id="lttext" maxlength="400" rows="6" placeholder="Liebe/r …"></textarea>
      <label class="field">Geschenk beilegen:<select id="ltitem"><option value="">– nichts –</option>${items.map(([id, n]) => `<option value="${id}">${ITEMS[id].icon} ${esc(ITEMS[id].name)} (${n})</option>`).join('')}</select></label>
      <button class="btn pink" data-ui="sendletter">💌 Abschicken</button>`;
  },
  contest(s, g) {
    const c = s.contest, f = FESTS[festOf(s.day)];
    if (!c || !f) return '<div class="note">Heute ist kein Turnier. Schau in den 🎉 Festkalender im Inselhandy!</div>';
    const what = c.k === 'fish' ? 'Fische' : 'Insekten', run = c.runs[g.me];
    const best = Object.entries(c.best).sort((a, b) => b[1] - a[1]).map(([id, n]) => row(id === g.me ? '⭐' : '🏅', esc(g.players[id]?.name || c.res.find(r => r.by === id)?.name || 'Jemand'), `${n} ${what}`, '')).join('');
    return `<div class="note"><b>${f.icon} ${f.name}</b><br>${esc(f.desc)}<br>${c.k === 'fish' ? '🎣 Nimm die Angel mit!' : '🦋 Nimm den Kescher mit!'} 🥉 ab 3 · 🥈 ab 6 · 🥇 ab 9 ${what}. Gold bringt einen Pokal für den Garten!</div>
      ${run ? `<div class="note">⏱️ Deine Runde läuft noch ${Math.max(0, Math.ceil(run.until - s.time))} Sekunden – schon ${run.n} ${what}!</div>` : contestOpen(s) ? `<div class="bt">${btn(`${f.icon} Anmelden & los! (3 Minuten)`, { t: 'contest' }, 'pink')}</div>` : '<div class="note">🕘 Der Stand ist von 9 bis 18 Uhr geöffnet.</div>'}
      ${best ? `<h3>Bestenliste heute</h3>${best}` : ''}`;
  },
  diary(s, g) {
    const d = [...(s.diary || [])].reverse();
    const add = `<div class="diaryadd"><input id="dytext" maxlength="120" placeholder="Was war heute schön? ✍️"><button class="btn small pink" data-ui="diaryadd">Eintragen</button></div>`;
    if (!d.length) return add + '<div class="note">📔 Hier sammeln sich eure schönsten Momente: Umarmungen, Feste, Turniere, Briefe … und alles, was ihr selbst hineinschreibt.</div>';
    let last = 0;
    return add + d.slice(0, 80).map(e => { const head = e.day !== last ? `<h3>Tag ${e.day} · ${WEEKDAYS[weekday(e.day)]}</h3>` : ''; last = e.day; return head + `<div class="dyline"><span>${e.icon || '💗'}</span>${esc(e.text)}</div>`; }).join('');
  },
  news(s, g, tab) {
    g.readPaper = s.day;
    if (tab === 'week') {
      const w = s.week;
      let h = `<div class="note">🤝 <b>Wochenziele</b> – gemeinsam für alle! Jedes Ziel bringt 1.500 Taler, alle drei zusammen etwas Seltenes: <b>${ITEMS[w?.prize]?.icon || '🎁'} ${ITEMS[w?.prize]?.name || ''}</b>. Neue Ziele gibt es jeden Sonntag.</div>`;
      for (const q of w?.goals || []) { const G = WEEK_GOALS[q.i]; if (G) h += row(G[3], G[2] + (q.done ? ' <span class="lv">✓ geschafft</span>' : ''), `${q.p.toLocaleString('de-DE')} / ${G[1].toLocaleString('de-DE')}<div class="bar"><i style="width:${Math.min(100, q.p / G[1] * 100)}%"></i></div>`, ''); }
      return h;
    }
    const P = s.paper;
    if (!P) return '<div class="note">Die erste Ausgabe erscheint morgen früh.</div>';
    const wx = w => WEATHER[w] || WEATHER.sun, sec = (t, list) => list?.length ? `<h3>${t}</h3>${list.map(x => `<div class="dyline">${esc(x)}</div>`).join('')}` : '';
    return `<div class="paper"><div class="mast">Der Inselbote</div><div class="pdate">${WEEKDAYS[weekday(P.day)]}, Tag ${P.day} · ${esc(s.name)}</div>
      <div class="phead">${esc(P.head)}</div>
      <div class="pcols"><div><b>Wetter</b><br>Heute: ${wx(P.wx)[0]} ${wx(P.wx)[1]}<br>Morgen: ${wx(P.wxNext)[0]} ${wx(P.wxNext)[1]}</div><div><b>Rübenbörse</b><br>${esc(P.turnip)}</div></div>
      ${sec('🏆 Gestern auf der Insel', [...P.done, ...P.diary])}${sec('💬 Inselgeflüster', P.gossip)}${sec('🤝 Wochenziele', P.week)}
      <div class="pad">${esc(P.ad)}</div></div>`;
  },
  book(s, g, tab) {
    if (tab === 'photos') return `<div class="note">📷 Fotos aus dem Fotomodus landen hier (nur auf diesem Gerät). Als 📮 Postkarte kannst du sie an Mitspieler schicken oder teilen.</div><div id="photogrid" class="photogrid"><div class="note">Lade Fotos …</div></div>`;
    if (tab === 'anniv') {
      const a = s.anniv || {}, A = annivToday(s), d = a.founded ? new Date(a.founded + 'T12:00') : null;
      let h = `<div class="note">🎂 Die Insel merkt sich ihren Gründungstag und eure besonderen Tage. An einem Jahrestag gibt es Geschenke, eine Seite im Fotobuch und abends ab 19 Uhr ein Feuerwerk.${A ? `<br><b>Heute: ${A.icon} ${esc(A.name)}!</b>` : ''}</div>`;
      h += row('🏝️', 'Gründungstag', `${d ? d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '–'}${a.guess ? ' · (geschätzt – stimmt das?)' : ''}<div class="diaryadd"><input type="date" id="anfounded" value="${a.founded || ''}"><button class="btn small white" data-ui="annivfounded">Ändern</button></div>`, '');
      h += '<h3>💕 Eure Jahrestage</h3>';
      (a.dates || []).forEach((x, i) => { h += row('💕', esc(x.name), `jedes Jahr am ${new Date('2000-' + x.md + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}${x.y ? ` · seit ${x.y}` : ''}`, `<button class="btn small white" data-act='${JSON.stringify({ t: 'anniv', op: 'del', i })}'>🗑️</button>`); });
      h += `<div class="diaryadd"><input id="anname" maxlength="30" placeholder="z. B. Unser Jahrestag"><input type="date" id="andate"><button class="btn small pink" data-ui="annivadd">Merken</button></div>`;
      return h;
    }
    const pages = [...(s.book || [])].reverse();
    if (!pages.length) return '<div class="note">Noch leer – das Fotobuch füllt sich von selbst mit euren besonderen Momenten.</div>';
    return `<div class="note">📸 ${pages.length} Seite${pages.length === 1 ? '' : 'n'} voller Erinnerungen. Neue Seiten kommen von ganz allein dazu.</div><div class="bookgrid">${pages.map(p => `<div class="bpage" data-bk="${esc(p.k)}"><div class="bpic" data-bpic="${esc(p.k)}"><span>${p.icon}</span></div><b>${esc(p.title)}</b><small>Tag ${p.day}</small><p>${esc(p.text)}</p></div>`).join('')}</div>`;
  },
  catalog(s) {
    const ids = Object.keys(s.catalog || {}).filter(id => ITEMS[id]);
    if (!ids.length) return '<div class="note">📦 Alles, was ihr je an Möbeln und Deko besessen habt, landet hier – und kann jederzeit nachbestellt werden.</div>';
    const furn = ids.filter(id => FURNITURE[id]), deco = ids.filter(id => !FURNITURE[id]);
    const list = arr => arr.sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name)).map(id => { const c = catalogPrice(id); return row(itemIcon(id), ITEMS[id].name, `${s.inv[id] ? `${s.inv[id]}× in der Tasche · ` : ''}sofort nachbestellbar`, btn(`🪙 ${c.toLocaleString('de-DE')}`, { t: 'catbuy', id }, '', s.money < c)); }).join('');
    return `<div class="note">📦 Alles, was ihr je besessen habt (${ids.length} Sachen) – hier könnt ihr es nachbestellen.</div>${furn.length ? '<h3>🛋️ Möbel</h3>' + list(furn) : ''}${deco.length ? '<h3>🏮 Garten & Deko</h3>' + list(deco) : ''}`;
  },
  cable(s) { // Seilbahn: schwebend zu den Gebieten
    if (!cableBuilt(s)) return '<div class="note">Die Seilbahn muss erst im Rathaus gebaut werden.</div>';
    let h = '<div class="note">🚡 Einsteigen und hinschweben! Jede Haltestelle bringt euch auch wieder zurück zur Station auf der Insel.</div>';
    h += row('🏝️', 'Insel – Station', 'Die Talstation bei euch', btn('Hinschweben', { ui: 'cablego', to: 'island' }, 'pink'));
    for (const [id, A] of Object.entries(AREAS)) h += row(A.icon, A.name + (s.areas?.[id] ? '' : ' 🔒'), s.areas?.[id] ? 'Haltestelle am Rand' : 'Erst im Rathaus freischalten', btn('Hinschweben', { ui: 'cablego', to: id }, 'pink', !s.areas?.[id]));
    return h;
  },
  reef(s, g) { // Riff gestalten: ein Platz
    const i = g.reefSlot, cur = s.reef?.slots?.[i], sc = reefScore(s);
    if (!Number.isInteger(i)) return '';
    let h = hero('🪸 Korallenriff', `Platz ${i + 1} von 14 · ${'⭐'.repeat(sc.stars) || 'noch keine Sterne'}`, cur ? `Hier steht: ${ITEMS[cur].icon} ${ITEMS[cur].name}` : 'Ein leerer Platz. Korallen, Muscheln, Seesterne, Anemonen und Seeglas machen das Riff bunt – je mehr verschiedene, desto mehr Fische kommen!');
    if (cur) h += `<div class="pattools">${btn(`↩️ ${ITEMS[cur].name} zurücknehmen`, { t: 'reef', op: 'set', i, item: null }, 'white')}</div>`;
    const have = REEF_DECO.filter(id => s.inv[id] > 0);
    h += '<h3>Aus der Tasche hinsetzen</h3>' + (have.length ? `<div class="itemgrid">${have.map(id => itemCell(id, s.inv[id], btn('Hinsetzen', { t: 'reef', op: 'set', i, item: id }, 'pink'))).join('')}</div>` : '<div class="note">Nichts Passendes dabei. Sucht die ✨ Fundstellen im Riff ab oder sammelt Muscheln am Strand!</div>');
    h += `<div class="note">⭐ ${sc.n}/14 Plätze · ${sc.kinds} verschiedene Sachen · Bei 5 Sternen schreibt euch Wanda.</div>`;
    return h;
  },
  castle(s, g) { // Sandburg ansehen, Muscheln draufsetzen
    const k = g.castleK, c = s.castles?.[k];
    if (!c) return '<div class="note">Die Flut hat die Burg geholt … 🌊</div>';
    const [x, z] = k.split(',').map(Number), b = s.beach, contest = b?.kind === 'sand' && beachOpen(s);
    let h = hero('🏰 Sandburg', `von ${esc(c.name)} · Stufe ${c.lv}/${CASTLE_MAX}`, `${(c.sh || []).map(id => ITEMS[id].icon).join(' ') || 'Noch ohne Muscheln.'}<br><small>Burg-Punkte: ${castleScore(c)} · Mit der Schaufel höher bauen, mit Muscheln schmücken (bis zu 10, verschiedene zählen extra).</small>`);
    const have = SHELL_IDS.filter(id => s.inv[id] > 0);
    if ((c.sh || []).length < 10) h += '<h3>Muschel draufsetzen</h3>' + (have.length ? `<div class="itemgrid">${have.map(id => itemCell(id, s.inv[id], btn('Draufsetzen', { t: 'castle', op: 'shell', x, z, item: id }, 'pink'))).join('')}</div>` : '<div class="note">Keine Muscheln in der Tasche – am Strand liegen jeden Tag neue!</div>');
    if (contest) {
      const list = Object.entries(s.castles).filter(([, q]) => q.by).map(([, q]) => [q.name, castleScore(q)]).sort((a, b2) => b2[1] - a[1]);
      h += `<div class="note">🏆 <b>Sandburgen-Wettbewerb</b> bis 17 Uhr! Jury: ${b.judges.map(id => NPCS[id].icon + ' ' + NPCS[id].name).join(', ')}.<br>${list.map(([n, p], j) => `${j + 1}. ${esc(n)} – ${p} Punkte`).join('<br>')}</div>`;
    }
    h += `<div class="pattools">${btn('🌊 Einebnen (Muscheln zurück)', { t: 'castle', op: 'flat', x, z }, 'white')}</div>`;
    return h;
  },
  visitor(s, g) {
    const id = g.visitor, N = NPCS[id], V = VISITORS[id];
    if (!N || !V) return '';
    const r = s.residents?.[id], camp = s.camper?.id === id ? s.camper : null, rec = r || camp;
    if (!rec) return '<div class="note">Nicht mehr da.</div>';
    const h = vhearts(rec.f), line = g.vline?.[0] === id ? g.vline[1] : (g.vline = [id, npcLine(id, { hour: 6 + s.dayTime * 18, player: g.myName, hearts: h * 1 })])[1];
    let out = hero(`${N.icon} ${N.name}`, `${N.species} · ${N.role}${r ? ' · wohnt hier' : ' · zeltet auf dem Campingplatz'}`, `„${esc(line)}“<br><small>${esc(N.bio)}</small><br>${'💗'.repeat(Math.ceil(h / 2))}${'🤍'.repeat(5 - Math.ceil(h / 2))}`);
    if (r?.ask) out += `<div class="note">💭 <b>${N.name} überlegt umzuziehen.</b> Was meint ihr?</div><div class="pattools"><button class="btn small pink" data-act='${JSON.stringify({ t: 'vmove', id, ok: false })}'>💕 Bitte bleib!</button><button class="btn small white" data-act='${JSON.stringify({ t: 'vmove', id, ok: true })}'>🧳 Alles Gute, zieh ruhig</button></div>`;
    if (r?.leave) out += `<div class="note">🧳 ${N.name} reist morgen früh weiter.</div>`;
    if (camp && !(s.pending || []).includes(id)) out += `<div class="note">🏡 Gefällt es ${N.name} hier? Ladet ${N.name} ein zu bleiben – ihr bekommt ein Grundstück zum Aufstellen.</div><div class="pattools"><button class="btn small pink" data-act='${JSON.stringify({ t: 'vinvite', id })}'>🏡 Zum Bleiben einladen</button></div>`;
    if ((s.pending || []).includes(id)) out += `<div class="note">🪧 ${N.name} wartet darauf, dass ihr das Grundstück aufstellt (🔨 Baumodus).</div>`;
    const gifts = Object.keys(s.inv).filter(k => s.inv[k] > 0 && ITEMS[k] && !ITEMS[k].gear && !ITEMS[k].seed && k !== 'grundstueck').slice(0, 30);
    if (gifts.length) out += `<h3>🎁 Etwas schenken</h3>${gifts.map(k => row(itemIcon(k), ITEMS[k].name + (V.loves.includes(k) ? ' 💖' : V.likes.includes(k) ? ' 💗' : ''), `${s.inv[k]}× in der Tasche`, btn('Schenken', { t: 'vgift', id, item: k }))).join('')}`;
    return out;
  },
  piano(s, g, tab) {
    if (tab === 'song') {
      const notes = g.melEdit ||= (s.melody?.notes || MEL_DEFAULT).slice(), names = ['Pause', 'C', 'D', 'E', 'G', 'A', 'c', 'd', 'e', 'g', 'a'];
      let grid = '';
      for (let r = MEL_NOTES.length - 1; r >= 1; r--) grid += `<div class="melrow"><span>${names[r]}</span>${notes.map((n, i) => `<button data-ui="melset" data-i="${i}" data-n="${r}" class="${n === r ? 'on' : ''}${i % 4 === 0 ? ' beat' : ''}"></button>`).join('')}</div>`;
      return `<div class="note">🎶 Komponiert eure eigene <b>Inselmelodie</b>: 16 Schritte, tippe in jeder Spalte einen Ton an (nochmal = Pause). Sie erklingt, wenn jemand auf der Insel ankommt, und jeden Mittag am Rathaus.${s.melody?.by ? ` Aktuell von ${esc(s.melody.by)}.` : ''}</div>
        <div class="melgrid">${grid}</div><div class="pattools"><button class="btn small" data-ui="melplay">▶️ Anhören</button><button class="btn small pink" data-ui="melsave">💾 Als Inselmelodie speichern</button><button class="btn small white" data-ui="melreset">↩️ Zurücksetzen</button></div>`;
    }
    const keys = [];
    for (let m = 60; m <= 84; m++) keys.push(m);
    const black = m => [1, 3, 6, 8, 10].includes(m % 12);
    return `<div class="note">🎹 Spiel Klavier! Mitspieler in der Nähe hören mit. PC: Tasten <b>A S D F G H J K L</b> (weiß) und <b>W E T Z U O P</b> (schwarz).</div>
      <div class="piano">${keys.filter(m => !black(m)).map(m => `<div class="pk w" data-m="${m}">${black(m + 1) && m < 84 ? `<i class="pk b" data-m="${m + 1}"></i>` : ''}</div>`).join('')}</div>`;
  },
  patterns(s, g) {
    const pats = s.patterns || [], cur = g.patEdit;
    let h = '<div class="note">🎨 Malt eigene 16×16-Muster! Tragt sie als <b>Kleidung</b>, hisst sie auf der <b>🚩 Inselfahne</b> (im Laden), legt <b>🎨 Muster-Wege</b> oder hängt sie im Haus in einen <b>🖼️ Musterrahmen</b> (antippen = nächstes Muster).</div>';
    h += `<div class="patslots">${Array.from({ length: 8 }, (_, i) => `<button class="patslot${cur?.i === i ? ' on' : ''}" data-ui="patpick" data-i="${i}"><canvas width="48" height="48" data-pat="${i}"></canvas><small>${pats[i] ? esc(pats[i].name) : 'leer'}</small></button>`).join('')}</div>`;
    if (!cur) return h + '<div class="note">Tippe auf ein Feld, um zu malen.</div>';
    const p = pats[cur.i];
    h += `<div class="pated"><canvas id="patcv" width="320" height="320"></canvas><div class="patpal">${['transparent', '#ffffff', '#2b2321', '#ff6b6b', '#ff9a3c', '#ffd23f', '#8fd694', '#3fa66a', '#6cc4ff', '#3f6fd8', '#b39cff', '#ff8fab', '#f5c9a8', '#a0693f', '#9aa0a8', '#fff1c9'].map((c, i) => `<button data-ui="patcol" data-c="${i}" class="${cur.c === i ? 'on' : ''}" style="background:${i ? c : 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 50% / 10px 10px'}"></button>`).join('')}</div>
      <div class="pattools"><button class="btn small white${cur.tool === 'pen' ? ' on' : ''}" data-ui="pattool" data-t="pen">✏️ Stift</button><button class="btn small white${cur.tool === 'fill' ? ' on' : ''}" data-ui="pattool" data-t="fill">🪣 Füllen</button><button class="btn small white" data-ui="patclear">🧽 Leeren</button></div>
      <div class="diaryadd"><input id="patname" maxlength="20" placeholder="Name" value="${esc(p?.name || '')}"><button class="btn small pink" data-ui="patsave">💾 Speichern</button></div>
      <div class="pattools">${p ? `<button class="btn small" data-ui="patwear">👕 Anziehen</button><button class="btn small" data-act='${JSON.stringify({ t: 'patuse', i: cur.i, as: 'flag' })}'>🚩 Als Inselfahne${s.flagPat === cur.i ? ' ✓' : ''}</button><button class="btn small" data-act='${JSON.stringify({ t: 'patuse', i: cur.i, as: 'path' })}'>🎨 Als Weg${s.pathPat === cur.i ? ' ✓' : ''}</button>` : '<small>Erst speichern, dann anziehen oder als Fahne/Weg benutzen.</small>'}</div></div>`;
    return h;
  },
  night(s) {
    let h = hero('🦋 Mottilda', 'Der Nachtmarkt', 'Psst … Ich bin nur freitagabends hier. Seltene Schätze, die es nirgends sonst gibt! Aber Vorsicht: Es sind Fälschungen im Umlauf. <b>Echte Ware trägt mein Siegel – eine silberne Motte mit VIER Punkten.</b>');
    if (!nightOpen(s) || s.night?.day !== s.day) return h + '<div class="note">🌙 Der Nachtmarkt öffnet freitags ab 18 Uhr auf dem Dorfplatz.</div>';
    s.night.offers.forEach((o, i) => {
      h += row(itemIcon(o.id), ITEMS[o.id].name + (o.sold ? ' <span class="lv">verkauft</span>' : ''), `🔍 Siegel: <b>${o.seal}</b>`, o.sold ? '' : btn(`🪙 ${o.price.toLocaleString('de-DE')}`, { t: 'nightbuy', i }, 'pink', s.money < o.price), o.sold);
    });
    return h;
  },
  stall(s, g) {
    const st = s.stall || { offers: [] }, me = g.players?.[g.me]?.key || 'host';
    let h = '<div class="note">🏪 Legt Sachen mit einem Preis aus – Nachbarn und Besuch kaufen sie im Laufe des Tages (je fairer der Preis, desto schneller). Oder bietet einen <b>Tausch</b> an: Mitspieler geben euch dafür das Gewünschte.</div>';
    st.offers.forEach((o, i) => {
      const own = o.key === me, it = ITEMS[o.id];
      const what = o.price ? `für 🪙 ${o.price.toLocaleString('de-DE')}` : `Tausch gegen ${o.wn}× ${ITEMS[o.want].icon} ${ITEMS[o.want].name}`;
      h += row(itemIcon(o.id), `${o.n}× ${it.name}`, `${what} · von ${esc(o.by)}`, (own || me === 'host' ? btn('Zurück', { t: 'stalltake', i }, 'white') : '') + (!own && o.want ? btn('🤝 Tauschen', { t: 'stallswap', i }, 'pink', !(s.inv[o.want] >= o.wn)) : ''));
    });
    if (!st.offers.length) h += '<div class="note">Noch liegt nichts aus.</div>';
    const mine = Object.keys(s.inv).filter(id => s.inv[id] > 0 && ITEMS[id] && !ITEMS[id].gear && !ITEMS[id].seed?.length && id !== 'ruebe');
    const wants = Object.keys(ITEMS).filter(id => ['fruit', 'fish', 'bug', 'mat', 'dish', 'veg', 'misc'].includes(ITEMS[id].cat) || ITEMS[id].furn).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
    if (st.offers.length < STALL_MAX && mine.length) {
      h += `<h3>➕ Etwas anbieten</h3><div class="stallform"><select id="stid">${mine.map(id => `<option value="${id}">${ITEMS[id].icon} ${esc(ITEMS[id].name)} (${s.inv[id]})</option>`).join('')}</select>
        <input id="stn" type="number" min="1" max="99" value="1" title="Anzahl">
        <select id="stmode"><option value="price">für Taler</option><option value="swap">als Tausch</option></select>
        <input id="stprice" type="number" min="1" max="999999" placeholder="Preis">
        <select id="stwant" class="hidden">${wants.map(id => `<option value="${id}">${ITEMS[id].icon} ${esc(ITEMS[id].name)}</option>`).join('')}</select>
        <input id="stwn" type="number" min="1" max="99" value="1" class="hidden" title="Wie viele?">
        <button class="btn small pink" data-ui="stalladd">Auslegen</button></div>`;
    }
    if (st.log?.length) h += `<h3>📒 Verkauft & getauscht</h3>${[...st.log].reverse().map(l => `<div class="dyline">${esc(l.txt)}</div>`).join('')}`;
    return h;
  },
  fests(s) {
    let h = '<div class="note">Was steht an? Feste, Turniere und Geburtstage der nächsten vier Wochen.</div>';
    for (let d = s.day; d < s.day + 28; d++) {
      const f = FESTS[festOf(d)], b = birthdayOf(d), when = d === s.day ? '<b>Heute</b>' : d === s.day + 1 ? 'Morgen' : `in ${d - s.day} Tagen`;
      if (f) h += row(f.icon, `${f.name}`, `${when} · ${WEEKDAYS[weekday(d)]}, Tag ${d} · ${esc(f.desc)}`, '');
      if (b) h += row('🎂', `${NPC_DATA[b].name}s Geburtstag ${NPC_DATA[b].icon}`, `${when} · ${WEEKDAYS[weekday(d)]}, Tag ${d} · Ein Geschenk zählt doppelt!`, '');
    }
    return h;
  },
  settings(s, g, tab) {
    if (tab === 'options') return settingsHtml(g.settings, g.touch);
    if (tab === 'help') {
      return `<div class="note">💻 <b>PC:</b> WASD/Pfeiltasten laufen · Klick = hinlaufen & benutzen · E/Leertaste = Aktion · 1–9 Werkzeug · Mausrad Zoom · rechte Maustaste ziehen oder Z/C = Kamera drehen · Enter Chat · B Laden · I Taschen · O Inselbuch · Q Emotes · P Fotomodus<br><br>
      📱 <b>Handy:</b> links wischen = laufen · auf etwas tippen = benutzen (nah dran) oder hinlaufen & benutzen · großer Knopf = Aktion · zwei Finger = zoomen & drehen · 🔄 Kamera drehen<br>
      🖱️ <b>Maus:</b> Zeig auf etwas – E oder ein Klick benutzt genau das. Ist es weiter weg, läuft deine Figur hin.<br><br>
      🍎 Bäume schütteln: Obst fällt herunter (wächst in 3 Tagen nach). Mit der Axt 🪓 gibt's Holz.<br>
      🌷 Samen auf den Rasen pflanzen ➜ Gießkanne 💧 ➜ pflücken. Blumen blühen immer wieder.<br>
      🐚 Muscheln am Strand aufheben, 🌿 Unkraut zupfen, ✨ Stern-Risse mit der Schaufel ausgraben.<br>
      🌟 <b>Neu:</b> 📰 Zeitung · 📸 Fotobuch & Postkarten · 🎂 Jahrestage · 📦 Katalog · 🎨 Muster · 🎹 Klavier & Inselmelodie (alles im Inselhandy) · 🪏 Baumschaufel · 🏆 Kochwettbewerb sonntags in der Gartenküche · 🏮 Nachtmarkt freitags ab 18 Uhr · 🏪 Tauschstand · ⛵ Ausflüge zu Zufallsinseln · 🏕️ Campingplatz (Rathaus) · ☁️ Cloud-Spielstand unter „Meine Inseln“.<br>
      🎣 Am Fluss, Teich, Meer oder vom Steg angeln: warten bis ❗ erscheint, dann schnell nochmal drücken.<br>
      🏛️ Fische, Insekten und Fossilien im Museum ausstellen.<br>
      🪑 Auf Bänke kannst du dich setzen, und deinen Lieblingsmenschen kannst du umarmen 🤗.<br>
      💰 An der Ankaufkiste vor dem Krämerladen oder in den 🎒 Taschen verkaufen. 💬 Wünsche der Nachbarn & 🏆 Erfolge geben Extra-Taler.<br>
      ⭐ Mit Erfahrung steigt eure Insel im Level und schaltet Neues frei.<br><br>
      🏛️ <b>Rathaus:</b> Ihr seid Bürgermeister! Inselprojekte bauen, Verordnungen erlassen, Haus auf Kredit ausbauen, Wohnwert & Inselbewertung ansehen.<br>
      🛍️ <b>Bummelgasse:</b> Durchs Tor im Norden – Schneiderei (Hüte), Gärtnerei (seltene Blumen) und abends der Mondschein-Club (samstags Livemusik).<br>
      ⛵ <b>Tropeninsel:</b> Am Ende des Stegs wartet Käpt'n Flossi. Drüben: Tropenfrüchte, seltene Käfer und Touren für Medaillen.<br><br>
      🎉 <b>Feste:</b> Eiersuche, Sommerfeuerwerk, Kürbisfest, Lichterfest, Angel- und Krabbeltier-Turniere und die Geburtstage der Nachbarn – alles im 🎉 Festkalender im Inselhandy. Geburtstagsgeschenke zählen doppelt!<br>
      💞 <b>Zu zweit:</b> Tippt euch an für 🤝 Händchen halten (wer stehen bleibt, läuft mit) oder 🙈 Verstecken. Im Fotomodus schickt 🧩 ein Foto-Rätsel. Am Briefkasten ✍️ Briefe schreiben – sie kommen am nächsten Morgen an. Schöne Momente landen im 📔 Tagebuch.<br>
      🌱 <b>Blumen-Kreuzungen:</b> Verschiedene Blumen nebeneinander pflanzen und gießen – manchmal keimt über Nacht eine seltene Sorte.<br>
      🐾 <b>Haustier:</b> Unter 😊 Gefühle gibt es den Haustier-Trick.<br>
      💾 <b>Sichern:</b> Im Menü die Insel als Datei speichern – und im Hauptmenü wieder laden (auch auf einem anderen Gerät).</div>`;
    }
    return `<button class="big" data-ui="editlook"><span class="i">👗</span><span>Aussehen ändern<small>Frisur, Outfit, Haustier …</small></span></button><br>
      <button class="big" data-ui="photo"><span class="i">📷</span><span>Fotomodus<small>Schöne Erinnerungsfotos von eurer Insel</small></span></button><br>
      <button class="big" data-ui="backup"><span class="i">💾</span><span>Insel als Datei sichern<small>Zum Aufheben – im Hauptmenü wieder ladbar</small></span></button><br>
      <button class="big pink" data-ui="leave"><span class="i">🏠</span><span>Zurück zum Hauptmenü<small>Die Insel wird gespeichert</small></span></button>`;
  },
};

// ---------- Bürgermeister-Update: Rathaus, Baustelle, Bummelgasse, Tropeninsel ----------
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const hrs = ([a, b]) => `${a}–${b} Uhr`;
const siteOf = s => Object.entries(s.obj).find(([, o]) => o.k === 'baustelle');
const closed = (s, id) => `<div class="note">🔒 Gerade geschlossen. Öffnungszeiten: <b>${hrs(shopHours(s, id))}</b>${ord(s) === 'none' && id !== 'club' ? ' – mit einer Verordnung im Rathaus könnt ihr das ändern.' : ''}</div>`;
Object.assign(PANELS, {
  mayor(s, g, tab) {
    let h = '';
    if (tab === 'areas') {
      h += hero('🦌 Rosi, Rathaus', 'Insel-Erweiterungen', 'Hinter der Klippe, am Strand und tief im Fels gibt es noch viel zu entdecken! Schaltet neue Gebiete frei – die Taler kommen aus der Inselkasse, das Material aus deiner Tasche. Jedes Gebiet hat ein Tor auf der Insel (siehe Karte).');
      for (const [id, A] of Object.entries(AREAS)) {
        const open = s.areas?.[id], locked = A.lvl > s.level;
        const mats = Object.entries(A.mats).map(([m, n]) => `${(s.inv[m] || 0) >= n ? '✅' : '▫️'} ${n}× ${ITEMS[m].icon} ${ITEMS[m].name}`).join(' · ');
        const can = !open && !locked && s.money >= A.cost && Object.entries(A.mats).every(([m, n]) => (s.inv[m] || 0) >= n);
        h += `<div class="row${open ? ' done' : locked ? ' locked' : ''}"><div class="ic">${A.icon}</div><div class="tx"><b>${A.name}${locked ? lvTag(A.lvl) : ''}</b><small>${A.desc}</small>${open ? `<small>✅ Offen seit Tag ${open.open} · Eingang: ${A.gateName}</small>` : `<small>${money(A.cost)} · ${mats}</small>`}</div>
          <div class="bt">${open ? '<span class="lv">offen</span>' : btn('Freischalten', { t: 'expand', id }, 'pink', !can)}</div></div>`;
      }
      return h;
    }
    if (tab === 'projects') {
      const site = siteOf(s);
      h += hero('🦌 Rosi, Rathaus', 'Inselprojekte', 'Als Bürgermeister bestimmt ihr, was auf der Insel gebaut wird! Projekt aussuchen ➜ 🔨 Baumodus ➜ „Projekte“ ➜ Bauplatz-Pflock 🚩 auf freien Rasen stecken (mit einer Kachel Platz drumherum) ➜ am Schild Taler spenden ➜ am nächsten Morgen wird eingeweiht. Fertige Projekte könnt ihr im Baumodus unter „Abbauen“ wieder einpacken und woanders aufstellen.');
      if (site) {
        const [, o] = site, P = PROJECTS[o.p], paid = o.paid || 0;
        h += row(P.icon, `Baustelle: ${P.name}`, `${money(paid)} von ${money(P.cost)}<div class="bar"><i style="width:${Math.min(1, paid / P.cost) * 100}%"></i></div>${paid >= P.cost ? '✅ Bezahlt – morgen früh steht es!' : 'Spenden könnt ihr direkt am Bauschild.'}`, '');
      } else if (s.mayor.plan) {
        const P = PROJECTS[s.mayor.plan];
        h += row('🚩', `Geplant: ${P.icon} ${P.name}`, 'Nehmt den Bauplatz-Pflock aus der Leiste und steckt ihn auf freien Rasen.', btn('Absagen', { t: 'unplan' }, 'white'));
      }
      h += '<h3>🏗️ Mögliche Projekte</h3>';
      const busy = !!(site || s.mayor.plan);
      for (const [id, P] of Object.entries(PROJECTS)) {
        const n = Object.values(s.obj).filter(o => o.k === id).length, locked = P.lvl > s.level;
        h += row(P.icon, P.name + (locked ? lvTag(P.lvl) : '') + (n ? ` <span class="lv">${n}× gebaut</span>` : ''), `Kosten ${money(P.cost)} – gesammelt wird an der Baustelle`, btn('Planen', { t: 'plan', id }, 'pink', locked || busy), locked);
      }
      return h;
    }
    if (tab === 'ords') {
      const cur = ord(s);
      h += hero('🦌 Rosi, Rathaus', `Aktuell: ${ORDS[cur].icon} ${ORDS[cur].name}`, `Mit einer Verordnung verändert ihr das Leben auf der Insel. Es gilt immer nur eine. ${s.mayor.free ? 'Die erste ist <b>gratis</b>!' : `Eine neue kostet ${money(ORD_PRICE)}.`}`);
      for (const [id, O] of Object.entries(ORDS)) h += row(O.icon, O.name + (id === cur ? ' <span class="lv">✓ gilt</span>' : ''), O.desc, id === cur ? '' : btn(s.mayor.free ? 'Gratis einführen' : `🪙 ${fmt(ORD_PRICE)}`, { t: 'ordinance', id }, 'pink', !s.mayor.free && s.money < ORD_PRICE));
      return h;
    }
    if (tab === 'house') {
      const u = UPGRADES.house, i = upgradeInfo(s, 'house');
      h += hero('🦝 Bauberater Fridolin', `${u.desc(i.level)}`, 'Euer Haus wird sofort größer – bezahlt wird später über den Hauskredit, ganz ohne Zinsen. Erst wenn der Kredit abbezahlt ist, geht der nächste Ausbau.');
      h += row('💳', 'Hauskredit', s.loan ? `Noch offen: ${money(s.loan)}` : 'Keine Schulden 🎉',
        s.loan ? btn('1.000', { t: 'repay', n: 1000 }, 'white', s.money < 1) + btn('10.000', { t: 'repay', n: 10000 }, 'white', s.money < 1) + btn('Alles', { t: 'repay', n: 'all' }, 'pink', s.money < 1) : '');
      if (i.done) h += row('🏰', 'Voll ausgebaut!', 'Größer geht es nicht mehr.', '');
      else {
        const locked = i.req > s.level;
        h += row('🏡', `Nächster Ausbau${locked ? lvTag(i.req) : ''}`, `${pips(i.level, i.max)} ➜ ${u.desc(i.level + 1)} · Kredit ${money(i.cost)}`, btn('Ausbauen', { t: 'upgrade', id: 'house', lvl: i.level }, 'pink', locked || s.loan > 0), locked);
      }
      return h;
    }
    if (tab === 'hha') {
      const sc = homeScore(s), r = hhaRank(sc.pts);
      h += hero('🛋️ Wohnwert-Verein', `${r[2]} ${fmt(sc.pts)} Punkte – „${r[1]}“`, `Jeden <b>Samstagmorgen</b> bewertet der Wohnwert-Verein euer Zuhause und schreibt euch einen Brief. Neue Rekorde bringen Taler, ab 20.000 Punkten gibt es einen Pokal für den Garten. Bester Wert bisher: <b>${fmt(s.hha?.best || 0)}</b>`);
      h += row('🪑', 'Möbelstücke', `${sc.pieces} Stück, ${sc.kinds} verschiedene`, '') + row('🖌️', 'Tapete & Boden', 'Eigene Tapete und eigener Boden geben Extrapunkte (im Krämerladen unter Möbel).', '') + row('🏡', 'Hausgröße', 'Ein größeres Haus zählt auch mit.', '');
      h += '<h3>🏅 Auszeichnungen</h3>' + HHA_RANKS.map(([p, n, ic]) => row(ic, n, `ab ${fmt(p)} Punkten`, sc.pts >= p ? '<span class="lv">✓</span>' : '')).join('');
      return h;
    }
    const sc = islandScore(s);
    h += hero('🦌 Rosi, Rathaus', `Inselbewertung: ${'⭐'.repeat(sc.stars)}${'☆'.repeat(5 - sc.stars)}`, `Wie schön finden die Nachbarn ihre Insel? Blumen, Deko, Inselprojekte und Wege machen sie glücklich – Unkraut nicht. Bei 5 Sternen gibt's eine Überraschung!`);
    h += row('🌷', 'Blumen', sc.flowers, '') + row('🏮', 'Deko & Obstbäume', sc.decos, '') + row('🏗️', 'Inselprojekte', sc.projects, '') + row('🌿', 'Unkraut', sc.weeds, '');
    h += sc.tips.length ? `<h3>💡 Rosis Tipps</h3><div class="note">${sc.tips.join('<br>')}</div>` : '<div class="note">🌟 Perfekt! Rosi ist sprachlos vor Glück.</div>';
    return h;
  },
  fund(s) {
    const site = siteOf(s);
    if (!site) return '<div class="note">Hier wird gerade nichts gebaut.</div>';
    const [k, o] = site, P = PROJECTS[o.p], paid = o.paid || 0, left = Math.max(0, P.cost - paid), [x, z] = k.split(',').map(Number);
    let h = hero('🚧 Bauschild', `${P.icon} ${P.name}`, paid >= P.cost ? '✅ Komplett bezahlt! Morgen früh wird es eingeweiht.' : 'Jede Spende hilft – alle auf der Insel können etwas geben.');
    h += `<div class="bar big"><i style="width:${Math.min(1, paid / P.cost) * 100}%"></i><span>${fmt(paid)} / ${fmt(P.cost)}</span></div><br>`;
    if (left) h += `<div class="bt" style="display:flex;gap:6px;flex-wrap:wrap">${[1000, 5000, 10000].filter(n => n < left).map(n => btn(`🪙 ${fmt(n)}`, { t: 'fund', x, z, n }, '', s.money < n)).join('')}${btn(`Rest: 🪙 ${fmt(left)}`, { t: 'fund', x, z, n: 'rest' }, 'pink', s.money < 1)}</div>`;
    return h;
  },
  boat(s) {
    return hero('🦭 Käpt\'n Flossi', 'Ahoi! Zur Tropeninsel?', `Hinter dem Horizont liegt eine kleine Tropeninsel: immer Sommer, seltene Käfer, süße Früchte und Kikis Tauschhütte mit Touren. Die Überfahrt kostet ${money(BOAT_PRICE)} – zurück ist gratis.`)
      + `<button class="big pink" data-ui="sail"${s.money < BOAT_PRICE ? ' disabled' : ''}><span class="i">⛵</span><span>Zur Tropeninsel<small>${fmt(BOAT_PRICE)} Taler</small></span></button>`
      + `<div class="note" style="margin-top:10px">🎲 <b>Ausflug ins Blaue:</b> Jeden Tag fahre ich zu einer anderen kleinen Insel – mal Bambus, mal ein Wasserfall mit seltenen Fischen, mal Kristalle, Blüten, Obst oder ganz viele Krabbeltiere!${s.trip?.day === s.day ? ' Heute: <b>' + TRIP_KINDS[tripLayout(s.trip.seed).kind].icon + ' ' + TRIP_KINDS[tripLayout(s.trip.seed).kind].name + '</b>.' : ''}</div>`
      + `<button class="big" data-ui="trip"${s.money < TRIP_PRICE ? ' disabled' : ''}><span class="i">🎲</span><span>Ausflug zur Zufallsinsel<small>${fmt(TRIP_PRICE)} Taler</small></span></button>`;
  },
  boatback(s) {
    return hero('🦭 Käpt\'n Flossi', 'Schon genug Sonne?', s.tour ? 'Achtung: Eure Tour läuft noch!' : 'Ich bringe dich zurück zum Steg auf eurer Insel.')
      + '<button class="big pink" data-ui="sailhome"><span class="i">⛵</span><span>Nach Hause<small>gratis</small></span></button>';
  },
  tailor(s) {
    let h = hero(STREET_SHOPS.tailor.who, 'Schneiderei Wollknäuel', 'Määäh, willkommen! Hier gibt es Hüte, die man sonst nirgends bekommt. Einmal gekauft, kann sie jede/r auf eurer Insel tragen.');
    if (!shopOpen(s, 'tailor')) return h + closed(s, 'tailor');
    for (const [id, W] of Object.entries(WARDROBE)) {
      if (W.medals) continue;
      const own = s.wardrobe?.[id], c = buyPrice(s, W.price);
      h += row(W.icon, W.name + (own ? ' <span class="lv">✓ gehört euch</span>' : ''), own ? 'Unter Aussehen ändern ➜ Extras' : 'Neuer Hut für alle auf der Insel', own ? '' : btn(`🪙 ${fmt(c)}`, { t: 'wear', id }, 'pink', s.money < c));
    }
    return h + '<br><button class="big" data-ui="editlook"><span class="i">🪞</span><span>Umziehen<small>Frisur, Outfit, Hüte …</small></span></button>';
  },
  garden(s, g, tab) {
    let h = hero(STREET_SHOPS.garden.who, 'Gärtnerei Knolle', 'Grüß dich! Bei mir gibt\'s Blumen, die der Krämerladen nicht hat, und schöne Büsche. Gieß sie gut!');
    if (!shopOpen(s, 'garden')) return h + closed(s, 'garden');
    if (tab === 'plants') {
      for (const [id, p] of Object.entries(PLACE)) if (p.garden) h += placeRow(s, id);
      return h;
    }
    for (const [k, c] of Object.entries(CROPS)) {
      if (!c.garden) continue;
      const id = 's_' + k, have = s.inv[id] || 0, ok = c.sea.includes(seasonOf(s.day));
      h += row(c.icon, c.name, `${ok ? '<b style="color:#5aa84a">✓ Saison</b> · ' : ''}${c.sea.map(x => SEASONS[x][1]).join('')} · blüht immer wieder · Verkauf ${money(price(s, k))}${have ? ` · <b>${have} Samen</b>` : ''}`,
        btn(`1× 🪙${c.seed}`, { t: 'buy', id, n: 1 }, '', s.money < c.seed) + btn(`10× 🪙${c.seed * 10}`, { t: 'buy', id, n: 10 }, '', s.money < c.seed * 10));
    }
    return h;
  },
  club(s) {
    let h = hero(STREET_SHOPS.club.who, 'Mondschein-Club', 'Quak! Abends ab 18 Uhr legt DJ Quak auf. Und jeden <b>Samstag ab 20 Uhr</b> spielt Lotte Laute live – dann dürft ihr euch ein Lied wünschen!');
    if (!shopOpen(s, 'club')) return h + closed(s, 'club');
    h += '<button class="big pink" data-ui="dance"><span class="i">💃</span><span>Tanzen!<small>Auf die Tanzfläche</small></span></button><br>';
    if (concertNow(s)) h += `<button class="big" data-act='${JSON.stringify({ t: 'song' })}' ${s.concert === s.day ? 'disabled' : ''}><span class="i">🎸</span><span>Lied wünschen<small>${s.concert === s.day ? 'Heute schon gewünscht' : 'Lotte spielt für euch'}</small></span></button><br>`;
    const have = SONGS.filter(([id]) => s.songs?.[id]).length;
    h += `<h3>🎵 Liederbuch <span class="lv">${have}/${SONGS.length}</span></h3><div class="album">${SONGS.map(([id, n]) => s.songs?.[id] ? `<div class="got"><span>💿</span><small>${n}</small></div>` : '<div><span>❔</span><small>???</small></div>').join('')}</div>`;
    return h;
  },
  hut(s) {
    let h = hero(TROPIC_HUT.who, `Kikis Tauschhütte · 🏅 ${s.medals || 0} Medaillen`, 'Kraaa! Macht eine Tour über die Insel und sammelt Medaillen. Die könnt ihr bei mir gegen Sachen tauschen, die es nur hier gibt!');
    h += '<h3>🗺️ Touren</h3>';
    if (s.tour) { const T = TOURS[s.tour.k], left = s.tour.targets.filter(t => !t.got).length; h += row(T.icon, `${T.name} läuft!`, `Noch ${left} von ${T.n} · ${Math.max(0, Math.ceil(s.tour.end - s.time))} Sekunden`, ''); }
    for (const [k, T] of Object.entries(TOURS)) h += row(T.icon, T.name, `${T.desc} · Belohnung: 🏅 ${T.medals}`, btn('Starten', { t: 'tour', k }, 'pink', !!s.tour));
    h += '<h3>🏅 Tauschen</h3>';
    for (const id of MEDAL_SHOP) { const p = PLACE[id]; h += row(p.icon, p.name, (p.desc || 'Deko aus den Tropen') + (s.inv[id] ? ` · <b>${s.inv[id]}× im Lager</b>` : ''), btn(`🏅 ${p.medals}`, { t: 'mbuy', id }, '', (s.medals || 0) < p.medals)); }
    const W = WARDROBE.sunhat, own = s.wardrobe?.sunhat;
    h += row(W.icon, W.name + (own ? ' <span class="lv">✓ gehört euch</span>' : ''), 'Ein Hut für Sonnentage', own ? '' : btn(`🏅 ${W.medals}`, { t: 'wear', id: 'sunhat' }, '', (s.medals || 0) < W.medals));
    return h;
  },
});

// Kochwettbewerb: sonntags oben in der Gartenküche
function cookContest(s, g) {
  if (!cookDay(s)) return '<div class="note">🏆 Jeden <b>Sonntag</b> von 9 bis 18 Uhr ist hier <b>Kochwettbewerb</b>: Drei Nachbarn probieren eure Gerichte. Wer gewinnt, bekommt ein geheimes Rezept!</div>';
  const c = s.cook;
  if (!c) return '';
  const jury = c.judges.map(id => NPCS[id] ? `${NPCS[id].icon} ${NPCS[id].name}` : id).join(' · ');
  const board = Object.values(c.entries).sort((a, b) => b.total - a.total).map((e, i) => `<div class="dyline"><span>${['🥇', '🥈', '🥉'][i] || '🍽️'}</span>${esc(e.name)}: ${ITEMS[e.dish].icon} ${ITEMS[e.dish].name} – <b>${e.total}</b>/30</div>`).join('');
  if (c.done) return `<div class="note">🏆 Der Kochwettbewerb ist vorbei${c.winner ? ` – gewonnen hat <b>${esc(c.winner)}</b>!` : '.'} Nächsten Sonntag wieder!</div>${board}`;
  let h = `<div class="note">🏆 <b>Heute ist Kochwettbewerb!</b> Jury: ${jury}. Jede und jeder darf bis 18 Uhr zwei Gerichte einreichen – Lieblingsessen der Jury geben Extrapunkte. Der Sieg bringt ein <b>geheimes Rezept</b>.</div>`;
  if (!cookOpen(s)) h += '<div class="note">🕘 Abgabe ist von 9 bis 18 Uhr.</div>';
  const dishes = Object.keys(s.inv).filter(id => ITEMS[id]?.cat === 'dish' && s.inv[id] > 0);
  h += dishes.length ? dishes.map(id => row(itemIcon(id), ITEMS[id].name, `${s.inv[id]}× in der Tasche`, btn('🍽️ Einreichen', { t: 'cookin', id }, 'pink', !cookOpen(s)))).join('') : '<div class="note">Kocht erst etwas – unten stehen die Rezepte.</div>';
  return h + (board ? `<h3>📋 Punkte bisher</h3>${board}` : '') + '<h3>🍳 Rezepte</h3>';
}

function recipes(s, st) {
  let h = st === 'cook' ? '<div class="note">Aus Obst, Gemüse, Fisch und Zutaten aus dem Laden werden leckere Gerichte – die bringen viel mehr Taler und sind tolle Geschenke für die Nachbarn.</div>'
    : `<div class="note">Heimwerken: Holz 🪵 (Axt an Bäumen), Äste 🥢 (Bäume schütteln), Steine 🪨, Lehm 🧱 und Eisen 🔩 (Schaufel an Felsen). Ihr kennt <b>${DIY_IDS.filter(k => s.recipes?.[k]).length}/${DIY_IDS.length}</b> Baupläne – neue gibt's in der 🍾 Flaschenpost am Strand!</div>`;
  for (const [id, r] of Object.entries(RECIPES)) {
    if (r.st !== st || (st === 'craft' && !s.recipes?.[id] && !r.gem) || (r.excl && !s.recipes?.[id])) continue;
    const it = ITEMS[r.out], locked = (r.lvl || 1) > s.level, can = Object.entries(r.in).every(([k, n]) => (s.inv[k] || 0) >= n);
    const need = Object.entries(r.in).map(([k, n]) => `<span style="color:${(s.inv[k] || 0) >= n ? '#5aa84a' : '#d64545'}">${ITEMS[k].icon} ${s.inv[k] || 0}/${n}</span>`).join(' · ');
    h += row(it.icon, `${r.n > 1 ? r.n + '× ' : ''}${it.name}${locked ? lvTag(r.lvl) : ''}`, need + (it.sell ? ` · Wert ${money(price(s, r.out))}` : ''), btn(st === 'cook' ? 'Kochen' : 'Bauen', { t: 'craft', id }, 'pink', locked || !can), locked);
  }
  return h;
}

export class Panels {
  constructor(cb) {
    this.cb = cb;
    this.open = null;
    this.tab = 'seeds';
    $('pclose').onclick = () => this.close();
    $('panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') this.close(); });
    $('pbody').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.act) {
        const a = JSON.parse(b.dataset.act);
        if (a.ui) cb.ui(a.ui, a); else cb.act(a);
      } else if (b.dataset.ui) cb.ui(b.dataset.ui, b.dataset);
    });
    $('ptabs').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      this.tab = b.dataset.tab;
      this.sig = null;
      $('pbody').scrollTop = 0;
    });
  }
  show(kind, tab) {
    this.open = kind;
    if (tab) this.tab = tab;
    if (TABS[kind] && !TABS[kind].some(t => t[0] === this.tab)) this.tab = TABS[kind][0][0];
    this.sig = null;
    $('panel').classList.remove('hidden');
    $('panel').classList.toggle('phone', kind === 'phone');
    $('ptitle').textContent = TITLES[kind];
    $('ptabs').innerHTML = (TABS[kind] || []).map(([id, l]) => `<button data-tab="${id}">${l}</button>`).join('');
    $('ptabs').classList.toggle('hidden', !TABS[kind]);
    $('pbody').scrollTop = 0;
  }
  close() {
    this.open = null;
    $('panel').classList.add('hidden');
  }
  // Nur neu zeichnen, wenn sich etwas Sichtbares geändert hat (Scroll-Position bleibt erhalten).
  update(s, g) {
    if (!this.open) return;
    const sig = JSON.stringify([this.open, this.tab, s.money, s.inv, s.up, s.level, s.orders, s.museum, s.recipes, g.pathType, Object.keys(s.paths || {}).length, s.turnip, this.open === 'phone' || this.open === 'turnip' ? Math.floor(s.dayTime * 36) : 0, Object.keys(g.players), g.code, g.settings, s.ach, s.album, s.mail.length, g.together, s.day, s.npc, s.home.wall, s.home.floor, s.quest, s.daily, s.mayor, s.loan, s.medals, s.wardrobe, s.songs, s.concert, s.tour && [s.tour.k, s.tour.targets.filter(t => t.got).length, Math.ceil(s.tour.end - s.time)], s.diary?.length, s.cook, s.night, s.stall, s.patterns, s.flagPat, s.pathPat, s.melody, g.visitor, s.residents, s.camper, s.pending, g.melEdit?.join(), g.patEdit && [g.patEdit.i, g.patEdit.c, g.patEdit.tool], s.paper?.day, s.week, s.book?.length, s.anniv, Object.keys(s.catalog || {}).length, s.reef, s.castles, s.beach, g.reefSlot, g.castleK, s.tales, s.areas, s.obj && Object.values(s.obj).filter(o => PLACE[o?.k]?.farm).map(o => [o.fed, o.pet, o.h]), s.contest && [Object.keys(s.contest.runs), s.contest.res.length, this.open === 'contest' ? Math.ceil(s.time / 5) : 0], siteOf(s)?.[1].paid, ['tailor', 'garden', 'club', 'hut'].includes(this.open) ? Math.floor(hourOf(s)) : 0]);
    if (sig === this.sig) return;
    // Während man schreibt (Brief, Tagebuch), nicht neu zeichnen – sonst wäre der Text weg
    if (this.sig && this.open === this.sigOpen && [...$('pbody').querySelectorAll('input:not([type=range]):not([type=file]), textarea')].some(i => i.value || i === document.activeElement)) return;
    this.sig = sig;
    this.sigOpen = this.open;
    const body = $('pbody'), y = body.scrollTop;
    body.innerHTML = PANELS[this.open](s, g, this.tab);
    fillIcons(body);
    body.scrollTop = y;
    $('pmoney').textContent = s.money.toLocaleString('de-DE');
    for (const b of $('ptabs').children) b.classList.toggle('on', b.dataset.tab === this.tab);
  }
}

// ---------- Hotbar ----------
// Werkzeug-Symbole: in Blender gebaut (blender/icons.py → assets/ui)
export const icon = (n, c = '') => `<img class="ico${c ? ' ' + c : ''}" src="assets/ui/${n}.webp" alt="" draggable="false">`;
const TOOLS = {
  hand: [icon('hand'), 'Hand: pflücken, schütteln, aufheben'],
  net: [icon('net'), 'Kescher: Insekten fangen'],
  shovel: [icon('shovel'), 'Schaufel: ausgraben & auf Felsen hauen'],
  axe: [icon('axe'), 'Axt: Holz hacken'],
  can: [icon('can'), 'Gießkanne'],
  sling: [icon('sling'), 'Schleuder: Geschenkballons abschießen'],
  pave: [icon('pave'), 'Insel-Designer: Wege legen (nochmal antippen = Wegart wählen)'],
};
// Werkzeuge ohne eigenes Blender-Bild bekommen das gerenderte Item-Bild
const TOOL_ITEM = { spade: ['baumschaufel', 'Baumschaufel: Bäume & Palmen ausgraben und woanders einpflanzen'], kite: ['drache', 'Drachen steigen lassen'], bike: ['fahrrad', 'Fahrrad: auf- und absteigen'] };
export function hotbarItems(s) {
  // Aufstellen, Einrichten und Wege legen geht jetzt im 🔨 Baumodus
  const items = ['hand', 'net', 'shovel', 'axe', 'can', 'sling'];
  if (s.inv.baumschaufel > 0) items.push('spade');
  if (s.inv.drache > 0) items.push('kite');
  if (s.inv.fahrrad > 0) items.push('bike');
  for (const k of Object.keys(CROPS)) if (s.inv['s_' + k] > 0) items.push('s_' + k);
  for (const [id, it] of Object.entries(ITEMS)) if (it.sapling && s.inv[id] > 0) items.push(id);
  return items;
}
export function slotHtml(s, id, i, sel) {
  const ti = TOOL_ITEM[id], tool = TOOLS[id] || (ti && [itemIcon(ti[0]), ti[1]]);
  const icon = tool ? tool[0] : itemIcon(id), title = tool ? tool[1] : ITEMS[id].name;
  const n = tool ? '' : `<span class="n">${s.inv[id]}</span>`;
  const gem = { net: 'saphirkescher', shovel: 'rubinschaufel', axe: 'kristallaxt', can: 'opalkanne' }[id], hasGem = gem && s.inv[gem] > 0;
  return `<button class="slot${id === sel ? ' sel' : ''}${hasGem ? ' gem' : ''}" data-id="${id}" title="${hasGem ? ITEMS[gem].name + ': ' + ITEMS[gem].desc : title}">${i < 9 ? `<span class="k">${i + 1}</span>` : ''}${icon}${ITEMS[id]?.seed ? '<span class="seed">🫘</span>' : ''}${n}</button>`;
}
