// Spielablauf: Menü, Steuerung, Host/Gast-Logik, Speichern.
import { World, esc, cropInfo } from './world.js';
import * as S from './state.js';
import { SPAWN, SPEED, EMOTES, ITEMS, CROPS, ANIMALS, PLACE, BUILDINGS, MAP, ACHIEVEMENTS, SEASONS, SOCIAL, STORY, RES_SPOTS, TREE_FRUIT, PAVE, WEEKDAYS, weekday, FOSSILS, FESTS, CONTEST_SECS } from './data.js';
const FOSSIL_IDS = FOSSILS.map(f => f[0]);
import * as net from './net.js';
import { audio, unlock, play, setMusic, setVolumes, ambience, speak, musicTick, pianoNote } from './audio.js';
import { Panels, hotbarItems, slotHtml } from './ui.js';
import { fillIcons, itemIcon, loadIconFiles } from './icons.js';
import { Editor, settingsHtml, setOwnedHats, PRESETS, SETTING_DEFAULTS } from './menu.js';
import { cleanLook, randomLook } from './avatar.js';
import { NPCS, npcLine, giftReply, festLine } from './npc.js';
import { isWater, isSea, isBeach, walkable, coast, cliffZ, inRiver, onBridge, inPond, onPier, PATHS, PLAZA } from './island.js';
import { zoneOf, clampPos, STREET, TROPIC, TOURS, BOAT_PRICE, shopOpen, concertNow } from './newleaf.js';
import { loadAssets, loadTextures } from './assets.js';
import { FLOORS, WALLS, FURNITURE } from './furni-data.js';
import * as backup from './backup.js';
import * as cloud from './cloud.js';
import * as SW from './serverwelt.js';
import * as photos from './photos.js';
import * as XS from './extras.js';
import * as PAT from './patterns.js';
import { TRIP, TRIP_PRICE } from './trips.js';
import { REEF, REEF_BUOY, cableBuilt, cableStop, taleState, beachOpen, beachKind } from './extras2.js';
import { initFun2, uiW, travelW, contextW, executeW, updateW, iceMove, gameOn, setSled } from './client/fun2.js';
import { APP_PANELS_W } from './ui-extra.js';
import { initFun3, uiV, travelV, exitV, contextV, executeV, updateV, trainContext, endTrain } from './client/fun3.js';
import { APP_PANELS_V } from './ui-extra2.js';
import { initFun4, uiE, travel6, contextE, executeE, updateE, busy6 } from './client/fun4.js';
import { APP_PANELS_6 } from './ui-extra3.js';
import { initFun5, uiF, travel7, context7, execute7, updateF, busy7 } from './client/fun5.js';
import { initFun6, uiG, travel8, context8, execute8, updateG, busy8 } from './client/fun6.js';
import { initFun7, execute9, update9, usable9 } from './client/fun7.js';
import { initFun8, execute10, update10, usable10 } from './client/fun8.js';
import { initFun9, uiH, update11 } from './client/fun9.js';
import { loveSocial } from './extras10.js';
import { nhomeState, doorNote, nhomeNews } from './extras12.js';
import { duelName } from './extras8.js';
import { APP_PANELS_7 } from './ui-extra4.js';
import { APP_PANELS_8 } from './ui-extra5.js';
import { initPad, pollPad } from './client/pad.js';
import * as E6 from './extras6.js';
import * as V from './extras5.js';
import { initFun, autoQuality, startRide, updateRide, photoEntry, drawStars, setBike, startKite, kitePull, updateKite, endKite } from './client/fun.js';
import { DEPTH, DEPTH_LV, DEPTH_UP, DEPTH_DOOR, DEPTH_STAIRS, ECHO_NOTES } from './extras3.js';
import { WRECK, WRECK_BUOY, RIDE_SECS, ridePos, skyGiftTimes, wishNow, BRIGHT, STAR_SECTORS, PHOTO_THEMES, photoTheme } from './extras3.js';

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
const profile = { uid: /^[a-z0-9]{8,16}$/.test(oldProfile?.uid || '') ? oldProfile.uid : Math.random().toString(36).slice(2, 12).padEnd(10, '0'), name: String(oldProfile?.name || '').slice(0, 16), look: oldProfile ? cleanLook(oldProfile.look || oldProfile) : randomLook(), owned: Array.isArray(oldProfile?.owned) ? oldProfile.owned.filter(x => typeof x === 'string') : [] };
const saveProfile = () => store.set('kh.profile', profile);
if (oldProfile && oldProfile.uid !== profile.uid) saveProfile(); // feste Spieler-ID einmal merken

const weakDevice = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3; // schwächere Handys starten mit „Niedrig“
const settings = { quality: weakDevice ? 'low' : touch ? 'mid' : 'high', sound: 0.8, music: 0.5, landscape: false, names: true, fullscreen: touch, ...store.get('kh.settings', {}) };
if (typeof settings.sound !== 'number') settings.sound = settings.sound === false ? 0 : 0.8;
if (typeof settings.music !== 'number') settings.music = settings.music === false ? 0 : 0.5;
if (!PRESETS[settings.quality]) settings.quality = 'mid';
for (const [k, v] of Object.entries({ ...PRESETS[settings.quality], ...SETTING_DEFAULTS })) if (settings[k] === undefined) settings[k] = v;
audio.sound = settings.sound;
audio.music = settings.music;
audio.weather = typeof settings.weather === 'number' ? settings.weather : 1;

// Blender-Modelle laden (der Ladebildschirm zeigt den Fortschritt)
// Modell-Pakete: Liste in assets/models/packs.json (dort neue Pakete eintragen, z. B. "custom"), sonst die eingebauten
const PACKS = await fetch('assets/models/packs.json').then(r => (r.ok ? r.json() : null)).catch(() => null) || ['buildings', 'nature', 'crops', 'place', 'furniture', 'characters', 'sky', 'extras'];
await Promise.all([loadIconFiles(), loadAssets(PACKS, f => { const el = document.querySelector('#loading div'); if (el) el.innerHTML = `<span>🏝️</span><br>Kuschelinsel lädt… ${Math.round(f * 100)}%`; })]);
await loadTextures(['grass', 'path', 'cobble', 'glint', ...FLOORS.map(f => 'floor_' + f[0]), ...WALLS.map(w => 'wall_' + w[0])]);
const world = new World($('c'), $('labels'), settings.quality);
// Kleine Spiele & Ausflüge (client/fun.js) bekommen Zugriff auf das, was hier lebt – als Getter, weil G wechselt
initFun({
  get G() { return G; }, world, $, profile, settings, store, touch, photos, get panels() { return panels; },
  send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), setText: (id, v) => setText(id, v), bump: (id, c) => bump(id, c),
  applyView: () => applyView(), freeAt: (x, z) => freeAt(x, z), interrupt: () => interrupt(), isleKey: () => isleKey(),
});
initFun2({ get G() { return G; }, world, profile, get panels() { return panels; }, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), travel: w => travel(w), freeAt: (x, z) => freeAt(x, z), interrupt: () => interrupt(), setBike: (on, q) => setBike(on, q) });
initFun3({ get G() { return G; }, world, profile, get panels() { return panels; }, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), travel: w => travel(w), freeAt: (x, z) => freeAt(x, z), interrupt: () => interrupt(), setBike: (on, q) => setBike(on, q), emote: e => sendEmote(e), listPhotos: () => photos.list(isleKey(), 'photo') });
initFun4({ get G() { return G; }, world, profile, touch, get panels() { return panels; }, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), travel: w => travel(w), freeAt: (x, z) => freeAt(x, z), interrupt: () => interrupt(), setBike: (on, q) => setBike(on, q) });
initFun6({ get G() { return G; }, world, profile, get panels() { return panels; }, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), travel: w => travel(w), interrupt: () => interrupt(), fade: () => fade() });
initFun7({ get G() { return G; }, world, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n) });
initFun8({ get G() { return G; }, world, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), openEditor: tab => openEditor(tab) });
initFun9({ get G() { return G; }, world, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), interrupt: () => interrupt() });
initFun5({ get G() { return G; }, world, touch, get panels() { return panels; }, send: a => send(a), toast: (t, k) => toast(t, k), play: n => play(n), travel: w => travel(w), interrupt: () => interrupt(), listPhotos: async () => [...await photos.list(isleKey(), 'photo'), ...await photos.list(isleKey(), 'moment')] });
// Alle Grafik-, Kamera- und Anzeige-Einstellungen anwenden
function applyView() {
  world.setQuality({ scale: settings.scale, shadows: settings.shadows, bloom: settings.bloom, grass: settings.grass, lights: settings.lights, view: settings.view });
  world.camSmooth = settings.camSmooth;
  world.baseEl = settings.camAngle;
  world.animations = settings.anim;
  document.body.classList.toggle('calm', !settings.anim);
  document.documentElement.style.setProperty('--ui', settings.uiScale);
  document.documentElement.style.setProperty('--txt', settings.textScale || 1); // Barrierefreiheit
  world.cbMode = !!settings.cbMode;
  document.body.classList.toggle('cb', !!settings.cbMode);
  document.body.classList.toggle('hc', !!settings.contrast);
  document.body.classList.toggle('lefty', !!settings.lefty);
  // Fenster: Hintergrund (klar / weiß / Papier), Abdunkeln & Weichzeichnen der Spielwelt dahinter
  for (const k of ['klar', 'weiss', 'papier']) document.body.classList.toggle('pbg-' + k, (settings.panelBg || 'klar') === k);
  document.documentElement.style.setProperty('--dim', settings.panelDim ?? 0.45);
  document.body.classList.toggle('noblur', settings.panelBlur === false);
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
const ANIM_OF = { mieze10: 'pet', dinner11: 'use', water: 'can', plant: 'plant', harvest: 'use', place: 'use', pickup: 'use', pick: 'plant', use: 'shake', chop: 'hoe', mine: 'hoe', dig: 'hoe', shake: 'shake', tpick: 'shake', hit: 'plant' };

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
// Fester Schlüssel für die eigene Tasche (bleibt gleich, auch wenn man später wiederkommt)
const keyOf = (id, p) => id === 'h' ? 'host' : /^[a-z0-9]{8,16}$/.test(p?.uid || '') ? 'u_' + (G?.server && G.role === 'host' ? SW.whoKey(G.s, p.name, p.uid) : p.uid) : 'n_' + (String(p?.name || 'gast').replace(/\s/g, '').slice(0, 16) || 'gast');
const newPlayer = (id, p) => ({ id, key: keyOf(id, p), ...cleanProfile(p), x: SPAWN.x + (Math.random() - 0.5) * 2, z: SPAWN.z + Math.random(), ry: 0, m: false, ak: null, an: 0, held: null, pose: null, fishing: false, run: false, sw: false });
const myBag = s => 'u_' + (G?.server ? SW.guestUid(s, profile.name, profile.uid) : profile.uid);
const session = (role, s, me) => ({ role, s, me, players: {}, social: {}, sel: 'hand', settings, touch, code: null, lastSeen: {}, lastSave: 0, lastState: 0, get myName() { return profile.name; } });

// Gast-Kopien liegen unter eigenem Schlüssel, damit sie nie die eigene Farm überschreiben.
function saveFarm(force) {
  if (!G?.s || !G.key) return;
  G.lastSave = performance.now();
  const f = store.get('ki.islands', {}), now = Date.now();
  if (G.server) { // Serverwelt: Spiegel auf dem Gerät; "pushed" = bis wann der Server alles hat
    const host = G.role === 'host';
    f[G.key] = { name: G.s.name, saved: now, s: G.s, server: true, pushed: host ? f[G.key]?.pushed || 0 : now };
  } else f[G.key] = { name: G.s.name, saved: now, s: G.s, guest: G.role === 'guest' ? G.players.h?.name || '?' : G.copyOf };
  store.set('ki.islands', f);
  backup.snapshot(G.key, f[G.key]); // automatischer Zwischenstand (höchstens alle 5 Minuten)
  if (G.server) serverSave(f[G.key], force); else cloudSave(f[G.key], force);
}
// Cloud-Spielstand: höchstens jede Minute hochladen, beim Verlassen/Wegschalten sofort
let lastCloud = 0;
function cloudSave(f, force) {
  if (!cloud.cloudKey() || !f || G?.role === 'guest') return;
  const now = Date.now();
  if (!force && now - lastCloud < 60000) return;
  lastCloud = now;
  cloud.push(G.key, f);
}
// Serverwelt: wer die Insel offen hat, speichert laufend auf dem Server – aber nur, solange die Leitung
// nachweislich steht (sonst könnte ein aufwachendes Handy einen älteren Stand über den neueren schreiben)
let lastSrv = 0;
function serverSave(f, force) {
  const g = G;
  if (g.role !== 'host' || !g.net || g.ended) return;
  const now = Date.now();
  if (!force && now - lastSrv < SW.SAVE_EVERY) return;
  if (!g.net.alive) { g.net.check?.(); return; }
  lastSrv = now;
  const done = r => {
    if (r !== 'ok') return;
    const all = store.get('ki.islands', {}), m = all[SW.LOCAL];
    if (m && !(m.pushed >= f.saved)) { m.pushed = f.saved; store.set('ki.islands', all); }
  };
  SW.push(g.server, f, { keepalive: force }).then(r => {
    // Jemand anderes hat dazwischengeschrieben, obwohl wir die Insel offen haben (z. B. ein Handy, das spät aufwacht): unser Stand gilt
    if (r === 'conflict' && G === g && g.net?.alive) return SW.push(g.server, f, { force: true }).then(done);
    done(r);
  });
}
// Serverwelt: Wer die Insel offen hat und die App wegschaltet (Handy in die Tasche), gibt sie sofort frei –
// sonst hielte ein schlafendes Handy die Insel fest und der andere käme nicht rein. Beim Zurückkommen geht es nahtlos weiter.
let srvPaused = null;
function pauseServer() {
  const g = G, me = g.players[g.me];
  srvPaused = { keep: me ? { x: me.x, z: me.z, ry: me.ry } : {} };
  g.ended = true;
  g.net?.broadcast({ t: 'bye', s: pack(g.s) }); // letzter Stand direkt mit – wer übernimmt, braucht nicht auf den Server zu warten
  g.net?.close();
  G = null;
  srvRun++;
  clearInterval(enterGame.timer);
  $('hud').classList.add('hidden');
  cover('🌍 Kurze Pause – gleich geht es weiter…');
}
backup.keepData();
addEventListener('pagehide', () => saveFarm(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveFarm(true); if (G?.server && G.role === 'host' && G.ready && !G.ended) pauseServer(); }
  else if (srvPaused && !G) { const o = srvPaused; srvPaused = null; startServer({ ...o, keep: o.keep || {}, text: '🌍 Zurück auf eurer Serverwelt…' }); }
  else if (G?.ready) wakeLock();
});
function wakeLock() { navigator.wakeLock?.request('screen').then(l => { if (G) G.wake = l; }).catch(() => {}); }

