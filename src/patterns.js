// Eigene Pixel-Muster (16×16, 16 Farben): für Kleidung, Inselfahne, Muster-Wege und Bilderrahmen.
// Ein Muster ist ein Text aus 256 Zeichen 0–f (Index in PAT_COLORS); 0 = durchsichtig.
import * as THREE from '../vendor/three.module.min.js';

export const PAT_SIZE = 16;
export const PAT_COLORS = ['transparent', '#ffffff', '#2b2321', '#ff6b6b', '#ff9a3c', '#ffd23f', '#8fd694', '#3fa66a', '#6cc4ff', '#3f6fd8', '#b39cff', '#ff8fab', '#f5c9a8', '#a0693f', '#9aa0a8', '#fff1c9'];
export const validPat = px => typeof px === 'string' && /^[0-9a-f]{256}$/.test(px);
export const emptyPat = () => '0'.repeat(256);

// Bild eines Musters auf eine Canvas malen (bg: Farbe für durchsichtige Pixel)
export function paint(cv, px, bg = null, grid = false) {
  const g = cv.getContext('2d'), n = PAT_SIZE, w = cv.width / n, h = cv.height / n;
  g.clearRect(0, 0, cv.width, cv.height);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); }
  for (let i = 0; i < 256; i++) {
    const c = parseInt(px[i], 16);
    if (!c) continue;
    g.fillStyle = PAT_COLORS[c];
    g.fillRect((i % n) * w, Math.floor(i / n) * h, Math.ceil(w), Math.ceil(h));
  }
  if (grid) {
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
    for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(i * w + 0.5, 0); g.lineTo(i * w + 0.5, cv.height); g.moveTo(0, i * h + 0.5); g.lineTo(cv.width, i * h + 0.5); g.stroke(); }
  }
}
export function dataUrl(px, size = 64, bg = '#fff') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c, px, bg);
  return c.toDataURL();
}

// Texturen (zwischengespeichert)
const cache = new Map();
export function patTexture(px, repeat = 1, bg = null) {
  const k = px + repeat + bg;
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  paint(c, px, bg);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  if (cache.size > 40) cache.clear();
  cache.set(k, t);
  return t;
}
// Muster-Tuch (Fahne, Bild, Kleidung)
export function patMesh(geo, px, opts = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: patTexture(px, opts.repeat || 1, opts.bg || null), transparent: !opts.bg, alphaTest: opts.bg ? 0 : 0.5, side: opts.side ?? THREE.FrontSide }));
  m.castShadow = !!opts.shadow;
  return m;
}
