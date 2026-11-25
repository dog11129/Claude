// Inselleben 6 im Browser: Jahrmarkt (Riesenrad, Karussell, Entenangeln), Restaurant-Schicht, Bandprobe & Konzert,
// Tandem (hinten aufsitzen), geführter Einstieg für neue Inseln. Logik beim Host: src/extras6.js.
import * as S from '../state.js';
import * as E from '../extras6.js';
import { STREET, zoneOf } from '../newleaf.js';
import { NPC_DATA } from '../data.js';
import { PLAZA } from '../island.js';
import { openGame, endGame } from './fun2.js';
import { pianoNote, instNote } from '../audio.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
export function initFun4(ctx) {
  C = ctx;
  const st = document.createElement('style');
  st.textContent = `body.intro #photobtn, body.intro [data-open="emotes"], body.intro #skybtn, body.intro #buildbtn, body.intro #chatbtn, body.intro #chatbtn2, body.intro [data-open="friends"], body.intro #invite { display: none !important; }
body.intro.i0 .phonebtn, body.intro.i1 .phonebtn, body.intro.i2 .phonebtn, body.intro.i0 [data-open="sell"] { display: none !important; }
#introcard { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 112px); transform: translateX(-50%); z-index: 30; background: #fffdf9; border: 3px solid #ffb7c8; border-radius: 18px; padding: 8px 14px 9px;
  box-shadow: 0 6px 18px rgba(90,60,50,.18); font: 600 15px Fredoka, system-ui, sans-serif; color: #5a4636; max-width: min(420px, 92vw); text-align: center; pointer-events: auto; }
#introcard small { display: block; font-weight: 500; font-size: 12.5px; color: #8a7666; margin-top: 2px; }
#introcard button { margin-top: 5px; font: inherit; font-size: 12px; border: 0; background: none; color: #b08a7a; text-decoration: underline; cursor: pointer; }
#introcard .bar { height: 6px; background: #f3e6dc; border-radius: 4px; margin-top: 6px; overflow: hidden; } #introcard .bar i { display: block; height: 100%; background: #ff8fab; }
.intro-pulse { animation: ipulse 1.1s ease-in-out infinite; } @keyframes ipulse { 50% { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(255,143,171,.35); } }`;
  document.head.appendChild(st);
}
export const busy6 = () => !!(C?.G?.fride || C?.G?.passenger);

// ---------- Knöpfe ----------
export function uiE(kind, d) {
  const G = C.G;
  if (kind === 'ride') startRide(d.k);
  if (kind === 'ducks') startDucks();
  if (kind === 'resto') startResto();
  if (kind === 'woolcol') { G.woolCol = d.c; C.panels.sig = null; }
  if (kind === 'band') startBand(d.inst);
}

// ---------- Orte ----------
export function travel6(where) {
  if (where === 'fair') return [E.FAIR.x, E.FAIR.z + E.FAIR.d - 0.8, Math.PI, '🎡 Willkommen auf dem Jahrmarkt!', 'door'];
  if (where === 'fairback') return [STREET.x + STREET.w - 1.6, STREET.z, -Math.PI / 2, '', 'door'];
  return null;
}

// ---------- Riesenrad & Karussell ----------
function startRide(k) {
  const G = C.G, P = E.FAIR_SPOTS[k], m = me();
  if (!E.fairOpen(G.s) || G.s.money < P.price) { C.toast(`${P.icon} Das kostet ${P.price} Taler.`); return; }
  C.panels.close(); C.interrupt();
  C.send({ t: 'fair', op: 'ride', k });
  const t = C.world.time, seat = k === 'rad' ? E.wheelSeat : E.carouselSeat, n = k === 'rad' ? E.WHEEL.n : E.CAROUSEL.n;
  let best = 0, bd = Infinity;
  for (let i = 0; i < n; i++) { const p = seat(t, i), d = k === 'rad' ? p.y : Math.hypot(p.x - m.x, p.z - m.z); if (d < bd) { bd = d; best = i; } }
  G.fride = { k, i: best, t0: performance.now() };
  C.play('gondola');
  C.toast(k === 'rad' ? '🎡 Hoch hinaus! Von oben sieht man den ganzen Rummel.' : '🎠 Rundherum!');
}
function updateRide() {
  const G = C.G, R = G.fride;
  if (!R) return;
  const P = E.FAIR_SPOTS[R.k], m = me(), t = C.world.time, p = R.k === 'rad' ? E.wheelSeat(t, R.i) : E.carouselSeat(t, R.i);
  Object.assign(m, { x: p.x, z: p.z, fh: Math.max(0, p.y), ry: R.k === 'rad' ? 0 : p.ry, pose: 'sit', m: false });
  if ((performance.now() - R.t0) / 1000 > P.secs) {
    G.fride = null;
    Object.assign(m, { x: E.FAIR.x + P.x, z: E.FAIR.z + P.z + P.r + 0.8, fh: 0, ry: 0, pose: null });
    C.toast(R.k === 'rad' ? '🎡 Was für eine Aussicht!' : '🎠 Huiii – noch etwas schwindelig!');
  }
}

