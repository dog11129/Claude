// Inselleben 3: Heißluftballon, Schmetterlingsgarten, Schiffswrack, Spieleabend, Fotowettbewerb, Grillabend,
// Sternbilder, Nachbarzimmer und Höhlen-Tiefen. Die Teile liegen in src/features/ – hier werden Aktionen, Tagesaufgaben
// und die neuen Felder für alte Spielstände zusammengesteckt. Läuft beim Host in der Spiellogik.
import { NPC_IDS } from './data.js';
import { shuffle } from './features/util.js';
import { ride, skygift, rideshot } from './features/balloon.js';
import { WRECK_SYMS, wreck } from './features/wreck.js';
import { game } from './features/games.js';
import { photoNew, photoJudge, photoentry } from './features/photocontest.js';
import { grill } from './features/grill.js';
import { CONST_MAX, constellation } from './features/stars.js';
import { nwish } from './features/nrooms.js';
import { depth, migrateDepth } from './features/depths.js';
export * from './features/balloon.js';
export * from './features/butterflies.js';
export * from './features/wreck.js';
export * from './features/games.js';
export * from './features/photocontest.js';
export * from './features/grill.js';
export * from './features/stars.js';
export * from './features/nrooms.js';
export * from './features/depths.js';

// Tagesaufgaben zu den Erweiterungen erst, wenn es das Nötige auf der Insel gibt
const hasObj = (s, ...k) => Object.values(s.obj || {}).some(o => k.includes(o?.k));
const anyInv = (s, id) => Object.values(s.pinv || {}).some(v => v?.[id] > 0);
export const DAILY_OK = {
  farm: s => hasObj(s, 'huehnerstall', 'kuhweide'),
  grill: s => hasObj(s, 'strandgrill'),
  gamewin: s => Object.values(s.home?.items || {}).some(o => o?.k === 'spieltisch'),
  chest: s => !!s.wreck?.found,
  dive: s => anyInv(s, 'neopren'),
  kite: s => anyInv(s, 'drache'),
  deepgem: s => s.depth?.lv >= 1,
};
export const dailyOk = (s, ev) => !DAILY_OK[ev] || DAILY_OK[ev](s);

// ---------- Laden, Morgen, Ticken ----------
export function migrateZ(s) {
  const w = s.wreck && typeof s.wreck === 'object' ? s.wreck : {};
  const code = Array.isArray(w.code) && w.code.length === 4 && w.code.every(c => WRECK_SYMS.includes(c)) ? w.code : shuffle(WRECK_SYMS);
  s.wreck = { found: w.found || 0, code, chart: w.chart || 0, open: w.open || 0, got: w.got && typeof w.got === 'object' ? w.got : {} };
  if (!s.photoc || typeof s.photoc !== 'object' || typeof s.photoc.entries !== 'object') photoNew(s);
  s.consts = Array.isArray(s.consts) ? s.consts.filter(c => c && typeof c.n === 'string' && Number.isInteger(c.sec) && Array.isArray(c.l)).slice(0, CONST_MAX) : [];
  s.nhome = s.nhome && typeof s.nhome === 'object' ? s.nhome : {};
  for (const [id, h] of Object.entries(s.nhome)) {
    if (!NPC_IDS.includes(id) || !h || typeof h !== 'object') { delete s.nhome[id]; continue; }
    for (const m of ['items', 'rugs', 'walls']) if (!h[m] || typeof h[m] !== 'object') h[m] = {};
    h.w = Number.isInteger(h.w) ? Math.max(0, Math.min(3, h.w)) : 0;
  }
  if (s.game && (!s.game.p || !Array.isArray(s.game.b))) s.game = null;
  migrateDepth(s);
}
export function morningZ(s) {
  photoJudge(s);
  if (s.game && s.game.win != null) s.game = null; // win kann 0 sein (erster Spieler)
  if (s.depth) s.depth.got = {}; // Edelsteinadern sind morgens wieder voll
}
export function tickZ(s) { return false; }

export const Z_ACTIONS = { ride, skygift, rideshot, wreck, game, photoentry, grill, sternbild: constellation, nwish, depth };
