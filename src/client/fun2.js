// Inselleben 4 im Browser: Minispiele (Minigolf, Tanzabend, Kaffee kochen), Kanufahrt, Schlitten, Eislaufen,
// Schneebälle, Fernglas und die Knöpfe der neuen Fenster (ui: 'w:…'). Spiellogik liegt in src/extras4.js (Host).
import * as THREE from '../../vendor/three.module.min.js';
import * as S from '../state.js';
import * as W from '../extras4.js';
import { MEL_NOTES } from '../extras.js';
import { inPond, POND } from '../island.js';
import { zoneOf } from '../newleaf.js';
import { pianoNote } from '../audio.js';

let C = null;
const $ = id => document.getElementById(id);
export function initFun2(ctx) {
  C = ctx;
  const mg = document.createElement('div');
  mg.id = 'mgame';
  mg.className = 'hidden';
  mg.innerHTML = '<div class="mgbox"><div id="mghead"></div><canvas id="mgcv"></canvas><div id="mgfoot"></div><button class="btn small white" id="mgquit">✖ Abbrechen</button></div>';
  document.body.appendChild(mg);
  $('mgquit').onclick = () => endGame(true);
  const cv = $('mgcv');
  cv.addEventListener('pointerdown', e => C.G?.mg?.down?.(pt(e)));
  cv.addEventListener('pointermove', e => C.G?.mg?.move?.(pt(e)));
  addEventListener('pointerup', e => C.G?.mg?.up?.(pt(e)));
  addEventListener('keydown', e => { if (C.G?.mg?.key && !e.repeat && C.G.mg.key(e.key)) e.preventDefault(); }, true);
}
const pt = e => { const r = $('mgcv').getBoundingClientRect(), g = C.G.mg; return { x: (e.clientX - r.left) / r.width * g.w, y: (e.clientY - r.top) / r.height * g.h }; };
const me = () => C.G.players[C.G.me];
export const gameOn = () => !!(C?.G?.mg || C?.G?.canoe);

// ---------- Fenster-Knöpfe ----------
export function uiW(kind, d) {
  const G = C.G, s = G.s;
  if (kind === 'dancepanel') C.panels.show('dancegame');
  if (kind === 'volcano') {
    if (s.level < W.VOLCANO_LVL || s.money < W.VOLCANO_PRICE) { C.toast(`🌋 Überfahrt: ${W.VOLCANO_PRICE} Taler, ab Level ${W.VOLCANO_LVL}.`); return; }
    C.send({ t: 'volc', op: 'boat' });
    C.panels.close();
    C.toast('⛵ Käpt\'n Flossi nimmt Kurs auf die Vulkaninsel … 🌋');
    setTimeout(() => G?.ready && C.travel('volcano'), 700);
  }
  if (kind === 'golf') startGolf();
  if (kind === 'dance') startDance(W.SONGS.find(x => x.id === d.song) || W.SONGS[0]);
  if (kind === 'brew') startBrew(d.k);
  if (kind === 'radio') { const song = W.RADIO_SONGS.find(x => x[0] === d.song); if (song) { playNotes(song[2], 0.24); C.send({ t: 'radio', op: 'wish', song: song[0], name: C.profile.name }); } }
  if (kind === 'radiomel' && s.melody) playNotes(s.melody.notes.map(n => (n ? MEL_NOTES[n] : 0)), 0.23);
  if (kind === 'capitem') { const sel = { ...(G.capSel || {}) }; if (sel[d.id]) delete sel[d.id]; else if (Object.keys(sel).length < 3) sel[d.id] = 1; G.capSel = sel; C.panels.sig = null; }
  if (kind === 'capbury') {
    const m = me(), x = Math.round(m.x + Math.sin(m.ry) * 1.2), z = Math.round(m.z + Math.cos(m.ry) * 1.2);
    if (zoneOf(m) !== 'island') { C.toast('⏳ Zeitkapseln vergräbt man auf eurer Insel.'); return; }
    if (!S.canPlace(s, x, z)) { C.toast('⏳ Vor dir ist kein freies Stück Rasen – dreh dich zu einer freien Stelle.'); return; }
    C.send({ t: 'capsule', op: 'bury', x, z, days: +d.days, text: $('captext')?.value || '', items: G.capSel || {}, name: C.profile.name });
    G.capSel = {};
    C.panels.close();
  }
  if (kind === 'gbst') { G.gbSt = d.st; C.panels.sig = null; }
  if (kind === 'gbpx') { const p = [...(G.gbPx || '0'.repeat(64))]; p[+d.i] = p[+d.i] === '1' ? '0' : '1'; G.gbPx = p.join(''); C.panels.sig = null; }
  if (kind === 'gbsign') { C.send({ t: 'guestbook', op: 'sign', text: $('gbtext')?.value || '', st: G.gbSt || W.GB_STAMPS[0], px: G.gbPx || '', name: C.profile.name }); G.gbPx = null; C.panels.sig = null; }
  if (kind === 'walk') { C.send({ t: 'fashion', op: 'walk', look: me().look }); C.panels.close(); me().pose = null; me().emote = '✨'; me().emoteUntil = performance.now() + 2500; }
}
let noteT = [];
function playNotes(notes, step) { noteT.forEach(clearTimeout); noteT = notes.map((n, i) => n && setTimeout(() => pianoNote(n, 0.55, step * 1.6), i * step * 1000)).filter(Boolean); }

