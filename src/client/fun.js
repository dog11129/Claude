// Kleine Spiele & Ausflüge auf der Spielerseite: Ruckel-Schutz, Ballonfahrt, Fotowettbewerb, Sternbilder zeichnen,
// Fahrrad und Drachen. Was main.js dafür hat (G, world, send, toast …), kommt über initFun() als Getter herein.
import * as S from '../state.js';
import { CROPS, PLACE } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import { PRESETS } from '../menu.js';
import { zoneOf } from '../newleaf.js';
import * as photos from '../photos.js';
import { RIDE_SECS, ridePos, skyGiftTimes, BRIGHT, photoTheme } from '../extras3.js';

let C = null;
export function initFun(ctx) {
  C = ctx;
  C.$('photoentry').onclick = () => photoEntry();
  // Sternbilder: Sterne antippen und verbinden
  C.$('pbody').addEventListener('pointerdown', e => {
    if (e.target.id !== 'cstcv' || !C.G?.cst) return;
    const r = e.target.getBoundingClientRect(), W = e.target.width, H = e.target.height, x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H, c = C.G.cst;
    let best = -1, bd = 26;
    BRIGHT[c.sec].forEach((b, i) => { const [sx, sy] = starXY(c.sec, b, W, H), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) { c.sel = null; return; }
    if (c.sel === null || c.sel === best) { c.sel = c.sel === best ? null : best; C.play('click'); return; }
    if (c.lines.length < 14 && !c.lines.some(([a, b]) => (a === c.sel && b === best) || (a === best && b === c.sel))) { c.lines.push([c.sel, best]); C.play('click'); }
    c.sel = best;
  });
}

// ---------- Ruckel-Schutz: bei dauerhaft wenigen Bildern pro Sekunde die Grafik eine Stufe runter ----------
const QUALITY_STEPS = ['ultra', 'high', 'mid', 'low'];
export function autoQuality(dt) {
  if (C.settings.autoQuality === false || document.hidden || C.G.photo) return;
  const q = C.G.fpsQ ||= { t: 0, n: 0, slow: 0 };
  q.t += dt; q.n++;
  if (q.t < 4) return;
  const fps = q.n / q.t;
  q.slow = fps < 24 ? q.slow + 1 : 0;
  q.t = 0; q.n = 0;
  const i = QUALITY_STEPS.indexOf(C.settings.quality);
  if (q.slow >= 3 && i >= 0 && i < QUALITY_STEPS.length - 1) {
    q.slow = 0;
    C.settings.quality = QUALITY_STEPS[i + 1];
    Object.assign(C.settings, PRESETS[C.settings.quality]);
    C.store.set('kh.settings', C.settings);
    C.applyView();
    C.toast(`🐢 Das Spiel hat geruckelt – Grafik automatisch auf „${{ high: 'Hoch', mid: 'Mittel', low: 'Niedrig' }[C.settings.quality]}“ gestellt. (⚙️ Optionen)`);
  }
}

// ---------- Ballonfahrt ----------
export function startRide() {
  const me = C.G.players[C.G.me], st = Object.entries(C.G.s.obj || {}).find(([, o]) => o?.k === 'ballonplatz');
  if (!st || C.G.ride) return;
  C.interrupt(); C.panels.close();
  if (me.bike) setBike(false, true);
  if (C.G.kite) endKite();
  me.pose = null;
  const [sx, sz] = st[0].split(',').map(Number);
  C.G.ride = { t: 0, t0: performance.now(), sx, sz, shot: false, gifts: skyGiftTimes(C.G.s).map(tt => { const p = ridePos(tt, sx, sz); return { x: p.x, y: p.y + 1.3, z: p.z, got: false }; }) };
  setTimeout(() => C.toast('🎈 Wir heben ab! Fliegt durch die Geschenkballons, um sie zu fangen.'), 300);
}
export function updateRide(dt) {
  const r = C.G.ride, me = C.G.players[C.G.me];
  if (!r) { me.rh = 0; return; }
  r.t = (performance.now() - r.t0) / 1000; // echte Zeit (auch wenn Bilder ausfallen)
  const p = ridePos(r.t, r.sx, r.sz), q = ridePos(r.t + 0.3, r.sx, r.sz);
  Object.assign(me, { x: p.x, z: p.z, rh: p.y, m: false });
  if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01) me.ry = Math.atan2(q.x - p.x, q.z - p.z);
  for (const g of r.gifts) if (!g.got && Math.hypot(g.x - p.x, g.z - p.z) < 2.4) { g.got = true; C.send({ t: 'skygift' }); C.world.burst(g.x, g.z, 'coin', g.y); C.play('found'); }
  if (!r.shot && r.t > 16) { r.shot = true; C.send({ t: 'rideshot' }); }
  if (r.t > (r.burn || 0)) { r.burn = r.t + 7 + Math.random() * 5; C.play('burner'); C.world.burst(me.x, me.z, 'smoke', me.rh + 1.7); }
  if (r.t >= RIDE_SECS) endRide();
}
export function endRide() {
  const r = C.G.ride, me = C.G.players[C.G.me];
  if (!r) return;
  C.G.ride = null;
  me.rh = 0;
  const spot = [[0, 2.2], [2.2, 0], [-2.2, 0], [0, -2.2]].find(([a, b]) => C.freeAt(r.sx + a, r.sz + b)) || [0, 2.2];
  Object.assign(me, { x: r.sx + spot[0], z: r.sz + spot[1], ry: 0 });
  C.world.burst(me.x, me.z, 'dust');
  C.toast('🎈 Sanft gelandet. Was für eine Aussicht!');
}

