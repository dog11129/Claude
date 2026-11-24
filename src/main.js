// Spielablauf: Menü, Steuerung, Host/Gast-Logik, Speichern.
import { World, esc, cropInfo } from './world.js';
import * as S from './state.js';
import { SPAWN, SPEED, EMOTES, ITEMS, CROPS, ANIMALS, PLACE, BUILDINGS, MAP, ACHIEVEMENTS } from './data.js';
import * as net from './net.js';
import { audio, unlock, play, setMusic, setVolumes, ambience } from './audio.js';
import { Panels, hotbarItems, slotHtml } from './ui.js';
import { Editor, settingsHtml } from './menu.js';
import { cleanLook, randomLook } from './avatar.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('⚠️ Speichern fehlgeschlagen (Speicher voll?)'); }
  },
};
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);

// Profil: Name + Aussehen (ältere Profile {color, hat} werden übernommen)
const oldProfile = store.get('kh.profile', null);
const profile = { name: String(oldProfile?.name || '').slice(0, 16), look: oldProfile ? cleanLook(oldProfile.look || oldProfile) : randomLook() };
const saveProfile = () => store.set('kh.profile', profile);

const settings = { quality: touch ? 'mid' : 'high', sound: 0.8, music: 0.5, landscape: false, names: true, ...store.get('kh.settings', {}) };
if (typeof settings.sound !== 'number') settings.sound = settings.sound === false ? 0 : 0.8;
if (typeof settings.music !== 'number') settings.music = settings.music === false ? 0 : 0.5;
if (!['low', 'mid', 'high'].includes(settings.quality)) settings.quality = 'mid';
audio.sound = settings.sound;
audio.music = settings.music;

const world = new World($('c'), $('labels'), settings.quality);
addEventListener('resize', () => world.resize());
const editor = new Editor();

let G = null; // laufende Spielsitzung
const demo = demoFarm();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r3 = v => Math.round(v * 1000) / 1000;
// Zustand fürs Netz verkleinern: Kommazahlen kürzen
const pack = s => JSON.parse(JSON.stringify(s, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? r3(v) : v));
const ACTS = ['hoe', 'can', 'sickle', 'plant', 'pet', 'fish', 'use', 'hug'];
const HELD = ['hoe', 'can', 'sickle', 'rod', 'seeds', 'box'];
const ANIM_OF = { till: 'hoe', water: 'can', plant: 'plant', harvest: 'sickle', place: 'use', pickup: 'use', use: 'use', animal: 'pet' };

// ---------- kleine Helfer fürs HUD ----------
function toast(text, kind) {
  const el = document.createElement('div');
  el.textContent = text;
  if (kind) el.className = kind === true ? 'big' : kind;
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), kind ? 6000 : 4000);
}
function cover(text, withButton) {
  $('cover').classList.remove('hidden');
  $('covertext').textContent = text;
  $('coverbtn').classList.toggle('hidden', !withButton);
}
const hideCover = () => $('cover').classList.add('hidden');
$('coverbtn').onclick = () => leave();

// ---------- Spieler & Sitzung ----------
const cleanProfile = p => ({ name: String(p?.name || '').trim().slice(0, 16) || 'Gast', look: cleanLook(p?.look || p) });
const newPlayer = (id, p) => ({ id, ...cleanProfile(p), x: SPAWN.x + (Math.random() - 0.5) * 2, z: SPAWN.z + Math.random(), ry: 0, m: false, ak: null, an: 0, held: 'hoe', pose: null, fishing: false });
const session = (role, s, me) => ({ role, s, me, players: {}, social: {}, sel: 'hoe', settings, touch, code: null, lastSeen: {}, lastSave: 0, lastState: 0 });

// Gast-Kopien liegen unter eigenem Schlüssel, damit sie nie die eigene Farm überschreiben.
function saveFarm() {
  if (!G?.s || !G.key) return;
  G.lastSave = performance.now();
  const f = store.get('kh.farms', {});
  f[G.key] = { name: G.s.name, saved: Date.now(), s: G.s, guest: G.role === 'guest' ? G.players.h?.name || '?' : G.copyOf };
  store.set('kh.farms', f);
}
addEventListener('pagehide', saveFarm);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveFarm();
  else if (G?.ready) wakeLock();
});
function wakeLock() { navigator.wakeLock?.request('screen').then(l => { if (G) G.wake = l; }).catch(() => {}); }

