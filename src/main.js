// Spielablauf: Menü, Steuerung, Host/Gast-Logik, Speichern.
import { World, esc, cropInfo } from './world.js';
import * as S from './state.js';
import { SPAWN, SPEED, EMOTES, ITEMS, CROPS, ANIMALS, PLACE, BUILDINGS, MAP, ACHIEVEMENTS, SEASONS, SOCIAL, STORY, RES_SPOTS, TREE_FRUIT, PAVE, WEEKDAYS, weekday, FOSSILS } from './data.js';
const FOSSIL_IDS = FOSSILS.map(f => f[0]);
import * as net from './net.js';
import { audio, unlock, play, setMusic, setVolumes, ambience, speak, musicTick } from './audio.js';
import { Panels, hotbarItems, slotHtml } from './ui.js';
import { Editor, settingsHtml, setOwnedHats, PRESETS, SETTING_DEFAULTS } from './menu.js';
import { cleanLook, randomLook } from './avatar.js';
import { NPCS, npcLine, giftReply } from './npc.js';
import { isWater, isSea, isBeach, walkable, coast, cliffZ, inRiver, onBridge, inPond, onPier, PATHS, PLAZA } from './island.js';
import { zoneOf, clampPos, STREET, TROPIC, TOURS, BOAT_PRICE, shopOpen, concertNow } from './newleaf.js';
import { loadAssets } from './assets.js';

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
const profile = { name: String(oldProfile?.name || '').slice(0, 16), look: oldProfile ? cleanLook(oldProfile.look || oldProfile) : randomLook(), owned: Array.isArray(oldProfile?.owned) ? oldProfile.owned.filter(x => typeof x === 'string') : [] };
const saveProfile = () => store.set('kh.profile', profile);

const settings = { quality: touch ? 'mid' : 'high', sound: 0.8, music: 0.5, landscape: false, names: true, fullscreen: touch, ...store.get('kh.settings', {}) };
if (typeof settings.sound !== 'number') settings.sound = settings.sound === false ? 0 : 0.8;
if (typeof settings.music !== 'number') settings.music = settings.music === false ? 0 : 0.5;
if (!PRESETS[settings.quality]) settings.quality = 'mid';
for (const [k, v] of Object.entries({ ...PRESETS[settings.quality], ...SETTING_DEFAULTS })) if (settings[k] === undefined) settings[k] = v;
audio.sound = settings.sound;
audio.music = settings.music;

// Blender-Modelle laden (der Ladebildschirm zeigt den Fortschritt)
await loadAssets(['buildings'], f => { const el = document.querySelector('#loading div'); if (el) el.innerHTML = `<span>🏝️</span><br>Kuschelinsel lädt… ${Math.round(f * 100)}%`; });
const world = new World($('c'), $('labels'), settings.quality);
// Alle Grafik-, Kamera- und Anzeige-Einstellungen anwenden
function applyView() {
  world.setQuality({ scale: settings.scale, shadows: settings.shadows, bloom: settings.bloom, grass: settings.grass, lights: settings.lights, view: settings.view });
  world.camSmooth = settings.camSmooth;
  world.baseEl = settings.camAngle;
  world.animations = settings.anim;
  document.documentElement.style.setProperty('--ui', settings.uiScale);
}
applyView();
addEventListener('resize', () => world.resize());
const editor = new Editor();

let G = null; // laufende Spielsitzung
const demo = demoFarm();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r3 = v => Math.round(v * 1000) / 1000;
// Zustand fürs Netz verkleinern: Kommazahlen kürzen
const pack = s => JSON.parse(JSON.stringify(s, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? r3(v) : v));
const ACTS = ['hoe', 'can', 'sickle', 'plant', 'pet', 'fish', 'use', 'hug', 'shake', 'highfive', 'kiss', 'net'];
const HELD = ['hoe', 'can', 'sickle', 'rod', 'seeds', 'box', 'net', 'shovel', 'axe'];
const ANIM_OF = { water: 'can', plant: 'plant', harvest: 'use', place: 'use', pickup: 'use', pick: 'plant', use: 'shake', chop: 'hoe', mine: 'hoe', dig: 'hoe', shake: 'shake', tpick: 'shake', hit: 'plant' };

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
const newPlayer = (id, p) => ({ id, ...cleanProfile(p), x: SPAWN.x + (Math.random() - 0.5) * 2, z: SPAWN.z + Math.random(), ry: 0, m: false, ak: null, an: 0, held: null, pose: null, fishing: false, run: false, sw: false });
const session = (role, s, me) => ({ role, s, me, players: {}, social: {}, sel: 'hand', settings, touch, code: null, lastSeen: {}, lastSave: 0, lastState: 0, get myName() { return profile.name; } });

// Gast-Kopien liegen unter eigenem Schlüssel, damit sie nie die eigene Farm überschreiben.
function saveFarm() {
  if (!G?.s || !G.key) return;
  G.lastSave = performance.now();
  const f = store.get('ki.islands', {});
  f[G.key] = { name: G.s.name, saved: Date.now(), s: G.s, guest: G.role === 'guest' ? G.players.h?.name || '?' : G.copyOf };
  store.set('ki.islands', f);
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
    [p.x, p.z] = clampPos(d.x, d.z, MAP); // Haus, Bummelgasse und Tropeninsel liegen weit weg
    p.ry = d.ry;
    p.m = !!d.m;
    p.ak = ACTS.includes(d.ak) ? d.ak : null;
    p.an = Number.isInteger(d.an) ? d.an : 0;
    p.held = HELD.includes(d.held) ? d.held : null;
    p.pose = d.pose === 'sit' || d.pose === 'sleep' || d.pose === 'dive' ? d.pose : null;
    p.fishing = d.fishing === true;
    p.run = d.run === true;
    p.sw = d.sw === true;
  }
  if (d.t === 'look') Object.assign(p, cleanProfile(d));
  if (d.t === 'act') handleAct(id, d.a);
  if (d.t === 'chat') chat(id, d.text);
  if (d.t === 'emote') emote(id, d.e);
  if (d.t === 'hug' && typeof d.id === 'string') social(id, d.id, 'hug');
  if (d.t === 'soc' && typeof d.id === 'string' && Object.hasOwn(SOCIAL, d.k)) social(id, d.id, d.k);
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
  if (a && (a.t === 'bug' || a.t === 'fish')) { // nicht im Sekundentakt fangen
    const t = performance.now(), last = (G.lastCatch ||= {})[id] || 0;
    if (t - last < (a.t === 'bug' ? 1200 : 2500)) return;
    G.lastCatch[id] = t;
  }
  const out = S.act(G.s, a);
  if (out.ok) { G.dirty = true; G.lastState = 0; }
  if (out.fx.length) { G.net?.broadcast({ t: 'fx', fx: out.fx }); showFx(out.fx); }
  const res = { t: 'res', ok: out.ok, msg: out.msg, snd: out.snd, caught: out.caught, newAlbum: out.newAlbum, reaction: out.reaction, learned: out.learned, got: out.got };
  if (id === G.me) onRes(res); else G.net?.send(id, res);
  if (out.levelUp) { G.net?.broadcast({ t: 'lvl', l: out.levelUp }); onLevel(out.levelUp); }
  if (out.ach) { G.net?.broadcast({ t: 'ach', ids: out.ach }); onAch(out.ach); }
  if (out.quest) questDone(out.quest);
  if (out.ok && out.msg && ['upgrade', 'order', 'donate'].includes(a.t)) {
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
function questDone(title) {
  const text = `📜 Quest geschafft: ${title} – Belohnung im 📋 Inselbuch abholen!`;
  G.net?.broadcast({ t: 'toast', text, snd: 'ach' });
  toast(text, 'ach');
  play('ach');
}
function social(a, b, k) {
  if (!Object.hasOwn(G.players, a) || !Object.hasOwn(G.players, b) || a === b) return;
  const pa = G.players[a], pb = G.players[b];
  if (!(Math.hypot(pa.x - pb.x, pa.z - pb.z) <= 3)) return;
  if (k === 'hug') { const out = {}; S.questEvent(G.s, 'hug', 1, out); G.dirty = true; if (out.quest) questDone(out.quest); }
  G.net?.broadcast({ t: 'soc', a, b, k });
  G.net?.broadcast({ t: 'hug', a, b }); // für ältere Versionen
  onSocial(a, b, k);
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
      G.players = normPlayers(d.players);
      if (old) Object.assign(G.players[G.me], { x: old.x, z: old.z, ry: old.ry });
      G.code = d.code;
      G.key = 'copy:' + G.s.id;
      store.set('ki.lastJoin', { code: G.joinCode, host: G.players.h?.name || '', farm: G.s.name });
      G.onWelcome?.();
      if (!G.ready) enterGame(); else hideCover();
      saveFarm();
      break;
    }
    case 's': if (G.s && d.s && typeof d.s === 'object') G.s = S.migrate(d.s); break;
    case 'p': {
      if (!d.p || typeof d.p !== 'object') return;
      const me = G.players[G.me];
      G.players = normPlayers(d.p);
      if (me) G.players[G.me] = me;
      break;
    }
    case 'fx': showFx(d.fx); break;
    case 'res': onRes(d); break;
    case 'lvl': onLevel(d.l); break;
    case 'ach': onAch(d.ids); break;
    case 'chat': showChat(d); break;
    case 'emote': showEmote(d.id, d.e); break;
    case 'soc': if (Object.hasOwn(SOCIAL, d.k)) onSocial(d.a, d.b, d.k); break;
    case 'toast': toast(d.text); if (d.snd) play(d.snd); break;
    case 'wake': wake(); break;
    case 'kick': G.ended = true; G.conn?.close(); cover('Der Host hat dich von der Insel geschickt.', true); break;
    case 'bye': G.ended = true; G.conn?.close(); saveFarm(); cover('🏝️ Der Host hat die Insel verlassen. Deine Kopie ist gespeichert – du findest sie unter „Meine Inseln“.', true); break;
  }
}

