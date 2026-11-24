// Spieler-Avatare: anpassbares Aussehen, Gelenke (Hüfte, Schultern, Hals) für Animationen, Werkzeug in der Hand, Haustiere.
// Jedes Körperteil ist EIN Mesh mit Vertex-Farben (merge + MAT) -> 8 Draw-Calls pro Spieler, 5 pro Haustier.
import * as THREE from '../vendor/three.module.min.js';
import { MAT, merge, box, ball, cyl, cone } from './models.js';
import { keyedGeometry, hasModel } from './assets.js';

export const LOOKS = {
  skin: ['#ffe3cc', '#ffd8b8', '#f2c29b', '#d9a07a', '#a8714f', '#6e4a34'],
  hairStyle: [['short', 'Kurz'], ['long', 'Lang'], ['ponytail', 'Zopf'], ['buns', 'Dutt'], ['curly', 'Locken'], ['bob', 'Bob'], ['spiky', 'Igel'], ['bald', 'Glatze']],
  hairColor: ['#2b2321', '#6b4428', '#a8683a', '#f2cf6b', '#d9572e', '#b9b6b2', '#ffaecb', '#9ed4ff', '#c7a8ff', '#9fe3c3'],
  eyes: [['round', 'Rund'], ['happy', 'Fröhlich'], ['lashes', 'Wimpern'], ['sleepy', 'Verschlafen']],
  top: [['tshirt', 'T-Shirt'], ['overalls', 'Latzhose'], ['dress', 'Kleid'], ['hoodie', 'Hoodie'], ['vest', 'Hemd & Weste']],
  topColor: ['#ff8fab', '#ffb86b', '#ffe066', '#8fd694', '#6cc4ff', '#b39cff', '#ff6b6b', '#f5f5f5', '#7fd8d0', '#ffd0a8', '#4a6fa5', '#5a5f73'],
  bottomColor: ['#4a6fa5', '#2f3e5c', '#8a5a3a', '#c9b48a', '#3b3b4a', '#ff8fab', '#8fd694', '#b39cff'],
  shoes: ['#6b4a32', '#3b3b4a', '#f5f5f5', '#ff6b6b', '#ffd23f', '#6cc4ff'],
  hat: [['none', 'Ohne'], ['straw', 'Strohhut'], ['cap', 'Mütze'], ['flowers', 'Blumenkranz'], ['bunny', 'Hasenohren'], ['crown', 'Krone'], ['beanie', 'Strickmütze'], ['cat', 'Katzenohren'], ['bow', 'Schleife'], ['cowboy', 'Cowboyhut'], ['wizard', 'Zauberhut'],
    ['beret', 'Baskenmütze'], ['tophat', 'Zylinder'], ['pirate', 'Piratenhut'], ['tiara', 'Diadem'], ['sunhat', 'Sonnenhut']],
  glasses: [['none', 'Ohne'], ['round', 'Rund'], ['sun', 'Sonnenbrille'], ['heart', 'Herzbrille']],
  pet: [['none', 'Kein Haustier'], ['cat', 'Katze'], ['dog', 'Hund'], ['bunny', 'Hase'], ['chick', 'Küken'], ['fox', 'Fuchs'], ['pig', 'Schwein']],
  petColor: ['#e8a35c', '#f5f0e6', '#8a8a92', '#6b4a32', '#3b3b40', '#ffd966'],
};
const KEYS = Object.keys(LOOKS);
const ids = k => LOOKS[k].map(o => (Array.isArray(o) ? o[0] : o));

export function defaultLook() {
  return { skin: '#ffd8b8', hairStyle: 'short', hairColor: '#6b4428', eyes: 'round', top: 'overalls', topColor: '#ff8fab', bottomColor: '#4a6fa5', shoes: '#6b4a32', hat: 'straw', glasses: 'none', pet: 'none', petColor: '#e8a35c' };
}
// Diese Hüte gibt es nur in der Schneiderei bzw. der Tauschhütte
export const PREMIUM_HATS = ['beret', 'tophat', 'pirate', 'tiara', 'sunhat'];
export function randomLook() {
  const l = {};
  for (const k of KEYS) { const a = ids(k).filter(v => k !== 'hat' || !PREMIUM_HATS.includes(v)); l[k] = a[Math.floor(Math.random() * a.length)]; }
  return l;
}
// Kommt übers Netz: nur Werte aus LOOKS durchlassen. Altes Profil {color, hat} wird übernommen.
export function cleanLook(p) {
  const d = defaultLook(), o = p && typeof p === 'object' ? p : {}, ok = (k, v) => ids(k).includes(v), r = {};
  for (const k of KEYS) r[k] = ok(k, o[k]) ? o[k] : d[k];
  if (!ok('topColor', o.topColor) && ok('topColor', o.color)) r.topColor = o.color;
  return r;
}
export const lookKey = l => KEYS.map(k => l[k]).join('|');

// ---------- Bauteile ----------
const part = (g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
};
const ell = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, seg = 7) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
  g.scale(sx, sy, sz);
  return part(g, c, x, y, z, rx, ry, rz);
};
const dome = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const g = new THREE.SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(sx, sy, sz);
  return part(g, c, x, y, z);
};
const ring = (r, t, c, x, y, z, arc = Math.PI * 2, rx = 0, ry = 0, rz = 0, seg = 10) => part(new THREE.TorusGeometry(r, t, 4, seg, arc), c, x, y, z, rx, ry, rz);
const flatCone = (r, h, c, x, y, z, sz, rz) => { const g = new THREE.ConeGeometry(r, h, 4); g.rotateY(Math.PI / 4); g.scale(1, 1, sz); return part(g, c, x, y, z, 0, 0, rz); };
// ganze Teilgruppe verschieben/drehen (z. B. Hut leicht nach hinten kippen, damit man das Gesicht von oben sieht)
const tf = (parts, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  for (const p of parts) p.g.applyMatrix4(m);
  return parts;
};
const shade = (c, f) => new THREE.Color(c).multiplyScalar(f);
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

// shortcut: Geometrien werden nie freigegeben (geteilt zwischen Spielern), bei sehr vielen Look-Wechseln ggf. LRU einbauen
const GEO = new Map();
const geo = (k, fn) => { let g = GEO.get(k); if (!g) GEO.set(k, g = merge(fn())); return g; };
// Teile aus Blender (characters.glb) mit den Farben dieser Figur; ohne Datei die alten Formen
const BL = () => hasModel('av_head');
const bgeo = (names, l, key, fn) => (BL() && keyedGeometry(names, l, 'A' + key)) || geo(key, fn);
const HAT_HIDES = ['straw', 'cap', 'beanie', 'cowboy', 'wizard'];
const headNames = l => ['av_head', `av_${HAT_HIDES.includes(l.hat) ? 'hairlow' : 'hair'}_${l.hairStyle}`, 'av_hat_' + l.hat, 'av_glasses_' + l.glasses];

const WHITE = 0xfaf6ee, DARK = 0x2b2321, BLUSH = 0xff9aa8, PINK = 0xff8fab, GOLD = 0xffd23f, WOOD = 0xa8743f, METAL = 0xc4ccd4;
const HIP = 0.345, EY = -0.03, HEAD = 0.3; // Hüfthöhe, Augenhöhe (Kopf-lokal), Kopfmitte über dem Hals

