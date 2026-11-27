// Inselleben 7 im Browser: Wege ins Seerosenmoor & in den Bambushain, Floßfahrt, Teezeremonie, Laternenumzug,
// Silvester (Raketen-Editor, Countdown, Feuerwerk), Morgengymnastik, Umzugskartons, Marktstand, Kalender-Export,
// Jahresrückblick als Diashow. Logik beim Host: src/extras7.js.
import * as S from '../state.js';
import * as E from '../extras7.js';
import { AREAS } from '../areas.js';
import { zoneOf } from '../newleaf.js';
import { NPC_IDS, NPC_DATA, FESTS } from '../data.js';
import { PLAZA } from '../island.js';
import { openGame, endGame } from './fun2.js';
import { rocket7 } from '../world-extra4.js';
import { pianoNote } from '../audio.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
const myKey = () => me()?.key || 'host';
export function initFun5(ctx) {
  C = ctx;
  const st = document.createElement('style');
  st.textContent = `#p7card { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 112px); transform: translateX(-50%); z-index: 30; background: #fffdf9; border: 3px solid #ffc86b; border-radius: 18px; padding: 7px 14px;
  box-shadow: 0 6px 18px rgba(90,60,50,.18); font: 600 15px Fredoka, system-ui, sans-serif; color: #5a4636; max-width: min(420px, 92vw); text-align: center; pointer-events: none; }
#p7card small { display: block; font-weight: 500; font-size: 12.5px; color: #8a7666; }
#ny7 { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 35; font: 700 min(34vw, 220px) Fredoka, system-ui, sans-serif; color: #fff; text-shadow: 0 6px 30px #ff6b8a, 0 0 4px #0006; }
#ny7.small { font-size: min(9vw, 56px); }
#rev7 { position: fixed; inset: 0; z-index: 60; background: #2a2030; display: grid; place-items: center; color: #fff8ee; font-family: Fredoka, system-ui, sans-serif; }
#rev7 .slide { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 14px; padding: 24px; text-align: center; opacity: 0; transition: opacity .9s; }
#rev7 .slide.on { opacity: 1; }
#rev7 .slide img { max-width: min(86vw, 720px); max-height: 62vh; border-radius: 18px; box-shadow: 0 10px 40px #0008; border: 6px solid #fff8ee; transform: rotate(-1.5deg); }
#rev7 .big { font-size: min(13vw, 76px); font-weight: 700; } #rev7 .mid { font-size: min(6vw, 30px); } #rev7 .small { font-size: 15px; opacity: .8; }
#rev7 .x { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: 14px; z-index: 2; font-size: 22px; background: #fff3; border: 0; color: #fff; border-radius: 50%; width: 44px; height: 44px; }
#rev7 .dots { position: absolute; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); left: 0; right: 0; display: flex; gap: 6px; justify-content: center; }
#rev7 .dots i { width: 8px; height: 8px; border-radius: 50%; background: #fff4; } #rev7 .dots i.on { background: #ffb7c8; }`;
  document.head.appendChild(st);
  addEventListener('keydown', e => { const R = C.G?.review7; if (!R) return; if (e.key === 'Escape') R.close(); else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') R.next(); else return; e.preventDefault(); e.stopImmediatePropagation(); }, true);
}
export const busy7 = () => !!C?.G?.raft7;

// ---------- Knöpfe ----------
export function uiF(kind, d) {
  const G = C.G, s = G.s;
  if (kind === 'tea') startTea();
  if (kind === 'parade') startParade();
  if (kind === 'gym') startGym();
  if (kind === 'review') startReview(!!d.last);
  if (kind === 'ics') exportIcs();
  if (kind === 'fwedit') C.panels.show('fwedit');
  if (kind === 'furncat') { G.furnCat = typeof d.c === 'string' ? d.c : ''; C.panels.sig = null; const b = document.getElementById('pbody'); if (b) b.scrollTop = 0; } // Laden: Möbel nach Art oder Serie
  if (kind === 'fwadd' || kind === 'fwset' || kind === 'fwdel') {
    const list = (G.fwEdit ||= (s.rockets?.[myKey()] || []).map(r => ({ ...r })));
    if (kind === 'fwadd' && list.length < 3) list.push({ c: E.FW_COLORS[list.length % E.FW_COLORS.length][0], sh: E.FW_SHAPES[(list.length + 1) % E.FW_SHAPES.length][0], h: 'mittel' });
    if (kind === 'fwset' && list[d.i] && ['c', 'sh', 'h'].includes(d.f)) list[d.i][d.f] = d.v;
    if (kind === 'fwdel') list.splice(d.i, 1);
    C.panels.sig = null;
  }
  if (kind === 'fwprev') { const r = (G.fwEdit || s.rockets?.[myKey()] || [])[d.i]; if (r) previewRocket(r); }
  if (kind === 'fwsave' && G.fwEdit) { C.send({ t: 'fests2', op: 'rockets', list: G.fwEdit }); G.fwEdit = null; C.panels.sig = null; }
  if (kind === 'mk') {
    const M = (G.mk ||= {}), n = Math.max(0, Math.min(E.MARKET_MAX, s.inv?.[d.id] || 0, (M[d.id] || 0) + (d.d > 0 ? 1 : -1)));
    if (n) M[d.id] = n; else delete M[d.id];
    C.panels.sig = null;
  }
  if (kind === 'mkopen') {
    const items = Object.entries(G.mk || {}).filter(([, n]) => n > 0).slice(0, E.MARKET_SLOTS).map(([id, n]) => ({ id, n }));
    if (items.length) { C.send({ t: 'market', op: 'open', x: d.x, z: d.z, items }); G.mk = null; }
  }
}

// ---------- Orte ----------
export function travel7(where) {
  if (where === 'moor') return [E.MOOR.x, E.MOOR.z + E.MOOR.d - 0.8, Math.PI, '🪷 Willkommen im Seerosenmoor! Frösche & Libellen mit dem Kescher, Seerosen pflücken, Schilf mit der Axt – und links wartet das Floß.', 'door'];
  if (where === 'bambus') return [E.BAMBUS.x, E.BAMBUS.z + E.BAMBUS.d - 0.8, Math.PI, '🎋 Der Bambushain! Bambus mit der Axt, Sprossen mit der Schaufel – und hinten im Teehaus wartet Wanda.', 'door'];
  if (where === 'moorback' || where === 'bambusback') { const A = AREAS[where === 'moorback' ? 'wiese' : 'wald']; return [A.x, A.z - A.d + 1.3, 0, '', 'door']; }
  return null;
}

// ---------- Aktionsknopf ----------
export function context7(m) {
  const G = C.G;
  if (G.raft7) return { label: '🛶 Gute Fahrt!', tiles: [] };
  if (G.parade7) {
    const secs = (performance.now() - G.parade7.t0) / 1000, home = zoneOf(m) === 'island' && Math.hypot(m.x - E.PARADE_AT[0], m.z - E.PARADE_AT[1]) < 4;
    if (home && secs >= 25) return { paradeEnd: true, label: '🏮 Umzug beenden', tiles: [] };
  }
  return null;
}
export function execute7(r, fresh) {
  if (r.raft) { if (fresh) startRaft(); return true; }
  if (r.paradeEnd) { if (fresh) endParade(); return true; }
  return false;
}

// ---------- Floß ----------
function startRaft() {
  const G = C.G, m = me();
  if (G.raft7 || !G.s.moor?.open) return;
  C.panels.close(); C.interrupt();
  C.send({ t: 'moor', op: 'raft' });
  G.raft7 = { t0: performance.now() };
  m.rf = true; C.world.raftBusy7 = true;
  C.play('splash');
  C.toast('🛶 Einmal rund um den Teich – schau mal, die Frösche!');
}
function updateRaft() {
  const G = C.G, R = G.raft7, m = me();
  if (!R) return;
  const t = (performance.now() - R.t0) / 1000;
  if (t > E.RAFT_SECS || zoneOf(m) !== 'moor') {
    G.raft7 = null; m.rf = false; C.world.raftBusy7 = false;
    Object.assign(m, { x: E.MOOR.x + E.RAFT[0] - 0.6, z: E.MOOR.z + E.RAFT[1], pose: null });
    C.toast('🛶 Wieder am Ufer.');
    return;
  }
  const p = E.raftAt(t);
  Object.assign(m, { x: p.x, z: p.z, ry: p.ry, pose: 'sit', m: false });
}

// ---------- Teezeremonie: Wärme treffen, schaumig schlagen, ruhig servieren ----------
function startTea() {
  const G = C.G;
  if (G.s.bambus?.tea?.[myKey()] === G.s.day) return;
  let stage = 0, t = 0, pts = [0, 0, 0], whisks = 0, done = false, msg = '', t1 = 0;
  const temp = () => 60 + Math.sin(t * 1.9) * 35; // 25–95 Grad
  const cup = () => 150 + Math.sin(t * 2.3) * 120;
  const next = () => { stage++; t = 0; t1 = performance.now(); if (stage === 3) finish(); }; // Schaumschlagen: echte 4 Sekunden, auch wenn das Bild ruckelt
  const press = () => {
    if (done) return;
    if (stage === 0) { const d = Math.abs(temp() - 80); pts[0] = Math.max(0, Math.round(34 - d * 1.5)); msg = d < 5 ? 'Genau richtig warm!' : d < 12 ? 'Fast!' : temp() > 80 ? 'Etwas zu heiß …' : 'Noch zu kalt …'; C.play('bubble'); next(); }
    else if (stage === 1) { whisks++; pianoNote(72 + (whisks % 5) * 2, 0.15, 0.1); }
    else if (stage === 2) { const d = Math.abs(cup() - 150); pts[2] = Math.max(0, Math.round(33 - d * 0.35)); msg = d < 15 ? 'Ganz ruhig serviert.' : 'Ein bisschen geschwappt …'; C.play('place'); next(); }
  };
  const finish = () => { if (done) return; done = true; const score = Math.max(0, Math.min(100, pts[0] + pts[1] + pts[2])); C.send({ t: 'bambus', op: 'tea', score }); $('mgfoot').textContent = `🍵 ${score} Punkte!`; setTimeout(() => endGame(), 1400); };
  openGame('🍵 Teezeremonie', 300, 300, {
    down: press, key: k => (k === ' ' || k === 'Enter' || k === 'e' ? (press(), true) : false),
    step(dt) {
      if (done) return;
      t += dt;
      if (stage === 1) { pts[1] = Math.min(33, Math.round(whisks * 33 / 26)); if (performance.now() - t1 > 4000) { msg = whisks >= 22 ? 'Wunderbar schaumig!' : 'Ein bisschen schaumig.'; next(); } }
      $('mgfoot').textContent = (['1/3 · Tippen, wenn das Wasser 80 °C hat', '2/3 · Schnell tippen: schaumig schlagen!', '3/3 · Tippen, wenn die Schale vor dem Gast steht'][stage] || '') + (msg ? ` · ${msg}` : '');
    },
    draw(x) {
      x.fillStyle = '#f3ead8'; x.fillRect(0, 0, 300, 300);
      x.fillStyle = '#c9b48a'; x.fillRect(0, 230, 300, 70);
      x.font = '40px system-ui'; x.textAlign = 'center';
      if (stage === 0) {
        x.fillStyle = '#fff'; x.fillRect(130, 30, 40, 190); x.fillStyle = '#8fd4a0'; x.fillRect(130, 220 - (85 - 25) / 70 * 190, 40, 10 / 70 * 190);
        const h = (temp() - 25) / 70 * 190; x.fillStyle = '#ff7a6b'; x.fillRect(138, 220 - h, 24, h);
        x.fillText('🫖', 70, 150); x.font = '16px system-ui'; x.fillStyle = '#5a4636'; x.fillText(`${Math.round(temp())} °C`, 220, 130);
      } else if (stage === 1) {
        x.fillText('🍵', 150, 170); x.font = '30px system-ui'; x.fillText('🥢', 150 + Math.sin(t * 30) * 20 * Math.min(1, whisks / 5), 120);
        x.fillStyle = '#8fd068'; x.fillRect(40, 250, 220 * Math.min(1, whisks / 26), 14); x.strokeStyle = '#5a4636'; x.strokeRect(40, 250, 220, 14);
        x.font = '16px system-ui'; x.fillStyle = '#5a4636'; x.fillText(`${Math.max(0, 4 - (performance.now() - t1) / 1000).toFixed(1)} s`, 150, 60);
      } else {
        x.fillText('🧑‍🦳', 150, 70); x.strokeStyle = '#a0805a'; x.lineWidth = 3; x.strokeRect(120, 175, 60, 50);
        x.fillText('🍵', done ? 150 : cup(), 215);
      }
    },
  });
}

// ---------- Laternenumzug ----------
const SING = ['🎶 Leuchte, kleine Laterne …', '🎶 Durch Wiese, Wald und Sand …', '🎶 Hand in Hand, wir leuchten übers Land …', '🎶 Rundherum, mein Licht ist warm und leis …', '🎶 Ein Lichtlein hier, ein Lichtlein dort …', 'So schön, die vielen Lichter!'];
function startParade() {
  const G = C.G, s = G.s;
  if (G.parade7 || !E.paradeTime(s) || s.parade?.done === s.day || !(s.inv?.papierlaterne > 0)) return;
  C.panels.close();
  C.send({ t: 'fests2', op: 'pstart' });
  G.parade7 = { t0: performance.now(), sing: 0 };
  C.play('fanfare');
  C.toast('🏮 Los geht\'s! Lauf eine Runde über die Insel – alle kommen mit. Danach zurück zum Dorfplatz.', true);
}
function endParade() {
  const G = C.G, P = G.parade7;
  if (!P) return;
  C.send({ t: 'fests2', op: 'parade', secs: Math.round((performance.now() - P.t0) / 1000) });
  G.parade7 = null;
  $('p7card')?.remove();
}
function updateParade(dt) {
  const G = C.G, s = G.s, P = s.parade, W = C.world;
  // Wer führt den Umzug an? (für alle Mitspieler gleich, aus dem Spielstand)
  const lead = P?.on === s.day && P.done !== s.day && E.paradeTime(s) ? Object.values(G.players).find(p => (p.key || 'host') === P.by) : null;
  if (!lead || zoneOf(lead) !== 'island') { W.parade7 = null; if (G.parade7 && !E.paradeTime(s)) { G.parade7 = null; $('p7card')?.remove(); } }
  else {
    const T = (W.parade7 ||= { trail: [], t: 0 });
    T.t += dt;
    if (T.t > 0.2) { T.t = 0; const last = T.trail[0]; if (!last || Math.hypot(last[0] - lead.x, last[1] - lead.z) > 0.15) { T.trail.unshift([lead.x, lead.z]); if (T.trail.length > 60) T.trail.pop(); } }
    if (!T.trail.length) T.trail.push([lead.x, lead.z]);
  }
  const R = G.parade7;
  if (!R) return;
  const secs = (performance.now() - R.t0) / 1000;
  if (performance.now() > R.sing) { R.sing = performance.now() + 3500 + Math.random() * 2500; const id = NPC_IDS[Math.floor(Math.random() * NPC_IDS.length)]; W.npcBubble(id, SING[Math.floor(Math.random() * SING.length)]); pianoNote(67 + [0, 2, 4, 5, 7][Math.floor(Math.random() * 5)], 0.25, 0.4); }
  let card = $('p7card');
  if (!card) { card = document.createElement('div'); card.id = 'p7card'; document.body.appendChild(card); }
  const html = `🏮 Laternenumzug · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}<small>${secs < 25 ? 'Lauf eine schöne Runde über die Insel …' : 'Zurück zum Dorfplatz und den Umzug beenden!'}</small>`;
  if (card.dataset.h !== html) { card.innerHTML = html; card.dataset.h = html; }
  if (secs >= 25 && zoneOf(me()) === 'island') C.world.tag('pend7', '⬇️', E.PARADE_AT[0], 1.4 + Math.abs(Math.sin(C.world.time * 3)) * 0.3, E.PARADE_AT[1], 'bubble');
}

// ---------- Silvester ----------
const colOf = c => E.FW_COLORS.find(x => x[0] === c)?.[1] || 0xffd23f;
const hOf = h => E.FW_HEIGHTS.find(x => x[0] === h)?.[2] || 11;
function previewRocket(r) {
  const m = me(), W = C.world, yaw = W.yaw || 0;
  C.panels.close();
  rocket7(W, m.x - Math.sin(yaw) * 9, m.z - Math.cos(yaw) * 9, hOf(r.h), colOf(r.c), r.sh);
  C.play('launch');
  setTimeout(() => { if (C.G?.ready && !C.panels.open) C.panels.show('fwedit'); }, 2800);
}
function updateNewYear() {
  const G = C.G, s = G.s, N = s.newyear, m = me();
  let el = $('ny7');
  const dt = N?.day === s.day ? s.time - (N.t || 0) : -1, show = dt >= 0 && dt < 45 && zoneOf(m) === 'island';
  if (!show) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'ny7'; document.body.appendChild(el); }
  if (dt < 10) {
    const n = Math.ceil(10 - dt), txt = String(n);
    if (el.textContent !== txt) { el.textContent = txt; el.className = ''; C.play('click'); }
    return;
  }
  if (G.nyDone !== s.day) { G.nyDone = s.day; el.className = 'small'; el.textContent = '🎆 Frohes neues Inseljahr! 🎆'; C.play('fanfare'); for (const id of NPC_IDS) C.world.npcBubble(id, ['Frohes Neues!', 'Prost Neujahr!', 'Juhuu!', 'Wie schön!'][NPC_IDS.indexOf(id) % 4]); G.nyNext = 0; G.nyI = 0; }
  if (dt > 16) el.textContent = '';
  // eigene Raketen aller Mitspieler, dazwischen bunte Kugeln
  const own = Object.values(s.rockets || {}).flat();
  if (performance.now() > (G.nyNext || 0) && dt < 42) {
    G.nyNext = performance.now() + 650 + Math.random() * 500;
    const i = G.nyI++, r = own.length ? own[i % own.length] : null, x = PLAZA.x - 12 + Math.random() * 24, z = PLAZA.z - 12 - Math.random() * 8;
    if (r && i % 3 !== 2) rocket7(C.world, x, z, hOf(r.h) + 2, colOf(r.c), r.sh); else C.world.firework(x, z, 12 + Math.random() * 6);
  }
}

// ---------- Morgengymnastik: Bewegung im Takt nachmachen ----------
const MOVES = [['⬆️', '🙆', 'Arme hoch!'], ['⬇️', '🙇', 'Runter beugen!'], ['⬅️', '🤸', 'Nach links!'], ['➡️', '🤸‍♀️', 'Nach rechts!']];
function startGym() {
  const G = C.G, s = G.s;
  if (!E.gymTime(s) || s.gym?.[myKey()]?.last === s.day) return;
  let a = 0x9e37 ^ s.day;
  const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296);
  const seq = Array.from({ length: 8 }, () => Math.floor(rnd() * 4)), BEAT = 1.35;
  let t = -1.2, i = 0, hits = 0, done = false, said = -1, flash = null;
  const T0 = performance.now(); // Takt nach der echten Uhr, auch wenn das Bild ruckelt
  const hit = dir => {
    if (done || t < 0 || i >= seq.length || seq[i].hit !== undefined) return;
    const ph = (t % BEAT) / BEAT;
    if (dir === seq[i] && ph > 0.25) { hits++; flash = ['🌟', performance.now()]; pianoNote(72 + seq[i] * 2, 0.4, 0.2); } else { flash = ['💦', performance.now()]; C.play('click'); }
    seq[i] = { d: seq[i], hit: dir === seq[i] && ph > 0.25 };
  };
  const dirOf = v => (typeof v === 'object' ? v.d : v);
  const finish = () => { if (done) return; done = true; C.send({ t: 'fests2', op: 'gym', score: hits }); $('mgfoot').textContent = `🤸 ${hits}/8 im Takt!`; setTimeout(() => endGame(), 1300); };
  openGame('🤸 Morgengymnastik', 300, 330, {
    down: p => { const dx = p.x - 150, dy = p.y - 250; hit(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 0 : 1); },
    key: k => { const d = { ArrowUp: 0, w: 0, ArrowDown: 1, s: 1, ArrowLeft: 2, a: 2, ArrowRight: 3, d: 3 }[k]; if (d === undefined) return false; hit(d); return true; },
    step() {
      if (done) return;
      t = (performance.now() - T0) / 1000 - 1.2;
      const ni = Math.floor(t / BEAT);
      if (t >= 0 && ni !== i) { i = ni; if (i >= seq.length) { finish(); return; } }
      if (t >= 0 && said !== i && i < seq.length) { said = i; pianoNote(60 + dirOf(seq[i]) * 3, 0.25, 0.15); }
      $('mgfoot').textContent = t < 0 ? 'Mira turnt vor – mach im Takt mit!' : `${Math.min(i + 1, 8)}/8 · Treffer: ${hits} · tippen oder Pfeiltasten`;
    },
    draw(x) {
      x.fillStyle = '#fff3e0'; x.fillRect(0, 0, 300, 330);
      x.textAlign = 'center';
      if (t >= 0 && i < seq.length) {
        const m = MOVES[dirOf(seq[i])], ph = (t % BEAT) / BEAT;
        x.font = '70px system-ui'; x.fillText(m[1], 150, 110);
        x.font = '18px system-ui'; x.fillStyle = '#5a4636'; x.fillText(m[2], 150, 140);
        x.strokeStyle = '#ff8fab'; x.lineWidth = 6; x.beginPath(); x.arc(150, 75, 60, -Math.PI / 2, -Math.PI / 2 + ph * Math.PI * 2); x.stroke();
      } else { x.font = '60px system-ui'; x.fillText('🦔', 150, 100); }
      for (const [d, [ic]] of MOVES.entries()) { const [bx, by] = [[150, 200], [150, 296], [86, 248], [214, 248]][d]; x.fillStyle = '#ffd8e2'; x.beginPath(); x.arc(bx, by, 28, 0, Math.PI * 2); x.fill(); x.font = '30px system-ui'; x.fillText(ic, bx, by + 11); }
      if (flash && performance.now() - flash[1] < 500) { x.font = '44px system-ui'; x.fillText(flash[0], 150, 260); }
      x.font = '16px system-ui'; x.fillStyle = '#5a4636';
      x.fillText(seq.map(v => (typeof v === 'object' ? (v.hit ? '🌟' : '·') : '○')).join(' '), 150, 170);
    },
  });
}

