// Eigene Modelle für die Inselleben-Erweiterungen (Gärtnerei-Technik, Feuerwerk, Schatz, seltene Möbel …).
// Format wie in plants.js/furniture.js: Liste von Teilen {g, c} oder [Teile, Leuchtteile].
import * as THREE from '../vendor/three.module.min.js';

const PI = Math.PI, H = PI / 2, TAU = PI * 2;
function put(g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
}
const plain = g => new THREE.BufferGeometry().copy(g);
const B = (r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, w = 12, h = 9) => put(plain(new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz)), c, x, y, z);
const C = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 14, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, y, z, rx, ry, rz);
const K = (r, h, c, x = 0, y = 0, z = 0, seg = 12, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.ConeGeometry(r, h, seg)), c, x, y, z, rx, ry, rz);
const X = (w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.BoxGeometry(w, h, d)), c, x, y, z, rx, ry, rz);
const T = (R, t, c, x, y, z, rx = H, ry = 0, arc = TAU) => put(plain(new THREE.TorusGeometry(R, t, 8, 24, arc)), c, x, y, z, rx, ry);
function soft(w, h, d, c, x = 0, y = 0, z = 0, e = 0.3, ry = 0) {
  const g = new THREE.SphereGeometry(1, 12, 8), a = g.attributes.position.array;
  for (let i = 0; i < a.length; i++) a[i] = Math.sign(a[i]) * Math.abs(a[i]) ** e;
  g.scale(w / 2, h / 2, d / 2);
  return put(g, c, x, y, z, 0, ry);
}
function star(r, c, x, y, z, th = 0.03, ry = 0) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + H, rr = i % 2 ? r * 0.45 : r; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
  g.translate(0, 0, -th / 2);
  return put(g, c, x, y, z, 0, ry);
}
const WOOD = 0xd9a86c, WOODD = 0xa87449, CREAM = 0xfff3e0, WHITE = 0xffffff, PINK = 0xffb7c8, ROSE = 0xff8fab, MINT = 0xa8e2cf, SKY = 0xaed6f5,
  LILA = 0xcdb8f5, BUTTER = 0xffe39a, LEAF = 0x6cc06a, DLEAF = 0x4fa156, DARK = 0x4a3a3a, BRASS = 0xe0b862, METAL = 0xb8c4d0, GLASS = 0xd8f0ff, NAVY = 0x2f3f78;
const RAINBOW = [0xff7b7b, 0xffb36b, 0xffe066, 0x8ad45a, 0x6cb4ff, 0xb08cff];

