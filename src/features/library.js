// Teil von extras4.js – Bibliothek (Rathausprojekt): Rätselbücher sammeln, abends Lesestunde mit den Nachbarn.
import { NPC_IDS } from '../data.js';
import * as S from '../state.js';
import { who, hour, fmt } from './util.js';

// [id, Titel, Rätsel, Antworten, richtig]
export const BOOKS = [
  ['b1', 'Der kleine Leuchtturm', 'Was hat Beine, kann aber nicht laufen?', ['Ein Tisch', 'Ein Fisch', 'Ein Hut'], 0],
  ['b2', 'Kalle und das Kakaorezept', 'Was wird nasser, je mehr es trocknet?', ['Ein Handtuch', 'Ein Stein', 'Eine Wolke'], 0],
  ['b3', 'Die Reise der Flaschenpost', 'Welcher Monat hat 28 Tage?', ['Nur der Februar', 'Alle', 'Keiner'], 1],
  ['b4', 'Pippas Sternenkarte', 'Was gehört dir, wird aber öfter von anderen benutzt?', ['Dein Name', 'Dein Hut', 'Deine Schaufel'], 0],
  ['b5', 'Das Geheimnis im Moos', 'Je mehr du davon wegnimmst, desto größer wird es. Was ist es?', ['Ein Loch', 'Ein Berg', 'Ein Kuchen'], 0],
  ['b6', 'Wandas Forscherbuch', 'Was hat einen Hals, aber keinen Kopf?', ['Eine Flasche', 'Eine Schlange', 'Ein Baum'], 0],
  ['b7', 'Hundert Muscheln', 'Was läuft und läuft, hat aber keine Füße?', ['Die Zeit', 'Ein Hase', 'Ein Stuhl'], 0],
  ['b8', 'Der verschlafene Bär', 'Was kann man fangen, aber nicht werfen?', ['Einen Schnupfen', 'Einen Ball', 'Einen Stein'], 0],
  ['b9', 'Lios Gartenjahr', 'Welches Tier trägt sein Haus immer mit sich?', ['Die Schnecke', 'Der Hund', 'Die Möwe'], 0],
  ['b10', 'Die singende Tür', 'Was hat viele Zähne, beißt aber nie?', ['Ein Kamm', 'Ein Hai', 'Ein Bär'], 0],
  ['b11', 'Ein Sommer am Steg', 'Was ist leichter als eine Feder, aber niemand kann es lange halten?', ['Den Atem', 'Einen Stein', 'Eine Kerze'], 0],
  ['b12', 'Das Rätsel der Möwe', 'Was hat ein Auge, kann aber nicht sehen?', ['Eine Nadel', 'Eine Eule', 'Ein Fenster'], 0],
  ['b13', 'Mira backt für alle', 'Was wird kleiner, je mehr man daran zieht?', ['Eine Zigarette … nein: ein Kaugummi-Faden', 'Ein Gummiband', 'Eine Leiter'], 0],
  ['b14', 'Nebel über der Bucht', 'Was kommt nach oben, aber nie wieder herunter?', ['Dein Alter', 'Ein Ball', 'Regen'], 0],
  ['b15', 'Der Kompass der Großmutter', 'Was gibt es einmal in jeder Minute, zweimal in jedem Moment, aber nie in tausend Jahren?', ['Den Buchstaben M', 'Eine Sekunde', 'Ein Jahr'], 0],
  ['b16', 'Funken im Vulkan', 'Was hat Blätter, ist aber keine Pflanze?', ['Ein Buch', 'Ein Kaktus', 'Ein Pilz'], 0],
  ['b17', 'Die Laternen von Tag 100', 'Was kann reisen, bleibt aber immer in einer Ecke?', ['Eine Briefmarke', 'Ein Koffer', 'Ein Zug'], 0],
  ['b18', 'Hoppels Rübenrechnung', 'Fünf Rüben, du nimmst zwei weg. Wie viele hast du?', ['Zwei', 'Drei', 'Fünf'], 0],
  ['b19', 'Das Lied der Wale', 'Was zerbricht, wenn man seinen Namen sagt?', ['Die Stille', 'Ein Glas', 'Ein Ei'], 0],
  ['b20', 'Das Ende vom Regenbogen', 'Was ist immer vor dir, kann aber nie gesehen werden?', ['Die Zukunft', 'Die Nase', 'Der Horizont'], 0],
];
export const hasLibrary = s => Object.values(s.obj || {}).some(o => o?.k === 'bibliothek');
export const bookToday = s => { const have = s.library.books, open = BOOKS.filter(b => !have[b[0]]); return open.length ? open[(s.day * 7) % open.length] : null; };
export const readingHour = s => { const h = hour(s); return h >= 17 && h < 20; };
export function library(s, a, out) {
  if (!hasLibrary(s)) return false;
  const L = s.library, me = who(s);
  if (L.day !== s.day) { L.day = s.day; L.tried = {}; L.read = 0; }
  if (a.op === 'answer') {
    const b = bookToday(s);
    if (!b || !Number.isInteger(a.i) || a.i < 0 || a.i > 2) return false;
    if (L.tried[me]) { out.msg = '📚 Für heute hast du schon geraten – morgen gibt es ein neues Buch.'; return false; }
    L.tried[me] = 1;
    if (a.i !== b[4]) { out.msg = `📚 Knapp daneben! Die Antwort war: ${b[3][b[4]]}. Morgen wartet ein anderes Buch.`; out.snd = 'fail'; return true; }
    L.books[b[0]] = s.day;
    s.money += 300; s.stats.earned += 300;
    out.msg = `📚 Richtig! „${b[1]}“ steht jetzt in eurem Regal (${Object.keys(L.books).length}/${BOOKS.length}). +300 Taler`;
    if (Object.keys(L.books).length === BOOKS.length) { s.money += 5000; s.stats.earned += 5000; out.msg += ` · Alle Bücher! ${fmt(5000)} Taler Finderlohn.`; }
    out.snd = 'found';
    S.questEventX(s, 'book', 1, out);
    return true;
  }
  if (a.op === 'read') {
    if (!readingHour(s)) { out.msg = '📖 Die Lesestunde ist abends von 17 bis 20 Uhr.'; return false; }
    if (L.read) { out.msg = '📖 Heute wurde schon vorgelesen.'; return false; }
    if (!S.npcAwake(s)) { out.msg = '📖 Die Nachbarn schlafen schon.'; return false; }
    L.read = 1;
    for (const id of NPC_IDS) S.friendX(s, id).f += 2;
    out.msg = '📖 Alle hören gespannt zu – die Nachbarn mögen dich jetzt noch ein bisschen mehr.';
    out.snd = 'chat';
    return true;
  }
  return false;
}