// Spieler vom Host absichern (auch ältere Versionen ohne "look")
function normPlayers(ps) {
  const out = {};
  for (const [id, p] of Object.entries(ps || {})) if (p && typeof p === 'object') out[id] = { ...p, id, name: String(p.name || 'Gast').slice(0, 16), look: cleanLook(p.look || p) };
  return out;
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
  if (G === g) cover('Der Host ist nicht erreichbar. Deine Kopie der Insel ist gespeichert – unter „Meine Inseln“ kannst du sie selbst weiterspielen.', true);
}

// ---------- gemeinsam ----------
function send(a) {
  if (G.role === 'host') handleAct(G.me, a);
  else G.conn?.send({ t: 'act', a });
}
const sendTo = (msg, local) => (G.role === 'host' ? local() : G.conn?.send(msg));
const sendChat = text => sendTo({ t: 'chat', text }, () => chat(G.me, text));
const sendEmote = e => sendTo({ t: 'emote', e }, () => emote(G.me, e));
const sendSocial = (id, k) => sendTo({ t: 'soc', id, k }, () => social(G.me, id, k));
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
  if (r.reaction && G.talk) giftAnswer(r.reaction);
  if (r.snd) play(r.snd);
  else if (r.msg && !r.ok) play('fail');
  if (r.msg) toast(r.msg);
  if (r.caught) toast(`${ITEMS[r.caught].cat === 'fish' ? '🎣' : ITEMS[r.caught].cat === 'bug' && !FOSSIL_IDS.includes(r.caught) ? '🦋' : '⛏️'} ${ITEMS[r.caught].icon} ${ITEMS[r.caught].name}!`);
  if (r.learned) { play('level'); world.float(G.players[G.me].x, G.players[G.me].z, '📜✨', 2); }
  // Fundstück kurz hochhalten (nur bei Dingen, die man noch nicht oft hat)
  if (r.got && ITEMS[r.got] && G.players[G.me] && !G.players[G.me].sw) {
    const me = G.players[G.me], n = G.s.inv[r.got] || 0, big = n <= 1 || ITEMS[r.got].furn || ITEMS[r.got].place;
    if (big) { animate('lift'); world.float(me.x, me.z, ITEMS[r.got].icon, 2.1, { cls: 'hold', life: 1.4, rise: 0.15, follow: () => G?.players[G.me] }); play('harvest'); }
  }
  if (r.newAlbum) { toast(`📖 Neu im Sammelbuch: ${ITEMS[r.newAlbum].icon} ${ITEMS[r.newAlbum].name}`, 'ach'); play('ach'); }
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
function showEmote(id, e, ms = 2600) {
  G.social[id] = { ...G.social[id], emote: e, emoteUntil: performance.now() + ms };
  const p = G.players[id];
  if (p) world.emoteFx(p.x, p.z, e);
  play({ '❤️': 'love', '🥰': 'love', '😘': 'love', '🎉': 'level', '👏': 'coin', '😂': 'chat', '💃': 'join', '🎵': 'join' }[e] || 'chat');
}
// Zusammen: Umarmen, Küsschen, High-Five, Tanzen
function onSocial(a, b, k) {
  const pa = G.players[a], pb = G.players[b];
  if (!pa || !pb) return;
  if (a === G.me || b === G.me) {
    const me = G.players[G.me], o = a === G.me ? pb : pa;
    me.ry = Math.atan2(o.x - me.x, o.z - me.z);
    me.pose = null;
    if (k === 'dance') { showEmote(a, '💃', 5000); showEmote(b, '💃', 5000); }
    else animate(k);
  }
  const x = (pa.x + pb.x) / 2, z = (pa.z + pb.z) / 2;
  if (k === 'hug') { world.burst(x, z, 'heart', 1.3); world.float(x, z, '💕', 1.7); world.emoteFx(x, z, '🥰'); play('love'); }
  if (k === 'kiss') { world.emoteFx(x, z, '😘'); world.float(x, z, '😘', 1.9); play('love'); }
  if (k === 'highfive') { setTimeout(() => { world.burst(x, z, 'coin', 1.7); world.float(x, z, '✋✨', 2); play('coin'); }, 180); }
}
function animate(kind) {
  const me = G.players[G.me];
  me.ak = kind;
  me.an = (me.an + 1) % 100000;
}

function announceDay() {
  const s = G.s;
  const sea = S.seasonOf(s.day), newSea = (s.day - 1) % 7 === 0;
  say(`${newSea ? `${SEASONS[sea][1]} Der ${SEASONS[sea][0]} beginnt! ` : '🌅 '}${WEEKDAYS[weekday(s.day)]}, Tag ${s.day} – ${s.weather === 'rain' ? '🌧️ Regen gießt alle Blumen!' : s.weather === 'snow' ? '🌨️ Es schneit!' : s.rainbowDay === s.day ? '🌈 Nach dem Regen: Schau mal in den Himmel!' : '☀️ Sonnenschein'}`);
  if (weekday(s.day) === 0) say('🐰 Hoppel verkauft heute bis 12 Uhr Rüben am Dorfplatz!');
  if (weekday(s.day) === 6) say('🎸 Heute ab 20 Uhr: Livemusik im Mondschein-Club in der Bummelgasse!');
  if (s.mail.some(m => m.kind && m.day === s.day)) say('💌 Im Briefkasten liegt neue Post!');
  if (Object.values(s.shells).includes('sternsplitter')) say('🌟 Am Strand glitzern Sternsplitter!');
  saveFarm();
}

