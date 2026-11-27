// Inselleben 15: die sechs Puzzle-Motive, mit Canvas gemalt (kein Bild-Download). Fürs Puzzle-Fenster und das fertige Wandbild.
const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const grad = (g, x0, y0, x1, y1, stops) => { const d = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => d.addColorStop(o, c)); return d; };
const disc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
const blob = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
function hill(g, W, H, y, amp, c, seed) { const r = rng(seed), p = [r() * 6, r() * 6]; g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 70 + p[0]) * amp + Math.sin(x / 31 + p[1]) * amp * 0.35); g.lineTo(W, H); g.fill(); }
function heart(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); g.fill(); }
function star(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.fill(); }
function cloud(g, x, y, s, c = 'rgba(255,255,255,.9)') { blob(g, x, y, 34 * s, 14 * s, c); blob(g, x - 20 * s, y + 4 * s, 20 * s, 11 * s, c); blob(g, x + 22 * s, y + 3 * s, 24 * s, 12 * s, c); blob(g, x + 2 * s, y - 9 * s, 18 * s, 12 * s, c); }
function pine(g, x, y, s, c, snow) { g.fillStyle = '#7a5236'; g.fillRect(x - 3 * s, y - 6 * s, 6 * s, 10 * s); for (let i = 0; i < 3; i++) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - (46 - i * 4) * s); g.lineTo(x - (12 + i * 5) * s, y - (26 - i * 11) * s); g.lineTo(x + (12 + i * 5) * s, y - (26 - i * 11) * s); g.fill(); if (snow) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - (46 - i * 4) * s); g.lineTo(x - (7 + i * 2) * s, y - (36 - i * 9) * s); g.lineTo(x + (7 + i * 2) * s, y - (36 - i * 9) * s); g.fill(); } } }
function couple(g, x, y, s) { // zwei kleine Figuren von hinten, die sich an den Händen halten
  for (const [dx, c, h] of [[-9, '#ff8fab', '#6b4428'], [9, '#6cc4ff', '#2b2321']]) { blob(g, x + dx * s, y - 10 * s, 6 * s, 9 * s, c); disc(g, x + dx * s, y - 23 * s, 6 * s, '#ffd8b8'); blob(g, x + dx * s, y - 26 * s, 6.4 * s, 4.5 * s, h); }
  g.strokeStyle = '#ffd8b8'; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(x - 4 * s, y - 10 * s); g.lineTo(x + 4 * s, y - 10 * s); g.stroke();
}