// ---------- Fotowettbewerb: Bild bewerten (was ist zu sehen?) und einreichen ----------
export function sceneScore(theme) {
  const s = C.G.s, me = C.G.players[C.G.me], cx = C.world.target.x, cz = C.world.target.z, h = 6 + s.dayTime * 18, night = h >= 20 || h < 5, near = (x, z, r = 6) => Math.hypot(x - cx, z - cz) <= r;
  const objs = Object.entries(s.obj || {}).filter(([k]) => { const [x, z] = k.split(',').map(Number); return near(x, z, 7); }).map(([, o]) => o.k);
  let base = 0;
  if (theme === 'blumen') { const fl = Object.entries(s.tiles || {}).filter(([k, t]) => t?.c && CROPS[t.c.k]?.cat === 'fruit' && S.stage(t.c) === 3 && near(...k.split(',').map(Number))).length; base = Math.min(70, fl * 5 + objs.filter(k => ['blumen', 'rosenbogen', 'blumenkuebel', 'rosenstrauch', 'fliederbusch', 'hortensie'].includes(k)).length * 6); }
  if (theme === 'abend') base = !S.inside(me) && h >= 17 && h <= 20.5 ? Math.max(10, 70 - Math.abs(h - 18.7) * 22) : 0;
  if (theme === 'nacht') base = night && !S.inside(me) ? Math.min(70, 40 + (s.starNight ? 15 : 0) + objs.filter(k => PLACE[k]?.glow).length * 5) : 0;
  if (theme === 'freunde') base = Math.min(70, (Object.values(C.G.players).filter(p => near(p.x, p.z)).length - 1) * 18 + [...(C.world.npcM || [])].filter(([, e]) => e.awake && near(e.x, e.z)).length * 12);
  if (theme === 'tiere') base = Math.min(70, Object.values(C.G.players).filter(p => p.look?.pet && near(p.x, p.z)).length * 15 + objs.filter(k => PLACE[k]?.farm).length * 20 + objs.filter(k => k === 'schmetterlingshaus').length * 15 + (C.world.bfM?.size || 0) * 5);
  if (theme === 'strand') { let n = 0; for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (S.sandX(Math.round(cx) + x, Math.round(cz) + z)) n++; base = n > 8 ? Math.min(70, 30 + Object.keys(s.castles || {}).filter(k => near(...k.split(',').map(Number))).length * 12 + Object.keys(s.shells || {}).filter(k => near(...k.split(',').map(Number))).length * 4 + objs.filter(k => ['strandkorb', 'sonnenschirm', 'liegestuhl', 'surfbrett', 'strandgrill'].includes(k)).length * 8) : 0; }
  if (theme === 'wetter') base = !S.inside(me) ? { rain: 55, snow: 60, storm: 70, fog: 60 }[s.weather] || (s.rainbow ? 50 : 8) : 0;
  if (theme === 'zuhause' && S.inside(me)) { const R = S.roomOf(s, S.roomIdAt(me.z)), all = [...Object.values(R.items), ...Object.values(R.rugs), ...Object.values(R.walls)]; base = Math.min(70, all.length * 4 + new Set(all.map(o => FURNITURE[o.k]?.cat)).size * 4); }
  const bonus = Math.min(15, (Object.values(C.G.players).filter(p => p.emoteUntil > performance.now()).length) * 8) + Math.floor(Math.random() * 15);
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}
export async function photoEntry() {
  if (!C.G?.ready) return;
  const th = photoTheme(C.G.s), sc = sceneScore(th);
  C.play('shutter');
  C.$('flash').classList.add('on');
  setTimeout(() => C.$('flash').classList.remove('on'), 60);
  const url = C.world.snapshot();
  let img = await photos.shrink(url, 200, 0.6);
  if (img.length > 19000) img = await photos.shrink(url, 140, 0.5);
  await photos.add(C.isleKey(), await photos.shrink(url, 1100, 0.86), { kind: 'photo', day: C.G.s.day });
  C.send({ t: 'photoentry', score: sc, img, name: C.profile.name });
}

