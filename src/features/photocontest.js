// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Fotowettbewerb: jede Woche ein Thema, sonntags früh bewerten drei Nachbarn
// =====================================================================
export const PHOTO_THEMES = {
  blumen: ['🌷', 'Blumenpracht', 'Je mehr blühende Blumen im Bild, desto besser.'],
  abend: ['🌇', 'Abendrot', 'Fotografiert zwischen 17 und 20 Uhr, wenn der Himmel glüht.'],
  freunde: ['🤗', 'Freunde', 'Mitspieler, Nachbarn und Besuch – alle zusammen aufs Bild!'],
  nacht: ['🌙', 'Nachtzauber', 'Sterne, Laternen, Feuerwerk – nachts fotografiert.'],
  tiere: ['🐾', 'Tierisch', 'Haustiere, Hühner, Kühe, Schmetterlinge … Hauptsache Tiere!'],
  strand: ['🏖️', 'Am Strand', 'Sand, Meer, Muscheln und Sandburgen.'],
  wetter: ['🌦️', 'Wetterwunder', 'Regen, Schnee, Nebel oder Gewitter – besonderes Wetter zählt.'],
  zuhause: ['🏡', 'Gemütliches Zuhause', 'Ein schön eingerichtetes Zimmer von innen.'],
};
const THEME_IDS = Object.keys(PHOTO_THEMES);
export const photoWeek = s => Math.floor((s.day - 1) / 7);
export const photoTheme = s => THEME_IDS[photoWeek(s) % THEME_IDS.length];
export function photoNew(s) { s.photoc = { week: photoWeek(s), theme: photoTheme(s), entries: {}, last: s.photoc?.last || null }; }
export function photoentry(s, a, out) {
  if (s.photoc.week !== photoWeek(s)) photoNew(s);
  if (!Number.isInteger(a.score) || a.score < 0 || a.score > 100) return false;
  if (typeof a.img !== 'string' || !a.img.startsWith('data:image/jpeg;base64,') || a.img.length > 20000) { out.msg = 'Das Foto ist zu groß.'; return false; }
  const old = s.photoc.entries[who(s)];
  s.photoc.entries[who(s)] = { name: String(a.name || 'Gast').slice(0, 16), score: a.score, img: a.img, day: s.day };
  S.questEventX(s, 'photo', 1, out);
  out.msg = `🏆 Foto ${old ? 'ausgetauscht' : 'eingereicht'}! Thema der Woche: ${PHOTO_THEMES[s.photoc.theme][0]} ${PHOTO_THEMES[s.photoc.theme][1]}. Sonntag früh bewertet die Jury.`;
  out.snd = 'shutter';
  return true;
}
const JURY_LINE = [
  ['Hmm … da sieht man nicht so viel vom Thema.', 'Ein Anfang! Nächstes Mal näher ran.'],
  ['Hübsch! Das Thema erkennt man.', 'Nett, wirklich nett.'],
  ['Oh, das gefällt mir richtig gut!', 'Schöne Farben, schöner Moment!'],
  ['Wow! Das hänge ich mir an die Wand!', 'Ganz großes Kino!'],
  ['Das ist das schönste Foto, das ich je gesehen habe!', 'Ich bin sprachlos. Perfekt!'],
];
export function photoJudge(s) {
  const P = s.photoc;
  if (!P || P.week === photoWeek(s)) return false;
  const list = Object.values(P.entries || {});
  if (list.length) {
    const res = list.map(e => {
      const votes = shuffle(NPC_IDS).slice(0, 3).map(id => { const st = Math.max(1, Math.min(5, Math.round(e.score / 20 + (Math.random() - 0.5) * 1.4))); return [id, st, pick(JURY_LINE[st - 1])]; });
      return { name: e.name, img: e.img, score: e.score, stars: votes.reduce((t, v) => t + v[1], 0), votes };
    }).sort((x, y) => y.stars - x.stars || y.score - x.score);
    const win = res[0], T = PHOTO_THEMES[P.theme];
    s.money += 2500; s.stats.earned += 2500;
    note(s, `🏆 Fotowettbewerb „${T[1]}“: ${win.name} gewinnt!`, `Liebe Insel,\ndie Jury hat entschieden: ${win.name}s Foto bekommt ${win.stars} von 15 Sternen!\n${win.votes.map(v => `${NPC_DATA[v[0]].icon} ${NPC_DATA[v[0]].name}: „${v[2]}“`).join('\n')}\n\n2.500 Taler gehen in die Inselkasse, und der Foto-Pokal ist für euch.`, 'fotopokal', 1);
    (s.diary ||= []).push({ day: s.day, icon: '🏆', text: `${win.name} gewinnt den Fotowettbewerb „${T[1]}“` });
    X.moment(s, 'fotowettbewerb', '📸', 'Fotowettbewerb gewonnen', `${win.name} hat mit einem Foto zum Thema „${T[1]}“ gewonnen.`);
    P.last = { theme: P.theme, week: P.week, list: res.map(r => ({ ...r, img: r === win ? r.img : '' })) };
  }
  photoNew(s);
  return true;
}
