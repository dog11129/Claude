// Spielablauf: Menü, Steuerung, Host/Gast-Logik, Speichern.
import { World, esc } from './world.js';
import * as S from './state.js';
import { SPAWN, SPEED, COLORS, HATS, EMOTES, ITEMS, CROPS, ANIMALS, MAP } from './data.js';
import * as net from './net.js';
import { audio, unlock, play, setMusic } from './audio.js';
import { Panels, hotbarItems, slotHtml } from './ui.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('⚠️ Speichern fehlgeschlagen (Speicher voll?)'); }
  },
};
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);

const profile = store.get('kh.profile', null) || { name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], hat: 'straw' };
const settings = Object.assign({ sound: true, music: true, shadows: !touch }, store.get('kh.settings', {}));
audio.sound = settings.sound;
audio.music = settings.music;

const world = new World($('c'), $('labels'));
world.setShadows(settings.shadows);
addEventListener('resize', () => world.resize());

let G = null; // laufende Spielsitzung
const demo = demoFarm();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r3 = v => Math.round(v * 1000) / 1000;
// Zustand fürs Netz verkleinern: Kommazahlen kürzen
const pack = s => JSON.parse(JSON.stringify(s, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? r3(v) : v));

// ---------- kleine Helfer fürs HUD ----------
function toast(text, big) {
  const el = document.createElement('div');
  el.textContent = text;
  if (big) el.className = 'big';
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), big ? 6000 : 4000);
}
function cover(text, withButton) {
  $('cover').classList.remove('hidden');
  $('covertext').textContent = text;
  $('coverbtn').classList.toggle('hidden', !withButton);
}
const hideCover = () => $('cover').classList.add('hidden');
$('coverbtn').onclick = () => leave();

// ---------- Spieler & Sitzung ----------
function cleanProfile(p) {
  return {
    name: String(p?.name || '').trim().slice(0, 16) || 'Gast',
    color: /^#[0-9a-f]{6}$/i.test(p?.color) ? p.color : COLORS[0],
    hat: HATS.some(h => h[0] === p?.hat) ? p.hat : 'none',
  };
}
const newPlayer = (id, p) => ({ id, ...cleanProfile(p), x: SPAWN.x + (Math.random() - 0.5) * 2, z: SPAWN.z + Math.random(), ry: 0, m: false });
const session = (role, s, me) => ({ role, s, me, players: {}, social: {}, sel: 'hoe', settings, code: null, lastSeen: {}, lastSave: 0, lastState: 0 });

function saveFarm() {
  if (!G?.s) return;
  G.lastSave = performance.now();
  const f = store.get('kh.farms', {});
  f[G.s.id] = { name: G.s.name, saved: Date.now(), s: G.s, guest: G.role === 'guest' ? G.players.h?.name || '?' : undefined };
  store.set('kh.farms', f);
}
addEventListener('pagehide', saveFarm);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveFarm();
  else if (G?.ready) wakeLock();
});
function wakeLock() { navigator.wakeLock?.request('screen').then(l => { if (G) G.wake = l; }).catch(() => {}); }

// ---------- Host ----------
async function startHost(s) {
  unlock();
  const g = G = session('host', S.migrate(s), 'h');
  g.players.h = newPlayer('h', profile);
  enterGame();
  saveFarm();
  for (let i = 0; i < 3; i++) {
    const code = i === 0 && s.code ? s.code : net.newCode();
    try {
      const n = await net.host(code, { onData: hostData, onLeave: hostLeave });
      if (G !== g) { n.close(); return; }
      g.net = n;
      g.code = s.code = code;
      saveFarm();
      return;
    } catch (e) {
      if (G !== g) return;
      if (e.type !== 'unavailable-id') { toast('⚠️ ' + net.errorText(e) + ' Alleine spielen geht trotzdem.'); return; }
    }
  }
}

function hostData(id, d) {
  if (!G || G.role !== 'host' || !d || typeof d !== 'object') return;
  G.lastSeen[id] = performance.now();
  const p = G.players[id];
  if (d.t === 'join') {
    G.players[id] = newPlayer(id, d.profile);
    G.net.send(id, { t: 'welcome', id, s: pack(G.s), players: G.players, code: G.code });
    say(`💕 ${G.players[id].name} ist da!`, 'join');
    return;
  }
  if (!p) return;
  if (d.t === 'm' && [d.x, d.z, d.ry].every(Number.isFinite)) {
    p.x = Math.max(-MAP, Math.min(MAP, d.x));
    p.z = Math.max(-MAP, Math.min(MAP, d.z));
    p.ry = d.ry;
    p.m = !!d.m;
  }
  if (d.t === 'act') handleAct(id, d.a);
  if (d.t === 'chat') chat(id, d.text);
  if (d.t === 'emote') emote(id, d.e);
}

