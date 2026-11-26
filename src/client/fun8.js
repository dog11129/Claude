// Inselleben 10 im Browser: Schminktisch/Spiegel öffnet das Make-up, Herzpunkte schweben als Herzchen hoch,
// neue Stufen im Herzensbuch werden gefeiert. Logik beim Host: src/extras10.js (features/love.js).
import { LOVE_STEPS, loveLevel } from '../extras10.js';

let C = null, seen = null;
const me = () => C.G.players[C.G.me];
export function initFun8(ctx) { C = ctx; }
export const usable10 = r => !!r && !!r.makeup;

export function execute10(r, fresh) {
  if (!r.makeup) return false;
  if (fresh) { C.play('click'); C.openEditor('makeup'); }
  return true;
}

// Herzpunkte beobachten (kommen mit dem Spielstand) – beide sehen es gleichzeitig
export function update10() {
  const G = C.G, s = G?.s;
  if (!s?.love || !G.ready) return;
  const now = { pts: s.love.pts || 0, lvl: loveLevel(s) };
  if (!seen || seen.g !== G) { seen = { g: G, ...now }; return; }
  if (now.pts > seen.pts && me()) {
    C.world.float(me().x, me().z, `💗+${now.pts - seen.pts}`, 2.1, { life: 1.6, rise: 0.6 });
  }
  if (now.lvl > seen.lvl) {
    const st = LOVE_STEPS[now.lvl - 1];
    C.toast(`${st.icon} Herzensbuch: „${st.name}“! Schaut in den Briefkasten 💌`, true);
    C.play('fanfare');
    if (me()) C.world.burst(me().x, me().z, 'heart', 1.6);
  }
  seen.pts = now.pts; seen.lvl = now.lvl;
}