// ---------- Draußen (Garten & Insel) ----------
export const PLACE_X = {
  // Gewächshaus: Glashaus mit Holzrahmen und Pflanzen drin
  gewaechshaus: () => {
    const p = [X(1.7, 0.12, 1.5, WOODD, 0, 0.06, 0), X(1.62, 0.9, 1.42, GLASS, 0, 0.6, 0), ...[-0.8, 0.8].flatMap(x => [-0.7, 0.7].map(z => X(0.07, 1.0, 0.07, WHITE, x, 0.6, z))),
      X(1.7, 0.06, 0.07, WHITE, 0, 1.08, 0.72), X(1.7, 0.06, 0.07, WHITE, 0, 1.08, -0.72),
      put(plain(new THREE.CylinderGeometry(0.85, 0.85, 1.62, 3, 1, false, -H / 1.5, PI / 1.5 * 2)).scale(1, 1, 0.55), GLASS, 0, 1.12, 0, 0, 0, H),
      X(1.74, 0.06, 0.06, WHITE, 0, 1.58, 0), X(0.06, 0.62, 0.05, WHITE, 0, 0.42, 0.72), X(0.05, 0.05, 0.05, BRASS, 0.08, 0.5, 0.75)];
    for (let i = 0; i < 3; i++) p.push(C(0.12, 0.1, 0.16, 0xe58e66, -0.5 + i * 0.5, 0.2, -0.35, 10), B(0.16, i === 1 ? 0xff8fab : LEAF, -0.5 + i * 0.5, 0.38, -0.35, 1, 0.9, 1));
    p.push(B(0.06, 0xffe066, 0.0, 0.48, -0.25), B(0.05, 0xff7b7b, -0.45, 0.46, -0.28), B(0.05, LILA, 0.52, 0.47, -0.27));
    return p;
  },
  // Sprinkler: kleiner Pfosten mit Drehdüse, im Sternsprinkler golden mit Stern
  sprinkler: () => [C(0.22, 0.26, 0.08, 0x8a8e98, 0, 0.04, 0, 16), C(0.05, 0.06, 0.4, METAL, 0, 0.28, 0, 10), C(0.12, 0.08, 0.08, 0x6cb4ff, 0, 0.5, 0, 12), ...[0, 1, 2].map(i => C(0.018, 0.018, 0.22, METAL, Math.cos(i * 2.1) * 0.1, 0.53, Math.sin(i * 2.1) * 0.1, 6, 0, -i * 2.1, H)), B(0.04, 0x6cb4ff, 0, 0.57, 0)],
  sternsprinkler: () => [[C(0.24, 0.28, 0.08, 0xc9a26b, 0, 0.04, 0, 16), C(0.06, 0.07, 0.45, BRASS, 0, 0.3, 0, 10), C(0.14, 0.09, 0.08, 0xffd23f, 0, 0.55, 0, 12), ...[0, 1, 2, 3].map(i => C(0.02, 0.02, 0.28, BRASS, Math.cos(i * H) * 0.12, 0.58, Math.sin(i * H) * 0.12, 6, 0, -i * H, H))], [star(0.12, 0, 0, 0.75, 0, 0.04)]],
  // Sternenrakete (Belohnung für 5 Sterne): Rakete auf einem kleinen Startgestell
  sternenrakete: () => [[X(0.7, 0.1, 0.7, WOODD, 0, 0.05, 0), ...[0, 1, 2].map(i => C(0.025, 0.025, 0.55, DARK, Math.cos(i * 2.1) * 0.22, 0.34, Math.sin(i * 2.1) * 0.22, 6, 0, 0, Math.cos(i * 2.1) * -0.3)),
    C(0.14, 0.14, 0.7, 0xff6b8a, 0, 0.75, 0, 16), K(0.15, 0.3, 0xffe066, 0, 1.25, 0, 16), C(0.145, 0.145, 0.08, WHITE, 0, 0.62, 0, 16), C(0.145, 0.145, 0.08, WHITE, 0, 0.88, 0, 16),
    ...[0, 1, 2, 3].map(i => X(0.03, 0.22, 0.16, SKY, Math.cos(i * H) * 0.15, 0.48, Math.sin(i * H) * 0.15, 0, -i * H)), C(0.015, 0.015, 0.25, BRASS, 0, 0.3, 0, 6)], [star(0.09, 0, 0, 0.76, 0.15, 0.03)]],
  // Inselfahne: Stange mit Tuch (das Muster kommt zur Laufzeit als Bild darauf)
  fahne: () => [C(0.04, 0.05, 2.0, 0xe8e0d8, 0, 1.0, 0, 10), B(0.07, BRASS, 0, 2.03, 0), C(0.22, 0.26, 0.1, 0x9a948e, 0, 0.05, 0, 14)],
  // Tauschstand: Marktstand mit gestreiftem Dach
  tauschstand: () => {
    const p = [X(1.5, 0.08, 0.7, WOODD, 0, 0.72, 0.05), X(1.5, 0.6, 0.06, WOOD, 0, 0.4, 0.38), X(1.5, 0.06, 0.7, WOOD, 0, 0.08, 0.05), ...[-0.72, 0.72].flatMap(x => [-0.28, 0.38].map(z => X(0.07, 1.6, 0.07, WOODD, x, 0.8, z)))];
    for (let i = 0; i < 6; i++) p.push(X(0.26, 0.05, 0.95, i % 2 ? WHITE : 0x6cb4ff, -0.65 + i * 0.26, 1.62, 0.1, 0.22));
    p.push(X(0.5, 0.22, 0.04, CREAM, 0, 1.42, 0.43), X(0.2, 0.14, 0.2, ROSE, -0.4, 0.83, 0.05), B(0.1, 0xffb36b, 0.0, 0.84, 0.0), X(0.24, 0.12, 0.18, MINT, 0.4, 0.82, 0.05));
    return p;
  },
  // Schatzkiste (vom großen Schatz)
  schatzkiste: () => [[X(0.8, 0.45, 0.55, 0xa8643a, 0, 0.23, 0), C(0.275, 0.275, 0.8, 0xb8743a, 0, 0.45, 0, 16, 0, 0, H), ...[-0.3, 0.3].map(x => X(0.06, 0.48, 0.58, BRASS, x, 0.24, 0)), X(0.12, 0.14, 0.05, BRASS, 0, 0.42, 0.28), B(0.05, 0xffd23f, 0.2, 0.72, 0.1), B(0.04, 0xff4a6a, -0.15, 0.74, 0.0)], [B(0.18, 0, 0, 0.68, 0.05, 1.8, 0.4, 1.1)]],
  // Campingplatz (Inselprojekt): Zelt, Lagerfeuer, Schild
  campingplatz: () => {
    const p = [put(plain(new THREE.ConeGeometry(0.9, 1.3, 4)), 0xff9a5a, 0, 0.65, -0.2, 0, PI / 4),
      X(0.3, 0.5, 0.02, 0x5a3a2a, 0, 0.25, 0.42), ...[0, 1, 2, 3, 4].map(i => C(0.04, 0.04, 0.4, WOODD, 0.9 + Math.cos(i * 1.26) * 0.12, 0.06, 0.6 + Math.sin(i * 1.26) * 0.12, 6, H, i * 1.26)),
      C(0.05, 0.05, 0.9, WOODD, -0.9, 0.45, 0.55, 8), X(0.55, 0.32, 0.05, CREAM, -0.9, 0.85, 0.57), X(0.6, 0.05, 0.4, WOOD, 0.1, 0.18, 0.95), ...[-0.2, 0.4].map(x => X(0.06, 0.18, 0.06, WOODD, x, 0.09, 0.95))];
    return [p, [K(0.13, 0.3, 0, 0.9, 0.22, 0.6, 8), K(0.08, 0.22, 0, 0.98, 0.2, 0.55, 8)]];
  },
  // Grundstück: Schild mit Schnur-Zaun
  grundstueck: () => [C(0.04, 0.05, 0.9, WOODD, 0, 0.45, 0, 8), X(0.6, 0.38, 0.05, CREAM, 0, 0.85, 0.03), X(0.5, 0.06, 0.02, ROSE, 0, 0.92, 0.06), ...[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z]) => C(0.03, 0.03, 0.35, WOODD, x, 0.17, z, 6)),
    ...[[0, -0.7, 1.4, 0.01], [0, 0.7, 1.4, 0.01], [-0.7, 0, 0.01, 1.4], [0.7, 0, 0.01, 1.4]].map(([x, z, w, d]) => X(w, 0.015, d, 0xffffff, x, 0.3, z))],
  // Nachbarhaus: kleines Häuschen mit Briefkasten
  nachbarhaus: () => [[soft(1.5, 1.1, 1.3, CREAM, 0, 0.55, 0, 0.2), put(plain(new THREE.ConeGeometry(1.25, 0.85, 4)), 0x7fb8e8, 0, 1.5, 0, 0, PI / 4), X(0.34, 0.6, 0.05, 0xa8643a, 0, 0.3, 0.66), B(0.03, BRASS, 0.1, 0.32, 0.7),
    X(0.32, 0.28, 0.04, SKY, -0.45, 0.65, 0.66), X(0.32, 0.28, 0.04, SKY, 0.45, 0.65, 0.66), X(0.36, 0.04, 0.06, WOODD, -0.45, 0.48, 0.68), X(0.36, 0.04, 0.06, WOODD, 0.45, 0.48, 0.68),
    C(0.03, 0.03, 0.6, WOODD, 0.95, 0.3, 0.75, 6), X(0.2, 0.16, 0.26, ROSE, 0.95, 0.66, 0.75), B(0.12, LEAF, -0.75, 0.12, 0.7, 1, 0.8, 1), B(0.05, 0xff8fab, -0.72, 0.22, 0.78)], [X(0.28, 0.22, 0.02, 0, -0.45, 0.65, 0.69), X(0.28, 0.22, 0.02, 0, 0.45, 0.65, 0.69)]],
  // Hühnerstall: Holzhütte mit rotem Dach, Hühnerleiter und Futtertrog
  huehnerstall: () => [X(1.0, 0.7, 0.8, 0xe8c08a, 0, 0.55, -0.15), ...[-0.42, 0.42].flatMap(x => [-0.45, 0.15].map(z => X(0.08, 0.35, 0.08, WOODD, x, 0.17, z))),
    put(plain(new THREE.CylinderGeometry(0.01, 0.75, 0.45, 4, 1)), 0xe0503a, 0, 1.12, -0.15, 0, PI / 4), X(0.3, 0.3, 0.04, 0x5a3a2a, 0, 0.5, 0.26), X(0.25, 0.06, 0.7, WOOD, 0, 0.17, 0.55, -0.45),
    ...[0, 1, 2].map(i => X(0.24, 0.02, 0.04, WOODD, 0, 0.12 + i * 0.12, 0.38 + i * 0.13, -0.45)), X(0.6, 0.12, 0.22, WOODD, 0.55, 0.06, 0.55), X(0.5, 0.04, 0.16, 0xf2d27a, 0.55, 0.13, 0.55),
    B(0.04, 0xffffff, -0.3, 0.92, 0.26), B(0.04, 0xffffff, -0.22, 0.95, 0.26)],
  // Kuhweide: kleiner Stall mit Heuraufe und Zaunstück
  kuhweide: () => [X(1.1, 0.9, 0.7, 0xc0503a, 0, 0.45, -0.35), put(plain(new THREE.CylinderGeometry(0.01, 0.82, 0.45, 4, 1)), 0x8a5a36, 0, 1.12, -0.35, 0, PI / 4), X(0.4, 0.55, 0.04, WHITE, 0, 0.3, 0.01), X(0.06, 0.6, 0.05, WHITE, 0, 0.3, 0.03, 0, 0, 0.6), X(0.06, 0.6, 0.05, WHITE, 0, 0.3, 0.03, 0, 0, -0.6),
    X(0.7, 0.35, 0.3, WOODD, 0.25, 0.18, 0.5), X(0.6, 0.12, 0.25, 0xf2d27a, 0.25, 0.38, 0.5), ...[-0.65, 0.65].map(x => C(0.04, 0.04, 0.6, WOODD, x, 0.3, 0.85, 6)), X(1.3, 0.05, 0.04, WHITE, 0, 0.45, 0.85), X(1.3, 0.05, 0.04, WHITE, 0, 0.25, 0.85)],
  // Pokale vom Strand
  strandpokal: () => [C(0.18, 0.22, 0.12, 0x8a6040, 0, 0.06, 0, 14), C(0.06, 0.08, 0.25, 0xffd23f, 0, 0.24, 0, 10), put(plain(new THREE.CylinderGeometry(0.22, 0.1, 0.25, 16, 1, true)), 0xffd23f, 0, 0.48, 0), ...[-1, 1].map(s => T(0.08, 0.02, 0xffd23f, 0.22 * s, 0.5, 0, 0, H)),
    C(0.16, 0.18, 0.12, 0xf2dfa6, 0, 0.66, 0, 12), ...[[-0.1, 0], [0.1, 0], [0, 0.1]].map(([x, z]) => C(0.04, 0.05, 0.14, 0xe8cf90, x, 0.78, z, 8)), X(0.02, 0.1, 0.06, 0xff6b8a, 0, 0.92, 0.1)],
  windpokal: () => [C(0.18, 0.22, 0.12, 0x8a6040, 0, 0.06, 0, 14), C(0.06, 0.08, 0.25, 0xffd23f, 0, 0.24, 0, 10), put(plain(new THREE.CylinderGeometry(0.22, 0.1, 0.25, 16, 1, true)), 0xffd23f, 0, 0.48, 0), ...[-1, 1].map(s => T(0.08, 0.02, 0xffd23f, 0.22 * s, 0.5, 0, 0, H)),
    put(plain(new THREE.OctahedronGeometry(0.16, 0)).scale(1, 1.3, 0.15), 0x6cb4ff, 0, 0.9, 0, 0, 0, 0.2), C(0.005, 0.005, 0.3, 0xffffff, 0.06, 0.66, 0, 4)],
  // Seilbahn-Station: Holzplattform, zwei Masten, Seil nach oben und Gondel
  seilbahn: () => [[X(1.8, 0.16, 1.4, WOODD, 0, 0.08, 0), ...[-0.8, 0.8].map(x => C(0.08, 0.1, 2.6, 0x8a8e98, x, 1.3, -0.5, 8)), X(1.8, 0.12, 0.12, 0x8a8e98, 0, 2.55, -0.5), put(plain(new THREE.CylinderGeometry(0.01, 0.01, 6, 4)), 0x4a3a3a, 0.3, 4.6, -3.0, 1.0),
    X(0.75, 0.55, 0.55, 0xff8fab, 0.3, 1.75, -0.5), X(0.6, 0.25, 0.04, SKY, 0.3, 1.85, -0.22), put(plain(new THREE.ConeGeometry(0.45, 0.2, 4)), 0xffffff, 0.3, 2.12, -0.5, 0, PI / 4), C(0.015, 0.015, 0.35, DARK, 0.3, 2.35, -0.5, 4),
    X(0.5, 0.35, 0.05, CREAM, -0.6, 0.55, 0.6), C(0.04, 0.04, 0.5, WOODD, -0.6, 0.25, 0.6, 6)], [B(0.06, 0, -0.8, 2.65, -0.5), B(0.06, 0, 0.8, 2.65, -0.5)]],
  // Riffboje (draußen im Meer)
  riffboje: () => [[C(0.22, 0.3, 0.5, 0xff6b6b, 0, 0.1, 0, 14), C(0.23, 0.23, 0.12, WHITE, 0, 0.2, 0, 14), C(0.03, 0.03, 0.7, DARK, 0, 0.65, 0, 6)], [B(0.08, 0, 0, 1.02, 0)]],
  // Nachtmarkt-Stand (nur freitags ab 18 Uhr, gehört zur Kulisse)
  nachtstand: () => {
    const p = [X(1.6, 0.08, 0.8, 0x5a3a5a, 0, 0.75, 0), X(1.6, 0.65, 0.06, 0x6a4a6a, 0, 0.42, 0.4), ...[-0.76, 0.76].flatMap(x => [-0.36, 0.36].map(z => X(0.07, 1.7, 0.07, 0x4a2f4a, x, 0.85, z))), X(1.8, 0.08, 1.0, NAVY, 0, 1.72, 0)];
    for (let i = 0; i < 7; i++) p.push(K(0.14, 0.18, i % 2 ? 0xffe066 : 0xb08cff, -0.8 + i * 0.27, 1.62, 0.5, 6, PI));
    p.push(X(0.18, 0.18, 0.18, LILA, -0.45, 0.88, 0), B(0.11, 0x8fd4ff, 0.05, 0.9, 0), X(0.22, 0.1, 0.16, BRASS, 0.45, 0.84, 0));
    return [p, [B(0.09, 0, -0.62, 1.45, 0.42), B(0.09, 0, 0.62, 1.45, 0.42), B(0.06, 0, 0, 1.5, 0.45)]];
  },
};

