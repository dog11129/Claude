// Inselleben 9: lebendige Gebiete (Kiefernwald, Blütenwiese, Kristallhöhle) – Fundstücke, die es nur dort gibt,
// Bewohner mit eigenen Tauschwaren und Ereignisse. Logik in src/features/areas2.js, Grafik world-extra6.js,
// Fenster ui-extra6.js, Browser client/fun7.js.
import { area9, migrate9, gossip9 } from './features/areas2.js';
export * from './features/areas2.js';
export const E9_ACTIONS = { area9 };
export { migrate9 };
// nach der Zeitung (makePaper) – Klatsch aus den Gebieten
export function paper9(s) {
  if (!s.paper || s.paper.day !== s.day) return;
  const g = gossip9(s);
  const old = s.paper.gossip || [];
  if (g.length) s.paper.gossip = [...g.filter(x => !old.includes(x)), ...old].slice(0, 6);
}
