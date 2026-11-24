// Fenster-Inhalte (Laden, Lager, Aufträge, Freunde, Einstellungen). Reines HTML, Klicks gehen an Callbacks.
import { CROPS, ITEMS, PLACE, UPGRADES, EMOTE_LIST, AREA_NAME, ACHIEVEMENTS, needXp, SEASONS, RECIPES, ALBUM, BUGS, FOSSILS, FISH, SHELLS, SEA, SOCIAL, STORY, DAILY, MUSEUM, MUSEUM_ALL, isFlower, PAVE, WEEKDAYS, weekday, TURNIP_STACK, DIY_IDS } from './data.js';
import { settingsHtml } from './menu.js';
import { price, upgradeInfo, seasonOf, hearts, halfDay, turnipSeller, turnipPrice } from './state.js';
import { NPCS, letter, requestLine } from './npc.js';
import { FURNITURE, WALLS, FLOORS } from './furni-data.js';
import { esc } from './world.js';
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
  shop: [['seeds', '🌷 Samen'], ['trees', '🌳 Bäume'], ['food', '🥛 Zutaten'], ['furn', '🛋️ Möbel'], ['deco', '🏮 Deko'], ['farm', '🏡 Haus'], ['tools', '🛠️ Werkzeug'], ['goods', '💎 Preise']],
  orders: [['quests', '📜 Quests'], ['orders', '💬 Wünsche'], ['friends', '🏘️ Nachbarn'], ['album', '📖 Sammelbuch'], ['goals', '🏆 Erfolge'], ['stats', '📊 Insel']],
  mayor: [['projects', '🏗️ Projekte'], ['ords', '📜 Verordnungen'], ['house', '🏡 Haus & Kredit'], ['hha', '🛋️ Wohnwert'], ['stars', '⭐ Inselbewertung']],
  garden: [['seeds', '🌱 Samen'], ['plants', '🌳 Pflanzen']],
  settings: [['menu', '⚙️ Menü'], ['options', '🎨 Optionen'], ['help', '❓ Hilfe']],
};
const TITLES = { mayor: '🏛️ Rathaus', fund: '🏗️ Baustelle', boat: '⛵ Käpt\'n Flossis Boot', boatback: '⛵ Käpt\'n Flossis Boot', tailor: '🧵 Schneiderei Wollknäuel', garden: '🌱 Gärtnerei Knolle', club: '🌙 Mondschein-Club', hut: '🦜 Kikis Tauschhütte', phone: '📱 Inselhandy', map: '🗺️ Inselkarte', turnip: '📈 Rübenbörse', designer: '🧱 Insel-Designer', recipes: '🔨 Rezepte', shop: '🛒 Krämerladen', sell: '🎒 Taschen & Verkauf', orders: '📋 Inselbuch', museum: '🏛️ Museum', friends: '👥 Freunde', emotes: '😊 Emotes', settings: '⚙️ Menü', craft: '🔨 Werkbank', cook: '🍳 Gartenküche', together: '💞 Zusammen', mail: '💌 Briefkasten' };