function hostLeave(id) {
  const p = G?.players[id];
  if (!p || id === 'h') return;
  delete G.players[id];
  delete G.social[id];
  say(`👋 ${p.name} ist gegangen`);
}

function say(text, snd) {
  toast(text);
  if (snd) play(snd);
  G.net?.broadcast({ t: 'toast', text, snd });
}

function handleAct(id, a) {
  const out = S.act(G.s, a);
  if (out.ok) { G.dirty = true; G.lastState = 0; }
  if (out.fx.length) { G.net?.broadcast({ t: 'fx', fx: out.fx }); showFx(out.fx); }
  const res = { t: 'res', ok: out.ok, msg: out.msg, snd: out.snd, caught: out.caught };
  if (id === G.me) onRes(res); else G.net?.send(id, res);
  if (out.levelUp) { G.net?.broadcast({ t: 'lvl', l: out.levelUp }); onLevel(out.levelUp); }
  if (out.ok && out.msg && ['buyAnimal', 'upgrade', 'order'].includes(a.t)) {
    const text = `${G.players[id]?.name}: ${out.msg}`;
    G.net?.broadcast({ t: 'toast', text }, id);
    if (id !== G.me) toast(text);
  }
}

function chat(id, text) {
  text = String(text || '').trim().slice(0, 120);
  if (!text || !G.players[id]) return;
  const m = { t: 'chat', id, name: G.players[id].name, text };
  G.net?.broadcast(m);
  showChat(m);
}
function emote(id, e) {
  if (!EMOTES.includes(e)) return;
  G.net?.broadcast({ t: 'emote', id, e });
  showEmote(id, e);
}

// ---------- Gast ----------
async function startGuest(code) {
  unlock();
  const g = G = session('guest', null, null);
  g.joinCode = code;
  cover(`💌 Verbinde mit ${code}…`);
  try {
    await connectGuest(g);
  } catch (e) {
    if (G !== g) return;
    G = null;
    hideCover();
    showMenu();
    $('jerr').textContent = net.errorText(e);
  }
}

async function connectGuest(g) {
  const conn = await net.join(g.joinCode, { onData: d => G === g && guestData(d), onClose: () => G === g && lostConnection() });
  if (G !== g) { conn.close(); return; }
  g.conn = conn;
  g.lastHost = performance.now();
  conn.send({ t: 'join', profile });
  await new Promise((res, rej) => { g.onWelcome = res; setTimeout(() => rej({ type: 'timeout' }), 10000); });
}

function guestData(d) {
  if (!d || typeof d !== 'object') return;
  G.lastHost = performance.now();
  switch (d.t) {
    case 'welcome':
      G.me = d.id;
      G.s = S.migrate(d.s);
      G.players = d.players;
      G.code = d.code;
      G.onWelcome?.();
      if (!G.ready) enterGame(); else hideCover();
      saveFarm();
      break;
    case 's': if (G.s) G.s = d.s; break;
    case 'p': {
      const me = G.players[G.me];
      G.players = d.p;
      if (me) G.players[G.me] = me;
      break;
    }
    case 'fx': showFx(d.fx); break;
    case 'res': onRes(d); break;
    case 'lvl': onLevel(d.l); break;
    case 'chat': showChat(d); break;
    case 'emote': showEmote(d.id, d.e); break;
    case 'toast': toast(d.text); if (d.snd) play(d.snd); break;
    case 'kick': G.ended = true; G.conn?.close(); cover('Der Host hat dich von der Farm geschickt.', true); break;
    case 'bye': G.ended = true; G.conn?.close(); saveFarm(); cover('🏡 Der Host hat die Farm verlassen. Deine Kopie ist gespeichert – du findest sie im Hauptmenü.', true); break;
  }
}

