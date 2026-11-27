// Inselleben 12 „Die große Überarbeitung“: Nachbarn richten ihr Zuhause selbst ein und ihre Häuser stehen immer offen,
// neue Pflanzen, Deko und Möbel, lebendigere Insel. Logik in src/features/nhomes.js und features/garden2.js,
// Grafik world-extra8.js, Browser client/fun10.js.
import { nhome12, migrateNhomes, nhomeMorning, gossip12 } from './features/nhomes.js';
export * from './features/nhomes.js';

export function migrate12(s) {
  migrateNhomes(s);
}
export function morning12(s) {
  nhomeMorning(s);
}
// Neuigkeiten aus den Nachbarhäusern in den Inselboten
export function paper12(s) {
  if (!s.paper || s.paper.day !== s.day) return;
  const g = gossip12(s), old = s.paper.gossip || [];
  if (g.length) s.paper.gossip = [...g.filter(x => !old.includes(x)), ...old].slice(0, 6);
}
export const E12_ACTIONS = { nhome12 };
