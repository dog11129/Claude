// Inselleben 11 im Browser: „Unser Tag“ speichern, Herzchenregen am Monatstag, Greifautomat-Minispiel.
// Logik beim Host: src/extras11.js (features/couple.js).
import { KUSCHEL } from '../furni-data2.js';
import { CLAW_PRICE, clawFill, coupleToday } from '../extras11.js';
import { openGame } from './fun2.js';

let C = null, rain = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function initFun9(ctx) { C = ctx; }

export function uiH(kind) {
  if (kind === 'since') {
    const v = $('since11')?.value;
    if (!v) { C.toast('📅 Wähl zuerst ein Datum aus.'); return; }
    C.send({ t: 'couple11', op: 'since', date: v });
  }
  if (kind === 'sinceclear' && confirm('Euren Tag wirklich löschen?')) C.send({ t: 'couple11', op: 'clear' });
  if (kind === 'claw') startClaw();
}

// Monatstag / Jahrestag: Herzchen regnen über euch (einmal pro Sitzung)
export function update11() {
  const G = C.G, s = G?.s;
  if (!G?.ready || !s?.couple?.party) return;
  const t = isoToday();
  if (s.couple.party === t && rain?.key !== t) {
    rain = { key: t, until: performance.now() + 45000, next: 0 };
    const yrs = coupleToday(s)?.years;
    C.toast(yrs ? '💍 Heute ist euer Jahrestag! Schaut in den Briefkasten – und heute Abend gibt es ein Feuerwerk. 🎆' : '💕 Happy Monatstag! Rosi hat euch etwas in den Briefkasten gelegt.', true);
    C.play('fanfare');
  }
  if (rain && performance.now() < rain.until && performance.now() > rain.next && me()) {
    rain.next = performance.now() + 700;
    const m = me();
    C.world.burst(m.x + (Math.random() - 0.5) * 4, m.z + (Math.random() - 0.5) * 4, 'heart', 2.2 + Math.random());
  }
}

