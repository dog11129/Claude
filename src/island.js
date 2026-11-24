// Die Insel: Küste, Strand, Klippen im Norden, Fluss mit Wasserfall, Brücken, Teich, Steg.
// Reine Mathematik ohne Grafik – Spiellogik (Kollisionen, Angeln) und 3D-Welt nutzen dieselben Formeln.

export const MAP = 23;                 // nichts liegt weiter draußen als ±MAP
export const SPAWN = { x: 0, z: 4.5 };

// Küste: > 0 = Meer (Wert = wie weit draußen), < 0 = Land
export function coast(x, z) {
  const r = Math.pow(x ** 4 + z ** 4, 0.25), a = Math.atan2(z, x);
  return r + Math.sin(a * 3 + 0.7) * 0.8 + Math.sin(a * 5 - 1.2) * 0.45 - 21.2;
}
// Klippenkante im Norden: dahinter liegt das hohe Plateau (Wald, Wasserfall)
export const cliffZ = x => -16 + 0.8 * Math.sin(x * 0.35) + 0.5 * Math.sin(x * 0.9 + 1);
export const CLIFF_H = 2.6;

// Fluss: kommt als Wasserfall von der Klippe und mündet im Süden ins Meer
export const riverX = z => 6.6 + 2.6 * Math.sin(z * 0.2 + 0.5);
export const RIVER_W = 1.05;           // halbe Breite
export const BRIDGES = [-6, 11];       // z-Positionen der Brücken
export const BRIDGE_W = 0.85;          // halbe Breite der Brücke
export const inRiver = (x, z) => z > cliffZ(x) - 30 && Math.abs(x - riverX(z)) < RIVER_W && coast(x, z) < 0.5;
export const onBridge = (x, z) => BRIDGES.some(b => Math.abs(z - b) < BRIDGE_W && Math.abs(x - riverX(b)) < RIVER_W + 0.7);

export const POND = { cx: -15, cz: -4, r: 2.1 };
export const inPond = (x, z) => (x - POND.cx) ** 2 + (z - POND.cz) ** 2 <= POND.r ** 2;

// Steg ins Meer (Süden)
export const PIER = { x: -9, z0: 15.5, z1: 25.5, w: 0.7 };
export const onPier = (x, z) => Math.abs(x - PIER.x) < PIER.w && z > PIER.z0 && z < PIER.z1;

export const isBeach = (x, z) => coast(x, z) > -3.6 && z > cliffZ(x) + 2.5;
export const isSea = (x, z) => coast(x, z) > -0.35;
export const isWater = (x, z) => (isSea(x, z) && !onPier(x, z)) || (inRiver(x, z) && !onBridge(x, z)) || inPond(x, z);

// Kann man hier (ohne Gebäude & Co.) stehen?
export function walkable(x, z) {
  if (onPier(x, z)) return true;
  if (onBridge(x, z)) return true;
  if (z < cliffZ(x) + 0.55) return false;
  if (coast(x, z) > -0.75) return false;
  if (inRiver(x, z) || (x - POND.cx) ** 2 + (z - POND.cz) ** 2 < (POND.r - 0.1) ** 2) return false;
  return true;
}
// Freier Rasen (zum Pflanzen, Aufstellen, für Grabstellen usw.)
export const grass = (x, z) => walkable(x, z) && !onPier(x, z) && !onBridge(x, z) && !isBeach(x, z)
  && Math.abs(x - riverX(z)) > RIVER_W + 0.6 && (x - POND.cx) ** 2 + (z - POND.cz) ** 2 > (POND.r + 0.7) ** 2 && z > cliffZ(x) + 1.2;
export const sand = (x, z) => walkable(x, z) && isBeach(x, z) && !onPier(x, z) && coast(x, z) < -1.1;

// Sandwege (x, z, Breite, Tiefe)
export const PATHS = [
  [-5, 1.0, 4.4, 1.3], [2.6, -3.8, 1.3, 5.6], [10, -6, 6.6, 1.3], [-9, -6.6, 1.3, 3.8], [-5.6, -5.2, 7.4, 1.3],
];
export const onPath = (x, z, m = 0.3) => PATHS.some(([px, pz, w, d]) => Math.abs(x - px) < w / 2 + m && Math.abs(z - pz) < d / 2 + m);
export const PLAZA = { x: 0, z: 1, r: 3.4 };
export const onPlaza = (x, z, m = 0) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + m;

// Kleiner Zufallsgenerator mit festem Startwert: alle Geräte bauen dieselbe Insel
export function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