const DRAW = [
  function inselabend(g, W, H) { // Abend auf der Insel: Sonne versinkt im Meer, zwei auf dem Steg
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#3d3a78'], [0.3, '#c2568f'], [0.52, '#ff9d6b'], [0.62, '#ffd27a']]); g.fillRect(0, 0, W, H);
    disc(g, W * 0.62, H * 0.6, 44, '#fff3c4'); disc(g, W * 0.62, H * 0.6, 34, '#ffe38a');
    cloud(g, 90, 60, 0.9, 'rgba(255,190,200,.75)'); cloud(g, 330, 40, 0.7, 'rgba(255,170,190,.7)'); cloud(g, 410, 96, 0.5, 'rgba(255,200,170,.7)');
    g.fillStyle = grad(g, 0, H * 0.6, 0, H, [[0, '#ff9d6b'], [0.25, '#c96a8f'], [1, '#3a3f7a']]); g.fillRect(0, H * 0.6, W, H * 0.4);
    const r = rng(11); for (let i = 0; i < 46; i++) { const y = H * 0.62 + r() * H * 0.34, w = 10 + r() * 30, x = W * 0.62 + (r() - 0.5) * (40 + (y - H * 0.6) * 1.6); g.fillStyle = `rgba(255,236,170,${0.25 + r() * 0.5})`; g.fillRect(x - w / 2, y, w, 2.4); }
    g.fillStyle = '#2b2a4a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.7); g.quadraticCurveTo(70, H * 0.56, 150, H * 0.74); g.lineTo(170, H); g.fill();
    g.fillStyle = '#3a2f3f'; g.fillRect(96, H * 0.78, 190, 8); for (let x = 110; x < 286; x += 34) g.fillRect(x, H * 0.78, 5, 40);
    for (const [x, hgt] of [[40, 70], [78, 50]]) { g.strokeStyle = '#2b2a4a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, H * 0.68); g.quadraticCurveTo(x + 8, H * 0.68 - hgt * 0.6, x + 16, H * 0.68 - hgt); g.stroke(); for (let i = 0; i < 6; i++) { g.lineWidth = 3; g.beginPath(); g.moveTo(x + 16, H * 0.68 - hgt); g.quadraticCurveTo(x + 16 + Math.cos(i * 1.05) * 22, H * 0.68 - hgt - 14 + Math.sin(i * 1.05) * 10, x + 16 + Math.cos(i * 1.05) * 36, H * 0.68 - hgt + 6 + Math.sin(i * 1.05) * 16); g.stroke(); } }
    g.save(); g.globalCompositeOperation = 'source-atop'; g.restore();
    const cx = 250, cy = H * 0.78; for (const [dx, c] of [[-9, '#3a2f3f'], [9, '#3a2f3f']]) { blob(g, cx + dx, cy - 10, 6, 9, c); disc(g, cx + dx, cy - 23, 6, c); }
    g.strokeStyle = '#3a2f3f'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx - 4, cy - 10); g.lineTo(cx + 4, cy - 10); g.stroke();
    heart(g, cx, cy - 46, 7, '#ffd0dc');
  },
  function leuchtturm(g, W, H) { // Leuchtturm am Morgen
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#8ed0ff'], [0.6, '#d8f1ff'], [0.7, '#fff3d6']]); g.fillRect(0, 0, W, H);
    disc(g, 80, 70, 30, '#fff7c9'); disc(g, 80, 70, 22, '#ffe98a');
    cloud(g, 200, 50, 1); cloud(g, 400, 90, 0.8); cloud(g, 300, 130, 0.55);
    g.fillStyle = grad(g, 0, H * 0.66, 0, H, [[0, '#6fc3ee'], [1, '#2f7fc0']]); g.fillRect(0, H * 0.66, W, H * 0.34);
    const r = rng(5); for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(255,255,255,${0.3 + r() * 0.4})`; g.lineWidth = 2; const x = r() * W, y = H * 0.7 + r() * H * 0.28; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 5, x + 18, y); g.stroke(); }
    g.fillStyle = '#9aa7a0'; g.beginPath(); g.moveTo(250, H); g.quadraticCurveTo(300, H * 0.6, 370, H * 0.64); g.quadraticCurveTo(450, H * 0.62, W, H * 0.8); g.lineTo(W, H); g.fill();
    g.fillStyle = '#7fc46c'; g.beginPath(); g.moveTo(290, H * 0.7); g.quadraticCurveTo(350, H * 0.56, 430, H * 0.66); g.quadraticCurveTo(360, H * 0.7, 290, H * 0.7); g.fill();
    const x = 358, b = H * 0.63; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 22, b); g.lineTo(x - 14, b - 130); g.lineTo(x + 14, b - 130); g.lineTo(x + 22, b); g.fill();
    g.fillStyle = '#e8445e'; for (const [y0, y1] of [[20, 44], [70, 94]]) { const w0 = 22 - y0 * 0.0615, w1 = 22 - y1 * 0.0615; g.beginPath(); g.moveTo(x - w0, b - y0); g.lineTo(x - w1, b - y1); g.lineTo(x + w1, b - y1); g.lineTo(x + w0, b - y0); g.fill(); }
    g.fillStyle = '#4a4a5a'; g.fillRect(x - 19, b - 138, 38, 8); g.fillStyle = '#ffe98a'; g.fillRect(x - 11, b - 158, 22, 20); g.fillStyle = '#e8445e'; g.beginPath(); g.moveTo(x - 16, b - 158); g.lineTo(x, b - 178); g.lineTo(x + 16, b - 158); g.fill();
    g.fillStyle = '#6b4a32'; g.fillRect(x - 5, b - 16, 10, 16);
    g.fillStyle = 'rgba(255,240,160,.35)'; g.beginPath(); g.moveTo(x, b - 148); g.lineTo(60, b - 210); g.lineTo(60, b - 120); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(120, H * 0.76); g.lineTo(120, H * 0.6); g.lineTo(150, H * 0.76); g.fill(); g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(100, H * 0.77); g.lineTo(160, H * 0.77); g.lineTo(150, H * 0.81); g.lineTo(108, H * 0.81); g.fill();
    g.strokeStyle = '#4a4a5a'; g.lineWidth = 2; for (const [bx, by] of [[230, 96], [256, 82], [210, 120]]) { g.beginPath(); g.moveTo(bx - 8, by); g.quadraticCurveTo(bx - 4, by - 6, bx, by); g.quadraticCurveTo(bx + 4, by - 6, bx + 8, by); g.stroke(); }
  },
  function blumenwiese(g, W, H) { // Blumenwiese mit Schmetterlingen
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#9fdcff'], [0.55, '#e6f7ff']]); g.fillRect(0, 0, W, H);
    cloud(g, 110, 50, 1); cloud(g, 360, 70, 0.85);
    hill(g, W, H, H * 0.5, 14, '#b6e59a', 3); hill(g, W, H, H * 0.6, 12, '#96d97c', 8); hill(g, W, H, H * 0.72, 8, '#7fcf6a', 14);
    pine(g, 60, H * 0.52, 0.9, '#5cae5a'); pine(g, 430, H * 0.55, 1.1, '#5cae5a');
    const r = rng(21), C = ['#ff8fab', '#ffd23f', '#ffffff', '#b39cff', '#ff6b6b', '#ffb86b'];
    for (let i = 0; i < 90; i++) {
      const y = H * 0.56 + r() * H * 0.42, x = r() * W, s = 0.5 + (y - H * 0.56) / (H * 0.44) * 1.3, c = C[Math.floor(r() * C.length)];
      g.strokeStyle = '#4fa156'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 * s, y - 16 * s); g.stroke();
      for (let k = 0; k < 5; k++) disc(g, x + 2 * s + Math.cos(k * 1.257) * 5 * s, y - 16 * s + Math.sin(k * 1.257) * 5 * s, 3.6 * s, c);
      disc(g, x + 2 * s, y - 16 * s, 2.6 * s, c === '#ffd23f' ? '#ff9d3a' : '#ffe066');
    }
    for (const [x, y, c] of [[150, 120, '#ffb86b'], [300, 150, '#b39cff'], [240, 96, '#ff8fab']]) { blob(g, x - 7, y - 3, 8, 6, c); blob(g, x + 7, y - 3, 8, 6, c); blob(g, x - 5, y + 5, 5, 4, c); blob(g, x + 5, y + 5, 5, 4, c); g.fillStyle = '#4a3a3a'; g.fillRect(x - 1, y - 6, 2, 13); }
    couple(g, 250, H * 0.7, 1);
  },
  function sternennacht(g, W, H) { // Sternennacht mit Sternschnuppe und Mond
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#141a44'], [0.6, '#2c3a7a'], [1, '#4a5aa8']]); g.fillRect(0, 0, W, H);
    const r = rng(42); for (let i = 0; i < 150; i++) disc(g, r() * W, r() * H * 0.78, 0.5 + r() * 1.6, `rgba(255,255,${200 + Math.floor(r() * 55)},${0.5 + r() * 0.5})`);
    for (const [x, y, s] of [[90, 70, 7], [200, 40, 5], [330, 110, 6], [420, 50, 8], [150, 150, 5], [270, 90, 4]]) star(g, x, y, s, '#fff4b8');
    disc(g, 380, 80, 34, '#fff7d6'); disc(g, 394, 70, 30, '#1b2252');
    g.strokeStyle = grad(g, 60, 30, 190, 120, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,220,.95)']]); g.lineWidth = 4; g.beginPath(); g.moveTo(60, 30); g.lineTo(190, 120); g.stroke(); star(g, 192, 122, 8, '#fff');
    hill(g, W, H, H * 0.78, 12, '#1c2a4a', 4); hill(g, W, H, H * 0.86, 8, '#16203a', 9);
    pine(g, 70, H * 0.84, 1.1, '#101a30'); pine(g, 110, H * 0.86, 0.8, '#101a30'); pine(g, 420, H * 0.84, 1.2, '#101a30');
    g.fillStyle = '#ffb7c8'; g.beginPath(); g.ellipse(250, H * 0.89, 46, 9, 0, 0, TAU); g.fill();
    for (const dx of [-10, 10]) { blob(g, 250 + dx, H * 0.875, 13, 5, dx < 0 ? '#ff8fab' : '#6cc4ff'); disc(g, 250 + dx * 2.3, H * 0.868, 5, '#ffd8b8'); }
    heart(g, 250, H * 0.8, 5, '#ffd0dc');
    for (let i = 0; i < 9; i++) disc(g, 150 + r() * 200, H * 0.7 + r() * 40, 2, 'rgba(220,255,140,.9)');
  },
  function winterhuette(g, W, H) { // Winterhütte im Schnee
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#7fa8e0'], [0.5, '#cfe1f7'], [0.7, '#fbe9e0']]); g.fillRect(0, 0, W, H);
    g.fillStyle = '#b9c9e6'; g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(90, H * 0.26); g.lineTo(170, H * 0.5); g.lineTo(260, H * 0.2); g.lineTo(380, H * 0.52); g.lineTo(440, H * 0.36); g.lineTo(W, H * 0.6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#fff'; for (const [x, y] of [[90, H * 0.26], [260, H * 0.2], [440, H * 0.36]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26, y + 34); g.lineTo(x - 8, y + 28); g.lineTo(x + 4, y + 38); g.lineTo(x + 24, y + 30); g.fill(); }
    hill(g, W, H, H * 0.64, 8, '#eef4fc', 6); hill(g, W, H, H * 0.76, 10, '#ffffff', 12);
    pine(g, 70, H * 0.74, 1.3, '#3f7a5e', true); pine(g, 120, H * 0.78, 0.9, '#3f7a5e', true); pine(g, 410, H * 0.76, 1.4, '#3f7a5e', true); pine(g, 450, H * 0.8, 0.9, '#3f7a5e', true);
    const x = 250, b = H * 0.8; g.fillStyle = '#9a6a44'; g.fillRect(x - 60, b - 60, 120, 60); g.fillStyle = '#7a5236'; for (let y = b - 50; y < b; y += 12) g.fillRect(x - 60, y, 120, 2);
    g.fillStyle = '#b5523a'; g.beginPath(); g.moveTo(x - 76, b - 58); g.lineTo(x, b - 112); g.lineTo(x + 76, b - 58); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 80, b - 60); g.lineTo(x, b - 120); g.lineTo(x + 80, b - 60); g.lineTo(x + 64, b - 62); g.lineTo(x, b - 104); g.lineTo(x - 64, b - 62); g.fill();
    g.fillStyle = '#7a5236'; g.fillRect(x + 30, b - 124, 16, 30); g.fillStyle = '#fff'; g.fillRect(x + 27, b - 128, 22, 6);
    for (const [cx, cy, s] of [[x + 44, b - 140, 8], [x + 54, b - 158, 11], [x + 48, b - 180, 14]]) disc(g, cx, cy, s, 'rgba(255,255,255,.75)');
    g.fillStyle = '#6b4a32'; g.fillRect(x - 12, b - 36, 24, 36); disc(g, x + 7, b - 18, 2, '#ffd23f');
    for (const dx of [-42, 30]) { g.fillStyle = '#ffe98a'; g.fillRect(x + dx, b - 44, 22, 20); g.strokeStyle = '#7a5236'; g.lineWidth = 2; g.strokeRect(x + dx, b - 44, 22, 20); g.beginPath(); g.moveTo(x + dx + 11, b - 44); g.lineTo(x + dx + 11, b - 24); g.stroke(); }
    disc(g, 150, b + 4, 16, '#fff'); disc(g, 150, b - 18, 12, '#fff'); disc(g, 150, b - 35, 9, '#fff'); g.fillStyle = '#ff8f3a'; g.fillRect(150, b - 36, 9, 3); disc(g, 147, b - 38, 1.5, '#333'); disc(g, 153, b - 38, 1.5, '#333'); g.fillStyle = '#e8445e'; g.fillRect(141, b - 28, 18, 4);
    const r = rng(77); for (let i = 0; i < 110; i++) disc(g, r() * W, r() * H, 1 + r() * 1.8, 'rgba(255,255,255,.9)');
  },
  function ballonfahrt(g, W, H) { // Ballonfahrt zu zweit
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#7cc6ff'], [0.7, '#d6f0ff'], [1, '#fff1d0']]); g.fillRect(0, 0, W, H);
    cloud(g, 80, 80, 1.1); cloud(g, 390, 60, 0.9); cloud(g, 330, 200, 0.7); cloud(g, 130, 210, 0.6);
    hill(g, W, H, H * 0.86, 10, '#9fdc7c', 2); hill(g, W, H, H * 0.93, 6, '#7fcf6a', 5);
    g.fillStyle = '#6fc3ee'; g.beginPath(); g.ellipse(360, H * 0.93, 60, 9, 0, 0, TAU); g.fill();
    const x = 240, y = 120, R = 78, C = ['#ff8fab', '#ffe066', '#8fd694', '#6cc4ff', '#b39cff', '#ffb86b'];
    for (let i = 0; i < 6; i++) { g.fillStyle = C[i]; g.beginPath(); const a0 = -R + i * R / 3, a1 = a0 + R / 3; g.moveTo(x + a0 * 0.2, y + R * 1.12); g.bezierCurveTo(x + a0 * 1.25, y + R * 0.4, x + a0 * 1.1, y - R, x, y - R); g.bezierCurveTo(x + a1 * 1.1, y - R, x + a1 * 1.25, y + R * 0.4, x + a1 * 0.2, y + R * 1.12); g.fill(); }
    heart(g, x, y - 6, 16, 'rgba(255,255,255,.85)');
    g.strokeStyle = '#7a5236'; g.lineWidth = 2; for (const dx of [-15, 15]) { g.beginPath(); g.moveTo(x + dx, y + R * 1.1); g.lineTo(x + dx * 0.9, y + R * 1.45); g.stroke(); }
    g.fillStyle = '#b98d5e'; g.fillRect(x - 17, y + R * 1.45, 34, 22); g.fillStyle = '#9a7248'; for (let k = 0; k < 4; k++) g.fillRect(x - 17, y + R * 1.45 + k * 6, 34, 1.5);
    for (const [dx, c, h] of [[-7, '#ff8fab', '#6b4428'], [7, '#6cc4ff', '#2b2321']]) { disc(g, x + dx, y + R * 1.4, 6, '#ffd8b8'); blob(g, x + dx, y + R * 1.36, 6.4, 4, h); }
    for (const [bx, by, s, c] of [[90, 150, 0.32, '#ffb86b'], [410, 130, 0.26, '#b39cff']]) { blob(g, bx, by, 60 * s, 70 * s, c); g.fillStyle = '#b98d5e'; g.fillRect(bx - 8 * s, by + 84 * s, 16 * s, 12 * s); }
  },
];
export const MOTIFS = DRAW.length;
export const MOTIF_W = 480, MOTIF_H = 320;
export function drawMotif(g, m, W = MOTIF_W, H = MOTIF_H) {
  g.save();
  g.scale(W / MOTIF_W, H / MOTIF_H);
  DRAW[m % DRAW.length](g, MOTIF_W, MOTIF_H);
  g.restore();
}
const cache = new Map();
// Bild als Canvas (einmal gemalt, dann wiederverwendet)
export function motifCanvas(m) {
  if (cache.has(m)) return cache.get(m);
  const c = document.createElement('canvas');
  c.width = MOTIF_W; c.height = MOTIF_H;
  const g = c.getContext('2d');
  if (g) drawMotif(g, m);
  cache.set(m, c);
  return c;
}
