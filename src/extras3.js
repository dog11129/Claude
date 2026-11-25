// Erweiterungen, Teil 3: Heißluftballon, Schmetterlingsgarten, Schiffswrack, Spieleabend, Fotowettbewerb,
// Grillabend, Sternbilder und Nachbarzimmer einrichten. Nur Spiellogik (läuft auch in Node-Tests).
// Achtung Modul-Kreis: state.js ↔ extras3.js – Funktionen aus state.js nur innerhalb von Funktionen benutzen.
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from './data.js';
import { FURNITURE } from './furni-data.js';
import * as S from './state.js';
import * as X from './extras.js';

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const fmt = n => Math.round(n).toLocaleString('de-DE');
const hour = s => 6 + s.dayTime * 18;
const who = s => s._who || 'host';
const note = (s, title, text, item, n, from = 'rosi') => s.mail.push({ kind: 'note', from, title, text, item: item || null, n: n || 1, day: s.day });
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const near = (s, kind, x, z, r) => Object.entries(s.obj || {}).find(([k, o]) => o?.k === kind && Math.hypot(+k.split(',')[0] - x, +k.split(',')[1] - z) <= r) || null;

// =====================================================================
// Heißluftballon (Rathaus-Projekt „Ballonplatz“): Rundflug über die Insel, Geschenke am Himmel fangen
// =====================================================================
export const RIDE_PRICE = 800, RIDE_SECS = 46, SKY_GIFTS = 3;
// Flugbahn (ohne Zufall, damit alle dasselbe sehen): t = Sekunden seit Start, Start/Landung am Ballonplatz
export function ridePos(t, sx, sz) {
  const up = Math.min(1, t / 5), down = Math.min(1, Math.max(0, (RIDE_SECS - t) / 5)), k = Math.min(up, down);
  const a = Math.atan2(sz, sx) + Math.max(0, t - 3) / (RIDE_SECS - 6) * Math.PI * 2, R = 15 + Math.sin(t * 0.3) * 2;
  const cx = Math.cos(a) * R, cz = Math.sin(a) * R, m = Math.min(1, Math.min(t, RIDE_SECS - t) / 7);
  return { x: sx + (cx - sx) * m, z: sz + (cz - sz) * m, y: 0.4 + k * 7.5 + Math.sin(t * 0.8) * 0.3 * k };
}
// Wo schweben heute die Himmelsgeschenke? (Zeitpunkte auf der Runde)
export const skyGiftTimes = s => [0, 1, 2].map(i => 10 + ((s.day * 7 + i * 11) % 9) + i * 10);
function ride(s, a, out) {
  if (!Object.values(s.obj || {}).some(o => o?.k === 'ballonplatz')) return false;
  if (s.money < RIDE_PRICE) { out.msg = `Eine Ballonfahrt kostet ${RIDE_PRICE} Taler.`; return false; }
  s.money -= RIDE_PRICE;
  s.stats.rides = (s.stats.rides || 0) + 1;
  out.ride = true;
  out.msg = '🎈 Leinen los! Fang unterwegs die Geschenkballons am Himmel.';
  out.snd = 'launch';
  return true;
}
function skygift(s, a, out) {
  s.skyg = s.skyg?.day === s.day ? s.skyg : { day: s.day, who: {} };
  const w = who(s), n = s.skyg.who[w] || 0;
  if (n >= SKY_GIFTS) return false;
  s.skyg.who[w] = n + 1;
  if (Math.random() < 0.6) { const m = 300 + rnd(9) * 100; s.money += m; s.stats.earned += m; out.msg = `🎁 Ein Himmelsgeschenk: ${fmt(m)} Taler!`; }
  else { const id = pick(['sternsplitter', 'sternsplitter', 'goldnugget', 'perle', 'herzballon']); S.addInvX(s, id, 1); out.got = id; out.msg = `🎁 Ein Himmelsgeschenk: ${ITEMS[id].icon} ${ITEMS[id].name}!`; }
  out.snd = 'found';
  return true;
}
function rideshot(s, a, out) { // einmal im Fotobuch: die Insel von oben
  return X.moment(s, 'luftbild', '🎈', 'Die Insel von oben', 'Mit dem Heißluftballon über Dächer, Bäume und Strand – wie klein und schön alles aussieht!', out);
}

