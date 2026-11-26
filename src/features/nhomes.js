// Teil von extras12.js – Nachbarn richten ihr Zuhause selbst ein: Jede/r hat einen eigenen Geschmack (Möbel, Tapeten,
// Böden), stellt alle paar Tage etwas Neues auf, räumt um oder tapeziert neu. Ihre eigenen Sachen (npc: 1) bleiben im
// Haus; was ihr dazustellt, bleibt unangetastet. Außerdem: Wo steckt jemand gerade (zu Hause, unterwegs, im Bett)?
import { NPC_DATA, NPC_IDS, NPC_PLAN, BUILDINGS } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import { NWISH } from './nrooms.js';

// Geschmack: Möbel in der Reihenfolge, in der sie angeschafft werden; Tapeten und Böden zum Wechseln
export const NTASTE = {
  mira: { furn: ['schaukelstuhl', 'blumenvase', 'flickenteppich', 'kraeuterbund', 'kommode', 'petroleumlampe', 'teddy', 'milchkanne', 'bild', 'pfingstrosenvase', 'herzteppich', 'bonbonglas', 'wandregal', 'ohrensessel', 'sonnenblumenvase', 'zinkkanne'],
    walls: ['rosa', 'bluemchen', 'herzchen', 'vanille'], floors: ['dielen', 'rosadielen', 'parkett'], word: 'gemütlich' },
  bruno: { furn: ['kaminholz', 'baumstumpftisch', 'fellteppich', 'kuckucksuhr', 'honigregal', 'petroleumlampe', 'holzschlitten', 'zapfenkranz', 'vorratsregal', 'kiste', 'tannenbaum', 'teppich_rund', 'wandteppich', 'milchkanne', 'buecherregal', 'stehlampe'],
    walls: ['holz', 'ziegel', 'karo'], floors: ['dunkel', 'dielen', 'stein'], word: 'urig' },
  pippa: { furn: ['seekiste', 'strandkorbsessel', 'wellenteppich', 'rettungsring', 'muschelregal', 'ankerlampe', 'surfdeko', 'fischernetz', 'zimmerpalme', 'bullauge', 'kiste', 'teppich_rund', 'inselradio', 'hocker', 'wanduhr', 'topfpflanze'],
    walls: ['karo', 'wolken', 'mint'], floors: ['fliesen', 'dielen', 'parkett'], word: 'maritim' },
  lio: { furn: ['zeichentisch', 'farbregal', 'karoteppich', 'pinnwand', 'drehstuhl', 'leselampe', 'schneiderpuppe', 'gitarrenstaender', 'musterbild', 'globus', 'grammophon', 'teppich', 'kreidetafel', 'papierkorb', 'orchideentopf', 'plattenspieler'],
    walls: ['bluemchen', 'mint', 'ziegel', 'vanille'], floors: ['parkett', 'schach', 'dielen'], word: 'kreativ' },
  kalle: { furn: ['bodenkissen', 'glockenlampe', 'moosteppich', 'haengepflanze', 'wurzelregal', 'bambuslampe', 'zimmerbrunnen', 'blumenampel', 'eichelvase', 'schneckenhocker', 'buecherregal', 'teppich_rund', 'wanduhr', 'pilzlampe', 'kerzen', 'nachttisch'],
    walls: ['mint', 'vanille', 'holz'], floors: ['moos', 'parkett', 'dielen'], word: 'ruhig' },
  wanda: { furn: ['raketenregal', 'saturnsessel', 'galaxieteppich', 'sternbildposter', 'planetenlampe', 'meteorit', 'schreibtisch', 'wanduhr', 'astronautenhelm', 'buecherregal', 'ufolampe', 'sternenteppich', 'pinnwand', 'terrarium', 'sternhocker', 'globus'],
    walls: ['sterne', 'ziegel', 'wolken'], floors: ['stein', 'dunkel', 'schach'], word: 'verträumt' },
};
export const NPC_CAP = { items: 6, walls: 2, rugs: 1 }; // so viel stellt ein Nachbar höchstens selbst auf
export const ROOM_CAP = 15;                              // … und nur, solange das Zimmer nicht schon voll ist
const START = 4, GAP = 2, RESTYLE_GAP = 5;