// ---------- Umzugskartons: alle sehen, wer gerade einen trägt ----------
function updateBoxes() {
  const G = C.G, H = G.s.moving?.hold || {};
  for (const p of Object.values(G.players)) p.hb = H[p.key || 'host'] !== undefined;
}

// ---------- Kalender-Export (nur mit echter Uhrzeit: dann ist ein Inseltag ein echter Tag) ----------
function exportIcs() {
  const s = C.G.s;
  if (!s.real) { C.toast('📲 Das geht nur mit „🕰️ Echte Uhrzeit“ (Optionen) – sonst ist ein Inseltag viel kürzer als ein echter.'); return; }
  const base = new Date(); base.setHours(12, 0, 0, 0);
  const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const esc = t => String(t).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kuschelinsel//Insel-Kalender//DE', 'CALSCALE:GREGORIAN'];
  for (const d of E.calendarDays(s, 28)) for (const [ic, txt, when] of d.ev) {
    const a = new Date(base.getTime() + (d.day - s.day) * 864e5), b = new Date(a.getTime() + 864e5);
    L.push('BEGIN:VEVENT', `UID:kuschelinsel-${d.day}-${encodeURIComponent(txt).slice(0, 40)}@kuschelinsel`, `DTSTAMP:${ymd(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${ymd(a)}`, `DTEND;VALUE=DATE:${ymd(b)}`, `SUMMARY:${esc(`${ic} ${txt}`)}`, `DESCRIPTION:${esc(`Kuschelinsel${when ? ' · ' + when : ''}`)}`, 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  const url = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })), a = document.createElement('a');
  a.href = url; a.download = 'kuschelinsel-kalender.ics'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  C.toast('📅 Kalender-Datei erstellt – öffnen, um die Termine zu übernehmen.');
}