// Host: Welt weiterrechnen (im Bild-Takt, oder per Timer wenn der Tab im Hintergrund ist)
function simulate(now) {
  const dt = Math.min(5, (now - (G.lastSim || now)) / 1000);
  G.lastSim = now;
  const day = G.s.day;
  G.s.real = !!settings.realtime;
  if (G.s.real && S.realClock(G.s)) G.dirty = true;
  if (S.tick(G.s, dt, true)) G.dirty = true;
  // Alle im Bett? Dann ist gleich Morgen.
  const ps = Object.values(G.players);
  if (ps.length && ps.every(p => p.pose === 'sleep') && S.sleepThrough(G.s)) { G.dirty = true; G.net?.broadcast({ t: 'wake' }); wake(); }
  if (G.s.day !== day) announceDay();
}
function wake() {
  const me = G?.players[G.me];
  if (me?.pose !== 'sleep') return;
  standUp(me);
  fade();
  toast('☀️ Guten Morgen! Ausgeschlafen in einen neuen Tag.', true);
}
// kurzer Übergang (Tür, Schlafen)
function fade() {
  $('fade').classList.add('on');
  setTimeout(() => $('fade').classList.remove('on'), 350);
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
    const msg = { t: 'm', x: r3(me.x), z: r3(me.z), ry: r3(me.ry), m: me.m, ak: me.ak, an: me.an, held: me.held, pose: me.pose, fishing: me.fishing, run: !!me.run, sw: !!me.sw };
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
  if (!store.get('ki.tutorial', false)) {
    store.set('ki.tutorial', true);
    setTimeout(() => toast(touch ? '🌳 Tipp: Tippe auf einen Baum – deine Figur läuft hin und schüttelt ihn. Links wischen = laufen.' : '🌳 Tipp: Klicke auf einen Baum – deine Figur läuft hin und schüttelt ihn. WASD = laufen, E = Aktion.', true), 800);
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
  closeTalk();
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
  const farms = Object.entries(store.get('ki.islands', {})).filter(([, f]) => Number.isFinite(f?.s?.money)).sort((a, b) => b[1].saved - a[1].saved);
  if (screen === 'title') {
    const own = farms.find(([, f]) => !f.guest);
    $('b-continue').classList.toggle('hidden', !own);
    if (own) {
      $('b-continue').dataset.key = own[0];
      $('continue-sub').textContent = `${own[1].name} · Tag ${own[1].s.day} · Level ${own[1].s.level}`;
    }
    const lj = store.get('ki.lastJoin', null);
    $('b-rejoin').classList.toggle('hidden', !lj?.code);
    if (lj?.code) $('rejoin-sub').textContent = `${lj.farm || 'Insel'}${lj.host ? ' von ' + lj.host : ''} · Code ${lj.code}`;
    $('hello').textContent = profile.name ? `Hallo ${profile.name}! 👋` : '';
  }
  if (screen === 'farms') {
    $('farms').innerHTML = farms.length ? farms.map(([id, f]) => `<div class="farm"><div class="tx"><b>${esc(f.name)}</b>
      <small>Tag ${f.s.day} · Level ${f.s.level} · 🪙 ${f.s.money.toLocaleString('de-DE')}${f.guest ? ` · Kopie von ${esc(f.guest)}s Insel` : ''}</small>
      <small>${new Date(f.saved).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <button class="btn small" data-play="${esc(id)}">Spielen</button><button class="btn small white" data-del="${esc(id)}">🗑️</button></div>`).join('')
      : '<div class="note">Noch keine Insel – gründet unten eure erste! 🏝️</div>';
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
  const f = store.get('ki.islands', {})[$('b-continue').dataset.key];
  if (f && !needName()) startHost(f.s, $('b-continue').dataset.key, f.guest);
};
$('b-rejoin').onclick = () => {
  const lj = store.get('ki.lastJoin', null);
  if (lj?.code && !needName()) startGuest(lj.code);
};
$('farms').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const farms = store.get('ki.islands', {});
  if (b.dataset.del && confirm(`„${farms[b.dataset.del]?.name}“ wirklich löschen?`)) {
    delete farms[b.dataset.del];
    store.set('ki.islands', farms);
    showMenu('farms');
  }
  if (b.dataset.play && farms[b.dataset.play] && !needName()) startHost(farms[b.dataset.play].s, b.dataset.play, farms[b.dataset.play].guest);
};
$('newbtn').onclick = () => {
  if (needName()) return;
  startHost(S.newFarm($('fname').value.trim().slice(0, 24) || `${profile.name}s Insel`));
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
const preview = { id: 'preview', name: '', look: profile.look, x: -2.4, z: 2.6, ry: 0.3, m: false, an: 0, held: null };
function openEditor() {
  const inGame = !!G?.ready, me = inGame && G.players[G.me], before = me && { ...me.look };
  interrupt();
  if (!inGame) {
    $('menu').classList.add('hidden');
    preview.look = profile.look;
    preview.ry = 0.3;
    world.yaw = world.yawT = 0;
  }
  world.zoom = 1;
  panels.close();
  if (inGame) profile.owned = [...new Set([...(profile.owned || []), ...Object.keys(G.s.wardrobe || {})])]; // gekaufte Hüte merkt sich das Gerät
  setOwnedHats(profile.owned);
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
const previewCam = (x, z) => (matchMedia('(orientation: portrait)').matches ? { x, z, lift: 0.45 } : { x, z, shift: 0.95 });

// ---------- Einstellungen ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-set],[data-tog]');
  if (!b) return;
  if (b.dataset.set) { const v = b.dataset.v; settings[b.dataset.set] = v !== '' && !isNaN(v) ? Number(v) : v; }
  else settings[b.dataset.tog] = !settings[b.dataset.tog];
  applySettings(b.dataset.set || b.dataset.tog, true);
});
document.addEventListener('input', e => {
  const k = e.target.dataset?.vol;
  if (k) { settings[k] = e.target.value / 100; applySettings(k, false); }
  const r = e.target.dataset?.rng; // Schieberegler: Zahl anzeigen, erst beim Loslassen neu zeichnen
  if (r) { settings[r] = Number(e.target.value); const o = e.target.nextElementSibling; if (o) o.textContent = r === 'grass' ? (settings[r] || 'Aus') : r === 'camSmooth' ? (settings[r] < 0.8 ? 'weich' : settings[r] > 1.3 ? 'direkt' : 'normal') : Math.round(settings[r] * 100) + ' %'; applySettings(r, false); }
});
document.addEventListener('change', e => { if (e.target.dataset?.rng) applySettings(e.target.dataset.rng, true); });
function applySettings(k, redraw) {
  store.set('kh.settings', settings);
  audio.sound = settings.sound;
  setVolumes();
  if (k === 'music') setMusic(settings.music);
  if (k === 'quality') Object.assign(settings, PRESETS[settings.quality]);
  if (['quality', 'scale', 'shadows', 'bloom', 'grass', 'lights', 'view', 'camSmooth', 'camAngle', 'anim', 'uiScale'].includes(k)) { store.set('kh.settings', settings); applyView(); }
  if (k === 'landscape') applyLandscape();
  if (k === 'fullscreen' && settings.fullscreen !== isFs()) toggleFullscreen();
  if (redraw && menuScreen === 'settings' && !$('menu').classList.contains('hidden')) $('msettings').innerHTML = settingsHtml(settings, touch);
  panels.sig = null;
}
// ---------- Vollbild (Handy & iPad) ----------
// iPad/Android: echtes Vollbild. iPhone-Safari erlaubt das nicht – dort hilft nur „Zum Home-Bildschirm“.
const root = document.documentElement;
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const standalone = !!navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
document.body.classList.toggle('standalone', standalone);
function enterFs() {
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!req) return Promise.reject();
  try { return Promise.resolve(req.call(root, { navigationUI: 'hide' })); } catch (e) { return Promise.reject(e); }
}
function fsHelp() {
  if (standalone) return toast('Du spielst schon im Vollbild 🙂');
  $('fshelp').classList.remove('hidden');
}
function toggleFullscreen() {
  if (isFs()) return (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  enterFs().then(() => setTimeout(() => isFs() || fsHelp(), 600), fsHelp);
}
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => document.body.classList.toggle('fs', isFs()));
$('fsbtn').onclick = toggleFullscreen;
$('fsok').onclick = () => $('fshelp').classList.add('hidden');
// beim Antippen im Menü automatisch ins Vollbild (Browser verlangen dafür einen Tipp)
document.addEventListener('click', e => {
  if (touch && settings.fullscreen && !standalone && !isFs() && e.target.closest('#menu button:not([data-tog]), #edok')) enterFs().catch(() => {});
}, true);
// Querformat: Vollbild + Drehung sperren, wo der Browser es erlaubt; sonst Hinweis zum Drehen
function applyLandscape() {
  document.body.classList.toggle('wantland', touch && settings.landscape);
  if (touch && settings.landscape && G?.ready) {
    (isFs() ? Promise.resolve() : enterFs())
      .then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }
}
$('rotoff').onclick = () => { settings.landscape = false; applySettings('landscape', true); };
const portraitMQ = matchMedia('(orientation: portrait)');
const updOrient = () => { document.body.classList.toggle('portrait', portraitMQ.matches); world.resize(); };
portraitMQ.addEventListener?.('change', updOrient);
updOrient();

