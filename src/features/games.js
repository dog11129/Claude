// Teil von extras3.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, NPC_DATA, NPC_IDS, CROPS, BUGS, FISH } from '../data.js';
import { FURNITURE } from '../furni-data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';
import { GAME15, initGame15, playOp15, playAi15 } from './play15.js';

// =====================================================================
// Spieleabend am Spieltisch: Vier gewinnt, Memory, Mühle und Würfelglück – gegen Mitspieler oder einen Nachbarn
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
export const gameName = k => (k === 'c4' ? 'Vier gewinnt' : k === 'mem' ? 'Memory' : GAME15[k]?.[1] || 'Spiel');
const gamePlayer = (s, g) => g.p[g.turn];
const isMe = (s, p) => p.who === who(s);
export function gameEnd(s, g, out) {
  const npc = g.p.find(p => p.npc), human = g.p.find(p => !p.npc);
  s.stats.games = (s.stats.games || 0) + 1;
  if (g.win === 'draw') { out.msg = '🤝 Unentschieden! Noch eine Runde?'; if (npc) S.friendX(s, npc.npc).f += 25; return; }
  const winner = g.p[g.win];
  out.msg = `🏆 ${winner.name} gewinnt ${gameName(g.k)}!`;
  out.snd = 'fanfare';
  if (npc) {
    if (winner.npc) { S.friendX(s, npc.npc).f += 15; out.msg += ` „Gut gespielt – Revanche?“`; }
    else {
      S.friendX(s, npc.npc).f += 40;
      s.gwin = s.gwin?.day === s.day ? s.gwin : { day: s.day, n: 0 };
      if (s.gwin.n++ < 3) { s.money += 500; s.stats.earned += 500; out.msg += ' +500 Taler, +💕'; } else out.msg += ' +💕';
      s.stats.gamesWon = (s.stats.gamesWon || 0) + 1;
    }
  }
  if (human && !npc && winner) s.stats.gamesWon = (s.stats.gamesWon || 0) + 1;
  if (!winner.npc) S.questEventX(s, 'gamewin', 1, out);
  X.moment(s, 'spieleabend', '🎲', 'Spieleabend', `${g.p[0].name} gegen ${g.p[1].name} am Spieltisch – ${winner.name} hat gewonnen.`, out);
}
export function memFlip(s, g, i, out) {
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
export function memAi(s, g, out) {
  const skill = NPC_SKILL[gamePlayer(s, g).npc] || 0.6, free = g.b.map((_, i) => i).filter(i => g.found[i] === undefined);
  const known = free.filter(i => g.seen[i] && Math.random() < skill);
  let first = null, second = null;
  for (const i of known) { const j = known.find(k => k !== i && g.seen[k] === g.seen[i]); if (j !== undefined) { first = i; second = j; break; } }
  if (first === null) first = pick(free.filter(i => !g.seen[i]).length ? free.filter(i => !g.seen[i]) : free);
  memFlip(s, g, first, out);
  if (second === null) { const m = known.find(k => k !== first && g.seen[k] === g.b[first]); second = m !== undefined ? m : pick(free.filter(i => i !== first)); }
  memFlip(s, g, second, out);
}
export function game(s, a, out) {
  const g = s.game;
  if (a.op === 'start') {
    if (g && g.win == null && g.p.some(p => !p.npc && p.who !== who(s)) && s.time - g.t < 600) { out.msg = 'Am Spieltisch läuft gerade noch eine Runde.'; return false; }
    if (!['c4', 'mem'].includes(a.k) && !GAME15[a.k]) return false;
    const me = { who: who(s), name: String(a.name || 'Gast').slice(0, 16) };
    let you;
    if (typeof a.vs === 'string' && a.vs.startsWith('npc:') && NPC_IDS.includes(a.vs.slice(4))) { const id = a.vs.slice(4); you = { who: 'npc', npc: id, name: NPC_DATA[id].name }; }
    else if (typeof a.vs === 'string' && a.vs !== me.who && typeof a.vsName === 'string') you = { who: a.vs, name: a.vsName.slice(0, 16) };
    else return false;
    const first = rnd(2);
    s.game = { k: a.k, p: [me, you], turn: first, t: s.time, win: null };
    if (a.k === 'c4') s.game.b = Array(C4_W * C4_H).fill(-1);
    else if (GAME15[a.k]) initGame15(s.game);
    else Object.assign(s.game, { b: shuffle([...MEM_CARDS.slice(0, 6), ...MEM_CARDS.slice(0, 6)]), open: [], found: {}, seen: {}, score: [0, 0], miss: null });
    out.msg = `🎲 ${gameName(a.k)}: ${me.name} gegen ${you.name} – ${s.game.p[first].name} fängt an!`;
    out.snd = 'click';
    return true;
  }
  if (!g) return false;
  if (a.op === 'quit') {
    if (!g.p.some(p => p.who === who(s)) && who(s) !== 'host' && g.win == null) return false;
    s.game = null;
    return true;
  }
  if (g.win != null) return false; // vorbei (auch wenn Spieler 0 gewonnen hat)
  const cur = gamePlayer(s, g);
  if (a.op === 'ai') {
    if (!cur.npc) return false;
    if (g.k === 'c4') { const col = c4Ai(g.b, g.turn, NPC_SKILL[cur.npc]); g.last = c4Drop(g.b, col, g.turn) * C4_W + col; g.win = c4Win(g.b); if (g.win !== null) gameEnd(s, g, out); else g.turn = 1 - g.turn; }
    else if (GAME15[g.k]) { playAi15(g, NPC_SKILL[cur.npc] || 0.6, out); if (g.win != null) gameEnd(s, g, out); }
    else memAi(s, g, out);
    g.t = s.time;
    return true;
  }
  if (!isMe(s, cur)) return false;
  if (GAME15[g.k]) { const ok = playOp15(g, a, out); if (ok) { g.t = s.time; if (g.win != null) gameEnd(s, g, out); } return ok; }
  if (g.k === 'c4' && a.op === 'move') {
    if (!Number.isInteger(a.col) || a.col < 0 || a.col >= C4_W || g.b[a.col] >= 0) return false;
    g.last = c4Drop(g.b, a.col, g.turn) * C4_W + a.col;
    g.win = c4Win(g.b);
    if (g.win !== null) gameEnd(s, g, out); else g.turn = 1 - g.turn;
    g.t = s.time;
    out.snd = 'place';
    return true;
  }
  if (g.k === 'mem' && a.op === 'flip') { const ok = memFlip(s, g, a.i, out); if (ok) { g.t = s.time; out.snd ||= 'card'; } return ok; }
  return false;
}
