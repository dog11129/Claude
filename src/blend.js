// Benannte Welt-Modelle aus Blender: bm('name', teile, leuchtteile, schatten) liefert das Modell <name> aus den
// Blender-Paketen (assets/models/world2.glb …), sonst wie bisher aus den Grundformen (models.js model()).
// Gleiche Argumente wie model(), nur mit dem Namen davor; bmv() lässt Leuchtteile in ihrer eigenen Farbe leuchten.
// Im Bauplan-Modus (globalThis.KUSCHEL_CAPTURE, tools/capture-world.py) wird immer aus Grundformen gebaut und
// REG merkt sich die Teile jedes Namens – daraus baut blender/remaster.py die Blender-Fassung.
import * as M from './models.js';
import { model as asset, GLOW_VC } from './assets.js';

export const REG = new Map();
function make(name, parts, glow = [], shadow = true, vc = false) {
  if (globalThis.KUSCHEL_CAPTURE) {
    if (!REG.has(name)) REG.set(name, { parts: parts.filter(Boolean), glow: glow.filter(Boolean), vc, shadow });
  } else {
    const own = asset(name);
    if (own) {
      if (!shadow) own.traverse(o => { o.castShadow = false; });
      return own;
    }
  }
  const m = M.model(parts, glow, shadow);
  if (vc && m.children[1]) m.children[1].material = GLOW_VC;
  return m;
}
export const bm = (name, parts, glow, shadow) => make(name, parts, glow, shadow, false);
export const bmv = (name, parts, glow, shadow) => make(name, parts, glow, shadow, true);
