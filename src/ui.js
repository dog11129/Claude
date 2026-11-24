// Fenster-Inhalte (Laden, Lager, Aufträge, Freunde, Einstellungen). Reines HTML, Klicks gehen an Callbacks.
import { CROPS, ITEMS, PLACE, UPGRADES, EMOTE_LIST, AREA_NAME, ACHIEVEMENTS, needXp, SEASONS, RECIPES, ALBUM, BUGS, FOSSILS, FISH, SHELLS, SOCIAL, STORY, DAILY, MUSEUM, MUSEUM_ALL, isFlower } from './data.js';
import { settingsHtml } from './menu.js';
import { price, upgradeInfo, seasonOf, hearts } from './state.js';
import { NPCS, letter, requestLine } from './npc.js';
import { FURNITURE, WALLS, FLOORS } from './furni-data.js';
import { esc } from './world.js';

const $ = id => document.getElementById(id);
const lines = {}; // Sprüche/Briefe einmal würfeln, damit sie beim Neuzeichnen gleich bleiben
const money = n => `<span class="money">🪙 ${n.toLocaleString('de-DE')}</span>`;
const lvTag = l => `<span class="lv">ab Lv ${l}</span>`;
const pips = (l, max) => `<span class="pips">${'●'.repeat(l)}${'○'.repeat(Math.max(0, max - l))}</span>`;
const time = s => s >= 60 ? `${Math.round(s / 6) / 10} Min` : `${s} s`;

export const TABS = {
  shop: [['seeds', '🌷 Samen'], ['trees', '🌳 Bäume'], ['food', '🥛 Zutaten'], ['furn', '🛋️ Möbel'], ['deco', '🏮 Deko'], ['farm', '🏡 Haus'], ['tools', '🛠️ Werkzeug'], ['goods', '💎 Preise']],
  orders: [['quests', '📜 Quests'], ['orders', '💬 Wünsche'], ['friends', '🏘️ Nachbarn'], ['album', '📖 Sammelbuch'], ['goals', '🏆 Erfolge'], ['stats', '📊 Insel']],
  settings: [['menu', '⚙️ Menü'], ['options', '🎨 Optionen'], ['help', '❓ Hilfe']],
};
const TITLES = { shop: '🛒 Krämerladen', sell: '🎒 Taschen & Verkauf', orders: '📋 Inselbuch', museum: '🏛️ Museum', friends: '👥 Freunde', emotes: '😊 Emotes', settings: '⚙️ Menü', craft: '🔨 Werkbank', cook: '🍳 Gartenküche', together: '💞 Zusammen', mail: '💌 Briefkasten' };

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
    return '<div class="note">Mehr Platz für Möbel: Ein größeres Haus hat ein größeres Zimmer.</div>' + upgradeRow(s, 'house');
  },
  tools(s) {
    let h = `<div class="note">Bessere Werkzeuge: Die Gießkanne gießt mehr Blumen auf einmal (${AREA_NAME.slice(1).join(' ➜ ')}), mit der besseren Angel beißen seltene Fische.</div>`;
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'tools') h += upgradeRow(s, id);
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
    for (const [id, p] of Object.entries(PLACE)) if (p.kind === 'deco') h += placeRow(s, id);
    return h;
  },
};

