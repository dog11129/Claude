// Teil von extras4.js – Gartenwettbewerb (letzter Tag jeder Jahreszeit) und Riesengemüse (Wiegen beim Kürbisfest).
import { CROPS, PLACE, NPC_IDS, NPC_DATA, ITEMS } from '../data.js';
import * as S from '../state.js';
import { who, note, fmt } from './util.js';

// ---------- Gartenwettbewerb ----------
export const isContestDay = day => S.daySea(day) === 7;
export function gardenScore(s) {
  const flowers = [], cols = new Set();
  for (const [k, t] of Object.entries(s.tiles || {})) if (t?.c && CROPS[t.c.k]?.flower !== undefined && S.stage(t.c) === 3) { flowers.push(k); cols.add(CROPS[t.c.k].flower); }
  const kinds = new Set(flowers.map(k => s.tiles[k].c.k)).size;
  let deco = 0;
  for (const [k, o] of Object.entries(s.obj || {})) {
    if (PLACE[o?.k]?.kind !== 'deco') continue;
    const [x, z] = k.split(',').map(Number);
    if (flowers.some(f => { const [a, b] = f.split(',').map(Number); return Math.abs(a - x) <= 2 && Math.abs(b - z) <= 2; })) deco++;
  }
  const pts = Math.min(60, flowers.length) * 2 + kinds * 8 + cols.size * 5 + Math.min(20, deco) * 3;
  return { pts, flowers: flowers.length, kinds, cols: cols.size, deco, stars: pts >= 260 ? 5 : pts >= 180 ? 4 : pts >= 110 ? 3 : pts >= 50 ? 2 : 1 };
}
export function gardenJudge(s) { // morgens am Wettbewerbstag
  const r = gardenScore(s), G = s.gardenc, m = r.stars * 600;
  G.last = { day: s.day, ...r };
  s.money += m; s.stats.earned += m;
  const J = NPC_IDS.slice(0, 3).map(id => NPC_DATA[id]?.name || id).join(', ');
  let text = `Liebe Gärtnerinnen und Gärtner,\nheute hat die Jury (${J}) eure Insel besucht: ${r.flowers} blühende Blumen, ${r.kinds} Sorten, ${r.cols} Farben und ${r.deco} Deko-Stücke zwischen den Beeten.\n\nUrteil: ${'⭐'.repeat(r.stars)} – dafür gibt es ${fmt(m)} Taler!`;
  const sk = Math.ceil(s.day / 7); // ein Pokal pro Jahreszeit
  if (r.stars === 5 && G.cup !== sk) { G.cup = sk; text += '\nUnd weil es so wunderschön blüht: der Garten-Pokal! 🏆'; note(s, '🌷 Gartenwettbewerb', text, 'gartenpokal', 1, 'rosi'); }
  else note(s, '🌷 Gartenwettbewerb', text, null, 1, 'rosi');
  G.best = Math.max(G.best || 0, r.pts);
}

// ---------- Riesengemüse ----------
export const GIANT = { kuerbis: ['riesenkuerbis', 9], melone: ['riesenmelone', 7], kartoffel: ['riesenkartoffel', 2.5] }; // Sorte: [Riesen-Item, Grundgewicht kg]
export const GIANT_MIN = 3; // ab so vielen Dünger-Tagen ist es ein Riese
export const giantKg = (k, gs, seed = 0) => Math.round(GIANT[k][1] * (1 + gs * 0.55) * (0.92 + ((seed * 9301 + 49297) % 233) / 1456) * 10) / 10;
export function giant(s, a, out) {
  const t = s.tiles?.[`${a.x},${a.z}`];
  if (a.op !== 'feed' || !t?.c || !GIANT[t.c.k] || S.stage(t.c) < 3) return false;
  if (t.c.gd === s.day) { out.msg = '🧪 Heute hat es schon Dünger bekommen.'; return false; }
  if (!(t.w > 0)) { out.msg = '💧 Erst gießen, dann düngen!'; return false; }
  if (!(s.inv.duenger > 0)) { out.msg = '🧪 Du hast keinen Riesendünger (Gärtnerei).'; return false; }
  if ((t.c.gs || 0) >= 10) { out.msg = '🎃 Größer geht es nicht mehr!'; return false; }
  S.takeInvX(s, 'duenger', 1);
  t.c.gs = (t.c.gs || 0) + 1;
  t.c.gd = s.day;
  out.msg = `🧪 Es wächst und wächst … jetzt etwa ${fmt(giantKg(t.c.k, t.c.gs, a.x * 31 + a.z))} kg${t.c.gs === GIANT_MIN ? ' – ein echter Riese!' : ''}`;
  out.fx.push({ x: a.x, z: a.z, txt: '🧪✨', k: 'leaf' });
  out.snd = 'plopp';
  return true;
}
// Ernte eines Riesen (aus harvest in state.js): Riesen-Item statt normaler Ernte, Gewicht in die Liste
export function giantHarvest(s, t, a, out) {
  if (!t?.c || !GIANT[t.c.k] || (t.c.gs || 0) < GIANT_MIN) return false;
  const [id] = GIANT[t.c.k], kg = giantKg(t.c.k, t.c.gs, a.x * 31 + a.z);
  S.addInvX(s, id, 1);
  const G = s.giant;
  G.log = [...(G.log || []), { k: t.c.k, kg, by: String(a.name || who(s)).slice(0, 16), day: s.day }].sort((x, y) => y.kg - x.kg).slice(0, 10);
  delete s.tiles[`${a.x},${a.z}`];
  out.got = id;
  out.msg = `${ITEMS[id].icon} ${ITEMS[id].name}: ${fmt(kg)} kg! ${G.log[0].kg === kg ? '🏆 Das schwerste bisher!' : ''}`;
  out.fx.push({ x: a.x, z: a.z, txt: `${kg} kg`, k: 'leaf' });
  out.snd = 'fanfare';
  S.questEventX(s, 'harvest', 1, out);
  return true;
}
// Kürbisfest-Morgen: das schwerste Gemüse dieser Jahreszeit (geerntet oder noch im Beet) wird gewogen
export function giantWeigh(s) {
  const from = s.day - S.daySea(s.day) + 1, G = s.giant, list = (G.log || []).filter(e => e.day >= from);
  for (const [k, t] of Object.entries(s.tiles || {})) if (t?.c && GIANT[t.c.k] && (t.c.gs || 0) >= GIANT_MIN) { const [x, z] = k.split(',').map(Number); list.push({ k: t.c.k, kg: giantKg(t.c.k, t.c.gs, x * 31 + z), by: 'im Beet', day: s.day }); }
  if (!list.length) return;
  const best = list.sort((a, b) => b.kg - a.kg)[0], m = Math.round(best.kg * 100);
  s.money += m; s.stats.earned += m;
  const rec = !G.rec || best.kg > G.rec.kg;
  if (rec) G.rec = best;
  note(s, '🎃 Wiegen beim Kürbisfest', `Auf die Waage, fertig, los!\nDer schwerste Riese: ${ITEMS[GIANT[best.k][0]].name} mit ${fmt(best.kg)} kg (${best.by}). Dafür gibt es ${fmt(m)} Taler.${rec ? '\nNeuer Inselrekord – der Riesengemüse-Pokal ist für euch! 🏆' : ''}`, rec ? 'gemuesepokal' : null, 1, 'rosi');
}