// ---------- Orte ----------
export function travelW(where) {
  if (where === 'grotto') { if (!C.G.s.grotto?.found) C.send({ t: 'canoe', op: 'grotto' }); return [W.GROTTO.x + W.GROTTO_UP[0], W.GROTTO.z + W.GROTTO_UP[1] - 1.2, Math.PI, C.G.s.grotto?.found ? '🌊 In der Grotte hinter dem Wasserfall.' : '', 'splash']; }
  if (where === 'grottoup') return [W.GROTTO_EXIT[0], W.GROTTO_EXIT[1], 0, '🌊 Wieder draußen am Wasserfall.', 'splash'];
  if (where === 'volcano') return [W.VOLCANO.x + W.VOLC_DOCK[0], W.VOLCANO.z + W.VOLC_DOCK[1] - 1.6, Math.PI, '🌋 Willkommen auf der Vulkaninsel! Heiße Quellen, Obsidian (Schaufel) und Feuerfalter (Kescher).', 'splash'];
  return null;
}

// ---------- Was kann man gerade tun? (Fernglas, Schlitten, Schneeball) ----------
export const onIce = m => W.isWinter(C.G.s) && inPond(m.x, m.z) && zoneOf(m) === 'island';
export function contextW(m, r) {
  const s = C.G.s, sel = C.G.sel;
  if (sel === 'bino' && !S.inside(m)) return { bino: true, label: '🔭 Ausschau halten', tiles: [] };
  if (sel === 'sled' && !S.inside(m)) return { sled: true, label: m.sled ? '🛷 Absteigen' : W.isWinter(s) ? '🛷 Aufsteigen' : '🛷 Nur im Winter', tiles: [] };
  if (r && (r.a || r.ui || r.go || r.npc || r.enter)) return null;
  if (!W.isWinter(s) || S.inside(m) || m.sw) return null;
  // Schneeball: wer steht vor mir (2–7 Felder, ungefähr in Blickrichtung)?
  const fx = Math.sin(m.ry), fz = Math.cos(m.ry), cand = [];
  for (const o of Object.values(C.G.players)) if (o.id !== C.G.me) cand.push({ on: o.key || o.id, name: o.name, x: o.x, z: o.z });
  for (const [id, e] of C.world.npcM || []) if (e.awake !== false) cand.push({ on: 'npc:' + id, name: id, x: e.x, z: e.z });
  let best = null;
  for (const c of cand) { const dx = c.x - m.x, dz = c.z - m.z, d = Math.hypot(dx, dz); if (d < 2 || d > 7 || (dx * fx + dz * fz) / d < 0.8) continue; if (!best || d < best.d) best = { ...c, d }; }
  return best ? { snowball: best, label: '❄️ Schneeball werfen', tiles: [] } : null;
}
export function executeW(r, fresh) {
  const m = me(), G = C.G;
  if (r.bino) { if (!fresh || performance.now() < (G.binoT || 0)) return true; G.binoT = performance.now() + 1500; m.emote = '🔭'; m.emoteUntil = performance.now() + 1400; C.send({ t: 'bird', op: 'look', x: m.x, z: m.z }); return true; }
  if (r.sled) { if (fresh) setSled(!m.sled); return true; }
  if (r.snowball) { if (fresh) throwSnow(m, r.snowball); return true; }
  if (r.canoe) { if (fresh) startCanoe(); return true; }
  return false;
}
export function setSled(on, quiet) {
  const m = me();
  if (on && (!W.isWinter(C.G.s) || !(C.G.s.inv.schlitten > 0) || S.inside(m) || m.sw || zoneOf(m) !== 'island')) { if (!quiet) C.toast('🛷 Schlittenfahren geht im Winter auf der Insel.'); return; }
  if (on && m.bike) C.setBike(false, true);
  m.sled = m.sl = on;
  if (on) { C.send({ t: 'snow', op: 'sled' }); C.play('plopp'); if (!quiet) C.toast('🛷 Huiii! Nochmal antippen zum Absteigen.'); }
}

