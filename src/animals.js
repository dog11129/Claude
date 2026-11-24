// Nutztiere: rund und knuffig, mit Gelenken für Laufen, Grasen/Picken, Freude und Hunger (schauen nach +z, Füße bei y=0).
// Pro Tier 8 Meshes (Rumpf, Kopf, Augen, 2 Ohren bzw. Flügel, Schwanz, 2 Beinpaare); Geometrien je Art einmal gebaut und geteilt.
import * as THREE from '../vendor/three.module.min.js';
import { MAT, merge, cyl } from './models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
const part = (g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
};
const ell = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, seg = 14) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3));
  g.scale(sx, sy, sz);
  return part(g, c, x, y, z, rx, ry, rz);
};
const ring = (r, t, c, x, y, z, arc = Math.PI * 2, rx = 0, ry = 0, rz = 0, seg = 14, tube = 6) => part(new THREE.TorusGeometry(r, t, tube, seg, arc), c, x, y, z, rx, ry, rz);
// Ellipsoid (oder Kegel) der bei base ansetzt und nach dir zeigt; flat plättet ihn (Ohren), roll dreht ihn um die eigene Achse
const pod = (r, l, c, base, dir, flat = 1, cone = false, roll = 0) => {
  const g = cone ? new THREE.ConeGeometry(r, l, 12) : new THREE.SphereGeometry(r, 12, 9);
  if (!cone) g.scale(1, l / (2 * r), 1);
  g.scale(1, 1, flat);
  g.translate(0, l / 2, 0);
  if (roll) g.rotateY(roll);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V(...dir).normalize()));
  g.translate(...base);
  return { g, c };
};
// Fleck, der sich an die Oberfläche eines Ellipsoids (Mitte C, Radien R) schmiegt und nur wenig herausschaut
const spot = (a, c, C, R, d, sx = 1, sz = 1, h = 0.012) => {
  const n = V(...d).normalize(), nrm = V(n.x / R[0], n.y / R[1], n.z / R[2]).normalize(), b = a * 0.62;
  const g = new THREE.SphereGeometry(a, 14, 9);
  g.scale(sx, b / a, sz);
  g.translate(0, h - b, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, nrm));
  g.translate(C[0] + n.x * R[0], C[1] + n.y * R[1], C[2] + n.z * R[2]);
  return { g, c };
};
// gleichmäßig verteilte Richtungen auf der Kugel (Wollbüschel)
const fib = n => Array.from({ length: n }, (_, i) => { const y = 1 - (2 * i + 1) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; });

const DARK = 0x2b2321, BLUSH = 0xff9aa8, MOUTH = 0x7a3b3b;
// Kulleraugen mit zwei Glanzpunkten / geschlossene Freude-Augen (^ ^) mit kräftigen Bäckchen
const eyes = (w, y, z, r) => [-1, 1].flatMap(s => [ell(r, DARK, w * s, y, z, 0.9, 1.18, 0.45, 0, 0.32 * s),
  ell(r * 0.36, 0xffffff, w * s + r * 0.3, y + r * 0.42, z + r * 0.36, 1, 1, 0.5, 0, 0.32 * s, 0, 8),
  ell(r * 0.16, 0xffffff, w * s - r * 0.28, y - r * 0.45, z + r * 0.34, 1, 1, 0.5, 0, 0.32 * s, 0, 6)]);
const joy = (w, y, z, r, bw, by, bz) => [-1, 1].flatMap(s => [ring(r * 0.78, r * 0.24, DARK, w * s, y - r * 0.25, z + r * 0.15, Math.PI, 0, 0.32 * s, 0, 10),
  ell(r * 1.3, 0xff7f9e, bw * s, by, bz + 0.006, 1.25, 0.7, 0.35, 0, 0.55 * s, 0, 10)]);
const blush = (bw, by, bz, r) => [-1, 1].map(s => ell(r, BLUSH, bw * s, by, bz, 1.25, 0.65, 0.35, 0, 0.55 * s, 0, 10));
const wMouth = (y, z, r) => [-1, 1].map(s => ring(r, r * 0.33, MOUTH, r * s, y, z, Math.PI, 0, 0, Math.PI, 10));

