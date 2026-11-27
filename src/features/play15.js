// Teil von extras15.js – zusammen spielen: das gemeinsame Puzzle, zwei neue Spiele für den Spieltisch (Mühle, Würfelglück)
// und Federball am Netz. Mühle und Würfelglück laufen im vorhandenen Spieleabend (features/games.js, s.game).
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, fmt, who } from './util.js';
import { addLove } from './love.js';

// =====================================================================
// Puzzle: 24 Teile, jede:r legt vier am Tag. s.puzzle = { m, got: [Teile], day, cnt: { <Spieler>: n }, done }
// =====================================================================
export const PUZZLES = [['inselabend', 'Abend auf der Insel', '🌅'], ['leuchtturm', 'Leuchtturm am Morgen', '🗼'], ['blumenwiese', 'Blumenwiese', '🌼'], ['sternennacht', 'Sternennacht', '🌌'], ['winterhuette', 'Winterhütte', '🏔️'], ['ballonfahrt', 'Ballonfahrt zu zweit', '🎈']];
export const PZ_W = 6, PZ_H = 4, PZ_N = PZ_W * PZ_H, PZ_DAY = 4;
export const puzzleState = s => (s.puzzle ||= { m: 0, got: [], day: s.day, cnt: {}, done: 0 });
export const puzzleLeft = (s, key) => { const P = s.puzzle; return PZ_DAY - (P && P.day === s.day ? P.cnt[key] || 0 : 0); };
export const puzzleItem = m => 'puzzlebild' + (m + 1);
export function puzzle15(s, a, out) {
  const P = puzzleState(s), me = who(s);
  if (!Number.isInteger(a.i) || a.i < 0 || a.i >= PZ_N || P.got.includes(a.i)) return false;
  if (P.day !== s.day) { P.day = s.day; P.cnt = {}; }
  if ((P.cnt[me] || 0) >= PZ_DAY) { out.msg = 'Für heute hast du genug gepuzzelt – morgen geht es weiter. 🧩'; return false; }
  P.cnt[me] = (P.cnt[me] || 0) + 1;
  P.got.push(a.i);
  out.snd = 'place';
  if (P.got.length < PZ_N) { out.msg = `🧩 Passt! ${P.got.length} von ${PZ_N} Teilen liegen.`; return true; }
  const [, name, icon] = PUZZLES[P.m], item = puzzleItem(P.m);
  S.addInvX(s, item, 1);
  addLove(s, 12, out);
  P.done = (P.done || 0) + 1;
  X.moment(s, 'puzzle' + P.done, '🧩', `Puzzle fertig: ${name}`, 'Teil für Teil zusammen gelegt – jetzt hängt das Bild bei euch an der Wand.', out);
  out.msg = `${icon} Das letzte Teil! „${name}“ ist fertig – das Bild liegt in deiner Tasche (an die Wand hängen). +12 💕`;
  out.snd = 'fanfare';
  out.puzzle15 = 'done';
  P.m = (P.m + 1) % PUZZLES.length;
  P.got = [];
  return true;
}
export function migratePuzzle(s) {
  const P = s.puzzle;
  if (!P) return;
  if (typeof P !== 'object' || !Array.isArray(P.got)) { delete s.puzzle; return; }
  P.m = Number.isInteger(P.m) && P.m >= 0 && P.m < PUZZLES.length ? P.m : 0;
  P.got = [...new Set(P.got.filter(i => Number.isInteger(i) && i >= 0 && i < PZ_N))];
  P.cnt = P.cnt && typeof P.cnt === 'object' ? P.cnt : {};
  P.done = P.done | 0;
}

// =====================================================================
// Mühle: 24 Punkte, erst setzen (je 9 Steine), dann ziehen, mit drei Steinen springen
// =====================================================================
export const MILL_ADJ = [[1, 9], [0, 2, 4], [1, 14], [4, 10], [1, 3, 5, 7], [4, 13], [7, 11], [4, 6, 8], [7, 12], [0, 10, 21], [3, 9, 11, 18], [6, 10, 15],
  [8, 13, 17], [5, 12, 14, 20], [2, 13, 23], [11, 16], [15, 17, 19], [12, 16], [10, 19], [16, 18, 20, 22], [13, 19], [9, 22], [19, 21, 23], [14, 22]];