// ---------- Entenangeln: Haken über eine Ente bringen und tippen ----------
function startDucks() {
  const G = C.G;
  if (!E.fairOpen(G.s) || G.s.money < E.FAIR_SPOTS.enten.price) return;
  let t = 0, tries = 3, hooked = 0, drop = null, done = false, msg = '';
  const N = 8, duckAt = (i, tt) => { const a = tt * 0.7 + i / N * Math.PI * 2; return [160 + Math.cos(a) * 110, 140 + Math.sin(a) * 45]; };
  const hookX = tt => 160 + Math.sin(tt * 1.6) * 120;
  const tap = () => { if (done || drop || !tries) return; drop = { x: hookX(t), y: 20, t: 0 }; tries--; C.play('click'); };
  openGame('🦆 Entenangeln', 320, 230, {
    down: tap, key: k => (k === ' ' || k === 'Enter' ? (tap(), true) : false),
    step(dt) {
      if (done) return;
      t += dt;
      if (drop) {
        drop.t += dt; drop.y = 20 + Math.min(1, drop.t / 0.6) * 120;
        if (drop.t >= 0.6 && !drop.hit) {
          drop.hit = 1;
          const hit = Array.from({ length: N }, (_, i) => duckAt(i, t)).some(([x, y]) => Math.abs(x - drop.x) < 20 && Math.abs(y - 140) < 40 && y > 110);
          if (hit) { hooked++; msg = '🦆 Erwischt!'; C.play('plopp'); } else { msg = '💦 Daneben …'; C.play('splash'); }
        }
        if (drop.t > 1.1) { drop = null; if (!tries) { done = true; C.send({ t: 'fair', op: 'ducks', hooked }); setTimeout(() => endGame(), 900); } }
      }
      $('mgfoot').textContent = `${msg} Erwischt: ${hooked} · Versuche: ${tries}`;
    },
    draw(x) {
      x.fillStyle = '#ffe8ef'; x.fillRect(0, 0, 320, 230);
      x.fillStyle = '#6ab8e8'; x.beginPath(); x.ellipse(160, 145, 150, 70, 0, 0, 7); x.fill();
      x.fillStyle = '#9ad6f5'; x.beginPath(); x.ellipse(160, 145, 130, 55, 0, 0, 7); x.fill();
      x.font = '26px system-ui'; x.textAlign = 'center';
      for (let i = 0; i < N; i++) { const [dx, dy] = duckAt(i, t); x.fillText('🦆', dx, dy + Math.sin(t * 4 + i) * 2 + 10); }
      const hx = drop ? drop.x : hookX(t), hy = drop ? drop.y : 20;
      x.strokeStyle = '#7a5a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(hx, 0); x.lineTo(hx, hy); x.stroke();
      x.font = '18px system-ui'; x.fillText('🪝', hx, hy + 14);
    },
  });
}