// ---------- Fenster ----------
const panels = new Panels({
  act: a => send(a),
  ui(kind, d) {
    if (kind === 'app') openApp(d.app);
    if (kind === 'pave') { G.pathType = d.k; select('pave', true); panels.close(); toast(d.k === 'none' ? '🧹 Designer: Wege entfernen' : `${PAVE[d.k].icon} Designer: ${PAVE[d.k].name} – tippe auf Rasen oder Sand`); }
    if (kind === 'emote') { sendEmote(d.e); panels.close(); }
    if (kind === 'soc' && Object.hasOwn(G.players, G.together || '')) { sendSocial(G.together, d.k); panels.close(); }
    if (kind === 'leave') leave();
    if (kind === 'sail') {
      if (G.s.money < BOAT_PRICE) { toast(`Die Überfahrt kostet ${BOAT_PRICE} Taler.`); return; }
      send({ t: 'boat' });
      toast('⛵ Käpt\'n Flossi legt ab … 🎶');
      setTimeout(() => G?.ready && travel('tropic'), 600);
    }
    if (kind === 'sailhome') travel('pier');
    if (kind === 'dance') { panels.close(); sendEmote('💃'); animate('shake'); world.float(G.players[G.me].x, G.players[G.me].z, '🎶✨', 2); toast('🪩 DJ Quak legt auf – tanzt los!'); }
    if (kind === 'fullscreen') toggleFullscreen();
    if (kind === 'editlook') openEditor();
    if (kind === 'photo') setPhoto(true);
    const link = $('invlink')?.value;
    if (kind === 'copy' && link) navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    if (kind === 'share' && link) {
      if (navigator.share) navigator.share({ title: 'Kuschelinsel', text: `Komm auf unsere Insel! 🏝️ Code: ${G.code}`, url: link }).catch(() => {});
      else navigator.clipboard?.writeText(link).then(() => toast('📋 Link kopiert!'), () => toast(link));
    }
    if (kind === 'goto' && Object.hasOwn(G.players, d.id)) {
      interrupt();
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
// Laufende Aktionen (Angeln, Laufziel) abbrechen, wenn etwas anderes beginnt
function interrupt() {
  if (!G?.ready) return;
  if (G.fishing) stopFishing();
  G.goal = null;
}
// Apps im Inselhandy
function openApp(app) {
  play('click');
  const P = { map: ['map'], shop: ['shop'], sell: ['sell'], quests: ['orders', 'quests'], album: ['orders', 'album'], museum: ['museum'], recipes: ['recipes'], turnip: ['turnip'],
    designer: ['designer'], friends: ['friends'], goals: ['orders', 'goals'], emotes: ['emotes'], settings: ['settings', 'options'] }[app];
  if (P) { panels.show(...P); return; }
  panels.close();
  if (app === 'camera') setPhoto(true);
  if (app === 'sky') toggleSky();
}
function toggleSky(on = !G.skyView) {
  if (!G?.ready) return;
  G.skyView = on;
  document.body.classList.toggle('skyview', on);
  if (on) toast(G.s.starNight && 6 + G.s.dayTime * 18 >= 19 ? '🌠 Sternschnuppen-Nacht! Wenn eine vorbeifliegt: schnell Aktion drücken und etwas wünschen.' : '🔭 Du schaust in den Himmel. Nochmal 🔭 (oder laufen) zum Zurückschauen.');
}
$('skybtn').onclick = () => { toggleSky(); play('click'); };
function togglePanel(kind, tab) {
  interrupt();
  if (panels.open === kind && !tab) panels.close(); else { panels.show(kind, tab); play('click'); }
}
for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => togglePanel(b.dataset.open);
$('invite').onclick = () => togglePanel('friends');
$('questpill').onclick = () => { interrupt(); panels.show('orders', 'quests'); play('click'); };

// ---------- Fotomodus ----------
function setPhoto(on) {
  if (!G?.ready && on) return;
  if (on) interrupt();
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
  const url = world.snapshot(), name = `kuschelinsel-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.jpg`;
  try {
    const file = new File([await (await fetch(url)).blob()], name, { type: 'image/jpeg' });
    if (touch && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Kuschelinsel' }); return; }
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
const busy = () => !G?.ready || panels.open || editor.isOpen || G.photo || G.talk;

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeChat(); return; }
  if (!G?.ready) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (G.talk) closeTalk();
    else if (G.photo) setPhoto(false);
    else if (editor.isOpen) $('edcancel').click();
    else if (panels.open) panels.close(); else panels.show('settings');
    return;
  }
  if (editor.isOpen || G.talk) return;
  if (k === 'p') { setPhoto(!G.photo); return; }
  if (k === 'z' || k === 'c') { keys.add(k); return; } // gedrückt halten = gleichmäßig drehen
  if (G.photo) return;
  if (k === 'k') { toggleSky(); return; }
  if (k === 'h' || k === 'tab') { togglePanel('phone'); e.preventDefault(); return; }
  const hot = { b: 'shop', i: 'sell', o: 'orders', f: 'friends', q: 'emotes', m: 'map' }[k];
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
let multiTouch = false;
const twoFinger = () => { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; };
canvas.addEventListener('pointerdown', e => {
  unlock();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), btn: e.button });
  if (pointers.size === 2) { multiTouch = true; if (G) G.pinch = twoFinger(); }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && G?.ready) G.hover = { cx: e.clientX, cy: e.clientY, t: performance.now() };
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && G?.pinch) {
    const now = twoFinger();
    world.zoom = Math.max(0.5, Math.min(1.9, world.zoom * (G.pinch.d / now.d) ** settings.zoomSpeed));
    world.rotate(-(now.a - G.pinch.a) * settings.mouseSens * (settings.invert ? -1 : 1));
    world.yaw = world.yawT;
    G.pinch = now;
  } else if (pointers.size === 1 && (p.btn === 2 || G?.photo || editor.isOpen || !G?.ready)) {
    if (editor.isOpen) {
      if (G?.ready) G.players[G.me].ry += dx * 0.012; else preview.ry += dx * 0.012;
    } else if (G?.ready) {
      world.rotate(-dx * 0.008 * settings.mouseSens * (settings.invert ? -1 : 1));
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
  if (moved < 12 && quick && p.btn === 0 && pointers.size === 0 && !multiTouch) tapAt(e.clientX, e.clientY);
  if (!pointers.size) multiTouch = false;
};
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { world.zoom = Math.max(0.5, Math.min(1.9, world.zoom * (1 + e.deltaY * 0.001 * settings.zoomSpeed))); }, { passive: true });

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
function select(id, quiet) {
  if (id === 'pave' && G.sel === 'pave' && !quiet) { panels.show('designer'); play('click'); }
  if (id === 'pave' && !G.pathType) G.pathType = 'erde';
  G.sel = id;
  G.hotSig = null;
  if (G.fishing) stopFishing();
}

// ---------- Aktionen ----------
// Was passiert am Punkt "at" (oder vor der Figur)? Andere Spieler kann man umarmen.
function context(me, at) {
  if (G.skyView) {
    const stars = G.s.starNight && 6 + G.s.dayTime * 18 >= 19;
    return stars ? (world.starActive() ? { wish: true, label: '🌠 Wünschen!', tiles: [] } : { label: '✨ Warte auf eine Sternschnuppe …', tiles: [] }) : { label: '🔭 Himmel', tiles: [] };
  }
  const p = at || { x: me.x + Math.sin(me.ry) * 0.9, z: me.z + Math.cos(me.ry) * 0.9 };
  const n = world.npcNear(p.x, p.z, at ? 0.9 : 1.1);
  if (n) return { npc: n.id, label: `💬 ${NPCS[n.id].name}`, tiles: [], px: n.x, pz: n.z };
  for (const o of Object.values(G.players)) {
    if (o.id !== G.me && Math.hypot(o.x - p.x, o.z - p.z) < 0.75) return { hug: o.id, label: `🤗 ${o.name} umarmen`, tiles: [], px: o.x, pz: o.z };
  }
  return { ...S.resolve(G.s, me, G.sel === 'pave' ? 'pave:' + (G.pathType || 'erde') : G.sel, at), px: p.x, pz: p.z };
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
  if (r.npc === 'hoppel') { if (fresh) { interrupt(); panels.show('turnip'); world.npcSay('hoppel', 'happy'); world.npcBubble('hoppel', 'Rüben! Frische Rüben!'); play('chat'); } return; }
  if (r.npc) { if (fresh) openTalk(r.npc); return; }
  if (r.dive) {
    if (!fresh || me.pose === 'dive') return;
    me.pose = 'dive';
    world.burst(me.x, me.z, 'splash', -0.2); play('splash');
    setTimeout(() => {
      if (!G?.ready) return;
      me.pose = null;
      world.burst(me.x, me.z, 'splash', -0.2);
      if (r.a) send(r.a); else toast('🫧 Nur Sand und Seegras da unten. Such nach Luftblasen!');
    }, 1100);
    return;
  }
  if (r.wish) {
    if (!fresh || performance.now() < (G.wishCool || 0)) return;
    G.wishCool = performance.now() + 1500;
    send({ t: 'wish' });
    animate('shake');
    world.burst(me.x, me.z, 'sparkle', 2.5); world.float(me.x, me.z, '🌠🙏', 2);
    toast('🌠 Wunsch geschickt! Morgen liegen vielleicht Sternsplitter am Strand …');
    return;
  }
  if (r.hug) { if (fresh) { interrupt(); G.together = r.hug; panels.show('together'); play('click'); } return; }
  if (r.go) { if (fresh) travel(r.go); return; }
  if (r.net) {
    if (!fresh || performance.now() < (G.netCool || 0)) return;
    G.netCool = performance.now() + 900;
    animate('net');
    if (r.tropic) { // Tropeninsel: überall flattert etwas
      if (Math.random() < 0.5) send({ t: 'tbug' }); else { toast('🦋 Daneben! Auf der Tropeninsel flattert es überall – nochmal!'); play('fail'); }
      return;
    }
    const c = world.nearCritter(r.net.x, r.net.z), k = S.key(Math.round(r.net.x), Math.round(r.net.z));
    const flowers = ['blumen', 'kirschbaum'].includes(G.s.obj[k]?.k) || CROPS[G.s.tiles[k]?.c?.k]?.cat === 'fruit';
    if (c || (flowers && Math.random() < 0.45) || (S.seasonOf(G.s.day) === 'winter' && Math.random() < 0.35)) {
      if (c) world.catchCritter(c);
      send({ t: 'bug', x: Math.round(me.x), z: Math.round(me.z) });
    } else { toast('🦋 Daneben! Schleich dich an Schmetterlinge oder Blumen an.'); play('fail'); }
    return;
  }
  if (r.visit) {
    if (fresh) { const n = NPCS[r.visit], away = world.npcM?.get(r.visit)?.awake; toast(away ? `🚪 Klopf, klopf … ${n.icon} ${n.name} ist gerade draußen auf der Insel unterwegs.` : `🌙 ${n.icon} ${n.name} schläft schon. Pssst!`); play('door'); }
    return;
  }
  if (r.petals) { if (fresh) { animate('shake'); for (let i = 0; i < 6; i++) world.burst(r.petals.x, r.petals.z, 'petal', 2.2); play('water'); } return; }
  if (r.ui) {
    if (!fresh) return;
    interrupt();
    if (r.ui === 'farm') panels.show('shop', 'farm');
    else panels.show(r.ui);
    play('click');
  } else if (r.enter || r.exit) {
    if (!fresh) return;
    interrupt();
    fade();
    play('door');
    const [, d] = S.roomSize(G.s);
    if (r.enter) Object.assign(me, { x: S.HOME_X, z: d / 2 - 0.7, ry: Math.PI, pose: null });
    else Object.assign(me, { x: BUILDINGS.house.cx, z: BUILDINGS.house.z1 + 1.4, ry: 0, pose: null });
  } else if (r.sleep) {
    if (!fresh) return;
    const a = r.sleep.r * Math.PI / 2, side = r.sleep.wide ? (G.me === 'h' ? -0.45 : 0.45) : 0; // Fußende, im Doppelbett nebeneinander
    Object.assign(me, { x: r.sleep.x + Math.sin(a) * 0.6 + Math.cos(a) * side, z: r.sleep.z + Math.cos(a) * 0.6 - Math.sin(a) * side, ry: a, pose: 'sleep' });
    const h = 6 + G.s.dayTime * 18;
    toast(h >= 18 ? (Object.keys(G.players).length > 1 ? '😴 Gute Nacht! Wenn alle im Bett liegen, beginnt ein neuer Tag.' : '😴 Gute Nacht!') : '😴 Ein kleines Nickerchen … (Schlafen geht ab 18 Uhr bis zum Morgen)');
  } else if (r.sit) {
    if (fresh) Object.assign(me, { x: r.sit.x, z: r.sit.z, ry: r.sit.r * Math.PI / 2, pose: 'sit' });
  } else if (r.fish) {
    if (fresh) startFishing(me);
  } else if (r.a && (fresh || r.a.t !== 'pickup')) {
    send(r.a);
    animate(ANIM_OF[r.a.t] || 'use');
    if (r.a.t === 'shake' || r.a.t === 'chop') world.shakeTree(r.a.x, r.a.z);
    if (r.a.t === 'pop') { world.popBalloon(); play('splash'); }
  }
}

function standUp(me) {
  const c = Math.cos(me.ry), s = Math.sin(me.ry), sleep = me.pose === 'sleep';
  me.pose = null;
  // freien Platz neben Bett/Sitz suchen: vorne, rechts, links, Fußende – sonst an die Tür
  const spots = sleep ? [[c * 1.3, -s * 1.3], [-c * 1.3, s * 1.3], [s * 0.9, c * 0.9], [c * 0.9, -s * 0.9], [-c * 0.9, s * 0.9]] : [[s * 0.8, c * 0.8], [c * 0.8, -s * 0.8], [-c * 0.8, s * 0.8], [-s * 0.8, -c * 0.8]];
  const free = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25], [0, 0]].some(([a, b]) => S.blocked(G.s, x + a, z + b));
  const ok = spots.find(([dx, dz]) => free(me.x + dx, me.z + dz));
  if (ok) { me.x += ok[0]; me.z += ok[1]; }
  else if (S.inside(me)) { me.x = S.HOME_X; me.z = S.roomSize(G.s)[1] / 2 - 0.7; }
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
  const nb = world.npcNear(p.x, p.z, 0.8);
  G.goal = nb ? { npc: nb.id } : an ? { animal: an.id } : pl ? { player: pl.id } : { x: p.x, z: p.z };
  G.goal.last = { x: me.x, z: me.z, t: performance.now() };
  world.burst(p.x, p.z, 'sparkle', 0.15);
}

