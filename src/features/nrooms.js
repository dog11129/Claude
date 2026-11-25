// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Nachbarzimmer einrichten: drei Wünsche je Nachbar, am Ende ein Dankeschön
// =====================================================================
export const NWISH = {
  mira: [{ t: 'Ich hätte so gern etwas zum Backen in meinem Zimmer – eine Küchenzeile oder einen Herd!', cat: 'kueche', n: 1 }, { t: 'Zwei Pflanzen, dann duftet es wie im Garten.', cat: 'pflanzen', n: 2 }, { t: 'Und einen weichen Teppich für kalte Füße am Morgen.', cat: 'teppiche', n: 1 }],
  bruno: [{ t: 'Ich brauche einen ordentlichen Tisch. Zum Schnitzen. Und zum Essen.', cat: 'tische', n: 1 }, { t: 'Im Winter friert es mich. Ein Kamin oder ein Kachelofen wäre schön.', keys: ['kamin', 'kachelofen'], n: 1 }, { t: 'Zwei gemütliche Sitzplätze – dann kann mich jemand besuchen.', cat: 'sitzen', n: 2 }],
  pippa: [{ t: 'Etwas vom Meer! Ein Aquarium, ein Buddelschiff oder eine Muschellampe!', keys: ['aquarium', 'buddelschiff', 'muschellampe', 'gluecksboje'], n: 1 }, { t: 'Zwei Lampen, damit ich abends meine Angelhaken sortieren kann.', cat: 'licht', n: 2 }, { t: 'Ein bunter Teppich wär toll!', cat: 'teppiche', n: 1 }],
  lio: [{ t: 'Meine Wände sind so leer. Zwei Bilder oder Wandschmuck, bitte!', cat: 'wand', n: 2 }, { t: 'Ein Künstler braucht einen Spiegel. Oder eine Staffelei. Oder eine Kristalllampe.', keys: ['standspiegel', 'staffelei', 'kristalllampe'], n: 1 }, { t: 'Mehr! Mindestens acht Sachen im Zimmer – ich liebe es voll.', total: 8 }],
  kalle: [{ t: 'Ein Tischchen für meinen Tee … rund wäre schön.', keys: ['teeservice', 'teetischchen', 'rundtisch', 'couchtisch'], n: 1 }, { t: 'Drei Pflanzen. Grün beruhigt.', cat: 'pflanzen', n: 3 }, { t: 'Und ein Sessel zum Versinken. Ein Ohrensessel vielleicht?', keys: ['sessel', 'ohrensessel', 'schaukelstuhl', 'mondsessel', 'haengesessel'], n: 1 }],
  wanda: [{ t: 'Für meine Forschung: ein Sternenglobus, eine Sternkarte, ein Teleskop oder ein Forschertisch!', keys: ['sternglobus', 'sternkarte', 'sternteleskop', 'forschertisch'], n: 1 }, { t: 'Zwei Dekosachen zum Nachdenken.', cat: 'deko', n: 2 }, { t: 'Etwas mit Wasser – ein Aquarium oder ein Zimmerbrunnen!', keys: ['aquarium', 'zimmerbrunnen'], n: 1 }],
};
export function roomStuff(s, id) {
  const R = S.roomOf(s, id), all = [...Object.entries(R.items), ...Object.entries(R.rugs), ...Object.entries(R.walls)];
  return all.filter(([k, o]) => FURNITURE[o?.k] && !(k === '-2,-1' && o.k === 'einzelbett' && !o.by)).map(([, o]) => o.k);
}
export function wishOk(s, id, w) {
  const W = NWISH[id]?.[w], list = roomStuff(s, id);
  if (!W) return false;
  if (W.total) return list.length >= W.total;
  return list.filter(k => (W.keys ? W.keys.includes(k) : FURNITURE[k].cat === W.cat)).length >= W.n;
}
export const wishNow = (s, id) => NWISH[id]?.[s.nhome?.[id]?.w || 0] || null;
export function nwish(s, a, out) {
  const id = a.id;
  if (!NWISH[id] || S.hearts(s, id) < 3) return false;
  s.nhome[id] ||= S.nroomBlank(id);
  const h = s.nhome[id];
  if (h.w >= NWISH[id].length) { out.taleSay = 'Mein Zimmer ist perfekt. Ich bin so glücklich hier – danke!'; return true; }
  if (!wishOk(s, id, h.w)) { out.taleSay = `Hmm … noch nicht ganz. ${NWISH[id][h.w].t}`; return true; }
  h.w++;
  S.friendX(s, id).f += 80;
  S.questEventX(s, 'nwish', 1, out);
  const pay = 600 * h.w;
  s.money += pay; s.stats.earned += pay;
  out.snd = 'love';
  if (h.w >= NWISH[id].length) {
    S.addInvX(s, 'traumlampe', 1);
    out.got = 'traumlampe';
    (s.diary ||= []).push({ day: s.day, icon: '🏠', text: `${NPC_DATA[id].name}s Zimmer fertig eingerichtet` });
    X.moment(s, 'nroom:' + id, '🏠', `${NPC_DATA[id].name}s Traumzimmer`, `Jeder Wunsch erfüllt – ${NPC_DATA[id].name} strahlt über das ganze Gesicht.`, out);
    out.taleSay = 'Mein Traumzimmer! Ich weiß gar nicht, was ich sagen soll … Hier, meine Traumlampe – sie soll jetzt bei dir leuchten!';
    out.msg = `🏠 Alle Wünsche erfüllt! +${fmt(pay)} Taler, 🌙 Traumlampe`;
    return true;
  }
  out.taleSay = `Oh, wie schön! Genau so hab ich mir das vorgestellt! Darf ich noch etwas wünschen? ${NWISH[id][h.w].t}`;
  out.msg = `🏠 Wunsch erfüllt! +${fmt(pay)} Taler, +💕`;
  return true;
}