// ---------- Host ----------
async function startHost(s, key = s.id, copyOf) {
  unlock();
  const g = G = session('host', S.migrate(s), 'h');
  g.key = key;
  g.copyOf = copyOf;
  g.players.h = newPlayer('h', profile);
  enterGame();
  saveFarm();
  for (let i = 0; i < 3; i++) {
    const code = i === 0 && s.code ? s.code : net.newCode();
    try {
      const n = await net.host(code, { onData: (id, d) => G === g && hostData(id, d), onLeave: id => G === g && hostLeave(id) });
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
  if (!G || G.role !== 'host' || id === 'h' || !d || typeof d !== 'object') return;
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
    p.ak = ACTS.includes(d.ak) ? d.ak : null;
    p.an = Number.isInteger(d.an) ? d.an : 0;
    p.held = HELD.includes(d.held) ? d.held : null;
    p.pose = d.pose === 'sit' ? 'sit' : null;
    p.fishing = d.fishing === true;
  }
  if (d.t === 'look') Object.assign(p, cleanProfile(d));
  if (d.t === 'act') handleAct(id, d.a);
  if (d.t === 'chat') chat(id, d.text);
  if (d.t === 'emote') emote(id, d.e);
  if (d.t === 'hug' && typeof d.id === 'string') hug(id, d.id);
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
  if (out.ach) { G.net?.broadcast({ t: 'ach', ids: out.ach }); onAch(out.ach); }
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
function hug(a, b) {
  const pa = G.players[a], pb = G.players[b];
  if (!pa || !pb || a === b || Math.hypot(pa.x - pb.x, pa.z - pb.z) > 3) return;
  G.net?.broadcast({ t: 'hug', a, b });
  onHug(a, b);
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
    showMenu('join');
    $('jerr').textContent = net.errorText(e);
  }
}

async function connectGuest(g) {
  let conn;
  const current = () => G === g && g.conn === conn;
  conn = await net.join(g.joinCode, { onData: d => current() && guestData(d), onClose: () => current() && lostConnection() });
  if (G !== g) { conn.close(); return; }
  g.conn = conn;
  g.lastHost = performance.now();
  conn.send({ t: 'join', profile });
  try {
    await new Promise((res, rej) => { g.onWelcome = res; setTimeout(() => rej({ type: 'timeout' }), 10000); });
  } catch (e) {
    conn.close();
    if (g.conn === conn) g.conn = null;
    throw e;
  }
}

function guestData(d) {
  if (!d || typeof d !== 'object') return;
  G.lastHost = performance.now();
  switch (d.t) {
    case 'welcome': {
      if (!d.s || typeof d.s !== 'object' || !d.players?.[d.id]) return;
      const old = G.players[G.me];
      G.me = d.id;
      G.s = S.migrate(d.s);
      G.players = d.players;
      if (old) Object.assign(G.players[G.me], { x: old.x, z: old.z, ry: old.ry });
      G.code = d.code;
      G.key = 'copy:' + G.s.id;
      store.set('kh.lastJoin', { code: G.joinCode, host: G.players.h?.name || '', farm: G.s.name });
      G.onWelcome?.();
      if (!G.ready) enterGame(); else hideCover();
      saveFarm();
      break;
    }
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
    case 'ach': onAch(d.ids); break;
    case 'chat': showChat(d); break;
    case 'emote': showEmote(d.id, d.e); break;
    case 'hug': onHug(d.a, d.b); break;
    case 'toast': toast(d.text); if (d.snd) play(d.snd); break;
    case 'kick': G.ended = true; G.conn?.close(); cover('Der Host hat dich von der Farm geschickt.', true); break;
    case 'bye': G.ended = true; G.conn?.close(); saveFarm(); cover('🏡 Der Host hat die Farm verlassen. Deine Kopie ist gespeichert – du findest sie unter „Meine Farmen“.', true); break;
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
  if (G === g) cover('Der Host ist nicht erreichbar. Deine Kopie der Farm ist gespeichert – unter „Meine Farmen“ kannst du sie selbst weiterspielen.', true);
}

// ---------- gemeinsam ----------
function send(a) {
  if (G.role === 'host') handleAct(G.me, a);
  else G.conn?.send({ t: 'act', a });
}
const sendTo = (msg, local) => (G.role === 'host' ? local() : G.conn?.send(msg));
const sendChat = text => sendTo({ t: 'chat', text }, () => chat(G.me, text));
const sendEmote = e => sendTo({ t: 'emote', e }, () => emote(G.me, e));
const sendHug = id => sendTo({ t: 'hug', id }, () => hug(G.me, id));
function sendLook() {
  const me = G.players[G.me];
  Object.assign(me, { name: profile.name, look: profile.look });
  if (G.role === 'guest') G.conn?.send({ t: 'look', name: profile.name, look: profile.look });
}

function showFx(fx) {
  for (const f of fx || []) {
    if (f.txt) world.float(f.x, f.z, f.txt);
    if (f.k) world.burst(f.x, f.z, f.k);
  }
}
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
  if (me) {
    world.burst(me.x, me.z, 'coin', 1.2);
    for (let i = 0; i < 6; i++) world.float(me.x + (Math.random() - 0.5) * 2, me.z + (Math.random() - 0.5), ['🎉', '⭐', '✨'][i % 3], 1 + Math.random());
  }
}
function onAch(ids) {
  for (const id of ids || []) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) toast(`🏆 Erfolg: ${a.icon} ${a.name} (+${a.reward} Taler)`, 'ach');
  }
  play('ach');
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
  G.social[id] = { ...G.social[id], emote: e, emoteUntil: performance.now() + 2600 };
  if (e === '❤️' || e === '🥰') play('love');
}
function onHug(a, b) {
  const pa = G.players[a], pb = G.players[b];
  if (!pa || !pb) return;
  if (a === G.me || b === G.me) {
    const me = G.players[G.me], o = a === G.me ? pb : pa;
    me.ry = Math.atan2(o.x - me.x, o.z - me.z);
    me.pose = null;
    animate('hug');
    G.social[G.me] = { ...G.social[G.me], emote: '🥰', emoteUntil: performance.now() + 2000 };
  }
  const x = (pa.x + pb.x) / 2, z = (pa.z + pb.z) / 2;
  world.burst(x, z, 'heart', 1.3);
  world.float(x, z, '💕', 1.7);
  play('love');
}
function animate(kind) {
  const me = G.players[G.me];
  me.ak = kind;
  me.an = (me.an + 1) % 100000;
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
    const msg = { t: 'm', x: r3(me.x), z: r3(me.z), ry: r3(me.ry), m: me.m, ak: me.ak, an: me.an, held: me.held, pose: me.pose, fishing: me.fishing };
    const sig = JSON.stringify(msg);
    if (sig !== G.lastMove || now - (G.lastMoveT || 0) > 1000) { G.conn?.send(msg); G.lastMove = sig; G.lastMoveT = now; }
    if (now - G.lastHost > 9000) lostConnection();
    if (now - G.lastSave > 15000) saveFarm();
  }
}