// Schneeball fliegt in einem Bogen
const balls = [];
function throwSnow(m, t) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  C.world.scene.add(mesh);
  balls.push({ mesh, x0: m.x, z0: m.z, x1: t.x, z1: t.z, t: 0, dur: 0.12 * t.d + 0.15 });
  m.ry = Math.atan2(t.x - m.x, t.z - m.z);
  C.play('click');
  C.send({ t: 'snow', op: 'hit', on: t.on, x: t.x, z: t.z });
}

// ---------- Kanufahrt flussaufwärts ----------
let canoeM = null;
function startCanoe() {
  const G = C.G, m = me();
  if (G.canoe || !(G.s.inv.kanu > 0)) return;
  C.interrupt(); C.panels.close();
  if (m.bike) C.setBike(false, true);
  if (m.sled) setSled(false, true);
  const n = W.CANOE_PATH.length;
  G.canoe = { t0: performance.now(), grabs: [0.3, 0.55, 0.8].map(f => ({ i: Math.floor(f * n) + Math.floor(Math.random() * 4) - 2, got: false })) };
  if (!canoeM) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc87a46 }), dark = new THREE.MeshLambertMaterial({ color: 0x8a5230 });
    canoeM = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), wood); hull.scale.set(0.75, 0.38, 2.1); hull.position.y = 0.05;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 6, 20), dark); rim.scale.set(1, 2.8, 1); rim.rotation.x = Math.PI / 2; rim.position.y = 0.2;
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.4), dark); paddle.position.set(0.25, 0.55, 0); paddle.rotation.z = 0.5; paddle.name = 'paddle';
    canoeM.add(hull, rim, paddle);
  }
  C.world.scene.add(canoeM);
  C.send({ t: 'canoe', op: 'start' });
  setTimeout(() => C.toast('🛶 Leinen los! Unterwegs treibt manchmal etwas im Wasser – einfach daran vorbeipaddeln.'), 300);
}
function updateCanoe() {
  const G = C.G, c = G.canoe, m = me();
  if (!c) return;
  const t = (performance.now() - c.t0) / 1000, P = W.CANOE_PATH, f = Math.min(1, t / W.CANOE_SECS) * (P.length - 1), i = Math.floor(f), k = f - i;
  const a = P[i], b = P[Math.min(P.length - 1, i + 1)], x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k;
  Object.assign(m, { x, z, m: false, pose: 'sit', cn: true, ry: Math.atan2(b[0] - a[0], b[1] - a[1]) || Math.PI });
  canoeM.position.set(x, -0.18 + Math.sin(t * 2.4) * 0.03, z);
  canoeM.rotation.y = m.ry;
  canoeM.getObjectByName('paddle').rotation.x = Math.sin(t * 3) * 0.5;
  if (Math.random() < 0.15) C.world.burst(x + (Math.random() - 0.5), z + 0.6, 'splash', -0.1);
  for (const g of c.grabs) {
    const p = P[Math.max(0, Math.min(P.length - 1, g.i))];
    if (g.got) continue;
    C.world.tag('cgrab' + g.i, '🎁', p[0], 0.6 + Math.sin(t * 3 + g.i) * 0.08, p[1], 'bubble');
    if (Math.hypot(p[0] - x, p[1] - z) < 1.2) { g.got = true; C.send({ t: 'canoe', op: 'grab' }); C.world.burst(p[0], p[1], 'splash', 0); }
  }
  if (t >= W.CANOE_SECS) {
    G.canoe = null;
    C.world.scene.remove(canoeM);
    m.pose = null;
    m.cn = false;
    C.toast('🛶 Am Wasserfall angekommen … dahinter schimmert etwas!');
    C.travel('grotto');
  }
}