const layerOf = (h, k) => { const f = FURNITURE[k]; return f.rug ? h.rugs : f.wall ? h.walls : h.items; };
const kindOf = k => (FURNITURE[k].rug ? 'rugs' : FURNITURE[k].wall ? 'walls' : 'items');
const own = (h, kind) => Object.entries(h[kind] || {}).filter(([, o]) => o?.npc);
const count = h => Object.keys(h.items).length + Object.keys(h.rugs).length + Object.keys(h.walls).length;
const has = (h, k) => ['items', 'rugs', 'walls'].some(m => Object.values(h[m]).some(o => o?.k === k));
// Wünsche an euch bleiben Wünsche: Was ein offener Wunsch verlangt, kauft sich niemand selbst
function wished(s, id, k) {
  const h = s.nhome[id];
  return (NWISH[id] || []).slice(h.w || 0).some(W => (W.keys ? W.keys.includes(k) : W.cat && FURNITURE[k].cat === W.cat));
}
// Stellplätze: Wandschmuck an Rück- und Seitenwand, Teppiche in der Mitte, Möbel am Rand (die Mitte bleibt frei zum Laufen)
const WALL_SPOTS = [[1, -2], [-1, -2], [2, -2], [0, -2], [3, -2], [-3, -2], [3, 0], [-3, 1], [3, 1], [-3, 2]];
const RUG_SPOTS = [[0, 0], [-1, 0], [1, 0], [0, -1], [1, -1], [-1, 1], [1, 1], [0, 1]];
const FLOOR_SPOTS = [[1, -2, 0], [2, -2, 0], [3, -2, 0], [0, -2, 0], [-1, -2, 0], [3, -1, 3], [3, 0, 3], [3, 1, 3], [-3, -2, 0], [-3, 1, 1], [-3, 2, 1], [3, 2, 3], [-2, -2, 0]];
function spotsFor(s, id, k) {
  const R = S.roomOf(s, id), f = FURNITURE[k];
  const h = s.nhome[id] || R, clash = (m, x, z) => (m[`${x},${z}`] ? 1 : 0); // Wandschmuck nicht hinter Möbel hängen – und umgekehrt
  if (f.wall) return WALL_SPOTS.filter(([x, z]) => S.canFurnish(s, k, x, z, 0, R)).sort((a, b) => clash(h.items, ...a) - clash(h.items, ...b)).map(([x, z]) => [x, z, S.wallRot(s, x, z, R)]);
  if (f.rug) return RUG_SPOTS.filter(([x, z]) => S.canFurnish(s, k, x, z, 0, R)).map(([x, z]) => [x, z, 0]);
  if (f.w * f.d > 2) return [];
  return FLOOR_SPOTS.filter(([x, z, r]) => S.canFurnish(s, k, x, z, r, R) && !(S.footprint(k, x, z, r).some(([i, j]) => i === 0 && j >= 1))).sort((a, b) => clash(h.walls, a[0], a[1]) - clash(h.walls, b[0], b[1]));
}
function put(s, id, k, pickSpot = l => l[0]) {
  const h = s.nhome[id], sp = spotsFor(s, id, k);
  if (!sp.length) return false;
  const [x, z, r] = pickSpot(sp);
  layerOf(h, k)[`${x},${z}`] = { k, r, npc: 1 };
  return true;
}
// Was käme als Nächstes? (erstes Stück vom Geschmack, das noch nicht da ist, hinpasst und kein offener Wunsch ist)
function nextPiece(s, id, kinds = ['items', 'rugs', 'walls']) {
  const h = s.nhome[id];
  return NTASTE[id].furn.find(k => FURNITURE[k] && kinds.includes(kindOf(k)) && own(h, kindOf(k)).length < NPC_CAP[kindOf(k)] && !has(h, k) && !wished(s, id, k) && spotsFor(s, id, k).length) || null;
}
const news = (h, s, kind, k) => { h.self.news = { kind, k: k || null, day: s.day }; };

