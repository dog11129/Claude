// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Heißluftballon (Rathaus-Projekt „Ballonplatz“): Rundflug über die Insel, Geschenke am Himmel fangen
// =====================================================================
export const RIDE_PRICE = 1000, RIDE_SECS = 46, SKY_GIFTS = 3;
// Flugbahn (ohne Zufall, damit alle dasselbe sehen): t = Sekunden seit Start, Start/Landung am Ballonplatz
export function ridePos(t, sx, sz) {
  const up = Math.min(1, t / 5), down = Math.min(1, Math.max(0, (RIDE_SECS - t) / 5)), k = Math.min(up, down);
  const a = Math.atan2(sz, sx) + Math.max(0, t - 3) / (RIDE_SECS - 6) * Math.PI * 2, R = 15 + Math.sin(t * 0.3) * 2;
  const cx = Math.cos(a) * R, cz = Math.sin(a) * R, m = Math.min(1, Math.min(t, RIDE_SECS - t) / 7);
  return { x: sx + (cx - sx) * m, z: sz + (cz - sz) * m, y: 0.4 + k * 7.5 + Math.sin(t * 0.8) * 0.3 * k };
}
// Wo schweben heute die Himmelsgeschenke? (Zeitpunkte auf der Runde)
export const skyGiftTimes = s => [0, 1, 2].map(i => 10 + ((s.day * 7 + i * 11) % 9) + i * 10);
export function ride(s, a, out) {
  if (!Object.values(s.obj || {}).some(o => o?.k === 'ballonplatz')) return false;
  if (s.money < RIDE_PRICE) { out.msg = `Eine Ballonfahrt kostet ${RIDE_PRICE} Taler.`; return false; }
  s.money -= RIDE_PRICE;
  s.stats.rides = (s.stats.rides || 0) + 1;
  out.ride = true;
  out.msg = '🎈 Leinen los! Fang unterwegs die Geschenkballons am Himmel.';
  out.snd = 'burner';
  S.questEventX(s, 'ride', 1, out);
  return true;
}
export function skygift(s, a, out) {
  s.skyg = s.skyg?.day === s.day ? s.skyg : { day: s.day, who: {} };
  const w = who(s), n = s.skyg.who[w] || 0;
  if (n >= SKY_GIFTS) return false;
  s.skyg.who[w] = n + 1;
  if (Math.random() < 0.6) { const m = 300 + rnd(9) * 100; s.money += m; s.stats.earned += m; out.msg = `🎁 Ein Himmelsgeschenk: ${fmt(m)} Taler!`; }
  else { const id = pick(['sternsplitter', 'sternsplitter', 'goldnugget', 'perle', 'herzballon']); S.addInvX(s, id, 1); out.got = id; out.msg = `🎁 Ein Himmelsgeschenk: ${ITEMS[id].icon} ${ITEMS[id].name}!`; }
  out.snd = 'found';
  return true;
}
export function rideshot(s, a, out) { // einmal im Fotobuch: die Insel von oben
  return X.moment(s, 'luftbild', '🎈', 'Die Insel von oben', 'Mit dem Heißluftballon über Dächer, Bäume und Strand – wie klein und schön alles aussieht!', out);
}
