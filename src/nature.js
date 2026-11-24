// Natur aus Blender (assets/models/nature.glb): Bäume, Palmen, Felsen, Obst, Muscheln, Unkraut, Grabstellen.
// Gleiche Aufrufe wie die alten Modelle in models.js; fehlt die Datei, bleiben die alten Modelle.
import { hasModel, model, part } from './assets.js';
import * as M from './models.js';

// Obst sitzt an festen Stellen der Krone (Winkel, Höhe) und schaukelt mit ihr im Wind
const FRUIT_AT = [[0.3, 0.1], [1.5, -0.1], [2.6, 0.25], [3.7, -0.05], [4.9, 0.2], [5.7, -0.2], [4.3, 0.45]];

function hang(parent, kind, x, y, z, s = 1) {
  const f = model('fruit_' + kind);
  if (!f) return;
  f.position.set(x, y, z);
  f.rotation.y = x * 3 + z;
  f.scale.setScalar(s);
  parent.add(f);
}

export function wild(kind, season, left, fruit, ready) {
  if (!hasModel('tree_summer')) return M.wild(kind, season, left, fruit, ready);
  if (kind === 'rock') return model(left > 0 ? 'rock' : 'rock_small');
  const g = model(kind === 'palm' ? 'palm' : 'tree_' + season);
  if (kind === 'palm') {
    const f = part(g, 'fronds') || g;
    if (ready) for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; hang(f, 'kokosnuss', Math.cos(a) * 0.17, -0.16, Math.sin(a) * 0.17); }
  } else if (ready && season !== 'winter') {
    // Krone dreht um (0, 1.0, 0); ihr Mittelpunkt liegt auf 1.62
    const c = part(g, 'crown') || g, cy = c === g ? 0 : c.position.y;
    for (const [a, e] of FRUIT_AT) {
      const R = 1.02;
      hang(c, fruit, Math.cos(a) * Math.cos(e) * R, 1.62 + Math.sin(e) * R * 0.8 - cy, Math.sin(a) * Math.cos(e) * R);
    }
  }
  if (left <= 0) { const w = model('woodchips'); if (w) g.add(w); }
  return g;
}

export const shell = kind => model('shell_' + kind) || M.shell(kind);
export const weed = () => model('weed') || M.weed();
export const digMark = () => model('dig') || M.digMark();
// Frucht einzeln (z. B. für Obstbäume im Garten)
export const fruitModel = kind => model('fruit_' + kind);