// ---------- Möbel ----------
export const FURN_X = {
  sternglobus: () => [[C(0.18, 0.24, 0.1, WOODD, 0, 0.05, 0, 16), C(0.03, 0.03, 0.3, BRASS, 0, 0.25, 0, 8), T(0.32, 0.015, BRASS, 0, 0.72, 0, 0, H), B(0.28, NAVY, 0, 0.72, 0, 1, 1, 1, 16, 12)],
    [star(0.06, 0, 0.12, 0.85, 0.24), star(0.05, 0, -0.15, 0.66, 0.24), star(0.04, 0, 0.05, 0.58, 0.27), star(0.045, 0, -0.05, 0.92, 0.22)]],
  mondsessel: () => [soft(0.9, 0.3, 0.8, LILA, 0, 0.3, 0, 0.35), put(plain(new THREE.TorusGeometry(0.42, 0.13, 10, 24, PI * 1.2)), 0xffe066, 0, 0.62, -0.25, 0, 0, -0.1 * PI), B(0.05, WHITE, 0.25, 0.85, -0.2), B(0.04, WHITE, -0.3, 0.95, -0.22), ...[[-0.32, 0.28], [0.32, 0.28], [-0.32, -0.28], [0.32, -0.28]].map(([x, z]) => C(0.04, 0.03, 0.16, BRASS, x, 0.08, z, 8))],
  regenbogenregal: () => [...RAINBOW.map((c, i) => put(plain(new THREE.TorusGeometry(0.5 - i * 0.06, 0.03, 8, 24, PI)), c, 0, 0.12, -0.1)), X(0.95, 0.06, 0.3, WHITE, 0, 0.1, -0.05), X(0.6, 0.04, 0.24, WHITE, 0, 0.42, -0.05),
    B(0.06, 0xff8fab, -0.2, 0.5, -0.05), X(0.1, 0.12, 0.08, 0x6cb4ff, 0.15, 0.5, -0.05), B(0.05, 0xffe066, 0.3, 0.18, 0), X(0.12, 0.1, 0.1, LEAF, -0.3, 0.18, 0)],
  leuchtturmmodell: () => [[C(0.22, 0.26, 0.12, 0x9a948e, 0, 0.06, 0, 16), C(0.13, 0.17, 0.9, WHITE, 0, 0.57, 0, 16), C(0.135, 0.15, 0.12, 0xff6b6b, 0, 0.35, 0, 16), C(0.132, 0.14, 0.12, 0xff6b6b, 0, 0.7, 0, 16), C(0.16, 0.16, 0.04, DARK, 0, 1.03, 0, 16), K(0.15, 0.18, 0xff6b6b, 0, 1.33, 0, 16), C(0.12, 0.12, 0.2, GLASS, 0, 1.14, 0, 12)], [B(0.08, 0, 0, 1.14, 0)]],
  lumilaterne: () => [[C(0.14, 0.18, 0.06, DARK, 0, 0.03, 0, 12), C(0.02, 0.02, 0.7, DARK, 0, 0.38, 0, 6), T(0.1, 0.015, DARK, 0, 0.98, 0, 0), C(0.17, 0.17, 0.32, GLASS, 0, 0.88, 0, 12), C(0.19, 0.19, 0.04, BRASS, 0, 1.05, 0, 12), C(0.19, 0.19, 0.04, BRASS, 0, 0.72, 0, 12)],
    [B(0.03, 0, 0.05, 0.9, 0.04), B(0.025, 0, -0.06, 0.82, -0.03), B(0.025, 0, 0.0, 0.96, -0.06), B(0.02, 0, -0.04, 0.88, 0.07), B(0.02, 0, 0.07, 0.8, -0.05)]],
  sternkarte: () => [soft(0.8, 0.6, 0.04, 0xe8b86a, 0, 1.45, -0.465, 0.3), X(0.7, 0.5, 0.02, NAVY, 0, 1.45, -0.44), ...[[-0.2, 1.55], [0.15, 1.6], [0.25, 1.35], [-0.1, 1.32], [0.02, 1.48]].map(([x, y], i) => star(0.035 + (i % 2) * 0.015, 0xffe066, x, y, -0.425, 0.01)),
    put(plain(new THREE.TorusGeometry(0.16, 0.006, 4, 24, PI * 1.4)), 0xbfd4ff, 0.02, 1.45, -0.428, 0, 0, 0.5)],
  windspiel: () => [C(0.18, 0.18, 0.03, WOOD, 0, 1.75, -0.32, 12), C(0.008, 0.008, 0.2, DARK, 0, 1.87, -0.32, 4), ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * TAU; return C(0.004, 0.004, 0.3, 0xcccccc, Math.cos(a) * 0.14, 1.58, -0.32 + Math.sin(a) * 0.14, 4); }),
    ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * TAU; return B(0.045, [0xffd6e0, 0xfff1c9, 0xd6ecff, 0xe2d6ff, 0xd8f5e6][i], Math.cos(a) * 0.14, 1.42 - (i % 2) * 0.06, -0.32 + Math.sin(a) * 0.14, 1, 0.6, 0.35); })],
  spieluhr: () => [X(0.42, 0.22, 0.32, 0xd9a0a0, 0, 0.11, 0), X(0.44, 0.04, 0.34, BRASS, 0, 0.23, 0), C(0.13, 0.13, 0.03, CREAM, 0, 0.26, 0, 16), C(0.012, 0.012, 0.2, BRASS, 0, 0.36, 0, 6),
    B(0.05, PINK, 0, 0.32, 0.07, 1, 1.2, 1), B(0.035, PINK, 0, 0.4, 0.07), K(0.09, 0.1, ROSE, 0, 0.5, 0, 10), ...[0, 1, 2].map(i => X(0.04, 0.1, 0.03, WHITE, Math.cos(i * 2.1) * 0.1, 0.32, Math.sin(i * 2.1) * 0.1)), C(0.02, 0.02, 0.08, BRASS, 0.23, 0.12, 0, 6, 0, 0, H)],
  schneekugel: () => [[C(0.17, 0.2, 0.12, WOODD, 0, 0.06, 0, 16), B(0.2, GLASS, 0, 0.3, 0, 1, 1, 1, 16, 12), B(0.1, 0xf2dfa6, 0, 0.16, 0, 1, 0.3, 1), C(0.015, 0.02, 0.12, 0xa8784a, 0.0, 0.24, 0, 6), B(0.06, LEAF, 0.02, 0.32, 0)],
    [B(0.012, 0, 0.08, 0.38, 0.05), B(0.01, 0, -0.06, 0.42, 0.02), B(0.012, 0, 0.0, 0.25, 0.12), B(0.01, 0, -0.1, 0.3, -0.06)]],
  // Geschenke am Ende der Nachbar-Geschichten
  zimtofen: () => [[soft(0.7, 0.75, 0.6, 0xe8a07a, 0, 0.38, 0, 0.45), C(0.22, 0.22, 0.04, DARK, 0, 0.36, 0.28, 16, H), C(0.06, 0.07, 0.4, 0xc06a4a, 0.18, 0.9, -0.1, 8), B(0.06, 0xa8643a, -0.15, 0.78, 0.15, 1.4, 0.5, 1), B(0.05, 0xf2d27a, 0.1, 0.78, 0.2, 1.3, 0.5, 1)], [B(0.14, 0, 0, 0.32, 0.27, 1.2, 0.8, 0.3)]],
  schnitzbank: () => [X(1.7, 0.08, 0.55, WOOD, 0, 0.62, 0), ...[-0.75, 0.75].flatMap(x => [-0.2, 0.2].map(z => X(0.07, 0.62, 0.07, WOODD, x, 0.31, z))), X(1.5, 0.05, 0.4, WOODD, 0, 0.2, 0),
    ...[0, 1, 2].map(i => B(0.06, 0xd9a86c, -0.5 + i * 0.25, 0.72, 0.05, 0.8, 1.2, 0.8)), X(0.25, 0.04, 0.06, METAL, 0.45, 0.68, -0.1), C(0.02, 0.02, 0.18, WOODD, 0.6, 0.68, 0.1, 6, 0, 0, H), B(0.1, 0xe0b090, 0.2, 0.75, 0.1, 1, 1.4, 0.8), K(0.06, 0.09, 0xff8a3a, 0.2, 0.92, 0.12, 4)],
  gluecksboje: () => [[C(0.25, 0.3, 0.55, 0xff6b6b, 0, 0.28, 0, 14), C(0.255, 0.27, 0.12, WHITE, 0, 0.35, 0, 14), C(0.255, 0.255, 0.1, WHITE, 0, 0.12, 0, 14), C(0.04, 0.04, 0.4, DARK, 0, 0.75, 0, 6), T(0.12, 0.025, 0xffd23f, 0, 0.6, 0, 0)], [B(0.1, 0, 0, 0.98, 0)]],
  staffelei: () => [...[-0.25, 0.25].map(x => C(0.025, 0.025, 1.5, WOODD, x, 0.75, 0, 6, -0.12)), C(0.025, 0.025, 1.4, WOODD, 0, 0.68, -0.3, 6, 0.3), X(0.6, 0.04, 0.08, WOOD, 0, 0.55, 0.08),
    X(0.62, 0.48, 0.04, WHITE, 0, 0.83, 0.1, -0.12), X(0.56, 0.14, 0.01, SKY, 0, 0.95, 0.125, -0.12), X(0.56, 0.12, 0.01, 0x8fd694, 0, 0.72, 0.15, -0.12), B(0.06, 0xffe066, 0.15, 0.97, 0.13), B(0.04, 0xff8fab, -0.12, 0.74, 0.16),
    soft(0.3, 0.03, 0.22, 0xd9a86c, -0.45, 0.58, 0.15, 0.4), ...[0xff6b6b, 0x6cb4ff, 0xffe066].map((c, i) => B(0.025, c, -0.52 + i * 0.06, 0.6, 0.15))],
  teetischchen: () => [C(0.38, 0.38, 0.05, WOOD, 0, 0.42, 0, 20), C(0.05, 0.08, 0.4, WOODD, 0, 0.2, 0, 8), C(0.2, 0.24, 0.04, WOODD, 0, 0.02, 0, 12),
    B(0.11, 0xa8d8c8, 0, 0.55, 0, 1.1, 0.9, 1.1), C(0.02, 0.03, 0.12, 0xa8d8c8, 0.13, 0.57, 0, 6, 0, 0, -0.8), B(0.03, 0xa8d8c8, 0, 0.66, 0), ...[0, 1, 2].map(i => C(0.05, 0.04, 0.06, WHITE, Math.cos(i * 2.1 + 0.5) * 0.25, 0.48, Math.sin(i * 2.1 + 0.5) * 0.25, 10)), B(0.06, 0xf2d27a, -0.12, 0.47, 0.22, 1.2, 0.4, 1)],
  sternteleskop: () => [...[0, 1, 2].map(i => C(0.02, 0.025, 0.9, BRASS, Math.cos(i * 2.1) * 0.2, 0.42, Math.sin(i * 2.1) * 0.2, 6, Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25)), B(0.06, BRASS, 0, 0.85, 0),
    C(0.07, 0.1, 0.8, NAVY, 0, 1.05, 0.15, 14, -0.9), C(0.105, 0.105, 0.05, BRASS, 0, 1.32, 0.5, 14, -0.9), C(0.075, 0.075, 0.05, BRASS, 0, 0.82, -0.17, 14, -0.9), star(0.04, 0xffe066, 0.06, 1.05, 0.22, 0.01)],
  korallenlampe: () => [[C(0.16, 0.2, 0.1, 0xf2e6d6, 0, 0.05, 0, 14), ...[[0, 0.35, 0, 0], [0.1, 0.3, 0.05, 0.5], [-0.1, 0.28, -0.03, -0.5], [0.03, 0.25, -0.1, 0.3]].map(([x, h, z, r]) => C(0.03, 0.045, h, 0xff7b8a, x, 0.1 + h / 2, z, 6, 0, 0, r))],
    [...[[0, 0.48, 0], [0.18, 0.4, 0.05], [-0.18, 0.38, -0.03], [0.07, 0.33, -0.13]].map(([x, y, z]) => B(0.045, 0, x, y, z))]],
  musterbild: () => [soft(0.74, 0.74, 0.05, 0xe8b86a, 0, 1.45, -0.465, 0.3), X(0.6, 0.6, 0.02, WHITE, 0, 1.45, -0.44)],
};