// ---------- Kopf (Ursprung = Kopfmitte) ----------
function hairParts(st, c) {
  const cap = ell(0.32, c, 0, 0.05, -0.035, 1.04, 0.92, 1, 0, 0, 0, 12);
  const side = s => ell(0.075, c, 0.27 * s, -0.04, 0.05, 0.55, 1.5, 0.9, 0, 0, 0.1 * s);
  switch (st) {
    case 'bald': return [];
    case 'short': return [cap, side(-1), side(1),
      ell(0.1, c, -0.09, 0.15, 0.215, 1.25, 0.55, 0.65, 0.4, 0, 0.35), ell(0.09, c, 0.08, 0.16, 0.215, 1.2, 0.5, 0.65, 0.4, 0, -0.25), ell(0.07, c, 0.2, 0.12, 0.17, 1, 0.6, 0.7, 0.3, 0, -0.6)];
    case 'long': return [cap, ell(0.29, c, 0, -0.15, -0.12, 1.12, 1.25, 0.72, 0, 0, 0, 10),
      ell(0.085, c, -0.255, -0.17, 0.1, 0.7, 2, 0.8), ell(0.085, c, 0.255, -0.17, 0.1, 0.7, 2, 0.8),
      ell(0.12, c, -0.09, 0.15, 0.2, 1.1, 0.5, 0.7, 0.4, 0, 0.45), ell(0.12, c, 0.09, 0.15, 0.2, 1.1, 0.5, 0.7, 0.4, 0, -0.45)];
    case 'ponytail': return [cap, side(-1), side(1), ell(0.12, c, 0, 0.15, 0.2, 1.6, 0.45, 0.7, 0.4),
      ball(0.05, PINK, 0, 0.2, -0.3), ell(0.1, c, 0, 0.08, -0.4, 0.95, 1.7, 0.9, -0.5), ell(0.08, c, 0, -0.08, -0.43, 0.9, 1.5, 0.9, 0.3)];
    case 'buns': return [cap, side(-1), side(1), ell(0.12, c, 0, 0.15, 0.2, 1.6, 0.45, 0.7, 0.4),
      ball(0.12, c, -0.2, 0.28, -0.05, 1, 1, 1, 8), ball(0.12, c, 0.2, 0.28, -0.05, 1, 1, 1, 8), ball(0.035, PINK, -0.13, 0.22, 0.03), ball(0.035, PINK, 0.13, 0.22, 0.03)];
    case 'curly': {
      const p = [cap];
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4, r = i < 4 ? 0.12 : 0.27, y = i < 4 ? 0.3 : 0.12 + (i % 3) * 0.06;
        if (Math.sin(a) * r > 0.2 && y < 0.2) continue; // Gesicht frei lassen
        p.push(ball(0.1, c, Math.cos(a) * r, y, Math.sin(a) * r - 0.04, 1, 1, 1, 6));
      }
      return p;
    }
    case 'bob': return [cap, ell(0.33, c, 0, -0.03, -0.085, 1.1, 0.85, 0.95, 0, 0, 0, 12), ell(0.13, c, 0, 0.13, 0.195, 1.9, 0.5, 0.7, 0.45)];
    case 'spiky': {
      const p = [cap, side(-1), side(1)];
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + 0.4;
        p.push(cone(0.08, 0.2, c, Math.sin(a) * 0.16, 0.33, Math.cos(a) * 0.16 - 0.03, 5, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7));
      }
      p.push(cone(0.08, 0.22, c, 0, 0.42, -0.02, 5));
      return p;
    }
  }
  return [cap];
}