// ---------- Host ----------
async function startHost(s, key = s.id, copyOf) {
  unlock();
  const g = G = session('host', S.migrate(s), 'h');
  S.claimHost(g.s, profile.uid);
  S.bindInv(g.s, 'host');
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

// ---------- 🌍 Serverwelt ----------
// Erst schauen, ob schon jemand drin ist (dann einfach dazu), sonst die Insel vom Server holen und selbst öffnen.
// o.keep: eigene Position (beim Wechsel mitten im Spiel), o.carry: eigener aktueller Stand (Übernahme als Gast)
let srvRun = 0;
async function startServer(o = {}) {
  const c = SW.cfg();
  if (!c || (!o.keep && needName())) return;
  if (document.hidden) { srvPaused = { keep: o.keep, carry: o.carry }; G = null; return; } // App im Hintergrund: weiter, sobald sie wieder vorne ist
  const run = ++srvRun;
  unlock();
  const code = SW.codeOf(c.key);
  $('hud').classList.add('hidden');
  cover(o.text || '🌍 Verbinde mit eurer Serverwelt…');
  let err = null;
  for (let i = 0; i < 6 && run === srvRun; i++) {
    if (i) await sleep(700 + Math.random() * 1100);
    if (run !== srvRun) return;
    if (!(o.carry && i === 0)) { // bei der Übernahme ist gerade niemand da – sonst zuerst dazukommen
      const g = session('guest', null, null);
      Object.assign(g, { joinCode: code, server: c, keepMe: o.keep || null });
      G = g;
      try { await connectGuest(g); if (G === g) return; } catch (e) {
        if (G === g) G = null;
        if (run !== srvRun) return;
        err = e;
        if (e?.type === 'network') break;
        if (e?.type !== 'peer-unavailable') continue;
      }
    }
    // Niemand da: die Insel selbst öffnen. Genommen wird der weiteste Stand: Server, eigene Kopie (Übernahme)
    // oder der Spiegel hier, falls dessen letzter Stand den Server nicht mehr erreicht hat.
    let remote;
    try { remote = await SW.pull(c); } catch (e) { err = { type: 'network', message: e.message }; break; }
    if (run !== srvRun) return;
    const m = store.get('ki.islands', {})[SW.LOCAL], pending = m?.server && cloud.valid(m) && m.saved > (m.pushed || 0) ? m : null;
    let pick = remote;
    for (const x of [o.carry, pending]) if (x && cloud.valid(x) && SW.ahead(x, pick)) pick = x;
    if (!pick) { err = { type: 'empty' }; break; }
    try { if (await hostServer(c, code, pick, o.keep, run)) return; } catch (e) { err = e; if (e?.type === 'network') break; }
  }
  if (run !== srvRun) return;
  G = null;
  leave();
  toast('⚠️ ' + (err?.type === 'empty' ? 'Auf dem Server liegt noch keine Insel.' : err?.type === 'network' ? 'Keine Verbindung zur Serverwelt – bist du online?' : 'Die Serverwelt antwortet gerade nicht. Versuch es gleich nochmal.'), true);
}

async function hostServer(c, code, src, keep, run) {
  const g = session('host', S.migrate(structuredClone(src.s)), 'h');
  Object.assign(g, { server: c, key: SW.LOCAL, code });
  let n;
  try {
    n = await cloud.relayHost(code, { onData: (id, d) => G === g && hostData(id, d), onLeave: id => G === g && hostLeave(id) },
      { ping: 8000, onDisplaced: () => G === g && displaced(g) });
  } catch (e) { if (e?.type === 'unavailable-id') return false; throw e; } // jemand war schneller: dann dorthin
  if (run !== srvRun) { n.close(); return true; }
  G = g;
  g.net = n;
  SW.claim(g.s, SW.whoKey(g.s, profile.name, profile.uid)); // eigene Tasche (auch von einem anderen Gerät)
  S.bindInv(g.s, 'host');
  g.s.code = code;
  SW.remember(g.s);
  g.players.h = newPlayer('h', profile);
  if (keep) Object.assign(g.players.h, keep);
  enterGame();
  lastSrv = 0;
  saveFarm(true); // sofort auf den Server
  return true;
}

// Wir hatten die Insel offen, waren aber kurz weg – inzwischen hat der andere sie geöffnet: einfach dazukommen.
// Was hier seitdem passiert ist, bleibt als Zwischenstand erhalten (⏪ unter „Meine Inseln“).
function displaced(g) {
  if (G !== g || g.ended) return;
  g.ended = true;
  const me = g.players[g.me], keep = me && { x: me.x, z: me.z, ry: me.ry };
  backup.snapshot(SW.LOCAL, { name: g.s.name, s: g.s }, true);
  G = null;
  startServer({ keep, text: '🔁 Dein Lieblingsmensch hat die Insel gerade geöffnet – du kommst dazu…' });
}

// Wer die Insel offen hatte, ist gegangen: wir übernehmen sie mit unserem aktuellen Stand.
async function takeOver(g) {
  if (G !== g || g.ended) return;
  g.ended = true;
  try { g.conn?.close(); } catch { /* */ }
  const me = g.players[g.me], keep = me && { x: me.x, z: me.z, ry: me.ry };
  const carry = g.sRaw && cloud.valid({ s: g.sRaw }) ? { name: g.sRaw.name, s: structuredClone(g.sRaw) } : null;
  if (carry) saveFarm();
  G = null;
  $('hud').classList.add('hidden');
  cover('🌍 Du übernimmst die Insel…');
  await sleep(1000 + Math.random() * 900);
  startServer({ keep, carry, text: '🌍 Du übernimmst die Insel…' });
}

function hostData(id, d) {
  if (!G || G.role !== 'host' || id === 'h' || !d || typeof d !== 'object') return;
  G.lastSeen[id] = performance.now();
  const p = G.players[id];
  if (d.t === 'join') {
    G.players[id] = newPlayer(id, d.profile);
    const fr = (G.s.friends ||= []);
    if (!fr.includes(G.players[id].name)) { fr.push(G.players[id].name); if (fr.length > 8) fr.shift(); }
    G.net.send(id, { t: 'welcome', id, s: pack(G.s), players: G.players, code: G.code });
    say(`💕 ${G.players[id].name} ist da!`, 'join');
    setTimeout(() => { playMelody(); G?.net?.broadcast({ t: 'mel' }, id); }, 1200);
    const nm = G.players[id].name, mo = {};
    if (XS.moment(G.s, 'visit:' + nm, '💞', `${nm} kommt zu Besuch`, 'Zum ersten Mal zusammen auf der Insel!', mo)) { G.dirty = true; G.net.broadcast({ t: 'moment', m: mo.moment }); onMoment(mo.moment); }
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
    p.bk = d.bk === true; // Fahrrad
    p.sl = d.sl === true; // Schlitten
    p.po = d.po === true; // Pony
    p.tn = d.tn === true; // Bimmelbahn
    p.fh = Number.isFinite(d.fh) ? Math.max(0, Math.min(8, d.fh)) : 0; // Riesenrad & Karussell
    p.td = d.td === true; p.tp = d.tp === true; // Tandem: vorne / hinten
    p.rf = d.rf === true; // Floß im Seerosenmoor
    p.sf = d.sf === true; // Surfbrett
    p.kh = Number.isFinite(d.kh) ? Math.max(0, Math.min(120, d.kh)) : 0; // Drachen-Höhe
    p.rh = Number.isFinite(d.rh) ? Math.max(0, Math.min(12, d.rh)) : 0; // Ballonfahrt
  }
  if (d.t === 'look') Object.assign(p, cleanProfile(d));
  if (d.t === 'act') handleAct(id, d.a);
  if (d.t === 'chat') chat(id, d.text);
  if (d.t === 'riddle') riddle(id, d);
  if (d.t === 'emote') emote(id, d.e);
  if (d.t === 'hug' && typeof d.id === 'string') social(id, d.id, 'hug');
  if (d.t === 'soc' && typeof d.id === 'string' && Object.hasOwn(SOCIAL, d.k)) social(id, d.id, d.k);
  if (d.t === 'note' && Number.isInteger(d.m) && d.m >= 36 && d.m <= 96) { hearNote(id, d.m); G.net.broadcast({ t: 'note', m: d.m, id }, id); }
  if (d.t === 'card' && typeof d.url === 'string' && d.url.length < 400000 && d.url.startsWith('data:image/jpeg')) { // Postkarte weiterreichen
    const card = { t: 'card', url: d.url, from: p.name };
    if (d.to === G.me) onCard(card); else if (G.players[d.to]) G.net.send(d.to, card);
  }
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
  if (a?.t === 'dinner11') { // Dinner zu zweit: der Gastgeber schaut, wer am Tisch steht
    const pl = G.players[id];
    a = { ...a, names: pl ? [pl.name, ...Object.values(G.players).filter(p => p !== pl && Math.hypot(p.x - pl.x, p.z - pl.z) < 3.2).map(p => p.name)] : [] };
  }
  if (a?.t === 'give') { // Empfänger muss gerade da sein
    const to = G.players[a.to];
    if (!to || a.to === id) return;
    a = { ...a, to: to.key };
  }
  const who = G.players[id]?.key || 'host';
  const out = S.act(G.s, a && ['fish', 'bug', 'contest', 'letter', 'diary', 'riddle', 'cookin', 'stalladd', 'stallswap', 'fwstart', 'castle', 'kitescore', 'game', 'photoentry', 'sternbild', 'wed', 'surf'].includes(a.t) ? { ...a, by: id, name: G.players[id]?.name } : a, who);
  S.bindInv(G.s, 'host');
  if (duelName(G.s, who, G.players[id]?.name)) G.dirty = true; // Duell der Woche: Namen merken
  if (out.gave) { // dem Empfänger Bescheid sagen
    const rid = Object.keys(G.players).find(k => G.players[k].key === out.gave.to), it = ITEMS[out.gave.item];
    const text = `🎁 ${G.players[id]?.name} hat dir ${out.gave.n}× ${it.icon} ${it.name} geschenkt!`;
    if (rid === G.me) { toast(text); play('love'); } else if (rid) G.net?.send(rid, { t: 'toast', text, snd: 'love' });
  }
  if (out.ok) { G.dirty = true; G.lastState = 0; }
  if (out.fx.length) { G.net?.broadcast({ t: 'fx', fx: out.fx }); showFx(out.fx); }
  const res = { t: 'res', ok: out.ok, msg: out.msg, snd: out.snd, caught: out.caught, newAlbum: out.newAlbum, reaction: out.reaction, learned: out.learned, got: out.got, contest: out.contest, bday: out.bday, cookVotes: out.cookVotes, taleSay: out.taleSay, taleReady: out.taleReady, ride: out.ride, duel: out.duel };
  if (id === G.me) onRes(res); else G.net?.send(id, res);
  if (out.levelUp) { G.net?.broadcast({ t: 'lvl', l: out.levelUp }); onLevel(out.levelUp); }
  if (out.ach) { G.net?.broadcast({ t: 'ach', ids: out.ach }); onAch(out.ach); }
  if (out.quest) questDone(out.quest);
  if (out.moment) { G.net?.broadcast({ t: 'moment', m: out.moment }); onMoment(out.moment); }
  if (out.weekGoal) { const text = `🤝 Wochenziel geschafft: ${out.weekGoal}!`; G.net?.broadcast({ t: 'toast', text, snd: 'ach' }); toast(text, 'ach'); play('ach'); }
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
  const moment = { hug: ['🤗', 'haben sich umarmt'], kiss: ['😘', 'haben sich ein Küsschen gegeben'], dance: ['💃', 'haben zusammen getanzt'], hand: ['🤝', 'sind Händchen haltend spazieren gegangen'], hide: ['🙈', 'haben Verstecken gespielt'],
    cuddle: ['🥰', 'haben gekuschelt'], twirl: ['💫', 'haben sich im Kreis gedreht'], heart: ['💞', 'haben zusammen ein Herz geformt'], nose: ['😚', 'haben Nasenstupser gemacht'], forehead: ['💋', 'haben sich Stirnküsschen gegeben'], lap: ['🫂', 'haben sich aneinander gelehnt'] }[k];
  const dk = `${G.s.day}${k}`;
  if (moment && G.diaryDone?.[dk] !== true) { (G.diaryDone ||= {})[dk] = true; (G.s.diary ||= []).push({ day: G.s.day, icon: moment[0], text: `${pa.name} & ${pb.name} ${moment[1]}` }); G.dirty = true; }
  if (loveSocial(G.s, k, {})) G.dirty = true; // Herzensbuch: je Zärtlichkeit einmal am Tag ein Herzpunkt
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
  const h = { onData: d => current() && guestData(d), onClose: () => current() && lostConnection() };
  conn = await (g.server ? cloud.relayJoin(g.joinCode, h) : net.join(g.joinCode, h));
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
      G.sRaw = d.s;
      G.s = S.bindInv(S.migrate(structuredClone(d.s)), myBag(d.s));
      G.players = normPlayers(d.players);
      if (old || G.keepMe) Object.assign(G.players[G.me], old ? { x: old.x, z: old.z, ry: old.ry } : G.keepMe);
      G.keepMe = null;
      G.code = d.code;
      if (G.server) { G.key = SW.LOCAL; SW.remember(G.s); } else {
        G.key = 'copy:' + G.s.id;
        store.set('ki.lastJoin', { code: G.joinCode, host: G.players.h?.name || '', farm: G.s.name });
      }
      G.onWelcome?.();
      if (!G.ready) enterGame(); else hideCover();
      saveFarm();
      break;
    }
    case 's': if (G.s && d.s && typeof d.s === 'object') { G.sRaw = d.s; G.s = S.bindInv(S.migrate(structuredClone(d.s)), myBag(d.s)); } break;
    case 'sd': { // nur die geänderten Teile
      if (!G.s || !G.sRaw || !d.d || typeof d.d !== 'object') break;
      const raw = { ...G.sRaw, ...d.d };
      for (const k of Array.isArray(d.x) ? d.x : []) delete raw[k];
      G.sRaw = raw;
      G.s = S.bindInv(S.migrate(structuredClone(raw)), myBag(raw));
      break;
    }
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
    case 'riddle': showRiddle(d); break;
    case 'emote': showEmote(d.id, d.e); break;
    case 'soc': if (Object.hasOwn(SOCIAL, d.k)) onSocial(d.a, d.b, d.k); break;
    case 'toast': toast(d.text); if (d.snd) play(d.snd); break;
    case 'moment': if (d.m?.k) onMoment(d.m); break;
    case 'note': if (Number.isInteger(d.m)) hearNote(d.id, d.m); break;
    case 'mel': playMelody(); break;
    case 'card': if (typeof d.url === 'string' && d.url.startsWith('data:image/jpeg')) onCard(d); break;
    case 'wake': wake(); break;
    case 'kick': G.ended = true; G.conn?.close(); cover('Der Host hat dich von der Insel geschickt.', true); break;
    case 'bye': if (G.server) { if (d.s && typeof d.s === 'object') G.sRaw = d.s; takeOver(G); break; } G.ended = true; G.conn?.close(); saveFarm(); cover('🏝️ Der Host hat die Insel verlassen. Deine Kopie ist gespeichert – du findest sie unter „Meine Inseln“.', true); break;
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
  if (g.server) { // Serverwelt: neu verbinden – ist niemand mehr da, übernehmen wir die Insel
    cover('📡 Verbindung zur Serverwelt kurz weg – verbinde neu…', true);
    for (let i = 0; i < 400 && G === g && !g.ended; i++) {
      try {
        await connectGuest(g);
        if (G === g) { g.reconnecting = false; g.lastHost = performance.now(); hideCover(); toast('✅ Wieder verbunden!'); }
        return;
      } catch (e) {
        if (G !== g || g.ended) return;
        if (e?.type === 'peer-unavailable') { g.reconnecting = false; return takeOver(g); }
        await sleep(i < 5 ? 1500 : 3000);
      }
    }
    return;
  }
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
    world.squishAt(f.x, f.z); // was getroffen wurde, wackelt kurz
  }
}
function onRes(r) {
  if (r.reaction && G.talk) giftAnswer(r.reaction, r.bday);
  if (r.contest) { const me = G.players[G.me]; world.float(me.x, me.z, `🏆 ${r.contest}`, 2.2, { cls: 'big' }); bump('contestpill', 'pop'); }
  if (r.snd) play(r.snd);
  else if (r.msg && !r.ok) play('fail');
  if (r.msg) toast(r.msg);
  if (r.duel) setTimeout(() => toast(r.duel, 'ach'), 900);
  if (r.caught) toast(`${ITEMS[r.caught].cat === 'fish' ? '🎣' : ITEMS[r.caught].cat === 'bug' && !FOSSIL_IDS.includes(r.caught) ? '🦋' : '⛏️'} ${ITEMS[r.caught].icon} ${ITEMS[r.caught].name}!`);
  if (r.learned) { play('level'); world.float(G.players[G.me].x, G.players[G.me].z, '📜✨', 2); }
  // Fundstück kurz hochhalten (nur bei Dingen, die man noch nicht oft hat)
  if (r.got && ITEMS[r.got] && G.players[G.me] && !G.players[G.me].sw) {
    const me = G.players[G.me], n = G.s.inv[r.got] || 0, big = n <= 1 || ITEMS[r.got].furn || ITEMS[r.got].place;
    if (big) { animate('lift'); world.float(me.x, me.z, ITEMS[r.got].icon, 2.1, { cls: 'hold', life: 1.4, rise: 0.15, follow: () => G?.players[G.me] }); play('harvest'); }
  }
  if (r.cookVotes) r.cookVotes.forEach((v, i) => setTimeout(() => { toast(`${v.icon} ${v.name}: „${v.line}“ – ${'⭐'.repeat(Math.round(v.score / 2))} ${v.score}/10`); play(v.score >= 7 ? 'love' : 'chat'); }, 600 + i * 1400));
  if (r.newAlbum) { toast(`📖 Neu im Sammelbuch: ${ITEMS[r.newAlbum].icon} ${ITEMS[r.newAlbum].name}`, 'ach'); play('ach'); }
  if (r.taleSay && G.talk) { say2(r.taleSay); world.npcSay(G.talk.id, 'love'); }
  if (r.ride) startRide();
  if (r.taleReady) setTimeout(() => toast(`📖 Geschafft! ${r.taleReady} wartet auf dich – die Geschichte geht weiter.`, 'ach'), 900);
  if (G.talk) setTimeout(() => G?.talk && updTale(G.talk.id), 450);
}
// Neue Seite im Fotobuch: kurz anzeigen und ein Bild vom Moment festhalten (nur auf diesem Gerät)
const isleKey = () => G?.s?.id || G?.key || 'insel';
function onMoment(m) {
  toast(`📸 Neue Seite im Fotobuch: ${m.icon} ${m.title}`, 'ach');
  play('shutter');
  const isle = isleKey();
  setTimeout(async () => {
    if (!G?.ready || G.photo) return;
    try { await photos.add(isle, await photos.shrink(world.snapshot(), 480, 0.78), { kind: 'moment', k: m.k, day: G.s.day }); } catch { /* ohne Bild */ }
  }, 700);
}
async function onCard(d) {
  await photos.add(isleKey(), d.url, { kind: 'photo', card: true, from: String(d.from || '').slice(0, 16), day: G.s?.day });
  toast(`📮 ${d.from || 'Jemand'} hat dir eine Postkarte geschickt! (📸 Fotobuch → 🖼️ Fotos)`, true);
  play('love');
}
// ---------- Klavier & Inselmelodie ----------
let melT = [];
function playMelody(notes = G?.s?.melody?.notes) {
  if (!notes) return;
  for (const t of melT) clearTimeout(t);
  melT = notes.map((n, i) => n && setTimeout(() => pianoNote(XS.MEL_NOTES[n], 0.7, 0.35), i * 230)).filter(Boolean);
}
function hearNote(id, m) { // ein Mitspieler spielt Klavier
  const p = G.players[id], me = G.players[G.me];
  if (!p || !me || Math.hypot(p.x - me.x, p.z - me.z) > 14) return;
  pianoNote(m, 0.5);
  if (Math.random() < 0.3) world.float(p.x, p.z, ['🎵', '🎶'][Math.floor(Math.random() * 2)], 1.6);
}
function playKey(m) {
  pianoNote(m, 0.7);
  const me = G.players[G.me];
  if (me && Math.random() < 0.4) world.float(me.x, me.z, ['🎵', '🎶'][Math.floor(Math.random() * 2)], 1.6);
  if (G.role === 'host') G.net?.broadcast({ t: 'note', m, id: G.me }); else G.conn?.send({ t: 'note', m });
  const k = document.querySelector(`#pbody .pk[data-m="${m}"]`);
  if (k) { k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 160); }
}
$('pbody').addEventListener('pointerdown', e => { const k = e.target.closest('.pk'); if (k) { e.preventDefault(); e.stopPropagation(); playKey(+k.dataset.m); } });
const PIANO_KEYS = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, z: 68, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ö: 76 };
addEventListener('keydown', e => {
  if (panels.open !== 'piano' || panels.tab === 'song' || e.repeat || e.target.tagName === 'INPUT') return;
  const m = PIANO_KEYS[e.key.toLowerCase()];
  if (m) { playKey(m); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// Muster-Editor: Vorschauen malen, auf der Leinwand zeichnen
function drawPat() { const cv = $('patcv'); if (cv && G.patEdit) PAT.paint(cv, G.patEdit.px, null, true); }
function fillPatterns() {
  if (panels.open !== 'patterns') return;
  for (const cv of $('pbody').querySelectorAll('canvas[data-pat]:not(.done)')) { cv.classList.add('done'); const p = G.s.patterns?.[+cv.dataset.pat]; if (p) PAT.paint(cv, p.px); }
  const cv = $('patcv');
  if (!cv || cv.dataset.bound) return;
  cv.dataset.bound = 1;
  drawPat();
  let down = false;
  const at = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 16), Math.floor((e.clientY - r.top) / r.height * 16)]; };
  const set = (x, y) => {
    const E = G.patEdit;
    if (!E || x < 0 || y < 0 || x > 15 || y > 15) return;
    const c = E.c.toString(16), a = [...E.px];
    if (E.tool === 'fill') { // Flächen füllen
      const from = a[y * 16 + x];
      if (from === c) return;
      const st = [[x, y]];
      while (st.length) { const [i, j] = st.pop(); if (i < 0 || j < 0 || i > 15 || j > 15 || a[j * 16 + i] !== from) continue; a[j * 16 + i] = c; st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); }
    } else a[y * 16 + x] = c;
    E.px = a.join('');
    drawPat();
  };
  cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); set(...at(e)); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (down && G.patEdit?.tool === 'pen') set(...at(e)); });
  cv.addEventListener('pointerup', () => { down = false; });
}
// Bilder ins Fotobuch einsetzen (die Seiten selbst kommen aus dem Spielstand)
let picSig = '';
async function fillBook() {
  const body = $('pbody');
  if (panels.open !== 'book') { picSig = ''; return; }
  const slots = body.querySelectorAll('[data-bpic]:not(.done)'), grid = $('photogrid');
  if (!slots.length && !(grid && !grid.dataset.done)) return;
  const isle = isleKey();
  if (slots.length) {
    for (const el of slots) el.classList.add('done');
    const pics = new Map((await photos.list(isle, 'moment')).map(p => [p.k, p.url]));
    for (const el of slots) { const u = pics.get(el.dataset.bpic); if (u) el.innerHTML = `<img src="${u}" alt="">`; }
  }
  if (grid && !grid.dataset.done) {
    grid.dataset.done = 1;
    const list = await photos.list(isle, 'photo'), others = Object.values(G.players).filter(p => p.id !== G.me);
    const card = G.cardFor && list.find(p => p.id === G.cardFor);
    grid.innerHTML = (card ? `<div class="photo" style="grid-column:1/-1"><img src="${card.url}" alt=""><div class="diaryadd" style="margin-top:6px"><input id="cardtxt" maxlength="160" placeholder="Liebe Grüße von der Insel …"></div><div class="row2">${others.map(p => `<button class="btn small pink" data-ui="cardsend" data-to="${esc(p.id)}">📮 An ${esc(p.name)}</button>`).join('')}<button class="btn small" data-ui="cardshare">📤 Teilen / Speichern</button><button class="btn small white" data-ui="cardno">Abbrechen</button></div></div>` : '')
      + (list.length ? list.map(p => `<div class="photo"><img src="${p.url}" alt=""><small>${p.card ? `📮 von ${esc(p.from || '?')} · ` : ''}Tag ${p.day || '?'} · ${new Date(p.time).toLocaleDateString('de-DE')}</small><div class="row2"><button class="btn small white" data-ui="phcard" data-id="${p.id}" title="Als Postkarte">📮</button><button class="btn small white" data-ui="phsave" data-id="${p.id}" title="Speichern/Teilen">⬇️</button><button class="btn small white" data-ui="phdel" data-id="${p.id}" title="Löschen">🗑️</button></div></div>`).join('')
        : '<div class="note">Noch keine Fotos. Im 📷 Fotomodus auf 📸 drücken – das Bild landet hier.</div>');
  }
}
async function shareImage(url, name) {
  try {
    const file = new File([await (await fetch(url)).blob()], name, { type: 'image/jpeg' });
    if (touch && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Kuschelinsel' }); return; }
  } catch { /* Teilen abgebrochen oder nicht möglich: herunterladen */ }
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
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
  if (e === '🐾') { if (!world.petTrick(id) && id === G.me) toast('🐾 Du hast noch kein Haustier – im Charakter-Menü kannst du eins aussuchen!'); play('plopp'); return; }
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
    else animate(k === 'nose' || k === 'forehead' ? 'kiss' : k === 'cuddle' ? 'hug' : k);
  }
  const x = (pa.x + pb.x) / 2, z = (pa.z + pb.z) / 2;
  if (k === 'hand') {
    const on = !(G.hand && [G.hand.a, G.hand.b].includes(a) && [G.hand.a, G.hand.b].includes(b));
    G.hand = on ? { a, b } : null;
    world.float(x, z, on ? '🤝💕' : '👋', 1.9);
    if (a === G.me || b === G.me) toast(on ? `🤝 Ihr haltet Händchen! Wer stehen bleibt, wird mitgezogen. Nochmal antippen zum Loslassen.` : '👋 Ihr lasst los.');
    play(on ? 'love' : 'click');
  }
  if (k === 'hide' && (a === G.me || b === G.me)) startHide(a, b);
  if (k === 'found' && (a === G.me || b === G.me) && G.hide) endHide(true);
  if (k === 'hug') { world.burst(x, z, 'heart', 1.3); world.float(x, z, '💕', 1.7); world.emoteFx(x, z, '🥰'); play('love'); }
  if (k === 'kiss') { world.emoteFx(x, z, '😘'); world.float(x, z, '😘', 1.9); play('love'); }
  if (k === 'highfive') { setTimeout(() => { world.burst(x, z, 'coin', 1.7); world.float(x, z, '✋✨', 2); play('coin'); }, 180); }
  // Inselleben 10: neue Zärtlichkeiten
  if (k === 'cuddle') { showEmote(a, '🤗', 4200); showEmote(b, '🤗', 4200); [0, 1200, 2400].forEach(t => setTimeout(() => { world.burst(x, z, 'heart', 1.3); world.float(x, z, '💕', 1.8); }, t)); }
  if (k === 'twirl') { showEmote(b, '💫', 2400); showEmote(a, '👏', 2400); world.float(x, z, '💫', 2); setTimeout(() => world.burst(pb.x, pb.z, 'sparkle', 1.2), 400); play('party'); }
  if (k === 'heart') { showEmote(a, '💞', 3600); showEmote(b, '💞', 3600); setTimeout(() => { world.float(x, z, '💖', 2.4, { life: 2.6, rise: 0.4 }); world.burst(x, z, 'heart', 2.2); play('love'); }, 700); }
  if (k === 'nose' || k === 'forehead') { world.emoteFx(x, z, k === 'nose' ? '😚' : '💋'); world.float(x, z, k === 'nose' ? '😚💗' : '💋', 1.9); play('love'); }
  if (k === 'lap') { showEmote(a, '🫂', 5200); showEmote(b, '🫂', 5200); world.float(x, z, '💗', 1.8, { life: 2.4 }); play('love'); }
}
// ---------- Zu zweit: Verstecken ----------
const HIDE_COUNT = 15, HIDE_SEEK = 120;
function startHide(seeker, hider) {
  G.hide = { seeker, hider, t0: performance.now(), phase: 'count' };
  const me = G.me === seeker;
  toast(me ? `🙈 Augen zu! Zähl bis ${HIDE_COUNT} – ${G.players[hider].name} versteckt sich …` : `🏃 Schnell verstecken! ${G.players[seeker].name} zählt bis ${HIDE_COUNT}.`, true);
  play('whistle');
}
function endHide(found) {
  const h = G.hide;
  if (!h) return;
  G.hide = null;
  document.body.classList.remove('eyesclosed');
  $('hidepill').classList.add('hidden');
  const hp = G.players[h.hider], sp = G.players[h.seeker];
  if (found) {
    toast(G.me === h.seeker ? `🎉 Gefunden! ${hp?.name || ''} hatte sich gut versteckt!` : `😆 ${sp?.name || ''} hat dich gefunden!`, true);
    if (hp) { world.burst(hp.x, hp.z, 'heart', 1.4); world.float(hp.x, hp.z, '🙈🎉', 2); }
    play('found');
  } else { toast(G.me === h.seeker ? `⏰ Zeit um! ${hp?.name || ''} hat gewonnen.` : '🏆 Zeit um – du warst unauffindbar!', true); play('fanfare'); }
}
function updateHide(me, now) {
  const h = G.hide;
  if (!h) return;
  const t = (now - h.t0) / 1000, seeker = G.me === h.seeker, other = G.players[seeker ? h.hider : h.seeker];
  if (!other) return endHide(false);
  if (h.phase === 'count') {
    document.body.classList.toggle('eyesclosed', seeker);
    setText('hidepill', `🙈 ${Math.max(0, Math.ceil(HIDE_COUNT - t))}`);
    $('hidepill').classList.remove('hidden');
    if (t >= HIDE_COUNT) { h.phase = 'seek'; document.body.classList.remove('eyesclosed'); toast(seeker ? '👀 Such!' : '🤫 Psst … die Suche beginnt!'); play('whistle'); }
    return;
  }
  const left = Math.max(0, Math.ceil(HIDE_COUNT + HIDE_SEEK - t)), d = Math.hypot(other.x - me.x, other.z - me.z);
  setText('hidepill', seeker ? `${d < 3 ? '🔥 Heiß!' : d < 7 ? '☀️ Warm' : d < 12 ? '🌤️ Lauwarm' : '❄️ Kalt'} · ${left} s` : `🤫 Versteckt · ${left} s`);
  if (seeker && d < 1.3) { sendSocial(h.hider, 'found'); endHide(true); return; }
  if (left <= 0) endHide(false);
}
// ---------- Zu zweit: Foto-Rätsel ----------
// Foto machen ➜ an die anderen schicken ➜ wer den Ort findet, bekommt Taler
function riddle(id, d) { // beim Host: prüfen und an alle anderen weitergeben
  const p = G.players[id];
  if (!p || typeof d.img !== 'string' || !d.img.startsWith('data:image/jpeg') || d.img.length > 300000 || ![d.x, d.z].every(Number.isFinite)) return;
  const m = { t: 'riddle', img: d.img, x: d.x, z: d.z, from: id, name: p.name };
  G.net?.broadcast(m, id);
  if (id !== G.me) showRiddle(m);
}
function sendRiddle() {
  const others = Object.keys(G.players).filter(id => id !== G.me);
  if (!others.length) { toast('🧩 Foto-Rätsel gehen nur zu zweit – lade jemanden auf eure Insel ein!'); return; }
  const src = new Image();
  src.onload = () => {
    const c = document.createElement('canvas'), w = 480, h = Math.round(src.height / src.width * w);
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    const me = G.players[G.me], m = { t: 'riddle', img: c.toDataURL('image/jpeg', 0.7), x: Math.round(me.x * 10) / 10, z: Math.round(me.z * 10) / 10 };
    sendTo(m, () => riddle(G.me, m));
    play('shutter');
    toast('🧩 Foto-Rätsel verschickt! Mal sehen, wer den Ort zuerst findet …');
    setPhoto(false);
  };
  src.src = world.snapshot();
}
function showRiddle(d) {
  if (d.from === G.me || typeof d.img !== 'string' || !d.img.startsWith('data:image/jpeg')) return;
  G.riddle = { x: d.x, z: d.z, name: d.name, from: d.from };
  $('riddleimg').src = d.img;
  setText('riddletxt', `🧩 Wo hat ${d.name} dieses Foto gemacht?`);
  $('riddle').classList.remove('hidden');
  toast(`🧩 ${d.name} schickt dir ein Foto-Rätsel! Finde den Ort.`, true);
  play('chat');
}
function updateRiddle(me) {
  const r = G.riddle;
  if (!r) return;
  const d = Math.hypot(r.x - me.x, r.z - me.z);
  setText('riddlehot', d < 2.5 ? '🎉' : d < 5 ? '🔥 Heiß!' : d < 10 ? '☀️ Warm' : d < 18 ? '🌤️ Lauwarm' : '❄️ Kalt');
  if (d < 2.5) {
    G.riddle = null;
    $('riddle').classList.add('hidden');
    send({ t: 'riddle', from: r.name });
    world.burst(me.x, me.z, 'coin', 1.6);
    world.float(me.x, me.z, '🧩🎉', 2);
    play('found');
  }
}
$('riddlex').onclick = () => { G.riddle = null; $('riddle').classList.add('hidden'); toast('🧩 Rätsel aufgegeben.'); };
$('riddlebtn').onclick = sendRiddle;
// ---------- Zu zweit: Händchen halten (wer steht, läuft mit) ----------
function updateHand(me, now) {
  const h = G.hand;
  if (!h || (h.a !== G.me && h.b !== G.me)) return;
  const o = G.players[h.a === G.me ? h.b : h.a];
  if (!o) { G.hand = null; return; }
  const d = Math.hypot(o.x - me.x, o.z - me.z);
  if (d > 8) { G.hand = null; toast('👋 Ihr habt euch losgelassen.'); return; }
  if (d > 1.25 && !me.m && !G.goal && !busy()) G.goal = { player: o.id, follow: true, last: { x: me.x, z: me.z, t: now } };
  if (now > (G.handFx || 0)) { G.handFx = now + 1800; world.float((o.x + me.x) / 2, (o.z + me.z) / 2, '💗', 1.6, { life: 1.2, rise: 0.5 }); }
}
function animate(kind) {
  const me = G.players[G.me];
  me.ak = kind;
  me.an = (me.an + 1) % 100000;
}

