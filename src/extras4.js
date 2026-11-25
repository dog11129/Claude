// Inselleben 4: Winterspaß, Vögel, Gezeiten-Tümpel, Kanu & Grotte, Vulkaninsel, Minigolf, Tanzabend, Zeitkapsel,
// Stempelrallye, Inselcafé, Bibliothek, Inselradio, Gästebuch, Modenschau, Gartenwettbewerb, Riesengemüse.
// Die Teile liegen in src/features/ – hier werden Aktionen, Orte, Tagesaufgaben und alte Spielstände zusammengesteckt.
import { snow, isWinter } from './features/winter.js';
import { bird, tide, TIDE_POOLS, tidePoolAt, tideLow } from './features/nature2.js';
import { canoe, canoeAt, GROTTO, grottoBlocked, resolveGrotto } from './features/canoe.js';
import { volc, VOLCANO, volcBlocked, resolveVolcano } from './features/volcano.js';
import { golf } from './features/golf.js';
import { dance } from './features/dance.js';
import { capsule, capsuleAt } from './features/capsule.js';
import { stamp, stampAt, STAMPS } from './features/stamps.js';
import { cafe } from './features/cafe.js';
import { library } from './features/library.js';
import { radio } from './features/radio.js';
import { guestbook, guestbookMorning } from './features/guestbook.js';
import { fashion } from './features/fashion.js';
import { giant, giantHarvest, giantWeigh, gardenJudge, isContestDay, GIANT } from './features/gardenc.js';
import * as S from './state.js';
export * from './features/winter.js';
export * from './features/nature2.js';
export * from './features/canoe.js';
export * from './features/volcano.js';
export * from './features/golf.js';
export * from './features/dance.js';
export * from './features/capsule.js';
export * from './features/stamps.js';
export * from './features/cafe.js';
export * from './features/library.js';
export * from './features/radio.js';
export * from './features/guestbook.js';
export * from './features/fashion.js';
export * from './features/gardenc.js';

const obj = (s, k) => Object.values(s.obj || {}).some(o => o?.k === k);
const anyInv = (s, id) => s.inv?.[id] > 0 || Object.values(s.pinv || {}).some(v => v?.[id] > 0);
export const DAILY_OK_W = {
  bird: s => anyInv(s, 'fernglas'), golf: s => obj(s, 'minigolf'), cafe: s => obj(s, 'inselcafe'), book: s => obj(s, 'bibliothek'),
  snowball: s => isWinter(s), dance: s => s.level >= 2,
};

// ---------- Orte weit draußen: Grotte (z > 2600), Vulkaninsel (z > 3000) ----------
export const zoneW = z => (z > 3000 ? 'volcano' : z > 2600 ? 'grotto' : null);
export const blockedW = (s, x, z) => (z > 3000 ? volcBlocked(s, x, z) : grottoBlocked(s, x, z));
export const resolveW = (s, me, sel, at) => (me.z > 3000 ? resolveVolcano(s, me, sel, at) : resolveGrotto(s, me, sel, at));

// Auf der Insel: Gezeiten-Tümpel, Stempelstellen, Zeitkapseln, Kanu-Einstieg, Riesendünger (vor allem anderen geprüft)
export function resolveIslandW(s, me, sel, at, x, z) {
  const one = [[x, z]], cap = capsuleAt(s, `${x},${z}`);
  if (sel === 'duenger') {
    const t = s.tiles[`${x},${z}`];
    if (t?.c && GIANT[t.c.k] && S.stage(t.c) === 3) return { a: { t: 'giant', op: 'feed', x, z }, label: `🧪 Düngen (${t.c.gs || 0}/10)`, tiles: one };
    return { label: '🧪 Riesendünger: auf reife Kürbisse, Melonen oder Kartoffeln', tiles: one };
  }
  if (cap) return s.day >= cap.open ? (sel === 'shovel' ? { a: { t: 'capsule', op: 'open', x, z }, label: '⏳ Zeitkapsel ausgraben!', tiles: one } : { label: '⏳ Zeitkapsel – mit der Schaufel ausgraben!', tiles: one }) : { label: `⏳ Zeitkapsel von ${cap.by} – noch ${cap.open - s.day} Tage`, tiles: one };
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const st = stampAt(px, pz);
  if (st >= 0) { const P = STAMPS[st], has = s.stamps?.[me.key || s._who || 'host']?.[P[0]]; return { a: has ? null : { t: 'stamp', op: 'take', id: P[0] }, label: has ? `📮 ${P[2]} ${P[1]} – schon gestempelt` : `📮 Stempel ${P[2]} ${P[1]}`, tiles: [] }; }
  const tp = tidePoolAt(px, pz);
  if (tp >= 0) return !tideLow(s) ? { label: '🌊 Felsbecken – bei Flut unter Wasser (Ebbe: 6–9 & 15–18 Uhr)', tiles: [] } : s.tidepool[tp] === s.day ? { label: '🌊 Heute schon leer', tiles: [] } : { a: { t: 'tide', op: 'pick', i: tp }, label: '🌊 Im Felsbecken suchen', tiles: [] };
  if (canoeAt(me.x, me.z) && s.inv.kanu > 0) return { canoe: true, label: '🛶 Kanutour flussaufwärts', tiles: [] };
  return null;
}
// In den Zimmern: Inselradio
export const FURN_UI = { inselradio: ['radio', '📻 Inselradio'] };
// Draußen: Inselprojekte & Deko mit eigenem Fenster
export const OBJ_UI = { minigolf: ['golf', '⛳ Minigolf spielen'], inselcafe: ['cafe', '☕ Ins Café'], bibliothek: ['library', '📚 In die Bibliothek'], gaestebuch: ['guestbook', '📖 Ins Gästebuch schauen'] };

