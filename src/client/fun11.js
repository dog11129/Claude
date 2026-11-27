// Inselleben 15 im Browser: Puzzle (welches Teil liegt gerade vor dir), Federball (Schlag im richtigen Moment), Mühle-Auswahl,
// Würfel festhalten, Schmuck und Kostüme anziehen, Polaroids aus dem Fotobuch, kleine Hinweise. Logik beim Host: src/extras15.js.
import { cleanLook } from '../avatar.js';
import * as E from '../extras15.js';
import * as photos from '../photos.js';
import { motifCanvas } from '../motifs15.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
const myKey = () => me()?.key || 'host';
export function initFun11(ctx) { C = ctx; }

function wear(look) {
  const P = C.profile;
  P.look = cleanLook({ ...P.look, ...look, pat: P.look.pat });
  C.saveProfile(); C.sendLook();
  const m = me();
  if (m) { C.world.float(m.x, m.z, '✨', 1.4); C.world.burst?.(m.x, m.z, 'heart', 1.2); }
  C.play('love');
}
export const myLook = () => C?.profile?.look || {};

// ---------- Puzzle ----------
// Das Bild liegt einmal als CSS-Variable im Dokument; die Teile zeigen nur ihren Ausschnitt.
let pzCss = -1;
export function pzStyle(m) {
  if (pzCss === m || typeof document === 'undefined' || !document.head) return;
  pzCss = m;
  let el = $('pz15css');
  if (!el) { el = document.createElement('style'); el.id = 'pz15css'; document.head.appendChild(el); }
  let url = '';
  try { url = motifCanvas(m).toDataURL('image/jpeg', 0.82); } catch { /* ohne Canvas: graue Teile */ }
  el.textContent = `:root{--pz15:url(${url})}`;
}
// Welches Teil liegt gerade vor mir? (zufällig aus den fehlenden, bleibt bis es liegt)
export function pzPiece(s, g) {
  const P = s.puzzle || { m: 0, got: [] }, cur = g.pz15;
  if (cur && cur.m === P.m && !P.got.includes(cur.piece)) return cur.piece;
  const miss = Array.from({ length: E.PZ_N }, (_, i) => i).filter(i => !P.got.includes(i));
  if (!miss.length) return -1;
  g.pz15 = { m: P.m, piece: miss[Math.floor(Math.random() * miss.length)] };
  return g.pz15.piece;
}

// ---------- Federball ----------
const swingKey = R => R.n + '|' + R.t;
function myTurn(s) { const R = s.rally; return !!R && E.rallyLive(s) && R.p[R.p[1] ? R.turn : 0] === myKey(); }
function rallyTick(dt) {
  const G = C.G, s = G.s, R = s.rally;
  if (!myTurn(s)) { G.r15 = null; return; }
  let W = G.r15;
  if (!W || W.key !== swingKey(R)) {
    const n = R.n, zw = Math.max(0.14, 0.3 - n * 0.006);
    W = G.r15 = { key: swingKey(R), t: n ? -0.75 : -0.35, dur: Math.max(0.75, 1.7 - n * 0.035), zw, z0: 0.42 + Math.random() * (0.54 - zw), done: false };
  }
  if (W.done) return;
  W.t += dt;
  const pos = Math.max(0, Math.min(1, W.t / W.dur)), mark = $('rmark15'), zone = $('rzone15');
  if (zone) { zone.style.left = W.z0 * 100 + '%'; zone.style.width = W.zw * 100 + '%'; }
  if (mark) { mark.style.left = pos * 100 + '%'; mark.style.opacity = W.t < 0 ? 0.25 : 1; }
  if (W.t > W.dur + 0.12) { W.done = true; C.send({ t: 'rally15', op: 'miss' }); C.play('fail'); }
}
function rallyHit() {
  const W = C.G.r15, m = me();
  if (!W || W.done || W.t < 0) return;
  const pos = W.t / W.dur, ok = pos >= W.z0 - 0.015 && pos <= W.z0 + W.zw + 0.015;
  W.done = true;
  C.send({ t: 'rally15', op: ok ? 'hit' : 'miss' });
  if (m) C.world.float(m.x, m.z, ok ? '🏸' : '💨', 1.6);
  if (!ok) C.play('fail');
}

