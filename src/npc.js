// Dorfbewohner: vier Tier-Nachbarn mit eigenem Modell, Animation, Vorlieben und Sprüchen.
// Aufbau wie avatar.js: Gelenk-Gruppen, jedes Teil EIN Mesh mit Vertex-Farben (merge + MAT) -> höchstens 10 Draw-Calls.
import * as THREE from '../vendor/three.module.min.js';
import { MAT, merge, box, cyl } from './models.js';

export const NPCS = {
  mira: {
    name: 'Mira', species: 'Igel', icon: '🦔', role: 'Bäckerin', color: '#f08fa6',
    likes: ['apfel', 'kirsche', 'tulpe', 'weizen'], loves: ['kirschtorte', 'apfelkuchen'], dislikes: ['kugelfisch', 'krebs'],
    bio: 'Mira backt jeden Morgen die duftendsten Zimtschnecken im Dorf und hat für jeden ein warmes Wort und einen Keks übrig.',
  },
  bruno: {
    name: 'Bruno', species: 'Bär', icon: '🐻', role: 'Schreiner', color: '#a0693f',
    likes: ['holz', 'apfel', 'brot', 'forelle'], loves: ['lachs', 'eintopf'], dislikes: ['stein', 'unkraut'],
    bio: 'Bruno ist der gemütlichste Schreiner weit und breit: Er redet langsam, hilft gern und baut dir alles – außer Hektik.',
  },
  pippa: {
    name: 'Pippa', species: 'Ente', icon: '🦆', role: 'Fischerin', color: '#f2b82e',
    likes: ['barsch', 'makrele', 'herzmuschel', 'weizen'], loves: ['kugelfisch', 'fischsuppe'], dislikes: ['ei', 'unkraut'],
    bio: 'Pippa steht bei jedem Wetter mit der Angel am Steg und hätte schon mindestens dreimal fast einen Hai gefangen.',
  },
  lio: {
    name: 'Lio', species: 'Fuchs', icon: '🦊', role: 'Künstler & Florist', color: '#ef7d3a',
    likes: ['rose', 'koralle', 'pfirsich', 'saft'], loves: ['sonnenblume', 'bernstein'], dislikes: ['kartoffel', 'stein'],
    bio: 'Lio malt, bindet Blumensträuße und findet, dass das Leben ein Kunstwerk ist – am liebsten eins mit ihm in der Mitte.',
  },
};

