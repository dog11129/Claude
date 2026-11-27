// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Grillabend: am Strandgrill grillen – ab 17:30 Uhr und drei Leckereien kommen die Nachbarn dazu
// =====================================================================
export const GRILL_OF = id => id === 'mais' ? 'grillmais' : id === 'kartoffel' ? 'ofenkartoffel' : ['karotte', 'tomate', 'kuerbis', 'brokkoli', 'salatkopf'].includes(id) ? 'grillgemuese'
  : ['apfel', 'birne'].includes(id) ? 'bratapfel' : id === 'mehl' ? 'stockbrot' : FISH_IDS.includes(id) && ITEMS[id].sell < 2500 ? 'grillfisch' : null;
const FISH_IDS = FISH.map(f => f[0]);
export const grillParty = s => (s.grill?.party === s.day && hour(s) >= 17.5 && hour(s) < 22.5 ? s.grill.at : null);
export function grill(s, a, out) {
  const k = `${a.x},${a.z}`, res = GRILL_OF(a.item);
  if (s.obj?.[k]?.k !== 'strandgrill' || !res || !S.takeInvX(s, a.item, 1)) return false;
  S.addInvX(s, res, 1);
  out.got = res;
  out.fx.push({ x: a.x, z: a.z, txt: `${ITEMS[res].icon}`, k: 'smoke' });
  out.msg = `🔥 Brutzel, brutzel … ${ITEMS[res].icon} ${ITEMS[res].name}!`;
  out.snd = 'crackle';
  S.questEventX(s, 'grill', 1, out);
  s.stats.grilled = (s.stats.grilled || 0) + 1;
  if (s.grill?.day !== s.day) s.grill = { day: s.day, n: 0, at: k, party: 0 };
  if (hour(s) >= 17.5 && hour(s) < 22) {
    s.grill.n++;
    if (s.grill.n >= 3 && s.grill.party !== s.day) {
      Object.assign(s.grill, { party: s.day, at: k });
      for (const id of NPC_IDS) S.friendX(s, id).f += 25;
      (s.diary ||= []).push({ day: s.day, icon: '🔥', text: 'Grillabend mit allen Nachbarn' });
      X.moment(s, 'grillabend', '🔥', 'Grillabend', 'Der Duft hat alle Nachbarn angelockt – am Grill wurde gegessen, gelacht und gesungen.', out);
      out.msg = '🔥 Der Duft lockt alle Nachbarn an – Grillabend! 🎶';
      out.snd = 'party';
    }
  }
  return true;
}