// ---------- Polaroid: Foto klein machen (Mitte ausschneiden) ----------
function polaShrink(url) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const W = 104, H = 86, c = document.createElement('canvas'), k = Math.max(W / img.width, H / img.height);
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
      let out = '';
      for (const q of [0.62, 0.5, 0.4, 0.3, 0.2]) { out = c.toDataURL('image/jpeg', q); if (out.length <= E.POLA_MAX) break; }
      ok(out.length <= E.POLA_MAX ? out : null);
    };
    img.onerror = () => ok(null);
    img.src = url;
  });
}

export function uiY(kind, d) {
  const G = C.G, s = G.s, P = C.profile;
  if (kind === 'pz') {
    const i = +d.i;
    if (G.pz15 && i === G.pz15.piece) { C.send({ t: 'puzzle15', i }); G.pz15 = null; }
    else { C.play('fail'); C.toast('🧩 Hm, hier passt es nicht – schau dir das Teil noch mal an.'); }
    return;
  }
  if (kind === 'koisel') { G.koiSel = G.koiSel === +d.i ? null : +d.i; C.reopen('koi15'); return; }
  if (kind === 'koiname') { C.send({ t: 'koi15', op: 'name', i: +d.i, name: $('koiname15')?.value || '' }); G.koiSel = null; C.reopen('koi15'); return; }
  if (kind === 'rstart') { G.r15 = null; C.send({ t: 'rally15', op: 'start', vs: d.vs, vsName: d.name || '', name: P.name }); return; }
  if (kind === 'rhit') { rallyHit(); return; }
  if (kind === 'treenote') { const v = $('treenote15')?.value.trim(); if (v) C.send({ t: 'tree15', op: 'note', txt: v, name: P.name }); return; }
  if (kind === 'wearhat') { wear({ hat: d.id }); C.reopen('kostuem15'); return; }
  if (kind === 'wearjw') { wear({ [d.slot]: P.look[d.slot] === d.id ? 'none' : d.id }); C.reopen('salon14'); return; }
  if (kind === 'pola') { G.polaPick = +d.id || d.id; C.showPanel('pola15'); return; }
  if (kind === 'polaset') {
    const slot = +d.slot, cap = $('polacap' + slot)?.value || '', id = G.polaPick;
    if (id == null) return;
    photos.get(id).then(p => (p?.url ? polaShrink(p.url) : null)).then(img => {
      if (!img) { C.toast('🖼️ Das Foto ließ sich nicht verkleinern.'); return; }
      C.send({ t: 'pola15', op: 'set', slot, img, cap });
      G.polaPick = null;
    });
    return;
  }
  if (kind === 'polacap') { const slot = +d.slot; C.send({ t: 'pola15', op: 'cap', slot, cap: $('polacap' + slot)?.value || '' }); C.play('click'); return; }
  if (kind === 'polano') { G.polaPick = null; C.reopen('pola15'); return; }
  // Mühle: Stein antippen (auswählen), dann das Ziel
  if (kind === 'msel') {
    const g = s.game, i = +d.i;
    if (!g || g.k !== 'muehle') return;
    if (g.rm) { C.send({ t: 'game', op: 'mtake', i }); return; }
    if (g.hand[g.turn] > 0) { C.send({ t: 'game', op: 'mplace', i }); return; }
    if (g.b[i] === g.turn) { G.mSel = G.mSel === i ? null : i; C.play('click'); C.reopen('games'); return; }
    if (G.mSel != null) { C.send({ t: 'game', op: 'mmove', from: G.mSel, to: i }); G.mSel = null; }
    return;
  }
  // Würfelglück: Würfel festhalten und werfen
  if (kind === 'dhold') { const h = G.dHold ||= [0, 0, 0, 0, 0]; h[+d.i] = h[+d.i] ? 0 : 1; C.play('click'); C.reopen('games'); return; }
  if (kind === 'droll') { C.send({ t: 'game', op: 'droll', hold: G.dHold || [] }); return; }
  if (kind === 'dbank') { C.send({ t: 'game', op: 'dbank' }); G.dHold = [0, 0, 0, 0, 0]; }
}