// Ortswechsel: Bummelgasse, Tropeninsel (mit dem Boot) und zurück
function travel(where) {
  const me = G.players[G.me];
  interrupt();
  panels.close();
  fade();
  const to = {
    street: [STREET.x, STREET.z + STREET.d - 0.4, Math.PI, '🛍️ Willkommen in der Bummelgasse!', 'door'],
    island: [BUILDINGS.gate.cx, BUILDINGS.gate.z1 + 1.3, 0, '', 'door'],
    tropic: [TROPIC.x, TROPIC.z + 11.6, Math.PI, '🏝️ Willkommen auf der Tropeninsel! Kiki in der Hütte hat Touren für euch.', 'splash'],
    pier: [-9, 22.6, Math.PI, '⛵ Zurück auf eurer Insel.', 'splash'],
  }[where];
  if (!to) return;
  Object.assign(me, { x: to[0], z: to[1], ry: to[2], pose: null });
  world.yawT = world.yaw = 0;
  if (to[3]) setTimeout(() => toast(to[3]), 400);
  play(to[4]);
}

// Weg suchen (A* auf dem Kachelraster), damit man z.B. über die Brücke statt in den Fluss läuft
const freeAt = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25], [0, 0]].some(([a, b]) => S.blocked(G.s, x + a, z + b));
function clearLine(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
  for (let i = 1; i <= n; i++) if (!freeAt(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false;
  return true;
}
function findPath(fx, fz, tx, tz) {
  if (!freeAt(tx, tz)) { // Ziel ist ein Baum/Haus/Wasser: zur freien Nachbarkachel, die am nächsten liegt
    const c = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [Math.round(tx) + a, Math.round(tz) + b]).filter(([x, z]) => freeAt(x, z))
      .sort((a, b) => Math.hypot(a[0] - fx, a[1] - fz) - Math.hypot(b[0] - fx, b[1] - fz))[0];
    if (!c) return null;
    [tx, tz] = c;
  }
  if (clearLine(fx, fz, tx, tz)) return [];
  const N = 2 * MAP + 1, id = (x, z) => (x + MAP) * N + (z + MAP), sx = Math.round(fx), sz = Math.round(fz), ex = Math.round(tx), ez = Math.round(tz);
  const ok = new Map(), okAt = (x, z) => { const k = id(x, z); if (!ok.has(k)) ok.set(k, Math.abs(x) <= MAP && Math.abs(z) <= MAP && freeAt(x, z)); return ok.get(k); };
  const open = [[0, sx, sz]], g = new Map([[id(sx, sz), 0]]), from = new Map();
  let found = false, n = 0;
  while (open.length && n++ < 4000) {
    open.sort((a, b) => a[0] - b[0]);
    const [, x, z] = open.shift();
    if (x === ex && z === ez) { found = true; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (!okAt(nx, nz) || (dx && dz && (!okAt(x + dx, z) || !okAt(x, z + dz)))) continue;
      const c = g.get(id(x, z)) + (dx && dz ? 1.414 : 1), k = id(nx, nz);
      if (c >= (g.get(k) ?? 1e9)) continue;
      g.set(k, c); from.set(k, [x, z]);
      open.push([c + Math.hypot(ex - nx, ez - nz), nx, nz]);
    }
  }
  if (!found) return null;
  const pts = [];
  for (let c = [ex, ez]; c && !(c[0] === sx && c[1] === sz); c = from.get(id(c[0], c[1]))) pts.unshift(c);
  // Ecken glätten: nur Wegpunkte behalten, die man nicht direkt sieht
  const out = [];
  let cx = fx, cz = fz;
  for (let i = 0; i < pts.length; i++) {
    const nxt = pts[i + 1];
    if (nxt && clearLine(cx, cz, nxt[0], nxt[1])) continue;
    out.push(pts[i]); [cx, cz] = pts[i];
  }
  return out;
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
  } else if (g.npc) {
    const n = world.npcM?.get(g.npc);
    if (!n || !n.awake) return (G.goal = null);
    at = { x: n.x, z: n.z };
    range = 1.1;
  } else if (g.player) {
    const o = G.players[g.player];
    if (!o) return (G.goal = null);
    at = { x: o.x, z: o.z };
    range = 0.95;
  } else {
    at = { x: g.x, z: g.z };
    const r = context(me, at);
    g.r = r;
    range = r.hug ? 0.95 : r.a || r.sit ? 1.05 : r.ui || r.go ? 1.6 : r.fish ? 1.2 : 0.15;
    if (r.a?.t === 'place' || r.a?.t === 'till' || r.a?.t === 'water' || r.a?.t === 'plant') range = 1.05;
  }
  if (g.x !== undefined && g.path === undefined && Math.hypot(at.x - me.x, at.z - me.z) > 2) g.path = findPath(me.x, me.z, at.x, at.z) || [];
  while (g.path?.length && Math.hypot(g.path[0][0] - me.x, g.path[0][1] - me.z) < 0.4) g.path.shift();
  if (g.path?.length) { // Zwischenziel
    const [wx, wz] = g.path[0], d = Math.hypot(wx - me.x, wz - me.z);
    if (now - g.last.t > 350) { const stuck = Math.hypot(me.x - g.last.x, me.z - g.last.z) < 0.08; g.last = { x: me.x, z: me.z, t: now }; if (stuck) g.path.shift(); }
    return [(wx - me.x) / d, (wz - me.z) / d];
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
  if (g.npc) { openTalk(g.npc); return; }
  const r = g.player ? context(me, null) : context(me, at);
  if (g.player && r.hug !== g.player) return;
  execute(r, true);
}

// ---------- Gespräche mit Nachbarn ----------
function talkCtx(id) {
  const s = G.s, partner = Object.values(G.players).find(p => p.id !== G.me);
  return { hearts: S.hearts(s, id), season: S.seasonOf(s.day), weather: s.weather, hour: 6 + s.dayTime * 18, player: profile.name, partner: partner?.name || null, day: s.day };
}
function openTalk(id) {
  if (!G?.ready || !NPCS[id]) return;
  interrupt();
  panels.close();
  const me = G.players[G.me], n = world.npcM.get(id);
  if (n) me.ry = Math.atan2(n.x - me.x, n.z - me.z);
  G.talk = { id };
  world.npcTalk = { id, x: me.x, z: me.z };
  send({ t: 'talk', id });
  document.body.classList.add('talking');
  $('dialog').classList.remove('hidden');
  $('dlggifts').classList.add('hidden');
  const N = NPCS[id], h = S.hearts(G.s, id);
  $('dlgname').style.background = N.color;
  $('dlgname').innerHTML = `${N.icon} ${N.name}<small>${'❤️'.repeat(Math.ceil(h / 2)) || '🤍'}</small>`;
  say2(npcLine(id, talkCtx(id)));
  world.npcSay(id, 'happy');
  play('chat');
}
let typeTimer = null, typeFull = '';
const VOWELS = 'aeiouäöüy';
function say2(text) { // Tippen wie in einer Sprechblase, dazu die Plapper-Stimme der Figur
  clearInterval(typeTimer);
  const v = NPCS[G?.talk?.id]?.voice || { pitch: 500 }, el = $('dlgtext'), sp = v.speed || 28;
  // Zeitplan: wann welcher Buchstabe erscheint (Pausen nach Satzzeichen)
  const at = [];
  let t = 0;
  for (let k = 0; k < text.length; k++) {
    at.push(t);
    t += sp;
    if (/[.!?…]/.test(text[k]) && text[k + 1] === ' ') t += sp * 7;
    else if (text[k] === ',' || text[k] === '\n') t += sp * 3;
  }
  const t0 = performance.now();
  let i = 0, lastSyl = 0;
  typeFull = text;
  el.textContent = '';
  el.parentElement.classList.remove('done');
  typeTimer = setInterval(() => {
    const now = performance.now(), el2 = now - t0;
    let vowel = -1;
    while (i < text.length && at[i] <= el2) { if (VOWELS.includes(text[i].toLowerCase())) vowel = i; i++; }
    el.textContent = text.slice(0, i);
    if (vowel >= 0 && now - lastSyl > (v.gap || 70)) {
      lastSyl = now;
      const rest = text.slice(vowel + 1), end = (rest.match(/^[^.!?…]*([.!?…])/) || [])[1] || '';
      speak(text[vowel].toLowerCase(), v, rest.search(/[.!?…]/) < 4 ? end : '');
    }
    if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; el.parentElement.classList.add('done'); }
  }, 16);
}
// Antippen des Textes: sofort ganz anzeigen
$('dlgtext').addEventListener('click', () => {
  if (!typeTimer) return;
  clearInterval(typeTimer);
  typeTimer = null;
  $('dlgtext').textContent = typeFull;
  $('dlgtext').parentElement.classList.add('done');
});
function closeTalk() {
  clearInterval(typeTimer);
  if (G) G.talk = null;
  world.npcTalk = null;
  document.body.classList.remove('talking');
  $('dialog').classList.add('hidden');
}
function giftAnswer(reaction) {
  const id = G.talk.id;
  say2(giftReply(id, reaction, ITEMS[G.talk.gift]?.name || ''));
  world.npcSay(id, { love: 'love', like: 'happy', neutral: 'happy', dislike: 'sad' }[reaction]);
  const n = world.npcM.get(id);
  if (n && reaction !== 'dislike') { world.burst(n.x, n.z, 'heart', 1.4); world.emoteFx(n.x, n.z, reaction === 'love' ? '🥰' : '❤️'); }
  const h = S.hearts(G.s, id);
  $('dlgname').querySelector('small').textContent = '❤️'.repeat(Math.ceil(h / 2)) || '🤍';
}
$('dialog').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || !G?.talk) return;
  const id = G.talk.id;
  if (b.dataset.dlg === 'bye') closeTalk();
  if (b.dataset.dlg === 'talk') { $('dlggifts').classList.add('hidden'); say2(npcLine(id, talkCtx(id))); world.npcSay(id, 'happy'); play('chat'); }
  if (b.dataset.dlg === 'gift') {
    const items = Object.entries(G.s.inv).filter(([k, n]) => n > 0 && ITEMS[k] && !ITEMS[k].seed && (ITEMS[k].sell || ITEMS[k].place));
    $('dlggifts').innerHTML = items.length ? items.map(([k, n]) => `<button data-gift="${k}">${ITEMS[k].icon}<small>${ITEMS[k].name}</small><i>${n}</i></button>`).join('')
      : '<div class="note">Du hast nichts zum Verschenken dabei.</div>';
    $('dlggifts').classList.toggle('hidden');
  }
  if (b.dataset.gift) {
    G.talk.gift = b.dataset.gift;
    send({ t: 'gift', id, item: b.dataset.gift });
    $('dlggifts').classList.add('hidden');
  }
});

