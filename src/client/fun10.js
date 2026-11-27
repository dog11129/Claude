// Inselleben 14 im Browser: Outfit-Speicherplätze (liegen auf dem Gerät), Liebesschloss-Text, Hasen-Name, Hausnummer,
// Kuscheln zu zweit, Sternguck-Decke, Bewertung durch die Nachbarn. Logik beim Host: src/extras14.js.
import { LOOKS, cleanLook } from '../avatar.js';
import { PLACE } from '../data.js';
import { salonKey } from '../salon-data.js';

let C = null;
const $ = id => document.getElementById(id);
const me = () => C.G.players[C.G.me];
export function initFun10(ctx) { C = ctx; }

// Was zu einem Outfit gehört (Hautfarbe, Augen und Begleiter bleiben, wie sie sind)
export const OUTFIT_KEYS = ['hairStyle', 'hairColor', 'top', 'topColor', 'bottomColor', 'shoes', 'hat', 'glasses', 'blush', 'lips', 'lid', 'mark', 'nails', 'neck', 'ear', 'wrist', 'pat'];
export const OUTFIT_SLOTS = 6;
export const outfits = () => (C?.profile.outfits || []);
const nameOf = (k, v) => (LOOKS[k].find(o => o[0] === v) || [])[1] || '';
export const outfitLabel = l => [nameOf('top', l.top), l.hat && l.hat !== 'none' ? nameOf('hat', l.hat) : '', nameOf('hairStyle', l.hairStyle)].filter(Boolean).join(' · ');
function wear(look) {
  const P = C.profile;
  P.look = cleanLook({ ...P.look, ...look, pat: look.pat });
  C.saveProfile(); C.sendLook();
  const m = me();
  if (m) { C.world.float(m.x, m.z, '✨', 1.4); C.world.burst?.(m.x, m.z, 'heart', 1.2); }
  C.play('love');
}

export function uiX(kind, d) {
  const G = C.G, P = C.profile;
  if (kind === 'lock') { C.send({ t: 'lock14', c: +d.c, txt: $('locktxt')?.value || '' }); return; }
  if (kind === 'petname') { const v = $('petname')?.value.trim(); if (v) C.send({ t: 'pet14', op: 'name', name: v }); return; }
  if (kind === 'nr') { C.send({ t: 'ext14', k: 'nr', v: Math.max(0, Math.min(99, +($('extnr')?.value || 0) | 0)) }); return; }
  if (kind === 'outsave') {
    const L = P.outfits ||= [], i = +d.i, look = {};
    for (const k of OUTFIT_KEYS) if (P.look[k] !== undefined) look[k] = P.look[k];
    L[i] = { look, day: G.s.day };
    C.saveProfile(); C.play('place'); C.toast('👗 Outfit gespeichert!'); C.reopen('outfits14');
    return;
  }
  if (kind === 'outwear') { const o = (P.outfits || [])[+d.i]; if (o) { wear(o.look); C.reopen('outfits14'); } return; }
  if (kind === 'editor') { C.openEditor(d.tab || 'makeup'); return; }
  if (kind === 'pose') { C.closePanel(); G.pose14 = 1.6; C.play('love'); return; }
  if (kind === 'outdel') { const L = P.outfits || []; L[+d.i] = null; while (L.length && !L[L.length - 1]) L.pop(); C.saveProfile(); C.play('click'); C.reopen('outfits14'); }
}

// Ergebnis einer Aktion (nur beim Spieler, der sie ausgelöst hat)
export function onRes14(r) {
  if (r.rate14) {
    const R = r.rate14, m = me();
    R.lines.forEach((l, i) => setTimeout(() => C.toast(`${l.icon} ${l.name}: „${l.t}“ ${'⭐'.repeat(l.st)}`), 700 + i * 1500));
    if (m) C.world.float(m.x, m.z, '⭐'.repeat(R.stars), 2.4, { cls: 'big' });
  }
  if (r.salon14 && r.ok) { // gleich tragen, was man sich gerade ausgesucht hat
    const { kind, id } = r.salon14, P = C.profile;
    P.owned = [...new Set([...(P.owned || []), salonKey(kind, id)])];
    wear(kind === 'hair' ? { hairStyle: id } : kind === 'hcol' ? { hairColor: id } : { nails: id });
  }
}

// Zu zweit auf einem Kuschelplatz: nebeneinander sitzen (statt ineinander)
export function sitSpot(sit) {
  const a = sit.r * Math.PI / 2, side = sit.two ? (C.G.me === 'h' ? -0.24 : 0.24) : 0;
  if (sit.two) C.G.sit14 = { x: sit.x, z: sit.z, k: sit.k, t: 0, sent: false, puff: 0 };
  return { x: sit.x + Math.cos(a) * side, z: sit.z - Math.sin(a) * side };
}

export function tick14(dt) {
  const G = C.G, m = me(), s = G.s;
  if (!m || !s) return;
  const S = G.sit14;
  if (S && m.pose !== 'sit') G.sit14 = null;
  else if (S) {
    const other = Object.values(G.players).some(p => p !== m && p.pose === 'sit' && Math.hypot(p.x - S.x, p.z - S.z) < 0.7);
    if (other) {
      S.t += dt; S.puff -= dt;
      if (S.puff <= 0) { S.puff = 2.6; C.world.float(S.x, S.z, S.t > 5 ? '💤' : '💗', 1.6); }
      if (S.t > 5 && !S.sent) { S.sent = true; C.send({ t: 'cuddle14', x: S.x, z: S.z }); }
    } else S.t = 0;
    // Sternguck-Decke: bei jeder Sternschnuppe wünscht ihr euch von selbst etwas
    if (S.k === 'sternendecke' && s.starNight && C.world.shootT >= 0 && C.world.shootT < 0.4 && !(G.wish14 > performance.now())) {
      G.wish14 = performance.now() + 2500;
      C.send({ t: 'wish' });
      C.world.float(S.x, S.z, '🌠', 1.8);
    }
  }
  if (G.pose14 > 0) { // vor dem Spiegel drehen
    G.pose14 -= dt; m.ry += dt * 6.283 / 1.2;
    if (!(G.pose14p > performance.now())) { G.pose14p = performance.now() + 450; C.world.float(m.x, m.z, ['✨', '💖', '⭐'][Math.floor(Math.random() * 3)], 1.5); }
  }
  const h = 6 + s.dayTime * 18;
  if (s.starNight && h >= 19 && h < 19.5 && G.starToast !== s.day) { G.starToast = s.day; C.toast(s.starShower ? '🌠 Sternschnuppen-Schauer heute Nacht! Schaut nach oben und wünscht euch etwas.' : '🌠 Heute Nacht fallen Sternschnuppen – schaut nach oben!'); }
}
export const terraName = k => (k === 'none' ? ['🧹', 'Einebnen'] : null);
export const cuddleLabel = k => PLACE[k]?.name;