// Alle Teile in Tier-Koordinaten; Gelenke: hip (Beine + Rumpf), neck (Kopf), eye, earAt (linkes Ohr/Flügel), tailAt.
// gait: f Schrittfrequenz, leg Beinschwung, lift Fuß heben, bob/roll Wippen/Watscheln, pump Kopfnicken (Huhn), hop Freudenhüpfer,
// snap Kopf-Reaktion, eat Leerlauf-Fressen (peck/graze/sniff), eatX/eatTilt Kopf/Körper beim Fressen, sadX Kopf hängen lassen,
// flick/hapEar/hapFlap/sadEar Ohren (positiv = hängen bzw. Flügel abspreizen), tf/ta Schwanzwedeln, tailSad Schwanz bei Hunger.
const SHAPES = {
  huhn() {
    const W = 0xfffaf2, W2 = 0xf4e6d4, W3 = 0xe9d3b8, RED = 0xff5a5a, BEAK = 0xffb238, LEG = 0xffa53a;
    const foot = s => [cyl(0.016, 0.014, 0.1, LEG, 0.06 * s, 0.05, 0, 8),
      ...[-0.55, 0, 0.55].map(a => ell(0.018, LEG, 0.06 * s + Math.sin(a) * 0.022, 0.008, 0.006 + Math.cos(a) * 0.022, 0.6, 0.35, 1.6, 0, a, 0, 8)),
      ell(0.013, LEG, 0.06 * s, 0.008, -0.02, 0.6, 0.35, 1.3, 0, 0, 0, 8)];
    return {
      hip: 0.1, neck: [0, 0.33, 0.06], eye: [0, 0.425, 0.19], earAt: [0.15, 0.3, 0.0], earOn: 'torso', ek: [0, 1], tailAt: [0, 0.3, -0.16],
      gait: { f: 15, leg: 0.9, lift: 0.025, bob: 0.025, roll: 0.13, pump: 0.035, hop: 0.12, snap: 22, eat: 'peck', eatX: 0.45, eatTilt: 0.22, sadX: 0.35,
        flick: 0.25, hapEar: 0.55, hapFlap: 0.45, sadEar: 0.14, tf: 2.3, ta: 0.1, tailSad: -0.35 },
      legA: foot(1), legB: foot(-1),
      body: [ell(0.165, W, 0, 0.24, -0.02, 1, 0.9, 1.12, 0, 0, 0, 18), ell(0.11, W, 0, 0.25, 0.08, 1.05, 1, 0.85), ell(0.11, W, 0, 0.29, -0.13)],
      head: [ell(0.085, W, 0, 0.35, 0.07), ell(0.115, W, 0, 0.41, 0.09, 1.05, 1, 1, 0, 0, 0, 18),
        part(new THREE.ConeGeometry(0.028, 0.06, 10).scale(1, 1, 0.75), BEAK, 0, 0.395, 0.225, Math.PI / 2), ell(0.02, RED, 0, 0.355, 0.195, 0.8, 1.3, 0.7, 0, 0, 0, 10),
        ell(0.032, RED, 0, 0.53, 0.125, 0.55, 1, 0.9, 0, 0, 0, 10), ell(0.038, RED, 0, 0.545, 0.08, 0.55, 1, 0.9, 0, 0, 0, 10), ell(0.03, RED, 0, 0.53, 0.035, 0.55, 1, 0.9, 0, 0, 0, 10),
        ...blush(0.075, 0.385, 0.17, 0.022)],
      eyes: eyes(0.05, 0.425, 0.19, 0.024), joy: joy(0.05, 0.425, 0.19, 0.024, 0.075, 0.385, 0.17),
      ear: s => [ell(0.085, W2, 0.158 * s, 0.235, -0.03, 0.38, 0.8, 1.3, 0.2, 0, 0.12 * s), ell(0.05, W3, 0.166 * s, 0.205, -0.11, 0.35, 0.7, 1.2, 0.5, 0, 0.12 * s, 10)],
      tail: [ell(0.055, W, 0, 0.37, -0.2, 0.45, 1.45, 0.8, -0.55), ...[-1, 1].map(s => ell(0.048, W, 0.035 * s, 0.355, -0.19, 0.45, 1.35, 0.8, -0.55, 0, 0.35 * s)),
        ell(0.03, W3, 0, 0.43, -0.235, 0.5, 1, 0.8, -0.55, 0, 0, 10)],
    };
  },

  schaf() {
    const WO = 0xfbf7ee, WO2 = 0xefe7da, FACE = 0xf2d6bf, FACEL = 0xfae8da, EARIN = 0xffb7c2, LEG = 0x6a5752, HOOF = 0x4c3e3a, NOSE = 0xa06a6a;
    const C = [0, 0.43, -0.03], R = [0.25, 0.21, 0.3];
    const leg = (x, z) => [cyl(0.042, 0.038, 0.22, LEG, x, 0.11, z, 10), ell(0.046, HOOF, x, 0.022, z + 0.006, 1, 0.5, 1.1, 0, 0, 0, 10)];
    return {
      hip: 0.22, neck: [0, 0.47, 0.2], eye: [0, 0.545, 0.452], earAt: [0.11, 0.56, 0.31], ek: [0.1, -1], tailAt: [0, 0.47, -0.31],
      gait: { f: 11, leg: 0.55, lift: 0.025, bob: 0.025, roll: 0.03, pump: 0, hop: 0.12, snap: 8, eat: 'graze', eatX: 1.05, eatTilt: 0.07, sadX: 0.4,
        flick: -0.5, hapEar: -0.3, hapFlap: 0.1, sadEar: 0.6, tf: 1.7, ta: 0.15, tailSad: 0 },
      legA: [...leg(0.1, 0.13), ...leg(-0.1, -0.16)], legB: [...leg(-0.1, 0.13), ...leg(0.1, -0.16)],
      body: [ell(1, WO, ...C, ...R, 0, 0, 0, 16),
        ...fib(26).filter(d => d[1] > -0.45).map((d, i) => ell(0.1, i % 3 ? WO : WO2, C[0] + d[0] * R[0] * 0.93, C[1] + d[1] * R[1] * 0.93, C[2] + d[2] * R[2] * 0.93, 1, 1, 1, 0, 0, 0, 10))],
      head: [ell(0.1, WO, 0, 0.47, 0.22), ell(0.15, FACE, 0, 0.53, 0.33, 0.92, 1, 0.95, 0, 0, 0, 16),
        ell(0.075, FACEL, 0, 0.465, 0.425, 1.25, 0.75, 0.8), ell(0.017, NOSE, 0, 0.49, 0.483, 1.5, 0.9, 0.6, 0, 0, 0, 8), ...wMouth(0.452, 0.479, 0.016),
        ...blush(0.09, 0.495, 0.42, 0.026),
        ell(0.08, WO, 0, 0.655, 0.3), ell(0.065, WO, 0.065, 0.64, 0.31), ell(0.065, WO, -0.065, 0.64, 0.31), ell(0.07, WO2, 0, 0.65, 0.23), ell(0.05, WO, 0, 0.625, 0.37)],
      eyes: eyes(0.06, 0.545, 0.452, 0.03), joy: joy(0.06, 0.545, 0.452, 0.03, 0.09, 0.495, 0.42),
      ear: s => [pod(0.05, 0.15, FACE, [0.11 * s, 0.56, 0.31], [s, -0.35, 0.15], 0.45), pod(0.032, 0.1, EARIN, [0.125 * s, 0.56, 0.322], [s, -0.35, 0.15], 0.35)],
      tail: [ell(0.07, WO, 0, 0.43, -0.34, 0.9, 1.15, 0.85, 0.3)],
    };
  },

  schwein() {
    const P = 0xffbdcb, PD = 0xff9fb3, PDD = 0xd9708a, HOOF = 0xb87c80;
    const leg = (x, z) => [cyl(0.056, 0.05, 0.16, P, x, 0.08, z, 12), ell(0.054, HOOF, x, 0.02, z + 0.006, 1, 0.45, 1.05, 0, 0, 0, 10)];
    const snout = new THREE.CylinderGeometry(0.078, 0.086, 0.08, 18).scale(1, 1, 0.74);
    return {
      hip: 0.16, neck: [0, 0.4, 0.2], eye: [0, 0.51, 0.462], earAt: [0.1, 0.6, 0.27], ek: [0.8, -0.5], tailAt: [0, 0.44, -0.33],
      gait: { f: 13, leg: 0.6, lift: 0.02, bob: 0.025, roll: 0.06, pump: 0, hop: 0.12, snap: 10, eat: 'sniff', eatX: 0.45, eatTilt: 0.05, sadX: 0.35,
        flick: -0.45, hapEar: -0.3, hapFlap: 0.12, sadEar: 0.5, tf: 3, ta: 0.35, tailSad: 0 },
      legA: [...leg(0.12, 0.16), ...leg(-0.12, -0.18)], legB: [...leg(-0.12, 0.16), ...leg(0.12, -0.18)],
      body: [ell(1, P, 0, 0.36, -0.03, 0.27, 0.245, 0.33, 0, 0, 0, 18)],
      head: [ell(0.2, P, 0, 0.46, 0.3, 1.05, 0.95, 0.95, 0, 0, 0, 18), part(snout, PD, 0, 0.42, 0.485, Math.PI / 2),
        ...[-1, 1].map(s => ell(0.017, PDD, 0.03 * s, 0.42, 0.525, 0.75, 1.15, 0.35, 0, 0, 0, 8)),
        ring(0.022, 0.008, MOUTH, 0, 0.345, 0.452, Math.PI, 0.25, 0, Math.PI, 10), ...blush(0.14, 0.43, 0.43, 0.03)],
      eyes: eyes(0.085, 0.51, 0.462, 0.034), joy: joy(0.085, 0.51, 0.462, 0.034, 0.14, 0.43, 0.43),
      ear: s => [pod(0.075, 0.15, P, [0.1 * s, 0.6, 0.27], [0.55 * s, 0.5, 0.65], 0.3, true), pod(0.05, 0.11, PD, [0.1 * s, 0.607, 0.275], [0.55 * s, 0.5, 0.65], 0.25, true)],
      tail: [ell(0.03, PD, 0, 0.45, -0.35, 1, 1, 1.3, 0, 0, 0, 10), ring(0.036, 0.013, PD, 0, 0.48, -0.39, Math.PI * 1.7, -0.8, 0, 0, 16, 8)],
    };
  },

  kuh() {
    const W = 0xfffaf2, SP = 0x4d3f3b, MZ = 0xffc3cc, MZD = 0xc86f80, HORN = 0xfff0d2, HOOF = 0x5d4a44, BELL = 0xffd23f, COL = 0xe8574f;
    const C = [0, 0.62, -0.02], R = [0.33, 0.28, 0.44], H = [0, 0.88, 0.47], HR = [0.2376, 0.209, 0.209];
    const leg = (x, z) => [cyl(0.07, 0.062, 0.36, W, x, 0.18, z, 12), ell(0.07, HOOF, x, 0.035, z + 0.006, 1, 0.55, 1.05, 0, 0, 0, 12)];
    return {
      hip: 0.36, neck: [0, 0.7, 0.3], eye: [0, 0.94, 0.645], earAt: [0.19, 0.93, 0.43], ek: [0.1, -1], tailAt: [0, 0.83, -0.44],
      gait: { f: 8.5, leg: 0.45, lift: 0.03, bob: 0.025, roll: 0.035, pump: 0, hop: 0.1, snap: 7, eat: 'graze', eatX: 1.15, eatTilt: 0.06, sadX: 0.4,
        flick: -0.5, hapEar: -0.3, hapFlap: 0.1, sadEar: 0.6, tf: 1.3, ta: 0.25, tailSad: 0 },
      legA: [...leg(0.17, 0.25), ...leg(-0.17, -0.27)], legB: [...leg(-0.17, 0.25), ...leg(0.17, -0.27)],
      body: [ell(1, W, ...C, ...R, 0, 0, 0, 20), spot(0.17, SP, C, R, [0.6, 0.65, -0.4]), spot(0.13, SP, C, R, [-0.8, 0.35, 0.25], 1.2), spot(0.12, SP, C, R, [-0.3, 0.8, -0.6]),
        ell(0.08, MZ, 0, 0.36, -0.14, 1.2, 0.75, 1)],
      head: [ell(0.16, W, 0, 0.77, 0.34, 1, 1.05, 1.1), ell(1, W, ...H, ...HR, 0, 0, 0, 18), spot(0.09, SP, H, HR, [-0.75, 0.55, 0.1]),
        ell(0.125, MZ, 0, 0.8, 0.62, 1.32, 0.85, 0.85), ...[-1, 1].map(s => ell(0.022, MZD, 0.055 * s, 0.8, 0.7, 1, 1.3, 0.5, 0, 0, 0, 8)), ...wMouth(0.745, 0.698, 0.022),
        ...blush(0.16, 0.83, 0.605, 0.035),
        ...[-1, 1].map(s => pod(0.032, 0.11, HORN, [0.1 * s, 1.03, 0.43], [0.55 * s, 1, -0.1], 1, true)),
        ell(0.045, SP, 0, 1.075, 0.49, 1, 0.8, 1, 0, 0, 0, 10), ell(0.04, SP, 0.04, 1.065, 0.45, 1, 0.8, 1, 0, 0, 0, 10), ell(0.04, SP, -0.04, 1.065, 0.45, 1, 0.8, 1, 0, 0, 0, 10),
        ring(0.15, 0.025, COL, 0, 0.75, 0.37, Math.PI * 2, -0.82, 0, 0, 18, 8), ell(0.05, BELL, 0, 0.6, 0.5, 1, 1.1, 1), ell(0.016, 0x8a6a2a, 0, 0.555, 0.51, 1, 1, 1, 0, 0, 0, 8)],
      eyes: eyes(0.1, 0.94, 0.645, 0.04), joy: joy(0.1, 0.94, 0.645, 0.04, 0.16, 0.83, 0.605),
      ear: s => [pod(0.06, 0.16, W, [0.19 * s, 0.93, 0.43], [s, -0.2, 0.15], 0.45), pod(0.04, 0.11, MZ, [0.2 * s, 0.93, 0.443], [s, -0.2, 0.15], 0.35)],
      tail: [pod(0.02, 0.36, W, [0, 0.83, -0.44], [0, -1, -0.18]), ell(0.042, SP, 0, 0.47, -0.505, 0.9, 1.4, 0.9, 0, 0, 0, 10)],
    };
  },
};