// =====================================================================
// Schmetterlingsgarten: Schmetterlingshaus + blühende Lieblingsblumen in der Nähe = seltene Falter
// =====================================================================
export const GARDEN_BUGS = BUGS.filter(b => b[5] === 'garden');
export function gardenBugs(s, x, z) {
  const house = near(s, 'schmetterlingshaus', x, z, 7);
  if (!house) return [];
  const [hx, hz] = house[0].split(',').map(Number), cnt = {};
  for (const [k, t] of Object.entries(s.tiles || {})) {
    if (!t?.c || !CROPS[t.c.k]) continue;
    const [tx, tz] = k.split(',').map(Number);
    if (Math.hypot(tx - hx, tz - hz) > 5 || S.stage(t.c) < 3) continue;
    cnt[t.c.k] = (cnt[t.c.k] || 0) + 1;
  }
  const sea = S.seasonOf(s.day);
  return GARDEN_BUGS.filter(b => b[4].includes(sea) && (cnt[b[8]] || 0) >= 2);
}
// Welche Blumen locken welchen Falter? (für die Anzeige)
export const gardenInfo = () => GARDEN_BUGS.map(b => ({ id: b[0], flower: b[8], sea: b[4] }));

// =====================================================================
// Schiffswrack: an der gelben Boje abtauchen, Truhen jeden Tag, Bullaugen-Rätsel für die Kapitänskajüte
// =====================================================================
export const WRECK = { x: 0, z: 1500, r: 12 };
export const WRECK_BUOY = [-31, 12];
export const WRECK_SYMS = ['⚓', '🐚', '⭐', '🐟'];
export const WRECK_CHESTS = [[-7, 3.5], [7, 4.5], [-1.5, 6.5]];
export const WRECK_PORTS = [[-4.5, -1.15], [-1.5, -1.15], [1.5, -1.15], [4.5, -1.15]]; // vom Bug (Westen) zum Heck
export const WRECK_DOOR = [6.9, -2.6];
const HULL = { x0: -6.6, x1: 6.6, z0: -4.6, z1: -1.4 };
export const onWreckExit = (lx, lz) => Math.abs(lx) <= 1.2 && lz >= WRECK.r - 2.2;
export function wreckBlocked(s, x, z) {
  const lx = x - WRECK.x, lz = z - WRECK.z;
  if (Math.hypot(lx, lz) > WRECK.r - 0.4) return true;
  if (lx > HULL.x0 && lx < HULL.x1 && lz > HULL.z0 && lz < HULL.z1) return true;
  return WRECK_CHESTS.some(([cx, cz]) => Math.hypot(lx - cx, lz - cz) < 0.5);
}
export function resolveWreck(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - WRECK.x, lz = pz - WRECK.z;
  if (onWreckExit(me.x - WRECK.x, me.z - WRECK.z)) return { go: 'wreckup', label: '🫧 Auftauchen', tiles: [] };
  const c = WRECK_CHESTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.1);
  if (c >= 0) return s.wreck?.got?.[c] === s.day ? { label: '🧰 Leer – morgen wieder', tiles: [] } : { a: { t: 'wreck', op: 'chest', i: c }, label: '🧰 Truhe öffnen', tiles: [] };
  if (Math.hypot(lx - WRECK_DOOR[0], lz - WRECK_DOOR[1]) < 1.4) return s.wreck?.open ? { label: '🚪 Die Kapitänskajüte – schon geplündert', tiles: [] } : { ui: 'wrecklock', label: '🔒 Kapitänskajüte', tiles: [] };
  const p = WRECK_PORTS.findIndex(([x, z]) => Math.abs(lx - x) < 0.9 && Math.abs(lz - z) < 1.2);
  if (p >= 0) return { label: `🪟 Bullauge ${p + 1}: ${s.wreck?.code?.[p] || '?'}`, tiles: [] };
  return { label: '', tiles: [] };
}
const WRECK_LOOT = [['money', 40], ['dublone', 10], ['perle', 10], ['seeglas', 14], ['goldnugget', 8], ['flaschenpost', 8], ['koralle', 10]];
function wreck(s, a, out) {
  const W = s.wreck;
  if (a.op === 'found') {
    if (W.found) return false;
    W.found = s.day;
    X.moment(s, 'wreck', '⚓', 'Ein Schiffswrack!', 'Unter der gelben Boje liegt ein altes Segelschiff – mit Truhen und einer verschlossenen Kajüte.', out);
    out.msg = '⚓ Ein versunkenes Schiff! Öffnet die Truhen – und findet heraus, wie die Kapitänskajüte aufgeht.';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'chest') {
    const i = a.i;
    if (!Number.isInteger(i) || !WRECK_CHESTS[i] || W.got[i] === s.day) return false;
    W.got[i] = s.day;
    if (!W.chart) { // die erste Truhe hat die Seekarte
      W.chart = s.day;
      S.addInvX(s, 'seekarte', 1);
      out.got = 'seekarte';
      out.msg = '🗺️ Eine alte Seekarte! Darauf steht: „Der Schlüssel zur Kajüte – lies die Bullaugen vom Bug bis zum Heck.“ (Der Bug ist vorne, bei der Galionsfigur im Westen.)';
      out.snd = 'found';
      return true;
    }
    const tot = WRECK_LOOT.reduce((t, l) => t + l[1], 0);
    let r = Math.random() * tot, id = 'money';
    for (const [l, w] of WRECK_LOOT) if ((r -= w) <= 0) { id = l; break; }
    if (id === 'money' || !ITEMS[id]) { const m = 400 + rnd(9) * 100; s.money += m; s.stats.earned += m; out.msg = `🧰 ${fmt(m)} Taler in der Truhe!`; }
    else { S.addInvX(s, id, 1); S.collectX(s, id, out); out.got = id; out.msg = `🧰 ${ITEMS[id].icon} ${ITEMS[id].name}!`; }
    out.fx.push({ x: WRECK.x + WRECK_CHESTS[i][0], z: WRECK.z + WRECK_CHESTS[i][1], txt: '✨', k: 'coin' });
    out.snd = 'found';
    return true;
  }
  if (a.op === 'open') {
    if (W.open || !Array.isArray(a.code) || a.code.length !== 4) return false;
    if (a.code.join('') !== W.code.join('')) { out.msg = '🔒 Klack … die Tür bleibt zu. Die Reihenfolge stimmt noch nicht.'; out.snd = 'fail'; return true; }
    W.open = s.day;
    const m = 6000;
    s.money += m; s.stats.earned += m;
    for (const id of ['kapitaenstruhe', 'buddelschiff', 'schiffsglocke']) S.addInvX(s, id, 1);
    S.addInvX(s, 'dublone', 3);
    note(s, '⚓ Der Schatz des Kapitäns', 'Ahoi!\nIhr habt die Kajüte geöffnet. Steuerrad und Anker sind zu schwer für eure Taschen – die bringe ich euch per Post.\n\nEure Rosi 🐰', 'steuerrad', 1);
    note(s, '⚓ Und noch der Anker', 'Hier ist der Anker – er sieht am Strand bestimmt toll aus!', 'anker', 1);
    (s.diary ||= []).push({ day: s.day, icon: '⚓', text: 'Die Kapitänskajüte im Schiffswrack geöffnet!' });
    X.moment(s, 'wreckopen', '🧭', 'Der Schatz des Kapitäns', 'Truhe, Buddelschiff, Schiffsglocke, Golddublonen – und 6.000 Taler!', out);
    out.got = 'kapitaenstruhe';
    out.msg = `🧭 Die Kajüte springt auf! ${fmt(m)} Taler, Golddublonen, Kapitänstruhe, Buddelschiff und Schiffsglocke!`;
    out.snd = 'fanfare';
    return true;
  }
  return false;
}