// ---------- Eislaufen auf dem zugefrorenen Teich ----------
// Auf dem Eis rutscht man: Eingaben beschleunigen nur langsam, losgelassen gleitet man weiter
export function iceMove(m, dx, dz, free) {
  if (!onIce(m)) { m.iv = null; return false; }
  const v = m.iv ||= { x: 0, z: 0 };
  v.x += (dx - v.x) * 0.06; v.z += (dz - v.z) * 0.06;
  if (free(m.x + v.x, m.z)) m.x += v.x; else v.x *= -0.4;
  if (free(m.x, m.z + v.z)) m.z += v.z; else v.z *= -0.4;
  return true;
}
function updateIce(dt) {
  const m = me();
  if (!onIce(m)) { m.lapA = null; return; }
  if (!m.m && m.iv && Math.hypot(m.iv.x, m.iv.z) > 0.002) { m.iv.x *= Math.pow(0.4, dt); m.iv.z *= Math.pow(0.4, dt); if (C.freeAt(m.x + m.iv.x, m.z + m.iv.z)) { m.x += m.iv.x; m.z += m.iv.z; } }
  const a = Math.atan2(m.z - POND.cz, m.x - POND.cx);
  if (m.lapA == null) { m.lapA = a; m.lapSum = 0; return; }
  let d = a - m.lapA; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  m.lapA = a; m.lapSum += d;
  if (Math.abs(m.lapSum) >= Math.PI * 2) { m.lapSum = 0; C.send({ t: 'snow', op: 'lap' }); C.world.burst(m.x, m.z, 'sparkle', 0.2); }
}

// ---------- Pro Bild ----------
export function updateW(dt) {
  if (!C?.G?.ready) return;
  updateCanoe();
  updateIce(dt);
  const m = me();
  if (m.sled && (!W.isWinter(C.G.s) || S.inside(m) || m.sw || zoneOf(m) !== 'island')) setSled(false, true);
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.t += dt / b.dur;
    const t = Math.min(1, b.t);
    b.mesh.position.set(b.x0 + (b.x1 - b.x0) * t, 1.1 + Math.sin(t * Math.PI) * 1.2, b.z0 + (b.z1 - b.z0) * t);
    if (b.t >= 1) { C.world.scene.remove(b.mesh); C.world.burst(b.x1, b.z1, 'dust', 1.1); balls.splice(i, 1); }
  }
}

