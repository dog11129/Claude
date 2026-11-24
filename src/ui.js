// Fenster-Inhalte (Laden, Lager, Aufträge, Freunde, Einstellungen). Reines HTML, Klicks gehen an Callbacks.
import { CROPS, ANIMALS, ITEMS, PLACE, UPGRADES, EMOTES, AREA_NAME, ACHIEVEMENTS, needXp } from './data.js';
import { settingsHtml } from './menu.js';
import { price, upgradeInfo, capacity, animalCount } from './state.js';
import { esc } from './world.js';

const $ = id => document.getElementById(id);
const money = n => `<span class="money">🪙 ${n.toLocaleString('de-DE')}</span>`;
const lvTag = l => `<span class="lv">ab Lv ${l}</span>`;
const pips = (l, max) => `<span class="pips">${'●'.repeat(l)}${'○'.repeat(Math.max(0, max - l))}</span>`;
const time = s => s >= 60 ? `${Math.round(s / 6) / 10} Min` : `${s} s`;

export const TABS = {
  shop: [['seeds', '🌱 Samen'], ['animals', '🐾 Tiere'], ['farm', '🏡 Farm'], ['tools', '🛠️ Werkzeug'], ['goods', '💎 Waren'], ['deco', '🌷 Deko']],
  orders: [['orders', '📋 Aufträge'], ['goals', '🏆 Erfolge'], ['stats', '📊 Statistik']],
  settings: [['menu', '⚙️ Menü'], ['options', '🎨 Optionen'], ['help', '❓ Hilfe']],
};
const TITLES = { shop: '🛒 Laden', sell: '🎒 Lager & Verkauf', orders: '📋 Hof-Buch', friends: '👥 Freunde', emotes: '😊 Emotes', settings: '⚙️ Menü' };

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
  if (p.kind === 'machine') sub = `${p.in.map(i => ITEMS[i].icon).join('/')} ➜ ${ITEMS[p.out].icon} ${ITEMS[p.out].name} (${time(p.time)})`;
  if (p.kind === 'deco') sub = 'Zum Dekorieren deiner Farm';
  sub += have ? ` · <b>${have}× im Lager</b>` : '';
  return row(p.icon, p.name + (locked ? lvTag(p.lvl) : ''), sub, btn(`🪙 ${p.buy}`, { t: 'buy', id, n: 1 }, '', locked || s.money < p.buy), locked);
}

const SHOP = {
  seeds(s) {
    let h = '<div class="note">Samen kaufen ➜ in der Leiste auswählen ➜ auf umgegrabenem Boden säen ➜ gießen 💧</div>';
    for (const [k, c] of Object.entries(CROPS)) {
      const id = 's_' + k, locked = c.lvl > s.level, have = s.inv[id] || 0;
      const sub = `Wächst in ${time(c.grow)}${c.regrow ? ' · trägt immer wieder' : ''}${c.yield ? ` · ${c.yield}× Ernte` : ''} · Verkauf ${money(price(s, k))}${have ? ` · <b>${have} Samen</b>` : ''}`;
      h += row(c.icon, c.name + (locked ? lvTag(c.lvl) : ''), sub,
        btn(`1× 🪙${c.seed}`, { t: 'buy', id, n: 1 }, '', locked || s.money < c.seed) + btn(`10× 🪙${c.seed * 10}`, { t: 'buy', id, n: 10 }, '', locked || s.money < c.seed * 10), locked);
    }
    return h;
  },
  animals(s) {
    let h = '<div class="note">Tiere brauchen einmal am Tag Futter 🌿 (oder Weizen 🌾). Streicheln ❤️ macht sie glücklich – glückliche Tiere geben öfter doppelt!</div>';
    h += row('🌿', 'Futter', `Für Tiere · ${s.inv.futter || 0} im Lager`, btn('5× 🪙40', { t: 'buy', id: 'futter', n: 5 }, '', s.money < 40) + btn('20× 🪙160', { t: 'buy', id: 'futter', n: 20 }, '', s.money < 160));
    for (const [k, a] of Object.entries(ANIMALS)) {
      const locked = a.lvl > s.level, cap = capacity(s, a.home), n = animalCount(s, a.home);
      const home = a.home === 'coop' ? 'Hühnerstall' : 'Stall';
      const sub = `Gibt ${ITEMS[a.product].icon} ${ITEMS[a.product].name} alle ${time(a.time)} · ${home}: ${cap ? `${n}/${cap}` : 'nicht gebaut'}`;
      h += row(a.icon, a.name + (locked ? lvTag(a.lvl) : ''), sub, btn(`🪙 ${a.cost}`, { t: 'buyAnimal', id: k }, 'pink', locked || s.money < a.cost || n >= cap), locked);
    }
    if (s.animals.length) {
      h += '<h3>Eure Tiere</h3>';
      for (const a of s.animals) {
        const st = a.ready ? `${ITEMS[ANIMALS[a.k].product].icon} bereit` : a.fed > 0 ? '😊 satt' : '🌿 hungrig';
        h += row(ANIMALS[a.k].icon, esc(a.name), `${'❤️'.repeat(Math.ceil(a.love / 2)) || '🤍'} · ${st}${a.pet ? ' · heute gestreichelt' : ''}`, '');
      }
    }
    return h;
  },
  farm(s) {
    let h = '';
    for (const id of ['field', 'house', 'coop', 'barn']) h += upgradeRow(s, id);
    h += '<h3>Maschinen & Helfer</h3><div class="note">Gekauftes landet im Lager. Wähle es in der Leiste aus und platziere es auf der Farm. Mit der Hand ✋ hebst du es wieder auf.</div>';
    for (const [id, p] of Object.entries(PLACE)) if (p.kind !== 'deco') h += placeRow(s, id);
    return h;
  },
  tools(s) {
    let h = `<div class="note">Bessere Werkzeuge schaffen mehr Felder auf einmal (${AREA_NAME.slice(1).join(' ➜ ')}).</div>`;
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'tools') h += upgradeRow(s, id);
    return h;
  },
  goods(s) {
    let h = '<div class="note">Bessere Qualität = höhere Preise beim Verkaufen.</div>';
    for (const [id, u] of Object.entries(UPGRADES)) if (u.tab === 'goods') h += upgradeRow(s, id);
    return h;
  },
  deco(s) {
    let h = '<div class="note">Macht eure Farm süß! Kaufen ➜ in der Leiste wählen ➜ platzieren. Drehen: in die gewünschte Richtung schauen. Aufheben mit der Hand ✋.</div>';
    for (const [id, p] of Object.entries(PLACE)) if (p.kind === 'deco') h += placeRow(s, id);
    return h;
  },
};

