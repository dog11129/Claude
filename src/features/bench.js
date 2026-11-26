// Teil von extras8.js – 🌅 Klippenbank: zu zweit bei Sonnenuntergang hinsetzen.
// Die Bank kommt als Geschenk per Post und lässt sich überall hinstellen (am schönsten an die Ostküste, dort geht die Sonne unter).
import * as X from '../extras.js';
import { hour, note } from './util.js';

export const SUNSET = [17.6, 20.4];          // in diesem Zeitfenster zählt der Sonnenuntergang
export const BENCH_SEAT = 0.36;              // Abstand der beiden Sitzplätze von der Mitte
export const BENCH_GIFT = 3;                 // so viele gemeinsame Sonnenuntergänge bis zum Abendrot-Bild
export const sunsetTime = s => hour(s) >= SUNSET[0] && hour(s) <= SUNSET[1] && !['rain', 'storm', 'snow'].includes(s.weather);
export const benches = s => Object.entries(s.obj || {}).filter(([, o]) => o?.k === 'klippenbank').map(([k, o]) => [+k.split(',')[0], +k.split(',')[1], o.r | 0]);
// Sitzplätze links und rechts (in Blickrichtung der Bank)
export function seats(x, z, r) {
  const a = r * Math.PI / 2, cx = Math.cos(a), cz = -Math.sin(a);
  return [[x - cx * BENCH_SEAT, z - cz * BENCH_SEAT], [x + cx * BENCH_SEAT, z + cz * BENCH_SEAT]];
}

// Einmalig: die Bank als Geschenk von Mira
export function giveBench(s) {
  if (s.bench8?.gift) return;
  s.bench8 = { ...(s.bench8 || {}), gift: s.day };
  note(s, '🌅 Für euch zwei', 'Ihr Lieben,\nauf der Insel gibt es so schöne Abende! Stellt diese Bank an die Küste im Osten – dort geht die Sonne unter. Setzt euch zu zweit hin, wenn der Himmel rosa wird … 💕\n\nMira 🦔', 'klippenbank', 1, 'mira');
}

// Beim Gastgeber: zwei sitzen gemeinsam auf einer Klippenbank, während die Sonne untergeht
export function sunsetTogether(s, names, out = {}) {
  const B = s.bench8 ||= {};
  if (B.day === s.day || !sunsetTime(s)) return false;
  B.day = s.day;
  B.n = (B.n || 0) + 1;
  const who = names.slice(0, 2).join(' & ');
  (s.diary ||= []).push({ day: s.day, icon: '🌅', text: `${who} haben zusammen den Sonnenuntergang angeschaut` });
  X.moment(s, 'sunset', '🌅', 'Sonnenuntergang zu zweit', `${who} auf der Klippenbank, der Himmel ganz rosa.`, out);
  if (B.n === BENCH_GIFT) note(s, '🌅 Ein Bild für euch', `Ihr habt jetzt schon ${BENCH_GIFT}-mal zusammen den Sonnenuntergang angeschaut – ich hab ihn für euch gemalt! 🎨\n\nMira 🦔`, 'abendrotbild', 1, 'mira');
  return true;
}