// ---------- Bauteile ----------
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
const cn = (r, h, c, x, y, z, sz = 1, rx = 0, ry = 0, rz = 0, seg = 10) => { const g = new THREE.ConeGeometry(r, h, seg); g.scale(1, 1, sz); return part(g, c, x, y, z, rx, ry, rz); };
const ring = (r, t, c, x, y, z, arc = Math.PI * 2, rx = 0, ry = 0, rz = 0, seg = 14) => part(new THREE.TorusGeometry(r, t, 6, seg, arc), c, x, y, z, rx, ry, rz);
// ovaler Gürtel/Streifen um den Körper
const band = (rx, rz, h, c, y, z = 0, tilt = 0) => { const g = new THREE.CylinderGeometry(1, 1, h, 20, 1, true); g.scale(rx, 1, rz); return part(g, c, 0, y, z, tilt); };
const tf = (parts, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  for (const p of parts) p.g.applyMatrix4(m);
  return parts;
};
const UP = new THREE.Vector3(0, 1, 0);
// Kegel, der bei (x,y,z) aufsitzt und in Richtung d zeigt (Igelstacheln)
const spike = (r, h, c, [x, y, z], d) => {
  const g = new THREE.ConeGeometry(r, h, 7);
  g.translate(0, h / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...d).normalize()));
  g.translate(x, y, z);
  return { g, c };
};
// gleichmäßig verteilte Richtungen auf der Kugel
const fib = n => Array.from({ length: n }, (_, i) => { const y = 1 - (2 * i + 1) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
// Stachelfeld auf einem Ellipsoid (Mitte m, Radien rr), nach hinten gekämmt
const spikes = (m, rr, n, keep, cols, r, h, sweep) => fib(n).filter(keep).map((d, i) =>
  spike(r, h, cols[i % cols.length], [m[0] + d[0] * rr[0] * 0.9, m[1] + d[1] * rr[1] * 0.9, m[2] + d[2] * rr[2] * 0.9], [d[0] + sweep[0], d[1] + sweep[1], d[2] + sweep[2]]));

const WHITE = 0xfffaf2, DARK = 0x2b2321, BLUSH = 0xff9aa8, MOUTH = 0x7a3b3b;
// große Kulleraugen mit zwei Glanzpunkten (Kopf-Koordinaten)
function eyes(w, y, z, r, lashes = false) {
  const p = [];
  for (const s of [-1, 1]) {
    const x = w * s, ry = 0.32 * s;
    p.push(ell(r, DARK, x, y, z, 0.9, 1.18, 0.45, 0, ry), ell(r * 0.36, 0xffffff, x + r * 0.3, y + r * 0.42, z + r * 0.36, 1, 1, 0.5, 0, ry, 0, 8),
      ell(r * 0.16, 0xffffff, x - r * 0.28, y - r * 0.45, z + r * 0.34, 1, 1, 0.5, 0, ry, 0, 6));
    if (lashes) p.push(box(r * 0.75, r * 0.22, r * 0.2, DARK, x + r * 0.95 * s, y + r * 0.85, z - r * 0.15, ry, 0, 0.6 * s));
  }
  return p;
}
// geschlossene Freude-Augen (^ ^) + kräftige Bäckchen: für 'happy' und 'love'
const joy = (w, y, z, r, bw, by, bz) => [-1, 1].flatMap(s => [ring(r * 0.78, r * 0.24, DARK, w * s, y - r * 0.25, z + r * 0.15, Math.PI, 0, 0.32 * s, 0, 10),
  ell(r * 1.3, 0xff7f9e, bw * s, by, bz + 0.01, 1.25, 0.7, 0.35, 0, 0.55 * s, 0, 10)]);
const blush = (bw, by, bz, r = 0.05) => [-1, 1].map(s => ell(r, BLUSH, bw * s, by, bz, 1.25, 0.65, 0.35, 0, 0.55 * s, 0, 10));
const smile = (y, z, r = 0.026) => ring(r, 0.009, MOUTH, 0, y, z, Math.PI, 0, 0, Math.PI, 10);
// Tiermäulchen "ω"
const wMouth = (y, z, r = 0.024) => [-1, 1].map(s => ring(r, 0.008, MOUTH, r * s, y, z, Math.PI, 0, 0, Math.PI, 10));
const flower = (c, x, y, z, r = 0.035) => [...[0, 1, 2, 3, 4].map(i => ell(r, c, x + Math.cos(i * 1.2566) * r * 1.15, y + Math.sin(i * 1.2566) * r * 1.15, z, 1, 1, 0.5, 0, 0, 0, 8)),
  ell(r * 0.7, 0xffd23f, x, y, z + r * 0.25, 1, 1, 0.6, 0, 0, 0, 8)];

const heart = (c, x, y, z, r) => [ell(r, c, x - r * 0.62, y + r * 0.35, z, 1, 1, 0.45, 0, 0, 0, 10), ell(r, c, x + r * 0.62, y + r * 0.35, z, 1, 1, 0.45, 0, 0, 0, 10),
  cn(r * 1.38, r * 1.6, c, x, y - r * 0.7, z, 0.33, 0, 0, Math.PI, 10)];

// ---------- Die vier Figuren (schauen nach +z, Füße bei y=0) ----------
// Jede Form: Gelenkpositionen + Teile je Mesh. Teile sind in ihrem Gelenk-Raum gebaut:
// leg/arm hängen ab Ursprung nach unten, body ab Hüfte, head/eyes/joy/ears um die Kopfmitte, tail ab tailAt.
const SHAPES = {
  mira() {
    const SP = 0x8d5f3d, SPD = 0x6c452c, SPL = 0xab7b52, CR = 0xf8e7cf, DR = 0xf3a0b5, SC = 0x86d1bd, SKIN = 0xd9a487;
    const backC = [0, 0.22, -0.05], backR = [0.25, 0.26, 0.22];
    const headC = [0, 0.05, -0.06], headR = [0.3, 0.28, 0.27];
    return {
      hip: 0.2, legX: 0.09, armAt: [0.2, 0.27], neck: 0.36, headY: 0.23, eyeY: 0.005, earsAt: [0, 0.14, 0.05],
      gait: { f: 18, leg: 0.75, arm: 0.5, bob: 0.03, roll: 0.05, lean: 0.08, twist: 0, flap: 0, tail: 0, tk: 1 },
      leg: [cyl(0.05, 0.05, 0.12, SKIN, 0, -0.08, 0, 10), ell(0.066, SKIN, 0, -0.165, 0.03, 1, 0.55, 1.35)],
      body: [cyl(0.2, 0.27, 0.22, DR, 0, 0.01, 0, 18), ell(0.21, DR, 0, 0.19, 0, 1, 0.95, 0.92),
        ell(0.245, SP, 0, 0.22, -0.06, 1.02, 1.02, 0.85),
        ...spikes(backC, backR, 70, d => d[2] < -0.2 && d[1] > -0.55, [SP, SPD, SPL], 0.058, 0.15, [0, 0.25, -0.45]),
        // Schürze: vorderes Rockstück, Latz, Bund und Herztasche
        part(new THREE.CylinderGeometry(0.212, 0.282, 0.21, 16, 1, true, -0.95, 1.9), WHITE, 0, 0.005, 0), ell(0.085, WHITE, 0, 0.225, 0.168, 1.05, 0.95, 0.25),
        band(0.215, 0.2, 0.035, WHITE, 0.12), ...heart(0xff8fab, 0.07, 0.02, 0.262, 0.03),
        ring(0.12, 0.045, SC, 0, 0.35, 0.005, Math.PI * 2, Math.PI / 2, 0, 0, 16), ell(0.045, SC, 0.0, 0.325, 0.13, 1.1, 1, 0.8),
        cn(0.045, 0.1, SC, -0.04, 0.27, 0.14, 0.5, 0, 0, 2.7), cn(0.045, 0.1, SC, 0.04, 0.27, 0.14, 0.5, 0, 0, -2.7)],
      arm: [ell(0.06, DR, 0, -0.035, 0, 1, 1.15, 1, 0, 0, 0, 12), ell(0.05, SKIN, 0, -0.12, 0, 1, 1.15, 1, 0, 0, 0, 12)],
      head: [ell(0.27, CR, 0, 0, 0.01, 1.05, 0.95, 1, 0, 0, 0, 16), ell(0.28, SP, ...headC, 1.07, 1.0, 0.98, 0, 0, 0, 16),
        ...spikes(headC, headR, 90, d => (d[2] < 0.2 && d[1] > -0.35) || (d[1] > 0.55 && d[2] < 0.75), [SP, SPL, SPD], 0.062, 0.16, [0, 0.2, -0.55]),
        ell(0.1, CR, 0, -0.075, 0.235, 1, 0.8, 1.1), ell(0.042, DARK, 0, -0.05, 0.345, 1.2, 0.9, 0.9), ell(0.012, 0xffffff, 0.014, -0.035, 0.38, 1, 1, 1, 0, 0, 0, 6),
        smile(-0.125, 0.29), ...blush(0.165, -0.075, 0.2, 0.052),
        // Bäckermützchen, schief zwischen den Stacheln
        ...tf([cyl(0.09, 0.085, 0.08, WHITE, 0, 0.04, 0, 16), ell(0.07, WHITE, -0.05, 0.12, 0.01), ell(0.07, WHITE, 0.05, 0.12, 0.01), ell(0.075, WHITE, 0, 0.14, -0.02),
          ell(0.065, WHITE, 0, 0.12, 0.05), band(0.092, 0.092, 0.025, 0xff8fab, 0.035)], 0.07, 0.24, 0.0, -0.25, 0, -0.35)],
      eyes: eyes(0.105, 0, 0.255, 0.052), joy: joy(0.105, 0, 0.255, 0.052, 0.165, -0.075, 0.2),
      ears: [-1, 1].flatMap(s => [ell(0.065, SPL, 0.205 * s, 0.15, 0.05, 1, 1, 0.55, 0, 0.7 * s), ell(0.04, 0xf4b0b0, 0.215 * s, 0.148, 0.07, 1, 1, 0.4, 0, 0.7 * s)]),
      tail: null,
    };
  },

  bruno() {
    const FUR = 0x9b6b43, FURD = 0x7a5233, MUZ = 0xebd3ae, OV = 0x5f9467, OVD = 0x4c7a54, SH = 0xd9604c, BELT = 0x6e4a2a, GOLD = 0xffd23f;
    return {
      hip: 0.36, legX: 0.15, armAt: [0.33, 0.45], neck: 0.6, headY: 0.26, eyeY: 0.045, earsAt: [0, 0.22, -0.02],
      gait: { f: 6.5, leg: 0.55, arm: 0.35, bob: 0.025, roll: 0.08, lean: 0.03, twist: 0.12, flap: 0, tail: 0.3, tk: 0.6 },
      leg: [cyl(0.11, 0.1, 0.24, OV, 0, -0.1, 0, 12), ell(0.115, FURD, 0, -0.3, 0.045, 1, 0.55, 1.3)],
      body: [ell(0.3, SH, 0, 0.32, 0, 1.08, 1.0, 0.92, 0, 0, 0, 16), ell(0.315, OV, 0, 0.18, 0, 1.08, 0.72, 0.95, 0, 0, 0, 16),
        ell(0.17, OV, 0, 0.36, 0.2, 1.05, 0.95, 0.5), ell(0.06, OVD, 0, 0.37, 0.28, 1.2, 0.85, 0.3),
        ...[-1, 1].flatMap(s => [ring(0.265, 0.024, OV, 0.13 * s, 0.34, -0.005, Math.PI, 0, Math.PI / 2, 0, 16), ell(0.024, GOLD, 0.12 * s, 0.44, 0.27, 1, 1, 0.6)]),
        band(0.33, 0.29, 0.06, BELT, 0.1), box(0.06, 0.05, 0.02, GOLD, 0, 0.1, 0.295),
        cyl(0.018, 0.018, 0.2, 0xc98d55, 0.31, 0.02, 0.1, 8), box(0.05, 0.05, 0.13, 0x8a929c, 0.31, 0.12, 0.1), // Hammer
        box(0.1, 0.1, 0.07, 0x8a5a36, -0.29, 0.05, 0.13, -0.5), box(0.11, 0.025, 0.08, BELT, -0.29, 0.1, 0.13, -0.5), // Werkzeugtasche
        ell(0.1, FUR, 0, 0.6, 0, 1.4, 0.5, 1.2)],
      arm: [ell(0.1, SH, 0, -0.06, 0, 1, 1.15, 1, 0, 0, 0, 12), ring(0.08, 0.022, MUZ, 0, -0.15, 0, Math.PI * 2, Math.PI / 2), ell(0.088, FUR, 0, -0.24, 0, 1, 1.1, 1, 0, 0, 0, 12)],
      head: [ell(0.32, FUR, 0, 0, 0, 1.08, 0.94, 1, 0, 0, 0, 16), ell(0.13, MUZ, 0, -0.1, 0.25, 1.3, 0.85, 0.9),
        ell(0.052, DARK, 0, -0.045, 0.355, 1.35, 0.85, 0.8), ell(0.014, 0xffffff, 0.02, -0.03, 0.39, 1.3, 0.8, 0.8, 0, 0, 0, 6), ...wMouth(-0.12, 0.345, 0.026),
        ...blush(0.2, -0.07, 0.24, 0.055), ell(0.03, FURD, -0.13, 0.13, 0.27, 1.5, 0.5, 0.4, 0, -0.3, 0.1), ell(0.03, FURD, 0.13, 0.13, 0.27, 1.5, 0.5, 0.4, 0, 0.3, -0.1),
        // Bleistift hinterm rechten Ohr
        ...tf([cyl(0.02, 0.02, 0.24, 0xffcf3f, 0, 0, 0, 6), cn(0.02, 0.05, 0xf0d2a8, 0, 0.145, 0, 1, 0, 0, 0, 6), cn(0.008, 0.02, DARK, 0, 0.165, 0, 1, 0, 0, 0, 6),
          cyl(0.021, 0.021, 0.035, 0xff8fab, 0, -0.135, 0, 6)], -0.27, 0.2, 0.02, 1.35, 0, -0.3)],
      eyes: eyes(0.13, 0.045, 0.285, 0.048), joy: joy(0.13, 0.045, 0.285, 0.048, 0.2, -0.07, 0.24),
      ears: [-1, 1].flatMap(s => [ell(0.1, FUR, 0.23 * s, 0.25, -0.03, 1, 1, 0.55, 0, 0.35 * s, -0.4 * s), ell(0.058, MUZ, 0.23 * s, 0.245, 0.0, 1, 1, 0.4, 0, 0.35 * s, -0.4 * s)]),
      tail: [ell(0.075, FUR, 0, 0, -0.03, 1, 1, 1, 0, 0, 0, 10)], tailAt: [0, 0.12, -0.27],
    };
  },

  pippa() {
    const W = 0xfffcf4, BILL = 0xffa53a, BILLD = 0xe8852a, CO = 0xffcf3a, COD = 0xe8b021, BTN = 0x3b6ea5;
    return {
      hip: 0.16, legX: 0.1, armAt: [0.24, 0.29], neck: 0.38, headY: 0.24, eyeY: 0.04, earsAt: [0, 0.18, -0.02],
      gait: { f: 10, leg: 0.4, arm: 0.12, bob: 0.015, roll: 0.2, lean: 0.12, twist: 0.12, flap: 0.5, tail: 0.6, tk: 1.4 },
      leg: [cyl(0.032, 0.032, 0.1, BILL, 0, -0.05, 0, 8), ell(0.065, BILL, 0, -0.142, 0.05, 1.15, 0.3, 1.5)],
      body: [ell(0.27, CO, 0, 0.17, 0, 1, 0.88, 0.98, 0, 0, 0, 16), cyl(0.245, 0.29, 0.12, CO, 0, 0.01, 0, 18), band(0.292, 0.292, 0.03, COD, -0.035),
        ell(0.14, CO, 0, 0.32, -0.16, 1.4, 0.55, 0.75), cyl(0.11, 0.13, 0.12, W, 0, 0.38, 0, 14), ring(0.12, 0.04, CO, 0, 0.35, 0, Math.PI * 2, Math.PI / 2, 0, 0, 16),
        box(0.016, 0.3, 0.01, COD, 0, 0.13, 0.262), ...[0.27, 0.17, 0.07].map(y => ell(0.026, BTN, 0.035, y, 0.258 - (y - 0.17) * 0.2, 1, 1, 0.6, 0, 0, 0, 8)),
        ...[-1, 1].map(s => box(0.1, 0.022, 0.03, COD, 0.15 * s, 0.07, 0.22, 0.6 * s))],
      arm: [ell(0.075, CO, 0, -0.06, 0, 0.9, 1.4, 0.95, 0, 0, 0, 12), ell(0.058, W, 0, -0.17, 0, 0.6, 1.25, 0.95, 0, 0, 0, 12)],
      head: [ell(0.25, W, 0, 0, 0, 1.04, 1, 1, 0, 0, 0, 16), ell(0.1, BILL, 0, -0.04, 0.24, 1.35, 0.42, 1.1), ell(0.085, BILLD, 0, -0.08, 0.225, 1.2, 0.32, 1),
        ell(0.011, BILLD, -0.032, -0.02, 0.33, 1, 1, 1, 0, 0, 0, 6), ell(0.011, BILLD, 0.032, -0.02, 0.33, 1, 1, 1, 0, 0, 0, 6), ...blush(0.165, -0.04, 0.17, 0.05)],
      eyes: eyes(0.11, 0.045, 0.222, 0.05), joy: joy(0.11, 0.045, 0.222, 0.05, 0.165, -0.04, 0.17),
      // Südwester (wackelt beim Watscheln), mit Schwimmer als Glücksbringer
      ears: tf([ell(0.25, CO, 0, 0.06, 0, 1.08, 0.78, 1.08, 0, 0, 0, 16), ell(0.4, CO, 0, 0, -0.05, 1, 0.07, 1.08, 0, 0, 0, 18), band(0.272, 0.272, 0.04, COD, 0.03),
        ell(0.04, 0xff5a5a, 0.3, -0.06, 0.1, 1, 1, 1, 0, 0, 0, 10), ell(0.041, 0xffffff, 0.3, -0.04, 0.1, 1, 0.55, 1, 0, 0, 0, 10), cyl(0.006, 0.006, 0.06, DARK, 0.3, 0.0, 0.1, 4)],
        0, 0.15, -0.02, -0.28, 0, 0.1),
      tail: [cn(0.07, 0.16, W, 0, 0.05, -0.04, 0.6, -1.05), cn(0.05, 0.12, W, 0, 0.1, -0.02, 0.6, -0.6)], tailAt: [0, 0.1, -0.22],
    };
  },

  lio() {
    const FOX = 0xef8a3c, FOXD = 0x5a3a2e, BER = 0x7d3c6b, SC = 0x3fb6a8, NAVY = 0x2f4a7a, PINK = 0xff6b8a;
    const rAt = y => 0.2 - (y / 0.32) * 0.035 + 0.004;
    return {
      hip: 0.3, legX: 0.09, armAt: [0.2, 0.3], neck: 0.38, headY: 0.25, eyeY: 0.035, earsAt: [0, 0.18, -0.02],
      gait: { f: 12, leg: 0.8, arm: 0.6, bob: 0.07, roll: 0.03, lean: 0.12, twist: 0, flap: 0, tail: 0.7, tk: 1.2 },
      leg: [cyl(0.055, 0.05, 0.22, FOXD, 0, -0.11, 0, 10), ell(0.07, FOXD, 0, -0.255, 0.04, 1, 0.6, 1.4)],
      body: [cyl(0.165, 0.2, 0.32, WHITE, 0, 0.16, 0, 18), ell(0.165, WHITE, 0, 0.32, 0, 1, 0.38, 0.95, 0, 0, 0, 16), cyl(0.205, 0.205, 0.07, NAVY, 0, 0.0, 0, 18),
        ...[0.1, 0.17, 0.24].map(y => cyl(rAt(y + 0.0125), rAt(y - 0.0125), 0.025, NAVY, 0, y, 0, 18)),
        ring(0.12, 0.05, SC, 0, 0.37, 0, Math.PI * 2, Math.PI / 2, 0, 0, 16), ell(0.05, SC, 0.08, 0.26, 0.15, 0.8, 1.9, 0.45, 0.25, 0, 0.25),
        ell(0.048, SC, -0.06, 0.3, -0.16, 0.8, 1.7, 0.45, -0.5, 0, -0.3), ...flower(PINK, -0.1, 0.33, 0.12, 0.03)],
      arm: [ell(0.06, WHITE, 0, -0.05, 0, 1, 1.4, 1, 0, 0, 0, 12), cyl(0.062, 0.062, 0.022, NAVY, 0, -0.1, 0, 12), ell(0.05, FOXD, 0, -0.17, 0, 1, 1.1, 1, 0, 0, 0, 12)],
      // rechte Pfote hält einen Pinsel
      armR: [ell(0.06, WHITE, 0, -0.05, 0, 1, 1.4, 1, 0, 0, 0, 12), cyl(0.062, 0.062, 0.022, NAVY, 0, -0.1, 0, 12), ell(0.05, FOXD, 0, -0.17, 0, 1, 1.1, 1, 0, 0, 0, 12),
        ...tf([cyl(0.012, 0.015, 0.26, 0xc98d55, 0, 0, 0, 6), cyl(0.016, 0.016, 0.03, 0xc4ccd4, 0, 0.14, 0, 6), cn(0.02, 0.06, 0x6cc4ff, 0, 0.18, 0, 1, Math.PI, 0, 0, 6)], 0, -0.18, 0.06, 1.2)],
      head: [ell(0.27, FOX, 0, 0, 0, 1.12, 0.94, 1, 0, 0, 0, 16), ...[-1, 1].map(s => ell(0.11, WHITE, 0.19 * s, -0.08, 0.1, 1.2, 0.72, 0.9, 0, 0.5 * s, 0.35 * s)),
        ell(0.1, WHITE, 0, -0.085, 0.215, 1.15, 0.72, 1.05), ell(0.034, DARK, 0, -0.055, 0.32, 1.2, 0.9, 0.9), ell(0.01, 0xffffff, 0.012, -0.043, 0.348, 1, 1, 1, 0, 0, 0, 6),
        ...wMouth(-0.12, 0.29, 0.022), ...blush(0.17, -0.05, 0.2, 0.048), ell(0.022, 0x6cc4ff, -0.2, 0.01, 0.17, 1.4, 0.8, 0.4, 0, -0.7),
        // Baskenmütze, keck zur Seite, mit Blume
        ...tf([ell(0.2, BER, 0, 0, 0, 1, 0.3, 1, 0, 0, 0, 16), cyl(0.015, 0.01, 0.05, BER, 0, 0.07, 0, 6), ...flower(PINK, 0.15, 0.03, 0.08, 0.035), ell(0.03, 0x76c955, 0.2, 0.0, 0.03, 1.5, 0.5, 0.6, 0, 0.6)],
          -0.03, 0.24, -0.03, -0.15, 0, 0.28)],
      eyes: eyes(0.115, 0.035, 0.243, 0.05, true), joy: joy(0.115, 0.035, 0.243, 0.05, 0.17, -0.05, 0.2),
      ears: [-1, 1].flatMap(s => tf([cn(0.095, 0.24, FOX, 0, 0.12, 0, 0.55, 0, 0, 0, 10), cn(0.058, 0.15, 0xfff0e0, 0, 0.08, 0.03, 0.4, 0, 0, 0, 8), cn(0.042, 0.075, FOXD, 0, 0.205, 0, 0.62, 0, 0, 0, 8)],
        0.16 * s, 0.17, -0.02, -0.12, 0, -0.32 * s)),
      tail: [ell(0.12, FOX, 0, 0.1, -0.13, 0.85, 0.85, 1.9, 0.7), ell(0.085, WHITE, 0, 0.245, -0.315, 1, 1, 1.1, 0.7)], tailAt: [0, 0.06, -0.16],
    };
  },
};

// ---------- Rig ----------
const KIT = {};
function kit(id) {
  if (KIT[id]) return KIT[id];
  const D = SHAPES[id](), k = { ...D };
  for (const n of ['leg', 'body', 'arm', 'armR', 'head', 'eyes', 'joy', 'ears', 'tail']) k[n] = D[n] && merge(D[n]);
  return (KIT[id] = k);
}
function mesh(g, parent, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(g, MAT);
  m.castShadow = shadow;
  m.receiveShadow = true;
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
const cl = x => Math.min(1, Math.max(0, x));
const REST = { y: 0, rz: 0, tx: 0, ty: 0, hx: 0, hz: 0, lL: 0, lR: 0, aLx: 0, aLz: 0.15, aRx: 0, aRz: 0.15, ear: 0, tail: 0, tailX: 0, eye: 1 };

export function makeNpc(id) {
  const K = kit(NPCS[id] ? id : 'mira'), G = K.gait;
  const root = new THREE.Group(), rig = grp(root), torso = grp(rig, 0, K.hip);
  const body = mesh(K.body, torso);
  const legL = grp(rig, K.legX, K.hip), legR = grp(rig, -K.legX, K.hip);
  mesh(K.leg, legL); mesh(K.leg, legR);
  const armL = grp(torso, K.armAt[0], K.armAt[1]), armR = grp(torso, -K.armAt[0], K.armAt[1]);
  mesh(K.arm, armL); mesh(K.armR || K.arm, armR);
  const neck = grp(torso, 0, K.neck);
  mesh(K.head, neck, 0, K.headY);
  const eyeG = grp(neck, 0, K.headY + K.eyeY), eyes = mesh(K.eyes, eyeG, 0, -K.eyeY, 0, false), joyM = mesh(K.joy, eyeG, 0, -K.eyeY, 0, false);
  joyM.visible = false;
  let ears = null, tail = null;
  if (K.ears) { ears = grp(neck, K.earsAt[0], K.headY + K.earsAt[1], K.earsAt[2]); mesh(K.ears, ears, -K.earsAt[0], -K.earsAt[1], -K.earsAt[2]); }
  if (K.tail) { tail = grp(torso, ...K.tailAt); mesh(K.tail, tail); }
  root.userData.id = id;
  root.userData.headTop = new THREE.Box3().setFromObject(root).max.y;

  let ph = 0, T = Math.random() * 9, blinkAt = 1 + Math.random() * 3, mood = null, moodT = 0;
  const c = { ...REST };
  root.userData.update = (dt, st = {}) => {
    T += dt;
    if ((st.mood || null) !== mood) { mood = st.mood || null; moodT = 0; }
    moodT += dt;
    const t = { ...REST }, s = cl(st.speed || 0), br = Math.sin(T * 2);
    let joyOn = false;
    // Gehen: jede Art mit eigenem Gang (Trippeln, Schaukeln, Watscheln, Traben)
    if (s > 0.01) ph += dt * G.f * (0.6 + 0.4 * s);
    const sw = Math.sin(ph) * s;
    t.lL = sw * G.leg; t.lR = -sw * G.leg; t.aLx = -sw * G.arm; t.aRx = sw * G.arm;
    t.aLz += Math.abs(Math.sin(ph)) * G.flap * s; t.aRz += Math.abs(Math.sin(ph)) * G.flap * s;
    t.y = Math.abs(Math.cos(ph)) * G.bob * s; t.rz = Math.sin(ph) * G.roll * s; t.tx = G.lean * s; t.ty = Math.sin(ph) * G.twist * s;
    t.tail = Math.sin(T * 2.2) * 0.15 + Math.sin(ph) * G.tail * s;
    t.ear = Math.pow(Math.max(0, Math.sin(T * 1.3)), 30) * 0.35 + Math.sin(ph * 2) * 0.08 * s; // Ohrzucken
    t.aLz += br * 0.03; t.aRz += br * 0.03; t.hx = br * 0.02;

    if (st.talking) {
      const k = G.tk, w = T * 3.5 * k;
      t.hx += Math.sin(T * 9 * Math.min(1.2, k)) * 0.05; t.hz = Math.sin(T * 1.7) * 0.08; t.y += Math.abs(Math.sin(T * 9 * Math.min(1.2, k))) * 0.012 * k;
      if (s < 0.3) {
        t.aRx = -0.75 + Math.sin(w) * 0.3 * k; t.aRz = 0.35 + Math.sin(w * 0.7) * 0.12;
        if (k > 1.1) { t.aLx = -0.45 + Math.sin(w + 2) * 0.3; t.aLz = 0.55 + Math.sin(w * 0.8) * 0.15; }
      }
    }
    switch (mood) {
      case 'happy':
        t.y += Math.abs(Math.sin(T * 7)) * 0.13; t.aLx = t.aRx = 0; t.aLz = t.aRz = 2.3 + Math.sin(T * 14) * 0.2;
        t.tail = Math.sin(T * 16) * 0.5; t.ear = 0.2; joyOn = true;
        break;
      case 'love':
        t.rz = Math.sin(T * 2.4) * 0.1; t.hz = Math.sin(T * 2.4 + 0.6) * 0.16; t.aLx = t.aRx = -1.1; t.aLz = t.aRz = -0.5;
        t.tail = Math.sin(T * 5) * 0.35; joyOn = true;
        break;
      case 'sad':
        t.hx = 0.42; t.tx += 0.12; t.aLx = t.aRx = 0.12; t.aLz = t.aRz = 0.04; t.ear = -0.5; t.y -= 0.015; t.tail = 0; t.tailX = -0.5; t.eye = 0.6;
        break;
      case 'surprised':
        t.y += Math.max(0, Math.sin(Math.min(Math.PI, moodT * 7))) * 0.2; t.hx = -0.15; t.aLx = t.aRx = -0.3; t.aLz = t.aRz = 1.1; t.ear = 0.35; t.eye = 1.3;
        break;
    }
    if (T > blinkAt) { if (T > blinkAt + 0.13) blinkAt = T + 2 + Math.random() * 3; else if (mood !== 'surprised') t.eye = 0.1; }

    const k = 1 - Math.exp(-dt * 16);
    for (const n in c) c[n] += (t[n] - c[n]) * k;
    rig.position.y = c.y; rig.rotation.z = c.rz;
    torso.rotation.set(c.tx, c.ty, 0);
    body.scale.y = 1 + br * 0.015;
    neck.rotation.set(c.hx, 0, c.hz);
    legL.rotation.x = c.lL; legR.rotation.x = c.lR;
    armL.rotation.set(c.aLx, 0, c.aLz); armR.rotation.set(c.aRx, 0, -c.aRz);
    if (ears) ears.rotation.x = c.ear;
    if (tail) tail.rotation.set(c.tailX, c.tail, 0);
    eyeG.scale.y = c.eye;
    eyes.visible = !joyOn; joyM.visible = joyOn;
  };
  root.userData.update(1, {});
  return root;
}

// ---------- Sprüche ----------
// {p} = Spielername, {q} = Partner, {i} = Gegenstand, {n} = Anzahl
const TEXT = {
  mira: {
    morning: ['Guten Morgen, {p}! Die ersten Brötchen sind gerade aus dem Ofen. Riechst du das auch?',
      'Morgen! Ich bin seit vier Uhr wach. Teig wartet nämlich auf niemanden.'],
    day: ['Hallo, {p}! Ich mache gerade Teigpause. Die beste Pause des ganzen Tages.',
      'Oh, hallo! Hast du schon was gegessen? Du siehst aus, als bräuchtest du einen Keks.'],
    evening: ['Guten Abend, {p}. Der Ofen kühlt langsam ab, und ich werde ganz kuschelig.',
      'Abends riecht das ganze Dorf nach Zimt. Na gut... vielleicht nur meine Ecke.'],
    night: ['Oh! So spät noch unterwegs? Pass auf, dass du nicht über müde Igel stolperst.',
      'Ich sollte längst im Bett sein... aber der Sauerteig hat mich so lieb angeschaut.'],
    sun: ['Bei Sonnenschein geht der Hefeteig doppelt so schön auf. Und meine Laune auch!'],
    rain: ['Regenwetter ist Backwetter! Dann dampft die Küche und die Fenster beschlagen so schön.',
      'Bei Regen werden meine Stacheln ganz plüschig. Bitte nicht lachen.'],
    snow: ['Schnee! Das schreit nach heißem Kakao und Plätzchen mit ganz viel Zuckerguss.'],
    spring: ['Im Frühling backe ich Kirschtörtchen. Ich warte schon sehnsüchtig auf die ersten Kirschen.'],
    summer: ['Im Sommer ist es in der Backstube so heiß, dass ich mich am liebsten in den Mehlsack setzen würde.'],
    autumn: ['Herbst heißt Kürbisbrot! Und Apfelkuchen. Und... eigentlich heißt Herbst einfach Kuchen.'],
    winter: ['Im Winter rolle ich mich gern ein. Aber erst, wenn alle Lebkuchen fertig sind!'],
    tier: [
      ['Oh, äh, hallo! Du bist neu hier, oder? Ich bin Mira. Ich backe... also, ich bin die Bäckerin.',
        'Entschuldige, ich bin ein bisschen schüchtern. Aber meine Zimtschnecken sind sehr gesprächig!',
        'Wenn du mal Hunger hast, klopf einfach an. Ich beiße nicht. Und ich steche nur ganz selten.'],
      ['Schön, dich zu sehen, {p}! Ich hab ein neues Rezept ausprobiert. Es ist nur ein kleines bisschen explodiert.',
        'Weißt du, was das Geheimnis von gutem Brot ist? Geduld. Und eine Prise gute Laune.',
        'Du warst gestern so fleißig auf der Insel! Ich hab dich vom Backstubenfenster aus gesehen.'],
      ['{p}, du bist wie frisches Brot: Wenn du da bist, wird alles gleich ein bisschen wärmer.',
        'Ich hab dir heimlich das knusprigste Eckstück aufgehoben. Psst, nicht weitersagen!',
        'Mit dir kann ich sogar über meine verbrannten Kuchen lachen. Das kann nicht jeder.'],
      ['Weißt du was, {p}? Seit du da bist, schmeckt alles ein bisschen süßer. Sogar das Salz.',
        'Wenn ich je eine Torte nach dir benenne, dann mit ganz viel Sahne. Versprochen!',
        'Du gehörst jetzt zu meinen Lieblingszutaten im Leben, {p}. Gleich nach Zimt. Nein – noch vor Zimt!'],
    ],
    partner: ['Du und {q}, ihr seid wie Butter und Brezel. Einfach ein süßes Team!',
      'Ich hab {q} heute schon gesehen. Ihr zwei solltet mal zusammen zum Kuchenessen vorbeikommen.',
      'Wie schön, dass du {q} an deiner Seite hast. Zu zweit geht jeder Teig besser auf.'],
    gossip: ['Bruno hat mir ein neues Brotregal gebaut. Drei Tage hat er gebraucht und genau zwei Sätze gesagt.',
      'Pippa hat heute versucht, mit einem Croissant zu angeln. Ich weiß nicht, ob ich lachen oder weinen soll.',
      'Lio hat meine Torte ein Meisterwerk genannt. Dann hat er sich in der Glasur gespiegelt.',
      'Ich glaube, Bruno nascht heimlich meinen Apfelkuchen. Die Pfotenabdrücke verraten ihn.'],
    tips: ['Kleiner Tipp: Pflanzen sind wie Teig – sie brauchen jeden Tag ein bisschen Wasser. Gießen nicht vergessen!',
      'In der Gartenküche kannst du aus Obst was Leckeres backen. Mehl und Zucker gibt’s im Krämerladen!',
      'Schüttel mal die Bäume! Wenn Obst dranhängt, fällt es direkt runter. Nach drei Tagen wächst neues nach.',
      'Was du nicht brauchst, legst du in die Verkaufskiste. Über Nacht wird daraus Geld. Fast wie Zauberei!'],
    gift: {
      love: ['{i}?! Für mich? Oh, mir wird ganz warm im Bauch. Danke, danke, danke!', 'Hach, {i}! Daraus mach ich was ganz Besonderes. Und du kriegst das erste Stück!'],
      like: ['Oh, {i}! Das kann ich prima gebrauchen. Danke dir!', 'Wie lieb von dir! {i} kommt gleich in meine Vorratskammer.'],
      neutral: ['Oh, {i}. Danke! Ich finde bestimmt eine Verwendung dafür.', 'Danke dir! Vielleicht backe ich {i} irgendwo mit hinein... irgendwie.'],
      dislike: ['Oh. {i}. Das ist... sehr lieb gemeint. Ich leg es mal ganz weit nach hinten.', 'Ähm, {i}? Davon kriege ich Gänsehaut unter den Stacheln. Aber danke trotzdem!'],
    },
    letters: {
      2: ['Ein Krümel Post', 'Hallo {p}!\nIch freu mich so, dass du ins Dorf gezogen bist. Komm doch mal auf ein warmes Brötchen vorbei!\nDeine Mira'],
      4: ['Rezept für einen guten Tag', 'Hallo {p}!\nMan nehme: einen Sonnenaufgang, eine Tasse Kakao und einen Besuch von dir. Gut umrühren. Klappt jedes Mal!\nDeine Mira'],
      6: ['Grüße aus der Backstube', 'Liebe Grüße, {p}!\nIch hab heute beim Kneten an dich gedacht und dabei gesummt. Der Teig ist so fluffig geworden wie noch nie.\nDeine Mira'],
      8: ['Ein Gebäck für dich', '{p}, ich hab ein neues Gebäck erfunden und nach dir benannt. Es ist süß, ein bisschen verrückt und macht alle glücklich. Passt, oder?\nDeine Mira'],
      10: ['Allerbeste Freunde', '{p}, ich wollte dir das schon lange sagen, und dabei ist mir ein Kuchen angebrannt. Also kurz: Du bist mein liebster Mensch im ganzen Dorf.\nFür immer, deine Mira'],
      0: ['Ein kleiner Gruß', 'Hallo {p}!\nHier riecht es gerade nach Zimt, und ich musste an dich denken. Hab einen schönen Tag!\nMira'],
    },
    request: ['Sag mal... könntest du mir {n}× {i} bringen? Ich hab da eine Rezeptidee, die mich nicht schlafen lässt!',
      'Oh nein, meine Vorratskammer ist leer! Hättest du {n}× {i} für mich? Ich back dir auch was Feines.'],
  },

  bruno: {
    morning: ['Morgen, {p}. ... Schöner Tag zum Hobeln.', 'Hm. Früh auf den Beinen. ... Gefällt mir.'],
    day: ['Na, {p}. ... Mittagspause. Die heiligste Zeit des Tages.', 'Hallo. ... Ich hab gerade ein Brett angeschaut. Eine Stunde lang. Gutes Brett.'],
    evening: ['Abend, {p}. ... Feierabend riecht nach Sägespänen und Suppe.', 'Hm. Die Sonne geht unter. ... Ich auch bald. Ins Bett, mein ich.'],
    night: ['Noch wach? ... Ich auch. Richtig schlafen tun Bären erst im Winter.', 'Psst... die Sterne. ... Sehen aus wie Astlöcher im Himmel.'],
    sun: ['Sonne. ... Holz trocknet gut. Bär auch.'],
    rain: ['Regen. ... Gut für die Bäume. Und die Bäume sind gut für mich.',
      'Bei Regen ... sitz ich unterm Vordach und schnitz kleine Enten. Pippa findet das nicht lustig.'],
    snow: ['Schnee. ... Eigentlich sollte ich jetzt schlafen. Aber dann verpass ich dich ja.'],
    spring: ['Frühling. ... Alles wächst. Sogar mein Appetit.'],
    summer: ['Im Sommer ... arbeite ich lieber im Schatten. Das Fell, weißt du.'],
    autumn: ['Herbst. ... Ich esse jetzt für zwei. Für mich und meinen Winterschlaf.'],
    winter: ['Winter. ... Ein Feuer, ein Stück Holz, ein Schnitzmesser. Mehr brauch ich nicht.'],
    tier: [
      ['Hallo. ... Bruno. Ich bin der Schreiner. ... Ja.', 'Wenn was kaputt ist ... sag Bescheid. Ich hab Zeit. Viel Zeit.',
        'Du wohnst also in dem Häuschen am Klippenrand. ... Gute Balken hat das.'],
      ['{p}. ... Schön, dich zu sehen. Wirklich.', 'Gut Ding will Weile haben. ... Das gilt für Tische. Und für Freundschaften.',
        'Ich hab dir zugesehen. ... Du arbeitest gut. Ruhig. Mag ich.'],
      ['Weißt du, {p} ... mit dir ist Stille nicht still. Sie ist ... gemütlich.',
        'Ich hab dein Zaunbrett repariert. ... Wollte nichts sagen. Aber jetzt weißt du es.',
        'Wenn du mal reden willst ... ich bin gut im Zuhören. Bin ja schlecht im Reden.'],
      ['{p}. ... Du bist wie gutes Eichenholz. Stark. Warm. Hält ewig.',
        'Ich hab einen Stuhl gebaut. ... Nur für dich. Er steht neben meinem. Falls du mal kommst.',
        'Beste Freunde. ... Hm. Klingt gut. Lassen wir das so. Für immer.'],
    ],
    partner: ['Du und {q}. ... Wie Nut und Feder. Passt einfach.', '{q} war vorhin hier. ... Hat nur von dir geredet. Hm. Süß.',
      'Zu zweit trägt sich ein Balken leichter. ... Ein Leben auch. Pass gut auf {q} auf.'],
    gossip: ['Mira hat mir Apfelkuchen gebracht. ... Ich hab ihr ein Regal gebaut. Guter Tausch.',
      'Pippa ist heute wieder in den Teich gefallen. ... Ich glaub, sie macht das mit Absicht.',
      'Lio will einen goldenen Bilderrahmen. ... Für ein Bild von sich selbst. Hm.',
      'Mira summt beim Backen. ... Manchmal hör ich am Fenster zu. Nicht weitersagen.'],
    tips: ['An der Werkbank ... baust du aus Holz und Stein Zäune, Wege, Bänke. Ruhig angehen.',
      'Glitzert irgendwo der Boden? ... Nimm die Schaufel. Da liegen manchmal Fossilien. Älter als ich.',
      'Bäume schütteln gibt Holz. ... Felsen geben Stein. Die Welt ist eine Werkstatt.',
      'Mit der Axt kriegst du Holz. ... Dreimal am Tag pro Baum. Der Baum bleibt stehen. Ist ein zäher Bursche.'],
    gift: {
      love: ['{i}. ... Oh. ... Das ist ... wunderbar. Ich bin ganz gerührt.', 'Hmm! {i}! ... Mein Lieblings... ja. Du kennst mich gut.'],
      like: ['{i}. ... Gut. Sehr gut. Danke.', 'Oh, {i}. ... Kann ich brauchen. Danke dir.'],
      neutral: ['{i}. ... Hm. Danke.', 'Ah. {i}. ... Ich find schon einen Platz dafür.'],
      dislike: ['{i}? ... Hm. ... Danke ... für den Gedanken.', 'Oh. {i}. ... Ist nicht so meins. Aber lieb gemeint.'],
    },
    letters: {
      2: ['Kurze Nachricht', '{p}.\nDanke für deine Besuche. Ich freu mich.\nBruno'],
      4: ['Von Bruno', 'Hallo {p}.\nIch hab ein Vogelhaus gebaut. Es sieht aus wie dein Haus. War keine Absicht. ... Doch, war Absicht.\nBruno'],
      6: ['Brief aus der Werkstatt', '{p},\nich schreibe nicht oft. Eigentlich nie. Aber du bist ein guter Freund. Das wollte ich aufschreiben, damit es hält.\nBruno'],
      8: ['Holz und Herz', '{p}.\nIn meiner Werkstatt hängt jetzt ein Bild von dir. Lio hat es gemalt. Ich schau es oft an. Dann geht die Arbeit leichter.\nDein Bruno'],
      10: ['Für immer', '{p}.\nManche Dinge baut man einmal, und sie halten ein Leben lang. Unsere Freundschaft ist so ein Ding. Danke.\nDein bester Freund, Bruno'],
      0: ['Ein Gruß', 'Hallo {p}.\nGutes Wetter heute. Pass auf dich auf.\nBruno'],
    },
    request: ['Ich bau gerade was. ... Bräuchte {n}× {i}. Wenn es keine Mühe macht.', 'Hm. ... Mir fehlen {n}× {i}. Hast du welche übrig? Ich ... wäre dankbar.'],
  },

  pippa: {
    morning: ['Guten Morgen, {p}! Ich war heute schon zweimal am Teich. Und einmal drin! Quak!',
      'Morgen! Die Fische beißen am besten, solange sie noch verschlafen sind. Hehe!'],
    day: ['Hallo, {p}! Weißt du, was ich heute fast gefangen hätte? Einen RIESENfisch! Wirklich, fast!',
      'Hey! Keine Zeit, keine Zeit! ... Ach was, für dich hab ich immer Zeit. Was gibt’s?'],
    evening: ['Abend, {p}! Im Abendlicht glitzert der Teich wie ein Schatz. Ich glaub, da unten IST ein Schatz!',
      'Feierabend? Pah! Abenteurerinnen kennen keinen Feierabend. ... Okay, vielleicht ein Nickerchen.'],
    night: ['Nachtangeln! Die geheimnisvollsten Fische kommen nur im Mondschein raus. Kommst du mit?',
      'Psst! Ich bin auf Nachtpatrouille. Wofür? Weiß ich noch nicht!'],
    sun: ['Sonne! Perfektes Wetter für ein Abenteuer. Oder zwei. Oder sieben!'],
    rain: ['REGEN! Endlich! Ich liebe Regen! Das ist quasi Teich von oben!',
      'Mein Regenhut ist mein Glücksbringer. Seit ich ihn hab, bin ich nur noch dreimal ins Wasser gefallen.'],
    snow: ['Schnee! Weißt du, wie Eisangeln geht? Ich auch nicht! Lass es uns rausfinden!'],
    spring: ['Frühling! Die Forellen sind wieder munter. Und ich bin noch munterer! Quak!'],
    summer: ['Im Sommer spring ich jeden Tag in den Teich. Ganz offiziell. Zum Fischezählen.'],
    autumn: ['Herbstlaub auf dem Wasser sieht aus wie kleine Boote! Ich hab allen Namen gegeben.'],
    winter: ['Winter? Kein Problem! Ich hab Daunen. Eingebaute Daunen! Ha!'],
    tier: [
      ['Ahoi! Ich bin Pippa: Fischerin, Abenteurerin und Teichexpertin! Und wer bist du?',
        'Oh, hallo! Du hast keine Angel dabei? Wie überlebst du nur?',
        'Eigentlich rede ich nicht mit Fremden. Aber du siehst nicht aus wie ein Hecht. Okay!'],
      ['{p}! Da bist du ja wieder! Willst du meine Narbe sehen? Ein Krebs. Ein SEHR großer Krebs.',
        'Ich hab einen Plan: Wir bauen ein Floß und segeln einmal um den Teich! Dauert nur zwei Minuten!',
        'Weißt du, was ich an dir mag, {p}? Du läufst nicht weg, wenn ich aufgeregt bin. Das tun viele!'],
      ['{p}, du bist offiziell in meiner Abenteuer-Crew! Rang: Erster Maat! Hab ich gerade entschieden.',
        'Wenn ich den Riesenfisch fange, nennen wir ihn nach dir. Oder nach uns beiden!',
        'Mit dir ist sogar das Warten aufs Anbeißen spannend. Und das ist sonst echt SEHR langweilig!'],
      ['{p}! Beste Freunde für immer! Hab ich in meinen Hut gestickt. Schau nicht so genau hin.',
        'Ich hab dir meine geheime Angelstelle verraten. Zweimal sogar. Weil ich’s vergessen hatte!',
        'Egal wie stürmisch es wird – mit dir im Boot hab ich keine Angst. Na ja. Weniger Angst!'],
    ],
    partner: ['Du und {q}? Ihr seid wie Angel und Haken! Moment, das klingt gefährlich. Wie Ente und Teich!',
      'Ich hab {q} vorhin beim Gießen gesehen. Ihr zwei seid echt ein süßes Team. Quak!',
      'Wenn du mit {q} angeln gehst, nehmt mich mit! Ich bring Snacks. Und Chaos.'],
    gossip: ['Bruno hat eine Holzente geschnitzt. Die sieht mir gar nicht ähnlich! Viel zu ruhig.',
      'Mira hat mir verboten, Würmer in die Backstube mitzubringen. Dabei waren die nur zu Besuch!',
      'Lio wollte mich malen. Ich hab nicht stillgehalten. Jetzt hängt bei ihm ein gelber Wirbelsturm.',
      'Ich glaub, Lio hat Angst vor Fröschen. Er sagt, er mag nur ihre Farbe nicht. Haha!'],
    tips: ['Angel-Tipp: Im Meer gibt’s andere Fische als im Fluss! Vom Steg aus beißen sogar Haie. Glaub ich. Hoffentlich!',
      'Fisch kannst du verkaufen oder zu Fischsuppe kochen! Ich empfehle Suppe. Mit Nachschlag.',
      'Gieß deine Pflanzen! Ohne Wasser wird das nix. Glaub mir, ich bin Expertin für Wasser.',
      'Siehst du was glitzern? Grab mit der Schaufel! Ich hab mal einen uralten Knochen gefunden. Ein Ur-Hecht!'],
    gift: {
      love: ['WAS?! {i}?! Für MICH?! Ich muss mich kurz hinsetzen. Nein, ich muss rumhüpfen! Quak!', '{i}! Das ist das Beste, was mir je passiert ist! Diese Woche! Danke!'],
      like: ['Oh, {i}! Super! Das kommt in meine Abenteuertasche!', 'Juhu, {i}! Danke dir! Das ist echt praktisch!'],
      neutral: ['Oh, {i}! Hm, danke! Ich find bestimmt raus, wofür das gut ist!', '{i}? Danke! Vielleicht kann man damit angeln. Kann man mit allem.'],
      dislike: ['Äh... {i}? Das ist... nicht so meins. Gar nicht. Aber danke!', '{i}?! Weißt du, wie... nein, schon gut. Danke für den Gedanken. Quak.'],
    },
    letters: {
      2: ['AHOI!', 'Hallo {p}!\nIch schreib dir direkt vom Teich aus. Der Brief ist ein bisschen nass, sorry! Komm mal angeln!\nPippa'],
      4: ['Geheime Botschaft', '{p}!\nDiese Nachricht zerstört sich nicht selbst, aber lies sie trotzdem schnell: Du bist echt cool!\nPippa'],
      6: ['Logbuch, Eintrag 42', 'Heute mit {p} am Teich. Fang: null Fische, aber hundert Lacher. Bester Tag seit Langem!\nKapitänin Pippa'],
      8: ['An meinen Ersten Maat', '{p}!\nIch hab dir eine Schatzkarte gemalt. Der Schatz ist... unsere Freundschaft. Kitschig, ich weiß! Quak!\nPippa'],
      10: ['Beste Freunde für immer!', '{p}!\nIch hab ewig überlegt, was ich schreibe. Okay, zwei Minuten. Du bist mein liebstes Abenteuer! Egal wohin – ich komm mit.\nDeine Pippa'],
      0: ['Kurze Post', 'Hey {p}!\nEben hat mich ein Fisch angeguckt, und ich musste an dich denken. Bis bald!\nPippa'],
    },
    request: ['Ich brauch {n}× {i} für eine geheime Mission! Fragen gibt’s nicht. Na gut, eine: Hast du welche?',
      'Hilfe! Ich brauche dringend {n}× {i}! Warum? Sag ich dir, wenn’s geklappt hat!'],
  },

  lio: {
    morning: ['Bonjour, {p}! Das Morgenlicht schmeichelt mir heute ganz besonders, findest du nicht?',
      'Ah, der Morgen! Tau auf den Blüten, Glanz in meinem Fell. Die Welt ist ein Gemälde.'],
    day: ['Salut, {p}! Ich male gerade ein Meisterwerk. Ein Selbstporträt. Natürlich.',
      'Die Mittagssonne ist so ehrlich. Sie zeigt jeden Pinselstrich. Und jedes Härchen. Zum Glück sitzt alles.'],
    evening: ['Guten Abend, {p}. Die Abendröte hat fast meine Fellfarbe. Fast.',
      'Der Abend ist die Stunde der Künstler. Und der Teetrinker. Ich bin beides. Wie praktisch!'],
    night: ['Noch so spät auf? Wie mysteriös. Ich mag mysteriös. Ich bin selbst sehr mysteriös.',
      'Der Mond ist heute wunderschön. Ich würde ihn malen, aber er hält einfach nicht still.'],
    sun: ['Was für ein Licht! Perfekt zum Malen. Und um gesehen zu werden, natürlich.'],
    rain: ['Regen ist eine Katastrophe für meine Frisur! ... Aber die Blumen lieben ihn. Also verzeihe ich ihm.',
      'Regentropfen auf Blütenblättern... ich bin zu Tränen gerührt. Oder das ist auch Regen.'],
    snow: ['Schnee! Eine weiße Leinwand, so weit das Auge reicht. Und ich mittendrin, in Orange. Très chic!'],
    spring: ['Frühling! Alles blüht! Ich auch. Ich blühe eigentlich immer, aber jetzt besonders.'],
    summer: ['Sommer ist Sonnenblumenzeit. Groß, golden, strahlend. Sie erinnern mich an jemanden... an mich.'],
    autumn: ['Herbst, die Saison der Farben! Rot, Gold, Orange... die Natur hat sich eindeutig von mir inspirieren lassen.'],
    winter: ['Im Winter blüht fast nichts. Darum male ich Blumen. Und trage einen extra schönen Schal.'],
    tier: [
      ['Ah, ein neues Gesicht! Ich bin Lio. Künstler, Florist und, wie du siehst, außerordentlich gutaussehend.',
        'Enchanté! Du darfst mich gern bewundern. Das tun hier alle. Na ja, die meisten.',
        'Du möchtest Blumen? Kunst? Ein Autogramm? Lio hat für jeden etwas.'],
      ['{p}! Du hast Geschmack, das sehe ich sofort. Du redest ja schließlich mit mir.',
        'Ich binde gerade einen Strauß. Jede Blume ist ein kleines Gedicht. Dieser hier ist ein Sonett.',
        'Weißt du, {p}, du hättest ein hübsches Gesicht für ein Gemälde. Neben mir, versteht sich.'],
      ['{p}, mon ami! Neben dir fühle ich mich fast... bescheiden. Fast.',
        'Ich habe dir die schönste Blume aufgehoben. Ich hab lange gesucht. Fast so lange, wie ich in den Spiegel schaue.',
        'Unter uns: Manchmal fürchte ich, meine Bilder sind nicht gut genug. Aber das sag ich nur dir.'],
      ['{p}! Ich male ein neues Selbstporträt, und diesmal bist du mit drauf. Größer kann ein Kompliment nicht sein!',
        'Mein bestes Kunstwerk? Nicht meine Bilder. Unsere Freundschaft. Ach, wie poetisch ich wieder bin.',
        'Wenn ich mit dir rede, vergesse ich sogar, in Pfützen nach meinem Spiegelbild zu schauen.'],
    ],
    partner: ['Du und {q} – was für eine Komposition! Ihr zwei gehört zusammen in einen goldenen Rahmen.',
      'Ich binde euch beiden einen Strauß, dir und {q}. Mit Pfingstrosen. Und einer Sonnenblume, für mich.',
      '{q} hat heute so verliebt von dir geschwärmt. Fast so, wie ich von mir schwärme!'],
    gossip: ['Bruno hat mir einen Rahmen gebaut. Ein Kunstwerk! Er sagte nur „Hm“. Ein Mann weniger Worte.',
      'Mira hat einen Kuchen mit meinem Gesicht verziert. Ich konnte ihn nicht essen. Viel zu schön.',
      'Pippa hat meine Staffelei als Angelrute benutzt. Ich bin immer noch nicht drüber hinweg.',
      'Psst: Mira schwärmt für Kirschtorte. Das hast du aber nicht von mir.'],
    tips: ['Kochen ist auch eine Kunst! Kombiniere Obst und Fisch in der Küche. Die Zutaten sind deine Farben.',
      'Sonnenblumen bringen in der Verkaufskiste ein hübsches Sümmchen. Aber behalte die allerschönsten!',
      'Das Museum ist so elegant! Ich finde, es fehlt nur noch ein Porträt von mir. Bring doch mal ein paar Fossilien hin.',
      'An der Werkbank entstehen Laternen, Bänke, Brunnen... Nicht so schön wie Kunst, aber immerhin.'],
    gift: {
      love: ['{i}! Magnifique! Du verstehst meine Seele. Ich bin ganz gerührt!', 'Oh là là, {i}! Das ist so schön, fast so schön wie ich! Merci!'],
      like: ['{i}! Wie geschmackvoll von dir. Merci!', 'Ah, {i}. Du hast ein Auge fürs Schöne. Das gefällt mir.'],
      neutral: ['{i}. Hm, wie... interessant. Ich werde es künstlerisch interpretieren.', 'Merci für {i}. Vielleicht inspiriert es mich zu irgendwas.'],
      dislike: ['{i}? Oh. Oh nein. Das passt farblich überhaupt nicht zu mir.', 'Mon dieu, {i}! Ich... werde es tapfer ertragen. Merci. Glaube ich.'],
    },
    letters: {
      2: ['Gruß aus dem Atelier', 'Bonjour {p}!\nIch wollte nur, dass du einmal einen Brief in meiner wunderschönen Handschrift bekommst. À bientôt!\nLio'],
      4: ['Eine kleine Skizze', '{p},\nich habe dich heute gezeichnet. Ganz klein, in der Ecke eines Bildes von mir. Was für eine Ehre!\nLio'],
      6: ['Für eine besondere Person', 'Mon ami {p}!\nHeute hab ich eine Blume gesehen, die mich an dich erinnert hat. Fast so schön wie ich. Fast!\nDein Lio'],
      8: ['Ein ehrlicher Brief', '{p},\nganz ehrlich und ohne Spiegel: Du machst das Dorf bunter. Und mich ein bisschen weniger eitel. Nur ein bisschen.\nLio'],
      10: ['Mein Meisterwerk', '{p}!\nMein Meisterwerk ist fertig. Es heißt „Freundschaft“, und wir beide sind drauf. Du siehst fast so gut aus wie ich.\nDein Lio'],
      0: ['Kurzer Gruß', 'Salut {p}!\nDie Blumen blühen, die Farben trocknen, und ich sehe wie immer fabelhaft aus. Bis bald!\nLio'],
    },
    request: ['Mon ami! Für mein nächstes Kunstwerk brauche ich {n}× {i}. Die Muse wartet nicht!',
      'Ich brauche {n}× {i}. Frag nicht, wofür – Kunst erklärt sich nicht. Bringst du sie mir?'],
  },
};

const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w)\}/g, (_, k) => v[k] ?? '');
const txt = id => TEXT[id] || TEXT.mira;