// ---------- Restaurant: Bestellungen kochen und servieren ----------
function startResto() {
  const G = C.G, M = E.MENU, guests = Object.values(NPC_DATA).map(n => n.icon);
  let t = 0, served = 0, missed = 0, done = false, cook = null, hand = null, nextGuest = 1.5, msg = '';
  const tables = [{ x: 60 }, { x: 170 }, { x: 280 }].map(tb => ({ ...tb, g: null }));
  const finish = () => { if (done) return; done = true; C.send({ t: 'resto', op: 'shift', served, missed }); setTimeout(() => endGame(), 1200); };
  const tap = p => {
    if (done) return;
    if (p.y > 215) { const i = Math.floor(p.x / 68); if (M[i] && !cook) { cook = { i, t: 0 }; C.play('click'); } return; }
    if (p.y < 150 && hand != null) {
      const tb = tables.find(tt => Math.abs(tt.x - p.x) < 50 && tt.g);
      if (!tb) return;
      if (tb.g.want === hand) { served++; tb.g = null; hand = null; msg = '😋 Lecker!'; C.play('coin'); } else { msg = '🤔 Das war nicht bestellt!'; C.play('fail'); }
    }
  };
  openGame('🍽️ Restaurant-Schicht', 340, 290, {
    down: tap,
    step(dt) {
      if (done) return;
      t += dt;
      if (cook) { cook.t += dt; if (cook.t >= M[cook.i][3]) { hand = cook.i; cook = null; C.play('plopp'); } }
      nextGuest -= dt;
      if (nextGuest <= 0 && t < E.RESTO_SECS - 6) {
        const free = tables.filter(tb => !tb.g);
        if (free.length) { const tb = free[Math.floor(Math.random() * free.length)]; tb.g = { ic: guests[Math.floor(Math.random() * guests.length)], want: Math.floor(Math.random() * M.length), pat: 1, life: 13 + Math.random() * 6 }; }
        nextGuest = 3.5 + Math.random() * 3.5 - Math.min(1.5, t / 60);
      }
      for (const tb of tables) if (tb.g) { tb.g.pat -= dt / tb.g.life; if (tb.g.pat <= 0) { tb.g = null; missed++; msg = '😤 Zu lange gewartet …'; } }
      $('mgfoot').textContent = `${msg} · satt: ${served} · gegangen: ${missed} · noch ${Math.max(0, Math.ceil(E.RESTO_SECS - t))} s`;
      if (t >= E.RESTO_SECS) finish();
    },
    draw(x) {
      x.fillStyle = '#fff3e0'; x.fillRect(0, 0, 340, 290);
      x.fillStyle = '#f2d8c0'; for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) x.fillRect(i * 40, j * 40, 40, 40);
      x.textAlign = 'center';
      for (const tb of tables) {
        x.fillStyle = '#fff'; x.beginPath(); x.arc(tb.x, 110, 30, 0, 7); x.fill(); x.strokeStyle = '#e8c0a8'; x.lineWidth = 3; x.stroke();
        if (!tb.g) continue;
        x.font = '30px system-ui'; x.fillText(tb.g.ic, tb.x, 70);
        x.fillStyle = '#fff'; x.beginPath(); x.roundRect(tb.x - 20, 18, 40, 30, 8); x.fill();
        x.font = '20px system-ui'; x.fillText(M[tb.g.want][2], tb.x, 41);
        x.fillStyle = tb.g.pat > 0.4 ? '#8fd694' : '#ff8a8a'; x.fillRect(tb.x - 25, 132, 50 * Math.max(0, tb.g.pat), 6);
      }
      x.fillStyle = '#5a4636'; x.font = '600 13px system-ui'; x.fillText(hand != null ? `In der Hand: ${M[hand][2]} – an den Tisch!` : cook ? `${M[cook.i][2]} kocht …` : 'Gericht unten antippen', 170, 185);
      if (cook) { x.fillStyle = '#ffd23f'; x.fillRect(120, 195, 100 * cook.t / M[cook.i][3], 8); }
      M.forEach(([, n, ic], i) => { x.fillStyle = hand === i ? '#ffb7c8' : '#fff'; x.beginPath(); x.roundRect(i * 68 + 4, 218, 60, 66, 10); x.fill(); x.font = '28px system-ui'; x.fillText(ic, i * 68 + 34, 252); x.fillStyle = '#5a4636'; x.font = '11px system-ui'; x.fillText(n, i * 68 + 34, 276); });
    },
  });
}