// ---------- Sternbilder zeichnen ----------
const starXY = (sec, b, W, H) => [(b.az - (sec * 45 - 25)) / 50 * W, H - (b.el - 10) / 38 * H];
export function drawStars() {
  const cv = C.$('cstcv');
  if (!cv) return;
  C.G.cst ||= { sec: 0, lines: [], sel: null };
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, c = C.G.cst, st = BRIGHT[c.sec];
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1433'); gr.addColorStop(1, '#2a3a78');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect((i * 97) % W, (i * 53) % H, 1.5, 1.5); }
  g.lineWidth = 2;
  for (const k of C.G.s.consts || []) if (k.sec === c.sec) {
    g.strokeStyle = 'rgba(190,210,255,0.35)';
    for (const [a, b] of k.l) { const A = starXY(c.sec, st[a], W, H), B = starXY(c.sec, st[b], W, H); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); }
    const A = starXY(c.sec, st[k.l[0][0]], W, H); g.fillStyle = 'rgba(220,230,255,0.7)'; g.font = '12px sans-serif'; g.fillText(k.n, A[0] + 8, A[1] - 8);
  }
  g.strokeStyle = '#ffe9a8'; g.lineWidth = 3;
  for (const [a, b] of c.lines) { const A = starXY(c.sec, st[a], W, H), B = starXY(c.sec, st[b], W, H); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); }
  st.forEach((b, i) => { const [x, y] = starXY(c.sec, b, W, H); g.fillStyle = i === c.sel ? '#ff9ab8' : '#fff4c8'; g.beginPath(); g.arc(x, y, 4 + b.m * 4 + (i === c.sel ? 3 : 0), 0, Math.PI * 2); g.fill(); });
}


// ---------- Fahrrad ----------
export function setBike(on, quiet) {
  const me = C.G.players[C.G.me];
  if (on && (!(C.G.s.inv.fahrrad > 0) || me.sw || S.inside(me) || ['reef', 'wreck', 'depths'].includes(zoneOf(me)))) { if (!quiet) C.toast('🚲 Hier geht Radfahren nicht.'); return; }
  if (!!me.bike === on) return;
  me.bike = me.bk = on;
  if (on && me.pose) me.pose = null;
  C.world.burst(me.x, me.z, 'dust');
  if (!quiet) { C.play(on ? 'whistle' : 'click'); C.toast(on ? '🚲 Kling kling – los geht\'s!' : '🚲 Abgestiegen.'); }
}