function enterGame() {
  G.ready = true;
  document.body.classList.add('ingame');
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  editor.close();
  hideCover();
  panels.close();
  clearInterval(enterGame.timer);
  enterGame.timer = setInterval(netTick, 100);
  const me = G.players[G.me];
  world.target.set(me.x, 0, me.z);
  world.yaw = world.yawT = 0;
  world.zoom = 1;
  G.hotSig = null;
  wakeLock();
  applyLandscape();
  if (!store.get('kh.tutorial2', false)) {
    store.set('kh.tutorial2', true);
    setTimeout(() => toast(touch ? '🌱 Tipp: Tippe aufs Feld – deine Figur läuft hin und gräbt um. Links wischen = laufen.' : '🌱 Tipp: Klicke aufs Feld – deine Figur läuft hin und gräbt um. WASD = laufen, E = Aktion.', true), 800);
  }
}

function leave() {
  const g = G;
  if (g) {
    saveFarm();
    if (g.role === 'host' && g.net) { g.net.broadcast({ t: 'bye' }); setTimeout(() => g.net.close(), 1000); }
    if (g.role === 'guest') { g.ended = true; g.conn?.close(); }
    g.wake?.release?.();
  }
  G = null;
  keys.clear();
  Object.assign(joy, { x: 0, y: 0, id: null });
  actHeld = false;
  clearInterval(enterGame.timer);
  hideCover();
  setPhoto(false);
  editor.close();
  showMenu();
}

// ---------- Hauptmenü ----------
let menuScreen = 'title';
function showMenu(screen = 'title') {
  document.body.classList.remove('ingame');
  $('hud').classList.add('hidden');
  panels.close();
  $('menu').classList.remove('hidden');
  menuScreen = screen;
  for (const el of document.querySelectorAll('#menu .screen')) el.classList.toggle('hidden', el.id !== 'm-' + screen);
  const farms = Object.entries(store.get('kh.farms', {})).filter(([, f]) => Number.isFinite(f?.s?.money)).sort((a, b) => b[1].saved - a[1].saved);
  if (screen === 'title') {
    const own = farms.find(([, f]) => !f.guest);
    $('b-continue').classList.toggle('hidden', !own);
    if (own) {
      $('b-continue').dataset.key = own[0];
      $('continue-sub').textContent = `${own[1].name} · Tag ${own[1].s.day} · Level ${own[1].s.level}`;
    }
    const lj = store.get('kh.lastJoin', null);
    $('b-rejoin').classList.toggle('hidden', !lj?.code);
    if (lj?.code) $('rejoin-sub').textContent = `${lj.farm || 'Farm'}${lj.host ? ' von ' + lj.host : ''} · Code ${lj.code}`;
    $('hello').textContent = profile.name ? `Hallo ${profile.name}! 👋` : '';
  }
  if (screen === 'farms') {
    $('farms').innerHTML = farms.length ? farms.map(([id, f]) => `<div class="farm"><div class="tx"><b>${esc(f.name)}</b>
      <small>Tag ${f.s.day} · Level ${f.s.level} · 🪙 ${f.s.money.toLocaleString('de-DE')}${f.guest ? ` · Kopie von ${esc(f.guest)}s Farm` : ''}</small>
      <small>${new Date(f.saved).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <button class="btn small" data-play="${esc(id)}">Spielen</button><button class="btn small white" data-del="${esc(id)}">🗑️</button></div>`).join('')
      : '<div class="note">Noch keine Farm – gründe unten eure erste! 🌱</div>';
  }
  if (screen === 'settings') $('msettings').innerHTML = settingsHtml(settings, touch);
  if (screen === 'join') setTimeout(() => $('jcode').focus(), 50);
}
for (const b of document.querySelectorAll('[data-go]')) {
  b.onclick = () => {
    unlock();
    play('click');
    if (b.dataset.go === 'char') openEditor(); else showMenu(b.dataset.go);
  };
}
$('b-continue').onclick = () => {
  const f = store.get('kh.farms', {})[$('b-continue').dataset.key];
  if (f && !needName()) startHost(f.s, $('b-continue').dataset.key, f.guest);
};
$('b-rejoin').onclick = () => {
  const lj = store.get('kh.lastJoin', null);
  if (lj?.code && !needName()) startGuest(lj.code);
};
$('farms').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const farms = store.get('kh.farms', {});
  if (b.dataset.del && confirm(`„${farms[b.dataset.del]?.name}“ wirklich löschen?`)) {
    delete farms[b.dataset.del];
    store.set('kh.farms', farms);
    showMenu('farms');
  }
  if (b.dataset.play && farms[b.dataset.play] && !needName()) startHost(farms[b.dataset.play].s, b.dataset.play, farms[b.dataset.play].guest);
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
  joinParam = '';
  startGuest(code);
};
$('jcode').addEventListener('keydown', e => { if (e.key === 'Enter') $('jbtn').click(); });
// Einladungslink ?join=CODE: direkt zum Beitreten-Bildschirm
let joinParam = net.cleanCode(new URLSearchParams(location.search).get('join'));
$('jcode').value = joinParam;
$('msettings').addEventListener('click', e => { if (e.target.closest('[data-ui=fullscreen]')) toggleFullscreen(); });
function needName() {
  if (profile.name) return false;
  openEditor();
  return true;
}

