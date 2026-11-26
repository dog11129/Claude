// Inselleben 9 im Browser: weißer Hirsch (nicht rennen!), Kristallklang (Töne nachspielen), Hinweise beim Betreten
// der Gebiete. Logik beim Host: src/extras9.js (features/areas2.js).
import * as E from '../extras9.js';
import { AREAS, areaOf } from '../areas.js';
import { pianoNote } from '../audio.js';

let C = null;
const me = () => C.G.players[C.G.me];
const myKey = () => me()?.key || 'host';
const NOTES = [76, 81, 84]; // E, A, C – die drei Kristalle
export function initFun7(ctx) { C = ctx; }
export const usable9 = r => !!r && (!!r.stag9 || r.chime9 != null);

export function execute9(r, fresh) {
  const G = C.G, s = G.s;
  if (r.stag9) {
    if (!fresh) return true;
    if (C.world.stagFled9 === s.day) { C.toast('🦌 Der Hirsch ist erschrocken davongesprungen – morgen früh ganz leise anschleichen!'); return true; }
    if (s.area9?.day === s.day && s.area9.ev?.['stag:' + myKey()]) { C.toast('🦌 Der weiße Hirsch schaut dich freundlich an.'); C.world.burst(me().x, me().z, 'heart', 1.4); return true; }
    C.send({ t: 'area9', op: 'stag' });
    C.world.burst(me().x, me().z, 'heart', 1.4);
    return true;
  }
  if (r.chime9 != null) { if (fresh) chime(r.chime9); return true; }
  return false;
}

// ---------- Kristallklang: am Klangstein anhören, dann die Kristalle in derselben Reihenfolge anschlagen ----------
function light(i) { C.world.chime9 = { i, until: C.world.time + 0.45 }; pianoNote(NOTES[i], 0.9, 0.3); }
function chime(k) {
  const G = C.G, s = G.s, done = s.area9?.day === s.day && s.area9.ev?.['chime:' + myKey()];
  if (k === 'start') {
    if (G.chime9?.play) return;
    const seq = E.chimeSeq(s.day);
    G.chime9 = { seq, pos: 0, play: true };
    C.toast(done ? '🎵 Die Kristalle summen ihr Lied von heute …' : '🎵 Hör gut zu – dann die Kristalle in derselben Reihenfolge anschlagen!');
    seq.forEach((i, n) => setTimeout(() => { if (G.chime9?.seq === seq) light(i); }, 700 + n * 750));
    setTimeout(() => { if (G.chime9?.seq === seq) G.chime9.play = false; }, 700 + seq.length * 750);
    return;
  }
  light(k);
  const P = G.chime9;
  if (!P || P.play || done) return;
  if (P.seq[P.pos] !== k) { G.chime9 = null; C.toast('🎵 Schief! Am Klangstein noch einmal anhören.'); C.play('fail'); return; }
  P.pos++;
  if (P.pos >= P.seq.length) { G.chime9 = null; C.send({ t: 'area9', op: 'chime', seq: P.seq }); }
}

// ---------- jede Bildaktualisierung ----------
export function update9() {
  const G = C.G, m = me(), s = G?.s;
  if (!s || !m) return;
  C.world.me9 = m;
  const id = m.x < -150 ? areaOf(m) : null;
  if (id !== G.area9) { G.area9 = id; if (id) setTimeout(() => hints(id), 900); }
  if (id === 'wald' && E.stagNow(s) && C.world.stagFled9 !== s.day && m.run && !(s.area9?.day === s.day && s.area9.ev?.['stag:' + myKey()])) {
    const A = AREAS.wald, d = Math.hypot(m.x - A.x - E.STAG_AT[0], m.z - A.z - E.STAG_AT[1]);
    if (d < 5) { C.world.stagFled9 = s.day; C.world.burst(A.x + E.STAG_AT[0], A.z + E.STAG_AT[1], 'dust', 0.3); C.toast('🦌 Huch! Der weiße Hirsch ist davongesprungen. Morgen früh ganz leise anschleichen (nicht rennen)!'); }
  }
}
function hints(id) {
  const G = C.G, s = G.s, m = me(), ev = s.area9?.day === s.day ? s.area9.ev || {} : {};
  if (!m || G.area9 !== id) return;
  const t = id === 'wald' ? (E.stagNow(s) && C.world.stagFled9 !== s.day && !ev['stag:' + myKey()] ? '🦌 Psst … auf der Lichtung steht der weiße Hirsch. Langsam hingehen, nicht rennen!' : E.ringNow(s) && !ev['ring:' + myKey()] ? '🍄 Der Pilzkreis leuchtet heute Nacht – stell dich hinein!' : '')
    : id === 'wiese' ? (E.swarmNow(s) && (ev['swarm:' + myKey()] || 0) < E.SWARM_MAX ? '🦋 Schmetterlingstanz! Mit dem Kescher Goldstaub fangen.' : '')
      : !ev['chime:' + myKey()] ? '🎵 Hörst du das? Der Klangstein summt …' : '';
  if (t) C.toast(t);
}
