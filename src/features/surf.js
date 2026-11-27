// Teil von extras8.js – 🏄 Surfen: mit dem Surfbrett vom Strand aus Wellen reiten (Minispiel im Browser, Punkte beim Gastgeber).
import { coast, isSea } from '../island.js';
import * as X from '../extras.js';
import { note } from './util.js';
import { personOf } from './duel.js';

export const SURF_SECS = 60;
export const SURF_PAY = 5;           // so oft am Tag gibt es Taler für einen Ritt
export const SURF_MEDAL = 2500;      // ab so vielen Punkten eine Inselmedaille (einmal am Tag)
// Am Strand, Blick aufs Meer: von hier geht es aufs Wasser
export function surfSpot(me) {
  const fx = Math.sin(me.ry), fz = Math.cos(me.ry), c = coast(me.x, me.z);
  if (c < -3.2 || c > 0.3) return null;
  for (let d = 1; d <= 4; d += 0.5) if (isSea(me.x + fx * d, me.z + fz * d)) return [me.x + fx * (d + 2.2), me.z + fz * (d + 2.2)];
  return null;
}
export function giveBoard(s) {
  if (s.surf?.gift || (s.level || 1) < 2) return;
  (s.surf ||= {}).gift = s.day;
  note(s, '🏄 Wellen! Wellen!', 'Ahoi ihr zwei,\nbei Ostwind laufen am Strand die schönsten Wellen. Hier ist ein Brett für euch – einfach am Strand aufs Meer schauen und lospaddeln (oder aufstellen und davor aufs Wasser schauen).\n\nKäpt\'n Flossi 🦭', 'surfbrett', 1, 'kalle');
}
export function surf(s, a, out) {
  if (a.op !== 'score') return false;
  const pts = Math.round(Number(a.pts)), tricks = Math.round(Number(a.tricks) || 0);
  if (!Number.isFinite(pts) || pts < 0 || pts > 30000) return false;
  const S8 = s.surf ||= {}, me = personOf(s, s._who || 'host'), name = String(a.name || '').slice(0, 16) || 'Jemand';
  if (S8.day !== s.day) { S8.day = s.day; S8.runs = {}; S8.medal = {}; }
  S8.runs ||= {}; S8.best ||= {}; S8.names ||= {}; S8.medal ||= {};
  S8.names[me] = name;
  const best = pts > (S8.best[me] || 0);
  if (best) S8.best[me] = pts;
  const rec = !S8.rec || pts > S8.rec.n;
  if (rec) S8.rec = { n: pts, name, day: s.day };
  const n = S8.runs[me] = (S8.runs[me] || 0) + 1, pay = n <= SURF_PAY ? Math.min(1500, Math.round(pts / 4)) : 0;
  s.money += pay;
  s.stats.surf = (s.stats.surf || 0) + 1;
  if (pts >= SURF_MEDAL && !S8.medal[me]) { S8.medal[me] = 1; s.medals = (s.medals || 0) + 1; }
  if (pts >= 1500) X.moment(s, 'surf', '🏄', 'Die erste große Welle', `${name} reitet die Wellen – ${pts.toLocaleString('de-DE')} Punkte!`, out);
  out.msg = `🏄 ${pts.toLocaleString('de-DE')} Punkte${tricks ? ` · ${tricks} Tricks` : ''}${rec ? ' · 🏆 Inselrekord!' : best ? ' · persönliche Bestleistung!' : ''}${pay ? ` · +${pay} Taler` : ''}${S8.medal[me] === 1 && pts >= SURF_MEDAL ? ' · 🏅 Medaille' : ''}`;
  if (S8.medal[me] === 1 && pts >= SURF_MEDAL) S8.medal[me] = 2;
  out.snd = rec || best ? 'fanfare' : 'coin';
  return true;
}