// ---------- Minispiel-Fenster ----------
function openGame(title, w, h, g) {
  const G = C.G;
  C.panels.close();
  G.mg = { w, h, ...g };
  const cv = $('mgcv'), sc = Math.min(1, (innerWidth - 40) / w, (innerHeight - 170) / h);
  cv.width = w; cv.height = h; cv.style.width = w * sc + 'px'; cv.style.height = h * sc + 'px';
  $('mghead').innerHTML = title;
  $('mgfoot').textContent = '';
  $('mgame').classList.remove('hidden');
  let last = performance.now();
  const loop = now => { if (G.mg !== g.self) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; G.mg.step?.(dt); G.mg.draw?.(cv.getContext('2d')); requestAnimationFrame(loop); };
  g.self = G.mg;
  G.mg.self = G.mg;
  requestAnimationFrame(loop);
}
function endGame(quit) {
  const G = C.G;
  if (!G?.mg) return;
  const done = G.mg.done;
  G.mg = null;
  $('mgame').classList.add('hidden');
  if (!quit) done?.();
}

// Minigolf: ziehen & loslassen, Wände prallen ab
function startGolf() {
  const H = W.HOLES, strokes = [];
  let hole = 0, ball, vel, aim = null, sunk = 0;
  const reset = () => { ball = { x: H[hole].tee[0], y: H[hole].tee[1] }; vel = { x: 0, y: 0 }; strokes[hole] = 0; sunk = 0; };
  reset();
  const R = 6, walls = () => [...H[hole].walls, [0, 0, 300, 0], [300, 0, 300, 420], [300, 420, 0, 420], [0, 420, 0, 0]];
  const foot = () => { $('mgfoot').textContent = `Bahn ${hole + 1}/9 · Par ${H[hole].par} · Schläge ${strokes[hole]} · gesamt ${strokes.reduce((t, v) => t + v, 0)}`; };
  openGame('⛳ Minigolf', 300, 420, {
    down: p => { if (!sunk && Math.hypot(vel.x, vel.y) < 5) aim = p; },
    move: p => { if (aim) aim = p; },
    up: () => {
      if (!aim) return;
      const dx = ball.x - aim.x, dy = ball.y - aim.y, len = Math.min(150, Math.hypot(dx, dy));
      if (len > 6) { const k = len / Math.hypot(dx, dy) * 6.2; vel = { x: dx * k, y: dy * k }; strokes[hole]++; C.play('click'); foot(); }
      aim = null;
    },
    step(dt) {
      if (sunk) { sunk -= dt; if (sunk <= 0) { hole++; if (hole >= H.length) { C.send({ t: 'golf', op: 'score', strokes, name: C.profile.name }); endGame(); return; } reset(); foot(); } return; }
      const steps = 4;
      for (let k = 0; k < steps; k++) {
        ball.x += vel.x * dt / steps; ball.y += vel.y * dt / steps;
        for (const [x1, y1, x2, y2] of walls()) {
          const ex = x2 - x1, ey = y2 - y1, t = Math.max(0, Math.min(1, ((ball.x - x1) * ex + (ball.y - y1) * ey) / (ex * ex + ey * ey))), px = x1 + ex * t, py = y1 + ey * t, d = Math.hypot(ball.x - px, ball.y - py);
          if (d < R + 3) { const nx = (ball.x - px) / (d || 1), ny = (ball.y - py) / (d || 1), dot = vel.x * nx + vel.y * ny; ball.x = px + nx * (R + 3.01); ball.y = py + ny * (R + 3.01); if (dot < 0) { vel.x -= 2 * dot * nx * 0.9; vel.y -= 2 * dot * ny * 0.9; } }
        }
        for (const [bx, by, br] of H[hole].bump) { const d = Math.hypot(ball.x - bx, ball.y - by); if (d < br + R) { const nx = (ball.x - bx) / d, ny = (ball.y - by) / d, dot = vel.x * nx + vel.y * ny; ball.x = bx + nx * (br + R + 0.01); ball.y = by + ny * (br + R + 0.01); if (dot < 0) { vel.x -= 2 * dot * nx; vel.y -= 2 * dot * ny; C.play('plopp'); } } }
      }
      const f = Math.pow(0.42, dt); vel.x *= f; vel.y *= f;
      if (Math.hypot(vel.x, vel.y) < 4) vel = { x: 0, y: 0 };
      const [cx, cy] = H[hole].cup;
      if (Math.hypot(ball.x - cx, ball.y - cy) < 10 && Math.hypot(vel.x, vel.y) < 380) { sunk = 0.8; vel = { x: 0, y: 0 }; ball = { x: cx, y: cy }; C.play(strokes[hole] === 1 ? 'fanfare' : 'found'); $('mgfoot').textContent = strokes[hole] === 1 ? '⛳ Ass! Mit einem Schlag!' : `⛳ Eingelocht mit ${strokes[hole]}!`; }
      else if (strokes[hole] >= 8 && Math.hypot(vel.x, vel.y) === 0) { sunk = 0.8; $('mgfoot').textContent = 'Acht Schläge – weiter zur nächsten Bahn.'; }
    },
    draw(x) {
      x.fillStyle = '#5cbf63'; x.fillRect(0, 0, 300, 420);
      x.strokeStyle = '#a8744a'; x.lineWidth = 6; x.lineCap = 'round';
      for (const [x1, y1, x2, y2] of walls()) { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }
      x.fillStyle = '#ff8fab'; for (const [bx, by, br] of H[hole].bump) { x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
      const [cx, cy] = H[hole].cup;
      x.fillStyle = '#2b3a2b'; x.beginPath(); x.arc(cx, cy, 9, 0, 7); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy - 34); x.stroke();
      x.fillStyle = '#ff5a5a'; x.beginPath(); x.moveTo(cx, cy - 34); x.lineTo(cx + 18, cy - 28); x.lineTo(cx, cy - 22); x.fill();
      if (aim) { x.strokeStyle = 'rgba(255,255,255,.8)'; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(ball.x, ball.y); x.lineTo(ball.x + (ball.x - aim.x), ball.y + (ball.y - aim.y)); x.stroke(); x.setLineDash([]); }
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ball.x, ball.y, R, 0, 7); x.fill();
    },
  });
  foot();
}