// ---------- Rig ----------
const KIT = {};
const at = (parts, p) => merge(parts).translate(-p[0], -p[1], -p[2]); // Geometrie relativ zum Gelenk
function kit(kind) {
  if (KIT[kind]) return KIT[kind];
  const D = SHAPES[kind](), T = [0, D.hip, 0], eR = [-D.earAt[0], D.earAt[1], D.earAt[2]];
  return (KIT[kind] = { ...D, T, eR, body: at(D.body, T), head: at(D.head, D.neck), eyes: at(D.eyes, D.eye), joy: at(D.joy, D.eye),
    earL: at(D.ear(1), D.earAt), earR: at(D.ear(-1), eR), tail: at(D.tail, D.tailAt), legA: at(D.legA, T), legB: at(D.legB, T) });
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function mesh(g, parent, shadow = true) {
  const m = new THREE.Mesh(g, MAT);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function grp(parent, p = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...p);
  parent.add(g);
  return g;
}
const cl = x => Math.min(1, Math.max(0, x));
const pulse = (a, n = 40) => Math.pow(Math.max(0, Math.sin(a)), n);
// Beinpaar als Scherung um die Hüfte: der Fuß schwingt vor/zurück, die Hüfte bleibt sitzen
const shear = (m, k, lift) => { m.matrix.set(1, 0, 0, 0, 0, 1, 0, lift, 0, k, 1, 0, 0, 0, 0, 1); m.matrixWorldNeedsUpdate = true; };

export function makeAnimal(kind) {
  const K = kit(SHAPES[kind] ? kind : 'huhn'), G = K.gait;
  const root = new THREE.Group(), rig = grp(root), torso = grp(rig, K.T);
  mesh(K.body, torso);
  const neck = grp(torso, sub(K.neck, K.T)), n0 = neck.position.z;
  mesh(K.head, neck);
  const eyeG = grp(neck, sub(K.eye, K.neck)), eyes = mesh(K.eyes, eyeG, false);
  const earP = K.earOn === 'torso' ? torso : neck, earB = K.earOn === 'torso' ? K.T : K.neck;
  const earL = grp(earP, sub(K.earAt, earB)), earR = grp(earP, sub(K.eR, earB));
  mesh(K.earL, earL); mesh(K.earR, earR);
  const tail = grp(torso, sub(K.tailAt, K.T));
  mesh(K.tail, tail);
  const legs = grp(rig, K.T), A = mesh(K.legA, legs), B = mesh(K.legB, legs);
  A.matrixAutoUpdate = B.matrixAutoUpdate = false;

  let T = Math.random() * 20, ph = 0, sp = 0, hap = 0, sad = 0, eat = 0, look = 0, lookT = 0, act = '', actEnd = 0, nextAct = 1 + Math.random() * 4;
  let blinkAt = 1 + Math.random() * 3;
  const seed = Math.random() * 6;
  root.userData.update = (dt = 0, st = {}) => {
    T += dt;
    const happy = !!st.happy, hungry = !happy && !!st.hungry, w = 1 - Math.exp(-dt * 6);
    sp += (cl(st.speed || 0) - sp) * (1 - Math.exp(-dt * 8));
    const moving = sp > 0.05;
    if (sp > 0.01) ph += dt * G.f * (0.6 + 0.4 * sp);
    // Leerlauf: ab und zu fressen (picken/grasen/schnüffeln) oder sich umschauen
    if (moving || happy || hungry) act = '';
    else if (T > nextAct) {
      act = Math.random() < 0.6 ? 'eat' : 'look';
      actEnd = T + (act === 'eat' ? 2.5 + Math.random() * 3 : 1.2 + Math.random() * 2);
      nextAct = actEnd + 1 + Math.random() * 3;
      lookT = (Math.random() - 0.5) * 1.3;
    }
    if (act && T > actEnd) act = '';
    hap += ((happy ? 1 : 0) - hap) * w;
    sad += ((hungry ? 1 : 0) - sad) * w;
    eat += ((act === 'eat' ? 1 : 0) - eat) * w * 0.7;
    look += ((act === 'look' ? lookT : 0) - look) * (1 - Math.exp(-dt * G.snap * 0.6));

    const sw = Math.sin(ph), cw = Math.cos(ph), br = Math.sin(T * (hungry ? 1.4 : 2.2));
    rig.position.y = Math.abs(cw) * G.bob * sp + Math.abs(Math.sin(T * 7.5)) * G.hop * hap - 0.012 * sad;
    rig.rotation.set(G.eatTilt * eat + 0.04 * sad, 0, sw * G.roll * sp + Math.sin(T * 3) * 0.04 * hap);
    torso.scale.set(1 + br * 0.008, 1 + br * 0.018, 1);
    shear(A, sw * G.leg * sp, Math.max(0, -cw) * G.lift * sp);
    shear(B, -sw * G.leg * sp, Math.max(0, cw) * G.lift * sp);

    let hx = br * 0.02 + G.sadX * sad - 0.15 * hap + Math.sin(ph * 2) * 0.04 * sp;
    if (G.eat === 'peck') hx += eat * (G.eatX + 0.8 * pulse(T * 10, 4));
    else if (G.eat === 'graze') hx += eat * (G.eatX + Math.sin(T * 7) * 0.04);
    else hx += eat * (G.eatX + Math.sin(T * 15) * 0.06);
    neck.rotation.set(hx, look + (G.eat === 'sniff' ? Math.sin(T * 1.3) * 0.3 * eat : 0), look * 0.25 + Math.sin(T * 3) * 0.12 * hap);
    neck.position.z = n0 + Math.sin(ph * 2) * G.pump * sp;

    const ear = (fl) => G.flick * fl + G.sadEar * sad + G.hapEar * hap + Math.sin(T * 22) * G.hapFlap * hap + G.eatX * 0.12 * eat * (G.eat === 'graze') + Math.sin(ph * 2) * 0.08 * sp;
    const eL = ear(pulse(T * 1.1 + seed)), eR = ear(pulse(T * 0.83 + seed * 2));
    earL.rotation.set(eL * K.ek[0], 0, eL * K.ek[1]);
    earR.rotation.set(eR * K.ek[0], 0, -eR * K.ek[1]);
    tail.rotation.set(G.tailSad * sad, 0, (Math.sin(T * G.tf) * G.ta + pulse(T * 0.7 + seed, 20) * Math.sin(T * 9) * G.ta) * (1 - sad) + Math.sin(T * 16) * 0.5 * hap + sw * 0.15 * sp);

    if (T > blinkAt + 0.13) blinkAt = T + 2 + Math.random() * 3.5;
    const joyOn = hap > 0.5;
    eyes.geometry = joyOn ? K.joy : K.eyes;
    eyeG.scale.y = joyOn ? 1 : T > blinkAt ? 0.1 : 1 - 0.45 * sad;
  };
  root.userData.update(0, {});
  root.userData.headTop = new THREE.Box3().setFromObject(root).max.y;
  return root;
}