function hatParts(l) {
  const T = l.topColor, B = l.bottomColor;
  switch (l.hat) {
    case 'straw': return tf([cyl(0.46, 0.46, 0.035, 0xf2d27a, 0, 0.23, 0, 14), cyl(0.22, 0.255, 0.18, 0xf2d27a, 0, 0.33, 0, 12),
      ell(0.22, 0xf2d27a, 0, 0.42, 0, 1, 0.25, 1, 0, 0, 0, 10), cyl(0.258, 0.258, 0.05, 0xff6b8a, 0, 0.27, 0, 12)], 0, 0, 0, -0.2);
    case 'cap': return tf([dome(0.335, T, 0, 0.12, -0.01, 1.04, 0.85, 1.04), box(0.26, 0.025, 0.15, shade(T, 0.85), 0, 0.13, 0.33, 0, -0.1),
      ell(0.055, WHITE, 0, 0.26, 0.27, 1, 1, 0.35, -0.6), ball(0.03, shade(T, 0.85), 0, 0.41, -0.01)], 0, 0, 0, -0.3);
    case 'flowers': {
      const p = [], cols = [0xff8fab, 0xffe066, 0xffffff, 0xb39cff, 0xff6b8a];
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, x = Math.sin(a) * 0.285, z = Math.cos(a) * 0.285;
        p.push(ball(0.065, cols[i % 5], x, 0.2, z, 1, 0.75, 1, 6), ball(0.025, GOLD, x * 1.12, 0.22, z * 1.12, 1, 1, 1, 4));
        p.push(ell(0.05, 0x76c955, Math.sin(a + 0.31) * 0.29, 0.18, Math.cos(a + 0.31) * 0.29, 1.4, 0.4, 0.8, 0, a + 0.31));
      }
      return tf(p, 0, 0, 0, -0.18);
    }
    case 'bunny': return [-1, 1].flatMap(s => [ell(0.075, WHITE, 0.12 * s, 0.48, -0.04, 0.8, 2.4, 0.55, -0.15, 0, -0.18 * s, 8), ell(0.045, 0xffb3c8, 0.12 * s, 0.47, -0.005, 0.7, 2.1, 0.4, -0.15, 0, -0.18 * s)]);
    case 'crown': return tf([cyl(0.2, 0.18, 0.12, GOLD, 0, 0.37, 0, 8), ...[0, 1, 2, 3, 4].map(i => cone(0.05, 0.12, GOLD, Math.sin(i * 1.2566) * 0.18, 0.48, Math.cos(i * 1.2566) * 0.18, 4)),
      ...[0, 1, 2, 3, 4].map(i => ball(0.025, 0xfff3b0, Math.sin(i * 1.2566) * 0.18, 0.55, Math.cos(i * 1.2566) * 0.18, 1, 1, 1, 4)),
      ell(0.04, 0xff4d6d, 0, 0.37, 0.195, 1, 1, 0.5), ell(0.03, 0x6cc4ff, 0.13, 0.37, 0.14, 1, 1, 0.5, 0, 0.75), ell(0.03, 0x6cc4ff, -0.13, 0.37, 0.14, 1, 1, 0.5, 0, -0.75)], 0, 0, 0, -0.1, 0, 0.12);
    case 'beanie': return tf([dome(0.34, B, 0, 0.13, -0.01, 1.04, 1.02, 1.04), cyl(0.354, 0.356, 0.08, shade(B, 0.8), 0, 0.15, -0.01, 12),
      ball(0.08, WHITE, 0, 0.53, -0.01, 1, 1, 1, 7)], 0, 0, 0, -0.3);
    case 'cat': return [-1, 1].flatMap(s => [cone(0.1, 0.17, l.hairColor, 0.17 * s, 0.37, -0.03, 4, 0, Math.PI / 4, -0.38 * s), cone(0.055, 0.1, 0xffb3c8, 0.165 * s, 0.36, 0.015, 4, 0, Math.PI / 4, -0.38 * s)]);
    case 'bow': return tf([ell(0.09, 0xff6b8a, -0.095, 0, 0, 1.2, 0.85, 0.5, 0, 0, 0.35), ell(0.09, 0xff6b8a, 0.095, 0, 0, 1.2, 0.85, 0.5, 0, 0, -0.35),
      ball(0.045, 0xe8507a, 0, 0, 0.02), box(0.04, 0.1, 0.02, 0xff6b8a, -0.04, -0.08, 0, 0, 0, -0.35), box(0.04, 0.1, 0.02, 0xff6b8a, 0.04, -0.08, 0, 0, 0, 0.35)], 0.15, 0.3, 0.02, -0.55, 0.25, -0.45);
    case 'cowboy': {
      const C = 0x9c6b3f;
      return tf([ell(0.33, C, 0, 0.23, 0, 1, 0.08, 1.3, 0, 0, 0, 12), ell(0.2, C, 0.31, 0.28, 0, 0.9, 0.13, 1.6, 0, 0, 0.6), ell(0.2, C, -0.31, 0.28, 0, 0.9, 0.13, 1.6, 0, 0, -0.6),
        cyl(0.2, 0.24, 0.22, C, 0, 0.35, 0, 10), ell(0.2, C, 0, 0.46, 0, 1, 0.3, 1.05, 0, 0, 0, 10), box(0.04, 0.05, 0.34, shade(C, 0.7), 0, 0.5, 0),
        cyl(0.243, 0.245, 0.045, 0x5a3a24, 0, 0.27, 0, 10)], 0, 0, 0, -0.18);
    }
    case 'beret': return tf([ell(0.33, T, 0.04, 0.24, -0.02, 1.08, 0.3, 1.02, 0, 0, -0.18, 12), ball(0.03, shade(T, 0.6), 0.04, 0.35, -0.02, 1, 1.4, 1, 5)], 0, 0, 0, -0.2);
    case 'tophat': {
      const C = 0x2b2b38;
      return tf([cyl(0.42, 0.42, 0.03, C, 0, 0.24, 0, 14), cyl(0.24, 0.25, 0.42, C, 0, 0.46, 0, 14), cyl(0.255, 0.255, 0.07, 0xd94a5a, 0, 0.3, 0, 14), ball(0.04, WHITE, 0.2, 0.31, 0.15, 1, 1, 0.5, 6)], 0, 0, 0, -0.15);
    }
    case 'pirate': {
      const C = 0x2f2a33;
      return tf([ell(0.36, C, 0, 0.3, 0, 1.35, 0.42, 0.75, 0, 0, 0, 12), cyl(0.27, 0.29, 0.06, C, 0, 0.26, 0, 12), ell(0.07, WHITE, 0, 0.36, 0.25, 1, 1, 0.3), box(0.12, 0.02, 0.01, WHITE, 0, 0.3, 0.27, 0, 0, 0.6),
        box(0.12, 0.02, 0.01, WHITE, 0, 0.3, 0.27, 0, 0, -0.6), cyl(0.012, 0.012, 0.85, GOLD, 0, 0.47, 0.17, 6, 0, 0, Math.PI / 2)], 0, 0, 0, -0.12);
    }
    case 'tiara': return tf([ring(0.2, 0.018, 0xd9dde2, 0, 0.27, -0.02, Math.PI, Math.PI / 2, 0, 0, 12), ...[-2, -1, 0, 1, 2].map(i => cone(0.035, 0.09 + (i ? 0 : 0.06), 0xd9dde2, Math.sin(i * 0.4) * 0.2, 0.33 + (i ? 0 : 0.03), Math.cos(i * 0.4) * 0.2 - 0.02, 4)),
      ell(0.035, 0x6cc4ff, 0, 0.36, 0.18, 1, 1.3, 0.5), ell(0.022, 0xff8fab, 0.1, 0.31, 0.16, 1, 1, 0.5), ell(0.022, 0xff8fab, -0.1, 0.31, 0.16, 1, 1, 0.5)], 0, 0, 0, -0.1);
    case 'sunhat': {
      const C = 0xfff0c9;
      return tf([cyl(0.56, 0.56, 0.03, C, 0, 0.23, 0, 16), dome(0.27, C, 0, 0.24, 0, 1, 0.75, 1), cyl(0.272, 0.272, 0.06, 0x6cc4ff, 0, 0.28, 0, 14),
        ball(0.06, 0xff6b8a, 0.24, 0.3, 0.1, 1, 1, 1, 6), ball(0.05, 0xffd23f, 0.27, 0.29, 0.0, 1, 1, 1, 6), ell(0.06, 0x76c955, 0.27, 0.27, 0.15, 1.4, 0.4, 0.8)], 0, 0, 0, -0.2);
    }
    case 'wizard': {
      const C = 0x7b5cd6;
      return tf([cyl(0.44, 0.44, 0.03, C, 0, 0.24, 0, 14), cyl(0.1, 0.27, 0.34, C, 0, 0.42, 0, 10), cone(0.1, 0.26, C, 0, 0.695, -0.074, 8, -0.6),
        cyl(0.262, 0.272, 0.05, GOLD, 0, 0.28, 0, 10), flatCone(0.04, 0.07, GOLD, 0.05, 0.43, 0.2, 0.3, 0.3), flatCone(0.04, 0.07, GOLD, 0.05, 0.43, 0.2, 0.3, Math.PI + 0.3),
        ball(0.025, GOLD, -0.1, 0.5, 0.13, 1, 1, 1, 4), ball(0.03, GOLD, 0, 0.82, -0.16, 1, 1, 1, 5)], 0, 0, 0, -0.15);
    }
  }
  return [];
}

function glassesParts(k) {
  const y = EY, z = 0.3, F = 0x4a3426, p = [];
  if (k === 'none') return p;
  for (const s of [-1, 1]) {
    const x = 0.115 * s;
    if (k === 'round') p.push(ring(0.062, 0.011, F, x, y, z, Math.PI * 2, 0, 0, 0, 12));
    if (k === 'sun') p.push(ell(0.07, 0x26262e, x, y, z - 0.005, 1.15, 0.8, 0.3, 0, 0, 0, 9), ell(0.016, WHITE, x - 0.03, y + 0.022, z + 0.016, 1.5, 0.6, 0.3));
    if (k === 'heart') p.push(ball(0.042, 0xff4d7d, x - 0.027, y + 0.018, z, 1, 1, 0.4), ball(0.042, 0xff4d7d, x + 0.027, y + 0.018, z, 1, 1, 0.4), flatCone(0.07, 0.08, 0xff4d7d, x, y - 0.03, z, 0.35, Math.PI),
      ell(0.014, WHITE, x - 0.035, y + 0.03, z + 0.017, 1.3, 1, 0.3));
    p.push(box(0.012, 0.012, 0.21, F, 0.23 * s, y + 0.01, 0.2, -0.49 * s));
  }
  p.push(box(0.07, 0.014, 0.014, k === 'heart' ? 0xff4d7d : F, 0, y + 0.012, z + 0.005));
  if (k === 'sun') p.push(box(0.38, 0.022, 0.02, 0x26262e, 0, y + 0.05, z));
  return p;
}