// Ein Stück anschaffen. rnd: Zufallszahl 0–1 (für Tests einstellbar)
export function npcFurnish(s, id) {
  const h = s.nhome[id];
  if (!h || count(h) >= ROOM_CAP) return null;
  const k = nextPiece(s, id);
  if (!k || !put(s, id, k)) return null;
  h.self.n++; h.self.last = s.day;
  news(h, s, 'new', k);
  return k;
}
// Umgestalten, wenn alles steht: ein eigenes Stück austauschen, umstellen oder neu tapezieren / Boden legen
export function npcRestyle(s, id, rnd = Math.random) {
  const h = s.nhome[id], T = NTASTE[id], roll = rnd();
  h.self.last = s.day;
  if (roll < 0.34) {
    const next = T.walls[(T.walls.indexOf(h.wall) + 1) % T.walls.length];
    if (next && next !== h.wall) { h.wall = next; news(h, s, 'wall'); return 'wall'; }
  }
  if (roll < 0.6) {
    const next = T.floors[(T.floors.indexOf(h.floor) + 1) % T.floors.length];
    if (next && next !== h.floor) { h.floor = next; news(h, s, 'floor'); return 'floor'; }
  }
  // ein eigenes Stück gegen ein anderes vom Wunschzettel tauschen (oder wenigstens umstellen)
  const mine = ['items', 'walls', 'rugs'].flatMap(m => own(h, m).map(([key, o]) => ({ m, key, o })));
  if (!mine.length) return null;
  const old = mine[Math.floor(rnd() * mine.length) % mine.length];
  delete h[old.m][old.key];
  const fresh = T.furn.find(k => FURNITURE[k] && kindOf(k) === old.m && k !== old.o.k && !has(h, k) && !wished(s, id, k) && spotsFor(s, id, k).length);
  if (fresh && put(s, id, fresh, l => l[Math.floor(rnd() * l.length) % l.length])) { news(h, s, 'swap', fresh); return 'swap'; }
  const sp = spotsFor(s, id, old.o.k).filter(([x, z]) => `${x},${z}` !== old.key);
  if (sp.length) { const [x, z, r] = sp[Math.floor(rnd() * sp.length) % sp.length]; h[old.m][`${x},${z}`] = { ...old.o, r }; news(h, s, 'move', old.o.k); return 'move'; }
  h[old.m][old.key] = old.o; // passt nirgends anders hin: bleibt, wo es war
  return null;
}
// Jeden Morgen: Wer hat Lust, etwas zu verändern? (höchstens ein Nachbar am Tag, damit es etwas Besonderes bleibt)
export function nhomeMorning(s, rnd = Math.random) {
  const ids = NPC_IDS.filter(id => s.nhome?.[id]?.self);
  const todo = ids.filter(id => s.day - s.nhome[id].self.last >= GAP && nextPiece(s, id) && count(s.nhome[id]) < ROOM_CAP);
  if (todo.length) { const id = todo[Math.floor(rnd() * todo.length) % todo.length]; return npcFurnish(s, id) ? id : null; }
  const done = ids.filter(id => s.day - s.nhome[id].self.last >= RESTYLE_GAP);
  if (done.length && rnd() < 0.5) { const id = done[Math.floor(rnd() * done.length) % done.length]; return npcRestyle(s, id, rnd) ? id : null; }
  return null;
}