// ---------- Angeln ----------
// Angeln wie man es kennt: Köder vor einen Fischschatten werfen – der Fisch schwimmt heran, knabbert ein paarmal,
// dann taucht der Schwimmer richtig ab. Erst DANN ziehen! Zu früh gezogen = Fisch weg. Die Schattengröße verrät den Fisch.
const waterOf = (x, z) => inPond(x, z) ? 'pond' : inRiver(x, z) && !onBridge(x, z) ? 'river' : 'sea';
function startFishing(me) {
  const l = G.s.up.rod;
  let d = 1.8; // Schwimmer landet im Wasser (Fluss ist schmal)
  for (let t = 1.0; t <= 2.4; t += 0.2) if (isWater(me.x + Math.sin(me.ry) * t, me.z + Math.cos(me.ry) * t)) { d = t + 0.35; break; }
  if (!isWater(me.x + Math.sin(me.ry) * d, me.z + Math.cos(me.ry) * d)) d -= 0.35;
  const x = me.x + Math.sin(me.ry) * d, z = me.z + Math.cos(me.ry) * d;
  G.fishing = { phase: 'wait', t: 0, x, z, kind: waterOf(x, z), fish: -1, nibbles: 1 + Math.floor(Math.random() * 3), win: 0.65 + l * 0.15, retry: 0 };
  me.fishing = true;
  animate('fish');
  play('splash');
  world.burst(x, z, 'ripple', -0.2);
}
function stopFishing(caught) {
  const f = G.fishing;
  if (f && f.fish >= 0) world.releaseFish(f.fish, !!caught);
  G.fishing = null;
  G.players[G.me].fishing = false;
}
function reelIn() {
  const f = G.fishing;
  if (f.phase === 'bite') {
    const size = world.fishAt(f.fish)?.size;
    send({ t: 'fish', x: Math.round(f.x), z: Math.round(f.z), size });
    stopFishing(true);
  } else {
    toast(f.phase === 'wait' ? '🎣 Eingeholt.' : '💨 Zu früh gezogen – der Fisch ist weggeschwommen!');
    if (f.phase !== 'wait') play('fail');
    stopFishing(false);
  }
  animate('use');
  world.burst(f.x, f.z, 'water', 0.1);
}
function updateFishing(dt) {
  const f = G.fishing, bar = $('fishbar');
  bar.classList.toggle('hidden', !f);
  if (!f) return;
  f.t += dt;
  bar.classList.toggle('bite', f.phase === 'bite');
  if (f.phase === 'wait') {
    bar.textContent = '🎣 Warte, bis ein Fischschatten herankommt…';
    if ((f.retry -= dt) <= 0) {
      f.retry = 1;
      f.fish = world.hookFish(f.x, f.z, f.kind);
      if (f.fish >= 0) { f.phase = 'approach'; f.t = 0; }
    }
    if (f.t > 12) { stopFishing(); toast('🐟 Hier beißt nichts. Wirf den Köder direkt vor einen Fischschatten!'); }
  } else if (f.phase === 'approach') {
    bar.textContent = '👀 Ein Fisch schwimmt heran … noch nicht ziehen!';
    const fish = world.fishAt(f.fish);
    if (fish?.dist !== undefined && fish.dist < 0.75) { f.phase = 'nibble'; f.t = 0; f.nextNib = 0.6 + Math.random() * 0.8; fish.hook.nib = true; }
    if (f.t > 9) { stopFishing(); toast('🐟 Der Fisch hatte keinen Hunger.'); }
  } else if (f.phase === 'nibble') {
    bar.textContent = '🫧 Er knabbert … warte …';
    if (f.t >= f.nextNib) {
      f.nibbles--; f.t = 0; f.nextNib = 0.7 + Math.random() * 1.1;
      if (f.nibbles < 0) { f.phase = 'bite'; f.t = 0; play('bite'); world.burst(f.x, f.z, 'splash', -0.1); navigator.vibrate?.(120); }
      else { f.nib = 0.25; play('click'); world.burst(f.x, f.z, 'ripple', -0.2); navigator.vibrate?.(25); }
    }
  } else {
    bar.textContent = touch ? '❗ JETZT tippen! ❗' : '❗ JETZT ziehen (E / Klick)! ❗';
    if (f.t > f.win) { stopFishing(false); toast('🐟 Der Fisch ist entwischt…'); play('fail'); }
  }
  f.nib = Math.max(0, (f.nib || 0) - dt);
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
    if (p.kind === 'producer') return o.t >= p.every ? `${p.name}: reif!` : `${p.name}: ${Math.floor(o.t / p.every * 100)}%`;
    return r.sit ? '' : 'Mit ✋ aufheben';
  }
  if (t) return t.w > 0 ? '💧 gegossen' : 'trocken';
  const k = S.key(x, z), res = RES_SPOTS[k];
  if (res === 'tree' || res === 'palm') { const f = ITEMS[TREE_FRUIT[k]]; return S.fruitReady(s, k) ? `${f.icon} ${f.name} hängen dran` : '🌱 Das Obst wächst nach'; }
  if (s.digs.includes(k)) return '✨ Hier ist etwas vergraben – Schaufel!';
  return '';
}