// ---------- Jahresrückblick: Diashow ----------
async function startReview(last) {
  const G = C.G, s = G.s, R = E.reviewData(s, last);
  C.panels.close();
  let pics = [];
  try { pics = (await C.listPhotos()).filter(p => p.url && (!p.day || (p.day >= R.from && p.day <= R.to))).slice(-8); } catch { /* ohne Fotos */ }
  const diary = (s.diary || []).filter(d => d.day >= R.from && d.day <= R.to).slice(-6);
  const best = R.hearts.slice().sort((a, b) => b[1] - a[1]).slice(0, 3);
  const slides = [`<div class="big">📽️ Euer Inseljahr ${R.y}</div><div class="mid">Tag ${R.from} bis ${R.to}${R.running ? ' (bisher)' : ''}</div>`];
  const stats = E.REVIEW_KEYS.filter(([k]) => (R.diff[k] || 0) > 0);
  for (let i = 0; i < stats.length; i += 3) slides.push(stats.slice(i, i + 3).map(([k, ic, n]) => `<div><div class="big">${ic} ${Math.round(R.diff[k]).toLocaleString('de-DE')}</div><div class="mid">${n}</div></div>`).join(''));
  pics.forEach((p, i) => { slides.push(`<img src="${p.url}" alt=""><div class="small">${p.day ? `Tag ${p.day}` : ''}${diary[i] ? ` · ${diary[i].icon || ''} ${diary[i].text}` : ''}</div>`); });
  diary.slice(pics.length).forEach(d => slides.push(`<div class="big">${d.icon || '📔'}</div><div class="mid">${d.text}</div><div class="small">Tag ${d.day}</div>`));
  if (best.length) slides.push(`<div class="mid">Die besten Freunde</div>${best.map(([id, h]) => `<div class="mid">${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id} ${'💗'.repeat(Math.max(1, Math.min(10, Math.round(h))))}</div>`).join('')}`);
  slides.push(`<div class="big">💕</div><div class="mid">Auf ein neues Jahr auf der Insel!</div>`);
  const el = document.createElement('div');
  el.id = 'rev7';
  el.innerHTML = slides.map(h => `<div class="slide">${h}</div>`).join('') + `<button class="x" aria-label="Schließen">✕</button><div class="dots">${slides.map(() => '<i></i>').join('')}</div>`;
  document.body.appendChild(el);
  let i = -1, timer = null;
  const show = n => {
    if (n >= slides.length) { close(); return; }
    i = n;
    el.querySelectorAll('.slide').forEach((x, j) => x.classList.toggle('on', j === i));
    el.querySelectorAll('.dots i').forEach((x, j) => x.classList.toggle('on', j === i));
    pianoNote(60 + [0, 4, 7, 12, 7, 4][i % 6], 0.3, 0.8);
    clearTimeout(timer); timer = setTimeout(() => show(i + 1), 4200);
  };
  const close = () => { clearTimeout(timer); el.remove(); G.review7 = null; };
  G.review7 = { close, next: () => show(i + 1) };
  el.addEventListener('click', e => { if (e.target.closest('.x')) close(); else show(i + 1); });
  C.play('fanfare');
  show(0);
}

// ---------- pro Bild ----------
export function updateF(dt) {
  const G = C?.G;
  if (!G?.ready) return;
  const m = me();
  updateRaft();
  updateParade(dt);
  updateNewYear();
  updateBoxes();
  if (zoneOf(m) === 'moor' && m.z - E.MOOR.z > E.MOOR.d + 0.5) C.travel('moorback'); // durchs Tor zurück
  if (zoneOf(m) === 'bambus' && m.z - E.BAMBUS.z > E.BAMBUS.d + 0.5) C.travel('bambusback');
  // Jahrmarkt-Tipp: am Abend des Laternenumzugs / Silvester einmal Bescheid sagen
  const s = G.s, f = S.festOf(s.day);
  if ((f === 'laternen' && E.paradeTime(s) || f === 'silvester' && E.fwTime(s)) && G.fest7 !== s.day && zoneOf(m) === 'island') {
    G.fest7 = s.day;
    C.toast(f === 'laternen' ? `🏮 ${FESTS.laternen.name}! Auf dem Dorfplatz (Westseite) geht es los – Laterne nicht vergessen.` : '🎆 Silvesternacht! Auf dem Dorfplatz (Ostseite) den Countdown starten.', true);
  }
}