// ---------- Wo steckt jemand gerade? ----------
const planSlot = (s, id) => { const plan = NPC_PLAN[id], hour = 6 + s.dayTime * 18; let i = 0; for (let k = 0; k < plan.length; k++) if (hour >= plan[k][0]) i = k; return [i, plan]; };
// 'sleep' = liegt im Bett, 'home' = zu Hause (morgens und abends rund ums Haus), 'away' = unterwegs auf der Insel
export function nhomeState(s, id) {
  if (!NPC_PLAN[id]) return 'home';
  if (!S.npcAwake(s)) return 'sleep';
  const [i, plan] = planSlot(s, id);
  return i === 0 || i === plan.length - 1 ? 'home' : 'away';
}
const AT = { office: 'beim Rathaus', plaza: 'am Dorfbaum', board: 'am Schwarzen Brett', shop: 'beim Krämerladen', bin: 'bei der Ankaufkiste', museum: 'beim Museum', house: 'bei eurem Haus', mail: 'bei eurem Briefkasten', bench: 'an der Werkbank', kitchen: 'bei der Gartenküche', gate: 'am Tor zur Bummelgasse', boat: 'am Bootssteg' };
export function whereabouts(s, id) {
  const [i, plan] = planSlot(s, id), [, x, z] = plan[i];
  let best = null, bd = 6.5;
  for (const [k, B] of Object.entries(BUILDINGS)) {
    if (k === 'vh_' + id || B.x0 == null) continue;
    const d = Math.hypot((B.x0 + B.x1) / 2 - x, (B.z0 + B.z1) / 2 - z);
    if (d < bd) { bd = d; best = k; }
  }
  if (best) return AT[best] || (BUILDINGS[best].npc ? `bei ${NPC_DATA[BUILDINGS[best].npc].name}` : `bei: ${BUILDINGS[best].name}`);
  return z > 13 ? 'am Strand' : z < -8 ? 'im Norden der Insel' : x < -6 ? 'im Westen der Insel' : x > 6 ? 'im Osten der Insel' : 'im Dorf';
}
// Zettel an der Tür, wenn niemand da ist
export function doorNote(s, id) {
  const st = nhomeState(s, id), n = NPC_DATA[id].name;
  if (st === 'away') return `📝 „Bin ${whereabouts(s, id)}. Fühl dich wie zu Hause! – ${n}“`;
  if (st === 'sleep') return `💤 ${n} schläft tief und fest. Pssst!`;
  return '';
}
// Neuigkeit fürs Gespräch zu Hause (einmal), für den Inselboten und den Hinweis beim Reinkommen
const NEWS_TXT = {
  new: (n, f) => [`Schau mal, das ist neu: ${f.icon} ${f.name}! Hab ich mir selbst ausgesucht. Wie findest du's?`, `🏠 ${n} hat sich etwas Neues gegönnt: ${f.icon} ${f.name}.`],
  swap: (n, f) => [`Ich hab ein bisschen ausgemistet – dafür steht jetzt ${f.icon} ${f.name} da. Schick, oder?`, `🏠 ${n} hat ausgemistet und dafür ${f.icon} ${f.name} aufgestellt.`],
  move: (n, f) => [`Fällt dir was auf? Ich hab umgeräumt! ${f.icon} ${f.name} steht jetzt woanders.`, `🏠 ${n} hat zu Hause umgeräumt.`],
  wall: n => ['Riechst du den Kleister? Ich hab neu tapeziert! Gefällt mir richtig gut.', `🏠 Bei ${n} klebt eine neue Tapete an der Wand.`],
  floor: n => ['Pass auf, wo du hintrittst – der Boden ist ganz neu! Schön, oder?', `🏠 ${n} hat einen neuen Fußboden verlegt.`],
};
export function nhomeNews(s, id, maxAge = 4) {
  const N = s.nhome?.[id]?.self?.news;
  if (!N || s.day - N.day > maxAge || !NEWS_TXT[N.kind]) return null;
  const f = N.k ? FURNITURE[N.k] : null;
  if (N.k && !f) return null;
  const [say, paper] = NEWS_TXT[N.kind](NPC_DATA[id].name, f || {});
  return { ...N, say, paper };
}
export function gossip12(s) {
  const L = [];
  for (const id of NPC_IDS) { const N = nhomeNews(s, id, 1); if (N && N.day === s.day) L.push(N.paper); }
  return L;
}
// Gespräch zu Hause: Neuigkeit erzählt? Dann merkt sich das der Spielstand (Aktion nhome12)
export function nhome12(s, a) {
  const h = s.nhome?.[a.id];
  if (a.op !== 'told' || !h?.self?.news) return false;
  h.self.news.told = 1;
  return true;
}

// ---------- Spielstand ----------
export function migrateNhomes(s) {
  s.nhome ||= {};
  for (const id of NPC_IDS) {
    if (!NTASTE[id]) continue;
    const h = s.nhome[id] ||= S.nroomBlank(id);
    const o = h.self;
    if (o && typeof o === 'object') { h.self = { n: Number.isInteger(o.n) ? o.n : 0, last: Number.isInteger(o.last) ? o.last : s.day || 1, news: o.news && typeof o.news === 'object' && typeof o.news.kind === 'string' ? o.news : null }; continue; }
    // zum ersten Mal: Jede/r hat schon ein paar eigene Sachen im Zimmer (nur auf freien Plätzen)
    h.self = { n: 0, last: s.day || 1, news: null };
    for (let i = 0; i < START && count(h) < ROOM_CAP; i++) { const k = nextPiece(s, id); if (k && put(s, id, k)) h.self.n++; }
  }
}