// Tanzabend: Noten fallen auf vier Spuren, im Takt drücken
function startDance(song) {
  const notes = W.songNotes(song).map(([b, l]) => ({ t: b * 60 / song.bpm, l, hit: null })), spb = 60 / song.bpm, KEYS = { arrowleft: 0, a: 0, arrowdown: 1, s: 1, arrowup: 2, w: 2, arrowright: 3, d: 3 };
  const ARROWS = ['⬅️', '⬇️', '⬆️', '➡️'], COL = ['#ff8fab', '#6cc4ff', '#8fd694', '#ffd23f'], LINE = 360, SPEED = 230;
  let t = -1, score = 0, beat = -1, flash = [0, 0, 0, 0], judge = '';
  const press = l => {
    flash[l] = 0.15;
    const n = notes.filter(n => n.l === l && !n.hit).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    if (!n) return;
    const d = Math.abs(n.t - t);
    if (d < 0.12) { n.hit = 'perfekt'; score += 100; judge = '✨ Perfekt!'; pianoNote(60 + [0, 4, 7, 12][l], 0.5, 0.3); }
    else if (d < 0.22) { n.hit = 'gut'; score += 60; judge = '👍 Gut'; pianoNote(60 + [0, 4, 7, 12][l], 0.35, 0.25); }
  };
  openGame(`💃 ${song.name}`, 300, 420, {
    key: k => { const l = KEYS[k.toLowerCase()]; if (l === undefined) return false; press(l); return true; },
    down: p => press(Math.max(0, Math.min(3, Math.floor(p.x / 75)))),
    step(dt) {
      t += dt;
      for (let i = 0; i < 4; i++) flash[i] = Math.max(0, flash[i] - dt);
      const b = Math.floor(t / spb);
      if (b !== beat && t > 0) { beat = b; pianoNote(b % 4 ? 43 : 36, b % 4 ? 0.12 : 0.22, 0.2); }
      for (const n of notes) if (!n.hit && t - n.t > 0.25) { n.hit = 'miss'; judge = '💨 Daneben'; }
      $('mgfoot').textContent = `${judge} · ${score} Punkte`;
      if (t > notes[notes.length - 1].t + 1.2) { C.send({ t: 'dance', op: 'score', song: song.id, score }); endGame(); }
    },
    draw(x) {
      x.fillStyle = '#2a2340'; x.fillRect(0, 0, 300, 420);
      for (let i = 0; i < 4; i++) { x.fillStyle = flash[i] > 0 ? COL[i] + '55' : 'rgba(255,255,255,.04)'; x.fillRect(i * 75 + 4, 0, 67, 420); }
      x.font = '30px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 4; i++) { x.globalAlpha = 0.35; x.fillText(ARROWS[i], i * 75 + 37, LINE); }
      x.globalAlpha = 1;
      x.strokeStyle = '#fff8'; x.beginPath(); x.moveTo(0, LINE); x.lineTo(300, LINE); x.stroke();
      for (const n of notes) { if (n.hit && n.hit !== 'miss') continue; const y = LINE - (n.t - t) * SPEED; if (y < -30 || y > 440) continue; x.globalAlpha = n.hit === 'miss' ? 0.3 : 1; x.fillText(ARROWS[n.l], n.l * 75 + 37, y); }
      x.globalAlpha = 1;
      if (t < 0) { x.fillStyle = '#fff'; x.font = 'bold 26px system-ui'; x.fillText('Gleich geht’s los!', 150, 200); }
    },
  });
}