// ---------- Charakter-Editor ----------
const preview = { id: 'preview', name: '', look: profile.look, x: 0.5, z: -5, ry: 0.3, m: false, an: 0, held: null };
function openEditor() {
  const inGame = !!G?.ready, me = inGame && G.players[G.me], before = me && { ...me.look };
  if (!inGame) {
    $('menu').classList.add('hidden');
    preview.look = profile.look;
    preview.ry = 0.3;
    world.yaw = world.yawT = 0;
  }
  world.zoom = 1;
  panels.close();
  $('hud').classList.add('hidden');
  const back = () => { if (inGame && G?.ready && !G.photo) $('hud').classList.remove('hidden'); };
  editor.open(profile, {
    canCancel: !!profile.name,
    onChange: look => { if (inGame) me.look = look; else preview.look = look; },
    onRotate: d => { if (inGame) me.ry += d * 0.8; else preview.ry += d * 0.8; },
    onDone: (name, look) => {
      profile.name = name;
      profile.look = look;
      saveProfile();
      play('love');
      back();
      if (inGame) sendLook(); else showMenu(joinParam ? 'join' : 'title');
    },
    onCancel: () => { back(); if (inGame) me.look = before; else showMenu(joinParam ? 'join' : 'title'); },
  });
}
const previewCam = (x, z) => (matchMedia('(orientation: portrait)').matches ? { x, z, lift: 0.75 } : { x, z, shift: 0.95 });

// ---------- Einstellungen ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-set],[data-tog]');
  if (!b) return;
  if (b.dataset.set) settings[b.dataset.set] = b.dataset.v;
  else settings[b.dataset.tog] = !settings[b.dataset.tog];
  applySettings(b.dataset.set || b.dataset.tog, true);
});
document.addEventListener('input', e => {
  const k = e.target.dataset?.vol;
  if (k) { settings[k] = e.target.value / 100; applySettings(k, false); }
});
function applySettings(k, redraw) {
  store.set('kh.settings', settings);
  audio.sound = settings.sound;
  setVolumes();
  if (k === 'music') setMusic(settings.music);
  if (k === 'quality') world.setQuality(settings.quality);
  if (k === 'landscape') applyLandscape();
  if (redraw && menuScreen === 'settings' && !$('menu').classList.contains('hidden')) $('msettings').innerHTML = settingsHtml(settings, touch);
  panels.sig = null;
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => toast('Vollbild wird hier nicht unterstützt.'));
}
// Querformat: Vollbild + Drehung sperren, wo der Browser es erlaubt; sonst Hinweis zum Drehen
function applyLandscape() {
  document.body.classList.toggle('wantland', touch && settings.landscape);
  if (touch && settings.landscape && G?.ready) {
    (document.fullscreenElement ? Promise.resolve() : document.documentElement.requestFullscreen?.() || Promise.reject())
      .then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }
}
const portraitMQ = matchMedia('(orientation: portrait)');
const updOrient = () => { document.body.classList.toggle('portrait', portraitMQ.matches); world.resize(); };
portraitMQ.addEventListener?.('change', updOrient);
updOrient();