function headParts(l) {
  const S = l.skin, p = [
    ell(0.3, S, 0, 0, 0, 1.04, 0.94, 1, 0, 0, 0, 12), cyl(0.075, 0.08, 0.1, S, 0, -0.29, 0, 8),
    ell(0.05, BLUSH, -0.19, -0.1, 0.205, 1.1, 0.6, 0.4), ell(0.05, BLUSH, 0.19, -0.1, 0.205, 1.1, 0.6, 0.4),
    ring(0.024, 0.008, 0x8a3b3b, 0, -0.105, 0.268, Math.PI, 0, 0, Math.PI, 6),
  ];
  let h = hairParts(l.hairStyle, l.hairColor);
  // unter Hüten nur Haare zeigen, die unten herausschauen
  if (['straw', 'cap', 'beanie', 'cowboy', 'wizard'].includes(l.hat)) h = h.filter(q => (q.g.computeBoundingBox(), q.g.boundingBox.min.y + q.g.boundingBox.max.y < 0.28));
  return [...p, ...h, ...hatParts(l), ...glassesParts(l.glasses)];
}

// Augen als eigenes Mesh (Ursprung = Augenhöhe), damit sie blinzeln können (scale.y)
function eyeParts(st) {
  const p = [];
  for (const s of [-1, 1]) {
    const x = 0.115 * s, z = 0.268;
    if (st === 'happy') p.push(ring(0.04, 0.013, DARK, x, -0.015, z + 0.006, Math.PI, 0, 0, 0, 6));
    else if (st === 'sleepy') p.push(ell(0.048, DARK, x, -0.012, z, 1.05, 0.5, 0.45), box(0.105, 0.014, 0.03, DARK, x, 0.01, z + 0.008, 0, 0, -0.12 * s));
    else {
      p.push(ell(0.052, DARK, x, 0, z, 0.95, 1.2, 0.45), ell(0.018, 0xffffff, x + 0.017, 0.024, z + 0.021));
      if (st === 'lashes') p.push(box(0.04, 0.013, 0.013, DARK, x + 0.05 * s, 0.045, z - 0.004, 0, 0, 0.6 * s), box(0.035, 0.013, 0.013, DARK, x + 0.06 * s, 0.022, z - 0.01, 0, 0, 0.25 * s));
    }
  }
  return p;
}

// ---------- Körper (Ursprung = Hüftgelenk) ----------
function torsoParts(l) {
  const T = l.topColor, B = l.bottomColor, p = [];
  if (l.top === 'dress') {
    p.push(cyl(0.165, 0.2, 0.25, T, 0, 0.255, 0, 12), cyl(0.19, 0.33, 0.25, T, 0, 0.02, 0, 12), cyl(0.335, 0.335, 0.03, WHITE, 0, -0.105, 0, 12),
      ell(0.1, WHITE, 0, 0.37, 0.1, 1.5, 0.3, 0.7), ell(0.17, T, 0, 0.37, 0, 1, 0.32, 0.98, 0, 0, 0, 10), ball(0.035, WHITE, 0, 0.14, 0.2));
  } else if (l.top === 'hoodie') {
    p.push(cyl(0.2, 0.215, 0.1, B, 0, 0.01, 0, 12), cyl(0.172, 0.218, 0.33, T, 0, 0.215, 0, 12), ell(0.175, T, 0, 0.37, 0, 1, 0.32, 0.98, 0, 0, 0, 10),
      box(0.2, 0.09, 0.03, shade(T, 0.85), 0, 0.12, 0.2), ell(0.15, T, 0, 0.38, -0.15, 1.3, 0.62, 0.85, 0, 0, 0, 9), ell(0.1, shade(T, 0.65), 0, 0.395, -0.1, 1.3, 0.45, 0.5),
      cyl(0.008, 0.008, 0.09, WHITE, -0.05, 0.3, 0.18, 4), cyl(0.008, 0.008, 0.09, WHITE, 0.05, 0.3, 0.18, 4));
  } else {
    const shirt = l.top === 'vest' ? WHITE : T;
    p.push(cyl(0.2, 0.215, 0.15, B, 0, 0.035, 0, 12), cyl(0.165, 0.2, 0.27, shirt, 0, 0.245, 0, 12), ell(0.17, shirt, 0, 0.37, 0, 1, 0.32, 0.98, 0, 0, 0, 10));
    if (l.top === 'tshirt') p.push(box(0.07, 0.065, 0.02, shade(T, 0.82), -0.075, 0.26, 0.178), ell(0.02, WHITE, -0.075, 0.27, 0.19, 1, 1, 0.4));
    if (l.top === 'overalls') {
      p.push(box(0.21, 0.16, 0.04, B, 0, 0.19, 0.175), box(0.09, 0.06, 0.02, shade(B, 0.82), 0, 0.2, 0.198),
        ball(0.022, GOLD, -0.08, 0.255, 0.2), ball(0.022, GOLD, 0.08, 0.255, 0.2));
      for (const s of [-1, 1]) p.push(box(0.04, 0.13, 0.025, B, 0.085 * s, 0.32, 0.15, 0, -0.45), box(0.04, 0.3, 0.025, B, 0.085 * s, 0.25, -0.165, 0, 0.2));
    }
    if (l.top === 'vest') {
      p.push(part(new THREE.CylinderGeometry(0.176, 0.208, 0.25, 12, 1, true, 0.55, Math.PI * 2 - 1.1), T, 0, 0.24, 0),
        ell(0.16, T, 0, 0.36, -0.03, 1.05, 0.3, 0.85, 0, 0, 0, 10),
        flatCone(0.04, 0.06, WHITE, -0.04, 0.37, 0.15, 0.3, 2.4), flatCone(0.04, 0.06, WHITE, 0.04, 0.37, 0.15, 0.3, -2.4),
        ell(0.03, 0xff6b6b, -0.03, 0.345, 0.17, 1, 0.8, 0.5), ell(0.03, 0xff6b6b, 0.03, 0.345, 0.17, 1, 0.8, 0.5), ball(0.016, 0xd94c4c, 0, 0.345, 0.18));
    }
  }
  return p;
}

function armParts(l) {
  const S = l.skin, C = l.top === 'vest' ? WHITE : l.topColor;
  if (l.top === 'hoodie' || l.top === 'vest') return [ell(0.072, C, 0, -0.03, 0), cyl(0.066, 0.06, 0.18, C, 0, -0.11, 0, 8), cyl(0.063, 0.063, 0.03, shade(C, 0.85), 0, -0.2, 0, 8), ball(0.062, S, 0, -0.25, 0)];
  return [ell(0.075, C, 0, -0.05, 0, 1, 1.3, 1), cyl(0.047, 0.044, 0.14, S, 0, -0.15, 0, 7), ball(0.062, S, 0, -0.25, 0)];
}

function legParts(l) {
  const shoe = ell(0.085, l.shoes, 0, -0.29, 0.035, 1, 0.65, 1.4);
  if (l.top === 'dress') return [cyl(0.052, 0.048, 0.24, l.skin, 0, -0.12, 0, 7), cyl(0.056, 0.056, 0.06, WHITE, 0, -0.235, 0, 7), shoe];
  return [cyl(0.085, 0.075, 0.24, l.bottomColor, 0, -0.12, 0, 8), shoe];
}