function row(icon, title, sub, buttons, locked) {
  return `<div class="row${locked ? ' locked' : ''}"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
}
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
      if (c.garden) continue;
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
    for (const [id, p] of Object.entries(PLACE)) if (p.kind === 'producer') h += placeRow(s, id);
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
    return h;
  },
  goods(s) {
    let h = '<div class="note">Gute Beziehungen zum Krämerladen: Er zahlt euch mehr für eure Sachen.</div>';
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'goods') h += upgradeRow(s, id);
    return h;
  },
  furn(s) {
    const cats = { sitzen: '🪑 Sitzen', tische: '🍽️ Tische', betten: '🛏️ Schlafen & Schränke', licht: '💡 Licht', kueche: '🍳 Küche', teppiche: '🟫 Teppiche', pflanzen: '🪴 Pflanzen', deko: '🧸 Deko', wand: '🖼️ Wand' };
    let h = '<div class="note">Möbel fürs Haus: kaufen ➜ ins Haus gehen 🚪 ➜ in der Leiste wählen ➜ hinstellen (zeigt zu dir). Mit der Hand ✋ wieder aufheben. Manche Möbel könnt ihr auch an der Werkbank bauen.</div>';
    const sw = (kind, list) => `<div class="swatches">${list.map(([id, l, c]) => `<button title="${l}" style="background:${c};width:44px;height:44px;border-radius:12px" data-act='${JSON.stringify({ t: 'hstyle', kind, id })}' class="${s.home[kind] === id ? 'on' : ''}"></button>`).join('')}</div>`;
    h += `<div class="row"><div class="ic">🖌️</div><div class="tx"><b>Tapete <span class="lv">🪙 350</span></b><small>${WALLS.find(w => w[0] === s.home.wall)?.[1] || ''}</small>${sw('wall', WALLS)}</div></div>`;
    h += `<div class="row"><div class="ic">🪵</div><div class="tx"><b>Boden <span class="lv">🪙 350</span></b><small>${FLOORS.find(w => w[0] === s.home.floor)?.[1] || ''}</small>${sw('floor', FLOORS)}</div></div>`;
    for (const [c, label] of Object.entries(cats)) {
      h += `<h3>${label}</h3>`;
      for (const [id, f] of Object.entries(FURNITURE)) {
        if (f.cat !== c) continue;
        const locked = f.lvl > s.level, have = s.inv[id] || 0;
        h += row(f.icon, f.name + (locked ? lvTag(f.lvl) : ''), `${f.w}×${f.d}${f.sit ? ' · zum Sitzen' : ''}${f.bed ? ' · zum Schlafen' : ''}${f.craft ? ' · auch an der Werkbank' : ''}${have ? ` · <b>${have}× im Lager</b>` : ''}`,
          btn(`🪙 ${f.buy}`, { t: 'buy', id, n: 1 }, '', locked || s.money < f.buy), locked);
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
      h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, `je ${money(p)}`, btn('1', { t: 'sell', id, n: 1 }, 'white') + btn(`Alle +${p * n}`, { t: 'sell', id, n }));
    }
    const rest = Object.entries(s.inv).filter(([id, n]) => n > 0 && !(price(s, id) > 0) && ITEMS[id]);
    if (rest.length) {
      h += '<h3>Behalten</h3>';
      for (const [id, n] of rest) h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, ITEMS[id].seed ? 'Samen' : ITEMS[id].place ? 'Zum Aufstellen' : ITEMS[id].furn ? 'Möbel fürs Haus' : ITEMS[id].turnip ? 'Heute kauft der Laden keine Rüben (sonntags nie)' : id === 'faule_ruebe' ? 'Leider verfault …' : 'Zutat', '');
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
      const n = Object.keys(s.album).filter(k => !['flaschenpost', 'schatz', 'sternsplitter'].includes(k)).length, all = ALBUM.fish.length + ALBUM.sea.length + ALBUM.bug.length + ALBUM.fossil.length + ALBUM.shell.length;
      const where = { river: '🏞️ Fluss', sea: '🌊 Meer', pond: '🪷 Teich' };
      const info = { ...Object.fromEntries(FISH.map(f => [f[0], `${where[f[6]]} ${(f[5] || []).map(x => SEASONS[x][1]).join('') || ''}`])), ...Object.fromEntries(SHELLS.map(f => [f[0], '🏖️ Strand'])), ...Object.fromEntries(SEA.map(f => [f[0], '🤿 Tauchen'])),
        ...Object.fromEntries(BUGS.map(b => [b[0], b[5] === 'tropic' ? '🏝️ Tropeninsel' : b[4].map(x => SEASONS[x][1]).join('') + (b[5] === 'night' ? ' 🌙' : b[5] === 'day' ? ' ☀️' : '')])),
        ...Object.fromEntries(FOSSILS.map(f => [f[0], 'Ausgraben'])) };
      const sec = (t, ids) => `<h3>${t}</h3><div class="album">${ids.map(id => s.album[id]
        ? `<div class="got" title="${ITEMS[id].name}"><span>${ITEMS[id].icon}</span><small>${ITEMS[id].name}</small><i>${s.album[id]}×</i></div>`
        : `<div title="${info[id] || ''}"><span>❔</span><small>${info[id] || '???'}</small></div>`).join('')}</div>`;
      return `<div class="note">Alles, was ihr fangt und ausgrabt, wird hier eingetragen. Gesammelt: <b>${n}/${all}</b></div><div class="bar"><i style="width:${n / all * 100}%"></i></div>` +
        sec('🎣 Fische', ALBUM.fish) + sec('🤿 Meerestiere', ALBUM.sea) + sec('🦋 Insekten', ALBUM.bug) + sec('🦴 Funde', ALBUM.fossil) + sec('🐚 Muscheln', ALBUM.shell);
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
      const kick = (p.id !== g.me ? btn('Hinbeamen ✨', { ui: 'goto', id: p.id }) : '') + (g.role === 'host' && p.id !== g.me ? btn('Entfernen', { ui: 'kick', id: p.id }, 'white') : '');
      h += row(`<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${esc(p.look?.topColor || '#ccc')};border:3px solid ${esc(p.look?.hairColor || '#fff')}"></span>`, esc(p.name) + (p.id === 'h' ? ' 👑' : '') + (p.id === g.me ? ' (du)' : ''), p.id === 'h' ? 'Host – die Insel wird auf diesem Gerät gespeichert' : 'Gast – bekommt automatisch eine Kopie der Insel', kick);
    }
    h += '<div class="note">Alles ist geteilt: Taler, Taschen, Museum und Fortschritt. Jede/r bekommt eine Sicherheitskopie und kann die Insel später auch selbst hosten.</div>';
    return h;
  },
  emotes() {
    return `<div class="emogrid">${EMOTE_LIST.map(([e, l]) => `<button data-ui="emote" data-e="${e}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>`;
  },
  together(s, g) {
    const p = g.players[g.together];
    if (!p) return '<div class="note">Dein Lieblingsmensch ist gerade nicht in der Nähe.</div>';
    return `<div class="note">Was möchtest du mit <b>${esc(p.name)}</b> machen?</div><div class="emogrid">${Object.entries(SOCIAL).map(([k, [e, l]]) => `<button data-ui="soc" data-k="${k}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>`;
  },
  phone(s, g) {
    const ready = s.orders.filter(o => (s.inv[o.item] || 0) >= o.n).length + (s.quest.done ? 1 : 0) + s.daily.filter(d => d.done && !d.claimed).length;
    const canMuseum = MUSEUM_ALL.filter(id => !s.museum?.[id] && s.inv[id] > 0).length;
    const apps = [['map', '🗺️', 'Karte', '#7fd3a8'], ['shop', '🛍️', 'Bestellen', '#ffb36b'], ['sell', '🎒', 'Taschen', '#f7a8c4'], ['quests', '📜', 'Inselbuch', '#ffd66b', ready],
      ['album', '📖', 'Sammelbuch', '#9fd0ff'], ['museum', '🏛️', 'Museum', '#b8c8d8', canMuseum], ['recipes', '🔨', 'Rezepte', '#e3b47c'], ['turnip', '📈', 'Rübenkurs', '#c9b2ff', turnipSeller(s) ? '!' : 0],
      ['designer', '🧱', 'Designer', '#f4a582'], ['friends', '👥', 'Freunde', '#a8e2cf'], ['goals', '🏆', 'Erfolge', '#ffe08a'], ['emotes', '😊', 'Gefühle', '#ffc8dc'],
      ['camera', '📷', 'Kamera', '#c4ccd4'], ['sky', '🔭', 'Himmel', '#7f8fd8'], ['settings', '⚙️', 'Optionen', '#d8cfc2']];
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
    let h = `<div class="note">Hier stellt ihr eure Fische 🐟, Meerestiere 🤿, Insekten 🦋 und Fossilien 🦴 aus – jedes Stück einmal. Ausgestellt: <b>${n}/${MUSEUM_ALL.length}</b></div><div class="bar"><i style="width:${n / MUSEUM_ALL.length * 100}%"></i></div>`;
    const can = MUSEUM_ALL.filter(id => !s.museum?.[id] && s.inv[id] > 0);
    if (can.length) {
      h += '<h3>🎁 Kann ausgestellt werden</h3>';
      for (const id of can) h += row(ITEMS[id].icon, ITEMS[id].name, `${s.inv[id]}× in der Tasche · Wert ${money(price(s, id))}`, btn('Ausstellen', { t: 'donate', id }, 'pink'));
    } else h += '<div class="note">Gerade habt ihr nichts Neues dabei. Angelt, fangt Insekten oder grabt an den Stern-Rissen ✨!</div>';
    const sec = (t, ids) => `<h3>${t} <span class="lv">${ids.filter(id => s.museum?.[id]).length}/${ids.length}</span></h3><div class="album">${ids.map(id => s.museum?.[id]
      ? `<div class="got" title="${ITEMS[id].name}"><span>${ITEMS[id].icon}</span><small>${ITEMS[id].name}</small></div>`
      : `<div><span>❔</span><small>???</small></div>`).join('')}</div>`;
    return h + sec('🐟 Aquarium', MUSEUM.fish) + sec('🤿 Meeresbecken', MUSEUM.sea) + sec('🦋 Insektenhaus', MUSEUM.bug) + sec('🦴 Fossilienhalle', MUSEUM.fossil);
  },
  craft: (s, g) => recipes(s, 'craft'),
  cook: (s, g) => recipes(s, 'cook'),
  mail(s, g) {
    if (!s.mail.length) return '<div class="note">📭 Der Briefkasten ist leer. Freundet euch mit den Nachbarn an – manchmal schreiben sie euch!</div>';
    return s.mail.map((m, i) => { const L = m.kind ? { title: m.title, text: m.text } : (lines['mail' + i + m.from + m.hearts] ||= letter(m.from, m.hearts, g.myName)); return `<div class="letter"><h3>${m.kind ? '' : NPCS[m.from]?.icon || '💌'} ${esc(L.title)}</h3><p>${esc(L.text).replace(/\n/g, '<br>')}</p>
      ${m.item ? `<div class="row"><div class="ic">${ITEMS[m.item]?.icon || '🎁'}</div><div class="tx"><b>Geschenk: ${m.n || 1}× ${ITEMS[m.item]?.name || m.item}</b></div><div class="bt">${btn('Annehmen', { t: 'mail', i, from: m.from, hearts: m.hearts })}</div></div>` : `<div class="bt">${btn('Gelesen ✓', { t: 'mail', i, from: m.from, hearts: m.hearts }, 'white')}</div>`}</div>`; }).join('');
  },
  settings(s, g, tab) {
    if (tab === 'options') return settingsHtml(g.settings, g.touch);
    if (tab === 'help') {
      return `<div class="note">💻 <b>PC:</b> WASD/Pfeiltasten laufen · Klick = hinlaufen & benutzen · E/Leertaste = Aktion · 1–9 Werkzeug · Mausrad Zoom · rechte Maustaste ziehen oder Z/C = Kamera drehen · Enter Chat · B Laden · I Taschen · O Inselbuch · Q Emotes · P Fotomodus<br><br>
      📱 <b>Handy:</b> links wischen = laufen · irgendwo antippen = hinlaufen & benutzen · großer Knopf = Aktion · zwei Finger = zoomen & drehen · 🔄 Kamera drehen<br><br>
      🍎 Bäume schütteln: Obst fällt herunter (wächst in 3 Tagen nach). Mit der Axt 🪓 gibt's Holz.<br>
      🌷 Samen auf den Rasen pflanzen ➜ Gießkanne 💧 ➜ pflücken. Blumen blühen immer wieder.<br>
      🐚 Muscheln am Strand aufheben, 🌿 Unkraut zupfen, ✨ Stern-Risse mit der Schaufel ausgraben.<br>
      🎣 Am Fluss, Teich, Meer oder vom Steg angeln: warten bis ❗ erscheint, dann schnell nochmal drücken.<br>
      🏛️ Fische, Insekten und Fossilien im Museum ausstellen.<br>
      🪑 Auf Bänke kannst du dich setzen, und deinen Lieblingsmenschen kannst du umarmen 🤗.<br>
      💰 An der Ankaufkiste vor dem Krämerladen oder in den 🎒 Taschen verkaufen. 💬 Wünsche der Nachbarn & 🏆 Erfolge geben Extra-Taler.<br>
      ⭐ Mit Erfahrung steigt eure Insel im Level und schaltet Neues frei.<br><br>
      🏛️ <b>Rathaus:</b> Ihr seid Bürgermeister! Inselprojekte bauen, Verordnungen erlassen, Haus auf Kredit ausbauen, Wohnwert & Inselbewertung ansehen.<br>
      🛍️ <b>Bummelgasse:</b> Durchs Tor im Norden – Schneiderei (Hüte), Gärtnerei (seltene Blumen) und abends der Mondschein-Club (samstags Livemusik).<br>
      ⛵ <b>Tropeninsel:</b> Am Ende des Stegs wartet Käpt'n Flossi. Drüben: Tropenfrüchte, seltene Käfer und Touren für Medaillen.</div>`;
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
    if (tab === 'projects') {
      const site = siteOf(s);
      h += hero('🦌 Rosi, Rathaus', 'Inselprojekte', 'Als Bürgermeister bestimmt ihr, was auf der Insel gebaut wird! Projekt aussuchen ➜ Bauplatz-Pflock 🚩 aus der Leiste auf freien Rasen stecken (mit einer Kachel Platz drumherum) ➜ am Schild Taler spenden ➜ am nächsten Morgen wird eingeweiht.');
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
      + `<button class="big pink" data-ui="sail"${s.money < BOAT_PRICE ? ' disabled' : ''}><span class="i">⛵</span><span>Ablegen!<small>${fmt(BOAT_PRICE)} Taler</small></span></button>`;
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

function recipes(s, st) {
  let h = st === 'cook' ? '<div class="note">Aus Obst, Gemüse, Fisch und Zutaten aus dem Laden werden leckere Gerichte – die bringen viel mehr Taler und sind tolle Geschenke für die Nachbarn.</div>'
    : `<div class="note">Heimwerken: Holz 🪵 (Axt an Bäumen), Äste 🥢 (Bäume schütteln), Steine 🪨, Lehm 🧱 und Eisen 🔩 (Schaufel an Felsen). Ihr kennt <b>${DIY_IDS.filter(k => s.recipes?.[k]).length}/${DIY_IDS.length}</b> Baupläne – neue gibt's in der 🍾 Flaschenpost am Strand!</div>`;
  for (const [id, r] of Object.entries(RECIPES)) {
    if (r.st !== st || (st === 'craft' && !s.recipes?.[id])) continue;
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
    const sig = JSON.stringify([this.open, this.tab, s.money, s.inv, s.up, s.level, s.orders, s.museum, s.recipes, g.pathType, Object.keys(s.paths || {}).length, s.turnip, this.open === 'phone' || this.open === 'turnip' ? Math.floor(s.dayTime * 36) : 0, Object.keys(g.players), g.code, g.settings, s.ach, s.album, s.mail.length, g.together, s.day, s.npc, s.home.wall, s.home.floor, s.quest, s.daily, s.mayor, s.loan, s.medals, s.wardrobe, s.songs, s.concert, s.tour && [s.tour.k, s.tour.targets.filter(t => t.got).length, Math.ceil(s.tour.end - s.time)], siteOf(s)?.[1].paid, ['tailor', 'garden', 'club', 'hut'].includes(this.open) ? Math.floor(hourOf(s)) : 0]);
    if (sig === this.sig) return;
    this.sig = sig;
    const body = $('pbody'), y = body.scrollTop;
    body.innerHTML = PANELS[this.open](s, g, this.tab);
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
export function hotbarItems(s) {
  const items = ['hand', 'net', 'shovel', 'axe', 'can', 'sling', 'pave'];
  for (const k of Object.keys(CROPS)) if (s.inv['s_' + k] > 0) items.push('s_' + k);
  for (const k of Object.keys(PLACE)) if (s.inv[k] > 0) items.push(k);
  for (const k of Object.keys(FURNITURE)) if (s.inv[k] > 0) items.push(k);
  return items;
}
export function slotHtml(s, id, i, sel) {
  const tool = TOOLS[id];
  const icon = tool ? tool[0] : ITEMS[id].icon, title = tool ? tool[1] : ITEMS[id].name;
  const n = tool ? '' : `<span class="n">${s.inv[id]}</span>`;
  return `<button class="slot${id === sel ? ' sel' : ''}" data-id="${id}" title="${title}">${i < 9 ? `<span class="k">${i + 1}</span>` : ''}${icon}${ITEMS[id]?.seed ? '<span class="seed">🫘</span>' : ''}${n}</button>`;
}