// ---------- Fenster ----------
const panels = new Panels({
  act: a => send(a),
  ui(kind, d) {
    if (kind === 'emote') { sendEmote(d.e); panels.close(); }
    if (kind === 'leave') leave();
    if (kind === 'fullscreen') toggleFullscreen();
    if (kind === 'editlook') openEditor();
    if (kind === 'photo') setPhoto(true);
    const link = $('invlink')?.value;
    if (kind === 'copy' && link) navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    if (kind === 'share' && link) {
      if (navigator.share) navigator.share({ title: 'Kuschelhof', text: `Komm auf unsere Farm! 🌻 Code: ${G.code}`, url: link }).catch(() => {});
      else navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    }
    if (kind === 'goto' && G.players[d.id]) {
      const me = G.players[G.me], p = G.players[d.id];
      Object.assign(me, { x: p.x + 0.7, z: p.z + 0.5, pose: null });
      panels.close();
      world.burst(me.x, me.z, 'sparkle', 1);
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
  if (panels.open === kind && !tab) panels.close(); else { panels.show(kind, tab); play('click'); }
}
for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => togglePanel(b.dataset.open);
$('invite').onclick = () => togglePanel('friends');

// ---------- Fotomodus ----------
function setPhoto(on) {
  if (!G?.ready && on) return;
  if (G) G.photo = on;
  panels.close();
  $('hud').classList.toggle('hidden', on || !G?.ready);
  $('photobar').classList.toggle('hidden', !on);
  $('photohint').classList.toggle('hidden', !on);
  if (on) { world.el = 0.55; setTimeout(() => $('photohint').classList.add('hidden'), 4500); }
}
$('photobtn').onclick = () => setPhoto(true);
$('photoexit').onclick = () => setPhoto(false);
for (const b of document.querySelectorAll('[data-prot]')) b.onclick = () => world.rotate(+b.dataset.prot * Math.PI / 8);
$('shutter').onclick = async () => {
  play('shutter');
  $('flash').classList.add('on');
  setTimeout(() => $('flash').classList.remove('on'), 60);
  const url = world.snapshot(), name = `kuschelhof-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.jpg`;
  try {
    const file = new File([await (await fetch(url)).blob()], name, { type: 'image/jpeg' });
    if (touch && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Kuschelhof' }); return; }
  } catch { /* Teilen abgebrochen oder nicht möglich: herunterladen */ }
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  toast('📸 Foto gespeichert!');
};

// ---------- Chat ----------
function openChat() {
  $('chatform').classList.remove('hidden');
  $('chatin').focus();
}
function closeChat() {
  $('chatform').classList.add('hidden');
  $('chatin').blur();
}
for (const id of ['chatbtn', 'chatbtn2']) $(id).onclick = () => ($('chatform').classList.contains('hidden') ? openChat() : closeChat());
$('chatform').onsubmit = e => {
  e.preventDefault();
  if ($('chatin').value.trim()) sendChat($('chatin').value);
  $('chatin').value = '';
  closeChat();
};
$('rotbtn').onclick = () => world.rotate(Math.PI / 4);

// ---------- Eingabe ----------
const keys = new Set();
const joy = { x: 0, y: 0, id: null };
let actHeld = false, nextAct = 0;
const busy = () => !G?.ready || panels.open || editor.isOpen || G.photo;

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeChat(); return; }
  if (!G?.ready) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (G.photo) setPhoto(false);
    else if (editor.isOpen) $('edcancel').click();
    else if (panels.open) panels.close(); else panels.show('settings');
    return;
  }
  if (editor.isOpen) return;
  if (k === 'p') { setPhoto(!G.photo); return; }
  if (k === 'z') world.rotate(-Math.PI / 4);
  if (k === 'c') world.rotate(Math.PI / 4);
  if (G.photo) return;
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
// Während man einen Knopf im Fenster/der Leiste drückt, nicht neu zeichnen (sonst geht der Tipp verloren)
let uiPress = false;
for (const id of ['pbody', 'hotbar']) $(id).addEventListener('pointerdown', () => { uiPress = true; });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => { uiPress = false; });

// Bildschirm: tippen = hinlaufen & benutzen, ziehen (rechte Maustaste / Fotomodus / Editor) = drehen, zwei Finger = zoomen & drehen
const canvas = $('c'), pointers = new Map();
const twoFinger = () => { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; };
canvas.addEventListener('pointerdown', e => {
  unlock();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), btn: e.button });
  if (pointers.size === 2) G && (G.pinch = twoFinger());
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && G?.ready) G.hover = { cx: e.clientX, cy: e.clientY, t: performance.now() };
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && G?.pinch) {
    const now = twoFinger();
    world.zoom = Math.max(0.5, Math.min(1.9, world.zoom * G.pinch.d / now.d));
    world.rotate(-(now.a - G.pinch.a));
    world.yaw = world.yawT;
    G.pinch = now;
  } else if (pointers.size === 1 && (p.btn === 2 || G?.photo || editor.isOpen || !G?.ready)) {
    if (editor.isOpen) {
      if (G?.ready) G.players[G.me].ry += dx * 0.012; else preview.ry += dx * 0.012;
    } else if (G?.ready) {
      world.rotate(-dx * 0.008);
      world.yaw = world.yawT;
      if (G.photo) world.el = Math.max(0.12, Math.min(1.35, world.el + dy * 0.005));
    }
  }
});
const pointerEnd = e => {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size < 2 && G) G.pinch = null;
  if (!p || e.type === 'pointercancel') return;
  const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy), quick = performance.now() - p.t < 400;
  if (moved < 12 && quick && p.btn === 0 && pointers.size === 0) tapAt(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { world.zoom = Math.max(0.5, Math.min(1.9, world.zoom * (1 + e.deltaY * 0.001))); }, { passive: true });