const PANELS = {
  shop: (s, g, tab) => SHOP[tab](s),
  sell(s) {
    const sellable = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id]?.sell);
    const total = sellable.reduce((t, [id, n]) => t + price(s, id) * n, 0);
    let h = sellable.length ? `<div class="row"><div class="ic">💰</div><div class="tx"><b>Alles verkaufen</b><small>${sellable.length} Sorten</small></div><div class="bt">${btn(`+🪙 ${total}`, { t: 'sellAll' }, 'pink')}</div></div>` : '<div class="note">Noch nichts zu verkaufen. Ernte etwas! 🌱</div>';
    for (const [id, n] of sellable) {
      const p = price(s, id);
      h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, `je ${money(p)}`, btn('1', { t: 'sell', id, n: 1 }, 'white') + btn(`Alle +${p * n}`, { t: 'sell', id, n }));
    }
    const rest = Object.entries(s.inv).filter(([id, n]) => n > 0 && !ITEMS[id]?.sell && ITEMS[id]);
    if (rest.length) {
      h += '<h3>Vorräte</h3>';
      for (const [id, n] of rest) h += row(ITEMS[id].icon, `${ITEMS[id].name} <span class="lv">${n}×</span>`, ITEMS[id].seed ? 'Samen' : ITEMS[id].place ? 'Zum Platzieren' : '', '');
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
    if (tab === 'stats') {
      const st = s.stats, pct = Math.round(s.xp / needXp(s.level) * 100);
      const line = (i, l, v) => row(i, l, '', `<b>${v}</b>`);
      return line('🏡', esc(s.name), `Tag ${s.day}`) + line('⭐', 'Farm-Level', `${s.level} (${pct}%)`) + line('🧺', 'Geerntet', st.harvested) + line('🎣', 'Fische gefangen', st.fish) +
        line('📋', 'Aufträge erledigt', st.orders) + line('💰', 'Taler verdient', st.earned.toLocaleString('de-DE')) + line('🐾', 'Tiere', s.animals.length) + line('🌷', 'Aufgestellte Dinge', Object.keys(s.obj).length);
    }
    let h = '<div class="note">Die Leute im Dorf wünschen sich Waren von eurer Farm – sie zahlen extra! Alle 3 Tage kommen neue Wünsche.</div>';
    s.orders.forEach((o, i) => {
      const have = s.inv[o.item] || 0, it = ITEMS[o.item];
      h += row(it.icon, `${o.n}× ${it.name}`, `Ihr habt ${Math.min(have, o.n)}/${o.n} · Lohn ${money(o.reward)} + ${o.xp} ⭐<div class="bar"><i style="width:${Math.min(1, have / o.n) * 100}%"></i></div>`, btn('Abgeben', { t: 'order', i, item: o.item, n: o.n }, 'pink', have < o.n));
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
      h += row(`<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${esc(p.look?.topColor || '#ccc')};border:3px solid ${esc(p.look?.hairColor || '#fff')}"></span>`, esc(p.name) + (p.id === 'h' ? ' 👑' : '') + (p.id === g.me ? ' (du)' : ''), p.id === 'h' ? 'Host – die Farm wird auf diesem Gerät gespeichert' : 'Gast – bekommt automatisch eine Kopie der Farm', kick);
    }
    h += '<div class="note">Alles ist geteilt: Geld, Lager, Tiere und Fortschritt. Jede/r bekommt eine Sicherheitskopie und kann die Farm später auch selbst hosten.</div>';
    return h;
  },
  emotes() {
    return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${EMOTES.map(e => `<button class="slot" style="width:auto;height:64px;font-size:34px" data-ui="emote" data-e="${e}">${e}</button>`).join('')}</div>`;
  },
  settings(s, g, tab) {
    if (tab === 'options') return settingsHtml(g.settings, g.touch);
    if (tab === 'help') {
      return `<div class="note">💻 <b>PC:</b> WASD/Pfeiltasten laufen · Klick = hinlaufen & benutzen · E/Leertaste = Aktion · 1–9 Werkzeug · Mausrad Zoom · rechte Maustaste ziehen oder Z/C = Kamera drehen · Enter Chat · B Laden · I Lager · O Hof-Buch · Q Emotes · P Fotomodus<br><br>
      📱 <b>Handy:</b> links wischen = laufen · irgendwo antippen = hinlaufen & benutzen · großer Knopf = Aktion · zwei Finger = zoomen & drehen · 🔄 Kamera drehen<br><br>
      🌱 Hacke ⛏️ gräbt um ➜ Samen säen ➜ Gießkanne 💧 ➜ warten ➜ ernten.<br>
      🐾 Tiere füttern (Futter oder Weizen) und streicheln – glückliche Tiere geben öfter doppelt.<br>
      🎣 Am Teich angeln: Aktion, warten bis ❗ erscheint, dann schnell nochmal drücken.<br>
      🪑 Auf Bänke kannst du dich setzen, und deinen Lieblingsmenschen kannst du umarmen 🤗.<br>
      💰 An der Verkaufskiste oder im 🎒 Lager verkaufen. 📋 Aufträge & 🏆 Erfolge geben Extra-Geld.<br>
      ⭐ Mit Erfahrung steigt eure Farm im Level und schaltet Neues frei.</div>`;
    }
    return `<button class="big" data-ui="editlook"><span class="i">👗</span><span>Aussehen ändern<small>Frisur, Outfit, Haustier …</small></span></button><br>
      <button class="big" data-ui="photo"><span class="i">📷</span><span>Fotomodus<small>Schöne Erinnerungsfotos von eurer Farm</small></span></button><br>
      <button class="big pink" data-ui="leave"><span class="i">🏠</span><span>Zurück zum Hauptmenü<small>Die Farm wird gespeichert</small></span></button>`;
  },
};

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
    const sig = JSON.stringify([this.open, this.tab, s.money, s.inv, s.up, s.level, s.orders, s.animals.map(a => [a.ready, a.fed > 0, a.love, a.pet]), Object.keys(g.players), g.code, g.settings, s.ach]);
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
export function hotbarItems(s) {
  const items = ['hoe', 'can', 'hand'];
  for (const k of Object.keys(CROPS)) if (s.inv['s_' + k] > 0) items.push('s_' + k);
  for (const k of Object.keys(PLACE)) if (s.inv[k] > 0) items.push(k);
  return items;
}
export function slotHtml(s, id, i, sel) {
  const tool = { hoe: ['⛏️', 'Hacke'], can: ['💧', 'Gießkanne'], hand: ['✋', 'Hand: aufheben & benutzen'] }[id];
  const icon = tool ? tool[0] : ITEMS[id].icon, title = tool ? tool[1] : ITEMS[id].name;
  const n = tool ? '' : `<span class="n">${s.inv[id]}</span>`;
  return `<button class="slot${id === sel ? ' sel' : ''}" data-id="${id}" title="${title}">${i < 9 ? `<span class="k">${i + 1}</span>` : ''}${icon}${ITEMS[id]?.seed ? '<span class="seed">🫘</span>' : ''}${n}</button>`;
}