// ---------- Bandprobe: Noten im Takt antippen ----------
const SCALES = { gitarre: [52, 55, 59], trommel: [40, 45, 50], floete: [72, 76, 79], glocken: [79, 84, 88] };
function bandSong(inst) {
  let a = [...inst].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0;
  const r = () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296);
  const notes = [], beat = 60 / 104;
  for (let b = 4; b < 40; b++) if (b % 4 === 0 || r() < 0.55) notes.push({ t: b * beat / (r() < 0.2 ? 1 : 1), lane: Math.floor(r() * 3) });
  return notes;
}
function startBand(inst) {
  const notes = bandSong(inst), LINE = 270, SPEED = 170, total = notes.length;
  let t = -1, hits = 0, done = false, flash = [0, 0, 0];
  const tapLane = lane => {
    if (done) return;
    const n = notes.find(x => !x.hit && !x.miss && x.lane === lane && Math.abs(x.t - t) < 0.16);
    if (n) { n.hit = 1; hits++; flash[lane] = 1; instNote(inst, SCALES[inst][lane] + (n.t * 3 % 2 ? 0 : 0), inst === 'floete' ? 0.35 : 0.5, 0.7); } else C.play('click');
  };
  const finish = () => { if (done) return; done = true; const score = Math.round(100 * hits / total); C.send({ t: 'band', op: 'practice', inst, score }); $('mgfoot').textContent = `🎶 ${score} Punkte!`; setTimeout(() => endGame(), 1200); };
  openGame(`${E.INSTR.find(i => i[0] === inst)?.[2] || '🎶'} Bandprobe`, 300, 320, {
    down: p => tapLane(Math.min(2, Math.max(0, Math.floor(p.x / 100)))),
    key: k => { const l = { ArrowLeft: 0, a: 0, 1: 0, ArrowDown: 1, s: 1, 2: 1, ArrowRight: 2, d: 2, 3: 2 }[k]; if (l === undefined) return false; tapLane(l); return true; },
    step(dt) {
      if (done) return;
      t += dt;
      for (const n of notes) if (!n.hit && !n.miss && t - n.t > 0.2) n.miss = 1;
      flash = flash.map(f => Math.max(0, f - dt * 4));
      $('mgfoot').textContent = `Treffer: ${hits}/${total} · links/Mitte/rechts tippen (oder ← ↓ →)`;
      if (t > notes[notes.length - 1].t + 1) finish();
    },
    draw(x) {
      x.fillStyle = '#2a2440'; x.fillRect(0, 0, 300, 320);
      for (let l = 0; l < 3; l++) { x.fillStyle = `rgba(255,183,200,${0.08 + flash[l] * 0.4})`; x.fillRect(l * 100 + 4, 0, 92, 320); }
      x.fillStyle = '#ffd23f'; x.fillRect(0, LINE - 2, 300, 4);
      x.font = '26px system-ui'; x.textAlign = 'center';
      for (const n of notes) { if (n.hit) continue; const y = LINE - (n.t - t) * SPEED; if (y < -30 || y > 330) continue; x.globalAlpha = n.miss ? 0.3 : 1; x.fillText(['🎵', '🎶', '🎵'][n.lane], n.lane * 100 + 50, y + 9); }
      x.globalAlpha = 1;
    },
  });
}

// ---------- Konzert: wenn es läuft, spielt die Band ----------
const CONCERT = [[0, 64], [2, 67], [4, 69], [6, 67], [8, 64], [10, 62], [12, 60], [14, 62], [16, 64], [18, 67], [20, 72], [22, 69], [24, 67], [26, 64], [28, 62], [30, 60]];
function updateConcert() {
  const G = C.G, s = G.s, B = s.band, m = me();
  if (!B || B.done !== s.day || G.concertDay === s.day) return;
  if (zoneOf(m) !== 'island' || Math.hypot(m.x - PLAZA.x, m.z - PLAZA.z) > 30) return;
  G.concertDay = s.day;
  const parts = [...new Set([...Object.values(B.parts).map(p => p.inst), 'gitarre', 'trommel', 'glocken'])], beat = 60 / 110 / 2, t0 = performance.now();
  G.concert = { t0, beat, parts, n: 0 };
  C.toast(`🎤 Die Inselband spielt! ${B.rating ? B.rating + ' Punkte' : ''}`);
}
function tickConcert() {
  const K = C.G.concert;
  if (!K) return;
  const i = Math.floor((performance.now() - K.t0) / 1000 / K.beat);
  while (K.n <= i && K.n < 64) {
    const b = K.n % 32, mel = CONCERT.find(c => c[0] === b);
    if (mel && K.parts.includes('floete')) instNote('floete', mel[1] + 12, 0.4, 0.6);
    if (mel) instNote(K.parts.includes('glocken') ? 'glocken' : 'gitarre', mel[1] + 12, 0.5, 0.5);
    if (b % 4 === 0) instNote('gitarre', [48, 53, 55, 48][Math.floor(b / 8) % 4], 0.6, 0.6);
    if (b % 2 === 0) instNote('trommel', 45, 0.2, b % 8 === 0 ? 0.9 : 0.5);
    if (b % 8 === 0) { const ids = E.bandNpcs(C.G.s); C.world.npcBubble(ids[(K.n / 8) % 3 | 0], ['🎶🎸', '🎶🥁', '🎶🔔', '🎵 La la la!'][K.n / 8 % 4 | 0]); }
    K.n++;
  }
  if (K.n >= 64) C.G.concert = null;
}