export function npcLine(id, ctx = {}) {
  const L = txt(id), h = ctx.hour ?? 12, hearts = ctx.hearts || 0;
  const time = h < 11 ? 'morning' : h < 17 ? 'day' : h < 21 ? 'evening' : 'night';
  const tier = hearts >= 9 ? 3 : hearts >= 6 ? 2 : hearts >= 3 ? 1 : 0;
  const pools = [[L[time], 3], [L.tier[tier], 3], [L[ctx.weather] || L.sun, 1.5], [L[ctx.season], 1], [L.tips, 1.5], [L.gossip, 1], [ctx.partner && L.partner, 1.2]]
    .filter(([p]) => p);
  let r = Math.random() * pools.reduce((s, [, w]) => s + w, 0), pool = pools[0][0];
  for (const [p, w] of pools) if ((r -= w) < 0) { pool = p; break; }
  return fill(pick(pool), { p: ctx.player || 'du', q: ctx.partner || '' });
}

export function giftReply(id, reaction, itemName) {
  const g = txt(id).gift;
  return fill(pick(g[reaction] || g.neutral), { i: itemName });
}

export function letter(id, hearts, player) {
  const L = txt(id).letters, [title, text] = L[hearts] || L[0];
  return { title, text: fill(text, { p: player || 'du' }) };
}

export function requestLine(id, itemName, n) {
  return fill(pick(txt(id).request), { i: itemName, n });
}