// =====================================================================
// Spieleabend am Spieltisch: Vier gewinnt und Memory, gegen Mitspieler oder einen Nachbarn
// =====================================================================
export const C4_W = 7, C4_H = 6;
const NPC_SKILL = { mira: 0.55, bruno: 0.6, pippa: 0.5, lio: 0.75, kalle: 0.7, wanda: 0.85 };
export const MEM_CARDS = ['apfel', 'kirsche', 'orange', 'birne', 'pfirsich', 'kokosnuss', 'tulpe', 'rose'];
export function c4Drop(b, col, p) { for (let r = C4_H - 1; r >= 0; r--) if (b[r * C4_W + col] < 0) { b[r * C4_W + col] = p; return r; } return -1; }
export function c4Win(b) {
  const at = (r, c) => (r >= 0 && r < C4_H && c >= 0 && c < C4_W ? b[r * C4_W + c] : -1);
  for (let r = 0; r < C4_H; r++) for (let c = 0; c < C4_W; c++) {
    const p = at(r, c);
    if (p < 0) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) if ([1, 2, 3].every(k => at(r + dr * k, c + dc * k) === p)) return p;
  }
  return b.every(v => v >= 0) ? 'draw' : null;
}
export function c4Ai(b, me, skill = 0.7) {
  const cols = [...Array(C4_W).keys()].filter(c => b[c] < 0), you = 1 - me;
  const tryCol = (c, p) => { const t = b.slice(); c4Drop(t, c, p); return c4Win(t) === p; };
  const win = cols.find(c => tryCol(c, me));
  if (win !== undefined) return win;
  const block = cols.find(c => tryCol(c, you));
  if (block !== undefined && Math.random() < 0.35 + skill * 0.65) return block;
  const safe = cols.filter(c => { const t = b.slice(); c4Drop(t, c, me); return !t.slice(0, C4_W).some((v, cc) => v < 0 && (() => { const u = t.slice(); c4Drop(u, cc, you); return c4Win(u) === you; })()); });
  const pool = (safe.length ? safe : cols).sort((x, y) => Math.abs(x - 3) - Math.abs(y - 3));
  return Math.random() < skill ? pool[0] : pick(pool);
}
const gamePlayer = (s, g) => g.p[g.turn];
const isMe = (s, p) => p.who === who(s);
function gameEnd(s, g, out) {
  const npc = g.p.find(p => p.npc), human = g.p.find(p => !p.npc);
  s.stats.games = (s.stats.games || 0) + 1;
  if (g.win === 'draw') { out.msg = '🤝 Unentschieden! Noch eine Runde?'; if (npc) S.friendX(s, npc.npc).f += 25; return; }
  const winner = g.p[g.win];
  out.msg = `🏆 ${winner.name} gewinnt ${g.k === 'c4' ? 'Vier gewinnt' : 'Memory'}!`;
  out.snd = 'fanfare';
  if (npc) {
    if (winner.npc) { S.friendX(s, npc.npc).f += 15; out.msg += ` „Gut gespielt – Revanche?“`; }
    else { S.friendX(s, npc.npc).f += 40; s.money += 500; s.stats.earned += 500; s.stats.gamesWon = (s.stats.gamesWon || 0) + 1; out.msg += ' +500 Taler, +💕'; }
  }
  if (human && !npc && winner) s.stats.gamesWon = (s.stats.gamesWon || 0) + 1;
  X.moment(s, 'spieleabend', '🎲', 'Spieleabend', `${g.p[0].name} gegen ${g.p[1].name} am Spieltisch – ${winner.name} hat gewonnen.`, out);
}
function memFlip(s, g, i, out) {
  if (!Number.isInteger(i) || !g.b[i] || g.found[i] !== undefined || g.open.includes(i)) return false;
  g.miss = null;
  g.open.push(i);
  g.seen[i] = g.b[i];
  if (g.open.length < 2) return true;
  const [x, y] = g.open;
  g.open = [];
  if (g.b[x] === g.b[y]) {
    g.found[x] = g.found[y] = g.turn;
    g.score[g.turn]++;
    if (Object.keys(g.found).length === g.b.length) { g.win = g.score[0] === g.score[1] ? 'draw' : g.score[0] > g.score[1] ? 0 : 1; gameEnd(s, g, out); }
    else out.msg = `✨ Ein Paar für ${gamePlayer(s, g).name}!`;
  } else { g.miss = [x, y]; g.turn = 1 - g.turn; }
  return true;
}
function memAi(s, g, out) {
  const skill = NPC_SKILL[gamePlayer(s, g).npc] || 0.6, free = g.b.map((_, i) => i).filter(i => g.found[i] === undefined);
  const known = free.filter(i => g.seen[i] && Math.random() < skill);
  let first = null, second = null;
  for (const i of known) { const j = known.find(k => k !== i && g.seen[k] === g.seen[i]); if (j !== undefined) { first = i; second = j; break; } }
  if (first === null) first = pick(free.filter(i => !g.seen[i]).length ? free.filter(i => !g.seen[i]) : free);
  memFlip(s, g, first, out);
  if (second === null) { const m = known.find(k => k !== first && g.seen[k] === g.b[first]); second = m !== undefined ? m : pick(free.filter(i => i !== first)); }
  memFlip(s, g, second, out);
}
function game(s, a, out) {
  const g = s.game;
  if (a.op === 'start') {
    if (g && !g.win && g.p.some(p => !p.npc && p.who !== who(s)) && s.time - g.t < 600) { out.msg = 'Am Spieltisch läuft gerade noch eine Runde.'; return false; }
    if (!['c4', 'mem'].includes(a.k)) return false;
    const me = { who: who(s), name: String(a.name || 'Gast').slice(0, 16) };
    let you;
    if (typeof a.vs === 'string' && a.vs.startsWith('npc:') && NPC_IDS.includes(a.vs.slice(4))) { const id = a.vs.slice(4); you = { who: 'npc', npc: id, name: NPC_DATA[id].name }; }
    else if (typeof a.vs === 'string' && a.vs !== me.who && typeof a.vsName === 'string') you = { who: a.vs, name: a.vsName.slice(0, 16) };
    else return false;
    const first = rnd(2);
    s.game = { k: a.k, p: [me, you], turn: first, t: s.time, win: null };
    if (a.k === 'c4') s.game.b = Array(C4_W * C4_H).fill(-1);
    else Object.assign(s.game, { b: shuffle([...MEM_CARDS.slice(0, 6), ...MEM_CARDS.slice(0, 6)]), open: [], found: {}, seen: {}, score: [0, 0], miss: null });
    out.msg = `🎲 ${a.k === 'c4' ? 'Vier gewinnt' : 'Memory'}: ${me.name} gegen ${you.name} – ${s.game.p[first].name} fängt an!`;
    out.snd = 'click';
    return true;
  }
  if (!g) return false;
  if (a.op === 'quit') {
    if (!g.p.some(p => p.who === who(s)) && who(s) !== 'host' && !g.win) return false;
    s.game = null;
    return true;
  }
  if (g.win) return false;
  const cur = gamePlayer(s, g);
  if (a.op === 'ai') {
    if (!cur.npc) return false;
    if (g.k === 'c4') { const col = c4Ai(g.b, g.turn, NPC_SKILL[cur.npc]); g.last = c4Drop(g.b, col, g.turn) * C4_W + col; g.win = c4Win(g.b); if (g.win !== null) gameEnd(s, g, out); else g.turn = 1 - g.turn; }
    else memAi(s, g, out);
    g.t = s.time;
    return true;
  }
  if (!isMe(s, cur)) return false;
  if (g.k === 'c4' && a.op === 'move') {
    if (!Number.isInteger(a.col) || a.col < 0 || a.col >= C4_W || g.b[a.col] >= 0) return false;
    g.last = c4Drop(g.b, a.col, g.turn) * C4_W + a.col;
    g.win = c4Win(g.b);
    if (g.win !== null) gameEnd(s, g, out); else g.turn = 1 - g.turn;
    g.t = s.time;
    out.snd = 'place';
    return true;
  }
  if (g.k === 'mem' && a.op === 'flip') { const ok = memFlip(s, g, a.i, out); if (ok) { g.t = s.time; out.snd ||= 'click'; } return ok; }
  return false;
}

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
function photoNew(s) { s.photoc = { week: photoWeek(s), theme: photoTheme(s), entries: {}, last: s.photoc?.last || null }; }
function photoentry(s, a, out) {
  if (s.photoc.week !== photoWeek(s)) photoNew(s);
  if (!Number.isInteger(a.score) || a.score < 0 || a.score > 100) return false;
  if (typeof a.img !== 'string' || !a.img.startsWith('data:image/jpeg;base64,') || a.img.length > 20000) { out.msg = 'Das Foto ist zu groß.'; return false; }
  const old = s.photoc.entries[who(s)];
  s.photoc.entries[who(s)] = { name: String(a.name || 'Gast').slice(0, 16), score: a.score, img: a.img, day: s.day };
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

// =====================================================================
// Grillabend: am Strandgrill grillen – ab 17:30 Uhr und drei Leckereien kommen die Nachbarn dazu
// =====================================================================
export const GRILL_OF = id => id === 'mais' ? 'grillmais' : id === 'kartoffel' ? 'ofenkartoffel' : ['karotte', 'tomate', 'kuerbis', 'brokkoli', 'salatkopf'].includes(id) ? 'grillgemuese'
  : ['apfel', 'birne'].includes(id) ? 'bratapfel' : id === 'mehl' ? 'stockbrot' : FISH_IDS.includes(id) && ITEMS[id].sell < 2500 ? 'grillfisch' : null;
const FISH_IDS = FISH.map(f => f[0]);
export const grillParty = s => (s.grill?.party === s.day && hour(s) >= 17.5 && hour(s) < 22.5 ? s.grill.at : null);
function grill(s, a, out) {
  const k = `${a.x},${a.z}`, res = GRILL_OF(a.item);
  if (s.obj?.[k]?.k !== 'strandgrill' || !res || !S.takeInvX(s, a.item, 1)) return false;
  S.addInvX(s, res, 1);
  out.got = res;
  out.fx.push({ x: a.x, z: a.z, txt: `${ITEMS[res].icon}`, k: 'smoke' });
  out.msg = `🔥 Brutzel, brutzel … ${ITEMS[res].icon} ${ITEMS[res].name}!`;
  out.snd = 'harvest';
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

// =====================================================================
// Sternbilder: helle Sterne verbinden und benennen – sie leuchten jede Nacht am Himmel
// =====================================================================
export const STAR_SECTORS = 8, STARS_PER = 9, CONST_MAX = 16, CONST_LINES = 14;
export const BRIGHT = Array.from({ length: STAR_SECTORS }, (_, sec) => {
  let seed = 9173 + sec * 7919;
  const r = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  return Array.from({ length: STARS_PER }, (_, i) => ({ az: sec * 45 - 18 + (i % 3) * 12 + r() * 10, el: 15 + Math.floor(i / 3) * 10 + r() * 7, m: 0.6 + r() * 0.6 }));
});
function constellation(s, a, out) {
  s.consts ||= [];
  if (a.op === 'del') {
    const c = s.consts[a.i];
    if (!c || (c.who !== who(s) && who(s) !== 'host')) return false;
    s.consts.splice(a.i, 1);
    return true;
  }
  if (a.op !== 'add' || s.consts.length >= CONST_MAX) return false;
  const name = String(a.n || '').trim().slice(0, 24);
  if (!name || !Number.isInteger(a.sec) || a.sec < 0 || a.sec >= STAR_SECTORS || !Array.isArray(a.l) || !a.l.length || a.l.length > CONST_LINES) return false;
  const lines = a.l.filter(l => Array.isArray(l) && l.length === 2 && l.every(v => Number.isInteger(v) && v >= 0 && v < STARS_PER) && l[0] !== l[1]).map(l => [l[0], l[1]]);
  if (!lines.length) return false;
  s.consts.push({ n: name, sec: a.sec, l: lines, by: String(a.by || 'Gast').slice(0, 16), who: who(s), day: s.day });
  X.moment(s, 'sternbild', '✨', 'Ein eigenes Sternbild', `„${name}“ leuchtet jetzt jede Nacht über der Insel.`, out);
  out.msg = `✨ Das Sternbild „${name}“ leuchtet ab heute jede Nacht!`;
  out.snd = 'ach';
  return true;
}

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
function nwish(s, a, out) {
  const id = a.id;
  if (!NWISH[id] || S.hearts(s, id) < 3) return false;
  s.nhome[id] ||= S.nroomBlank(id);
  const h = s.nhome[id];
  if (h.w >= NWISH[id].length) { out.taleSay = 'Mein Zimmer ist perfekt. Ich bin so glücklich hier – danke!'; return true; }
  if (!wishOk(s, id, h.w)) { out.taleSay = `Hmm … noch nicht ganz. ${NWISH[id][h.w].t}`; return true; }
  h.w++;
  S.friendX(s, id).f += 80;
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

// ---------- Laden, Morgen, Ticken ----------
export function migrateZ(s) {
  const w = s.wreck && typeof s.wreck === 'object' ? s.wreck : {};
  const code = Array.isArray(w.code) && w.code.length === 4 && w.code.every(c => WRECK_SYMS.includes(c)) ? w.code : shuffle(WRECK_SYMS);
  s.wreck = { found: w.found || 0, code, chart: w.chart || 0, open: w.open || 0, got: w.got && typeof w.got === 'object' ? w.got : {} };
  if (!s.photoc || typeof s.photoc !== 'object' || typeof s.photoc.entries !== 'object') photoNew(s);
  s.consts = Array.isArray(s.consts) ? s.consts.filter(c => c && typeof c.n === 'string' && Number.isInteger(c.sec) && Array.isArray(c.l)).slice(0, CONST_MAX) : [];
  s.nhome = s.nhome && typeof s.nhome === 'object' ? s.nhome : {};
  for (const [id, h] of Object.entries(s.nhome)) {
    if (!NPC_IDS.includes(id) || !h || typeof h !== 'object') { delete s.nhome[id]; continue; }
    for (const m of ['items', 'rugs', 'walls']) if (!h[m] || typeof h[m] !== 'object') h[m] = {};
    h.w = Number.isInteger(h.w) ? Math.max(0, Math.min(3, h.w)) : 0;
  }
  if (s.game && (!s.game.p || !Array.isArray(s.game.b))) s.game = null;
}
export function morningZ(s) {
  photoJudge(s);
  if (s.game?.win) s.game = null;
}
export function tickZ(s) { return false; }

export const Z_ACTIONS = { ride, skygift, rideshot, wreck, game, photoentry, grill, sternbild: constellation, nwish };