// ---------- Tandem ----------
export function setTandem(on) {
  const m = me();
  if (on && (S.inside(m) || m.sw || !['island', 'street', 'tropic'].includes(zoneOf(m)))) { C.toast('🚲 Tandem fahren geht draußen an Land.'); return; }
  if (on && m.bike) C.setBike(false, true);
  m.td = on;
  C.play(on ? 'plopp' : 'click');
  if (on) C.toast('🚲 Auf dem Tandem! Freunde können hinten aufsitzen.');
}
export function contextE(m) {
  const G = C.G;
  if (G.fride) return { label: G.fride.k === 'rad' ? '🎡 Gute Fahrt!' : '🎠 Rundherum!', tiles: [] };
  if (G.passenger) return { hopoff: true, label: '🚲 Absteigen', tiles: [] };
  if (G.sel === 'tandem' && !S.inside(m)) return { tandem: true, label: m.td ? '🚲 Absteigen' : '🚲 Aufs Tandem', tiles: [] };
  if (!m.td && !m.bike && !m.sw) for (const o of Object.values(G.players)) {
    if (o.id === G.me || !o.td || Math.hypot(o.x - m.x, o.z - m.z) > 1.6) continue;
    if (Object.values(G.players).some(p => p.id !== G.me && p.tp && Math.hypot(p.x - o.x, p.z - o.z) < 1.2)) continue;
    return { hop: o.id, label: `🚲 Hinten bei ${o.name} aufsitzen`, tiles: [] };
  }
  return null;
}
export function executeE(r, fresh) {
  const G = C.G, m = me();
  if (r.tandem) { if (fresh) setTandem(!m.td); return true; }
  if (r.hop) { if (fresh) { G.passenger = r.hop; m.tp = true; C.play('plopp'); C.toast('🚲 Festhalten! Nochmal drücken zum Absteigen.'); } return true; }
  if (r.hopoff) { if (fresh) hopOff(); return true; }
  return false;
}
function hopOff() { const G = C.G, m = me(); G.passenger = null; m.tp = false; m.x += Math.cos(m.ry) * 0.8; m.z -= Math.sin(m.ry) * 0.8; }
function updateTandem() {
  const G = C.G, m = me();
  if (m.td && (S.inside(m) || m.sw || !(G.s.inv.tandem > 0) || !['island', 'street', 'tropic'].includes(zoneOf(m)))) m.td = false;
  if (!G.passenger) return;
  const d = G.players[G.passenger];
  if (!d || !d.td || Math.hypot(d.x - m.x, d.z - m.z) > 8) { hopOff(); return; }
  Object.assign(m, { x: d.x - Math.sin(d.ry) * 0.78, z: d.z - Math.cos(d.ry) * 0.78, ry: d.ry, m: false, tp: true });
}

