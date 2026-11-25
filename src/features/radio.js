// Teil von extras4.js – Inselradio „Kuschelfunk“: Nachbarn moderieren, Wunschlieder, Inselnachrichten.
import { NPC_IDS, NPC_DATA } from '../data.js';
import { WEATHER } from '../extras.js';
import * as S from '../state.js';
import { who } from './util.js';

// Wunschlieder: Noten als MIDI-Nummern (0 = Pause), 8 pro Takt
export const RADIO_SONGS = [
  ['sonnenwalzer', 'Sonnenwalzer', [67, 0, 64, 67, 72, 0, 71, 69, 67, 0, 64, 0, 65, 67, 69, 0, 67, 0, 64, 67, 72, 74, 76, 0, 74, 72, 71, 72, 0, 0, 0, 0]],
  ['regenpolka', 'Regentropfen-Polka', [72, 71, 69, 71, 72, 0, 67, 0, 69, 67, 65, 67, 69, 0, 64, 0, 65, 67, 69, 71, 72, 0, 76, 0, 74, 72, 71, 69, 67, 0, 0, 0]],
  ['mondlied', 'Mondlied', [60, 0, 64, 0, 67, 0, 64, 0, 62, 0, 65, 0, 69, 0, 65, 0, 64, 0, 67, 0, 72, 0, 67, 0, 64, 62, 60, 0, 0, 0, 0, 0]],
  ['inselhymne', 'Kuschelinsel-Hymne', [65, 65, 69, 72, 0, 72, 70, 69, 67, 0, 67, 70, 0, 69, 67, 65, 64, 0, 64, 67, 72, 0, 70, 69, 67, 69, 65, 0, 0, 0, 0, 0]],
];
export const host = s => NPC_IDS[(s.day * 5 + 2) % NPC_IDS.length];
// Nachrichten aus dem echten Spielstand
export function radioNews(s) {
  const out = [], w = WEATHER[s.wxNext];
  if (w) out.push(`Das Wetter für morgen: ${w[0]} ${w[1]}.`);
  const f = S.festOf(s.day + 1);
  if (f) out.push('Morgen ist ein Festtag – nicht verpassen!');
  const b = S.birthdayOf(s.day);
  if (b) out.push(`Heute hat ${NPC_DATA[b]?.name || b} Geburtstag! 🎂`);
  if (S.turnipSeller(s)) out.push('Hoppel verkauft heute Rüben – wer mutig ist, kauft!');
  const best = Object.entries(s.npc || {}).sort((a, b) => (b[1]?.f || 0) - (a[1]?.f || 0))[0];
  if (best) out.push(`Beste Freunde der Woche: ihr und ${NPC_DATA[best[0]]?.name || best[0]}.`);
  out.push(`Auf der Insel stehen ${Object.keys(s.obj || {}).length} Dinge – und alle sind wunderschön.`);
  return out;
}
export function radio(s, a, out) {
  const R = s.radio;
  if (a.op !== 'wish' || !RADIO_SONGS.some(x => x[0] === a.song)) return false;
  const song = RADIO_SONGS.find(x => x[0] === a.song), name = String(a.name || 'Gast').slice(0, 16), me = who(s);
  R.log = [{ day: s.day, name, song: song[0] }, ...(R.log || [])].slice(0, 8);
  if (R.day !== s.day) { R.day = s.day; R.wished = {}; }
  if (!R.wished[me]) { R.wished[me] = 1; S.friendX(s, host(s)).f += 2; }
  out.msg = `📻 ${NPC_DATA[host(s)]?.name || 'Kuschelfunk'}: „Ein Wunsch von ${name}: ${song[1]} – für alle auf der Insel!“`;
  out.snd = 'chat';
  return true;
}
