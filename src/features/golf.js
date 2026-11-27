// Teil von extras4.js – Minigolfplatz (Rathausprojekt): 9 Bahnen, gespielt im Fenster, Rekorde für alle.
import * as S from '../state.js';
import { who, fmt } from './util.js';

// Bahnen im Fenster-Maßstab 300 × 420: Abschlag, Loch, Par, Wände [x1, y1, x2, y2], Stoßfänger [x, y, r]
export const HOLES = [
  { tee: [150, 380], cup: [150, 70], par: 2, walls: [], bump: [] },
  { tee: [70, 380], cup: [230, 70], par: 3, walls: [[0, 230, 200, 230]], bump: [] },
  { tee: [150, 380], cup: [150, 70], par: 3, walls: [], bump: [[150, 220, 34], [80, 160, 18], [220, 160, 18]] },
  { tee: [50, 380], cup: [250, 380], par: 3, walls: [[150, 140, 150, 420]], bump: [] },
  { tee: [150, 390], cup: [150, 60], par: 3, walls: [[60, 300, 300, 300], [0, 190, 240, 190]], bump: [] },
  { tee: [250, 380], cup: [60, 70], par: 3, walls: [[100, 0, 100, 300], [200, 120, 200, 420]], bump: [] },
  { tee: [150, 390], cup: [150, 210], par: 2, walls: [[90, 150, 210, 150], [90, 150, 90, 270], [210, 150, 210, 270]], bump: [] },
  { tee: [40, 390], cup: [260, 60], par: 4, walls: [[0, 300, 220, 300], [80, 200, 300, 200], [0, 110, 220, 110]], bump: [[150, 250, 14]] },
  { tee: [150, 390], cup: [150, 210], par: 3, walls: [], bump: [[150, 300, 26], [100, 210, 16], [200, 210, 16], [150, 150, 20]] },
];
export const GOLF_PAR = HOLES.reduce((t, h) => t + h.par, 0);
export function golf(s, a, out) {
  if (a.op !== 'score' || !Array.isArray(a.strokes) || a.strokes.length !== HOLES.length || !a.strokes.every(n => Number.isInteger(n) && n >= 1 && n <= 8)) return false;
  if (!Object.values(s.obj || {}).some(o => o?.k === 'minigolf')) return false;
  const G = s.golf, me = who(s), n = a.strokes.reduce((t, v) => t + v, 0), name = String(a.name || 'Gast').slice(0, 16);
  const first = !G.best[me];
  if (!G.best[me] || n < G.best[me]) G.best[me] = n;
  if (G.day !== s.day) { G.day = s.day; G.paid = {}; }
  let msg = `⛳ ${n} Schläge (Par ${GOLF_PAR})`;
  if (!G.paid[me]) { G.paid[me] = 1; const m = Math.max(100, (GOLF_PAR + 10 - n) * 40); s.money += m; s.stats.earned += m; msg += ` · +${fmt(m)} Taler`; }
  if (!G.rec || n < G.rec.n) {
    if (G.rec) msg += ' · 🏆 Neuer Platzrekord!';
    G.rec = { n, name, day: s.day };
    if (!G.cup && n <= GOLF_PAR) { G.cup = s.day; S.addInvX(s, 'golfpokal', 1); msg += ' Der Minigolf-Pokal ist in deiner Tasche!'; }
  }
  if (first) msg += ' · Erste Runde geschafft!';
  out.msg = msg;
  out.snd = n <= GOLF_PAR ? 'fanfare' : 'coin';
  S.questEventX(s, 'golf', 1, out);
  return true;
}