async function lostConnection() {
  const g = G;
  if (!g || g.role !== 'guest' || g.reconnecting || g.ended) return;
  g.reconnecting = true;
  g.conn?.close();
  saveFarm();
  cover('📡 Verbindung verloren – verbinde neu…', true);
  for (let i = 0; i < 40 && G === g; i++) {
    try {
      await connectGuest(g);
      if (G === g) { g.reconnecting = false; g.lastHost = performance.now(); hideCover(); toast('✅ Wieder verbunden!'); }
      return;
    } catch { await sleep(3000); }
  }
  if (G === g) cover('Der Host ist nicht erreichbar. Deine Kopie der Farm ist gespeichert – im Hauptmenü kannst du sie selbst weiterspielen.', true);
}

// ---------- gemeinsam ----------
function send(a) {
  if (G.role === 'host') handleAct(G.me, a);
  else G.conn?.send({ t: 'act', a });
}
function sendChat(text) {
  if (G.role === 'host') chat(G.me, text); else G.conn?.send({ t: 'chat', text });
}
function sendEmote(e) {
  if (G.role === 'host') emote(G.me, e); else G.conn?.send({ t: 'emote', e });
}
const showFx = fx => { for (const f of fx || []) world.float(f.x, f.z, f.txt); };
function onRes(r) {
  if (r.snd) play(r.snd);
  else if (r.msg && !r.ok) play('fail');
  if (r.msg) toast(r.msg);
  if (r.caught) toast(`🎣 ${ITEMS[r.caught].icon} ${ITEMS[r.caught].name} gefangen!`);
}
function onLevel(l) {
  const neu = S.unlocksAt(l);
  toast(`⭐ Level ${l}! ${neu.length ? 'Neu: ' + neu.join(', ') : ''}`, true);
  play('level');
  const me = G.players[G.me];
  if (me) for (let i = 0; i < 6; i++) world.float(me.x + (Math.random() - 0.5) * 2, me.z + (Math.random() - 0.5), ['🎉', '⭐', '✨'][i % 3], 1 + Math.random());
}
function showChat(m) {
  const el = document.createElement('div');
  el.innerHTML = `<b>${esc(m.name)}:</b> ${esc(m.text)}`;
  $('chatlog').appendChild(el);
  while ($('chatlog').children.length > 6) $('chatlog').firstChild.remove();
  G.social[m.id] = { ...G.social[m.id], chat: m.text, chatUntil: performance.now() + 6000 };
  if (m.id !== G.me) play('chat');
}
function showEmote(id, e) {
  G.social[id] = { ...G.social[id], emote: e, emoteUntil: performance.now() + 2500 };
  if (e === '❤️' || e === '🥰') play('love');
}

function announceDay() {
  const s = G.s;
  say(`🌅 Tag ${s.day} beginnt – ${s.weather === 'rain' ? '🌧️ Regen gießt alle Felder!' : '☀️ Sonnenschein'}`);
  saveFarm();
}

// Host: Welt weiterrechnen (im Bild-Takt, oder per Timer wenn der Tab im Hintergrund ist)
function simulate(now) {
  const dt = Math.min(5, (now - (G.lastSim || now)) / 1000);
  G.lastSim = now;
  const day = G.s.day;
  if (S.tick(G.s, dt, true)) G.dirty = true;
  if (G.s.day !== day) announceDay();
}

function netTick() {
  if (!G?.ready) return;
  const now = performance.now();
  if (G.role === 'host') {
    if (document.hidden) simulate(now);
    if (G.net) {
      G.net.broadcast({ t: 'p', p: G.players });
      if ((G.dirty && now - G.lastState > 150) || now - G.lastState > 5000) {
        G.net.broadcast({ t: 's', s: pack(G.s) });
        G.lastState = now;
        G.dirty = false;
      }
      for (const id of Object.keys(G.players)) {
        if (id !== 'h' && now - (G.lastSeen[id] || now) > 20000) { G.net.drop(id); hostLeave(id); }
      }
    }
    if (now - G.lastSave > 10000) saveFarm();
  } else {
    const me = G.players[G.me];
    if (!me || G.reconnecting || G.ended) return;
    const msg = { t: 'm', x: r3(me.x), z: r3(me.z), ry: r3(me.ry), m: me.m };
    const sig = JSON.stringify(msg);
    if (sig !== G.lastMove || now - (G.lastMoveT || 0) > 1000) { G.conn?.send(msg); G.lastMove = sig; G.lastMoveT = now; }
    if (now - G.lastHost > 9000) lostConnection();
    if (now - G.lastSave > 15000) saveFarm();
  }
}

