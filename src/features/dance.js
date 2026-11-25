// Teil von extras4.js – Tanzabend im Mondschein-Club: Rhythmus-Spiel (Pfeile im Takt), Nachbarn tanzen mit.
import { NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { who } from './util.js';

export const SONGS = [
  { id: 'walzer', name: 'Mondscheinwalzer', bpm: 96, len: 32, seed: 3 },
  { id: 'disco', name: 'Kokos-Disco', bpm: 118, len: 40, seed: 7 },
  { id: 'polka', name: 'Inselpolka', bpm: 136, len: 48, seed: 11 },
];
// Noten eines Lieds: [Schlag, Spur 0–3] – fest je Lied, auf allen Geräten gleich
export function songNotes(song) {
  let x = song.seed * 7919 + 13;
  const r = () => ((x = (x * 48271) % 2147483647) / 2147483647), out = [];
  for (let b = 4; b < song.len + 4; b += r() < 0.3 ? 0.5 : 1) { out.push([b, Math.floor(r() * 4)]); if (r() < 0.12) out.push([b, (Math.floor(r() * 3) + 1 + out[out.length - 1][1]) % 4]); }
  return out;
}
export const danceMax = song => songNotes(song).length * 100;
export const danceRank = (song, score) => { const p = score / danceMax(song); return p >= 0.85 ? 'gold' : p >= 0.6 ? 'silber' : p >= 0.3 ? 'bronze' : null; };
export const dancers = s => { const r = (s.day * 31) % NPC_IDS.length; return [NPC_IDS[r], NPC_IDS[(r + 2) % NPC_IDS.length], NPC_IDS[(r + 4) % NPC_IDS.length]]; };
export function dance(s, a, out) {
  const song = SONGS.find(x => x.id === a.song);
  if (a.op !== 'score' || !song || !Number.isInteger(a.score) || a.score < 0 || a.score > danceMax(song)) return false;
  const D = s.dance, me = who(s), rank = danceRank(song, a.score), k = me + ':' + song.id;
  D.best[k] = Math.max(D.best[k] || 0, a.score);
  if (D.day !== s.day) { D.day = s.day; D.npc = {}; }
  if (!D.npc[me]) { D.npc[me] = 1; for (const id of dancers(s)) S.friendX(s, id).f += 3; }
  const prize = { gold: 900, silber: 500, bronze: 200 }[rank] || 0;
  if (prize) { s.money += prize; s.stats.earned += prize; }
  out.msg = rank ? `💃 ${{ gold: '🥇 Gold', silber: '🥈 Silber', bronze: '🥉 Bronze' }[rank]}! ${a.score} Punkte · +${prize} Taler` : `💃 ${a.score} Punkte – das üben wir noch!`;
  if (rank === 'gold' && !D.cup) { D.cup = s.day; S.addInvX(s, 'tanzpokal', 1); out.msg += ' Der Tanz-Pokal gehört euch!'; }
  out.snd = rank === 'gold' ? 'fanfare' : 'coin';
  S.questEventX(s, 'dance', 1, out);
  return true;
}
