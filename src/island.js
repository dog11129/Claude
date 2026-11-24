// Die Insel: Küste, Strand, Klippen im Norden, Fluss mit Wasserfall, Brücken, Teich, Steg.
// Reine Mathematik ohne Grafik – Spiellogik (Kollisionen, Angeln) und 3D-Welt nutzen dieselben Formeln.

export const MAP = 36;                 // nichts liegt weiter draußen als ±MAP (vor der Erweiterung: 23)
export const MAP0 = 23;
export const SPAWN = { x: 0, z: 4.5 };

// Küste: > 0 = Meer (Wert = wie weit draußen), < 0 = Land
// coast0 = die ursprüngliche Insel. Sie bleibt unverändert, damit gespeicherte Bäume, Felsen & Co. am selben Platz bleiben.
export function coast0(x, z) {
  const r = Math.pow(x ** 4 + z ** 4, 0.25), a = Math.atan2(z, x);
  return r + Math.sin(a * 3 + 0.7) * 0.8 + Math.sin(a * 5 - 1.2) * 0.45 - 21.2;
}
// Inselerweiterung: drei neue Landzungen (Osten, Südosten, Südwesten), weich an die alte Küste angesetzt
export const LOBES = [{ x: 23.5, z: -3, r: 10.5 }, { x: 16.5, z: 17.5, r: 9.6 }, { x: -19, z: 14.5, r: 8.4 }];
export function lobeCoast(x, z) {
  let m = 99;
  for (const L of LOBES) {
    const a = Math.atan2(z - L.z, x - L.x);
    m = Math.min(m, Math.hypot(x - L.x, z - L.z) - L.r + Math.sin(a * 3 + L.x) * 0.5 + Math.sin(a * 5 - L.z) * 0.3);
  }
  return m;
}
const K = 1.3; // weiche Verbindung (smooth min)
export function coast(x, z) {
  const a = coast0(x, z), b = lobeCoast(x, z);
  if (b - a > 12) return a;
  return -K * Math.log(Math.exp(-a / K) + Math.exp(-b / K));
}
// GLSL-Fassung für das Wasser (muss zu coast() passen)
export const COAST_GLSL = `float coast0(vec2 p){ float r = pow(pow(abs(p.x),4.0)+pow(abs(p.y),4.0), 0.25); float a = atan(p.y, p.x); return r + sin(a*3.0+0.7)*0.8 + sin(a*5.0-1.2)*0.45 - 21.2; }
float lobe(vec2 p, vec3 L){ vec2 d = p - L.xy; float a = atan(d.y, d.x); return length(d) - L.z + sin(a*3.0 + L.x)*0.5 + sin(a*5.0 - L.y)*0.3; }
float coast(vec2 p){ float a = coast0(p); float b = ${LOBES.map(L => `lobe(p, vec3(${L.x.toFixed(2)}, ${L.z.toFixed(2)}, ${L.r.toFixed(2)}))`).reduce((m, l) => `min(${m}, ${l})`)}; return -${K.toFixed(2)} * log(exp(-a / ${K.toFixed(2)}) + exp(-b / ${K.toFixed(2)})); }`;
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

function shape(cst) {
  const isBeach = (x, z) => cst(x, z) > -3.6 && z > cliffZ(x) + 2.5;
  const isSea = (x, z) => cst(x, z) > -0.35;
  const isWater = (x, z) => (isSea(x, z) && !onPier(x, z)) || (inRiver(x, z) && !onBridge(x, z)) || inPond(x, z);
  // Kann man hier (ohne Gebäude & Co.) stehen?
  const walkable = (x, z) => {
    if (onPier(x, z)) return true;
    if (onBridge(x, z)) return true;
    if (z < cliffZ(x) + 0.55) return false;
    if (cst(x, z) > -0.75) return false;
    if (inRiver(x, z) || (x - POND.cx) ** 2 + (z - POND.cz) ** 2 < (POND.r - 0.1) ** 2) return false;
    return true;
  };
  // Freier Rasen (zum Pflanzen, Aufstellen, für Grabstellen usw.)
  const grass = (x, z) => walkable(x, z) && !onPier(x, z) && !onBridge(x, z) && !isBeach(x, z)
    && Math.abs(x - riverX(z)) > RIVER_W + 0.6 && (x - POND.cx) ** 2 + (z - POND.cz) ** 2 > (POND.r + 0.7) ** 2 && z > cliffZ(x) + 1.2;
  const sand = (x, z) => walkable(x, z) && isBeach(x, z) && !onPier(x, z) && cst(x, z) < -1.1;
  return { isBeach, isSea, isWater, walkable, grass, sand };
}
export const { isBeach, isSea, isWater, walkable, grass, sand } = shape(coast);
// Die Insel vor der Erweiterung – nur für die feste Verteilung der alten Bäume und Felsen
export const OLD = shape(coast0);
// Liegt (x, z) auf dem neuen Land?
export const newLand = (x, z) => coast0(x, z) > -0.75 && coast(x, z) < -0.75;

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