function enterGame() {
  G.ready = true;
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  hideCover();
  panels.close();
  clearInterval(enterGame.timer);
  enterGame.timer = setInterval(netTick, 100);
  const me = G.players[G.me];
  world.target.set(me.x, 0, me.z);
  G.hotSig = null;
  wakeLock();
  if (!store.get('kh.tutorial', false)) {
    store.set('kh.tutorial', true);
    setTimeout(() => toast('🌱 Wähle unten die Hacke ⛏️ und lauf zum Feld. Tipps findest du unter ⚙️.', true), 800);
  }
}

function leave() {
  const g = G;
  if (g) {
    saveFarm();
    if (g.role === 'host' && g.net) { g.net.broadcast({ t: 'bye' }); setTimeout(() => g.net.close(), 300); }
    if (g.role === 'guest') { g.ended = true; g.conn?.close(); }
    g.wake?.release?.();
  }
  G = null;
  clearInterval(enterGame.timer);
  hideCover();
  showMenu();
}

// ---------- Hauptmenü ----------
function showMenu() {
  $('hud').classList.add('hidden');
  panels.close();
  $('menu').classList.remove('hidden');
  $('pname').value = profile.name;
  $('pcolors').innerHTML = COLORS.map(c => `<button style="background:${c}" data-c="${c}" class="${c === profile.color ? 'on' : ''}"></button>`).join('');
  $('phats').innerHTML = HATS.map(([id, l]) => `<button data-h="${id}" class="${id === profile.hat ? 'on' : ''}">${l}</button>`).join('');
  const farms = Object.entries(store.get('kh.farms', {})).sort((a, b) => b[1].saved - a[1].saved);
  $('farms').innerHTML = farms.length ? farms.map(([id, f]) => `<div class="farm"><div class="tx"><b>${esc(f.name)}</b>
    <small>Tag ${f.s.day} · Level ${f.s.level} · 🪙 ${f.s.money.toLocaleString('de-DE')}${f.guest ? ` · Kopie von ${esc(f.guest)}s Farm` : ''}</small>
    <small>${new Date(f.saved).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
    <button class="btn small" data-play="${esc(id)}">Spielen</button><button class="btn small white" data-del="${esc(id)}">🗑️</button></div>`).join('')
    : '<div class="note">Noch keine Farm – gründe eine neue! 🌱</div>';
}
function saveProfile() {
  profile.name = $('pname').value.trim().slice(0, 16);
  store.set('kh.profile', profile);
}
function needName() {
  saveProfile();
  if (profile.name) { $('perr').textContent = ''; return false; }
  $('perr').textContent = 'Gib dir zuerst einen Namen 🙂';
  $('pname').focus();
  $('menu').scrollTop = 0;
  return true;
}
$('pname').addEventListener('input', saveProfile);
$('pcolors').onclick = e => { const c = e.target.dataset.c; if (c) { profile.color = c; saveProfile(); showMenu(); } };
$('phats').onclick = e => { const h = e.target.closest('button')?.dataset.h; if (h) { profile.hat = h; saveProfile(); showMenu(); } };
$('farms').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const farms = store.get('kh.farms', {});
  if (b.dataset.del && confirm(`„${farms[b.dataset.del]?.name}“ wirklich löschen?`)) {
    delete farms[b.dataset.del];
    store.set('kh.farms', farms);
    showMenu();
  }
  if (b.dataset.play && farms[b.dataset.play] && !needName()) startHost(farms[b.dataset.play].s);
};
$('newbtn').onclick = () => {
  if (needName()) return;
  startHost(S.newFarm($('fname').value.trim().slice(0, 24) || `${profile.name}s Kuschelhof`));
  $('fname').value = '';
};
$('jbtn').onclick = () => {
  const code = net.cleanCode($('jcode').value);
  $('jerr').textContent = '';
  if (needName()) return;
  if (code.length !== 5) { $('jerr').textContent = 'Der Code hat 5 Zeichen.'; return; }
  startGuest(code);
};
$('jcode').addEventListener('keydown', e => { if (e.key === 'Enter') $('jbtn').click(); });
$('jcode').value = net.cleanCode(new URLSearchParams(location.search).get('join'));