// ---------- Drachen steigen lassen ----------
// 25 Sekunden: Die Markierung pendelt hin und her, das grüne Feld ist die Böe. Im Feld drücken = höher, daneben = Absacker.
const KITE_SECS = 25;
const kiteMark = k => (Math.sin(k.t * 2.6) + 1) / 2;
const kiteZone = k => ({ c: 0.5 + Math.sin(k.t * 0.55) * 0.28 + Math.sin(k.t * 1.3) * 0.07, w: Math.max(0.13, 0.3 - k.t * 0.0065) });
export function startKite() {
  const me = C.G.players[C.G.me];
  if (C.G.kite || !(C.G.s.inv.drache > 0)) return;
  if (S.inside(me) || me.sw || ['reef', 'wreck', 'depths'].includes(zoneOf(me)) || me.x < -150) { C.toast('🪁 Hier weht kein Wind – raus an den Strand!'); return; }
  C.interrupt();
  if (me.bike) setBike(false, true);
  me.pose = null;
  me.ry = C.world.yaw; // zur Kamera drehen: der Drachen steigt vor der Figur auf
  C.G.kite = { t: 0, h: 10, best: 10, armed: true, cool: 0 };
  C.$('kitebar').classList.remove('hidden');
  C.toast(C.touch ? '🪁 Tippe, wenn die Markierung im grünen Böen-Feld ist!' : '🪁 Drücke E, wenn die Markierung im grünen Böen-Feld ist!');
  C.play('launch');
}
export function kitePull() {
  const k = C.G.kite, now = performance.now();
  if (!k || k.t < 0.5 || now < k.cool) return;
  k.cool = now + 200;
  const m = kiteMark(k), z = kiteZone(k), me = C.G.players[C.G.me];
  if (Math.abs(m - z.c) < z.w / 2 && k.armed) {
    k.armed = false;
    k.h = Math.min(120, k.h + 7 + (1 - Math.abs(m - z.c) / (z.w / 2)) * 6);
    k.best = Math.max(k.best, k.h);
    C.play('plopp'); C.bump('kitebar', 'pop');
    C.world.float(me.x, me.z, '💨', 2.6);
  } else { k.h = Math.max(0, k.h - 3); C.play('fail'); }
}
export function updateKite(dt) {
  const k = C.G.kite, me = C.G.players[C.G.me];
  if (!k) { me.kh = 0; return; }
  k.t += dt;
  k.h = Math.max(0, k.h - dt * (1.5 + k.h * 0.022));
  const m = kiteMark(k), z = kiteZone(k);
  if (Math.abs(m - z.c) >= z.w / 2) k.armed = true; // eine Böe zählt nur einmal
  me.kh = Math.round(k.h * 10) / 10;
  C.$('kitemark').style.left = `${m * 100}%`;
  C.$('kitezone').style.left = `${(z.c - z.w / 2) * 100}%`;
  C.$('kitezone').style.width = `${z.w * 100}%`;
  C.setText('kiteh', `🪁 ${Math.round(k.h)} m · Bestwert ${Math.round(k.best)} m`);
  C.setText('kitetime', `⏱️ ${Math.max(0, Math.ceil(KITE_SECS - k.t))} s`);
  if (k.t >= KITE_SECS || (k.h <= 0 && k.t > 3)) endKite();
}
export function endKite() {
  const k = C.G.kite;
  if (!k) return;
  C.G.kite = null;
  C.G.players[C.G.me].kh = 0;
  C.$('kitebar').classList.add('hidden');
  if (k.h <= 0 && k.best < 14) { C.toast('🪁 Abgestürzt … nochmal! Drück genau dann, wenn die Markierung im grünen Feld ist.'); C.play('fail'); return; }
  C.send({ t: 'kitescore', score: Math.round(k.best), name: C.profile.name });
}

