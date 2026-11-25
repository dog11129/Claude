// Inselleben 5 im Browser: Olympiade, Hochsee-Angeln, Leuchtturm, Theater, Kino, Bimmelbahn, Pony, Haustier-Tricks,
// Schnitzeljagd, Brieffreunde (Post über den Verbindungsserver), Zimmer-Wege. Logik beim Host: src/extras5.js.
import * as S from '../state.js';
import * as V from '../extras5.js';
import { CLOUD } from '../cloud.js';
import { zoneOf } from '../newleaf.js';
import { openGame, endGame } from './fun2.js';
import { pianoNote } from '../audio.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
export function initFun3(ctx) { C = ctx; setInterval(postTick, 40000); }
export const rideOn = () => !!C?.G?.train;

// ---------- Knöpfe ----------
export function uiV(kind, d) {
  const G = C.G, s = G.s;
  if (kind === 'potform') { G.pot = { ...(G.pot || { glaze: 'rosa' }), form: d.id }; C.panels.sig = null; }
  if (kind === 'potglaze') { G.pot = { ...(G.pot || { form: 'vase' }), glaze: d.id }; C.panels.sig = null; }
  if (kind === 'ponyname') C.send({ t: 'pony', op: 'name', name: $('ponyname')?.value || '' });
  if (kind === 'ponyride') { C.panels.close(); setPony(true); }
  if (kind === 'trick') { C.panels.close(); C.emote('🐾'); const t = V.TRICKS.find(x => x[0] === d.k); if (t) C.toast(`${t[2]} „${t[1]}“ – brav gemacht!`); }
  if (kind === 'olymp') startOlymp(d.d);
  if (kind === 'huntitem') { G.huntItem = d.id; C.panels.sig = null; }
  if (kind === 'hide') {
    const m = me();
    if (zoneOf(m) !== 'island') { C.toast('🔍 Verstecken geht auf eurer Insel.'); return; }
    C.send({ t: 'hunt', op: 'hide', x: m.x, z: m.z, item: G.huntItem, clue: $('huntclue')?.value || '', name: C.profile.name });
    G.huntItem = null; C.panels.close();
  }
  if (kind === 'cinema') startCinema();
  if (kind === 'theater') startTheater(V.PLAYS.find(p => p[0] === d.p));
  if (kind === 'train') startTrain();
  if (kind === 'ships') startShips();
  if (kind === 'deepsea') {
    if (s.level < V.DEEPSEA_LVL || s.money < V.DEEPSEA_PRICE) { C.toast(`🎣 Ausfahrt: ${V.DEEPSEA_PRICE} Taler, ab Level ${V.DEEPSEA_LVL}.`); return; }
    C.send({ t: 'deepsea', op: 'boat' }); C.panels.close();
    C.toast('⛵ Käpt\'n Flossi fährt hinaus aufs offene Meer … 🎣');
    setTimeout(() => G?.ready && C.travel('deepsea'), 700);
  }
  if (kind === 'ppitem') { G.ppItem = G.ppItem === d.id ? null : d.id; C.panels.sig = null; }
  if (kind === 'ppsend') {
    const to = ($('ppto')?.value || '').trim().toUpperCase(), text = $('pptext')?.value || '';
    if (!/^[A-Z0-9]{5}$/.test(to) || !text.trim()) { C.toast('📮 Bitte einen 5-stelligen Insel-Code und ein paar Worte eingeben.'); return; }
    C.send({ t: 'penpal', op: 'send', to, text, item: G.ppItem || null, name: C.profile.name }); G.ppItem = null; C.panels.close(); setTimeout(postTick, 1500);
  }
  if (kind === 'guest') { const g = [...(G.partyGuests || s.party?.guests || [])], i = g.indexOf(d.id); if (i >= 0) g.splice(i, 1); else if (g.length < 3) g.push(d.id); G.partyGuests = g; C.panels.sig = null; }
  if (kind === 'invite') { C.send({ t: 'party', op: 'guests', guests: G.partyGuests || [] }); G.partyGuests = null; }
}