// ---------- Fenster ----------
const panels = new Panels({
  act: a => send(a),
  ui(kind, d) {
    if (kind === 'emote') { sendEmote(d.e); panels.close(); }
    if (kind === 'toggle') {
      settings[d.k] = !settings[d.k];
      store.set('kh.settings', settings);
      audio.sound = settings.sound;
      setMusic(settings.music);
      world.setShadows(settings.shadows);
      panels.sig = null;
    }
    if (kind === 'leave') leave();
    if (kind === 'fullscreen') document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => toast('Vollbild wird hier nicht unterstützt.'));
    const link = $('invlink')?.value;
    if (kind === 'copy' && link) navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    if (kind === 'share' && link) {
      if (navigator.share) navigator.share({ title: 'Kuschelhof', text: `Komm auf unsere Farm! 🌻 Code: ${G.code}`, url: link }).catch(() => {});
      else navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    }
    if (kind === 'goto' && G.players[d.id]) {
      const me = G.players[G.me], p = G.players[d.id];
      Object.assign(me, { x: p.x + 0.6, z: p.z + 0.6 });
      panels.close();
      world.float(me.x, me.z, '✨');
    }
    if (kind === 'kick' && G.role === 'host' && G.players[d.id]) {
      G.net?.send(d.id, { t: 'kick' });
      G.net?.drop(d.id);
      hostLeave(d.id);
    }
  },
});
function togglePanel(kind, tab) {
  if (panels.open === kind && !tab) panels.close(); else panels.show(kind, tab);
}
for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => togglePanel(b.dataset.open);
$('invite').onclick = () => togglePanel('friends');

// ---------- Chat ----------
function openChat() {
  $('chatform').classList.remove('hidden');
  $('chatin').focus();
}
function closeChat() {
  $('chatform').classList.add('hidden');
  $('chatin').blur();
}
$('chatbtn').onclick = () => ($('chatform').classList.contains('hidden') ? openChat() : closeChat());
$('chatform').onsubmit = e => {
  e.preventDefault();
  if ($('chatin').value.trim()) sendChat($('chatin').value);
  $('chatin').value = '';
  closeChat();
};

// ---------- Eingabe ----------
const keys = new Set();
const joy = { x: 0, y: 0, id: null };
let actHeld = false, nextAct = 0;

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeChat(); return; }
  if (!G?.ready) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { panels.open ? panels.close() : panels.show('settings'); return; }
  const hot = { b: 'shop', i: 'sell', o: 'orders', f: 'friends', q: 'emotes' }[k];
  if (hot) { togglePanel(hot); return; }
  if (panels.open) return;
  keys.add(k);
  if ((k === 'e' || k === ' ') && !e.repeat) { pressAction(); e.preventDefault(); }
  if (k === 'enter') { openChat(); e.preventDefault(); }
  if (/^[1-9]$/.test(k) && G.hot?.[+k - 1]) select(G.hot[+k - 1]);
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  keys.delete(k);
  if (k === 'e' || k === ' ') actHeld = false;
});
addEventListener('blur', () => { keys.clear(); actHeld = false; });

const canvas = $('c'), pointers = new Map();
canvas.addEventListener('pointerdown', e => {
  unlock();
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (e.pointerType === 'mouse' && e.button === 0 && G?.ready && !panels.open) pressAction();
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  const before = [...pointers.values()];
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) { // Pinch-Zoom
    const after = [...pointers.values()], d = (a) => Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
    world.zoom = Math.max(0.55, Math.min(1.8, world.zoom * d(before) / d(after)));
  }
});
const up = e => { pointers.delete(e.pointerId); if (e.pointerType === 'mouse') actHeld = false; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { world.zoom = Math.max(0.55, Math.min(1.8, world.zoom * (1 + e.deltaY * 0.001))); }, { passive: true });

const joyEl = $('joy');
joyEl.addEventListener('pointerdown', e => {
  unlock();
  if (joy.id !== null) return;
  joy.id = e.pointerId;
  joy.ox = e.clientX;
  joy.oy = e.clientY;
  joyEl.setPointerCapture(e.pointerId);
  for (const id of ['joybase', 'joyknob']) {
    $(id).classList.remove('hidden');
    $(id).style.left = e.clientX + 'px';
    $(id).style.top = e.clientY + 'px';
  }
});
joyEl.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const l = Math.hypot(dx, dy), max = 50;
  if (l > max) { dx *= max / l; dy *= max / l; }
  joy.x = dx / max;
  joy.y = dy / max;
  $('joyknob').style.left = joy.ox + dx + 'px';
  $('joyknob').style.top = joy.oy + dy + 'px';
});
const joyEnd = e => {
  if (e.pointerId !== joy.id) return;
  joy.id = null;
  joy.x = joy.y = 0;
  $('joybase').classList.add('hidden');
  $('joyknob').classList.add('hidden');
};
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);

