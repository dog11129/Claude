// Inselleben 8 im Browser: Träumen (Bett → Traumwelt → Kissen), Surf-Minispiel, Hochzeit (Plätze, Rede, „Ja, ich will!“,
// Feuerwerk), Sonnenuntergang auf der Klippenbank (Kamera, Herzen). Logik beim Host: src/extras8.js.
import * as S from '../state.js';
import * as E from '../extras8.js';
import { zoneOf } from '../newleaf.js';
import { openGame, endGame } from './fun2.js';
import { rocket7 } from '../world-extra4.js';
import { pianoNote } from '../audio.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
const myKey = () => me()?.key || 'host';
export function initFun6(ctx) {
  C = ctx;
  const st = document.createElement('style');
  st.textContent = `#wed8 { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 112px); transform: translateX(-50%); z-index: 30; background: #fffdf9; border: 3px solid #ffb7c8; border-radius: 18px;
  padding: 8px 16px; box-shadow: 0 6px 18px rgba(90,60,50,.18); font: 600 15px Fredoka, system-ui, sans-serif; color: #5a4636; max-width: min(440px, 92vw); text-align: center; pointer-events: none; transition: opacity .4s; }
#wed8 small { display: block; font-weight: 500; font-size: 12.5px; color: #8a7666; } #wed8.off { opacity: 0; }`;
  document.head.appendChild(st);
  const card = document.createElement('div'); card.id = 'wed8'; card.className = 'off'; document.body.appendChild(card);
  const hold = on => e => { const g = C.G?.surf8?.game; if (g && [' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { g.hold(on); e.preventDefault(); } };
  addEventListener('keydown', e => { if (!e.repeat) hold(true)(e); }, true);
  addEventListener('keyup', hold(false), true);
}
export const busy8 = () => !!C?.G?.surf8;

// ---------- Knöpfe (ui: 'g:…') ----------
export function uiG(kind, d) {
  if (kind === 'surf') startSurf();
  if (kind === 'wedstart') { C.panels.close(); C.send({ t: 'wed', op: 'start', x: d.x, z: d.z }); }
}

// ---------- Orte ----------
export function travel8(where) {
  if (where === 'dream') return [E.DREAM.x + E.DREAM_START[0], E.DREAM.z + E.DREAM_START[1], Math.PI, '🌙 Du träumst … Wolkenbrücken, schwebende Inseln und überall glitzern 🌠 Traumsterne. Mondschaf Luna 🐑 wartet im Norden, das Kissen ☁️ im Süden weckt dich.', 'door'];
  return null;
}

// ---------- Aktionsknopf ----------
export function context8(m) {
  const G = C.G, s = G.s, W = s.wedding;
  if (G.surf8) return { label: '🏄 Surfen …', tiles: [] };
  if (m.pose === 'sleep' && S.inside(m) && E.dreamOk(s)) return { dreamIn: true, label: '🌙 Einschlafen & träumen', tiles: [] };
  if (W && !W.done && E.wedT(s) >= E.WED.ask && !W.yes?.[myKey()] && Math.hypot(m.x - W.x, m.z - W.z) < 8) return { wedYes: true, label: '💍 Ja, ich will!', tiles: [] };
  return null;
}
export function execute8(r, fresh) {
  if (r.dreamIn) { if (fresh) enterDream(); return true; }
  if (r.wedYes) { if (fresh) { C.send({ t: 'wed', op: 'yes' }); C.world.burst(me().x, me().z, 'heart', 1.4); } return true; }
  if (r.surf) { if (fresh) startSurf(); return true; }
  if (r.go === 'dreamwake') { if (fresh) wakeDream(); return true; }
  return false;
}

// ---------- Träumen ----------
function enterDream() {
  const G = C.G, m = me();
  if (!E.dreamOk(G.s) || zoneOf(m) === 'dream') return;
  G.dreamBed = { x: m.x, z: m.z, ry: m.ry };
  C.send({ t: 'dream', op: 'enter' });
  C.travel('dream');
  C.play('join');
  pianoNote(84, 0.6, 0.25); setTimeout(() => pianoNote(88, 0.6, 0.25), 220); setTimeout(() => pianoNote(91, 0.9, 0.25), 440);
}
function wakeDream(msg = '☀️ Du wachst in deinem Bett auf … was für ein schöner Traum!') {
  const G = C.G, m = me(), b = G.dreamBed;
  G.dreamBed = null;
  if (!b) { C.travel('island'); return; }
  C.interrupt(); C.panels.close(); C.fade();
  Object.assign(m, { x: b.x, z: b.z, ry: b.ry, pose: 'sleep' });
  C.world.yawT = C.world.yaw = 0;
  setTimeout(() => C.toast(msg), 400);
  C.play('door');
}

// ---------- Hochzeit ----------
function card(html) {
  const el = $('wed8');
  if (!el) return;
  if (html) { if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } el.classList.remove('off'); } else el.classList.add('off');
}
function updateWedding(m, dt) {
  const G = C.G, s = G.s, W = s.wedding, w = C.world;
  if (!W) { if (G.wed8) { G.wed8 = null; card(null); } return; }
  const sp = E.wedSpots(W.x, W.z, W.r), t = E.wedT(s), near = Math.hypot(m.x - W.x, m.z - W.z) < 30 && zoneOf(m) === 'island';
  if (!near) { card(null); return; }
  if (!G.wed8 || G.wed8.t0 !== W.t0) { // Neu dabei: ans Altar stellen (Gastgeber links, Gast rechts)
    G.wed8 = { t0: W.t0, said: -1, fw: 0, kiss: 0 };
    const [x, z, ry] = sp.couple[myKey() === 'host' ? 0 : 1];
    C.interrupt(); C.panels.close(); C.fade();
    Object.assign(m, { x, z, ry, pose: null });
    w.yawT = sp.face;
    C.play('join');
  }
  const R = G.wed8;
  if (W.done) {
    card(`💍 ${s.married?.names?.join(' & ') || 'Ihr zwei'} – frisch verheiratet! <small>Die ganze Insel jubelt 🎉</small>`);
    if (!R.kiss) { R.kiss = 1; C.play('fanfare'); w.burst(sp.altar[0], sp.altar[1], 'heart', 1.6); w.npcBubble?.('mira', 'Ihr dürft euch jetzt küssen! 💋'); }
    R.fw -= dt;
    if (R.fw <= 0) { R.fw = 0.55 + Math.random() * 0.5; const a = Math.random() * Math.PI * 2; rocket7(w, sp.altar[0] + Math.cos(a) * 5, sp.altar[1] + Math.sin(a) * 5, 9 + Math.random() * 3, [0xff8fab, 0xffd23f, 0xc9b8ff, 0x8fd4ff][Math.floor(Math.random() * 4)], Math.random() < 0.6 ? 'herz' : 'ring'); }
    if (Math.random() < dt * 3) w.burst(sp.altar[0] + (Math.random() - 0.5) * 4, sp.altar[1] + (Math.random() - 0.5) * 4, 'petal', 2.5);
    return;
  }
  const L = E.WED.speech, line = t < E.WED.seat ? -1 : t < L[1] ? 0 : t < L[2] ? 1 : t < E.WED.ask ? 2 : 3;
  if (line !== R.said) { R.said = line; if (line >= 0) { w.npcBubble?.('mira', line < 3 ? E.WED_LINES[line] : E.WED_ASK); pianoNote([72, 76, 79, 84][line], 0.8, 0.22); } }
  const yes = Object.values(W.yes || {});
  card(line < 0 ? '💐 Die Nachbarn nehmen Platz …' : line < 3 ? `🦔 Mira: „${E.WED_LINES[line]}“` : `🦔 Mira: „${E.WED_ASK}“<small>${yes.length ? `💍 ${yes.join(' & ')} hat Ja gesagt!` : 'Drückt beide ✋ „Ja, ich will!“'}</small>`);
  if (Math.random() < dt * 0.8) w.burst(sp.altar[0] + (Math.random() - 0.5) * 3, sp.altar[1] + (Math.random() - 0.5) * 3, 'petal', 2.2);
}

// ---------- Sonnenuntergang auf der Klippenbank ----------
function updateSunset(m, dt) {
  const G = C.G, s = G.s, w = C.world;
  let pair = null;
  if (m.pose === 'sit' && E.sunsetTime(s)) for (const [x, z, r] of E.benches(s)) {
    const st = E.seats(x, z, r), mine = st.findIndex(([sx, sz]) => Math.hypot(sx - m.x, sz - m.z) < 0.15);
    if (mine < 0) continue;
    const other = Object.values(G.players).find(p => p !== m && p.pose === 'sit' && Math.hypot(st[1 - mine][0] - p.x, st[1 - mine][1] - p.z) < 0.3);
    if (other) { pair = { x, z, r, other }; break; }
  }
  if (!pair) { G.sun8 = null; return; }
  if (!G.sun8) {
    G.sun8 = { t: 0 };
    w.yawT = pair.r * Math.PI / 2 + Math.PI; // Kamera hinter die Bank: beide schauen in den Sonnenuntergang
    C.toast('🌅 Wie schön … ein Sonnenuntergang zu zweit 💕');
    C.play('love');
    if (G.role === 'host' && s.bench8?.day !== s.day) C.send({ t: 'bench8', op: 'sunset', names: [m.name, pair.other.name] });
  }
  G.sun8.t += dt;
  if (G.sun8.t > 1.6) { G.sun8.t = 0; w.burst(pair.x, pair.z, 'heart', 1.4); }
}

// ---------- Surfen: halten = die Welle hinauf, loslassen = hinunter; über die Kante springen und in der Luft tippen = Trick ----------
function startSurf() {
  const G = C.G, m = me();
  if (G.surf8 || G.mg) return;
  if (!(G.s.inv?.surfbrett > 0) && !Object.values(G.s.obj || {}).some(o => o?.k === 'surfbrett')) { C.toast('🏄 Dafür braucht ihr ein Surfbrett.'); return; }
  C.interrupt();
  const sp = E.surfSpot(m), back = [m.x, m.z, m.ry];
  if (sp) Object.assign(m, { x: sp[0], z: sp[1], pose: null });
  m.sf = true;
  const W = 420, H = 300, TROUGH = 248, LIP = 112, FACE = TROUGH - LIP;
  let t = E.SURF_SECS, y = 0.2, vy = 0, speed = 1, air = false, ay = 0, avy = 0, rot = 0, spin = 0, tricks = 0, allTricks = 0, combo = 0, score = 0, wipe = 0, msg = '', msgT = 0, hold = false, scroll = 0, items = [], spawn = 0.8, done = false;
  const say = (txt, k = 1.2) => { msg = txt; msgT = k; };
  const sy = () => TROUGH - y * FACE - ay * FACE;
  const game = { hold: on => { if (on && air && spin <= 0 && !wipe) { spin = 1; C.play('click'); } hold = on; } };
  G.surf8 = { back, game };
  const finish = () => {
    if (done) return; done = true;
    const pts = Math.round(score);
    C.send({ t: 'surf', op: 'score', pts, tricks: allTricks });
    endGame();
  };
  openGame('🏄 Surfen', W, H, {
    down: () => game.hold(true), up: () => game.hold(false), key: () => false,
    step(dt) {
      if (done) return;
      t -= dt; if (t <= 0) { finish(); return; }
      if (msgT > 0) msgT -= dt;
      scroll += dt * (90 + speed * 110);
      if (wipe > 0) { wipe -= dt; y = Math.max(0, y - dt * 0.8); speed = 0.7; if (wipe <= 0) say('🏄 Weiter geht’s!'); return; }
      if (!air) {
        vy += (hold ? 3.4 : -3.1) * dt; vy = Math.max(-1.7, Math.min(1.7, vy));
        y += vy * dt;
        speed += (vy < 0 ? -vy * 0.55 : -vy * 0.28) * dt; speed = Math.max(0.6, Math.min(2.3, speed - dt * 0.03));
        if (y <= 0) { y = 0; vy = Math.max(0, vy); }
        if (y >= 1) {
          if (vy > 0.85 && speed > 0.9) { air = true; avy = vy * (0.75 + speed * 0.4); ay = 0; y = 1; tricks = 0; rot = 0; spin = 0; C.play('splash'); }
          else { y = 1; vy = 0; speed = Math.max(0.6, speed - dt * 0.4); }
        }
        score += speed * dt * 6;
      } else {
        ay += avy * dt; avy -= 4.2 * dt;
        if (spin > 0) { rot += dt * Math.PI * 2 / 0.42; if (rot >= Math.PI * 2) { rot = 0; spin = 0; tricks++; allTricks++; score += 80 * tricks; say(['🌀 Dreher!', '🌀🌀 Doppelt!', '✨ Dreifach!!', '🌟 Unglaublich!'][Math.min(3, tricks - 1)], 0.8); pianoNote(72 + tricks * 3, 0.25, 0.2); } }
        if (ay <= 0) { // Landung
          air = false; ay = 0; y = 1; vy = -0.6;
          if (spin > 0 && rot > 0.6 && rot < Math.PI * 2 - 0.6) { wipe = 1.4; combo = 0; spin = 0; rot = 0; say('💦 Wipeout!'); C.play('splash'); }
          else { spin = 0; rot = 0; if (tricks) { combo++; const b = tricks * tricks * 70 + combo * 40; score += b; say(`${tricks > 1 ? '🔥' : '👍'} Gelandet! +${b}${combo > 1 ? ` · Kombo ×${combo}` : ''}`); C.play('coin'); } else score += 15; }
        }
      }
      // Muscheln & Sterne auf der Welle
      spawn -= dt;
      if (spawn <= 0) { spawn = 0.7 + Math.random() * 0.9; const hi = Math.random() < 0.3; items.push({ x: W + 20, h: hi ? 1.35 + Math.random() * 0.5 : 0.15 + Math.random() * 0.8, k: hi ? '⭐' : Math.random() < 0.5 ? '🐚' : '🌸' }); }
      for (const it of items) it.x -= dt * (90 + speed * 110);
      items = items.filter(it => { if (it.x < -20) return false; if (Math.abs(it.x - 110) < 18 && Math.abs(TROUGH - it.h * FACE - sy()) < 22) { score += it.k === '⭐' ? 60 : 25; C.play('egg'); return false; } return true; });
      $('mgfoot').textContent = `⏱️ ${Math.ceil(t)} s · ${Math.round(score).toLocaleString('de-DE')} Punkte${combo > 1 ? ` · Kombo ×${combo}` : ''}`;
    },
    draw(x) {
      const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fd4ff'); sky.addColorStop(1, '#ffe0c8'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      x.fillStyle = '#fff3b0'; x.beginPath(); x.arc(340, 60, 26, 0, 7); x.fill();
      x.fillStyle = '#ffffffcc'; for (let i = 0; i < 3; i++) { const cx = ((i * 170 - scroll * 0.15) % (W + 120) + W + 120) % (W + 120) - 60; x.beginPath(); x.ellipse(cx, 40 + i * 18, 34, 11, 0, 0, 7); x.fill(); }
      // die Welle: Wand von links nach rechts, Schaumkante oben
      const crest = xx => LIP - 8 + Math.sin((xx + scroll) * 0.018) * 6;
      const face = x.createLinearGradient(0, LIP, 0, TROUGH + 30); face.addColorStop(0, '#46c8d8'); face.addColorStop(1, '#1f7fb8'); x.fillStyle = face;
      x.beginPath(); x.moveTo(0, H); for (let xx = 0; xx <= W; xx += 10) x.lineTo(xx, crest(xx)); x.lineTo(W, H); x.fill();
      x.strokeStyle = '#ffffff55'; x.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const yy = LIP + 18 + i * 15, off = (scroll * (0.6 + i * 0.05)) % 60; x.beginPath(); for (let xx = -60 + (60 - off); xx < W; xx += 60) { x.moveTo(xx, yy); x.lineTo(xx + 26, yy + 2); } x.stroke(); }
      x.fillStyle = '#ffffff'; x.beginPath(); for (let xx = 0; xx <= W; xx += 8) { const cy = crest(xx); x.moveTo(xx + 6, cy); x.arc(xx, cy, 6 + Math.sin(xx * 0.3 + scroll * 0.05) * 2, 0, 7); } x.fill();
      x.fillStyle = '#2a8fc8'; x.fillRect(0, TROUGH + 22, W, H);
      x.font = '20px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const it of items) x.fillText(it.k, it.x, TROUGH - it.h * FACE);
      // Surfer
      const px = 110, py = sy(), tilt = air ? -0.3 + rot : wipe > 0 ? 1.2 : -vy * 0.35;
      x.save(); x.translate(px, py); x.rotate(tilt);
      x.fillStyle = '#ff8fab'; x.beginPath(); x.ellipse(0, 6, 28, 5, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(-20, 5, 40, 2);
      if (wipe <= 0) { x.fillStyle = '#6cb4ff'; x.fillRect(-6, -18, 12, 20); x.fillStyle = '#ffd9b8'; x.beginPath(); x.arc(0, -25, 8, 0, 7); x.fill(); x.fillStyle = '#7a4a2a'; x.beginPath(); x.arc(0, -28, 8, Math.PI, 0); x.fill(); x.strokeStyle = '#ffd9b8'; x.lineWidth = 4; x.beginPath(); x.moveTo(-6, -14); x.lineTo(-16, -8 - (hold ? 6 : 0)); x.moveTo(6, -14); x.lineTo(16, -8 - (hold ? 6 : 0)); x.stroke(); }
      x.restore();
      if (wipe > 0) { x.fillStyle = '#ffffffcc'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(px + Math.sin(i * 2 + scroll * 0.1) * 20, py + Math.cos(i * 1.3) * 10, 6, 0, 7); x.fill(); } }
      if (msgT > 0) { x.font = 'bold 22px Fredoka, system-ui'; x.fillStyle = '#fff'; x.strokeStyle = '#2a5a8a'; x.lineWidth = 4; x.strokeText(msg, W / 2, 30); x.fillText(msg, W / 2, 30); }
      if (t > E.SURF_SECS - 4) { x.font = '600 14px Fredoka, system-ui'; x.fillStyle = '#1f4f7a'; x.fillText('Halten = hoch · Loslassen = runter · in der Luft tippen = Dreher', W / 2, H - 14); }
    },
  });
}
function endSurf() {
  const G = C.G, m = me(), R = G.surf8;
  G.surf8 = null;
  m.sf = false;
  if (R?.back) Object.assign(m, { x: R.back[0], z: R.back[1], ry: R.back[2] });
}

// ---------- jede Bildaktualisierung ----------
export function updateG(dt) {
  const G = C.G, m = me();
  if (!G?.s || !m) return;
  if (G.surf8 && !G.mg) endSurf(); // fertig oder abgebrochen
  if (G.surf8 && Math.random() < 0.15) C.world.burst(m.x, m.z, 'splash', -0.1);
  if (zoneOf(m) === 'dream' && !E.dreamOk(G.s)) wakeDream('☀️ Guten Morgen! Der Traum ist vorbei.');
  if (m.pose === 'sleep' && E.dreamOk(G.s) && !G.dreamTip) { G.dreamTip = 1; C.toast('🌙 Psst … drück ✋, um einzuschlafen und zu träumen.'); }
  updateWedding(m, dt);
  updateSunset(m, dt);
}
