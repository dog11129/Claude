// Teil von extras4.js – Kanu-Tour flussaufwärts und die Grotte hinter dem Wasserfall.
import { ITEMS } from '../data.js';
import { coast, riverX, RIVER_W, cliffZ } from '../island.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, fmt } from './util.js';

// Einstieg: am Ufer kurz vor der Mündung ins Meer
const MOUTH = (() => { for (let z = 0; z < 40; z += 0.5) if (coast(riverX(z), z) > -0.75) return z; return 18; })();
export const CANOE_START = [Math.round((riverX(MOUTH - 2) + RIVER_W + 0.9) * 10) / 10, Math.round((MOUTH - 2) * 10) / 10];
// Weg flussaufwärts (Mitte des Flusses), vom Einstieg bis an den Wasserfall
export const CANOE_PATH = (() => { const p = []; for (let z = MOUTH - 1.5; z > cliffZ(riverX(z)) + 1.2; z -= 0.5) p.push([riverX(z), z]); return p; })();
export const CANOE_SECS = 26;
export const canoeAt = (x, z) => Math.hypot(x - CANOE_START[0], z - CANOE_START[1]) < 1.6;
// Zurück aus der Grotte: neben dem Wasserfall am Ufer
export const GROTTO_EXIT = [Math.round((riverX(cliffZ(riverX(-14)) + 2) + RIVER_W + 1.2) * 10) / 10, Math.round((cliffZ(riverX(-14)) + 2) * 10) / 10];

export const GROTTO = { x: 0, z: 2700, r: 8, pool: 3 };
export const GROTTO_SPOTS = [[-3.4, -1.6], [3.4, -1.6], [0, -3.8]]; // Angelplätze am Becken
export const GROTTO_CHEST = [5.2, 2.6];
export const GROTTO_UP = [0, GROTTO.r - 1.6];
const GROTTO_FISH = [['grottenforelle', 50], ['kristallgrundel', 32], ['leuchtsalmler', 18]];
export function grottoBlocked(s, x, z) {
  const lx = x - GROTTO.x, lz = z - GROTTO.z, d = Math.hypot(lx, lz);
  return d > GROTTO.r - 0.5 || d < GROTTO.pool + 0.2 || Math.hypot(lx - GROTTO_CHEST[0], lz - GROTTO_CHEST[1]) < 0.5;
}
export function resolveGrotto(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - GROTTO.x, lz = pz - GROTTO.z;
  const mx = me.x - GROTTO.x, mz = me.z - GROTTO.z, G = s.grotto;
  if (Math.hypot(mx - GROTTO_UP[0], mz - GROTTO_UP[1]) < 1.6) return { go: 'grottoup', label: '🌊 Hinaus zum Wasserfall', tiles: [] };
  if (Math.hypot(lx - GROTTO_CHEST[0], lz - GROTTO_CHEST[1]) < 1.1) return G.chest === s.day ? { label: '🧰 Leer – morgen wieder', tiles: [] } : { a: { t: 'canoe', op: 'chest' }, label: '🧰 Glitzernde Truhe öffnen', tiles: [] };
  const i = GROTTO_SPOTS.findIndex(([x, z]) => Math.hypot(mx - x, mz - z) < 1.4);
  if (i >= 0) return G.fish?.[i] === s.day ? { label: '🎣 Hier beißt heute nichts mehr', tiles: [] } : { a: { t: 'canoe', op: 'fish', i }, label: '🎣 Im Leuchtbecken angeln', tiles: [] };
  return { label: '', tiles: [] };
}
export function canoe(s, a, out) {
  const G = s.grotto;
  if (a.op === 'start') {
    if (!(s.inv.kanu > 0)) return false;
    S.questEventX(s, 'canoe', 1, out);
    return true;
  }
  if (a.op === 'grab') { // Treibgut unterwegs (höchstens 3 pro Fahrt / 6 am Tag)
    if (!(s.inv.kanu > 0)) return false;
    if (G.gday !== s.day) { G.gday = s.day; G.grab = 0; }
    if (G.grab >= 6) return false;
    G.grab++;
    const id = ['ast', 'ast', 'muschel', 'seeglas', 'flaschenpost', 'forelle'].filter(k => ITEMS[k])[rnd(5)] || 'ast';
    S.addInvX(s, id, 1);
    S.collectX(s, id, out);
    out.got = id;
    out.msg = `🛶 Aus dem Fluss gefischt: ${ITEMS[id].icon} ${ITEMS[id].name}`;
    out.snd = 'plopp';
    return true;
  }
  if (a.op === 'grotto') {
    if (G.found) return false;
    G.found = s.day;
    X.moment(s, 'grotto', '🌊', 'Die Grotte hinter dem Wasserfall', 'Hinter dem rauschenden Wasser: eine Höhle mit leuchtendem Becken und seltenen Fischen.', out);
    out.msg = '🌊 Hinter dem Wasserfall liegt eine Grotte! Im Leuchtbecken schwimmen Fische, die es sonst nirgends gibt.';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'fish') {
    const i = a.i;
    if (!Number.isInteger(i) || !GROTTO_SPOTS[i] || G.fish[i] === s.day) return false;
    G.fish[i] = s.day;
    let r = Math.random() * 100, id = GROTTO_FISH[0][0];
    for (const [f, w] of GROTTO_FISH) if ((r -= w) <= 0) { id = f; break; }
    S.addInvX(s, id, 1);
    S.collectX(s, id, out);
    s.tidebook[id] ||= s.day;
    S.questEventX(s, 'fish', 1, out);
    out.got = id;
    out.msg = `🎣 ${ITEMS[id].icon} ${ITEMS[id].name}!`;
    out.fx.push({ x: GROTTO.x + GROTTO_SPOTS[i][0], z: GROTTO.z + GROTTO_SPOTS[i][1], txt: ITEMS[id].icon, k: 'splash' });
    out.snd = 'found';
    return true;
  }
  if (a.op === 'chest') {
    if (G.chest === s.day) return false;
    G.chest = s.day;
    const m = 600 + rnd(8) * 100, gem = ['kristall', 'amethyst', 'mondstein'][rnd(3)];
    s.money += m; s.stats.earned += m;
    if (Math.random() < 0.4 && ITEMS[gem]) { S.addInvX(s, gem, 1); S.collectX(s, gem, out); out.got = gem; }
    out.msg = `🧰 ${fmt(m)} Taler${out.got ? ` und ${ITEMS[gem].icon} ${ITEMS[gem].name}` : ''} in der Truhe!`;
    out.snd = 'found';
    return true;
  }
  return false;
}