// Ergebnis einer Aktion (nur beim Spieler, der sie ausgelöst hat)
export function onRes15(r) {
  const x = r.x15;
  if (!x || !r.ok) return;
  const P = C.profile, m = me(), fl = (t, cls) => { if (m) C.world.float(m.x, m.z, t, 2, cls ? { cls } : undefined); };
  if (x.jewel15) { P.owned = [...new Set([...(P.owned || []), E.jewelKey(x.jewel15.id)])]; wear({ [x.jewel15.slot]: x.jewel15.id }); }
  if (x.costume15) { P.owned = [...new Set([...(P.owned || []), x.costume15])]; wear({ hat: x.costume15 }); }
  if (x.advent15) { C.G.adv15 = x.advent15.d; fl(x.advent15.d === 24 ? '🎄✨🎁' : '🎁', 'big'); if (m) for (let i = 0; i < 5; i++) C.world.float(m.x + (Math.random() - 0.5) * 1.6, m.z + (Math.random() - 0.5), ['❄️', '⭐', '✨'][i % 3], 1.2 + Math.random()); }
  if (x.cookie15) fl('🥠', 'big');
  if (x.puzzle15 === 'done' && m) { for (let i = 0; i < 6; i++) C.world.float(m.x + (Math.random() - 0.5) * 1.6, m.z + (Math.random() - 0.5), ['🧩', '🎉', '✨'][i % 3], 1.2 + Math.random()); }
  if (x.koi15 === 'feed' && m) C.world.burst?.(m.x + Math.sin(m.ry) * 0.9, m.z + Math.cos(m.ry) * 0.9, 'water');
}

export function tick15(dt) {
  const G = C.G, s = G.s;
  if (!s || !me()) return;
  rallyTick(dt);
  const R = s.rally; // Aufschlag vom Mitspieler: Bescheid sagen und, wenn gerade nichts offen ist, gleich das Fenster zeigen
  if (R?.p?.[1] === myKey() && E.rallyLive(s) && G.rallyS0 !== R.s0) {
    G.rallyS0 = R.s0;
    C.toast(`🏸 ${R.names[0]} schlägt auf – gleich bist du dran!`, true);
    if (!C.panelOpen()) C.showPanel('rally15');
  }
  if (s.game?.k !== 'muehle') G.mSel = null;
  if (s.game?.k === 'dice' && !s.game.d[0] && G.dHold?.some(Boolean)) G.dHold = [0, 0, 0, 0, 0];
  if (s.koi?.news?.day === s.day && G.koiNews !== s.day) { G.koiNews = s.day; const k = E.KOI[s.koi.news.v]; if (k) C.toast(`🐟 Über Nacht ist im Teich ein ${k[1]} ${k[0]} geschlüpft!${s.koi.news.neu ? ' Eine neue Sorte!' : ''}`, true); }
  const now = performance.now();
  if (!(G.adv15T > now)) { // ab und zu nachsehen: wartet ein Türchen?
    G.adv15T = now + 60000;
    const day = new Date().toDateString();
    if (G.adv15Day !== day && E.adventWaiting(s, myKey()) > 0) { G.adv15Day = day; C.toast('🎄 Im Adventskalender wartet ein Türchen auf dich! (📱 Handy ➜ 🎄 Advent)', true); }
  }
}