function announceDay() {
  const s = G.s;
  const sea = S.seasonOf(s.day), newSea = (s.day - 1) % 7 === 0;
  say(`${newSea ? `${SEASONS[sea][1]} Der ${SEASONS[sea][0]} beginnt! ` : '🌅 '}${WEEKDAYS[weekday(s.day)]}, Tag ${s.day} – ${s.weather === 'rain' ? '🌧️ Regen gießt alle Blumen!' : s.weather === 'storm' ? '⛈️ Gewitter! Der Regen gießt alles – und manche Tiere zeigen sich nur jetzt.' : s.weather === 'fog' ? '🌫️ Nebel liegt über der Insel – geheimnisvolle Tiere sind unterwegs.' : s.weather === 'snow' ? '🌨️ Es schneit!' : s.rainbowDay === s.day ? '🌈 Nach dem Regen: Schau mal in den Himmel!' : '☀️ Sonnenschein'}`);
  if (weekday(s.day) === 0) say('🐰 Hoppel verkauft heute bis 12 Uhr Rüben am Dorfplatz!');
  if (weekday(s.day) === 6) say('🎸 Heute ab 20 Uhr: Livemusik im Mondschein-Club in der Bummelgasse!');
  if (s.mail.some(m => m.kind && m.day === s.day)) say('💌 Im Briefkasten liegt neue Post!');
  if (Object.values(s.shells).includes('sternsplitter')) say('🌟 Am Strand glitzern Sternsplitter!');
  const fest = FESTS[S.festOf(s.day)], bd = S.birthdayOf(s.day);
  if (fest) say(`${fest.icon} Heute: ${fest.name}! ${fest.desc}`, 'party');
  if (bd) say(`🎂 Heute hat ${NPCS[bd].name} ${NPCS[bd].icon} Geburtstag!`);
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
  // (kurz warten: wer im Bett liegt, kann noch ins Träumen abbiegen)
  if (!(ps.length && ps.every(p => p.pose === 'sleep'))) G.sleepAt = 0;
  else if (!G.sleepAt) G.sleepAt = now;
  else if (now - G.sleepAt > 6000 && S.sleepThrough(G.s)) { G.sleepAt = 0; G.dirty = true; G.net?.broadcast({ t: 'wake' }); wake(); }
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
        // Nur geänderte Teile des Spielstands schicken (alle 15 s und nach Neu-Beitritt einmal alles)
        const P = pack(G.s), cur = {};
        for (const k of Object.keys(P)) cur[k] = JSON.stringify(P[k]);
        if (!G.sentKeys || now - (G.lastFull || 0) > 15000) { G.net.broadcast({ t: 's', s: P }); G.lastFull = now; }
        else {
          const d = {}, x = Object.keys(G.sentKeys).filter(k => !(k in cur));
          for (const k of Object.keys(cur)) if (cur[k] !== G.sentKeys[k]) d[k] = P[k];
          if (Object.keys(d).length || x.length) G.net.broadcast({ t: 'sd', d, x });
        }
        G.sentKeys = cur;
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
    const msg = { t: 'm', x: r3(me.x), z: r3(me.z), ry: r3(me.ry), m: me.m, ak: me.ak, an: me.an, held: me.held, pose: me.pose, fishing: me.fishing, run: !!me.run, sw: !!me.sw, bk: !!me.bike, sl: !!me.sled, po: !!me.pony, tn: !!me.tn, fh: me.fh ? r3(me.fh) : 0, td: !!me.td, tp: !!me.tp, kh: me.kh || 0, rh: me.rh || 0, rf: !!me.rf, sf: !!me.sf };
    const sig = JSON.stringify(msg);
    if (sig !== G.lastMove || now - (G.lastMoveT || 0) > 1000) { G.conn?.send(msg); G.lastMove = sig; G.lastMoveT = now; }
    if (now - G.lastHost > 9000) lostConnection();
    if (now - G.lastSave > 15000) saveFarm();
  }
}