export const MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23], [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
// Wo die Punkte auf dem 7×7-Brett liegen (Spalte, Zeile)
export const MILL_XY = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
const cnt = (b, p) => b.reduce((n, v) => n + (v === p), 0);
export const inMill = (b, i) => b[i] >= 0 && MILLS.some(m => m.includes(i) && m.every(j => b[j] === b[i]));
export const millFly = (g, p) => g.hand[p] === 0 && cnt(g.b, p) === 3;
// Alle Züge, die Spieler p gerade machen darf: [von (−1 = setzen), nach]
export function millMoves(g, p) {
  const free = g.b.map((v, i) => (v < 0 ? i : -1)).filter(i => i >= 0);
  if (g.hand[p] > 0) return free.map(i => [-1, i]);
  const fly = millFly(g, p), out = [];
  g.b.forEach((v, i) => { if (v === p) for (const j of fly ? free : MILL_ADJ[i]) if (g.b[j] < 0) out.push([i, j]); });
  return out;
}
// Welche Steine des Gegners dürfen weg? (keine aus einer Mühle – außer es gibt nur noch solche)
export function millTakes(g, p) {
  const opp = g.b.map((v, i) => (v === 1 - p ? i : -1)).filter(i => i >= 0), loose = opp.filter(i => !inMill(g.b, i));
  return loose.length ? loose : opp;
}
function millNext(g) {
  const you = 1 - g.turn;
  g.rm = false;
  g.n = (g.n || 0) + 1;
  if (g.hand[you] === 0 && cnt(g.b, you) < 3) { g.win = g.turn; return; }
  if (!millMoves(g, you).length) { g.win = g.turn; return; }
  if (g.n > 180) { g.win = 'draw'; return; }
  g.turn = you;
}
function millDo(g, from, to) {
  const p = g.turn;
  if (from < 0) g.hand[p]--; else g.b[from] = -1;
  g.b[to] = p;
  g.last = to;
  if (inMill(g.b, to) && millTakes(g, p).length) g.rm = true; else millNext(g);
}
function millOp(g, a, out) {
  const p = g.turn, int = v => Number.isInteger(v) && v >= 0 && v < 24;
  if (a.op === 'mtake') {
    if (!g.rm || !int(a.i) || !millTakes(g, p).includes(a.i)) return false;
    g.b[a.i] = -1;
    out.snd = 'click';
    millNext(g);
    return true;
  }
  if (g.rm) return false;
  if (a.op === 'mplace') {
    if (g.hand[p] < 1 || !int(a.i) || g.b[a.i] >= 0) return false;
    millDo(g, -1, a.i);
  } else if (a.op === 'mmove') {
    if (g.hand[p] > 0 || !int(a.from) || !int(a.to) || !millMoves(g, p).some(([f, t]) => f === a.from && t === a.to)) return false;
    millDo(g, a.from, a.to);
  } else return false;
  out.snd = g.rm ? 'fanfare' : 'place';
  if (g.rm) out.msg = '⚪ Mühle! Nimm einen Stein vom Brett.';
  return true;
}
// Schließt ein Stein von p auf Feld i (kommend von from) eine Mühle?
const closes = (b, p, i, from = -1) => MILLS.some(m => m.includes(i) && m.every(j => (j === i ? true : j !== from && b[j] === p)));
function millAi(g, skill) {
  const p = g.turn, you = 1 - p;
  if (g.rm) {
    const t = millTakes(g, p), danger = t.filter(i => MILLS.some(m => m.includes(i) && m.filter(j => g.b[j] === you).length === 2 && m.some(j => g.b[j] < 0)));
    return { op: 'mtake', i: pick(danger.length && Math.random() < 0.4 + skill * 0.6 ? danger : t) };
  }
  const moves = millMoves(g, p), act = ([f, t]) => (f < 0 ? { op: 'mplace', i: t } : { op: 'mmove', from: f, to: t });
  const win = moves.filter(([f, t]) => closes(g.b, p, t, f));
  if (win.length) return act(pick(win));
  const block = moves.filter(([f, t]) => closes(g.b, you, t) && (g.hand[you] > 0 || millMoves(g, you).some(([, yt]) => yt === t)));
  if (block.length && Math.random() < 0.35 + skill * 0.65) return act(pick(block));
  const build = moves.filter(([f, t]) => MILLS.some(m => m.includes(t) && m.filter(j => j !== f && g.b[j] === p).length === 1 && m.filter(j => j !== t && (g.b[j] < 0 || j === f)).length === 1));
  return act(pick(build.length && Math.random() < skill ? build : moves));
}

// =====================================================================
// Würfelglück: fünf Würfel, zweimal nachwürfeln, fünf Runden – wer die meisten Punkte hat, gewinnt
// =====================================================================
export const DICE_ROUNDS = 5;
export function diceScore(d) {
  const sum = d.reduce((a, b) => a + b, 0), c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of d) c[v]++;
  const top = Math.max(...c), u = [...new Set(d)].sort();
  if (top === 5) return { pts: sum + 50, name: 'Fünf Gleiche – Glückswurf!' };
  if (u.length === 5 && u[4] - u[0] === 4) return { pts: sum + 30, name: 'Straße' };
  if (top === 4) return { pts: sum + 25, name: 'Vier Gleiche' };
  if (top === 3 && c.includes(2)) return { pts: sum + 20, name: 'Drei und zwei' };
  if (top === 3) return { pts: sum + 10, name: 'Drei Gleiche' };
  if (c.filter(n => n === 2).length === 2) return { pts: sum + 5, name: 'Zwei Paare' };
  return { pts: sum, name: 'Augen' };
}
const rollDie = () => 1 + rnd(6);
function diceOp(g, a, out) {
  if (a.op === 'droll') {
    if (!g.d[0]) { g.d = g.d.map(rollDie); g.left = 2; g.hold = [0, 0, 0, 0, 0]; }
    else {
      if (g.left < 1) return false;
      const h = Array.isArray(a.hold) ? a.hold : [];
      if ([0, 1, 2, 3, 4].every(i => h[i])) return false;
      g.d = g.d.map((v, i) => (h[i] ? v : rollDie()));
      g.hold = [0, 1, 2, 3, 4].map(i => (h[i] ? 1 : 0));
      g.left--;
    }
    out.snd = 'card';
    return true;
  }
  if (a.op === 'dbank') {
    if (!g.d[0]) return false;
    const r = diceScore(g.d), p = g.turn;
    g.score[p] += r.pts;
    g.rd[p]++;
    g.lastPts = { p, pts: r.pts, name: r.name, d: g.d.slice() };
    g.d = [0, 0, 0, 0, 0]; g.left = 0; g.hold = [0, 0, 0, 0, 0];
    out.msg = `🎲 ${g.p[p].name}: ${r.name} – ${r.pts} Punkte`;
    out.snd = 'coin';
    if (g.rd[0] >= DICE_ROUNDS && g.rd[1] >= DICE_ROUNDS) g.win = g.score[0] === g.score[1] ? 'draw' : g.score[0] > g.score[1] ? 0 : 1;
    else g.turn = 1 - p;
    return true;
  }
  return false;
}
function diceAi(g, skill) {
  if (!g.d[0]) return { op: 'droll' };
  const r = diceScore(g.d), c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of g.d) c[v]++;
  const top = Math.max(...c);
  if (g.left < 1 || top === 5 || r.name === 'Straße' || r.name === 'Drei und zwei' || (top === 4 && Math.random() > skill)) return { op: 'dbank' };
  const keep = c.lastIndexOf(top); // die häufigste Zahl behalten; ist nichts doppelt, die Fünfen und Sechsen
  return { op: 'droll', hold: g.d.map(v => ((top >= 2 ? v === keep : v >= 5) ? 1 : 0)) };
}