// ---------- Werkzeuge (Ursprung = Hand; nach -y gebaut, [Kippwinkel, waagerecht halten, Teile]) ----------
const HELD = {
  hoe: [-0.9, false, () => [cyl(0.018, 0.018, 0.68, WOOD, 0, -0.22, 0, 5), box(0.15, 0.03, 0.13, METAL, 0, -0.55, -0.05)]],
  can: [0, true, () => [cyl(0.085, 0.095, 0.15, 0x7cc6e8, 0, -0.14, 0, 10), cyl(0.089, 0.089, 0.025, 0x5aa9cf, 0, -0.07, 0, 10), ring(0.055, 0.013, 0x5aa9cf, 0, -0.06, -0.01, Math.PI, 0, Math.PI / 2),
    cyl(0.014, 0.024, 0.18, 0x7cc6e8, 0, -0.12, 0.15, 6, 0.9), cyl(0.035, 0.02, 0.03, 0x5aa9cf, 0, -0.06, 0.225, 7, 0.9)]],
  sickle: [-0.3, false, () => [cyl(0.02, 0.022, 0.16, WOOD, 0, -0.06, 0, 5), ring(0.1, 0.016, METAL, 0.1, -0.14, 0, Math.PI * 1.15, Math.PI, 0, Math.PI, 8)]],
  rod: [-1, false, () => [cyl(0.011, 0.022, 0.95, 0xc98d55, 0, -0.4, 0, 5), cyl(0.035, 0.035, 0.03, 0x5a5f73, 0.035, -0.02, 0, 8, 0, 0, Math.PI / 2),
    cyl(0.004, 0.004, 0.3, 0xeeeeee, 0, -0.82, -0.14, 3, -1.19), ball(0.02, 0xff6b6b, 0, -0.77, -0.28, 1, 1, 1, 5)]],
  seeds: [0, true, () => [ell(0.085, 0xd9b98a, 0, -0.12, 0.02, 1, 1.1, 0.9, 0, 0, 0, 8), cyl(0.032, 0.05, 0.05, 0xc9a370, 0, -0.035, 0.02, 7),
    cyl(0.038, 0.038, 0.015, 0xff6b8a, 0, -0.05, 0.02, 7), ell(0.03, 0x76c955, 0, -0.12, 0.1, 1, 0.6, 0.3, 0, 0, 0.5)]],
  net: [-0.6, false, () => [cyl(0.016, 0.018, 0.75, WOOD, 0, -0.3, 0, 5), ring(0.13, 0.014, 0xd9d9d9, 0, -0.78, 0, Math.PI * 2, Math.PI / 2, 0, 0, 12),
    cone(0.12, 0.2, 0xf4f1ea, 0, -0.86, 0, 10, Math.PI)]],
  shovel: [-0.7, false, () => [cyl(0.018, 0.02, 0.6, WOOD, 0, -0.25, 0, 5), box(0.1, 0.025, 0.04, WOOD, 0, 0.04, 0), box(0.14, 0.18, 0.025, METAL, 0, -0.62, 0.0), cone(0.07, 0.07, METAL, 0, -0.74, 0, 4, Math.PI, Math.PI / 4)]],
  axe: [-0.9, false, () => [cyl(0.02, 0.024, 0.55, WOOD, 0, -0.22, 0, 5), box(0.05, 0.12, 0.16, METAL, 0, -0.46, 0.05), box(0.02, 0.13, 0.04, 0xd9dde2, 0, -0.46, 0.14)]],
  box: [0, true, () => [box(0.24, 0.17, 0.2, 0xc98d55, 0.12, -0.08, 0.1), box(0.25, 0.03, 0.21, 0x9c6b3f, 0.12, -0.02, 0.1), box(0.25, 0.03, 0.21, 0x9c6b3f, 0.12, -0.12, 0.1),
    ball(0.05, 0xff3b3b, 0.08, 0.02, 0.08, 1, 1, 1, 6), ball(0.05, 0xff8a2a, 0.16, 0.02, 0.12, 1, 1, 1, 6)]],
};

// ---------- Avatar ----------
const REST = { y: 0, rz: 0, rx: 0, ry: 0, z: 0, tx: 0, ty: 0, tz: 0, hx: 0, hz: 0, lLx: 0, lLz: 0, lRx: 0, lRz: 0, aLx: 0, aLz: 0.2, aRx: 0, aRz: 0.2, hand: 0 };
const cl = x => Math.min(1, Math.max(0, x)), ease = x => x * x * (3 - 2 * x);