// ---------- Orte: Extra-Zimmer, Hochsee ----------
export function travelV(where) {
  if (where.startsWith('xroom:')) { const X = V.XROOMS[where.slice(6)]; if (!X) return null; return [S.HOME_X, X.z0 + X.size[1] / 2 - 0.8, Math.PI, `${X.icon} ${X.name}`, 'door']; }
  if (where === 'deepsea') return [V.DEEPSEA.x, V.DEEPSEA.z + 2.6, Math.PI, '🎣 Auf hoher See! An die Reling gehen und die Angel auswerfen.', 'splash'];
  return null;
}
// Aus einem Extra-Zimmer hinaus: vor die Treppe im Haus bzw. vors Baumhaus
export function exitV(room) {
  if (!V.XROOMS[room]) return null;
  if (room === 'tree') { const t = Object.entries(C.G.s.obj || {}).find(([, o]) => o?.k === 'baumhaus'); if (!t) return null; const [x, z] = t[0].split(',').map(Number); return [x, z + 1.6]; }
  const st = Object.entries(C.G.s.home.items || {}).find(([, o]) => o?.k === V.XROOMS[room].item);
  if (!st) return [S.HOME_X, 1];
  const [x, z] = st[0].split(',').map(Number);
  return [S.HOME_X + x, z + 1.1];
}

// ---------- Aktionen ----------
export function contextV(m) {
  if (C.G.sel === 'pony' && zoneOf(m) === 'island') return { ponyride: true, label: m.pony ? '🐴 Absteigen' : '🐴 Aufs Pony', tiles: [] };
  return null;
}
export function executeV(r, fresh) {
  if (r.ponyride) { if (fresh) setPony(!me().pony); return true; }
  if (r.bigfish) { if (fresh) startBigFish(); return true; }
  if (r.trainoff) { if (fresh) endTrain(); return true; }
  return false;
}
export function setPony(on) {
  const m = me();
  if (on && (S.inside(m) || m.sw || zoneOf(m) !== 'island' || !V.ponyHappy(C.G.s))) { C.toast('🐴 Ausreiten geht auf der Insel – wenn das Pony gefüttert oder gestriegelt ist.'); return; }
  if (on && m.bike) C.setBike(false, true);
  m.pony = m.po = on;
  if (on) { C.send({ t: 'pony', op: 'ride' }); C.play('plopp'); C.toast('🐴 Hü! Nochmal antippen zum Absteigen.'); }
}