const joyEl = $('joy');
joyEl.addEventListener('pointerdown', e => {
  unlock();
  if (joy.id !== null) return;
  Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, t: performance.now(), far: false });
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
  const l = Math.hypot(dx, dy), max = 52;
  if (l > 12) joy.far = true;
  if (l > max) { dx *= max / l; dy *= max / l; }
  joy.x = dx / max;
  joy.y = dy / max;
  $('joyknob').style.left = joy.ox + dx + 'px';
  $('joyknob').style.top = joy.oy + dy + 'px';
});
const joyEnd = e => {
  if (e.pointerId !== joy.id) return;
  const tap = !joy.far && performance.now() - joy.t < 350;
  joy.id = null;
  joy.x = joy.y = 0;
  $('joybase').classList.add('hidden');
  $('joyknob').classList.add('hidden');
  if (tap && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
};
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);
joyEl.addEventListener('lostpointercapture', joyEnd);

const actbtn = $('actbtn');
actbtn.addEventListener('pointerdown', e => { e.preventDefault(); unlock(); pressAction(); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) actbtn.addEventListener(ev, () => { actHeld = false; });

$('hotbar').onclick = e => { const b = e.target.closest('.slot'); if (b) { select(b.dataset.id); play('click'); } };
function select(id) {
  G.sel = id;
  G.hotSig = null;
  if (G.fishing) stopFishing();
}

// ---------- Aktionen ----------
// Was passiert am Punkt "at" (oder vor der Figur)? Andere Spieler kann man umarmen.
function context(me, at) {
  const p = at || { x: me.x + Math.sin(me.ry) * 0.9, z: me.z + Math.cos(me.ry) * 0.9 };
  for (const o of Object.values(G.players)) {
    if (o.id !== G.me && Math.hypot(o.x - p.x, o.z - p.z) < 0.75) return { hug: o.id, label: `🤗 ${o.name} umarmen`, tiles: [], px: o.x, pz: o.z };
  }
  return { ...S.resolve(G.s, me, G.sel, at), px: p.x, pz: p.z };
}

function pressAction() {
  if (busy()) return;
  actHeld = true;
  nextAct = performance.now() + 380;
  G.goal = null;
  const me = G.players[G.me];
  if (me.pose) { standUp(me); return; }
  if (G.fishing) { reelIn(); return; }
  execute(G.ctx, true);
}

function execute(r, fresh) {
  if (!r) return;
  const me = G.players[G.me];
  if (r.hug) { if (fresh) sendHug(r.hug); return; }
  if (r.ui) {
    if (!fresh) return;
    if (r.ui === 'animals') panels.show('shop', 'animals');
    else if (r.ui === 'farm') panels.show('shop', 'farm');
    else panels.show(r.ui);
    play('click');
  } else if (r.sit) {
    if (fresh) Object.assign(me, { x: r.sit.x, z: r.sit.z, ry: r.sit.r * Math.PI / 2, pose: 'sit' });
  } else if (r.fish) {
    if (fresh) startFishing(me);
  } else if (r.a && (fresh || r.a.t !== 'pickup')) {
    send(r.a);
    animate(ANIM_OF[r.a.t] || 'use');
    if (r.a.t === 'harvest') G.sickleUntil = performance.now() + 600;
  }
}

function standUp(me) {
  me.pose = null;
  me.x += Math.sin(me.ry) * 0.8;
  me.z += Math.cos(me.ry) * 0.8;
}

function tapAt(cx, cy) {
  if (busy()) return;
  const p = world.pick(cx, cy);
  if (!p) return;
  const me = G.players[G.me];
  if (G.fishing) { reelIn(); return; }
  if (me.pose) standUp(me);
  let an = null, bd = 0.9;
  for (const a of G.s.animals) { const q = S.animalPos(a, G.s.time), d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; an = a; } }
  const pl = Object.values(G.players).find(o => o.id !== G.me && Math.hypot(o.x - p.x, o.z - p.z) < 0.7);
  G.goal = an ? { animal: an.id } : pl ? { player: pl.id } : { x: p.x, z: p.z };
  G.goal.last = { x: me.x, z: me.z, t: performance.now() };
  world.burst(p.x, p.z, 'sparkle', 0.15);
}