function enterGame() {
  G.ready = true;
  setTimeout(() => playMelody(), 1500); // Inselmelodie zur Begrüßung
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
  srvRun++; // laufende Serverwelt-Verbindung abbrechen
  srvPaused = null;
  if (g) {
    saveFarm(true);
    if (g.role === 'host' && g.net) { g.net.broadcast(g.server ? { t: 'bye', s: pack(g.s) } : { t: 'bye' }); setTimeout(() => g.net.close(), 1000); }
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
  const sc = SW.cfg(), oldOf = f => !f.server && sc?.id && f.s.id === sc.id; // ältere Kopien derselben Insel
  if (screen === 'title') {
    const m = farms.find(([k]) => k === SW.LOCAL)?.[1];
    $('b-server').classList.toggle('hidden', !sc);
    if (sc) $('server-sub').textContent = `${m?.name || sc.name || 'Eure gemeinsame Insel'}${m ? ` · Tag ${m.s.day}` : ''} · einfach rein, ohne Einladen`;
    $('b-continue').classList.toggle('pink', !sc);
    const own = farms.find(([, f]) => !f.guest && !f.server && !oldOf(f));
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
      <small>${f.server ? '🌍 Serverwelt · ' : ''}Tag ${f.s.day} · Level ${f.s.level} · 🪙 ${f.s.money.toLocaleString('de-DE')}${f.guest ? ` · Kopie von ${esc(f.guest)}s Insel` : ''}${oldOf(f) ? ' · älterer Stand eurer Serverwelt' : ''}</small>
      <small>${new Date(f.saved).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <button class="btn small" data-play="${esc(id)}">Spielen</button><button class="btn small white" data-exp="${esc(id)}" title="Als Datei sichern">💾</button>
      <button class="btn small white" data-snaps="${esc(id)}" title="Frühere Stände">⏪</button><button class="btn small white" data-del="${esc(id)}">🗑️</button></div>
      <div class="snaps hidden" id="snaps-${esc(id)}"></div>`).join('')
      : '<div class="note">Noch keine Insel – gründet unten eure erste! 🏝️</div>';
  }
  if (screen === 'farms') { serverBox(); cloudBox(); cloudSync(); }
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
$('b-server').onclick = () => { play('click'); startServer(); };
$('b-continue').onclick = () => {
  const f = store.get('ki.islands', {})[$('b-continue').dataset.key];
  if (f && !needName()) startHost(f.s, $('b-continue').dataset.key, f.guest);
};
$('b-rejoin').onclick = () => {
  const lj = store.get('ki.lastJoin', null);
  if (lj?.code && !needName()) startGuest(lj.code);
};
$('farms').onclick = async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const farms = store.get('ki.islands', {});
  if (b.dataset.exp && farms[b.dataset.exp]) { backup.download([[b.dataset.exp, farms[b.dataset.exp]]], backup.fileName(farms[b.dataset.exp].name)); toast('💾 Insel als Datei gesichert – heb sie gut auf!'); }
  if (b.dataset.snaps) {
    const box = $('snaps-' + b.dataset.snaps), list = await backup.snapshots(b.dataset.snaps);
    box.classList.toggle('hidden');
    box.innerHTML = list.length ? '<div class="note">Frühere Stände (werden beim Spielen alle paar Minuten gemerkt):</div>' + list.map(x =>
      `<button class="chip" data-restore="${x.id}" data-key="${esc(b.dataset.snaps)}">Tag ${x.day} · Lv ${x.level} · ${new Date(x.time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</button>`).join('')
      : '<div class="note">Noch keine früheren Stände gemerkt.</div>';
  }
  if (b.dataset.restore) {
    const x = (await backup.snapshots(b.dataset.key)).find(q => String(q.id) === b.dataset.restore);
    if (x && b.dataset.key === SW.LOCAL) { // Serverwelt: gilt für beide – also auf den Server
      const c = SW.cfg();
      if (c && confirm(`Eure Serverwelt auf „Tag ${x.day}“ zurücksetzen? Das gilt dann für euch beide – am besten, wenn gerade niemand auf der Insel ist.`)) {
        if (farms[SW.LOCAL]) await backup.snapshot(SW.LOCAL, farms[SW.LOCAL], true);
        const f = { name: x.name, saved: Date.now(), s: x.s };
        if (await SW.push(c, f, { force: true }) === 'ok') { farms[SW.LOCAL] = { ...f, server: true, pushed: f.saved }; store.set('ki.islands', farms); toast('⏪ Serverwelt zurückgesetzt'); showMenu('farms'); }
        else toast('⚠️ Der Server ist gerade nicht erreichbar – nichts geändert.');
      }
    } else if (x && confirm(`Insel auf „Tag ${x.day}“ zurücksetzen? Der jetzige Stand wird vorher noch gemerkt.`)) {
      if (farms[b.dataset.key]) await backup.snapshot(b.dataset.key, farms[b.dataset.key], true);
      farms[b.dataset.key] = { ...(farms[b.dataset.key] || { name: x.name }), saved: Date.now(), s: x.s };
      store.set('ki.islands', farms);
      toast('⏪ Früherer Stand wiederhergestellt');
      showMenu('farms');
    }
  }
  if (b.dataset.del && confirm(`„${farms[b.dataset.del]?.name}“ wirklich löschen?`)) {
    delete farms[b.dataset.del];
    store.set('ki.islands', farms);
    showMenu('farms');
  }
  if (b.dataset.play && farms[b.dataset.play]?.server && SW.cfg()) { if (!needName()) startServer(); return; }
  const sc = SW.cfg();
  if (b.dataset.play && sc?.id && farms[b.dataset.play]?.s?.id === sc.id && !farms[b.dataset.play].server
    && !confirm('Das ist ein älterer Stand eurer Serverwelt. Trotzdem hier für dich allein spielen? (Die Serverwelt bleibt davon unberührt.)')) return;
  if (b.dataset.play && farms[b.dataset.play] && !needName()) startHost(farms[b.dataset.play].s, b.dataset.play, farms[b.dataset.play].guest);
};
// ---------- 🌍 Serverwelt einrichten ----------
let srvMsg = '';
// Spiegel einer anderen (früheren) Serverwelt als normale Insel aufheben, damit nichts überschrieben wird
function archiveMirror() {
  const farms = store.get('ki.islands', {}), m = farms[SW.LOCAL];
  if (!m) return;
  delete m.server; delete m.pushed;
  farms['w' + Date.now().toString(36)] = m;
  delete farms[SW.LOCAL];
  store.set('ki.islands', farms);
}
function serverBox() {
  const el = $('serverbox'), c = SW.cfg();
  if (!el) return;
  const farms = Object.entries(store.get('ki.islands', {})).filter(([k, f]) => k !== SW.LOCAL && Number.isFinite(f?.s?.money)).sort((a, b) => b[1].saved - a[1].saved);
  el.innerHTML = c
    ? `<b>🌍 Serverwelt: ${esc(store.get('ki.islands', {})[SW.LOCAL]?.name || c.name || 'eure Insel')}</b><small>Liegt auf eurem Server. Wer zuerst kommt, öffnet sie – wer dazukommt, landet automatisch dort. Kein Einladen, kein Herunterladen. Den Link nur deinem Lieblingsmenschen geben!</small>
      <div class="row2"><button class="btn small pink" data-sw="go">🌍 Betreten</button><button class="btn small white" data-sw="share">🔗 Link teilen</button><button class="btn small white" data-sw="off">Von diesem Gerät entfernen</button></div>`
    : `<b>🌍 Serverwelt</b><small>Eine gemeinsame Insel auf dem Server: ihr könnt beide jederzeit rein – ohne einander einzuladen und ohne Dateien hin und her zu schicken.</small>
      ${farms.length ? `<div class="row2"><select id="swpick">${farms.map(([k, f]) => `<option value="${esc(k)}">${esc(f.name)} · Tag ${f.s.day}${f.guest ? ' · Kopie' : ''}</option>`).join('')}</select><button class="btn small pink" data-sw="make">Zur Serverwelt machen</button></div>` : ''}
      <div class="row2" style="margin-top:8px"><input type="text" id="swkey" placeholder="Serverwelt-Link oder Schlüssel" autocomplete="off"><button class="btn small white" data-sw="use">Verbinden</button></div>`;
  el.insertAdjacentHTML('beforeend', `<div class="st">${srvMsg}</div>`);
}
function shareServer() {
  const c = SW.cfg();
  if (!c) return;
  const url = SW.link(c.key);
  if (navigator.share) navigator.share({ title: 'Kuschelinsel', text: '🌍 Unsere Serverwelt – einmal öffnen, danach immer über „Serverwelt“ rein:', url }).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast('📋 Link kopiert – nur an deinen Lieblingsmenschen schicken!'), () => toast(url));
}
$('serverbox').onclick = async e => {
  const b = e.target.closest('[data-sw]');
  if (!b) return;
  play('click');
  const k = b.dataset.sw;
  if (k === 'go') startServer();
  if (k === 'share') shareServer();
  if (k === 'off' && confirm('Serverwelt von diesem Gerät entfernen? Auf dem Server bleibt sie erhalten – mit dem Link kommst du jederzeit wieder rein. Die Kopie hier bleibt unter „Meine Inseln“.')) {
    archiveMirror(); SW.forget(); srvMsg = ''; showMenu('farms');
  }
  if (k === 'use') {
    const raw = $('swkey').value, key = (raw.match(/welt=([A-Za-z0-9-]+)/) || [, raw])[1], before = SW.cfg()?.key, c = SW.setup(key);
    if (!c) { srvMsg = '⚠️ Das ist kein Serverwelt-Link.'; return serverBox(); }
    if (before !== c.key) archiveMirror();
    srvMsg = '✅ Verbunden – tippe auf „Betreten“.'; showMenu('farms');
  }
  if (k === 'make') {
    const farms = store.get('ki.islands', {}), id = $('swpick')?.value, f = farms[id];
    if (!f || !confirm(`„${f.name}“ zur Serverwelt machen? Sie liegt dann auf dem Server und ihr könnt beide jederzeit rein. Deine Insel hier bleibt zusätzlich erhalten.`)) return;
    const key = SW.newKey(), c = { key }, x = { name: f.name, saved: Date.now(), s: f.s };
    srvMsg = '⏳ Lade hoch …'; serverBox();
    if (await SW.push(c, x) !== 'ok') { srvMsg = '⚠️ Der Server ist gerade nicht erreichbar.'; return serverBox(); }
    archiveMirror();
    SW.setup(key); SW.remember(f.s);
    const all = store.get('ki.islands', {});
    all[SW.LOCAL] = { ...x, server: true, pushed: x.saved };
    store.set('ki.islands', all);
    srvMsg = '✅ Fertig! Schick jetzt den Link an deinen Lieblingsmenschen.'; showMenu('farms'); shareServer();
  }
};
// Link …#welt=SCHLÜSSEL: Serverwelt auf diesem Gerät einrichten
{
  const had = SW.cfg()?.key, r = SW.readLink();
  if (r === 'new') { if (had || store.get('ki.islands', {})[SW.LOCAL]) archiveMirror(); setTimeout(() => toast('🌍 Serverwelt eingerichtet! Tippe auf „Serverwelt“.', true), 1200); }
  if (r === 'same') setTimeout(() => toast('🌍 Serverwelt ist schon eingerichtet.'), 1200);
  if (r === 'bad') setTimeout(() => toast('⚠️ Der Serverwelt-Link ist unvollständig.', true), 1200);
}

// ---------- Cloud-Spielstand ----------
let cloudMsg = '', cloudBusy = false;
function cloudBox() {
  const k = cloud.cloudKey(), el = $('cloudbox');
  if (!el) return;
  el.innerHTML = k
    ? `<b>☁️ Cloud-Spielstand ist an</b><small>Eure Inseln werden zusätzlich online gesichert. Auf dem Handy oder einem anderen PC einfach diesen Schlüssel eingeben – dann sind dort dieselben Inseln. Den Schlüssel nicht weitergeben!</small>
      <code>${cloud.fmtKey(k)}</code><div class="row2"><button class="btn small white" data-cl="copy">📋 Kopieren</button><button class="btn small" data-cl="sync">🔄 Jetzt abgleichen</button><button class="btn small white" data-cl="off">Ausschalten</button></div>`
    : `<b>☁️ Cloud-Spielstand</b><small>Inseln online sichern und auf Handy & PC weiterspielen – auch wenn der Browser-Speicher mal gelöscht wird.</small>
      <div class="row2"><button class="btn small pink" data-cl="on">☁️ Einschalten</button></div>
      <div class="row2" style="margin-top:8px"><input type="text" id="cloudkey" maxlength="24" placeholder="Schlüssel vom anderen Gerät" autocomplete="off"><button class="btn small white" data-cl="use">Verbinden</button></div>`;
  el.insertAdjacentHTML('beforeend', `<div class="st">${cloudMsg}</div>`);
}
async function cloudSync(manual) {
  if (!cloud.cloudKey() || cloudBusy) return;
  cloudBusy = true;
  cloudMsg = '⏳ Gleiche ab …'; cloudBox();
  try {
    const farms = store.get('ki.islands', {});
    const r = await cloud.sync(farms, (id, f) => backup.snapshot(id, f, true));
    if (r.got) store.set('ki.islands', farms);
    cloudMsg = `✅ Abgeglichen um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${r.got ? ` · ${r.got} neuere Insel${r.got === 1 ? '' : 'n'} geholt` : ''}${r.sent ? ` · ${r.sent} hochgeladen` : ''}`;
    if (r.got && menuScreen === 'farms') { cloudBusy = false; showMenu('farms'); }
    else if (r.got && menuScreen === 'title') showMenu('title');
    if (manual || r.got) toast(r.got ? '☁️ Neuere Inseln aus der Cloud geholt!' : '☁️ Alles abgeglichen');
  } catch (e) {
    cloudMsg = '⚠️ Cloud gerade nicht erreichbar – eure Inseln bleiben sicher hier gespeichert.';
    if (manual) toast(cloudMsg);
  }
  cloudBusy = false;
  cloudBox();
}
$('cloudbox').onclick = async e => {
  const b = e.target.closest('[data-cl]');
  if (!b) return;
  play('click');
  const c = b.dataset.cl;
  if (c === 'on') { cloud.enable(); cloudMsg = ''; cloudBox(); cloudSync(true); }
  if (c === 'use') {
    const k = cloud.enable($('cloudkey').value);
    if (!k) { cloudMsg = '⚠️ Der Schlüssel hat 20 Zeichen (Buchstaben & Zahlen).'; return cloudBox(); }
    cloudMsg = ''; cloudBox(); cloudSync(true);
  }
  if (c === 'copy') { navigator.clipboard?.writeText(cloud.fmtKey(cloud.cloudKey())).then(() => toast('📋 Schlüssel kopiert'), () => toast(cloud.fmtKey(cloud.cloudKey()))); }
  if (c === 'sync') cloudSync(true);
  if (c === 'off' && confirm('Cloud-Spielstand auf diesem Gerät ausschalten? Die Inseln bleiben hier und in der Cloud erhalten. Merk dir den Schlüssel, falls du ihn später wieder brauchst!')) { cloud.disable(); cloudMsg = ''; cloudBox(); }
};
if (cloud.cloudKey()) setTimeout(() => { if (!G) cloudSync(); }, 1500);

// Alle Inseln als Datei sichern / Inseln aus einer Datei holen
$('expall').onclick = () => {
  const f = Object.entries(store.get('ki.islands', {})).filter(([, x]) => Number.isFinite(x?.s?.money));
  if (!f.length) return toast('Noch keine Insel zum Sichern.');
  backup.download(f, backup.fileName('Alle-Inseln'));
  toast('💾 Alle Inseln gesichert');
};
$('impbtn').onclick = () => $('impfile').click();
$('impfile').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const list = await backup.readFile(file), farms = store.get('ki.islands', {});
    for (const x of list) {
      let key = x.key || x.s.id || 'i' + Date.now().toString(36);
      if (farms[key] && farms[key].saved > (x.saved || 0) && !confirm(`„${x.name}“ gibt es schon in einem neueren Stand. Trotzdem mit der Datei überschreiben?`)) continue;
      if (farms[key]) await backup.snapshot(key, farms[key], true);
      farms[key] = { name: x.name || x.s.name, saved: x.saved || Date.now(), s: x.s, guest: x.guest || undefined };
    }
    store.set('ki.islands', farms);
    toast(`📂 ${list.length === 1 ? 'Insel' : list.length + ' Inseln'} geladen!`);
    showMenu('farms');
  } catch (err) { toast('⚠️ Die Datei konnte nicht gelesen werden: ' + err.message); }
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
function openEditor(tab) {
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
  if (tab) editor.tab = tab;
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
  audio.weather = typeof settings.weather === 'number' ? settings.weather : 1;
  setVolumes();
  if (k === 'music') setMusic(settings.music);
  if (k === 'quality') Object.assign(settings, PRESETS[settings.quality]);
  if (['quality', 'scale', 'shadows', 'bloom', 'grass', 'lights', 'view', 'camSmooth', 'camAngle', 'anim', 'uiScale', 'textScale', 'cbMode', 'contrast', 'lefty', 'panelBg', 'panelDim', 'panelBlur'].includes(k)) { store.set('kh.settings', settings); applyView(); }
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
// ---------- Als App installieren (Android/PC: Browser-Dialog, iPhone/iPad: Anleitung) ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
let installEv = null;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
$('b-install').classList.toggle('hidden', standalone || !ios);
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; $('b-install').classList.remove('hidden'); });
addEventListener('appinstalled', () => { installEv = null; $('b-install').classList.add('hidden'); toast('📲 Kuschelinsel ist jetzt als App installiert!'); });
$('b-install').onclick = async () => {
  if (!installEv) { $('fshelp').classList.remove('hidden'); return; }
  installEv.prompt();
  const { outcome } = await installEv.userChoice.catch(() => ({}));
  if (outcome === 'accepted') $('b-install').classList.add('hidden');
  installEv = null;
};
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
  async ui(kind, d) {
    if (kind.startsWith('w:')) { uiW(kind.slice(2), d); return; } // Inselleben 4 (client/fun2.js)
    if (kind.startsWith('v:')) { uiV(kind.slice(2), d); return; } // Inselleben 5 (client/fun3.js)
    if (kind.startsWith('e:')) { uiE(kind.slice(2), d); return; } // Inselleben 6 (client/fun4.js)
    if (kind.startsWith('f:')) { uiF(kind.slice(2), d); return; } // Inselleben 7 (client/fun5.js)
    if (kind.startsWith('g:')) { uiG(kind.slice(2), d); return; } // Inselleben 8 (client/fun6.js)
    if (kind.startsWith('h:')) { uiH(kind.slice(2), d); return; } // Inselleben 11 (client/fun9.js)
    if (kind === 'app') openApp(d.app);
    if (kind === 'phdel' && confirm('Foto löschen?')) { photos.del(+d.id).then(() => { const g = $('photogrid'); if (g) delete g.dataset.done; }); }
    if (kind === 'phsave') photos.get(+d.id).then(p => p && shareImage(p.url, `kuschelinsel-tag${p.day || ''}.jpg`));
    if (kind === 'phcard') { G.cardFor = +d.id; const g = $('photogrid'); if (g) delete g.dataset.done; $('pbody').scrollTop = 0; }
    if (kind === 'cardno') { G.cardFor = null; const g = $('photogrid'); if (g) delete g.dataset.done; }
    if (kind === 'cardsend' || kind === 'cardshare') {
      const p = await photos.get(G.cardFor), text = $('cardtxt')?.value.trim() || 'Liebe Grüße von der Insel!';
      if (!p) return;
      const to = G.players[d.to]?.name, url = await photos.postcard(p.url, text, profile.name, kind === 'cardsend' ? to : '');
      if (kind === 'cardshare') shareImage(url, 'kuschelinsel-postkarte.jpg');
      else {
        const small = await photos.shrink(url, 820, 0.8);
        if (G.role === 'host') G.net?.send(d.to, { t: 'card', url: small, from: profile.name }); else G.conn?.send({ t: 'card', to: d.to, url: small });
        toast(`📮 Postkarte an ${to} verschickt!`); play('love');
      }
      G.cardFor = null; const g = $('photogrid'); if (g) delete g.dataset.done;
    }
    if (kind === 'melset') { const i = +d.i, n = +d.n; G.melEdit ||= (G.s.melody?.notes || XS.MEL_DEFAULT).slice(); G.melEdit[i] = G.melEdit[i] === n ? 0 : n; if (G.melEdit[i]) pianoNote(XS.MEL_NOTES[n], 0.6, 0.3); }
    if (kind === 'melplay') playMelody(G.melEdit);
    if (kind === 'melsave' && G.melEdit) send({ t: 'melody', notes: G.melEdit, by: profile.name });
    if (kind === 'melreset') G.melEdit = null;
    if (kind === 'patpick') { const i = +d.i; G.patEdit = { i, px: G.s.patterns?.[i]?.px || PAT.emptyPat(), c: G.patEdit?.c ?? 2, tool: G.patEdit?.tool || 'pen' }; }
    if (kind === 'patcol' && G.patEdit) G.patEdit.c = +d.c;
    if (kind === 'pattool' && G.patEdit) G.patEdit.tool = d.t;
    if (kind === 'patclear' && G.patEdit && confirm('Muster leeren?')) { G.patEdit.px = PAT.emptyPat(); drawPat(); }
    if (kind === 'patsave' && G.patEdit) send({ t: 'patsave', i: G.patEdit.i, px: G.patEdit.px, name: $('patname')?.value || '', by: profile.name });
    if (kind === 'patwear' && G.patEdit) {
      const px = G.s.patterns?.[G.patEdit.i]?.px;
      if (px) { profile.look = { ...profile.look, pat: profile.look.pat === px ? undefined : px }; profile.look = cleanLook(profile.look); saveProfile(); sendLook(); toast(profile.look.pat ? '👕 Du trägst jetzt dein Muster!' : '👕 Muster ausgezogen'); }
    }
    if (kind === 'stalladd') {
      const id = $('stid')?.value, n = Math.max(1, Math.min(99, +$('stn')?.value || 1)), swap = $('stmode')?.value === 'swap';
      const a = { t: 'stalladd', id, n };
      if (swap) Object.assign(a, { want: $('stwant')?.value, wn: Math.max(1, Math.min(99, +$('stwn')?.value || 1)) });
      else a.price = Math.round(+$('stprice')?.value || 0);
      if (!swap && !(a.price > 0)) { toast('🏪 Bitte einen Preis eintragen.'); return; }
      for (const i of document.querySelectorAll('#pbody .stallform input')) i.value = i.id === 'stn' || i.id === 'stwn' ? '1' : '';
      send(a);
    }
    if (kind === 'annivfounded') { const v = $('anfounded')?.value; if (v) send({ t: 'anniv', op: 'founded', date: v }); }
    if (kind === 'annivadd') {
      const n = $('anname')?.value.trim(), v = $('andate')?.value;
      if (!n || !v) { toast('💕 Erst einen Namen und ein Datum eintragen!'); return; }
      send({ t: 'anniv', op: 'add', name: n, date: v });
      $('anname').value = '';
    }
    if (kind === 'give' && G.players[d.id]) { G.giveTo = d.id; panels.show('give'); }
    if (kind === 'pave') { G.pathType = d.k; openBuild('wege'); if (G.build) { G.build.path = d.k; setBuildCat('wege'); renderBuild(); } }
    if (kind === 'build') openBuild(d.cat);
    if (kind === 'emote') { sendEmote(d.e); panels.close(); }
    if (kind === 'write') panels.show('letter');
    if (kind === 'sendletter') {
      const to = $('ltto')?.value.trim(), text = $('lttext')?.value.trim(), item = $('ltitem')?.value || null, paper = +(document.querySelector('[data-paper].on')?.dataset.paper || 0);
      if (!to || !text) { toast('✍️ Erst einen Namen und ein paar liebe Worte eintragen!'); return; }
      send({ t: 'letter', to, text, item, paper });
      panels.close();
      world.float(G.players[G.me].x, G.players[G.me].z, '💌', 2);
    }
    if (kind === 'diaryadd') { const t = $('dytext')?.value.trim(); if (t) { send({ t: 'diary', text: t }); $('dytext').value = ''; } }
    if (kind === 'soc' && Object.hasOwn(G.players, G.together || '')) { sendSocial(G.together, d.k); panels.close(); }
    if (kind === 'leave') leave();
    if (kind === 'sail') {
      if (G.s.money < BOAT_PRICE) { toast(`Die Überfahrt kostet ${BOAT_PRICE} Taler.`); return; }
      send({ t: 'boat' });
      toast('⛵ Käpt\'n Flossi legt ab … 🎶');
      setTimeout(() => G?.ready && travel('tropic'), 600);
    }
    if (kind === 'sailhome') travel('pier');
    if (kind === 'lockadd' && WRECK_SYMS_UI.includes(d.sym)) { G.lock = [...(G.lock || []), d.sym].slice(-4); play('click'); panels.sig = null; }
    if (kind === 'lockreset') { G.lock = []; panels.sig = null; }
    if (kind === 'echoadd' && ECHO_NOTES[+d.i]) { G.echo = [...(G.echo || []), +d.i].slice(-4); pianoNote(ECHO_NOTES[+d.i], 0.6, 0.5); panels.sig = null; }
    if (kind === 'echoreset') { G.echo = []; panels.sig = null; }
    if (kind === 'echoplay') (G.s.depth?.song || []).forEach((n, i) => setTimeout(() => pianoNote(ECHO_NOTES[n], 0.7, 0.5), i * 450));
    if (kind === 'echoopen' && G.echo?.length === 4) { send({ t: 'depth', op: 'song', notes: G.echo }); G.echo = []; panels.sig = null; }
    if (kind === 'lockopen' && G.lock?.length === 4) { send({ t: 'wreck', op: 'open', code: G.lock }); G.lock = []; panels.sig = null; }
    if (kind === 'gamestart') send({ t: 'game', op: 'start', k: d.k, vs: d.vs, vsName: d.vsName, name: profile.name });
    if (kind === 'cstsec') { G.cst = { sec: ((G.cst?.sec || 0) + (+d.dir) + STAR_SECTORS) % STAR_SECTORS, lines: [], sel: null }; panels.sig = null; }
    if (kind === 'cstundo' && G.cst) { G.cst.lines.pop(); G.cst.sel = null; }
    if (kind === 'cstsave' && G.cst?.lines.length) {
      const n = $('cstname')?.value.trim();
      if (!n) { toast('✨ Gib deinem Sternbild erst einen Namen.'); return; }
      send({ t: 'sternbild', op: 'add', n, sec: G.cst.sec, l: G.cst.lines, by: profile.name });
      G.cst = { sec: G.cst.sec, lines: [], sel: null }; $('cstname').value = ''; panels.sig = null;
    }
    if (kind === 'cstdel') send({ t: 'sternbild', op: 'del', i: +d.i });
    if (kind === 'photocam') { panels.close(); setPhoto(true); toast(`🏆 Thema der Woche: ${PHOTO_THEMES[photoTheme(G.s)][0]} ${PHOTO_THEMES[photoTheme(G.s)][1]} – mit 🏆 einreichen!`); }
    if (kind === 'cablego') { panels.close(); toast('🚡 Die Gondel schwebt los … 🎶'); play('gondola'); setTimeout(() => G?.ready && travel('cable:' + d.to), 650); }
    if (kind === 'trip') {
      if (G.s.money < TRIP_PRICE) { toast(`Der Ausflug kostet ${TRIP_PRICE} Taler.`); return; }
      send({ t: 'tripgo' });
      toast('⛵ Leinen los – ins Blaue! 🎶');
      setTimeout(() => G?.ready && travel('trip'), 900);
    }
    if (kind === 'dance') { panels.close(); sendEmote('💃'); animate('shake'); world.float(G.players[G.me].x, G.players[G.me].z, '🎶✨', 2); toast('🪩 DJ Quak legt auf – tanzt los!'); }
    if (kind === 'fullscreen') toggleFullscreen();
    if (kind === 'editlook') openEditor();
    if (kind === 'photo') setPhoto(true);
    if (kind === 'backup') { saveFarm(); const f = store.get('ki.islands', {})[G.key]; if (f) { backup.download([[G.key, f]], backup.fileName(f.name)); toast('💾 Insel als Datei gesichert!'); } }
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
  if (G.train) endTrain();
  if (G.fishing) stopFishing();
  G.goal = null;
}
// Apps im Inselhandy
function openApp(app) {
  play('click');
  const P = { map: ['map'], shop: ['shop'], sell: ['sell'], quests: ['orders', 'quests'], album: ['orders', 'album'], museum: ['museum'], recipes: ['recipes'], turnip: ['turnip'],
    friends: ['friends'], goals: ['orders', 'goals'], emotes: ['emotes'], settings: ['settings', 'options'], diary: ['diary'], fests: ['fests'], news: ['news'], book: ['book'], catalog: ['catalog'], patterns: ['patterns'], piano: ['piano'], stars: ['stars'], contest: ['book', 'contest'], guide: ['guide'], ...APP_PANELS_W, ...APP_PANELS_V, ...APP_PANELS_6, ...APP_PANELS_7, ...APP_PANELS_8 }[app];
  if (P) { panels.show(...P); return; }
  panels.close();
  if (app === 'camera') setPhoto(true);
  if (app === 'sky') toggleSky();
  if (app === 'designer') openBuild('wege');
  if (app === 'build') openBuild();
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
  const url = world.snapshot();
  const id = await photos.add(isleKey(), await photos.shrink(url, 1100, 0.86), { kind: 'photo', day: G?.s?.day });
  toast(id ? '📸 Foto im Fotobuch gespeichert! (📱 → 📸 Fotobuch → 🖼️ Fotos)' : '📸 Foto konnte nicht gespeichert werden');
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
const busy = () => !G?.ready || !!G.kite || !!G.ride || gameOn() || panels.open || editor.isOpen || G.photo || G.talk || (G.hide?.phase === 'count' && G.hide.seeker === G.me);

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeChat(); return; }
  if (!G?.ready) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (G.kite) { endKite(); return; }
    if (G.build) { if (G.build.pend) cancelBuild(); else closeBuild(); return; }
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
  if (k === 'g') { if (G.build) closeBuild(); else openBuild(); return; }
  if (G.build && k === 'r') { rotateBuild(); return; }
  if (G.build && k === 'x') { togglePick(); return; }
  if (G.build?.pend && k === 'enter') { confirmBuild(); return; }
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
  else if (e.pointerType !== 'mouse' && G) G.hover = null;
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
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && G) G.hover = null; });
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
initPad({ get G() { return G; }, world, joy, keys, settings, get panels() { return panels; }, toast: t => toast(t), cycle: d => { const h = G?.hot || [], i = h.indexOf(G.sel); if (h.length) select(h[(i + d + h.length) % h.length]); } });
function select(id, quiet) {
  if (id === 'pave' && G.sel === 'pave' && !quiet) { panels.show('designer'); play('click'); }
  if (id === 'pave' && !G.pathType) G.pathType = 'erde';
  G.sel = id;
  G.popSel = id;
  G.hotSig = null;
  if (G.fishing) stopFishing();
}

// ---------- Baumodus ----------
// Aufstellen, Einrichten, Wege legen und Abbauen geht nur hier: unten eine Leiste mit Kategorien und den Sachen aus der Tasche,
// auf dem Feld eine Vorschau. Draußen auch Inselprojekte (die man jetzt wieder abbauen und versetzen kann).
const OUT_CATS = [['deko', '🏮 Deko'], ['garten', '🌳 Garten'], ['projekte', '🏗️ Projekte'], ['wege', '🧱 Wege'], ['haus', '🏠 Haus']]; // ✋ Aufheben: eigener Knopf oben (#bpick)
const IN_CATS = [['alle', '🏠 Alle'], ['sitzen', '🪑 Sitzen'], ['tische', '🍽️ Tische'], ['betten', '🛏️ Betten'], ['licht', '💡 Licht'], ['deko', '🧸 Deko'], ['pflanzen', '🪴 Pflanzen'], ['kueche', '🍳 Küche'], ['bad', '🛁 Bad'], ['teppiche', '🟫 Teppiche'], ['wand', '🖼️ Wand'], ['lackieren', '🖌️ Lackieren']];
function buildList(b) {
  const inv = G.s.inv;
  if (b.inside) return Object.keys(FURNITURE).filter(id => inv[id] > 0 && (b.cat === 'alle' || FURNITURE[id].cat === b.cat));
  const kind = id => PLACE[id]?.kind;
  if (b.cat === 'projekte') return Object.keys(PLACE).filter(id => inv[id] > 0 && (kind(id) === 'project' || kind(id) === 'site'));
  if (b.cat === 'garten') return Object.keys(PLACE).filter(id => inv[id] > 0 && (kind(id) === 'producer' || PLACE[id].garden));
  return Object.keys(PLACE).filter(id => inv[id] > 0 && !['project', 'site', 'producer'].includes(kind(id)) && !PLACE[id].garden);
}
function openBuild(cat) {
  if (!G?.ready) return;
  const me = G.players[G.me], zone = zoneOf(me);
  if (zone !== 'island' && zone !== 'home') { toast('🔨 Bauen geht nur auf eurer Insel und im Haus.'); return; }
  if (me.sw) { toast('🔨 Erst an Land schwimmen.'); return; }
  interrupt();
  panels.close();
  if (me.pose) standUp(me);
  const inside = zone === 'home', room = inside ? S.roomIdAt(me.z) : null;
  if (room && !V.XROOMS[room] && S.hearts(G.s, room) < 3) { toast('🔨 Hier darfst du erst ab 3 Herzen einrichten.'); return; }
  G.build = { inside, room, z0: room ? S.roomOf(G.s, room).z0 : 0, cat: cat || (inside ? 'alle' : 'deko'), item: null, r: 0, mode: 'place', path: G.pathType || 'erde', zoom: world.zoom };
  world.zoom = Math.max(world.zoom, inside ? 1.15 : 1.45);
  document.body.classList.add('building');
  $('buildbar').classList.remove('hidden');
  G.buildSig = null;
  renderBuild();
  play('click');
  if (!store.get('ki.buildTip', false)) { store.set('ki.buildTip', true); store.set('ki.pickTip', true); toast('🔨 Baumodus: unten etwas auswählen und aufs Feld tippen – dort erscheint die Vorschau. Mit 🔄 drehen, mit ✔ hinstellen. Auf Aufgestelltes tippen hebt es auf.'); }
  else if (!store.get('ki.pickTip', false)) { store.set('ki.pickTip', true); toast('✋ Neu: Im Baumodus auf ein Möbelstück oder Deko tippen hebt es auf – dann einfach woanders hinstellen. Mit „✋ Aufheben“ oben packst du mehrere Sachen ein.', true); }
}
function closeBuild() {
  if (!G?.build) return;
  $('bconfirm').classList.add('hidden');
  world.zoom = G.build.zoom;
  G.build = null;
  world.setGhost(null);
  document.body.classList.remove('building');
  $('buildbar').classList.add('hidden');
  G.hotSig = null;
}
// ✋ Aufheben an/aus (Knopf oben in der Leiste, Taste X)
function togglePick() {
  const b = G?.build;
  if (!b) return;
  if (b.mode === 'remove') setBuildCat(b.prevCat || (b.inside ? 'alle' : 'deko'));
  else { b.prevCat = b.cat; setBuildCat('abbauen'); }
  renderBuild();
  play('click');
}
// Nach dem Aufheben das Stück gleich zum Woandershinstellen auswählen (sobald es in der Tasche ist)
function liftFor(b, pick) {
  b.want = pick.id; b.r = pick.r || 0; b.pend = null;
  const k = PLACE[pick.id]?.kind;
  if (b.mode === 'place') b.cat = b.inside ? 'alle' : k === 'project' || k === 'site' ? 'projekte' : k === 'producer' || PLACE[pick.id]?.garden ? 'garten' : 'deko';
  G.buildSig = null;
}
function setBuildCat(cat) {
  const b = G.build;
  b.cat = cat;
  b.mode = cat === 'abbauen' ? 'remove' : cat === 'lackieren' ? 'paint' : cat === 'wege' ? 'pave' : cat === 'haus' ? 'house' : 'place';
  b.pend = null;
  if (b.mode === 'place' && !buildList(b).includes(b.item)) b.item = null;
  G.buildSig = null;
}
function renderBuild() {
  const b = G.build;
  if (!b) return;
  const list = b.mode === 'place' ? buildList(b) : [];
  if (b.want && list.includes(b.want)) { b.item = b.want; b.want = null; } // gerade aufgehoben: gleich wieder hinstellen
  if (b.mode === 'place' && !b.item && list.length) b.item = list[0];
  if (b.mode === 'place' && b.item && !list.includes(b.item)) b.item = list[0] || null;
  const sig = JSON.stringify([b.cat, b.item, b.path, b.mode, list.map(id => [id, G.s.inv[id]])]);
  $('bpick').classList.toggle('on', b.mode === 'remove');
  $('bpick').textContent = b.mode === 'remove' ? '✋ Aufheben an' : '✋ Aufheben';
  if (sig === G.buildSig) return;
  G.buildSig = sig;
  $('btitle').textContent = b.inside ? '🔨 Einrichten' : '🔨 Baumodus';
  $('bcats').innerHTML = (b.inside ? IN_CATS : OUT_CATS).map(([id, l]) => `<button data-cat="${id}" class="${id === b.cat ? 'on' : ''}">${l}</button>`).join('');
  let h = '';
  if (b.mode === 'house') h = `<div class="bnote">🏠 <b>Haus umziehen:</b> Tippe auf einen freien Platz – dort erscheint euer Haus als Vorschau (mit Briefkasten). Ein Umzug kostet ${S.HOUSE_MOVE_PRICE.toLocaleString("de-DE")} Taler aus der Inselkasse, drinnen bleibt alles, wie es ist.</div>`;
  else if (b.mode === 'paint') h = `<div class="bnote">🖌️ ${G.s.inv.farbpinsel > 0 ? 'Tippe auf ein Möbelstück – jedes Antippen gibt ihm die nächste Farbe (8 Farben, die letzte ist wieder natur).' : 'Dafür braucht ihr einen <b>Farbpinsel</b> aus dem Krämerladen 🛒.'}</div>`;
  else if (b.mode === 'remove') h = `<div class="bnote">✋ <b>Aufheben:</b> Tippe auf etwas, um es einzupacken – so oft du willst. Nochmal „✋ Aufheben“ drücken zum Aufstellen. ${b.inside ? 'Möbel kommen in deine Tasche.' : 'Deko kommt in deine Tasche, Inselprojekte auch – so kannst du sie woanders neu aufstellen. Baustellen geben die Spenden zurück.'}</div>`;
  else if (b.mode === 'pave') h = Object.entries(PAVE).map(([k, p]) => `<button data-path="${k}" class="${b.path === k ? 'on' : ''}"><span class="iic emo" style="color:${p.col ? '#' + p.col.toString(16).padStart(6, '0') : ''}">${p.icon}</span><small>${p.name}</small></button>`).join('') + `<button data-path="none" class="${b.path === 'none' ? 'on' : ''}"><span class="iic emo">🧹</span><small>Weg entfernen</small></button>`;
  else if (!list.length) h = `<div class="bnote">${b.inside ? 'Keine Möbel in deiner Tasche. Kauft welche im Krämerladen 🛒 oder baut sie an der Werkbank 🔨. Auf ein aufgestelltes Möbelstück tippen hebt es auf.' : b.cat === 'projekte' ? 'Wählt im 🏛️ Rathaus ein Projekt – dann liegt hier der Bauplatz-Pflock. Abgebaute Projekte landen auch hier.' : 'Hier ist gerade nichts in deiner Tasche. Deko gibt es im Krämerladen 🛒 und an der Werkbank 🔨.'}</div>`;
  else h = list.map(id => `<button data-item="${id}" class="${b.item === id ? 'on' : ''}" title="${esc(ITEMS[id].name)}">${itemIcon(id)}<small>${esc(ITEMS[id].name)}</small><span class="n">${G.s.inv[id]}</span></button>`).join('');
  $('bitems').innerHTML = h;
  fillIcons($('bitems'));
}
$('buildbtn').onclick = () => { if (G?.build) closeBuild(); else openBuild(); };
$('bdone').onclick = () => closeBuild();
$('bpick').onclick = () => togglePick();
// Aufstellen in zwei Schritten: aufs Feld tippen = Vorschau dort festhalten, drehen, dann ✔ bestätigen
function rotateBuild() { if (!G?.build) return; G.build.r = (G.build.r + 1) % 4; play('click'); }
function confirmBuild() {
  const b = G?.build;
  if (!b?.pend) return;
  const r = buildCtx(b.pend);
  if (!r.a) { toast(r.label || 'Hier geht das nicht.'); play('fail'); return; }
  buildDo(r);
  b.pend = null;
}
function cancelBuild() { if (G?.build) { G.build.pend = null; play('click'); } }
$('brot').onclick = rotateBuild;
$('bcrot').onclick = rotateBuild;
$('bcok').onclick = confirmBuild;
$('bcno').onclick = cancelBuild;
$('bcats').onclick = e => { const t = e.target.closest('button'); if (t && G?.build) { setBuildCat(t.dataset.cat); renderBuild(); play('click'); } };
$('bitems').onclick = e => {
  const t = e.target.closest('button');
  if (!t || !G?.build) return;
  if (t.dataset.item) { if (G.build.item !== t.dataset.item) G.build.r = 0; G.build.item = t.dataset.item; }
  if (t.dataset.path) G.build.path = G.pathType = t.dataset.path;
  G.buildSig = null;
  renderBuild();
  play('click');
};
// Welches Feld zeigt Maus/Finger an – oder das Feld vor der Figur?
function buildTile(at) {
  const me = G.players[G.me], b = G.build;
  const p = at || { x: me.x + Math.sin(me.ry) * 1.2, z: me.z + Math.cos(me.ry) * 1.2 };
  return b.inside ? [Math.round(p.x - S.HOME_X), Math.round(p.z - b.z0)] : [Math.round(p.x), Math.round(p.z)];
}
function buildFront() { const me = G.players[G.me]; return { x: me.x + Math.sin(me.ry) * 1.2, z: me.z + Math.cos(me.ry) * 1.2 }; }
function buildCtx(at) {
  const b = G.build, [x, z] = buildTile(at);
  if (b.mode === 'house') {
    const f = S.houseFit(G.s, x, z), money = G.s.money >= S.HOUSE_MOVE_PRICE;
    return { a: f.ok && money ? { t: 'movehouse', x, z } : null, label: !f.ok ? f.why : money ? `🏠 Haus hierher · ${S.HOUSE_MOVE_PRICE.toLocaleString("de-DE")} Taler` : `🏠 Zu wenig Taler in der Inselkasse (${S.HOUSE_MOVE_PRICE.toLocaleString("de-DE")})`, tiles: f.tiles || [[x, z]], bx: x, bz: z, house: f };
  }
  if (b.mode === 'paint') { // Möbel lackieren (Farbpinsel)
    const R = S.roomOf(G.s, b.room || null), h = S.homeAt(G.s, x, z, false, R) || S.homeAt(G.s, x, z, true, R), one = [[x + S.HOME_X, z + R.z0]];
    if (!(G.s.inv.farbpinsel > 0)) return { label: '🖌️ Erst einen Farbpinsel kaufen', tiles: one, bx: x, bz: z };
    if (!h) return { label: '🖌️ Auf ein Möbelstück tippen', tiles: one, bx: x, bz: z };
    const c = ((h.o.c || 0) + 1) % V.TINTS.length;
    return { a: { t: 'hpaint', x, z, c, ...(b.room ? { room: b.room } : {}) }, label: `🖌️ ${FURNITURE[h.o.k]?.name || ''} lackieren`, tiles: S.footprint(h.o.k, h.x, h.z, h.o.r).map(([i, j]) => [i + S.HOME_X, j + R.z0]), bx: x, bz: z };
  }
  const r = S.resolveBuild(G.s, b, x, z);
  return { ...r, bx: x, bz: z };
}
function buildTap(cx, cy) {
  const p = world.pick(cx, cy);
  if (!p) return;
  pickBuild(p);
}
// Antippen im Baumodus: Aufstellen erst merken (Vorschau), nochmal aufs selbe Feld = bestätigen; Wege & Abbauen sofort
function pickBuild(p) {
  const b = G.build;
  if (b.mode === 'place') { const r = buildCtx(p); if (r.pick) { buildDo(r); return; } } // auf Aufgestelltes getippt: aufheben
  if (b.mode !== 'house' && (b.mode !== 'place' || !b.item)) { buildDo(buildCtx(p)); return; }
  const [x, z] = buildTile(p);
  if (b.pend && b.pend.bx === x && b.pend.bz === z) { confirmBuild(); return; }
  b.pend = { x: p.x, z: p.z, bx: x, bz: z };
  play('click');
}
function buildDo(r) {
  if (!r) return;
  if (!r.a) { if (r.label) toast(r.label); play('fail'); return; }
  // Inselprojekte nur nach zweitem Antippen abbauen
  if (r.project && r.a.t === 'pickup') {
    const k = r.bx + ',' + r.bz;
    if (G.build.confirm !== k) { G.build.confirm = k; toast(`${r.label}? Nochmal antippen zum Bestätigen.`); play('click'); return; }
    G.build.confirm = null;
  }
  send(r.a);
  world.burst(r.a.x + (G.build.inside ? S.HOME_X : 0), r.a.z + (G.build.inside ? G.build.z0 : 0), 'sparkle', 0.2);
  if (r.pick && G.build.mode === 'place') { liftFor(G.build, r.pick); toast(`✋ ${ITEMS[r.pick.id]?.name || ''} aufgehoben – tippe, wo es hin soll. Oder ✔ Fertig: dann bleibt es in der Tasche.`); }
}
// Pro Bild: Vorschau, Markierung und Hinweis
function updateBuild() {
  const b = G.build;
  if (!b) return null;
  const me = G.players[G.me], zone = zoneOf(me);
  if ((b.inside && (zone !== 'home' || S.roomIdAt(me.z) !== b.room)) || (!b.inside && zone !== 'island')) { closeBuild(); return null; }
  renderBuild();
  const r = buildCtx(b.pend || (G.hover ? world.pick(G.hover.cx, G.hover.cy) : null));
  $('bhint').textContent = b.mode === 'remove' && !G.hover ? 'Tippe auf etwas zum Aufheben' : r.pick && !b.pend ? r.label : b.pend ? (b.mode === 'house' ? 'Passt es? Dann ✔ bestätigen' : 'Drehen mit 🔄 (R), dann ✔ bestätigen') : (b.mode === 'place' && b.item) || b.mode === 'house' ? 'Aufs Feld tippen – dort erscheint die Vorschau' : r.label || '';
  const pendOn = !!(b.pend && ((b.mode === 'place' && b.item) || b.mode === 'house'));
  $('bcrot').classList.toggle('hidden', b.mode === 'house');
  $('bconfirm').classList.toggle('hidden', !pendOn);
  $("brot").classList.toggle("hidden", pendOn || b.mode === 'remove');
  if (pendOn) { $('bconfirm').classList.toggle('bad', !r.a); setText('bcname', r.a ? (b.mode === 'house' ? r.label : `${ITEMS[b.item]?.icon || ''} ${ITEMS[b.item]?.name || ''}`) : `⚠️ ${r.label || 'Hier geht das nicht'}`); }
  if (b.mode === 'house') {
    const [hx, hz] = S.HOUSE_HOME, B = BUILDINGS.house, [sx, sz] = S.houseShift(), dx = r.bx - hx - sx, dz = r.bz - hz - sz;
    world.setGhost({ kind: 'house', id: 'house' + G.s.up.house, lv: G.s.up.house, x: B.cx + dx, z: B.cz + dz, fx: B.ox + dx, fz: B.oz + dz, ok: !!r.a, hold: !!b.pend });
  } else if (b.mode === 'place' && b.item && !r.pick) {
    const f = FURNITURE[b.item], rr = r.r ?? b.r;
    if (b.inside && f) {
      const [fw, fd] = rr % 2 ? [f.d, f.w] : [f.w, f.d];
      world.setGhost({ kind: 'furn', id: b.item, x: S.HOME_X + r.bx + (fw - 1) / 2, z: b.z0 + r.bz + (fd - 1) / 2, y: f.rug ? 0.005 : 0, r: rr, ok: !!r.a, hold: !!b.pend });
    } else world.setGhost({ kind: 'place', id: b.item, x: r.bx, z: r.bz, r: b.r, ok: !!r.a, hold: !!b.pend });
  } else world.setGhost(null);
  return { label: r.label, tiles: r.tiles, a: r.a, build: true, bad: !r.a };
}

// ---------- Aktionen ----------
// Was passiert am Punkt "at" (oder vor der Figur)? Andere Spieler kann man umarmen.
function context(me, at) {
  if (G.skyView) {
    const stars = G.s.starNight && 6 + G.s.dayTime * 18 >= 19;
    return stars ? (world.starActive() ? { wish: true, label: '🌠 Wünschen!', tiles: [] } : { label: '✨ Warte auf eine Sternschnuppe …', tiles: [] }) : { label: '🔭 Himmel', tiles: [] };
  }
  if (!at && G.sel === 'kite' && !S.inside(me)) return { kite: true, label: '🪁 Drachen steigen lassen', tiles: [] };
  if (G.train) return trainContext();
  if (!at) { const p8 = context8(me); if (p8) return p8; } // Träumen, Hochzeit, Surfen
  if (!at) { const p7 = context7(me); if (p7) return p7; } // Floß, Laternenumzug
  if (!at) { const pe = contextE(me); if (pe) return pe; } // Tandem
  if (!at) { const pv = contextV(me); if (pv) return pv; } // Pony
  if (!at && G.sel === 'bike') return { bike: true, label: me.bike ? '🚲 Absteigen' : '🚲 Aufs Fahrrad', tiles: [] };
  if (!at && (G.sel === 'bino' || G.sel === 'sled')) { const c = contextW(me, null); if (c) return c; }
  const p = at || { x: me.x + Math.sin(me.ry) * 0.9, z: me.z + Math.cos(me.ry) * 0.9 };
  const n = world.npcNear(p.x, p.z, at ? 0.9 : 1.1);
  if (n?.visitor) return { ui: 'visitor', visitor: n.id, label: `💬 ${NPCS[n.id].name}`, tiles: [], px: n.x, pz: n.z };
  if (n) return { npc: n.id, label: `💬 ${NPCS[n.id].name}`, tiles: [], px: n.x, pz: n.z };
  for (const o of Object.values(G.players)) {
    if (o.id !== G.me && Math.hypot(o.x - p.x, o.z - p.z) < 0.75) return { hug: o.id, label: `🤗 ${o.name} umarmen`, tiles: [], px: o.x, pz: o.z };
  }
  const rr = S.resolve(G.s, me, G.sel === 'pave' ? 'pave:' + (G.pathType || 'erde') : G.sel, at);
  if (!at) { const sb = contextW(me, rr); if (sb) return sb; } // Schneeball
  return { ...rr, px: p.x, pz: p.z };
}

function pressAction() {
  if (G?.build) { if (G.build.pend) confirmBuild(); else pickBuild(G.hover ? world.pick(G.hover.cx, G.hover.cy) || buildFront() : buildFront()); return; }
  if (G?.kite) { kitePull(); return; }
  if (G?.train) { endTrain(); return; }
  if (G?.fride || busy7() || busy8()) return;
  if (busy()) return;
  actHeld = true;
  nextAct = performance.now() + 380;
  G.goal = null;
  const me = G.players[G.me];
  if (me.pose && !G.ctx?.dreamIn) { standUp(me); return; }
  if (G.fishing) { reelIn(); return; }
  const a = G.aim; // mit der Maus gezielt: zum Ziel drehen
  if (a?.near && G.ctx === a.r && a.d > 0.05) me.ry = Math.atan2(a.hit.x - me.x, a.hit.z - me.z);
  execute(G.ctx, true);
}

function execute(r, fresh) {
  if (!r) return;
  if (execute10(r, fresh)) return;
  if (execute9(r, fresh)) return;
  if (execute8(r, fresh)) return;
  if (executeW(r, fresh)) return;
  if (executeV(r, fresh)) return;
  if (executeE(r, fresh)) return;
  if (execute7(r, fresh)) return;
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
      if (r.reef) { if (!G.s.reef?.found) send({ t: 'reef', op: 'found' }); travel('reef'); return; }
      if (r.wreck) { if (!G.s.wreck?.found) send({ t: 'wreck', op: 'found' }); travel('wreck'); return; }
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
  if (r.kite) { if (fresh) startKite(); return; }
  if (r.bike) { if (fresh) setBike(!me.bike); return; }
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
  if ((r.ui || r.enter || r.visit) && fresh) world.boingNear(me.x, me.z);
  if (r.visit) {
    if (fresh) { interrupt(); travel('nroom:' + r.visit); } // die Tür steht immer offen – auch wenn niemand da ist oder schon geschlafen wird
    return;
  }
  if (r.petals) { if (fresh) { animate('shake'); if (r.shake) world.shakeNear(r.shake[0], r.shake[1]); for (let i = 0; i < 6; i++) world.burst(r.petals.x, r.petals.z, 'petal', 2.2); play('water'); } return; }
  if (r.ui) {
    if (!fresh) return;
    interrupt();
    if (r.slot !== undefined) G.reefSlot = r.slot;
    if (r.castle) G.castleK = r.castle;
    G.uiAt = r.uid || null; // welches Becken, welcher Stand …
    if (r.visitor) { G.visitor = r.visitor; G.vline = null; send({ t: 'vtalk', id: r.visitor }); for (let i = 0; i < 4; i++) setTimeout(() => speak('aeiou'[i], NPCS[r.visitor].voice || {}), i * 90); }
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
    else if (r.room && V.XROOMS[r.room]) { const e = exitV(r.room), ok = e && freeAt(e[0], e[1]); Object.assign(me, ok ? { x: e[0], z: e[1], ry: 0 } : r.room === 'tree' ? { x: BUILDINGS.house.cx, z: BUILDINGS.house.z1 + 1.4, ry: 0 } : { x: S.HOME_X, z: d / 2 - 1.2, ry: Math.PI }, { pose: null }); }
    else if (r.room && BUILDINGS['vh_' + r.room]) { const B = BUILDINGS['vh_' + r.room]; Object.assign(me, { x: B.cx, z: B.z1 + 1.3, ry: 0, pose: null }); }
    else Object.assign(me, { x: BUILDINGS.house.cx, z: BUILDINGS.house.z1 + 1.4, ry: 0, pose: null });
  } else if (r.sleep) {
    if (!fresh) return;
    const a = r.sleep.r * Math.PI / 2, side = r.sleep.wide ? (G.me === 'h' ? -0.45 : 0.45) : 0; // Fußende, im Doppelbett nebeneinander
    Object.assign(me, { x: r.sleep.x + Math.sin(a) * 0.6 + Math.cos(a) * side, z: r.sleep.z + Math.cos(a) * 0.6 - Math.sin(a) * side, ry: a, pose: 'sleep' });
    const h = 6 + G.s.dayTime * 18;
    toast(h >= 18 ? (Object.keys(G.players).length > 1 ? '😴 Gute Nacht! Wenn alle im Bett liegen, beginnt ein neuer Tag.' : '😴 Gute Nacht!') : '😴 Ein kleines Nickerchen … (Schlafen geht ab 18 Uhr bis zum Morgen)');
  } else if (r.sit) {
    if (fresh) { Object.assign(me, { x: r.sit.x, z: r.sit.z, ry: r.sit.r * Math.PI / 2, pose: 'sit' }); if (r.bath) send({ t: 'volc', op: 'bath' }); }
  } else if (r.fish) {
    if (fresh) startFishing(me);
  } else if (r.a && (fresh || r.a.t !== 'pickup')) {
    send(r.a);
    animate(ANIM_OF[r.a.t] || ANIM_OF[r.a.how] || 'use'); // Gebiete & Ausflüge: how = chop/shake/mine/pick
    if (r.shake) world.shakeNear(r.shake[0], r.shake[1]); // Bäume & Büsche an den Ausflugsorten
    else if (r.a.t === 'shake' || r.a.t === 'chop') world.shakeTree(r.a.x, r.a.z);
    else if (r.a.x !== undefined) world.squishAt(r.a.x, r.a.z, r.a.t === 'mine' ? 0.1 : 0.2);
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
  else if (S.inside(me)) { const R = S.roomOf(G.s, S.roomIdAt(me.z)); me.x = S.HOME_X; me.z = R.z0 + R.size[1] / 2 - 0.7; }
}

function tapAt(cx, cy) {
  if (G?.build) { buildTap(cx, cy); return; }
  if (G?.kite) { kitePull(); return; }
  if (busy() || G.train || busy6() || busy7() || busy8()) return;
  const me = G.players[G.me];
  if (G.fishing) { reelIn(); return; }
  const t = aimAt(cx, cy);
  if (!t) return;
  const { hit } = t;
  if (me.pose) standUp(me);
  if (hit.m && (hit.kind === 'thing' || hit.kind === 'building') && usable(t.r)) world.squish(hit.m, hit.kind === 'building' ? 0.04 : 0.1, 0.35);
  // nah genug dran? Dann sofort benutzen, sonst erst hinlaufen
  if (t.near) {
    G.goal = null;
    if (t.d > 0.05) me.ry = Math.atan2(hit.x - me.x, hit.z - me.z);
    execute(t.r, true);
    return;
  }
  G.goal = hit.kind === 'npc' ? { npc: hit.id } : hit.kind === 'animal' ? { animal: hit.id } : hit.kind === 'player' ? { player: hit.id } : { x: hit.x, z: hit.z };
  G.goal.last = { x: me.x, z: me.z, t: performance.now() };
  world.burst(hit.x, hit.z, 'sparkle', 0.15);
}

// Was zeigen Maus oder Finger an – und kann die Figur es von hier aus benutzen?
const usable = r => !!r && !!(usable9(r) || usable10(r) || r.dreamIn || r.wedYes || r.surf || r.raft || r.paradeEnd || r.bigfish || r.bino || r.sled || r.snowball || r.canoe || r.a || r.ui || r.go || r.kite || r.bike || r.enter || r.exit || r.visit || r.npc || r.hug || r.sit || r.sleep || r.fish || r.net || r.petals || r.dive || r.wish);
const reachOf = r => r.npc ? 1.9 : r.hug ? 1.5 : r.ui || r.go || r.enter || r.exit || r.visit ? 2.2 : r.fish ? 1.8 : r.net ? 2 : 1.6;
function aimAt(cx, cy) {
  const me = G.players[G.me];
  const hit = world.pickThing(cx, cy, me);
  if (!hit) return null;
  let r;
  if (hit.kind === 'npc') r = { npc: hit.id, label: `💬 ${NPCS[hit.id].name}`, tiles: [], px: hit.x, pz: hit.z };
  else if (hit.kind === 'player') { const o = G.players[hit.id]; r = o ? { hug: o.id, label: `🤗 ${o.name} umarmen`, tiles: [], px: o.x, pz: o.z } : null; }
  else r = context(me, hit);
  if (!r) return null;
  const d = Math.hypot(hit.x - me.x, hit.z - me.z);
  return { hit, r, d, near: usable(r) && d <= reachOf(r) };
}

// Ortswechsel: Bummelgasse, Tropeninsel (mit dem Boot) und zurück
// Insel-Erweiterungen: hinein (am Südrand ankommen) und zurück vors Tor auf der Insel
// Zu Besuch im Zimmer eines Nachbarn
function nroomTravel(id) {
  if (!NPCS[id]) return null;
  const z0 = S.nroomZ(id), w = wishNow(G.s, id), st = nhomeState(G.s, id), n = NPCS[id], N = nhomeNews(G.s, id), h3 = S.hearts(G.s, id) >= 3;
  const hello = st === 'home' ? `🏠 ${n.icon} ${n.name}: „Komm rein!“${w && h3 ? ' – sprich mich an, ich hab einen Einrichtungswunsch.' : N && !N.told ? ' – ich muss dir was zeigen!' : ''}` : doorNote(G.s, id);
  return [S.HOME_X, z0 + S.NROOM_SIZE[1] / 2 - 0.7, Math.PI, hello, 'door'];
}
// Höhlen-Tiefen: hinab (depth:N) oder hinauf (depthup:N)
function depthTravel(where) {
  const [k, n] = where.split(':'), lv = +n;
  if (!DEPTH_LV[lv]) return null;
  if (k === 'depth') {
    const L = DEPTH_LV[lv], first = !(G.s.depth?.lv > lv);
    if (first) send({ t: 'depth', op: 'enter', lv });
    return [L.x + DEPTH_UP[0], DEPTH.z + DEPTH_UP[1] - 1.8, Math.PI, first ? '' : `${L.icon} ${L.name}`, 'door'];
  }
  if (lv === 0) return [DEPTH_STAIRS[0], DEPTH_STAIRS[1] + 1.5, 0, '💎 Zurück in der Kristallhöhle.', 'door'];
  const L = DEPTH_LV[lv - 1];
  return [L.x + DEPTH_DOOR[0], DEPTH.z + DEPTH_DOOR[1] + 1.8, 0, `${L.icon} ${L.name}`, 'door'];
}
// Seilbahn: Talstation auf der Insel oder Haltestelle im Gebiet
function cableTravel(id) {
  const st = cableBuilt(G.s);
  if (!st) return null;
  if (id === 'island') {
    const [x, z] = st[0].split(',').map(Number), spot = [[0, 2.2], [2.2, 0], [-2.2, 0], [0, -2.2]].find(([a, b]) => freeAt(x + a, z + b)) || [0, 2.2];
    return [x + spot[0], z + spot[1], 0, '🚡 Zurück an der Talstation.', 'door'];
  }
  if (!S.AREAS[id] || !G.s.areas?.[id]) return null;
  const [x, z] = cableStop(id), A = S.AREAS[id];
  return [x + 1.1, z, Math.PI, `🚡 ${A.icon} ${A.name} – Haltestelle. Zurück geht's hier mit der Gondel.`, 'door'];
}
function areaTravel(where, me) {
  const A = S.AREAS[where];
  if (A) return [A.x, A.z + A.d - 0.6, Math.PI, `${A.icon} ${A.name}${A.cave ? ' – Schaufel bereithalten, die Erzadern glitzern!' : ' – schau dich um!'}`, 'door'];
  if (where === 'island' && me.x < -150) {
    const B = S.AREAS[S.areaOf(me)];
    return [B.gate[0], B.gate[1] + 1.3, 0, '', 'door'];
  }
  return null;
}
function travel(where) {
  const me = G.players[G.me];
  interrupt();
  panels.close();
  fade();
  const to = travel8(where) || travel7(where) || travel6(where) || travelV(where) || travelW(where) || (where.startsWith('depth') ? depthTravel(where) : where.startsWith('nroom:') ? nroomTravel(where.slice(6)) : where.startsWith('cable:') ? cableTravel(where.slice(6)) : me.x < -150 && where === 'island' ? areaTravel(where, me) : {
    street: [STREET.x, STREET.z + STREET.d - 0.4, Math.PI, '🛍️ Willkommen in der Bummelgasse!', 'door'],
    island: [BUILDINGS.gate.cx, BUILDINGS.gate.z1 + 1.3, 0, '', 'door'],
    tropic: [TROPIC.x, TROPIC.z + 11.6, Math.PI, '🏝️ Willkommen auf der Tropeninsel! Kiki in der Hütte hat Touren für euch.', 'splash'],
    pier: [-9, 22.6, Math.PI, '⛵ Zurück auf eurer Insel.', 'splash'],
    trip: [TRIP.x, TRIP.z + TRIP.r + 1.8, Math.PI, '', 'splash'],
    reef: [REEF.x, REEF.z + REEF.r - 2.6, Math.PI, G.s.reef?.found ? '🪸 Hinab ins Korallenriff!' : '🪸 Ein ganzes Riff unter der Boje! ✨ Fundstellen absuchen, auf die Steinplatten Korallen & Muscheln setzen.', 'bubble'],
    reefup: [REEF_BUOY[0], REEF_BUOY[1] + 0.8, 0, '🫧 Wieder an der Oberfläche!', 'splash'],
    wreck: [WRECK.x, WRECK.z + WRECK.r - 2.6, Math.PI, G.s.wreck?.found ? '⚓ Hinab zum Schiffswrack!' : '⚓ Ein altes Segelschiff! Öffnet die ✨ Truhen – irgendwo steckt ein Hinweis auf die Kapitänskajüte.', 'bubble'],
    wreckup: [WRECK_BUOY[0], WRECK_BUOY[1] + 0.8, 0, '🫧 Wieder an der Oberfläche!', 'splash'],
  }[where] || areaTravel(where, me));
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
    range = r.reach || (r.hug ? 0.95 : r.a || r.sit ? 1.05 : r.ui || r.go ? 1.6 : r.fish ? 1.2 : 0.15);
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
  if (!act || g.follow) return;
  if (g.npc) { openTalk(g.npc); return; }
  const r = g.player ? context(me, null) : context(me, at);
  if (g.player && r.hug !== g.player) return;
  execute(r, true);
}

// ---------- Gespräche mit Nachbarn ----------
function talkCtx(id) {
  const s = G.s, partner = Object.values(G.players).find(p => p.id !== G.me);
  return { hearts: S.hearts(s, id), season: S.seasonOf(s.day), weather: s.weather, hour: 6 + s.dayTime * 18, player: profile.name, partner: partner?.name || null, day: s.day, fest: S.festOf(s.day), bday: S.birthdayOf(s.day) };
}
const anyOf = a => a[Math.floor(Math.random() * a.length)];
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
  const ctx = talkCtx(id), tale = taleState(G.s, id), home = S.inside(me) && S.roomIdAt(me.z) === id, wish = home ? wishNow(G.s, id) : null;
  updTale(id);
  const h3 = h >= 3, news = home ? nhomeNews(G.s, id) : null;
  $('dlgwish').classList.toggle('hidden', !home || !h3);
  if (home) {
    if (news && !news.told) { say2(news.say); send({ t: 'nhome12', op: 'told', id }); }
    else say2(!h3 ? anyOf(['Oh, Besuch! Schau dich ruhig um – ich richte mich gerade erst ein.', 'Schön, dass du vorbeischaust! Wenn wir uns besser kennen, darfst du mir beim Einrichten helfen.', 'Mach es dir bequem! Wie gefällt dir mein Zuhause?']) : wish ? `Schön, dass du mich besuchst! Ich hätte da einen Wunsch: ${wish.t}` : 'Mein Zimmer ist ein Traum – dank dir! Setz dich doch!');
    world.npcSay(id, 'happy'); play('chat'); return;
  }
  say2(festLine(id, ctx) || (tale.ready ? (tale.t.ch ? `Du, ${profile.name || 'du'} … erinnerst du dich an „${tale.T.title}“? Ich hätte da noch eine Idee! (📖)` : `Du, ${profile.name || 'du'} … darf ich dir etwas erzählen? Ich hab da so einen Traum. (📖)`) : npcLine(id, ctx)));
  world.npcSay(id, 'happy');
  play(ctx.bday === id ? 'party' : 'chat');
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
// Knopf „Geschichte“ im Gespräch: neue Geschichte, Erinnerung oder „Erledigt!“
const taleCan = st => st.active && (st.t.ok || (st.C.kind === 'give' && (G.s.inv[st.C.item] || 0) >= st.C.n));
function updTale(id) {
  const b = $('dlgtale'), st = taleState(G.s, id), show = !st.done && (st.ready || st.active);
  b.classList.toggle('hidden', !show);
  if (!show) return;
  const can = taleCan(st);
  b.textContent = st.ready ? `📖 ${st.t.ch ? 'Weiter: Kapitel ' + (st.t.ch + 1) : 'Geschichte'}` : can ? '✨ Erledigt!' : '📖 Was war nochmal?';
  b.classList.toggle('pink', st.ready || can);
  b.classList.toggle('white', !(st.ready || can));
}
function closeTalk() {
  clearInterval(typeTimer);
  if (G) G.talk = null;
  world.npcTalk = null;
  document.body.classList.remove('talking');
  $('dialog').classList.add('hidden');
}
function giftAnswer(reaction, bday) {
  const id = G.talk.id;
  say2(bday && reaction !== 'dislike' ? `Ein Geburtstagsgeschenk für mich?! ${ITEMS[G.talk.gift]?.name || ''} – das ist ja wunderschön! Danke, danke, DANKE! 🎂` : giftReply(id, reaction, ITEMS[G.talk.gift]?.name || ''));
  if (bday) { const n = world.npcM.get(id); if (n) { world.burst(n.x, n.z, 'coin', 1.6); for (let i = 0; i < 5; i++) world.float(n.x + (Math.random() - 0.5) * 1.4, n.z, ['🎉', '🎂', '🎈', '✨'][i % 4], 1.4 + Math.random()); } play('party'); }
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
  if (b.dataset.dlg === 'nwish') { $('dlggifts').classList.add('hidden'); send({ t: 'nwish', id }); play('click'); }
  if (b.dataset.dlg === 'tale') {
    $('dlggifts').classList.add('hidden');
    const st = taleState(G.s, id);
    if (st.done) return;
    if (st.ready) { send({ t: 'tale', id, op: 'start' }); play('chat'); }
    else if (st.active) {
      if (taleCan(st)) send({ t: 'tale', id, op: 'finish' });
      else { say2(`${st.C.ask} ${st.C.kind === 'give' ? `(${G.s.inv[st.C.item] || 0}/${st.C.n} ${ITEMS[st.C.item].icon})` : `(${st.t.p || 0}/${st.C.n})`}`); play('chat'); }
    }
  }
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

const WRECK_SYMS_UI = ['⚓', '🐚', '⭐', '🐟'];

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

// ---------- Feste: Turnier-Anzeige, Feuerwerk, Pfützen ----------
world.onBoom = () => play('boom');
function updateFest(me, now) {
  const s = G.s, c = s.contest, run = c?.runs?.[G.me], hour = 6 + s.dayTime * 18;
  const txt = run ? `${c.k === 'fish' ? '🎣' : '🦋'} ${Math.max(0, Math.ceil(run.until - s.time))} s · ${run.n} ${c.k === 'fish' ? 'Fische' : 'Insekten'}` : '';
  setText('contestpill', txt);
  $('contestpill').classList.toggle('hidden', !txt);
  // Ergebnisse (für alle sichtbar)
  const res = c?.res || [];
  if (G.resSeen === undefined || G.resDay !== s.day) { G.resSeen = res.length; G.resDay = s.day; }
  for (const r of res.slice(G.resSeen)) {
    const medal = { gold: '🥇 Gold', silber: '🥈 Silber', bronze: '🥉 Bronze' }[r.medal] || 'Danke fürs Mitmachen';
    toast(`🏆 ${r.name}: ${r.n} ${c.k === 'fish' ? 'Fische' : 'Insekten'} – ${medal}! +${r.money} Taler${r.item ? ` und ein ${ITEMS[r.item].icon} ${ITEMS[r.item].name}` : ''}`, 'ach');
    const p = Object.values(G.players).find(q => q.name === r.name);
    if (p) { world.burst(p.x, p.z, 'coin', 1.6); for (let i = 0; i < 4; i++) world.float(p.x + (Math.random() - 0.5), p.z, ['🏆', '🎉', '✨'][i % 3], 1.6 + Math.random()); }
    play(r.medal ? 'fanfare' : 'ach');
  }
  G.resSeen = res.length;
  // Sommerfeuerwerk über dem Meer (19–24 Uhr)
  const home = Math.abs(me.z) < 150 && me.x < 150;
  if (s.melody && hour >= 12 && hour < 13 && G.melDay !== s.day && home && Math.hypot(me.x, me.z + 4) < 20) { G.melDay = s.day; playMelody(); toast('🔔 Mittag! Das Rathaus spielt eure Inselmelodie.'); }
  const fwOn = (S.festOf(s.day) === 'feuerwerk' || XS.fireworksTonight(s)) && hour >= 19 || (s.fw?.day === s.day && hour >= 18 && s.time - (s.fw.t || 0) < 600);
  if (fwOn && home && now > (G.nextFw || 0)) {
    G.nextFw = now + 500 + Math.random() * 1300;
    world.firework(me.x - 10 + Math.random() * 20, Math.min(me.z, 6) - 14 - Math.random() * 6, 13 + Math.random() * 6);
    play('launch');
    if (!G.fwSeen) { G.fwSeen = 1; toast('🎆 Das Feuerwerk beginnt! Tippe auf 🔭 (PC: K) und schau in den Himmel.', true); }
  }
  // Durch Pfützen patschen
  if (me.m && now > (G.splashT || 0)) for (const p of world.puddles || []) {
    if (Math.hypot(p.x - me.x, p.z - me.z) < 0.55) { G.splashT = now + 450; world.burst(me.x, me.z, 'splash', 0.05); world.burst(me.x, me.z, 'drop', 0.1); play('puddle'); break; }
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
    if (p.kind === 'producer') return o.t >= p.every ? `${p.name}: reif!` : `${p.name}: ${Math.floor(o.t / p.every * 100)}%`;
    return r.sit ? '' : 'Mit ✋ aufheben';
  }
  if (t) return t.w > 0 ? '💧 gegossen' : 'trocken';
  const k = S.key(x, z), res = S.resAt(s, k);
  if (res === 'tree' || res === 'palm') { const f = ITEMS[S.fruitOf(s, k)]; return S.fruitReady(s, k) ? `${f.icon} ${f.name} hängen dran` : '🌱 Das Obst wächst nach'; }
  if (s.digs.includes(k)) return '✨ Hier ist etwas vergraben – Schaufel!';
  return '';
}

function heldItem() {
  if (G.fishing) return 'rod';
  if (['can', 'net', 'shovel', 'axe'].includes(G.sel)) return G.sel;
  if (G.sel === 'spade') return 'shovel';
  if (ITEMS[G.sel]?.sapling) return 'box';
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
const MAPR = 35;
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
  for (const [k, kind] of Object.entries(S.spots(s))) {
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
  for (const A of Object.values(S.AREAS)) { g.globalAlpha = s.areas?.[Object.keys(S.AREAS).find(k => S.AREAS[k] === A)] ? 1 : 0.45; g.fillText(A.icon, X(A.gate[0]), X(A.gate[1])); g.globalAlpha = 1; }
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
  if (E6.pirateReady(s) && E6.PIRATE[s.pirate.stage]?.dig) { const [tx, tz] = s.pirate.at; g.strokeStyle = '#7a3ad6'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(tx - 0.8), X(tz - 0.8)); g.lineTo(X(tx + 0.8), X(tz + 0.8)); g.moveTo(X(tx + 0.8), X(tz - 0.8)); g.lineTo(X(tx - 0.8), X(tz + 0.8)); g.stroke(); }
  if (s.tmap?.spot) { const [tx, tz] = s.tmap.spot.split(',').map(Number); g.strokeStyle = '#d6303a'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(tx - 0.8), X(tz - 0.8)); g.lineTo(X(tx + 0.8), X(tz + 0.8)); g.moveTo(X(tx + 0.8), X(tz - 0.8)); g.lineTo(X(tx - 0.8), X(tz + 0.8)); g.stroke(); }
  if (G.goal && G.goal.x !== undefined) { g.strokeStyle = '#ff5d7a'; g.lineWidth = 3; g.beginPath(); g.arc(X(G.goal.x), X(G.goal.z), sc * 0.8, 0, 7); g.stroke(); }
}
$('pbody').addEventListener('change', e => { // Tauschstand: Preis oder Tausch
  if (e.target.id !== 'stmode') return;
  const swap = e.target.value === 'swap';
  $('stprice')?.classList.toggle('hidden', swap); $('stwant')?.classList.toggle('hidden', !swap); $('stwn')?.classList.toggle('hidden', !swap);
});
$('pbody').addEventListener('click', e => {
  const pp = e.target.closest('[data-paper]');
  if (pp) { document.querySelectorAll('[data-paper]').forEach(x => x.classList.toggle('on', x === pp)); play('click'); return; }
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
// kleine Hüpf-Animation an einem HUD-Element neu starten
function bump(el, cls = 'bump') {
  if (typeof el === 'string') el = $(el);
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 500);
}

function gameFrame(dt, now) {
  const s = G.s, me = G.players[G.me];
  if (!s || !me) return;
  if (G.role === 'host') simulate(now); else S.tick(s, dt, false);

  // Kamera mit Z / C drehen (gedrückt halten)
  const spin = (keys.has('c') ? 1 : 0) - (keys.has('z') ? 1 : 0);
  if (spin && !editor.isOpen && !G.talk) { world.rotate(spin * dt * 2.2 * settings.camSpeed * (settings.invert ? -1 : 1)); world.yaw = world.yawT; }
  // Laufen (Tastatur/Joystick relativ zur Kamera, sonst zum Tipp-Ziel)
  let vx = 0, vz = 0;
  if (!busy() && !G.train && !busy6() && !busy7() && !busy8()) {
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
    G.keyWalk = now;
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
    const sp = SPEED[s.up.boots] * dt * (me.sw ? 0.65 : me.bike || me.td ? 1.75 : me.pony ? 1.7 : me.sled ? 1.55 : me.run ? 1.6 : 1);
    const free = (x, z) => ![[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]].some(([a, b]) => S.blocked(s, x + a, z + b, swim));
    const stuck = !free(me.x, me.z);
    if (!iceMove(me, wx * sp, wz * sp, free)) { // auf dem Eis rutscht man (client/fun2.js)
      if (stuck || free(me.x + wx * sp, me.z)) me.x += wx * sp;
      if (stuck || free(me.x, me.z + wz * sp)) me.z += wz * sp;
    }
    me.ry = Math.atan2(wx, wz);
    if (G.fishing) stopFishing();
    if (S.inside(me)) { const R = S.roomOf(s, S.roomIdAt(me.z)); if (me.z - R.z0 > R.size[1] / 2 + 0.25) execute({ exit: true, room: R.id }, true); } // durch die Tür hinaus
    if (zoneOf(me) === 'street' && me.z - STREET.z > STREET.d + 0.5) travel('island'); // durchs Tor zurück
    if (zoneOf(me) === 'fair' && me.z - E6.FAIR.z > E6.FAIR.d + 0.5) travel('fairback'); // Jahrmarkt: durchs Tor zurück
    if (me.x < -150) { const A = S.AREAS[S.areaOf(me)]; if (me.z - A.z > A.d + 0.7) travel('island'); }
  } else me.run = false;
  const wasSw = me.sw;
  me.sw = !S.inside(me) && S.swimmable(me.x, me.z) && me.pose !== 'sit' && !G.ride && !G.canoe && !G.surf8;
  if (me.bike && (me.sw || S.inside(me) || ['reef', 'wreck', 'depths'].includes(zoneOf(me)) || me.pose || !(s.inv.fahrrad > 0))) setBike(false, true);
  if (me.sw && !wasSw) { world.burst(me.x, me.z, 'splash', -0.2); play('splash'); if (!G.swimTip) { G.swimTip = 1; toast('🤿 Du schwimmst! Bei Luftblasen 🫧 Aktion drücken zum Tauchen.'); } }
  me.held = heldItem();

  // Ziel: Maus (wenn gerade bewegt), sonst Feld vor der Figur
  // Maus zeigt auf etwas: das wird zum Ziel (E / Klick), solange man nicht mit der Tastatur weiterläuft
  const aim = G.hover && G.hover.t > (G.keyWalk || 0) && !busy() && !G.fishing && !G.skyView && !G.build ? aimAt(G.hover.cx, G.hover.cy) : null;
  G.aim = aim;
  G.ctx = G.build ? updateBuild() : G.fishing || busy() ? null : aim?.near ? aim.r : context(me, null);
  const shown = aim && usable(aim.r) ? aim.r : G.ctx;
  const aimM = aim && usable(aim.r) ? aim.hit.m || null : null;
  if (aimM !== G.aimM) {
    G.aimM = aimM;
    if (aimM && aim.near && (aim.hit.kind === 'thing' || aim.hit.kind === 'building')) world.squish(aimM, aim.hit.kind === 'building' ? 0.025 : 0.06, 0.3);
  }
  const cur = aim && usable(aim.r) ? 'pointer' : '';
  if (canvas.style.cursor !== cur && !pointers.size) canvas.style.cursor = cur;
  const label = G.fishing ? (G.fishing.phase === 'bite' ? '❗ Ziehen!' : '🎣 …') : G.ctx?.label || '';
  if (hud.label !== label) {
    hud.label = label;
    $('hint').innerHTML = `<kbd>E</kbd> ${esc(label)}`;
    $('hint').classList.toggle('hidden', !label);
    $('actlabel').textContent = label || '…';
    const icon = label.split(' ')[0];
    // Werkzeug-Aktionen zeigen das Blender-Symbol, sonst das Emoji aus der Beschriftung
    const TI = { '✋': 'hand', '🪓': 'axe', '🪨': 'shovel', '💧': 'can', '🦋': 'net', '🎯': 'sling' };
    const e = me.pose && !G.ctx?.dreamIn ? '🧍' : /\p{Extended_Pictographic}/u.test(icon) ? icon : '✋';
    $('actbtn').innerHTML = TI[e] ? `<img class="ico" src="assets/ui/${TI[e]}.webp" alt="">` : e;
    bump('actbtn', 'pop');
  }
  if (actHeld && now > nextAct) { nextAct = now + 300; execute(G.ctx, false); }
  updateFishing(dt);
  updateKite(dt);
  updateW(dt);
  updateV(dt);
  updateE(dt);
  updateF(dt);
  updateG(dt);
  update9();
  update10();
  update11();
  updateRide(dt);
  autoQuality(dt);
  // Spieleabend: Züge der Nachbarn macht der Gastgeber (mit kleiner Denkpause)
  const gm = s.game;
  if (G.role === 'host' && gm && gm.win == null && gm.p[gm.turn]?.npc) { if (!G.aiDue) G.aiDue = now + (gm.k === 'mem' ? 1300 : 900); else if (now > G.aiDue) { G.aiDue = 0; send({ t: 'game', op: 'ai' }); } } else G.aiDue = 0;
  updateTour();
  if (beachOpen(s) && G.beachTip !== s.day && zoneOf(me) === 'island') {
    G.beachTip = s.day;
    toast(beachKind(s) === 'sand' ? '🏰 Heute ist Sandburgen-Wettbewerb! Bis 17 Uhr am Strand bauen – Schaufel auf den Sand, dann mit Muscheln schmücken.' : '🪁 Heute ist Drachenfest! Bis 17 Uhr den Drachen steigen lassen – der höchste Flug gewinnt.', 'ach');
  }
  updateFest(me, now);
  updateHide(me, now);
  updateHand(me, now);
  updateRiddle(me);

  let prompt = null;
  if (shown && !G.fishing && !G.build) {
    const info = shown.npc || shown.hug ? '' : infoAt(shown), lbl = shown.label || '';
    const can = usable(shown), far = aim && shown === aim.r && !aim.near;
    if (can || info) {
      const t = shown.tiles?.[0], person = shown.hug || shown.npc || shown.a?.t === 'animal', x = person || !t ? shown.px : t[0], z = person || !t ? shown.pz : t[1];
      const key = touch ? '' : far ? '👣 ' : aim && shown === aim.r ? '🖱️ ' : '<kbd>E</kbd>';
      const tip = far ? '<small>Klicken: hinlaufen &amp; benutzen</small>' : info ? `<small>${info}</small>` : '';
      prompt = { x, z, y: shown.hug || shown.npc ? 2.3 : 1.1, cls: far ? 'far' : '', html: `${can && lbl ? key + esc(lbl) : ''}${tip}` };
    }
  }

  const ps = {};
  for (const [id, p] of Object.entries(G.players)) ps[id] = G.social[id] ? { ...p, ...G.social[id] } : p;
  const info = world.render(s, ps, G.me, dt, {
    tiles: G.photo || editor.isOpen ? [] : G.build ? G.ctx?.tiles : shown?.tiles, hlOn: G.build ? !!G.ctx?.a : usable(shown), hlBad: G.build ? !G.ctx?.a : shown && !shown.a && !shown.ui && !shown.fish && !shown.sit && /kein|Nur|Erst/.test(shown.label || ''),
    prompt: G.photo || editor.isOpen ? null : prompt, photo: G.photo, hideNames: G.photo || !settings.names,
    bobber: G.fishing && { x: G.fishing.x, z: G.fishing.z, bite: G.fishing.phase === 'bite', nib: G.fishing.nib > 0 },
    skyGifts: G.ride?.gifts || null,
    preview: editor.isOpen ? previewCam(me.x, me.z) : null, sky: G.skyView,
  });
  if (panels.open === 'map' || panels.open === 'pirate') drawMap();
  if (panels.open === 'stars') drawStars();
  if (s.balloon && G.balloonSeen !== s.balloon.id) { G.balloonSeen = s.balloon.id; toast('🎈 Ein Geschenkballon schwebt über die Insel! Schnapp dir die Schleuder.'); play('chat'); }
  const zone = zoneOf(me), fireD = zone === 'island' ? Math.min(...Object.entries(s.obj || {}).filter(([, o]) => o?.k === 'strandgrill' || o?.k === 'lagerfeuer').map(([k]) => { const [x, z] = k.split(',').map(Number); return Math.hypot(x - me.x, z - me.z); }), 99) : 99;
  ambience({ day: info.day, night: info.night, rain: XS.isRainy(s) && !S.inside(me), storm: s.weather === 'storm', fog: s.weather === 'fog', walking: me.m && !me.rh, area: me.x < -150 ? S.areaOf(me) : zone === 'depths' ? 'hoehle' : null, underwater: zone === 'reef' || zone === 'wreck', fire: fireD < 6 ? 1 - fireD / 6 : 0 });
  musicTick(6 + s.dayTime * 18, XS.isRainy(s), zone === 'home' ? (V.XROOMS[S.roomIdAt(me.z)] ? S.roomIdAt(me.z) : null) : zone); // Musik je Ort
  // Gewitter: Blitze und Donner (nur draußen auf der Insel)
  if (s.weather === 'storm' && !S.inside(me) && Math.abs(me.z) < 150 && me.x < 150 && Math.random() < dt / 11) {
    world.lightning();
    setTimeout(() => play('thunder'), 300 + Math.random() * 1600);
  }
  // Nachbarn sagen ab und zu etwas, wenn man in der Nähe ist
  if (now > (G.nextChatter || 0) && !G.talk && !s.wedding) { // (bei der Hochzeit sind alle still)
    G.nextChatter = now + 14000 + Math.random() * 12000;
    const near = [...(world.npcM || [])].filter(([, e]) => e.awake && Math.hypot(e.x - me.x, e.z - me.z) < 7);
    if (near.length) { const [id] = near[Math.floor(Math.random() * near.length)]; world.npcBubble(id, npcLine(id, talkCtx(id))); }
  }

  // HUD
  const hour = 6 + s.dayTime * 18, hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10;
  const sky = s.weather !== 'sun' && XS.WEATHER[s.weather] ? XS.WEATHER[s.weather][0] + ' ' : '';
  const [seaName, seaIcon] = SEASONS[S.seasonOf(s.day)];
  if (hud.m !== s.money) { if (hud.m != null && s.money > hud.m) bump('moneypill'); hud.m = s.money; }
  setText('money', s.money.toLocaleString('de-DE'));
  const real = s.real ? new Date() : null;
  const rh = real ? real.getHours() : hour, night = rh >= 19 || rh < 6;
  if (hud.night !== night) { hud.night = night; const im = document.querySelector('.skyico'); im.src = `assets/ui/${night ? 'moon' : 'sun'}.webp`; im.className = `ico skyico ${night ? 'moon' : 'sun'}`; }
  setText('ctime', real ? `${real.getHours()}:${String(real.getMinutes()).padStart(2, '0')}` : `${hh}:${String(mm).padStart(2, '0')}`);
  setText('clock', `${sky}${WEEKDAYS[weekday(s.day)]} · ${seaIcon} ${seaName}`);
  // Abendmeldungen: Sternschnuppen-Nacht
  if (s.starNight && hour >= 19 && G.starToast !== s.day) { G.starToast = s.day; toast('🌠 Heute Nacht fallen Sternschnuppen! Tippe auf 🔭 (PC: K) und schau in den Himmel.', true); }
  if (hud.lvl && hud.lvl !== String(s.level)) bump('lvlpill');
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
  const inv = G.role === 'host' && G.code && np === 1 && !G.server;
  $('invite').classList.toggle('hidden', !inv);
  if (inv) setText('invcode', G.code);

  const items = hotbarItems(s);
  if (!items.includes(G.sel)) G.sel = 'hand';
  const sig = items.map(i => i + (s.inv[i] || '')).join() + G.sel;
  if (sig !== G.hotSig && !uiPress) {
    G.hotSig = sig;
    G.hot = items;
    $('hotbar').innerHTML = items.map((id, i) => slotHtml(s, id, i, G.sel)).join('');
    fillIcons($('hotbar'));
    if (G.popSel) { bump($('hotbar').querySelector(`[data-id="${G.popSel}"]`), 'pop'); G.popSel = null; }
  }
  if (!uiPress) { panels.update(s, G); fillBook(); fillPatterns(); }
}

let last = performance.now(), loaded = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (settings.fps && now - last < 1000 / settings.fps - 2) return; // Bilder pro Sekunde begrenzen
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  pollPad(dt); // Controller (client/pad.js)
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
window.__game = { get G() { return G; }, world, S, profile, settings, openTalk, social, showRiddle, panels, XS, send, travel, leave, SW };  // für Tests & Fehlersuche
