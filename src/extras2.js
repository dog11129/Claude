// Inselleben 2: Nachbar-Geschichten, Bauernhof-Ecke, Korallenriff, Strand-Wettbewerbe (Sandburgen & Drachen),
// Fahrrad und Seilbahn. Die einzelnen Teile liegen in src/features/ – hier werden sie zusammengesteckt
// (Aktionen, neue Felder für alte Spielstände, Morgen, Ticken). Läuft beim Host in der Spiellogik.
import * as S from './state.js';
import { hour } from './features/util.js';
import { TALES, tale } from './features/tales.js';
import { farm } from './features/farm.js';
import { REEF_SLOTS, REEF_DECO, reef } from './features/reef.js';
import { beachKind, beachStart, beachFinish, castle, kitescore } from './features/beach.js';
export * from './features/tales.js';
export * from './features/farm.js';
export * from './features/reef.js';
export * from './features/beach.js';
export * from './features/cable.js';

// ---------- Morgen, Laden, Ticken ----------
export function migrateY(s) {
  s.tales = s.tales && typeof s.tales === 'object' ? Object.fromEntries(Object.entries(s.tales).filter(([id, t]) => TALES[id] && t && Number.isInteger(t.ch)).map(([id, t]) => [id, { ch: Math.max(0, Math.min(TALES[id].ch.length, t.ch)), on: t.on ? 1 : 0, p: Number.isFinite(t.p) ? t.p : 0, ok: t.ok ? 1 : 0 }])) : {};
  const r = s.reef && typeof s.reef === 'object' ? s.reef : {};
  s.reef = { found: Number.isInteger(r.found) ? r.found : 0, slots: Object.fromEntries(Object.entries(r.slots || {}).filter(([i, id]) => REEF_SLOTS[i] && REEF_DECO.includes(id))), got: r.got && typeof r.got === 'object' ? r.got : {}, prize: r.prize || 0 };
  s.castles = s.castles && typeof s.castles === 'object' ? Object.fromEntries(Object.entries(s.castles).filter(([k, c]) => /^-?\d+,-?\d+$/.test(k) && c && Number.isInteger(c.lv))) : {};
  if (beachKind(s) && s.beach?.day !== s.day) beachStart(s);
  if (s.beach && s.beach.day !== s.day) s.beach = null;
}
export function morningY(s) {
  if (s.beach && !s.beach.done) beachFinish(s);
  // Die Flut holt die Sandburgen (Muscheln bleiben liegen, wer sie wiederhaben will, ebnet vorher ein)
  s.castles = {};
  beachStart(s);
}
export function tickY(s, dt) {
  let changed = false;
  if (s.beach && !s.beach.done && hour(s) >= 17) changed = beachFinish(s) || changed;
  return changed;
}

export const Y_ACTIONS = { tale, farm, reef, castle, kitescore };
