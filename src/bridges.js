// Holzbrücken über den Fluss und der Steg ins Meer – als Bauteil-Liste (für models.merge und den Blender-Export)
import * as M from './models.js';
import { riverX, RIVER_W, BRIDGES, BRIDGE_W, PIER } from './island.js';

export function bridgeParts() {
  const p = [], W = 0xc9945e, WD = 0x9a6a40, L = 0xe3b47c;
  for (const bz of BRIDGES) {
    const x0 = riverX(bz), len = (RIVER_W + 0.75) * 2;
    for (let i = 0; i < 11; i++) {
      const t = i / 10 - 0.5, x = x0 + t * len, y = 0.06 + Math.cos(t * Math.PI) * 0.12;
      p.push(M.box(len / 10.5, 0.08, BRIDGE_W * 2, i % 2 ? W : L, x, y, bz));
    }
    for (const sz of [-1, 1]) {
      const z = bz + sz * (BRIDGE_W - 0.05);
      for (let i = 0; i <= 4; i++) { const t = i / 4 - 0.5, x = x0 + t * len; p.push(M.cyl(0.05, 0.06, 0.55, WD, x, 0.3 + Math.cos(t * Math.PI) * 0.1, z, 7), M.ball(0.07, WD, x, 0.6 + Math.cos(t * Math.PI) * 0.1, z, 1, 1, 1, 9)); }
      for (let i = 0; i < 8; i++) {
        const t0 = i / 8 - 0.5, t1 = (i + 1) / 8 - 0.5, xa = x0 + t0 * len, xb = x0 + t1 * len;
        const ya = 0.55 + Math.cos(t0 * Math.PI) * 0.12, yb = 0.55 + Math.cos(t1 * Math.PI) * 0.12;
        p.push(M.box(xb - xa + 0.02, 0.07, 0.08, W, (xa + xb) / 2, (ya + yb) / 2, z, 0, 0, Math.atan2(yb - ya, xb - xa)));
      }
      // kleine Blumenkästen an den Brückenenden
      for (const e of [-1, 1]) {
        const x = x0 + e * (len / 2 + 0.05);
        p.push(M.box(0.3, 0.14, 0.18, 0xe58e66, x, 0.07, z + sz * 0.12), M.ball(0.11, 0x6cc06a, x, 0.18, z + sz * 0.12, 1.3, 0.7, 0.9, 9),
          M.ball(0.04, 0xff8fab, x - 0.07, 0.24, z + sz * 0.16, 1, 1, 1, 7), M.ball(0.04, 0xffe066, x + 0.06, 0.24, z + sz * 0.15, 1, 1, 1, 7));
      }
    }
  }
  const { x, z0, z1, w } = PIER;
  for (let z = z0; z < z1; z += 0.42) p.push(M.box(w * 2, 0.07, 0.38, Math.round(z * 3) % 2 ? W : L, x, 0.02, z + 0.21));
  for (let z = z0 + 1.4; z < z1; z += 1.6) for (const sx of [-1, 1]) p.push(M.cyl(0.07, 0.08, 1.4, WD, x + sx * (w - 0.05), -0.55, z, 8));
  for (const sx of [-1, 1]) p.push(M.cyl(0.08, 0.08, 0.55, WD, x + sx * (w - 0.05), 0.25, z1 - 0.2, 8), M.ball(0.1, WD, x + sx * (w - 0.05), 0.55, z1 - 0.2, 1, 0.7, 1, 9));
  // Rettungsring am Stegende
  p.push(M.cyl(0.02, 0.02, 0.3, WD, x + w - 0.05, 0.42, z1 - 0.8, 6));
  return p;
}
