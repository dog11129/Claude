// Teil von extras6.js – Webstuhl: Wolle (Schafweide) mit Blumen färben und weben – Teppiche, Kissen,
// Wandteppiche mit eigenem Muster und zwei Strickmützen für die Garderobe.
import { ITEMS } from '../data.js';
import { WOOL_COLORS } from '../furni-data.js';
import * as S from '../state.js';
import { flowerColor } from './florist.js';
import { XROOMS } from './home2.js';

export const LOOM = { teppich: { wool: 3, name: 'Wollteppich', pre: 'wollteppich_' }, kissen: { wool: 2, name: 'Strickkissen', pre: 'strickkissen_' } };
export const TAPESTRY_WOOL = 4;
export const KNIT_HATS = [['bommel', 'Bommelmütze', 3], ['zipfel', 'Zipfelmütze', 3]];
export const hasLoom = s => [s.home, ...Object.keys(XROOMS).map(id => s.xrooms?.[id])].some(h => Object.values(h?.items || {}).some(o => o?.k === 'webstuhl'));
export const dyeFlower = (s, color) => Object.keys(s.inv).find(id => s.inv[id] > 0 && flowerColor(id) === color) || null;
export function loom(s, a, out) {
  if (!hasLoom(s)) return false;
  const wool = s.inv.wolle || 0, need = n => { if (wool < n) { out.msg = `🧶 Dafür braucht es ${n} Wolle (Schafweide).`; return false; } return true; };
  if (a.op === 'weave') {
    const L = LOOM[a.what], C = WOOL_COLORS.find(c => c[0] === a.color);
    if (!L || !C || !need(L.wool)) return false;
    const fl = dyeFlower(s, C[0]);
    if (!fl) { out.msg = `🌸 Zum Färben fehlt eine ${C[1]}e Blume.`; return false; }
    S.takeInvX(s, 'wolle', L.wool); S.takeInvX(s, fl, 1);
    const id = L.pre + C[0];
    S.addInvX(s, id, 1);
    out.msg = `🧶 Gefärbt mit ${ITEMS[fl].icon} und gewebt: ${ITEMS[id].name}!`;
    out.snd = 'love';
    S.questEventX(s, 'weave', 1, out);
    return true;
  }
  if (a.op === 'tapestry') {
    if (!need(TAPESTRY_WOOL)) return false;
    S.takeInvX(s, 'wolle', TAPESTRY_WOOL);
    S.addInvX(s, 'wandteppich', 1);
    out.msg = '🧶 Ein Wandteppich! Im Haus aufhängen und antippen – er zeigt eure Muster aus dem Muster-Editor.';
    out.snd = 'love';
    S.questEventX(s, 'weave', 1, out);
    return true;
  }
  if (a.op === 'hat') {
    const H = KNIT_HATS.find(h => h[0] === a.id);
    if (!H) return false;
    if (s.wardrobe[H[0]]) { out.msg = `🧶 Die ${H[1]} habt ihr schon.`; return false; }
    if (!need(H[2])) return false;
    S.takeInvX(s, 'wolle', H[2]);
    s.wardrobe[H[0]] = s.day;
    out.msg = `🧶 ${H[1]} gestrickt! Unter ⚙️ → Aussehen ändern → Extras könnt ihr sie aufsetzen.`;
    out.snd = 'fanfare';
    S.questEventX(s, 'weave', 1, out);
    return true;
  }
  return false;
}