// Kaffee kochen: dreimal im richtigen Moment tippen
function startBrew(k) {
  let round = 0, q = 0, t = 0, zone = 0.3 + Math.random() * 0.4, msg = 'Tippe, wenn der Zeiger im grünen Feld ist!';
  const STEPS = ['☕ Bohnen mahlen', '🥛 Milch schäumen', '💗 Herz in den Schaum'];
  const tap = () => {
    const m = (Math.sin(t * (2.2 + round * 0.6)) + 1) / 2, ok = Math.abs(m - zone) < 0.09;
    if (ok) q++;
    msg = ok ? '✨ Genau richtig!' : '💦 Fast …';
    C.play(ok ? 'plopp' : 'click');
    round++; zone = 0.2 + Math.random() * 0.6;
    if (round >= 3) { C.send({ t: 'cafe', op: 'brew', k, q }); setTimeout(() => endGame(), 400); }
  };
  openGame('☕ Zubereiten', 300, 180, {
    down: tap, key: kk => (kk === ' ' || kk === 'Enter' || kk.toLowerCase() === 'e' ? (tap(), true) : false),
    step(dt) { t += dt; $('mgfoot').textContent = msg; },
    draw(x) {
      x.fillStyle = '#fff3e0'; x.fillRect(0, 0, 300, 180);
      x.fillStyle = '#5a4030'; x.font = 'bold 18px system-ui'; x.textAlign = 'center'; x.fillText(STEPS[Math.min(2, round)], 150, 40);
      x.fillStyle = '#e8dcc6'; x.fillRect(20, 80, 260, 26);
      x.fillStyle = '#8fd694'; x.fillRect(20 + (zone - 0.09) * 260, 80, 0.18 * 260, 26);
      const m = (Math.sin(t * (2.2 + round * 0.6)) + 1) / 2;
      x.fillStyle = '#ff6b8a'; x.fillRect(20 + m * 260 - 3, 72, 6, 42);
      x.fillStyle = '#5a4030'; x.font = '15px system-ui'; x.fillText(`${'⭐'.repeat(q)}${'☆'.repeat(round - q)}`, 150, 150);
    },
  });
}
