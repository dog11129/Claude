// Inselleben 13: die drei Gebiete neu eingerichtet. Kiefernwald mit Bach, Holzbrücke und Lichtung am Lagerfeuer,
// Blütenwiese mit Blumenfeldern, Seerosenteich, Windmühle und Lattenzaun am Weg, Kristallhöhle mit großem See,
// Kristallgruppen, Lore und Glühwürmchen an der Decke. Nur Anzeige – was begehbar ist, steht in areas.js.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import { placeable } from './nature.js';
import { fencePiece } from './plants.js';
import { AREAS, NODES, pathX, BROOK_Z, POND, MILL, CAVE_LAKE, CAMPFIRE, CART, MEADOW_FENCE, areaBlock } from './areas.js';

const lcg = i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647);
const at = (parts, X, Z) => parts.map(q => (q.g.translate(X, 0, Z), q));
const TAU = Math.PI * 2;

// Fundstellen: Baumstumpf (Wald), Kleefeld (Wiese), Kristallnest (Höhle)
export function spotModel(id) {
  if (id === 'wald') return bm('zone13_stump', [M.cyl(0.3, 0.38, 0.34, 0x8a5a36, 0, 0.17, 0, 10), M.cyl(0.29, 0.29, 0.02, 0xe0b98a, 0, 0.345, 0, 10), M.cyl(0.16, 0.16, 0.022, 0xc99a66, 0.02, 0.347, 0.01, 8),
    M.ball(0.16, 0x6fae52, -0.26, 0.1, 0.16, 1.2, 0.6, 1), M.ball(0.1, 0x7fbf5c, 0.2, 0.34, -0.1, 1.3, 0.5, 1), M.cyl(0.025, 0.03, 0.12, 0xfff2dc, 0.3, 0.06, 0.2, 6), M.ball(0.07, 0xe8302a, 0.3, 0.14, 0.2, 1, 0.6, 1, 7),
    M.cyl(0.05, 0.07, 0.3, 0x7a4e2e, -0.3, 0.08, -0.2, 6, 0, 0, 1.2)]);
  if (id === 'wiese') {
    const p = [M.ball(0.42, 0x6fbf5a, 0, 0.02, 0, 1, 0.12, 1, 10)];
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.08 + (i % 4) * 0.09, x = Math.cos(a) * r, z = Math.sin(a) * r; for (let k = 0; k < 3; k++) p.push(M.ball(0.055, i % 3 ? 0x58b04c : 0x4aa044, x + Math.cos(a + k * 2.1) * 0.05, 0.07, z + Math.sin(a + k * 2.1) * 0.05, 1, 0.35, 1, 6)); }
    for (let i = 0; i < 5; i++) { const a = i * 1.9 + 0.4, x = Math.cos(a) * 0.24, z = Math.sin(a) * 0.24; p.push(M.cyl(0.008, 0.01, 0.14, 0x58b04c, x, 0.1, z, 4), M.ball(0.045, i % 2 ? 0xffffff : 0xffd9e8, x, 0.19, z, 1, 0.9, 1, 7)); }
    return bm('zone13_clover', p);
  }
  return bmv('zone13_nest', [M.ball(0.4, 0x6a6078, 0, 0.1, 0, 1.15, 0.5, 1, 9), M.ball(0.2, 0x7a7088, 0.3, 0.12, 0.2, 1, 0.7, 1, 7), M.ball(0.18, 0x5a5068, -0.32, 0.1, -0.12, 1, 0.7, 1, 7)],
    [M.cone(0.09, 0.5, 0x9ff0ff, 0, 0.4, 0, 5), M.cone(0.07, 0.36, 0xc9a8ff, 0.16, 0.3, 0.08, 5, 0, 0, -0.4), M.cone(0.07, 0.32, 0xff9ad8, -0.15, 0.28, 0.06, 5, 0, 0, 0.45), M.cone(0.05, 0.26, 0x9ff0ff, 0.02, 0.26, -0.16, 5, -0.5)]);
}