// ---------- Anschluss an den Spieleabend ----------
export const GAME15 = { muehle: ['⚪', 'Mühle'], dice: ['🎲', 'Würfelglück'] };
export function initGame15(g) {
  if (g.k === 'muehle') Object.assign(g, { b: Array(24).fill(-1), hand: [9, 9], rm: false, n: 0 });
  else Object.assign(g, { d: [0, 0, 0, 0, 0], hold: [0, 0, 0, 0, 0], left: 0, score: [0, 0], rd: [0, 0], lastPts: null });
}
export const playOp15 = (g, a, out) => (g.k === 'muehle' ? millOp(g, a, out) : diceOp(g, a, out));
export function playAi15(g, skill, out) { return playOp15(g, g.k === 'muehle' ? millAi(g, skill) : diceAi(g, skill), out) || (g.k === 'dice' && diceOp(g, { op: 'dbank' }, out)); }

// =====================================================================
// Federball: Ballwechsel am Netz. s.rally = { on, p: [Spieler, Spieler | null], names, n, turn, t, s0 (Aufschlag), best, bestBy, solo, day }
// =====================================================================
export const rallyState = s => (s.rally ||= { on: 0, p: [], names: [], n: 0, turn: 0, t: 0, best: 0, bestBy: '', solo: 0, day: 0 });
export const rallyLive = s => !!s.rally?.on && s.time - s.rally.t < 25;
export function rally15(s, a, out) {
  const R = rallyState(s), me = who(s);
  if (a.op === 'start') {
    if (rallyLive(s) && !R.p.includes(me)) { out.msg = 'Am Netz läuft gerade ein Ballwechsel.'; return false; }
    const name = String(a.name || 'Gast').slice(0, 16), duo = typeof a.vs === 'string' && a.vs !== me && a.vs !== 'solo' && typeof a.vsName === 'string';
    Object.assign(R, { on: 1, p: [me, duo ? a.vs : null], names: [name, duo ? a.vsName.slice(0, 16) : ''], n: 0, turn: 0, t: s.time, s0: s.time });
    out.msg = duo ? `🏸 ${name} schlägt auf – ${R.names[1]}, mach dich bereit!` : '🏸 Aufschlag! Wie oft schaffst du es allein?';
    out.snd = 'click';
    return true;
  }
  if (!R.on) return false;
  const duo = !!R.p[1];
  if (a.op === 'hit') {
    if (R.p[duo ? R.turn : 0] !== me) return false;
    R.n++;
    if (duo) R.turn = 1 - R.turn;
    R.t = s.time;
    out.snd = 'place';
    out.rally15 = 'hit';
    return true;
  }
  if (a.op === 'miss') {
    if (!R.p.includes(me) && rallyLive(s)) return false;
    R.on = 0;
    const n = R.n;
    out.msg = `🏸 ${n} ${n === 1 ? 'Schlag' : 'Schläge'}!`;
    out.rally15 = 'end';
    if (duo) {
      if (n > R.best) {
        const first20 = R.best < 20 && n >= 20;
        R.best = n; R.bestBy = R.names.join(' & ');
        out.msg += ' Neuer Rekord zu zweit! 🎉'; out.snd = 'fanfare';
        if (first20) X.moment(s, 'rally20', '🏸', 'Federball-Rekord', `${R.bestBy}: ${n} Schläge ohne Fehler!`, out);
      }
      if (n >= 10 && R.day !== s.day) { R.day = s.day; s.money += 200; s.stats.earned += 200; addLove(s, 3, out); out.msg += ` +${fmt(200)} Taler, +3 💕`; }
    } else if (n > R.solo) { R.solo = n; out.msg += ' Neuer Solo-Rekord!'; }
    s.stats.rallies = (s.stats.rallies || 0) + 1;
    return true;
  }
  return false;
}
export function migrateRally(s) {
  const R = s.rally;
  if (!R) return;
  if (typeof R !== 'object' || !Array.isArray(R.p)) { delete s.rally; return; }
  for (const k of ['n', 'turn', 'best', 'solo', 'day']) R[k] = R[k] | 0;
  R.t = Number.isFinite(R.t) ? R.t : 0;
  R.names = Array.isArray(R.names) ? R.names.map(n => String(n || '').slice(0, 16)) : [];
  R.bestBy = String(R.bestBy || '').slice(0, 40);
}