// ---------- Greifautomat: Greifer pendelt, antippen = runter, greifen, zur Klappe bringen ----------
function startClaw() {
  const G = C.G;
  if (G.mg) return;
  if ((G.s.money || 0) < CLAW_PRICE) { C.toast('🪙 Ein Versuch kostet 100 Taler.'); return; }
  C.interrupt?.();
  const W = 300, H = 400, TOP = 70, FLOOR = 335, CHUTE = 42;
  let st, t, x, y, held, prizes, msg, msgT, sent, dropAt, foot;
  const round = () => {
    const ids = clawFill(Math.random, 8);
    prizes = ids.map((id, i) => ({ id, x: 95 + (i % 4) * 52 + (Math.floor(i / 4) ? 26 : 0) + (Math.random() - 0.5) * 12, y: FLOOR - (Math.floor(i / 4) ? 34 : 0) + (Math.random() - 0.5) * 6 }));
    st = 'move'; t = Math.random() * 6; x = W / 2; y = TOP; held = null; msg = ''; msgT = 0; sent = false; dropAt = null; foot = true;
  };
  const finish = win => {
    if (sent) return; sent = true;
    C.send({ t: 'claw11', op: 'play', win: win || null });
    msg = win ? `${KUSCHEL[win][1]} Gewonnen!` : 'Knapp daneben …'; msgT = 99;
    st = 'done';
    C.play(win ? 'fanfare' : 'fail');
    setTimeout(() => { $('mgfoot').textContent = (G.s.money || 0) >= CLAW_PRICE ? 'Antippen = noch ein Versuch (100 Taler) · ✕ = aufhören' : 'Keine Taler mehr – ✕ zum Schließen'; }, 600);
  };
  round();
  openGame('🕹️ Greifautomat', W, H, {
    down: () => {
      if (st === 'move') { st = 'drop'; C.play('click'); }
      else if (st === 'done' && msgT > 98 && (G.s.money || 0) >= CLAW_PRICE) round();
    },
    up: () => {}, key: () => false,
    step(dt) {
      t += dt;
      if (foot) { foot = false; $('mgfoot').textContent = `Antippen = Greifer runter · ${CLAW_PRICE} Taler pro Versuch · 🪙 ${(G.s.money || 0).toLocaleString('de-DE')}`; }
      if (msgT > 0 && msgT < 90) msgT -= dt;
      if (st === 'move') x = W / 2 + 25 + Math.sin(t * 1.7) * 110;
      else if (st === 'drop') {
        y += dt * 230;
        if (y >= FLOOR - 30) {
          y = FLOOR - 30;
          const near = prizes.map(p => ({ p, d: Math.abs(p.x - x) + Math.max(0, FLOOR - 30 - p.y) * 0.3 })).sort((a, b) => a.d - b.d)[0];
          if (near && near.d < 26 && Math.random() < 0.95 - near.d / 26 * 0.55) { held = near.p; prizes = prizes.filter(p => p !== held); dropAt = near.d > 9 && Math.random() < 0.22 ? TOP + 60 + Math.random() * 120 : null; msg = '✊ Erwischt!'; msgT = 0.8; C.play('plopp'); }
          else { msg = '🫥 Nichts erwischt'; msgT = 0.8; }
          st = 'up';
        }
      } else if (st === 'up') {
        y -= dt * 150;
        if (held && dropAt && y < dropAt) { held.y = FLOOR - 6; held.x = x; prizes.push(held); held = null; dropAt = null; msg = '😱 Oh nein, rausgerutscht!'; msgT = 1.2; C.play('splash'); }
        if (y <= TOP) { y = TOP; st = held ? 'carry' : 'done0'; }
      } else if (st === 'carry') {
        x -= dt * 140;
        if (x <= CHUTE) { x = CHUTE; finish(held.id); }
      } else if (st === 'done0') finish(null);
    },
    draw(g) {
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffd6e6'); bg.addColorStop(1, '#ffeef5'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff8fb8'; g.fillRect(0, 0, W, 34); g.fillStyle = '#fff'; g.font = 'bold 18px Fredoka, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('💗 Kuschel-Greifer 💗', W / 2, 18);
      g.fillStyle = '#dff2ff88'; g.fillRect(8, 40, W - 16, FLOOR + 30 - 40);
      g.fillStyle = '#ffc2d6'; g.fillRect(8, FLOOR + 20, W - 16, H - FLOOR - 20);
      g.fillStyle = '#7a5a6a'; g.fillRect(CHUTE - 26, FLOOR - 50, 52, 70); g.fillStyle = '#ffffff55'; g.fillRect(CHUTE - 22, FLOOR - 46, 44, 8);
      g.fillStyle = '#b07a92'; g.fillRect(8, TOP - 8, W - 16, 6);
      g.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      for (const p of prizes) {
        if (p.id === 'kuscheltier_gold') { g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(p.x, p.y, 22 + Math.sin(t * 5) * 2, 0, 7); g.fill(); }
        g.fillText(KUSCHEL[p.id][1], p.x, p.y);
      }
      // Seil und Greifer
      g.strokeStyle = '#8a6a7a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, TOP - 4); g.lineTo(x, y); g.stroke();
      g.fillStyle = '#c0c8d8'; g.fillRect(x - 14, y, 28, 8);
      const open = st === 'move' || st === 'drop' ? 0.6 : 0.15;
      g.strokeStyle = '#a0a8b8'; g.lineWidth = 4;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 12, y + 8); g.lineTo(x + s * (12 + open * 14), y + 22); g.lineTo(x + s * (4 + open * 8), y + 34); g.stroke(); }
      if (held) { if (held.id === 'kuscheltier_gold') { g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(x, y + 36, 20, 0, 7); g.fill(); } g.fillText(KUSCHEL[held.id][1], x, y + 36); }
      if (msgT > 0) { g.font = 'bold 24px Fredoka, system-ui'; g.fillStyle = '#fff'; g.strokeStyle = '#c0507a'; g.lineWidth = 5; g.strokeText(msg, W / 2, 130); g.fillText(msg, W / 2, 130); }
    },
  });
}