export function decorateArea13(g, id, put) {
  const A = AREAS[id], X = A.x, Z = A.z, W = A.w, D = A.d, rnd = lcg(id.length * 4242 + 13), parts = [], glow = [];
  const far = (x, z, r) => Math.abs(x - pathX(id, z)) > r && !areaBlock(id, x, z, 0.8) && !NODES[id].some(n => Math.hypot(n.x - x, n.z - z) < 1.3) && !(Math.abs(x) < 2.5 && z > D - 3);
  const spot = (r = 1.6) => { for (let t = 0; t < 40; t++) { const x = (rnd() * 2 - 1) * (W - 0.6), z = (rnd() * 2 - 1) * (D - 0.6); if (far(x, z, r)) return [x, z]; } return null; };
  if (id === 'wald') {
    // Waldboden: dunklere Nadel-Flecken, helle Lichtung in der Mitte
    for (let i = 0; i < 16; i++) parts.push(M.cyl(1.2 + rnd() * 1.3, 1.2, 0.012, i % 2 ? 0x5fa04c : 0x76ad58, (rnd() * 2 - 1) * W, -0.012, (rnd() * 2 - 1) * D, 12));
    parts.push(M.cyl(3.2, 3.2, 0.014, 0x93d472, 0, -0.008, 0, 20));
    // Bach quer durch den Wald, mit Steinen am Ufer
    const water = [];
    for (let x = -W - 4; x <= W + 4; x += 0.5) water.push(M.cyl(0.82, 0.82, 0.02, 0x8fd0f0, x, -0.004, BROOK_Z(x), 10));
    for (let x = -W - 4; x <= W + 4; x += 0.9) water.push(M.cyl(0.5, 0.5, 0.02, 0xb8e6fa, x + 0.2, -0.002, BROOK_Z(x + 0.2) + Math.sin(x * 3) * 0.2, 8));
    g.add(bm('zone13_brook', at(water, X, Z), [], false));
    for (let i = 0; i < 22; i++) { const x = (rnd() * 2 - 1) * (W + 2), s = rnd() < 0.5 ? -1 : 1, r = 0.12 + rnd() * 0.16; if (Math.abs(x - pathX(id, BROOK_Z(x))) > 1.6) parts.push(M.ball(r, i % 3 ? 0xa9a199 : 0xc8c0b8, x, r * 0.3, BROOK_Z(x) + s * (0.75 + rnd() * 0.3), 1.2, 0.6, 1, 7)); }
    // Holzbrücke, wo der Weg den Bach kreuzt
    let bz = -5.2; for (let k = 0; k < 6; k++) bz = BROOK_Z(pathX(id, bz));
    const bx = pathX(id, bz);
    for (let k = -3; k <= 3; k++) parts.push(M.box(1.9, 0.07, 0.3, k % 2 ? 0xd9a86c : 0xc9925a, bx, 0.07, bz + k * 0.33));
    for (const sx of [-1, 1]) { parts.push(M.cyl(0.07, 0.07, 2.5, 0x9f6b46, bx + sx * 0.9, 0.34, bz, 7, Math.PI / 2)); for (const sz of [-1.1, 0, 1.1]) parts.push(M.cyl(0.05, 0.055, 0.36, 0x8a5a36, bx + sx * 0.9, 0.18, bz + sz, 6)); }
    // Lichtung: Lagerfeuer mit Baumstumpf-Hockern
    put(g, placeable('lagerfeuer'), X + CAMPFIRE[0], Z + CAMPFIRE[1]);
    for (let i = 0; i < 3; i++) { const a = i * 1.5 + 2.2; parts.push(M.cyl(0.24, 0.28, 0.28, 0x8a5a36, CAMPFIRE[0] + Math.cos(a) * 1.15, 0.14, CAMPFIRE[1] + Math.sin(a) * 1.15, 9), M.cyl(0.23, 0.23, 0.02, 0xe0b98a, CAMPFIRE[0] + Math.cos(a) * 1.15, 0.285, CAMPFIRE[1] + Math.sin(a) * 1.15, 9)); }
    // Farne, bemooste Felsen, ein umgestürzter Stamm
    for (let i = 0; i < 18; i++) { const p = spot(1.5); if (!p) continue; const f = placeable('farnbusch'); f.scale.setScalar(0.75 + rnd() * 0.4); put(g, f, X + p[0], Z + p[1], rnd() * 6); }
    for (let i = 0; i < 9; i++) { const p = spot(1.9); if (!p) continue; const r = 0.3 + rnd() * 0.3; parts.push(M.ball(r, 0x9a938c, p[0], r * 0.45, p[1], 1.2, 0.75, 1, 8), M.ball(r * 0.6, 0x6fae52, p[0] - r * 0.2, r * 0.8, p[1] + r * 0.1, 1.2, 0.4, 1, 7)); }
    parts.push(M.cyl(0.3, 0.34, 2.8, 0x8a5a36, W - 4.5, 0.3, D - 3.2, 9, 0, 0.5, Math.PI / 2), M.ball(0.3, 0x6fae52, W - 4.9, 0.58, D - 3.4, 1.6, 0.4, 1, 7), M.ball(0.2, 0x7fbf5c, W - 3.8, 0.58, D - 2.9, 1.4, 0.4, 1, 7));
  } else if (id === 'wiese') {
    // Blumenfelder in Farbbändern (je ein Netz), dazwischen helles Gras
    const FIELDS = [[-10, 4.5, 0xff8fab, 0xffc4d2], [9, 2.5, 0xffd95c, 0xfff0a8], [-4.5, -8, 0xb39cff, 0xd9c8ff], [5.5, -2.2, 0xffffff, 0xffe9f0], [11, 7.5, 0xff9a5c, 0xffc89a], [-11.5, -0.5, 0x8fd4ff, 0xc8ecff]];
    FIELDS.forEach(([fx, fz, c1, c2], fi) => {
      const p = [M.cyl(2.6, 2.6, 0.012, 0xa2e07c, fx, -0.01, fz, 16)];
      for (let i = 0; i < 34; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 2.4, x = fx + Math.cos(a) * r * 1.15, z = fz + Math.sin(a) * r * 0.85, h = 0.2 + rnd() * 0.16; if (!far(x, z, 1.2)) continue;
        p.push(M.cyl(0.012, 0.014, h, 0x58b04c, x, h / 2, z, 4), M.ball(0.07, i % 3 ? c1 : c2, x, h + 0.03, z, 1, 0.6, 1, 7), M.ball(0.028, 0xffd23f, x, h + 0.06, z, 1, 0.6, 1, 5)); }
      g.add(bm('zone13_field_' + fi, at(p, X, Z), [], false));
    });
    // Seerosenteich mit Schilf
    const pond = new THREE.Mesh(new THREE.CircleGeometry(POND[2] - 0.1, 40), new THREE.MeshLambertMaterial({ color: 0x6fc0ea, transparent: true, opacity: 0.9 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(X + POND[0], 0.015, Z + POND[1]); g.add(pond);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = 0.2 + (i % 3) * 0.07; parts.push(M.ball(r, i % 2 ? 0xc8c0b8 : 0xa9a199, POND[0] + Math.cos(a) * POND[2], r * 0.3, POND[1] + Math.sin(a) * POND[2], 1.2, 0.6, 1, 7)); }
    for (let i = 0; i < 7; i++) { const a = i * 2.3, r = 0.5 + (i % 3) * 0.55, x = POND[0] + Math.cos(a) * r, z = POND[1] + Math.sin(a) * r; parts.push(M.cyl(0.22, 0.22, 0.012, 0x4fa156, x, 0.03, z, 9)); if (i % 2) parts.push(M.ball(0.08, 0xffb7c8, x, 0.08, z, 1, 0.7, 1, 7), M.ball(0.035, 0xffe066, x, 0.12, z)); }
    for (let i = 0; i < 9; i++) { const a = 2.4 + i * 0.22, x = POND[0] + Math.cos(a) * (POND[2] + 0.15), z = POND[1] + Math.sin(a) * (POND[2] + 0.15), h = 0.7 + (i % 3) * 0.2; parts.push(M.cyl(0.012, 0.016, h, 0x6fae52, x, h / 2, z, 4), M.cyl(0.03, 0.03, 0.16, 0x7a4e2e, x, h, z, 5)); }
    // Windmühle mit Heuballen, Lattenzaun am Weg, Picknickdecke
    const mill = placeable('windmuehle'); mill.scale.setScalar(0.9); put(g, mill, X + MILL[0], Z + MILL[1], -0.5);
    for (const [hx, hz] of [[8.2, -6.2], [8.8, -9], [12.6, -6]]) put(g, placeable('heu'), X + hx, Z + hz, hx);
    for (const [fx, fz] of MEADOW_FENCE) put(g, fencePiece('latten', 5), X + fx, Z + fz);
    put(g, placeable('picknickdecke'), X + 5, Z + 4.5, 0.4);
  } else {
    // Seeufer: Felsen und leuchtende Kristalle
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = CAVE_LAKE[0] + Math.cos(a) * (CAVE_LAKE[2] + 0.1), z = CAVE_LAKE[1] + Math.sin(a) * (CAVE_LAKE[2] + 0.1), r = 0.22 + (i % 3) * 0.1;
      parts.push(M.ball(r, i % 2 ? 0x6e6478 : 0x7e748a, x, r * 0.35, z, 1.2, 0.7, 1, 7)); if (i % 3 === 0) glow.push(M.cone(0.08, 0.5, [0x9ff0ff, 0xc9a8ff, 0x8fd4ff][i % 3], x, 0.35, z, 5, 0, 0, (i % 2 ? 1 : -1) * 0.3)); }
    for (let i = 0; i < 5; i++) glow.push(M.ball(0.05, 0x9ff0ff, CAVE_LAKE[0] + Math.cos(i * 1.4) * 1.3, 0.05, CAVE_LAKE[1] + Math.sin(i * 1.4) * 1.3, 1, 0.5, 1, 6));
    // Kristallgruppen an den Wänden
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + 0.2, x = Math.cos(a) * (W - 0.4), z = Math.sin(a) * (D - 0.4); if (z > D - 2 && Math.abs(x) < 3) continue;
      parts.push(M.ball(0.45, 0x5a5068, x, 0.14, z, 1.2, 0.5, 1, 8));
      for (let k = 0; k < 4; k++) glow.push(M.cone(0.1 - k * 0.012, 0.9 - k * 0.16, [0xc9a8ff, 0x8fd4ff, 0xff9ad8, 0x9ff0ff][(i + k) % 4], x + (k - 1.5) * 0.17, 0.5 - k * 0.07, z + (k % 2) * 0.14, 5, (rnd() - 0.5) * 0.5, 0, (k - 1.5) * 0.22)); }
    // Lore auf einem Stück Gleis
    const [cx, cz] = CART;
    parts.push(M.box(4.4, 0.04, 0.06, 0x4a4352, cx - 1.4, 0.03, cz - 0.3), M.box(4.4, 0.04, 0.06, 0x4a4352, cx - 1.4, 0.03, cz + 0.3), ...Array.from({ length: 8 }, (_, i) => M.box(0.14, 0.03, 0.86, 0x7a5a3a, cx - 3.4 + i * 0.58, 0.015, cz)),
      M.box(0.95, 0.5, 0.7, 0x8a6a4a, cx, 0.43, cz), M.box(1.02, 0.07, 0.77, 0x5a4a3a, cx, 0.7, cz), ...[[-0.3, -0.33], [0.3, -0.33], [-0.3, 0.33], [0.3, 0.33]].map(([dx, dz]) => M.cyl(0.14, 0.14, 0.06, 0x3d3f4a, cx + dx, 0.15, cz + dz, 10, Math.PI / 2)));
    parts.push(M.ball(0.2, 0x8a8094, cx - 0.15, 0.78, cz, 1, 0.7, 1, 7), M.ball(0.16, 0x7a7084, cx + 0.2, 0.76, cz + 0.1, 1, 0.7, 1, 7));
    glow.push(M.cone(0.07, 0.24, 0xffd96a, cx + 0.05, 0.9, cz - 0.12, 5), M.cone(0.06, 0.2, 0xc9a8ff, cx - 0.2, 0.9, cz + 0.12, 5, 0, 0, 0.4));
    // Glühwürmchen an der Decke
    for (let i = 0; i < 60; i++) glow.push(M.ball(0.035 + rnd() * 0.02, i % 4 ? 0xbfe8ff : 0xe8d0ff, (rnd() * 2 - 1) * W, 3.4 + rnd() * 1.6, (rnd() * 2 - 1) * D, 1, 1, 1, 5));
  }
  if (parts.length || glow.length) g.add(bmv('zone13_extra_' + id, at(parts, X, Z), at(glow, X, Z)));
}