// Zum Tipp-Ziel laufen; Rückgabe: Laufrichtung oder null (angekommen)
function followGoal(me, now) {
  const g = G.goal, s = G.s;
  let at, range;
  if (g.animal) {
    const a = s.animals.find(x => x.id === g.animal);
    if (!a) return (G.goal = null);
    at = S.animalPos(a, s.time);
    range = 1.05;
  } else if (g.player) {
    const o = G.players[g.player];
    if (!o) return (G.goal = null);
    at = { x: o.x, z: o.z };
    range = 0.95;
  } else {
    at = { x: g.x, z: g.z };
    const r = context(me, at);
    g.r = r;
    range = r.hug ? 0.95 : r.a || r.sit ? 1.05 : r.ui ? 1.6 : r.fish ? 1.2 : 0.15;
    if (r.a?.t === 'place' || r.a?.t === 'till' || r.a?.t === 'water' || r.a?.t === 'plant') range = 1.05;
  }
  const dx = at.x - me.x, dz = at.z - me.z, dist = Math.hypot(dx, dz);
  // festgefahren (z.B. vor einem Gebäude oder am Teich)? Dann von hier aus handeln
  if (now - g.last.t > 350) {
    const stuck = Math.hypot(me.x - g.last.x, me.z - g.last.z) < 0.08;
    g.last = { x: me.x, z: me.z, t: now };
    if (stuck) { arrive(me, at, dist < 4); return null; }
  }
  if (dist <= range) { arrive(me, at, true); return null; }
  return [dx / dist, dz / dist];
}
function arrive(me, at, act) {
  const g = G.goal;
  G.goal = null;
  if (Math.hypot(at.x - me.x, at.z - me.z) > 0.05) me.ry = Math.atan2(at.x - me.x, at.z - me.z);
  if (!act) return;
  const r = g.player ? context(me, null) : context(me, at);
  execute(r, true);
}

// ---------- Angeln ----------
function startFishing(me) {
  const l = G.s.up.rod;
  G.fishing = { phase: 'wait', t: 0, bite: (1.5 + Math.random() * 3.5) / (1 + (l - 1) * 0.35), win: 0.75 + l * 0.15, x: me.x + Math.sin(me.ry) * 1.8, z: me.z + Math.cos(me.ry) * 1.8 };
  me.fishing = true;
  animate('fish');
  play('splash');
}
function stopFishing() {
  G.fishing = null;
  G.players[G.me].fishing = false;
}
function reelIn() {
  const f = G.fishing, me = G.players[G.me];
  if (f.phase === 'bite') send({ t: 'fish', x: Math.round(f.x), z: Math.round(f.z) });
  else { toast('🎣 Zu früh gezogen!'); play('fail'); }
  stopFishing();
  animate('use');
  world.burst(f.x, f.z, 'water', 0.1);
}
function updateFishing(dt) {
  const f = G.fishing;
  $('fishbar').classList.toggle('hidden', !f);
  if (!f) return;
  f.t += dt;
  if (f.phase === 'wait') {
    $('fishbar').textContent = '🎣 Warte auf einen Biss…';
    $('fishbar').classList.remove('bite');
    if (f.t >= f.bite) { f.phase = 'bite'; f.t = 0; play('bite'); world.burst(f.x, f.z, 'splash', 0.05); }
  } else {
    $('fishbar').textContent = touch ? '❗ JETZT tippen! ❗' : '❗ JETZT ziehen (E / Klick)! ❗';
    $('fishbar').classList.add('bite');
    if (f.t > f.win) { stopFishing(); toast('🐟 Der Fisch ist entwischt…'); play('fail'); }
  }
}

// Info-Zeile für das markierte Feld
function infoAt(r) {
  const s = G.s, x = Math.round(r.px), z = Math.round(r.pz);
  if (r.a?.t === 'animal') {
    const a = s.animals.find(q => q.id === r.a.id);
    return a ? `${esc(a.name)} ${'❤️'.repeat(Math.ceil(a.love / 2)) || '🤍'}` : '';
  }
  const t = s.tiles[S.key(x, z)], o = s.obj[S.key(x, z)];
  if (t?.c) return cropInfo(t);
  if (o) {
    const p = PLACE[o.k];
    if (p.kind === 'machine') return o.o ? `${p.name}: fertig!` : o.n ? `${p.name}: arbeitet (${o.n})` : `${p.name}: leer`;
    if (p.kind === 'producer') return o.t >= p.every ? `${p.name}: reif!` : `${p.name}: ${Math.floor(o.t / p.every * 100)}%`;
    return r.sit ? '' : 'Mit ✋ aufheben';
  }
  if (t) return t.w > 0 ? '💧 gegossen' : 'trocken';
  return '';
}

function heldItem() {
  if (G.fishing) return 'rod';
  if (performance.now() < (G.sickleUntil || 0)) return 'sickle';
  if (G.sel === 'hoe' || G.sel === 'can') return G.sel;
  if (ITEMS[G.sel]?.seed) return 'seeds';
  if (PLACE[G.sel]) return 'box';
  return null;
}

// ---------- Bild für Bild ----------
const hud = {};
function setText(id, v) { if (hud[id] !== v) { hud[id] = v; $(id).textContent = v; } }