function mesh(g, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(g, MAT);
  m.castShadow = m.receiveShadow = true;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function makeAvatar(look) {
  const l = cleanLook(look);
  const root = new THREE.Group(), rig = grp(root), hips = grp(rig, 0, HIP), torso = grp(hips);
  const body = mesh(bgeo(['av_torso_' + l.top], l, 'torso' + [l.top, l.topColor, l.bottomColor], () => torsoParts(l)), torso);
  const legG = bgeo([l.top === 'dress' ? 'av_leg_dress' : 'av_leg_pants'], l, 'leg' + [l.top, l.bottomColor, l.shoes, l.skin], () => legParts(l));
  const armG = bgeo([l.top === 'hoodie' ? 'av_arm_hoodie' : l.top === 'vest' ? 'av_arm_vest' : 'av_arm_short'], l, 'arm' + [l.top, l.topColor, l.skin], () => armParts(l));
  // Figur schaut nach +z: linke Seite = +x, rechte Seite = -x
  const legL = grp(hips, 0.095), legR = grp(hips, -0.095), armL = grp(torso, 0.21, 0.31), armR = grp(torso, -0.21, 0.31);
  mesh(legG, legL); mesh(legG, legR); mesh(armG, armL); mesh(armG, armR);
  const hand = grp(armR, 0, -0.25), neck = grp(torso, 0, 0.38);
  mesh(bgeo(headNames(l), l, 'head' + [l.skin, l.hairStyle, l.hairColor, l.hat, l.glasses, l.topColor, l.bottomColor], () => headParts(l)), neck, 0, HEAD);
  const eyes = mesh(bgeo(['av_eyes_' + l.eyes], l, 'eyes' + l.eyes, () => eyeParts(l.eyes)), neck, 0, HEAD + EY);
  eyes.castShadow = false;

  let held = null, heldMesh = null, level = false, ph = 0, T = Math.random() * 9, blinkAt = 1 + Math.random() * 3;
  const c = { ...REST };
  root.userData.setHeld = kind => {
    if (kind === held) return;
    if (heldMesh) hand.remove(heldMesh);
    held = HELD[kind] ? kind : null;
    heldMesh = null;
    level = false;
    if (!held) return;
    const [rx, lv, fn] = HELD[held];
    heldMesh = mesh(bgeo(['held_' + held], {}, 'held' + held, fn), hand);
    heldMesh.rotation.x = rx;
    level = lv;
  };

  root.userData.update = (dt, st = {}) => {
    T += dt;
    const t = { ...REST }, s = cl(st.speed || 0), a = cl(st.actT || 0), e = Math.sin(Math.PI * a);
    let eye = 1;
    // Gehen + Atmen
    if (s > 0.01) ph += dt * (5 + 11 * s) * (st.run ? 1.5 : 1);
    const sw = Math.sin(ph) * s, br = Math.sin(T * 2.2);
    t.lLx = sw * 0.75; t.lRx = -sw * 0.75; t.aLx = -sw * 0.8; t.aRx = sw * 0.8;
    t.y = Math.abs(Math.cos(ph)) * 0.05 * s; t.rz = Math.sin(ph) * 0.04 * s; t.tx = 0.08 * s;
    if (st.run) { t.tx = 0.22 * s; t.aLz += 0.25; t.aRz += 0.25; t.y *= 1.6; }
    if (st.swim) { // Kraulen: Arme drehen, Kopf über Wasser
      const w = T * (3 + 4 * s);
      t.aLx = Math.sin(w) * 1.5 - 1.0; t.aRx = Math.sin(w + Math.PI) * 1.5 - 1.0; t.aLz = t.aRz = 0.35; t.tx = 0.15 + 0.2 * s; t.lLx = t.lRx = 0; t.y = 0;
    }
    t.aLz += br * 0.03; t.aRz += br * 0.03; t.hx = br * 0.02;
    if (held === 'box') { t.aLx = t.aRx = -0.85; t.aLz = t.aRz = -0.25; }
    if (st.pose === 'sit') { t.y = 0.13; t.rz = 0; t.tx = 0; t.lLx = t.lRx = -1.45; t.lLz = t.lRz = 0.08; t.aLx = t.aRx = -0.35; }
    if (st.pose === 'sleep') { t.rx = -1.5; t.y = 0.55; t.rz = 0; t.tx = 0; t.lLx = t.lRx = 0; t.aLx = t.aRx = 0; t.aLz = t.aRz = 0.15; t.hz = 0.25 + br * 0.03; eye = 0.08; }

    switch (st.act) {
      case 'hoe': {
        const up = ease(cl(a / 0.45)), dn = ease(cl((a - 0.45) / 0.2));
        // über die rechte Schulter ausholen, dann vor sich in den Boden hacken
        t.aRx = -2.5 * up + 1.95 * dn; t.aRz = 0.75 * up - 0.75 * dn; t.aLx = -2.3 * up + 1.75 * dn; t.aLz = -0.6 * up + 0.4 * dn;
        t.ty = -0.35 * up + 0.35 * dn; t.tx = -0.15 * up + 0.6 * dn; t.y = -0.04 * dn; t.hx = -0.1 * up + 0.3 * dn;
        break;
      }
      case 'can': {
        const u = ease(cl(a / 0.25));
        t.aRx = -1.0 * u; t.aRz = 0.1; t.tx = 0.12 * u; t.hand = 0.9 * Math.sin(Math.PI * cl((a - 0.15) / 0.85));
        break;
      }
      case 'sickle': {
        const u = ease(a);
        t.aRx = -1.25; t.aRz = 1.0 - 1.6 * u; t.ty = -0.45 + 0.9 * u; t.tx = 0.25; t.y = -0.03; t.aLx = -0.3; t.aLz = 0.5;
        break;
      }
      case 'plant': t.y = -0.07 * e; t.lLx = -0.7 * e; t.lRx = 0.55 * e; t.tx = 0.55 * e; t.aLx = t.aRx = -0.75 * e; t.aLz = t.aRz = 0; t.hx = 0.25 * e; break;
      case 'pet': t.aLx = t.aRx = (-1.0 + Math.sin(T * 16) * 0.12) * e; t.aLz = t.aRz = -0.1 * e; t.tx = 0.45 * e; t.y = -0.03 * e; t.hx = 0.1 * e; break;
      case 'use': t.aRx = -1.4 * e; t.aRz = 0; break;
      case 'lift': { const h = Math.min(1, e * 2.2); t.aLx = t.aRx = -2.75 * h; t.aLz = t.aRz = -0.12 * h; t.y = 0.06 * Math.max(0, Math.sin(Math.PI * cl(a * 2.5))); t.hx = -0.12 * h; eye = 1 - 0.85 * h; break; }
      case 'shake': t.aLx = t.aRx = -2.1 * Math.min(1, e * 2); t.aLz = t.aRz = -0.2; t.ty = Math.sin(T * 30) * 0.12 * e; t.tx = 0.15 * e; break;
      case 'highfive': { const h = Math.min(1, e * 2); t.aRx = -2.9 * h; t.aRz = -0.25 * h; t.tx = 0.1 * h; t.y = 0.05 * e; break; }
      case 'kiss': { const h = Math.min(1, e * 2); t.tx = 0.35 * h; t.hx = 0.15 * h; t.hz = 0.2 * h; t.aLx = t.aRx = -0.5 * h; t.aLz = t.aRz = 0.5 * h; t.lLx = 0.5 * h; break; }
      case 'net': {
        const u = ease(a);
        t.aRx = -1.7 + 0.6 * u; t.aRz = 1.3 - 2.2 * u; t.aLx = -1.2; t.aLz = -0.3; t.ty = -0.5 + 1.0 * u; t.tx = 0.2;
        break;
      }
      case 'hug': { const h = Math.min(1, e * 2); t.aLx = t.aRx = -1.35 * h; t.aLz = t.aRz = -0.5 * h; t.tx = 0.1 * h; t.hz = 0.15 * h; break; }
      case 'fish': {
        const up = ease(cl(a / 0.45)), dn = ease(cl((a - 0.45) / 0.15));
        t.aRx = -2.7 * up + 1.65 * dn; t.aRz = 0.05; t.aLx = -0.9 * dn; t.aLz = -0.35 * dn; t.tx = -0.1 * up + 0.2 * dn;
        break;
      }
    }

    switch (st.emote) {
      case '👋': t.aRx = 0; t.aRz = 2.6 + Math.sin(T * 12) * 0.35; t.hz = -0.12; break;
      case '🎉': t.y += Math.abs(Math.sin(T * 7)) * 0.14; t.aLx = t.aRx = 0; t.aLz = t.aRz = 2.6 + Math.sin(T * 14) * 0.2; eye = 0.6; break;
      case '😂': t.tz = Math.sin(T * 26) * 0.06; t.hx = -0.25; t.aLx = t.aRx = -0.5; t.aLz = t.aRz = -0.45; t.y += Math.abs(Math.sin(T * 13)) * 0.025; eye = 0.35; break;
      case '😮': t.y += Math.max(0, Math.sin(T * 6)) * 0.08; t.hx = -0.15; t.aLz = t.aRz = 0.6; eye = 1.25; break;
      case '❤️': case '❤': case '🥰': t.aLx = t.aRx = -1.0; t.aLz = t.aRz = -0.75; t.rz = Math.sin(T * 3) * 0.08; t.hz = Math.sin(T * 3 + 0.6) * 0.14; break;
      case '😴': t.hz = 0.35; t.hx = 0.2 + br * 0.04; t.tx += 0.06; t.aLz = t.aRz = 0.08; eye = 0.1; break;
      case '👍': case '🍀': t.aRx = -1.45 + Math.sin(T * 8) * 0.08; t.aRz = -0.15; break;
      case '💤': t.hz = 0.35; t.hx = 0.2 + br * 0.04; t.tx += 0.06; t.aLz = t.aRz = 0.08; eye = 0.1; break;
      case '💃': { const d = Math.sin(T * 9); t.rz = d * 0.15; t.y += Math.abs(d) * 0.06; t.aLx = t.aRx = 0; t.aLz = 2.4 + d * 0.5; t.aRz = 2.4 - d * 0.5; t.hz = -d * 0.15; t.ry = Math.sin(T * 4.5) * 0.4; eye = 0.6; break; }
      case '👏': t.aLx = t.aRx = -1.3; t.aLz = t.aRz = -0.35 + Math.abs(Math.sin(T * 14)) * 0.5; t.y += Math.abs(Math.sin(T * 7)) * 0.03; eye = 0.6; break;
      case '😢': t.hx = 0.35; t.aLx = t.aRx = -1.9; t.aLz = t.aRz = -0.7; t.tz = Math.sin(T * 18) * 0.03; eye = 0.3; break;
      case '😡': t.aLx = t.aRx = 0.2; t.aLz = t.aRz = 0.55; t.y += Math.max(0, Math.sin(T * 12)) * 0.05; t.tz = Math.sin(T * 24) * 0.04; t.hx = 0.1; eye = 0.55; break;
      case '🤔': t.aRx = -2.05; t.aRz = -0.75; t.aLx = -0.6; t.aLz = -0.6; t.hz = 0.18 + Math.sin(T * 2) * 0.05; t.hx = -0.1; break;
      case '😊': case '🙈': t.aLx = t.aRx = -2.2; t.aLz = t.aRz = -0.65; t.rz = Math.sin(T * 4) * 0.08; t.hx = 0.12; eye = st.emote === '🙈' ? 0.1 : 0.6; break;
      case '😘': { const k = Math.sin(T * 5); t.aRx = -2.0 + k * 0.4; t.aRz = -0.5; t.tx = 0.15; t.hz = 0.15; eye = 0.25; break; }
      case '🎵': t.rz = Math.sin(T * 5) * 0.12; t.hz = Math.sin(T * 5 + 1) * 0.2; t.aLz = t.aRz = 0.6 + Math.sin(T * 5) * 0.2; t.hx = -0.15; eye = 0.6; break;
      case '✨': t.ry = T * 9; t.aLz = t.aRz = 1.4; t.y += 0.04; eye = 0.6; break;
    }

    if (T > blinkAt) { if (T > blinkAt + 0.13) blinkAt = T + 2 + Math.random() * 3; else eye = 0.1; }
    const k = 1 - Math.exp(-dt * 18);
    for (const n in c) c[n] += (t[n] - c[n]) * k;
    rig.position.set(0, c.y, c.z); rig.rotation.set(c.rx, st.emote === '✨' ? t.ry % (Math.PI * 2) : c.ry, c.rz);
    torso.rotation.set(c.tx, c.ty, c.tz);
    body.scale.y = 1 + br * 0.012;
    neck.rotation.set(c.hx, 0, c.hz);
    legL.rotation.set(c.lLx, 0, c.lLz); legR.rotation.set(c.lRx, 0, -c.lRz);
    armL.rotation.set(c.aLx, 0, c.aLz); armR.rotation.set(c.aRx, 0, -c.aRz);
    hand.rotation.x = (level ? -(c.aRx + c.tx) : 0) + c.hand;
    eyes.scale.y = eye;
  };
  root.userData.update(1, {});
  return root;
}

// ---------- Haustiere (schauen nach +z) ----------
// je Tier: Rumpf, Kopf (an Gelenk), Schwanz (an Gelenk), zwei diagonale Beinpaare; hop = hüpft statt zu laufen
function petParts(kind, C) {
  const L = mix(C, 0xffffff, 0.7), D = shade(C, 0.7), eyes = (y, z, w, r = 0.022) => [-1, 1].flatMap(s => [ell(r, DARK, w * s, y, z, 1, 1.25, 0.6), ell(r * 0.4, 0xffffff, w * s + r * 0.35, y + r * 0.45, z + r * 0.5)]);
  const blush = (y, z, w) => [ell(0.022, BLUSH, -w, y, z, 1.2, 0.7, 0.4), ell(0.022, BLUSH, w, y, z, 1.2, 0.7, 0.4)];
  const legs = (col, r, h, pts) => pts.map(([x, z]) => cyl(r, r * 0.9, h, col, x, h / 2, z, 6));
  switch (kind) {
    case 'dog': return {
      body: [ell(0.14, C, 0, 0.19, -0.02, 1, 0.85, 1.35, 0, 0, 0, 8), ell(0.09, L, 0, 0.18, 0.1, 1, 1, 0.7)],
      head: [ell(0.135, C, 0, 0.03, 0, 1.1, 1, 1, 0, 0, 0, 9), ell(0.065, L, 0, -0.03, 0.11, 1.15, 0.8, 1), ball(0.026, DARK, 0, 0.0, 0.18),
        ell(0.025, 0xff7a8a, 0, -0.07, 0.15, 1, 0.5, 0.8), ell(0.05, D, -0.13, -0.01, 0, 0.6, 1.5, 0.9, 0, 0, 0.35), ell(0.05, D, 0.13, -0.01, 0, 0.6, 1.5, 0.9, 0, 0, -0.35), ...eyes(0.05, 0.115, 0.055), ...blush(-0.02, 0.1, 0.09)],
      neck: [0, 0.31, 0.15], tail: [ell(0.035, C, 0, 0.08, -0.02, 1, 2.2, 1, -0.5)], tailAt: [0, 0.22, -0.18],
      a: legs(C, 0.04, 0.12, [[0.07, 0.1], [-0.07, -0.13]]), b: legs(C, 0.04, 0.12, [[-0.07, 0.1], [0.07, -0.13]]),
    };
    case 'bunny': return {
      body: [ell(0.14, C, 0, 0.15, -0.02, 1, 0.95, 1.15, 0, 0, 0, 8), ell(0.08, L, 0, 0.14, 0.08, 1, 1, 0.7)],
      head: [ell(0.12, C, 0, 0.02, 0, 1.1, 1, 1, 0, 0, 0, 9), ell(0.045, L, 0, -0.03, 0.095, 1.3, 0.8, 0.8), ell(0.016, 0xff8fab, 0, -0.005, 0.13, 1.2, 0.8, 0.8),
        ...[-1, 1].flatMap(s => [ell(0.042, C, 0.05 * s, 0.2, -0.02, 1, 3, 0.65, -0.1, 0, -0.15 * s), ell(0.024, 0xffb3c8, 0.05 * s, 0.2, 0.004, 1, 2.6, 0.5, -0.1, 0, -0.15 * s)]), ...eyes(0.035, 0.1, 0.052), ...blush(-0.02, 0.09, 0.08)],
      neck: [0, 0.28, 0.1], tail: [ball(0.05, 0xffffff, 0, 0, 0, 1, 1, 1, 6)], tailAt: [0, 0.14, -0.17],
      a: [-1, 1].map(s => ell(0.035, C, 0.06 * s, 0.03, 0.1, 1, 0.8, 1.4)), b: [-1, 1].map(s => ell(0.045, C, 0.09 * s, 0.04, -0.06, 1, 0.8, 1.8)), hop: true,
    };
    case 'chick': return {
      body: [ell(0.14, C, 0, 0.17, 0, 1, 0.95, 1.05, 0, 0, 0, 9), ell(0.06, D, -0.13, 0.17, -0.01, 0.45, 1, 1.2, 0, 0, 0.3), ell(0.06, D, 0.13, 0.17, -0.01, 0.45, 1, 1.2, 0, 0, -0.3)],
      head: [ball(0.1, C, 0, 0, 0, 1, 1, 1, 8), cone(0.03, 0.06, 0xff9f1c, 0, -0.01, 0.11, 5, Math.PI / 2), cone(0.02, 0.06, C, -0.015, 0.11, 0, 4, 0, 0, 0.3), cone(0.02, 0.06, C, 0.015, 0.11, 0, 4, 0, 0, -0.3),
        ...eyes(0.02, 0.085, 0.045, 0.017), ...blush(-0.02, 0.07, 0.07)],
      neck: [0, 0.32, 0.03], tail: [cone(0.04, 0.08, D, 0, 0.02, -0.03, 4, -1.1)], tailAt: [0, 0.18, -0.13],
      a: [cyl(0.012, 0.012, 0.08, 0xff9f1c, 0.05, 0.04, 0, 4), box(0.04, 0.012, 0.06, 0xff9f1c, 0.05, 0.006, 0.02)], b: [cyl(0.012, 0.012, 0.08, 0xff9f1c, -0.05, 0.04, 0, 4), box(0.04, 0.012, 0.06, 0xff9f1c, -0.05, 0.006, 0.02)], hop: true,
    };
    case 'fox': return {
      body: [ell(0.13, C, 0, 0.18, -0.02, 0.95, 0.85, 1.35, 0, 0, 0, 8), ell(0.065, 0xffffff, 0, 0.17, 0.1, 1, 1, 0.6)],
      head: [ell(0.13, C, 0, 0.03, 0, 1.15, 0.95, 1, 0, 0, 0, 9), cone(0.065, 0.13, C, 0, -0.02, 0.15, 6, Math.PI / 2), ball(0.022, DARK, 0, -0.02, 0.215), ell(0.06, 0xffffff, 0, -0.045, 0.09, 1.5, 0.6, 0.9),
        ...[-1, 1].flatMap(s => [cone(0.06, 0.13, C, 0.08 * s, 0.16, -0.02, 4, 0, Math.PI / 4, -0.3 * s), cone(0.028, 0.05, DARK, 0.1 * s, 0.205, -0.02, 4, 0, Math.PI / 4, -0.3 * s)]), ...eyes(0.04, 0.11, 0.055), ...blush(-0.02, 0.1, 0.09)],
      neck: [0, 0.3, 0.13], tail: [ell(0.075, C, 0, 0.06, -0.12, 1, 1, 2, 0.6, 0, 0, 8), ball(0.055, 0xffffff, 0, 0.15, -0.255, 1, 1, 1, 6)], tailAt: [0, 0.19, -0.18],
      a: legs(0x4a3426, 0.035, 0.12, [[0.07, 0.1], [-0.07, -0.13]]), b: legs(0x4a3426, 0.035, 0.12, [[-0.07, 0.1], [0.07, -0.13]]),
    };
    case 'pig': { // bleibt rosa, die Fellfarbe tönt nur leicht
      const P = mix(0xffb8c8, C, 0.15), PD = mix(0xff97ae, C, 0.1);
      return {
        body: [ell(0.15, P, 0, 0.17, -0.03, 1, 0.9, 1.25, 0, 0, 0, 10)],
        head: [ell(0.13, P, 0, 0.02, 0, 1.1, 0.98, 1, 0, 0, 0, 10), cyl(0.05, 0.055, 0.05, PD, 0, -0.02, 0.13, 12, Math.PI / 2),
          ...[-1, 1].flatMap(s => [ell(0.01, 0x9a4a5e, 0.02 * s, -0.02, 0.157, 0.8, 1.2, 0.5), ell(0.055, P, 0.08 * s, 0.1, 0.045, 0.85, 1.35, 0.35, 1.35, 0, -0.5 * s, 8),
            ell(0.035, PD, 0.081 * s, 0.106, 0.05, 0.8, 1.2, 0.3, 1.35, 0, -0.5 * s)]), ...eyes(0.045, 0.112, 0.058), ...blush(-0.03, 0.095, 0.095)],
        neck: [0, 0.27, 0.14], tail: [ring(0.028, 0.009, PD, 0, 0.03, -0.02, Math.PI * 1.6, -0.7)], tailAt: [0, 0.2, -0.2],
        a: legs(P, 0.04, 0.1, [[0.075, 0.1], [-0.075, -0.13]]), b: legs(P, 0.04, 0.1, [[-0.075, 0.1], [0.075, -0.13]]),
      };
    }
  }
  return { // Katze
    body: [ell(0.13, C, 0, 0.17, -0.03, 0.95, 0.85, 1.35, 0, 0, 0, 8), ell(0.08, L, 0, 0.17, 0.09, 1, 1, 0.6)],
    head: [ell(0.13, C, 0, 0.03, 0, 1.12, 0.95, 1, 0, 0, 0, 9), ell(0.05, L, 0, -0.025, 0.1, 1.4, 0.8, 0.7), ell(0.015, 0xff8fab, 0, -0.005, 0.13, 1.3, 0.8, 0.8),
      ...[-1, 1].flatMap(s => [cone(0.05, 0.1, C, 0.08 * s, 0.14, -0.01, 4, 0, Math.PI / 4, -0.3 * s), cone(0.028, 0.06, 0xffb3c8, 0.078 * s, 0.135, 0.012, 4, 0, Math.PI / 4, -0.3 * s)]), ...eyes(0.035, 0.11, 0.055), ...blush(-0.03, 0.1, 0.085)],
    neck: [0, 0.29, 0.12], tail: [ell(0.03, C, 0, 0.1, -0.03, 1, 3.4, 1, -0.5, 0, 0, 6), ball(0.033, L, 0, 0.2, -0.085, 1, 1, 1, 5)], tailAt: [0, 0.19, -0.2],
    a: legs(C, 0.035, 0.11, [[0.065, 0.09], [-0.065, -0.14]]), b: legs(C, 0.035, 0.11, [[-0.065, 0.09], [0.065, -0.14]]),
  };
}

export function makePet(kind, color) {
  const k = ids('pet').includes(kind) && kind !== 'none' ? kind : 'cat', C = ids('petColor').includes(color) ? color : '#e8a35c';
  const P = petParts(k, C), g = (n, fn) => bgeo([`pet_${k}_${n}`], { fur: C }, 'pet' + k + C + n, fn);
  const root = new THREE.Group(), box_ = grp(root), body = grp(box_);
  mesh(g('body', () => P.body), body);
  const head = grp(body, ...P.neck), tail = grp(body, ...P.tailAt);
  mesh(g('head', () => P.head), head);
  mesh(g('tail', () => P.tail), tail);
  const A = mesh(g('a', () => P.a), box_), B = mesh(g('b', () => P.b), box_);
  let ph = 0, T = Math.random() * 9;
  root.userData.update = (dt, st = {}) => {
    T += dt;
    const s = cl(st.speed || 0), moving = s > 0.01;
    if (moving) ph += dt * (P.hop ? 9 : 16);
    if (P.hop) {
      box_.position.y = moving ? Math.abs(Math.sin(ph)) * 0.13 * Math.min(1, s * 2) : 0;
      body.rotation.x = moving ? -Math.cos(ph) * 0.15 * Math.sign(Math.sin(ph)) : 0;
    } else {
      const q = Math.sin(ph) * s;
      A.position.set(0, Math.max(0, Math.cos(ph)) * 0.035 * s, q * 0.045);
      B.position.set(0, Math.max(0, -Math.cos(ph)) * 0.035 * s, -q * 0.045);
      body.position.y = Math.abs(Math.sin(ph)) * 0.02 * s;
    }
    tail.rotation.y = Math.sin(T * (moving ? 14 : 5)) * 0.5;
    head.rotation.z = Math.sin(T * 0.9) * 0.12 * (1 - s);
    head.rotation.x = k === 'chick' && !moving ? Math.pow(Math.max(0, Math.sin(T * 1.3)), 12) * 0.7 : 0;
  };
  return root;
}

// Für den Blender-Export (tools/dump-shapes.mjs): die Bauteil-Listen der Figur
export const __parts = { headParts, hairParts, hatParts, glassesParts, eyeParts, torsoParts, armParts, legParts, HELD, petParts };