// ---------- Laden, Morgen, Ticken ----------
const objOr = (v, d = {}) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
export function migrateW(s) {
  s.winter = objOr(s.winter, { day: 0 });
  s.birds = objOr(s.birds, {}); s.birds.seen = objOr(s.birds.seen); s.birds.n = objOr(s.birds.n); s.birds.looks = objOr(s.birds.looks);
  s.tidepool = objOr(s.tidepool); s.tidebook = objOr(s.tidebook);
  s.grotto = objOr(s.grotto); s.grotto.fish = objOr(s.grotto.fish);
  s.volcano = objOr(s.volcano); s.volcano.rock = objOr(s.volcano.rock); s.volcano.bush = objOr(s.volcano.bush);
  s.golf = objOr(s.golf); s.golf.best = objOr(s.golf.best); s.golf.paid = objOr(s.golf.paid);
  s.dance = objOr(s.dance); s.dance.best = objOr(s.dance.best); s.dance.npc = objOr(s.dance.npc);
  s.capsules = Array.isArray(s.capsules) ? s.capsules.filter(c => c && typeof c.k === 'string' && /^-?\d+,-?\d+$/.test(c.k) && Number.isInteger(c.open)).map(c => ({ ...c, items: objOr(c.items) })).slice(0, 12) : [];
  s.stamps = objOr(s.stamps); s.stampsDone = objOr(s.stampsDone);
  s.cafe = objOr(s.cafe); s.cafe.card = objOr(s.cafe.card); s.cafe.stamped = objOr(s.cafe.stamped); s.cafe.chat = objOr(s.cafe.chat);
  s.library = objOr(s.library); s.library.books = objOr(s.library.books); s.library.tried = objOr(s.library.tried);
  s.radio = objOr(s.radio); s.radio.log = Array.isArray(s.radio.log) ? s.radio.log.slice(0, 8) : []; s.radio.wished = objOr(s.radio.wished);
  s.guestbook = Array.isArray(s.guestbook) ? s.guestbook.filter(e => e && typeof e.text === 'string').slice(0, 60) : [];
  s.fashion = objOr(s.fashion); s.fashion.walked = objOr(s.fashion.walked); s.fashion.last = objOr(s.fashion.last);
  s.gardenc = objOr(s.gardenc);
  s.giant = objOr(s.giant); s.giant.log = Array.isArray(s.giant.log) ? s.giant.log.filter(e => e && Number.isFinite(e.kg)).slice(0, 10) : [];
}
export function morningW(s) {
  if (!s.grotto || !s.volcano || !s.giant) migrateW(s); // Spielstand ohne migrate (Tests, ganz neue Insel)
  s.tidepool = {}; s.grotto.fish = {}; s.volcano.rock = {}; s.volcano.bush = {};
  guestbookMorning(s);
  if (isContestDay(s.day)) gardenJudge(s);
  if (S.festOf(s.day) === 'kuerbis') giantWeigh(s);
}
export function tickW(s) { return false; }

export const W_ACTIONS = { snow, bird, tide, canoe, volc, golf, dance, capsule, stamp, cafe, library, radio, guestbook, fashion, giant };
export { giantHarvest };
