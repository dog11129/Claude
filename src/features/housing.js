// Teil von extras7.js – Neue Nachbarn: jede Woche drei Bewerbungen (Handy ➜ Wohnen), einer bekommt das Grundstück.
// Am Einzugstag stehen Umzugskartons herum – wer hilft, sie ins Häuschen zu tragen?
import * as S from '../state.js';
import * as X from '../extras.js';
import { who, fmt, note, rnd } from './util.js';

const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0; };
export const weekOf = day => Math.floor((day - 1) / 7);
export const BOXES = 5;
export function applicants(s) {
  const pool = X.VISITOR_KEYS.filter(id => !s.residents?.[id] && !(s.pending || []).includes(id) && s.camper?.id !== id);
  return pool.map(id => [id, h32(weekOf(s.day), id.charCodeAt(0) * 31 + id.length)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]);
}
export const APPLY_TEXT = {
  flocke: 'Ich stricke gern und bringe immer Kuchen mit. Eure Blumenwiesen haben mich verzaubert!',
  pingo: 'Ich angle für mein Leben gern und erzähle die besten Seemannsgeschichten.',
  olli: 'Ich sammle Muscheln und Steine und kann prima schwimmen. Ein Platz nah am Wasser wäre ein Traum!',
  kruemel: 'Ich backe, ich gärtnere, ich mag Gemütlichkeit. Und ich teile meine Vorräte!',
  koko: 'Ich schlafe gern lange, aber dann bin ich der fröhlichste Nachbar der Welt.',
  pia: 'Ich liebe Bambus, Teezeremonien und ruhige Abende. Ich würde euch gern Kalligrafie zeigen.',
};
export function housing(s, a, out) {
  if (a.op === 'accept') {
    const H = s.housing ||= {};
    if (H.week === weekOf(s.day)) { out.msg = '🏡 Diese Woche habt ihr schon jemandem zugesagt.'; return false; }
    if (!applicants(s).includes(a.id)) return false;
    if (Object.keys(s.residents || {}).length + (s.pending || []).length >= X.MAX_RESIDENTS) { out.msg = `🏡 Es wohnen schon ${X.MAX_RESIDENTS} Gäste auf der Insel.`; return false; }
    H.week = weekOf(s.day);
    (s.pending ||= []).push(a.id);
    S.addInvX(s, 'grundstueck', 1);
    out.msg = `🏡 ${X.VISITORS[a.id].icon} ${X.VISITORS[a.id].name} zieht ein! Stellt das 🪧 Grundstück im Baumodus auf – am nächsten Morgen steht das Häuschen.`;
    out.got = 'grundstueck'; out.snd = 'fanfare';
    return true;
  }
  const M = s.moving, me = who(s);
  if (!M) return false;
  if (a.op === 'pick') {
    if (M.hold[me] !== undefined || !M.boxes[a.i] || Object.values(M.hold).includes(a.i)) return false;
    M.hold[me] = a.i; out.msg = '📦 Hoppla, ist der schwer! Zum Häuschen tragen.'; out.snd = 'plopp';
    return true;
  }
  if (a.op === 'drop') {
    const i = M.hold[me];
    if (i === undefined) return false;
    delete M.hold[me]; M.boxes[i] = null; M.done++;
    const V = X.VISITORS[M.id];
    if (M.done >= BOXES) {
      const r = s.residents?.[M.id];
      if (r) r.f = (r.f || 0) + 60;
      s.money += 2000; s.stats.earned += 2000;
      out.msg = `📦 Alle Kartons drin! ${V?.icon || ''} ${V?.name || ''}: „Ihr seid die Besten – danke!“ +${fmt(2000)} Taler`; out.snd = 'fanfare';
      s.moving = null;
      S.questEventX(s, 'moving', 1, out);
    } else { out.msg = `📦 ${M.done}/${BOXES} Kartons im Häuschen.`; out.snd = 'place'; }
    return true;
  }
  return false;
}
// Morgens: wer heute eingezogen ist, braucht Hilfe mit den Kartons
export function movingMorning(s) {
  if (s.moving && s.moving.day < s.day) s.moving = null;
  for (const [id, r] of Object.entries(s.residents || {})) {
    if (r.day !== s.day || !r.home) continue;
    const [hx, hz] = r.home.split(',').map(Number), boxes = [];
    for (let t = 0; t < 200 && boxes.length < BOXES; t++) {
      const x = hx + rnd(9) - 4, z = hz + rnd(7) - 1, k = `${x},${z}`;
      if (Math.hypot(x - hx, z - hz) < 2 || !S.canPlace(s, x, z) || boxes.some(b => b[0] === x && b[1] === z)) continue;
      boxes.push([x, z]);
    }
    if (boxes.length) { s.moving = { id, home: r.home, boxes, done: 0, hold: {}, day: s.day }; note(s, '📦 Umzugstag!', `Vor dem neuen Häuschen von ${X.VISITORS[id].icon} ${X.VISITORS[id].name} stehen ${boxes.length} Umzugskartons. Helft ihr beim Tragen?`, null, 1); }
    break;
  }
}
export function resolveMoving(s, me, at) {
  const M = s.moving;
  if (!M || S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, mine = M.hold[me.key || s._who || 'host'];
  if (mine !== undefined) {
    const [hx, hz] = M.home.split(',').map(Number);
    return Math.hypot(px - hx, pz - hz) < 1.9 ? { a: { t: 'housing', op: 'drop' }, label: '📦 Karton abstellen', tiles: [] } : null;
  }
  const i = M.boxes.findIndex(b => b && Math.hypot(px - b[0], pz - b[1]) < 0.8 && !Object.values(M.hold).includes(M.boxes.indexOf(b)));
  return i >= 0 ? { a: { t: 'housing', op: 'pick', i }, label: '📦 Karton hochheben', tiles: [M.boxes[i]] } : null;
}