// ---------- Bimmelbahn ----------
function startTrain() {
  const G = C.G, P = V.TRAIN_PATH;
  C.panels.close(); C.interrupt();
  const m = me(), st = Object.entries(G.s.obj || {}).find(([, o]) => o?.k === 'bahnhof'), [sx, sz] = st ? st[0].split(',').map(Number) : [m.x, m.z];
  if (m.bike) C.setBike(false, true);
  m.pony = m.po = false;
  let i0 = 0, bd = Infinity;
  P.forEach(([x, z], i) => { const d = Math.hypot(x - sx, z - sz); if (d < bd) { bd = d; i0 = i; } });
  G.train = { t0: performance.now(), i0, back: [m.x, m.z] };
  m.tn = true;
  C.play('gondola');
  C.toast('🚂 Tschu-tschu! Einmal rund um die Insel – aussteigen mit der Aktionstaste.');
}
const trainAt = (f, P) => { const n = P.length, i = ((Math.floor(f) % n) + n) % n, k = f - Math.floor(f), a = P[i], b = P[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
function updateTrain() {
  const G = C.G, T = G.train;
  if (!T) return;
  const t = (performance.now() - T.t0) / 1000, P = V.TRAIN_PATH, f = T.i0 + t / V.TRAIN_SECS * P.length, m = me();
  const [x, z, ry] = trainAt(f, P);
  Object.assign(m, { x, z, ry, m: false, pose: 'sit', tn: true });
  if (t >= V.TRAIN_SECS) endTrain();
}
export function endTrain() {
  const G = C.G, T = G.train, m = me();
  if (!T) return;
  G.train = null;
  m.pose = null; m.tn = false;
  const spot = C.freeAt(m.x, m.z) ? [m.x, m.z] : [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [2.5, 0], [0, 2.5], [-2.5, 0], [0, -2.5]].map(([a, b]) => [m.x + a, m.z + b]).find(([a, b]) => C.freeAt(a, b)) || T.back;
  Object.assign(m, { x: spot[0], z: spot[1] });
  C.send({ t: 'train', op: 'ride' });
  C.toast('🚂 Ausgestiegen!');
}

// ---------- pro Bild ----------
export function updateV(dt) {
  if (!C?.G?.ready) return;
  updateTrain();
  const m = me();
  if (m.pony && (S.inside(m) || m.sw || zoneOf(m) !== 'island')) m.pony = m.po = false;
}
export const trainContext = () => (C.G.train ? { trainoff: true, label: '🚂 Aussteigen', tiles: [] } : null);

// ---------- Olympiade ----------
function startOlymp(d) {
  const D = V.OLYMPIA.find(x => x[0] === d);
  if (!D) return;
  let t = 0, score = 0, done = false, msg = '';
  const finish = () => { if (done) return; done = true; C.send({ t: 'olymp', op: 'result', d, score: Math.round(score * 10) / 10 }); setTimeout(() => endGame(), 500); };
  if (d === 'sack') { // im Takt hüpfen
    let zone = 0.5;
    const tap = () => { if (done) return; const m = (Math.sin(t * 4.2) + 1) / 2, ok = Math.abs(m - zone) < 0.13; score += ok ? 1.5 : 0.4; msg = ok ? '🦘 Hopp!' : '…'; C.play(ok ? 'plopp' : 'click'); zone = 0.25 + Math.random() * 0.5; };
    openGame(`${D[2]} ${D[1]}`, 300, 200, {
      down: tap, key: k => (k === ' ' || k === 'Enter' ? (tap(), true) : false),
      step(dt) { t += dt; $('mgfoot').textContent = `${msg} ${score.toFixed(1)} m · noch ${Math.max(0, 12 - t).toFixed(0)} s`; if (t >= 12) finish(); },
      draw(x) { x.fillStyle = '#e8f4ff'; x.fillRect(0, 0, 300, 200); x.fillStyle = '#c8e0a8'; x.fillRect(0, 150, 300, 50); x.font = '36px system-ui'; x.textAlign = 'center'; x.fillText('🛍️', 20 + Math.min(260, score * 10), 145 - Math.abs(Math.sin(t * 8)) * 20); x.fillStyle = '#e8dcc6'; x.fillRect(20, 30, 260, 20); x.fillStyle = '#8fd694'; x.fillRect(20 + (zone - 0.13) * 260, 30, 0.26 * 260, 20); const m = (Math.sin(t * 4.2) + 1) / 2; x.fillStyle = '#ff6b8a'; x.fillRect(17 + m * 260, 24, 6, 32); },
    });
  }
  if (d === 'ei') { // Ei auf dem Löffel balancieren
    let tilt = 0, vel = 0, push = 0, wind = 0;
    openGame(`${D[2]} ${D[1]}`, 300, 220, {
      down: p => { push = p.x < 150 ? -1 : 1; }, up: () => { push = 0; },
      key: k => { if (k === 'ArrowLeft' || k === 'a') { push = -1; setTimeout(() => (push = 0), 180); return true; } if (k === 'ArrowRight' || k === 'd') { push = 1; setTimeout(() => (push = 0), 180); return true; } return false; },
      step(dt) { if (done) return; t += dt; wind += (Math.random() - 0.5) * dt * 3; wind *= 0.98; vel += (wind + tilt * 0.9 + push * -1.8) * dt; vel *= 0.97; tilt += vel * dt; score = t * 1.5; $('mgfoot').textContent = `🥚 ${score.toFixed(1)} m · links/rechts halten`; if (Math.abs(tilt) > 1) { msg = '💥 Plumps!'; C.play('fail'); finish(); } if (t >= 15) finish(); },
      draw(x) { x.fillStyle = '#fff3e0'; x.fillRect(0, 0, 300, 220); x.save(); x.translate(150, 150); x.rotate(tilt * 0.6); x.fillStyle = '#b8c4d0'; x.fillRect(-70, 0, 140, 8); x.font = '40px system-ui'; x.textAlign = 'center'; x.fillText('🥚', tilt * 40, -6); x.restore(); x.fillStyle = '#5a4030'; x.font = '14px system-ui'; x.textAlign = 'center'; x.fillText('◀ tippen links · rechts tippen ▶', 150, 200); },
    });
  }
  if (d === 'wurf') { // Kraft, dann Winkel
    let stage = 0, power = 0, angle = 0, fly = 0;
    const tap = () => { if (stage === 0) { power = (Math.sin(t * 3) + 1) / 2; stage = 1; t = 0; } else if (stage === 1) { angle = 0.2 + (Math.sin(t * 2.4) + 1) / 2 * 1.2; stage = 2; score = Math.max(0, power * Math.sin(2 * angle) * 40); C.play('plopp'); } };
    openGame(`${D[2]} ${D[1]}`, 300, 220, {
      down: tap, key: k => (k === ' ' || k === 'Enter' ? (tap(), true) : false),
      step(dt) { t += dt; if (stage === 2) { fly = Math.min(1, fly + dt * 0.8); if (fly >= 1) finish(); } $('mgfoot').textContent = stage === 0 ? 'Tippen: Kraft' : stage === 1 ? 'Tippen: Winkel' : `🎯 ${score.toFixed(1)} m`; },
      draw(x) { x.fillStyle = '#e8f4ff'; x.fillRect(0, 0, 300, 220); x.fillStyle = '#c8e0a8'; x.fillRect(0, 190, 300, 30); if (stage < 2) { const v = stage === 0 ? (Math.sin(t * 3) + 1) / 2 : (Math.sin(t * 2.4) + 1) / 2; x.fillStyle = '#e8dcc6'; x.fillRect(20, 30, 260, 18); x.fillStyle = stage === 0 ? '#ff6b8a' : '#6cb4ff'; x.fillRect(20, 30, v * 260, 18); } else { const dx = fly * score * 6.5, dy = Math.sin(fly * Math.PI) * score * 2.5 * Math.sin(angle); x.font = '24px system-ui'; x.fillText('🎯', 20 + dx, 185 - dy); } },
    });
  }
}

// ---------- Hochsee-Angeln: Spannung halten ----------
function startBigFish() {
  let t = 0, ten = 0.4, prog = 0, hold = false, done = false, pull = 0;
  const finish = ok => { if (done) return; done = true; C.send({ t: 'deepsea', op: 'catch', ok }); setTimeout(() => endGame(), 400); };
  openGame('🎣 Hochsee-Angeln', 300, 240, {
    down: () => { hold = true; }, up: () => { hold = false; },
    key: k => { if (k === ' ' || k === 'Enter') { hold = true; setTimeout(() => (hold = false), 220); return true; } return false; },
    step(dt) {
      if (done) return;
      t += dt; pull = Math.max(0, Math.sin(t * 1.7) * 0.6 + Math.sin(t * 4.3) * 0.25 + 0.2);
      ten += ((hold ? 0.9 : -0.6) + pull * 0.5 - 0.3) * dt;
      ten = Math.max(0, ten);
      if (ten > 0.35 && ten < 0.75) prog += dt * 0.09; else prog = Math.max(0, prog - dt * 0.03);
      $('mgfoot').textContent = ten >= 1 ? '' : `Halten = einholen · Spannung im grünen Bereich halten`;
      if (ten >= 1) { C.play('fail'); finish(false); }
      if (prog >= 1) { C.play('fanfare'); finish(true); }
      if (t > 25) finish(false);
    },
    draw(x) {
      x.fillStyle = '#2a6a9a'; x.fillRect(0, 0, 300, 240);
      x.fillStyle = '#fff'; x.font = 'bold 14px system-ui'; x.textAlign = 'center'; x.fillText('Spannung', 150, 24);
      x.fillStyle = '#1a4a6a'; x.fillRect(30, 34, 240, 20); x.fillStyle = '#8fd694'; x.fillRect(30 + 0.35 * 240, 34, 0.4 * 240, 20); x.fillStyle = '#ff5a5a'; x.fillRect(30 + 0.95 * 240, 34, 0.05 * 240, 20);
      x.fillStyle = '#fff'; x.fillRect(30 + Math.min(1, ten) * 240 - 3, 28, 6, 32);
      x.fillText('Fang', 150, 92); x.fillStyle = '#1a4a6a'; x.fillRect(30, 100, 240, 14); x.fillStyle = '#ffd23f'; x.fillRect(30, 100, prog * 240, 14);
      x.font = '40px system-ui'; x.fillText('🐟', 150 + Math.sin(t * 2.2) * 80, 190 + Math.sin(t * 3) * 10);
    },
  });
}

// ---------- Leuchtturm: Schiffe mit dem Lichtstrahl führen ----------
function startShips() {
  let t = 0, beam = 0, saved = 0, ship = null, n = 0, done = false, keyDir = 0;
  const next = () => { n++; ship = n > 3 ? null : { a: (Math.random() - 0.5) * 1.6, va: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.25), p: 0, t: 0 }; if (!ship) finish(); };
  const finish = () => { if (done) return; done = true; C.send({ t: 'lighthouse', op: 'saved', n: saved }); setTimeout(() => endGame(), 500); };
  next();
  openGame('🗼 Schiffe lotsen', 300, 300, {
    move: p => { beam = Math.atan2(p.x - 150, 280 - p.y); }, down: p => { beam = Math.atan2(p.x - 150, 280 - p.y); },
    key: k => { if (k === 'ArrowLeft') { keyDir = -1; setTimeout(() => (keyDir = 0), 150); return true; } if (k === 'ArrowRight') { keyDir = 1; setTimeout(() => (keyDir = 0), 150); return true; } return false; },
    step(dt) {
      if (done || !ship) return;
      t += dt; beam += keyDir * dt * 1.5; ship.t += dt;
      ship.a += ship.va * dt; if (Math.abs(ship.a) > 0.9) ship.va *= -1;
      if (Math.abs(ship.a - beam) < 0.14) ship.p += dt / 4;
      if (ship.p >= 1) { saved++; C.play('fanfare'); next(); } else if (ship.t > 9) { C.play('fail'); next(); }
      $('mgfoot').textContent = `⛵ ${saved} gerettet · Schiff ${Math.min(3, n)}/3`;
    },
    draw(x) {
      x.fillStyle = '#16233a'; x.fillRect(0, 0, 300, 300);
      x.save(); x.translate(150, 280); x.rotate(beam); const g = x.createLinearGradient(0, 0, 0, -260); g.addColorStop(0, 'rgba(255,240,170,.75)'); g.addColorStop(1, 'rgba(255,240,170,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(-40, -270); x.lineTo(40, -270); x.fill(); x.restore();
      x.font = '28px system-ui'; x.textAlign = 'center'; x.fillText('🗼', 150, 292);
      if (ship) { const r = 170 - ship.p * 120, sx = 150 + Math.sin(ship.a) * r, sy = 280 - Math.cos(ship.a) * r; x.globalAlpha = Math.abs(ship.a - beam) < 0.14 ? 1 : 0.35; x.fillText('⛵', sx, sy); x.globalAlpha = 1; x.fillStyle = '#ffd23f'; x.fillRect(sx - 15, sy + 6, 30 * ship.p, 4); }
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(200,210,230,.08)'; x.fillRect(0, (t * 20 + i * 60) % 300, 300, 30); }
    },
  });
}

// ---------- Theater: Sätze in Reihenfolge antippen ----------
function startTheater(P) {
  if (!P) return;
  const lines = P[2].map((l, i) => ({ l, i })).sort(() => Math.random() - 0.5);
  let next = 0, miss = 0, done = false, flash = null;
  const H = 52, tap = p => { if (done) return; const k = Math.floor((p.y - 40) / H), L = lines[k]; if (!L || L.i < next) return; if (L.i === next) { next++; C.play('plopp'); pianoNote(60 + next * 2, 0.4, 0.3); if (next === lines.length) { done = true; C.send({ t: 'theater', op: 'play', p: P[0], miss }); setTimeout(() => endGame(), 700); } } else { miss++; flash = { k, t: performance.now() }; C.play('fail'); } };
  openGame(`🎭 ${P[1]}`, 300, 40 + H * lines.length + 10, {
    down: tap,
    step() { $('mgfoot').textContent = `Welcher Satz kommt als Nächstes? · Fehler: ${miss}`; },
    draw(x) {
      x.fillStyle = '#5a2030'; x.fillRect(0, 0, 300, 400);
      x.fillStyle = '#ffd23f'; x.font = 'bold 14px system-ui'; x.textAlign = 'center'; x.fillText(`Satz ${Math.min(next + 1, lines.length)} von ${lines.length}`, 150, 26);
      lines.forEach((L, k) => { const y = 40 + k * H, used = L.i < next, bad = flash && flash.k === k && performance.now() - flash.t < 400; x.fillStyle = used ? '#8a6a70' : bad ? '#ff8a8a' : '#fff3e0'; x.fillRect(8, y, 284, H - 6); x.fillStyle = used ? '#ddd' : '#3a2020'; x.font = '12px system-ui'; x.textAlign = 'left'; wrap(x, (used ? `${L.i + 1}. ` : '') + L.l, 14, y + 18, 272, 14); });
    },
  });
}
function wrap(x, text, px, py, w, lh) { let line = '', y = py; for (const word of text.split(' ')) { if (x.measureText(line + word).width > w && line) { x.fillText(line, px, y); line = ''; y += lh; } line += word + ' '; } x.fillText(line, px, y); }

// ---------- Freiluftkino: eure Fotos als Diashow ----------
async function startCinema() {
  const list = (await C.listPhotos().catch(() => [])).slice(-12);
  const imgs = list.map(p => { const i = new Image(); i.src = p.url; return i; });
  let t = 0;
  C.send({ t: 'cinema', op: 'watch' });
  const notes = [60, 64, 67, 72, 67, 64, 62, 65, 69, 72, 69, 65];
  let nt = -1;
  openGame('🎬 Freiluftkino', 320, 240, {
    step(dt) { t += dt; const k = Math.floor(t * 1.2); if (k !== nt) { nt = k; pianoNote(notes[k % notes.length], 0.25, 0.6); } $('mgfoot').textContent = imgs.length ? `Bild ${Math.floor(t / 4) % imgs.length + 1}/${imgs.length} · 🍿` : 'Noch keine Fotos – im Fotomodus (📷) welche machen!'; if (t > Math.max(8, imgs.length * 4)) endGame(); },
    draw(x) {
      x.fillStyle = '#101018'; x.fillRect(0, 0, 320, 240);
      const img = imgs[Math.floor(t / 4) % (imgs.length || 1)], f = (t % 4) / 4, a = Math.min(1, f * 4, (1 - f) * 4);
      x.globalAlpha = a;
      if (img?.complete && img.naturalWidth) { const s = Math.min(300 / img.naturalWidth, 200 / img.naturalHeight); x.drawImage(img, 160 - img.naturalWidth * s / 2, 110 - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); }
      else { x.fillStyle = '#fff'; x.font = '40px system-ui'; x.textAlign = 'center'; x.fillText('🎞️', 160, 120); }
      x.globalAlpha = 1; x.font = '22px system-ui'; x.textAlign = 'center'; x.fillText('🐻 🐰 🦔 🐸', 160, 234);
    },
  });
}

// ---------- Brieffreunde: der Host verschickt und holt die Post ----------
let posting = false;
async function postTick() {
  const G = C?.G;
  if (!G?.ready || G.role !== 'host' || !G.code || posting) return;
  posting = true;
  try {
    const out = G.s.penpal?.out || [], sent = [];
    for (const l of out.slice(0, 5)) {
      const r = await fetch(`${CLOUD}/post/${l.to}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, text: l.text, item: l.item, from: l.from, isle: l.isle, fromCode: G.code }) }).catch(() => null);
      if (r?.ok) sent.push(l.id);
    }
    if (sent.length) C.send({ t: 'penpal', op: 'sent', ids: sent });
    const r = await fetch(`${CLOUD}/post/${G.code}`).catch(() => null);
    const box = r?.ok ? await r.json().catch(() => null) : null;
    if (box?.letters?.length) {
      C.send({ t: 'penpal', op: 'receive', letters: box.letters });
      await fetch(`${CLOUD}/post/${G.code}?ids=${box.letters.map(l => encodeURIComponent(l.id)).join(',')}`, { method: 'DELETE' }).catch(() => null);
    }
  } finally { posting = false; }
}
