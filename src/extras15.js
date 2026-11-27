// Inselleben 15 „Winterzauber“: Adventskalender, Koi-Teich, gemeinsames Puzzle, Schmuckwerkstatt, Mühle und Würfelglück
// am Spieltisch, Federball, Kostümfest, Erinnerungsbaum, Polaroid-Wand und der Glückskeks des Tages.
// Alles kommt nur dazu: Alte Spielstände bekommen die neuen Felder beim Laden (migrate15), nichts wird umgebaut.
import * as S from './state.js';
import { note } from './features/util.js';
import { advent15, cookie15, adventMail, migrateAdvent } from './features/advent.js';
import { koi15, morningKoi, migrateKoi } from './features/koi.js';
import { puzzle15, rally15, migratePuzzle, migrateRally } from './features/play15.js';
import { jewel15, costume15, carve15 } from './features/style15.js';
import { tree15, pola15, treeSeen, migrateTree, migratePola, TREE_ID, polaSlot } from './features/memtree.js';
export * from './features/pure15.js';
export * from './features/advent.js';
export * from './features/koi.js';
export * from './features/play15.js';
export * from './features/style15.js';
export * from './features/memtree.js';
export * from './jewel-data.js';

export const NET_ID = 'federballnetz';
// Draußen: Federballnetz, Erinnerungsbaum, der eigene Teich
export function resolve15(s, me, sel, at) {
  if (S.inside(me) || S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, tx = Math.round(px), tz = Math.round(pz), k = tx + ',' + tz, one = [[tx, tz]];
  const o = s.obj?.[k];
  if (o?.k === NET_ID) return { ui: 'rally15', label: '🏸 Federball', tiles: one };
  if (o?.k === TREE_ID) return { ui: 'tree15', label: '🌳 Erinnerungsbaum', tiles: one };
  if (!o && s.terra?.[k] === 'w') return { ui: 'koi15', label: s.koi?.fish?.length ? `🐟 Koi-Teich (${s.koi.fish.length})` : '🐟 Koi-Teich', tiles: one };
  return null;
}
// Zu Hause: Puzzletisch, Adventskalender, Polaroids
export function resolveFurn15(s, h, R, base, tiles) {
  const k = h.o.k;
  if (k === 'puzzletisch') return { ...base, ui: 'puzzle15', label: '🧩 Puzzle', tiles };
  if (k === 'adventskalender') return { ...base, ui: 'advent15', label: '🎄 Adventskalender', tiles };
  if (polaSlot(k)) return { ...base, ui: 'pola15', label: '🖼️ Polaroid', tiles };
  return null;
}
// Gibt es dieses Stück noch irgendwo? (Taschen, Lagerkiste, Post, aufgestellt, in einem Zimmer)
export function owns15(s, id) {
  if ([s.inv, s.box, ...Object.values(s.pinv || {})].some(b => b && b[id] > 0)) return true;
  if ((s.mail || []).some(m => m && m.item === id)) return true;
  if (Object.values(s.obj || {}).some(o => o?.k === id)) return true;
  return [s.home, ...Object.values(s.nhome || {}), ...Object.values(s.xrooms || {})].some(R => R && [R.items, R.rugs, R.walls].some(m => m && typeof m === 'object' && Object.values(m).some(o => o?.k === id)));
}
export function migrate15(s) { migrateAdvent(s); migrateKoi(s); migratePuzzle(s); migrateRally(s); migrateTree(s); migratePola(s); }
export function morning15(s) { morningKoi(s); }
export function after15(s) { treeSeen(s); }
// Beim Gastgeber, sobald die Insel läuft und bei jedem Datumswechsel: Begrüßungspost (einmal) und der Adventskalender (einmal im Jahr)
export function tick15(s) {
  let ch = false;
  if (!s.i15) {
    s.i15 = 1; ch = true;
    note(s, '🌳 Ein Baum für eure Erinnerungen', 'Ihr Lieben,\n\ndieser kleine Setzling ist etwas Besonderes: Er wächst mit jedem Tag auf der Insel – und doppelt so schnell an Tagen, an denen ihr beide da seid. Für alles Schöne, das ihr zusammen erlebt, hängt bald ein Anhänger in seinen Zweigen, und ihr könnt euch kleine Zettel hineinhängen.\n\nSucht ihm einen schönen Platz (🔨 Bauen ➜ Deko)!\n\nMira 🦔', TREE_ID, 1, 'mira');
    note(s, '🧩 Post für gemütliche Abende', 'Ihr Lieben,\n\nich habe euch einen Puzzletisch gebaut: 24 Teile, jede:r legt vier am Tag – und das fertige Bild hängt ihr euch an die Wand. Stellt ihn einfach ins Haus.\n\nNeu auf der Insel sind auch: Koi für eure selbst gegrabenen Teiche (einfach das Wasser antippen), Mühle und Würfelglück am Spieltisch, ein Federballnetz (🔨 Bauen ➜ Deko), die Goldschmiede im Salon der Bummelgasse, Polaroids aus dem 📸 Fotobuch und jeden Tag ein 🥠 Glückskeks im Handy.\n\nViel Freude!\nRosi 🐰', 'puzzletisch', 1);
  }
  else for (const [id, what] of [[TREE_ID, 'Euer Erinnerungsbaum'], ['puzzletisch', 'Euer Puzzletisch']]) if (!owns15(s, id)) { // verschenkt oder verloren: kommt zurück
    ch = true;
    note(s, `📦 ${what} ist wieder da`, `Ihr Lieben,\n\n${what} war nirgends mehr zu finden – so etwas darf nicht verloren gehen. Hier ist ${id === TREE_ID ? 'er' : 'einer'} wieder. ${id === TREE_ID ? 'Alles, was der Baum schon erlebt hat, ist noch da: Größe, Anhänger und Zettel.' : 'Euer Puzzle geht genau dort weiter, wo ihr aufgehört habt.'}\n\nMira 🦔`, id, 1, 'mira');
  }
  return adventMail(s) || ch;
}
export const E15_ACTIONS = { advent15, cookie15, koi15, puzzle15, rally15, jewel15, costume15, carve15, tree15, pola15 };