const actbtn = $('actbtn');
actbtn.addEventListener('pointerdown', e => { e.preventDefault(); unlock(); pressAction(); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) actbtn.addEventListener(ev, () => { actHeld = false; });

$('hotbar').onclick = e => { const b = e.target.closest('.slot'); if (b) select(b.dataset.id); };
function select(id) {
  G.sel = id;
  G.hotSig = null;
  if (G.fishing) G.fishing = null;
}

// ---------- Aktion ----------
function pressAction() {
  if (!G?.ready || panels.open) return;
  actHeld = true;
  nextAct = performance.now() + 380;
  doAction(true);
}
function doAction(fresh) {
  const me = G.players[G.me], f = G.fishing;
  if (f) {
    if (!fresh) return;
    if (f.phase === 'bite') send({ t: 'fish', x: Math.round(me.x), z: Math.round(me.z) });
    else { toast('🎣 Zu früh gezogen!'); play('fail'); }
    G.fishing = null;
    return;
  }
  const r = G.ctx;
  if (!r) return;
  if (r.ui && fresh) {
    if (r.ui === 'animals') panels.show('shop', 'animals');
    else if (r.ui === 'farm') panels.show('shop', 'farm');
    else panels.show(r.ui === 'sell' ? 'sell' : r.ui);
  } else if (r.fish && fresh) {
    const l = G.s.up.rod;
    G.fishing = { phase: 'wait', t: 0, bite: (1.5 + Math.random() * 3.5) / (1 + (l - 1) * 0.35), win: 0.75 + l * 0.15, x: me.x + Math.sin(me.ry) * 1.7, z: me.z + Math.cos(me.ry) * 1.7 };
    play('water');
  } else if (r.a) {
    send(r.a);
    G.hop = 1;
  }
}

function updateFishing(dt) {
  const f = G.fishing;
  $('fishbar').classList.toggle('hidden', !f);
  if (!f) return;
  f.t += dt;
  if (f.phase === 'wait') {
    $('fishbar').textContent = '🎣 Warte auf einen Biss…';
    if (f.t >= f.bite) { f.phase = 'bite'; f.t = 0; play('bite'); }
  } else {
    $('fishbar').textContent = '❗ JETZT ziehen! ❗';
    if (f.t > f.win) { G.fishing = null; toast('🐟 Der Fisch ist entwischt…'); play('fail'); }
  }
}

// ---------- Bild für Bild ----------
const hud = {};
function setText(id, v) { if (hud[id] !== v) { hud[id] = v; $(id).textContent = v; } }

function gameFrame(dt, now) {
  const s = G.s, me = G.players[G.me];
  if (!s || !me) return;
  if (G.role === 'host') simulate(now); else S.tick(s, dt, false);

  // Laufen
  let vx = 0, vz = 0;
  if (!panels.open) {
    if (keys.has('a') || keys.has('arrowleft')) vx--;
    if (keys.has('d') || keys.has('arrowright')) vx++;
    if (keys.has('w') || keys.has('arrowup')) vz--;
    if (keys.has('s') || keys.has('arrowdown')) vz++;
    vx += joy.x;
    vz += joy.y;
  }
  const len = Math.hypot(vx, vz);
  me.m = len > 0.2;
  if (me.m) {
    if (len > 1) { vx /= len; vz /= len; }
    const sp = SPEED[s.up.boots] * dt;
    const free = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]].some(([a, b]) => S.blocked(s, x + a, z + b));
    const stuck = !free(me.x, me.z);
    if (stuck || free(me.x + vx * sp, me.z)) me.x += vx * sp;
    if (stuck || free(me.x, me.z + vz * sp)) me.z += vz * sp;
    me.ry = Math.atan2(vx, vz);
    if (G.fishing) G.fishing = null;
  }
  G.hop = Math.max(0, (G.hop || 0) - dt * 4);
  me.hop = G.hop ? 1 - G.hop : 0;

  // Was würde die Aktionstaste jetzt tun?
  G.ctx = G.fishing ? null : S.resolve(s, me, G.sel);
  const label = G.fishing ? (G.fishing.phase === 'bite' ? '❗ Ziehen!' : '🎣 …') : G.ctx?.label || '';
  if (hud.label !== label) {
    hud.label = label;
    $('hint').innerHTML = `<kbd>E</kbd> ${esc(label)}`;
    $('hint').classList.toggle('hidden', !label);
    $('actlabel').textContent = label || '…';
    const icon = label.split(' ')[0];
    $('actbtn').textContent = /\p{Extended_Pictographic}/u.test(icon) ? icon : '✋';
  }
  if (actHeld && now > nextAct) { nextAct = now + 300; doAction(false); }
  updateFishing(dt);

  const ps = {};
  for (const [id, p] of Object.entries(G.players)) ps[id] = G.social[id] ? { ...p, ...G.social[id] } : p;
  world.render(s, ps, G.me, dt, { tiles: G.ctx?.tiles, hlOn: !!(G.ctx?.a || G.ctx?.ui || G.ctx?.fish), bobber: G.fishing && { x: G.fishing.x, z: G.fishing.z, bite: G.fishing.phase === 'bite' } });

  // HUD
  const hour = 6 + s.dayTime * 18, hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10;
  const sky = s.weather === 'rain' ? '🌧️' : hour >= 20 ? '🌙' : hour >= 18 ? '🌇' : '☀️';
  setText('money', s.money.toLocaleString('de-DE'));
  setText('clock', `${sky} Tag ${s.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  setText('lvl', String(s.level));
  const pct = Math.min(100, s.xp / (40 * s.level * s.level) * 100) + '%';
  if (hud.pct !== pct) { hud.pct = pct; document.querySelector('#lvlbar i').style.width = pct; }
  const ready = s.orders.filter(o => (s.inv[o.item] || 0) >= o.n).length;
  setText('orderdot', ready ? String(ready) : '');
  $('orderdot').classList.toggle('hidden', !ready);
  const np = Object.keys(G.players).length;
  setText('pcount', String(np));
  const inv = G.role === 'host' && G.code && np === 1;
  $('invite').classList.toggle('hidden', !inv);
  if (inv) setText('invcode', G.code);

  const items = hotbarItems(s);
  if (!items.includes(G.sel)) G.sel = 'hoe';
  const sig = items.map(i => i + (s.inv[i] || '')).join() + G.sel;
  if (sig !== G.hotSig) {
    G.hotSig = sig;
    G.hot = items;
    $('hotbar').innerHTML = items.map((id, i) => slotHtml(s, id, i, G.sel)).join('');
  }
  panels.update(s, G);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (G?.ready) gameFrame(dt, now);
  else { demo.time += dt; world.render(demo, {}, null, dt, { orbit: true }); }
}

// Hübsche Beispiel-Farm für den Menü-Hintergrund
function demoFarm() {
  const s = S.newFarm('Demo');
  Object.assign(s.up, { field: 3, house: 2, coop: 1, barn: 1 });
  s.dayTime = 0.35;
  const ks = Object.keys(CROPS);
  for (let x = -9; x <= 1; x++) for (let z = -2; z <= 6; z++) {
    if (x === -4) continue;
    const k = ks[(x + 9) % ks.length];
    s.tiles[S.key(x, z)] = { w: (x + z) % 3 ? 50 : 0, c: { k, g: CROPS[k].grow * Math.min(1, (z + 3) / 8) } };
  }
  s.animals = ['huhn', 'huhn', 'huhn', 'kuh', 'schaf', 'schwein', 'kuh'].map((k, i) => ({ id: i + 1, k, name: '', fed: 1, p: 0, ready: i === 1, love: 0, pet: 0 }));
  for (const [x, z, k] of [[2, -6, 'kirschbaum'], [-2, -6, 'laterne'], [2, -3, 'blumen'], [-2, -3, 'blumen'], [4, -10, 'apfelbaum'], [-8, -6, 'bank'], [3, 3, 'herz'], [-3, 8, 'sprinkler'], [6, -10, 'brunnen'], [-12, -6, 'zwerg']]) {
    s.obj[S.key(x, z)] = { k, r: 0, t: 0 };
  }
  return s;
}

showMenu();
requestAnimationFrame(frame);
window.__game = { get G() { return G; }, world, S }; // für Tests & Fehlersuche
