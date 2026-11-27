// Nachbarn gehen um Gebäude, Deko, Bäume und Wasser herum statt hindurch.
// Ihr Wunschplatz kommt weiter aus npcPos (auf allen Geräten gleich); liegt er in etwas drin, nehmen sie das nächste freie Feld.
// Ist der direkte Weg verstellt, suchen sie einen Weg auf dem Kachelraster (A*) und laufen ihn ab.
import { blocked } from './state.js';

const R = 0.22; // halbe Körperbreite
const freeAt = (s, x, z) => !(s.terra && s.terra[Math.round(x) + ',' + Math.round(z)]) && !blocked(s, x, z) && !blocked(s, x + R, z) && !blocked(s, x - R, z) && !blocked(s, x, z + R) && !blocked(s, x, z - R);
function clear(s, ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
  for (let i = 1; i <= n; i++) if (!freeAt(s, ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false;
  return true;
}
// nächstes freies Feld um (x, z)
export function freeSpot(s, x, z) {
  if (freeAt(s, x, z)) return [x, z];
  const rx = Math.round(x), rz = Math.round(z);
  for (let r = 1; r <= 4; r++) {
    let best = null, bd = Infinity;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r || !freeAt(s, rx + i, rz + j)) continue;
      const d = Math.hypot(rx + i - x, rz + j - z);
      if (d < bd) { bd = d; best = [rx + i, rz + j]; }
    }
    if (best) return best;
  }
  return null;
}
// A* auf Kacheln, 8 Richtungen (schräg nur, wenn beide Nachbarn frei sind)
export function findWay(s, fx, fz, tx, tz, max = 1600) {
  const sx = Math.round(fx), sz = Math.round(fz), ex = Math.round(tx), ez = Math.round(tz), K = (x, z) => x * 4096 + z, ok = new Map();
  const okAt = (x, z) => { const k = K(x, z); if (!ok.has(k)) ok.set(k, freeAt(s, x, z)); return ok.get(k); };
  const open = [[Math.hypot(ex - sx, ez - sz), 0, sx, sz]], g = new Map([[K(sx, sz), 0]]), from = new Map();
  let n = 0;
  while (open.length && n++ < max) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, gc, x, z] = open.splice(bi, 1)[0];
    if (x === ex && z === ez) {
      const path = [];
      for (let k = K(x, z); from.has(k); k = from.get(k)) path.unshift([Math.floor((k + 2048) / 4096), ((k + 2048) % 4096 + 4096) % 4096 - 2048]);
      return path;
    }
    if (gc > g.get(K(x, z))) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (!okAt(nx, nz) || (dx && dz && (!okAt(x + dx, z) || !okAt(x, z + dz)))) continue;
      const ng = gc + (dx && dz ? 1.414 : 1), k = K(nx, nz);
      if (ng >= (g.get(k) ?? Infinity)) continue;
      g.set(k, ng); from.set(k, K(x, z));
      open.push([ng + Math.hypot(ex - nx, ez - nz), ng, nx, nz]);
    }
  }
  return null;
}
// Ein Schritt: gibt die Blickrichtung zurück, wenn der Nachbar gerade einen Umweg läuft (sonst null)
export function npcStep(s, e, tx, tz, dt, k, now) {
  const stuck = !freeAt(s, e.x, e.z); // z. B. wurde gerade etwas auf ihn gestellt: frei herauslaufen lassen
  const spot = (e.tk === `${tx.toFixed(1)},${tz.toFixed(1)}` && e.tspot) || (e.tspot = freeSpot(s, tx, tz), e.tk = `${tx.toFixed(1)},${tz.toFixed(1)}`, e.tspot);
  if (!spot) return null;
  const [gx, gz] = spot, far = Math.hypot(gx - e.x, gz - e.z);
  if (stuck || far > 14) { e.x += (gx - e.x) * k; e.z += (gz - e.z) * k; e.way = null; return null; }
  if (!e.way && clear(s, e.x, e.z, gx, gz)) { e.x += (gx - e.x) * k; e.z += (gz - e.z) * k; return null; }
  // Umweg: neu suchen, wenn das Ziel ein anderes Feld ist oder der Weg alt ist
  const tile = `${Math.round(gx)},${Math.round(gz)}`;
  if (!e.way || e.wayTo !== tile || now > e.wayT) {
    e.way = findWay(s, e.x, e.z, gx, gz) || [];
    e.wayTo = tile;
    e.wayT = now + 2;
  }
  // Abkürzung: wenn das Ziel schon direkt erreichbar ist, Umweg beenden
  if (clear(s, e.x, e.z, gx, gz) && far < 3) { e.way = null; e.x += (gx - e.x) * k; e.z += (gz - e.z) * k; return null; }
  const w = e.way[0];
  if (!w) { e.way = null; return null; }
  const dx = w[0] - e.x, dz = w[1] - e.z, d = Math.hypot(dx, dz), v = Math.min(d, dt * Math.min(4, 1.8 + far * 0.25));
  if (d < 0.12) { e.way.shift(); return Math.atan2(dx, dz); }
  e.x += dx / d * v; e.z += dz / d * v;
  return Math.atan2(dx, dz);
}