// ---------- Geführter Einstieg (nur neue Inseln) ----------
const STEPS = [
  { t: '👣 Lauf ein Stück über die Insel', h: () => (C.touch ? 'Links auf dem Bildschirm wischen' : 'WASD oder Pfeiltasten') },
  { t: '🌳 Schüttle 3 Bäume', h: () => (C.touch ? 'Auf einen Baum tippen – die Figur läuft hin' : 'Auf einen Baum klicken oder davor E drücken'), q: 0 },
  { t: '🍎 Sammle 6 Stück Obst', h: () => 'Heruntergefallenes Obst aufheben – Bäume tragen jeden Tag neu', q: 1 },
  { t: '🌷 Pflanze 4 Blumensamen', h: () => 'Unten die Samen wählen, dann auf freien Rasen tippen', q: 2 },
  { t: '👋 Sag Hallo zu 4 Nachbarn', h: () => 'Die Nachbarn antippen und plaudern', q: 3 },
];
const introStep = s => (s.quest.i >= 4 ? 5 : s.quest.i === 0 && !C.G.introWalked ? 0 : s.quest.i + 1);
function updateIntro(dt) {
  const G = C.G, s = G.s, m = me(), on = !!s.intro?.on && zoneOf(m) === 'island';
  document.body.classList.toggle('intro', !!s.intro?.on);
  let card = $('introcard');
  if (!s.intro?.on) { if (card || document.body.classList.contains('i0') || G.introSaid !== undefined) { card?.remove(); for (let i = 0; i < 6; i++) document.body.classList.remove('i' + i); for (const el of document.querySelectorAll('#hotbar .intro-pulse')) el.classList.remove('intro-pulse'); G.introSaid = undefined; } return; }
  if (!G.introLast) G.introLast = { x: m.x, z: m.z, d: 0 };
  G.introLast.d += Math.hypot(m.x - G.introLast.x, m.z - G.introLast.z); G.introLast.x = m.x; G.introLast.z = m.z;
  if (G.introLast.d > 6) G.introWalked = true;
  const st = introStep(s);
  for (let i = 0; i < 6; i++) document.body.classList.toggle('i' + i, i === st);
  if (st >= 5) { if (G.role === 'host') C.send({ t: 'intro', op: 'done' }); card?.remove(); C.toast('🎉 Super gemacht! Jetzt gehört dir die ganze Insel – alle Knöpfe sind frei. Im 📱 Inselhandy findest du alles Weitere.', true); C.world.npcBubble('mira', 'Du schaffst das! Bis später! 💕'); return; }
  if (!card) {
    card = document.createElement('div'); card.id = 'introcard'; document.body.appendChild(card);
    card.addEventListener('click', e => { if (e.target.closest('button')) { C.send({ t: 'intro', op: 'skip' }); card.remove(); } });
  }
  const S0 = STEPS[st], q = S0.q !== undefined && s.quest.i === S0.q ? s.quest.p : 0, n = [6, 3, 6, 4, 4][st], p = st === 0 ? Math.min(1, G.introLast.d / 6) : Math.min(1, q / n);
  const html = `Erste Schritte ${st + 1}/5 · ${S0.t}<small>${S0.h()}</small><div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div><button>Einführung überspringen</button>`;
  if (card.dataset.h !== html) { card.innerHTML = html; card.dataset.h = html; }
  if (G.introSaid !== st) { G.introSaid = st; C.world.npcBubble('mira', ['Hallo! Ich bin Mira. Komm, ich zeig dir die Insel!', 'Schüttel mal die Bäume – da fällt was runter!', 'Obst kann man essen, verkaufen oder verschenken.', 'Blumen machen die Insel schöner – und die Nachbarn froh!', 'Die anderen wollen dich auch kennenlernen!'][st]); }
  if (!on) return;
  // Pfeil zum nächsten Ziel
  let tg = null;
  if (st === 1 || st === 2) {
    const g = st === 2 && Object.entries(s.ground || {}).find(([, v]) => ['apfel', 'kirsche', 'orange', 'pfirsich', 'birne'].includes(v.id));
    if (g) { const [x, z] = g[0].split(',').map(Number); tg = [x, z, 1.0]; }
    else { let bd = Infinity; for (const [k, kind] of Object.entries(S.spots(s))) { if (kind !== 'tree' || (st === 2 && !S.fruitReady(s, k))) continue; const [x, z] = k.split(',').map(Number), d = Math.hypot(x - m.x, z - m.z); if (d < bd) { bd = d; tg = [x, z, 3.2]; } } }
  }
  if (st === 4) { let bd = Infinity; for (const [id, e] of C.world.npcM || []) { if (!e.awake || s.met?.[id] === s.day || id === 'hoppel') continue; const d = Math.hypot(e.x - m.x, e.z - m.z); if (d < bd) { bd = d; tg = [e.x, e.z, 2.3]; } } }
  if (tg && Math.hypot(tg[0] - m.x, tg[1] - m.z) > 1.4) C.world.tag('introarrow', '⬇️', tg[0], tg[2] + Math.abs(Math.sin(C.world.time * 3)) * 0.3, tg[1], 'bubble');
  for (const el of document.querySelectorAll('#hotbar .slot')) el.classList.toggle('intro-pulse', st === 3 && el.dataset.id?.startsWith('s_') && C.G.sel !== el.dataset.id);
}

// ---------- pro Bild ----------
export function updateE(dt) {
  if (!C?.G?.ready) return;
  updateRide();
  updateTandem();
  updateConcert();
  tickConcert();
  updateIntro(dt);
}