const PANELS = {
  shop: (s, g, tab) => SHOP[tab](s),
  sell(s) {
    const sellable = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id]?.sell);
    const total = sellable.reduce((t, [id, n]) => t + price(s, id) * n, 0);
    let h = sellable.length ? `<div class="row"><div class="ic">💰</div><div class="tx"><b>Alles verkaufen</b><small>${sellable.length} Sorten</small></div><div class="bt">${btn(`+🪙 ${total}`, { t: 'sellAll' }, 'pink')}</div></div>` : '<div class="note">Noch nichts zu verkaufen. Schüttelt Bäume, sammelt Muscheln, angelt! 🍎🐚🎣</div>';
    for (const [id, n] of sellable) {
      const p = price(s, id);
      h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, `je ${money(p)}`, btn('1', { t: 'sell', id, n: 1 }, 'white') + btn(`Alle +${p * n}`, { t: 'sell', id, n }));
    }
    const rest = Object.entries(s.inv).filter(([id, n]) => n > 0 && !ITEMS[id]?.sell && ITEMS[id]);
    if (rest.length) {
      h += '<h3>Behalten</h3>';
      for (const [id, n] of rest) h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, ITEMS[id].seed ? 'Samen' : ITEMS[id].place ? 'Zum Aufstellen' : ITEMS[id].furn ? 'Möbel fürs Haus' : 'Zutat', '');
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
        const hh = hearts(s, id), n = s.npc[id] || {};
        const lk = hh >= 2 ? N.likes.map(i => ITEMS[i].icon).join(' ') : '❔❔', lv = hh >= 4 ? N.loves.map(i => ITEMS[i].icon).join(' ') : '❔';
        h += `<div class="row"><div class="ic">${N.icon}</div><div class="tx"><b>${N.name} <span class="lv">${N.role}</span></b><small>${N.bio}</small>
          <small>💕 ${'❤️'.repeat(hh)}${'🤍'.repeat(10 - hh)}</small><small>Mag: ${lk} · Liebt: ${lv}${n.talk === s.day ? ' · 💬 heute geplaudert' : ''}${n.gift === s.day ? ' · 🎁 beschenkt' : ''}</small></div></div>`;
      }
      return h;
    }
    if (tab === 'album') {
      const n = Object.keys(s.album).filter(k => !['flaschenpost', 'schatz'].includes(k)).length, all = ALBUM.fish.length + ALBUM.bug.length + ALBUM.fossil.length + ALBUM.shell.length;
      const where = { river: '🏞️ Fluss', sea: '🌊 Meer', pond: '🪷 Teich' };
      const info = { ...Object.fromEntries(FISH.map(f => [f[0], `${where[f[6]]} ${(f[5] || []).map(x => SEASONS[x][1]).join('') || ''}`])), ...Object.fromEntries(SHELLS.map(f => [f[0], '🏖️ Strand'])),
        ...Object.fromEntries(BUGS.map(b => [b[0], b[4].map(x => SEASONS[x][1]).join('') + (b[5] === 'night' ? ' 🌙' : b[5] === 'day' ? ' ☀️' : '')])),
        ...Object.fromEntries(FOSSILS.map(f => [f[0], 'Ausgraben'])) };
      const sec = (t, ids) => `<h3>${t}</h3><div class="album">${ids.map(id => s.album[id]
        ? `<div class="got" title="${ITEMS[id].name}"><span>${ITEMS[id].icon}</span><small>${ITEMS[id].name}</small><i>${s.album[id]}×</i></div>`
        : `<div title="${info[id] || ''}"><span>❔</span><small>${info[id] || '???'}</small></div>`).join('')}</div>`;
      return `<div class="note">Alles, was ihr fangt und ausgrabt, wird hier eingetragen. Gesammelt: <b>${n}/${all}</b></div><div class="bar"><i style="width:${n / all * 100}%"></i></div>` +
        sec('🎣 Fische', ALBUM.fish) + sec('🦋 Insekten', ALBUM.bug) + sec('🦴 Funde', ALBUM.fossil) + sec('🐚 Muscheln', ALBUM.shell);
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
  museum(s) {
    const n = Object.keys(s.museum || {}).length;
    let h = `<div class="note">Hier stellt ihr eure Fische 🐟, Insekten 🦋 und Fossilien 🦴 aus – jedes Stück einmal. Ausgestellt: <b>${n}/${MUSEUM_ALL.length}</b></div><div class="bar"><i style="width:${n / MUSEUM_ALL.length * 100}%"></i></div>`;
    const can = MUSEUM_ALL.filter(id => !s.museum?.[id] && s.inv[id] > 0);
    if (can.length) {
      h += '<h3>🎁 Kann ausgestellt werden</h3>';
      for (const id of can) h += row(ITEMS[id].icon, ITEMS[id].name, `${s.inv[id]}× in der Tasche · Wert ${money(price(s, id))}`, btn('Ausstellen', { t: 'donate', id }, 'pink'));
    } else h += '<div class="note">Gerade habt ihr nichts Neues dabei. Angelt, fangt Insekten oder grabt an den Stern-Rissen ✨!</div>';
    const sec = (t, ids) => `<h3>${t} <span class="lv">${ids.filter(id => s.museum?.[id]).length}/${ids.length}</span></h3><div class="album">${ids.map(id => s.museum?.[id]
      ? `<div class="got" title="${ITEMS[id].name}"><span>${ITEMS[id].icon}</span><small>${ITEMS[id].name}</small></div>`
      : `<div><span>❔</span><small>???</small></div>`).join('')}</div>`;
    return h + sec('🐟 Aquarium', MUSEUM.fish) + sec('🦋 Insektenhaus', MUSEUM.bug) + sec('🦴 Fossilienhalle', MUSEUM.fossil);
  },
  craft: (s, g) => recipes(s, 'craft'),
  cook: (s, g) => recipes(s, 'cook'),
  mail(s, g) {
    if (!s.mail.length) return '<div class="note">📭 Der Briefkasten ist leer. Freundet euch mit den Nachbarn an – manchmal schreiben sie euch!</div>';
    return s.mail.map((m, i) => { const L = (lines['mail' + i + m.from + m.hearts] ||= letter(m.from, m.hearts, g.myName)); return `<div class="letter"><h3>${NPCS[m.from]?.icon || '💌'} ${esc(L.title)}</h3><p>${esc(L.text).replace(/\n/g, '<br>')}</p>
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
      ⭐ Mit Erfahrung steigt eure Insel im Level und schaltet Neues frei.</div>`;
    }
    return `<button class="big" data-ui="editlook"><span class="i">👗</span><span>Aussehen ändern<small>Frisur, Outfit, Haustier …</small></span></button><br>
      <button class="big" data-ui="photo"><span class="i">📷</span><span>Fotomodus<small>Schöne Erinnerungsfotos von eurer Insel</small></span></button><br>
      <button class="big pink" data-ui="leave"><span class="i">🏠</span><span>Zurück zum Hauptmenü<small>Die Insel wird gespeichert</small></span></button>`;
  },
};

function recipes(s, st) {
  let h = st === 'cook' ? '<div class="note">Aus Obst, Gemüse, Fisch und Zutaten aus dem Laden werden leckere Gerichte – die bringen viel mehr Taler und sind tolle Geschenke für die Nachbarn.</div>'
    : '<div class="note">Heimwerken: Holz 🪵 (Axt an Bäumen), Äste 🥢 (Bäume schütteln), Steine 🪨, Lehm 🧱 und Eisen 🔩 (Schaufel an Felsen).</div>';
  for (const [id, r] of Object.entries(RECIPES)) {
    if (r.st !== st) continue;
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
    const sig = JSON.stringify([this.open, this.tab, s.money, s.inv, s.up, s.level, s.orders, s.museum, Object.keys(g.players), g.code, g.settings, s.ach, s.album, s.mail.length, g.together, s.day, s.npc, s.home.wall, s.home.floor, s.quest, s.daily]);
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
// Werkzeug-Symbole als kleine Zeichnungen (Emojis gibt es nicht für alle)
const svg = b => `<svg viewBox="0 0 32 32" width="30" height="30">${b}</svg>`;
const TOOLS = {
  can: [svg('<rect x="7" y="12" width="15" height="13" rx="4" fill="#7cc6e8"/><path d="M21 15 L29 9 L30 11 L23 18Z" fill="#5aa9cf"/><path d="M9 12 Q14 4 20 12" stroke="#5aa9cf" stroke-width="2.5" fill="none"/><circle cx="29" cy="9" r="2" fill="#5aa9cf"/>'), 'Gießkanne'],
  hand: ['✋', 'Hand: pflücken, schütteln, aufheben'],
  axe: [svg('<rect x="14" y="5" width="4" height="23" rx="2" fill="#c98d55" transform="rotate(-25 16 16)"/><path d="M14 4 Q24 3 25 10 Q20 13 15 12Z" fill="#9aa6b2" stroke="#6d7884" stroke-width="1"/>'), 'Axt: Holz hacken'],
  shovel: [svg('<rect x="14.5" y="3" width="3" height="17" rx="1.5" fill="#c98d55"/><rect x="11" y="2" width="10" height="3" rx="1.5" fill="#c98d55"/><path d="M10 19 H22 V24 Q16 31 10 24Z" fill="#9aa6b2" stroke="#6d7884" stroke-width="1"/>'), 'Schaufel: ausgraben & auf Felsen hauen'],
  net: [svg('<rect x="15" y="12" width="3" height="18" rx="1.5" fill="#c98d55" transform="rotate(20 16 20)"/><ellipse cx="13" cy="9" rx="8" ry="6.5" fill="#f4f1ea" stroke="#b8b0a2" stroke-width="2"/><path d="M7 9 H19 M13 3 V15" stroke="#d9d2c4" stroke-width="1"/>'), 'Kescher: Insekten fangen'],
};
export function hotbarItems(s) {
  const items = ['hand', 'net', 'shovel', 'axe', 'can'];
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