function gameFrame(dt, now) {
  const s = G.s, me = G.players[G.me];
  if (!s || !me) return;
  if (G.role === 'host') simulate(now); else S.tick(s, dt, false);

  // Laufen (Tastatur/Joystick relativ zur Kamera, sonst zum Tipp-Ziel)
  let vx = 0, vz = 0;
  if (!busy()) {
    if (keys.has('a') || keys.has('arrowleft')) vx--;
    if (keys.has('d') || keys.has('arrowright')) vx++;
    if (keys.has('w') || keys.has('arrowup')) vz--;
    if (keys.has('s') || keys.has('arrowdown')) vz++;
    vx += joy.x;
    vz += joy.y;
  }
  let len = Math.hypot(vx, vz), wx = 0, wz = 0;
  if (len > 0.2) {
    G.goal = null;
    const c = Math.cos(world.yaw), sn = Math.sin(world.yaw);
    if (len > 1) { vx /= len; vz /= len; }
    wx = vx * c + vz * sn;
    wz = -vx * sn + vz * c;
  } else if (G.goal && !busy()) {
    const d = followGoal(me, now);
    if (d) { [wx, wz] = d; len = 1; }
  }
  me.m = len > 0.2;
  if (me.m) {
    if (me.pose) standUp(me);
    const sp = SPEED[s.up.boots] * dt;
    const free = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]].some(([a, b]) => S.blocked(s, x + a, z + b));
    const stuck = !free(me.x, me.z);
    if (stuck || free(me.x + wx * sp, me.z)) me.x += wx * sp;
    if (stuck || free(me.x, me.z + wz * sp)) me.z += wz * sp;
    me.ry = Math.atan2(wx, wz);
    if (G.fishing) stopFishing();
  }
  me.held = heldItem();

  // Ziel: Maus (wenn gerade bewegt), sonst Feld vor der Figur
  const hover = !touch && G.hover && now - G.hover.t < 2500 && !busy() ? world.pick(G.hover.cx, G.hover.cy) : null;
  G.ctx = G.fishing || busy() ? null : context(me, null);
  const shown = hover ? context(me, hover) : G.ctx;
  const label = G.fishing ? (G.fishing.phase === 'bite' ? '❗ Ziehen!' : '🎣 …') : G.ctx?.label || '';
  if (hud.label !== label) {
    hud.label = label;
    $('hint').innerHTML = `<kbd>E</kbd> ${esc(label)}`;
    $('hint').classList.toggle('hidden', !label);
    $('actlabel').textContent = label || '…';
    const icon = label.split(' ')[0];
    $('actbtn').textContent = me.pose ? '🧍' : /\p{Extended_Pictographic}/u.test(icon) ? icon : '✋';
  }
  if (actHeld && now > nextAct) { nextAct = now + 300; execute(G.ctx, false); }
  updateFishing(dt);

  let prompt = null;
  if (shown && !G.fishing) {
    const info = infoAt(shown), lbl = shown.label || '';
    const can = shown.a || shown.ui || shown.fish || shown.sit || shown.hug;
    if (can || info) {
      const t = shown.tiles?.[0], x = shown.hug || shown.a?.t === 'animal' ? shown.px : t ? t[0] : shown.px, z = shown.hug || shown.a?.t === 'animal' ? shown.pz : t ? t[1] : shown.pz;
      const key = touch ? '' : hover ? '🖱️ ' : '<kbd>E</kbd>';
      prompt = { x, z, y: shown.hug ? 2.3 : 1.1, html: `${can && lbl ? key + esc(lbl) : ''}${info ? `<small>${info}</small>` : ''}` };
    }
  }

  const ps = {};
  for (const [id, p] of Object.entries(G.players)) ps[id] = G.social[id] ? { ...p, ...G.social[id] } : p;
  const info = world.render(s, ps, G.me, dt, {
    tiles: G.photo || editor.isOpen ? [] : shown?.tiles, hlOn: !!(shown?.a || shown?.ui || shown?.fish || shown?.sit || shown?.hug), hlBad: shown && !shown.a && !shown.ui && !shown.fish && !shown.sit && /kein|Nur|Erst/.test(shown.label || ''),
    prompt: G.photo || editor.isOpen ? null : prompt, photo: G.photo, hideNames: G.photo || !settings.names,
    bobber: G.fishing && { x: G.fishing.x, z: G.fishing.z, bite: G.fishing.phase === 'bite' },
    preview: editor.isOpen ? previewCam(me.x, me.z) : null,
  });
  ambience({ day: info.day, night: info.night, rain: s.weather === 'rain', walking: me.m });

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
  if (sig !== G.hotSig && !uiPress) {
    G.hotSig = sig;
    G.hot = items;
    $('hotbar').innerHTML = items.map((id, i) => slotHtml(s, id, i, G.sel)).join('');
  }
  if (!uiPress) panels.update(s, G);
}

let last = performance.now(), loaded = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (G?.ready) gameFrame(dt, now);
  else {
    demo.time += dt;
    if (editor.isOpen) world.render(demo, { preview }, 'preview', dt, { preview: previewCam(preview.x, preview.z), hideNames: true });
    else world.render(demo, {}, null, dt, { orbit: true });
  }
  if (!loaded) {
    loaded = true;
    $('loading').classList.add('off');
    if (!profile.name) { toast('🌻 Willkommen auf dem Kuschelhof! Erstelle zuerst deine Figur.', true); openEditor(); }
  }
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

showMenu(joinParam ? 'join' : 'title');
requestAnimationFrame(frame);
window.__game = { get G() { return G; }, world, S, profile, settings }; // für Tests & Fehlersuche