function heldItem() {
  if (G.fishing) return 'rod';
  if (['can', 'net', 'shovel', 'axe'].includes(G.sel)) return G.sel;
  if (ITEMS[G.sel]?.seed) return 'seeds';
  if (PLACE[G.sel]) return 'box';
  return null;
}

// Tour auf der Tropeninsel: Zeit und Fortschritt oben anzeigen, Ende melden
function updateTour() {
  const s = G.s, t = s.tour, bar = $('tourbar');
  const show = !!t && zoneOf(G.players[G.me]) === 'tropic';
  bar.classList.toggle('hidden', !show);
  if (show) {
    const T = TOURS[t.k], left = t.targets.filter(g => !g.got).length, sec = Math.max(0, Math.ceil(t.end - s.time));
    setText('tourbar', `${T.icon} ${T.name}: noch ${left}/${T.n} · ⏱️ ${sec} s`);
    bar.classList.toggle('hurry', sec <= 15);
  }
  const e = s.tourEnd;
  if (G.tourEndSeen === undefined) G.tourEndSeen = e?.t ?? null;
  else if (e && e.t !== G.tourEndSeen) {
    if (!e.ok) { toast(`⏱️ Zeit um! ${TOURS[e.k]?.name || 'Die Tour'} ist vorbei – bei Kiki könnt ihr es nochmal versuchen.`); play('fail'); }
    G.tourEndSeen = e.t;
  }
}

// ---------- Inselkarte (App im Handy) ----------
const MAPR = 27;
let mapImg = null;
const MAP_ICON = { office: '🏛️', gate: '🛍️', boat: '⛵', shop: '🛒', museum: '🖼️', house: '🏡', plaza: '🌳', bench: '🔨', kitchen: '🍳', mail: '📮', board: '📋', bin: '💰' };
function mapBase(W) {
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const g = c.getContext('2d'), st = 2, sc = W / (2 * MAPR);
  for (let py = 0; py < W; py += st) for (let px = 0; px < W; px += st) {
    const x = px / sc - MAPR, z = py / sc - MAPR, cst = coast(x, z), cz = cliffZ(x);
    let col;
    if (onPier(x, z) || onBridge(x, z)) col = '#b98455';
    else if (isSea(x, z)) col = cst < 2 ? '#7fe0dc' : cst < 6 ? '#55c2e0' : '#3a9fd0';
    else if (inRiver(x, z) || inPond(x, z)) col = '#5cc6e6';
    else if (z < cz + 0.25 && z > cz - 0.6) col = '#9b7653';
    else if (z < cz) col = '#5aa44c';
    else if (isBeach(x, z) || cst > -1) col = '#f2dfa6';
    else col = '#7cc85a';
    g.fillStyle = col;
    g.fillRect(px, py, st, st);
  }
  g.fillStyle = '#e9d29e';
  for (const [x, z, w, d] of PATHS) g.fillRect((x - w / 2 + MAPR) * sc, (z - d / 2 + MAPR) * sc, w * sc, d * sc);
  g.beginPath(); g.arc((PLAZA.x + MAPR) * sc, (PLAZA.z + MAPR) * sc, PLAZA.r * sc, 0, 7); g.fill();
  return c;
}
function drawMap() {
  const cv = $('mapcv');
  if (!cv || !G?.s) return;
  const g = cv.getContext('2d'), W = cv.width, sc = W / (2 * MAPR), X = v => (v + MAPR) * sc, s = G.s;
  mapImg ||= mapBase(W);
  g.drawImage(mapImg, 0, 0);
  for (const [k, t] of Object.entries(s.paths || {})) { const [x, z] = k.split(',').map(Number); g.fillStyle = PAVE[t]?.col || '#ccc'; g.fillRect(X(x - 0.5), X(z - 0.5), sc, sc); }
  for (const [k, kind] of Object.entries(RES_SPOTS)) {
    const [x, z] = k.split(',').map(Number);
    g.fillStyle = kind === 'rock' ? '#9a958e' : kind === 'palm' ? '#3f9a46' : '#2f8a3e';
    g.beginPath(); g.arc(X(x), X(z), kind === 'rock' ? sc * 0.4 : sc * 0.6, 0, 7); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [id, B] of Object.entries(BUILDINGS)) {
    const w = (B.x1 - B.x0 + 1) * sc, d = (B.z1 - B.z0 + 1) * sc, ic = MAP_ICON[id] || NPCS[B.npc]?.icon || '🏠';
    g.fillStyle = id === 'plaza' ? 'rgba(0,0,0,0)' : 'rgba(255,253,249,.85)';
    g.beginPath(); g.roundRect(X(B.x0 - 0.5), X(B.z0 - 0.5), w, d, 4); g.fill();
    g.font = `${Math.max(12, Math.min(w, d) * 0.8)}px sans-serif`;
    g.fillText(ic, X(B.cx), X(B.cz) + 1);
  }
  g.font = `${sc * 1.6}px sans-serif`;
  for (const [id, e] of world.npcM || []) if (e.awake) g.fillText(NPCS[id].icon, X(e.x), X(e.z));
  const t = performance.now() / 300;
  for (const p of Object.values(G.players)) {
    if (zoneOf(p) !== 'island') continue;
    const me = p.id === G.me, r = sc * (me ? 0.9 + Math.sin(t) * 0.15 : 0.8);
    g.fillStyle = me ? '#ff5d7a' : '#9b6bff'; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(X(p.x), X(p.z), r, 0, 7); g.fill(); g.stroke();
    g.font = `600 ${Math.round(sc * 1.15)}px Fredoka, sans-serif`; g.fillStyle = '#5a4636';
    g.fillText(p.name, X(p.x), X(p.z) - r - sc * 0.9);
  }
  if (s.balloon) { const b = S.balloonPos(s.balloon, s.time); g.font = `${sc * 2.2}px sans-serif`; g.fillText('🎈', X(b.x), X(b.z)); }
  if (G.goal && G.goal.x !== undefined) { g.strokeStyle = '#ff5d7a'; g.lineWidth = 3; g.beginPath(); g.arc(X(G.goal.x), X(G.goal.z), sc * 0.8, 0, 7); g.stroke(); }
}
$('pbody').addEventListener('click', e => {
  if (e.target.id !== 'mapcv') return;
  const r = e.target.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 * MAPR - MAPR, z = (e.clientY - r.top) / r.height * 2 * MAPR - MAPR;
  const me = G.players[G.me];
  if (!walkable(x, z) || S.blocked(G.s, x, z)) { toast('🌊 Da kommst du nicht hin.'); play('fail'); return; }
  if (S.inside(me)) { toast('🚪 Geh erst nach draußen.'); return; }
  if (zoneOf(me) !== 'island') { toast('🗺️ Die Karte zeigt eure Insel – du bist gerade woanders.'); return; }
  panels.close();
  G.goal = { x, z, last: { x: me.x, z: me.z, t: performance.now() } };
  world.burst(x, z, 'sparkle', 0.15);
  toast('🗺️ Unterwegs!');
});

// ---------- Bild für Bild ----------
const hud = {};
function setText(id, v) { if (hud[id] !== v) { hud[id] = v; $(id).textContent = v; } }

function gameFrame(dt, now) {
  const s = G.s, me = G.players[G.me];
  if (!s || !me) return;
  if (G.role === 'host') simulate(now); else S.tick(s, dt, false);

  // Kamera mit Z / C drehen (gedrückt halten)
  const spin = (keys.has('c') ? 1 : 0) - (keys.has('z') ? 1 : 0);
  if (spin && !editor.isOpen && !G.talk) { world.rotate(spin * dt * 2.2 * settings.camSpeed * (settings.invert ? -1 : 1)); world.yaw = world.yawT; }
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
  } else if (G.goal && busy()) {
    G.goal.last = { x: me.x, z: me.z, t: now };
  } else if (G.goal) {
    const d = followGoal(me, now);
    if (d) { [wx, wz] = d; len = 1; }
  }
  me.m = len > 0.2;
  if (me.m && G.skyView) toggleSky(false);
  if (me.m) {
    if (me.pose) standUp(me);
    const swim = (s.inv.neopren || 0) > 0 && !S.inside(me);
    me.run = !me.sw && (keys.has('shift') || Math.hypot(joy.x, joy.y) > 0.92);
    const sp = SPEED[s.up.boots] * dt * (me.sw ? 0.65 : me.run ? 1.6 : 1);
    const free = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]].some(([a, b]) => S.blocked(s, x + a, z + b, swim));
    const stuck = !free(me.x, me.z);
    if (stuck || free(me.x + wx * sp, me.z)) me.x += wx * sp;
    if (stuck || free(me.x, me.z + wz * sp)) me.z += wz * sp;
    me.ry = Math.atan2(wx, wz);
    if (G.fishing) stopFishing();
    if (S.inside(me) && me.z > S.roomSize(s)[1] / 2 + 0.25) execute({ exit: true }, true); // durch die Tür hinaus
    if (zoneOf(me) === 'street' && me.z - STREET.z > STREET.d + 0.5) travel('island'); // durchs Tor zurück
  } else me.run = false;
  const wasSw = me.sw;
  me.sw = !S.inside(me) && S.swimmable(me.x, me.z) && me.pose !== 'sit';
  if (me.sw && !wasSw) { world.burst(me.x, me.z, 'splash', -0.2); play('splash'); if (!G.swimTip) { G.swimTip = 1; toast('🤿 Du schwimmst! Bei Luftblasen 🫧 Aktion drücken zum Tauchen.'); } }
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
  updateTour();

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
    bobber: G.fishing && { x: G.fishing.x, z: G.fishing.z, bite: G.fishing.phase === 'bite', nib: G.fishing.nib > 0 },
    preview: editor.isOpen ? previewCam(me.x, me.z) : null, sky: G.skyView,
  });
  if (panels.open === 'map') drawMap();
  if (s.balloon && G.balloonSeen !== s.balloon.id) { G.balloonSeen = s.balloon.id; toast('🎈 Ein Geschenkballon schwebt über die Insel! Schnapp dir die Schleuder.'); play('chat'); }
  ambience({ day: info.day, night: info.night, rain: s.weather === 'rain', walking: me.m });
  musicTick(6 + s.dayTime * 18, s.weather === 'rain');
  // Nachbarn sagen ab und zu etwas, wenn man in der Nähe ist
  if (now > (G.nextChatter || 0) && !G.talk) {
    G.nextChatter = now + 14000 + Math.random() * 12000;
    const near = [...(world.npcM || [])].filter(([, e]) => e.awake && Math.hypot(e.x - me.x, e.z - me.z) < 7);
    if (near.length) { const [id] = near[Math.floor(Math.random() * near.length)]; world.npcBubble(id, npcLine(id, talkCtx(id))); }
  }

  // HUD
  const hour = 6 + s.dayTime * 18, hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10;
  const sky = s.weather === 'rain' ? '🌧️' : s.weather === 'snow' ? '🌨️' : hour >= 20 ? '🌙' : hour >= 18 ? '🌇' : '☀️';
  const [seaName, seaIcon] = SEASONS[S.seasonOf(s.day)];
  setText('money', s.money.toLocaleString('de-DE'));
  const real = s.real ? new Date() : null;
  setText('ctime', real ? `${real.getHours()}:${String(real.getMinutes()).padStart(2, '0')}` : `${hh}:${String(mm).padStart(2, '0')}`);
  setText('clock', `${sky} ${WEEKDAYS[weekday(s.day)]} · ${seaIcon} ${seaName}`);
  // Abendmeldungen: Sternschnuppen-Nacht
  if (s.starNight && hour >= 19 && G.starToast !== s.day) { G.starToast = s.day; toast('🌠 Heute Nacht fallen Sternschnuppen! Tippe auf 🔭 (PC: K) und schau in den Himmel.', true); }
  setText('lvl', String(s.level));
  const pct = Math.min(100, s.xp / (40 * s.level * s.level) * 100) + '%';
  if (hud.pct !== pct) { hud.pct = pct; document.querySelector('#lvlbar i').style.width = pct; }
  const ready = s.orders.filter(o => (s.inv[o.item] || 0) >= o.n).length + (s.quest.done ? 1 : 0) + s.daily.filter(d => d.done && !d.claimed).length;
  // Quest-Anzeige: aktuelles Kapitel der Insel-Geschichte
  const q = STORY[s.quest.i];
  const qt = !q ? '' : s.quest.done ? `🎁 ${q.title}: Belohnung abholen!` : `📜 ${q.title} · ${Math.min(s.quest.p, q.n)}/${q.n}`;
  setText('questpill', qt);
  $('questpill').classList.toggle('hidden', !qt || !!G.photo);
  $('questpill').classList.toggle('ready', !!s.quest.done);
  setText('orderdot', ready ? String(ready) : '');
  $('orderdot').classList.toggle('hidden', !ready);
  const np = Object.keys(G.players).length;
  setText('pcount', String(np));
  const inv = G.role === 'host' && G.code && np === 1;
  $('invite').classList.toggle('hidden', !inv);
  if (inv) setText('invcode', G.code);

  const items = hotbarItems(s);
  if (!items.includes(G.sel)) G.sel = 'hand';
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
  if (settings.fps && now - last < 1000 / settings.fps - 2) return; // Bilder pro Sekunde begrenzen
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
    if (!profile.name) { toast('🏝️ Willkommen auf der Kuschelinsel! Erstelle zuerst deine Figur.', true); openEditor(); }
  }
}

// Hübsche Beispiel-Insel für den Menü-Hintergrund
function demoFarm() {
  const s = S.newFarm('Demo');
  s.dayTime = 0.3;
  s.up.house = 2;
  for (const [x, z, k] of [[2, 4, 'laterne'], [-5, 5, 'laterne'], [3, -1, 'bank'], [-3, 6, 'blumen'], [3, 6, 'blumen'], [-6, 4, 'apfelbaum'], [6, 3, 'kirschbaum'], [-1, 8, 'herz'], [-12, -6, 'zwerg']]) {
    if (S.canPlace(s, x, z)) s.obj[S.key(x, z)] = { k, r: 0, t: 1e9 };
  }
  return s;
}

showMenu(joinParam ? 'join' : 'title');
requestAnimationFrame(frame);
window.__game = { get G() { return G; }, world, S, profile, settings, openTalk }; // für Tests & Fehlersuche
