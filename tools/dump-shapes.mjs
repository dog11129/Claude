// Liest die Bauteil-Listen der Figuren (Avatar, Haustiere, Nachbarn, Nutztiere) und schreibt sie als
// Grundformen mit Matrix + Farbe nach blender/shapes_data.py. blender/shapes.py baut daraus in Blender
// glatte, feinere Modelle (characters.glb). Farben der Avatare/Haustiere sind Schlüsselfarben, die das
// Spiel beim Laden durch die gewählten Farben ersetzt.
import * as THREE from '../vendor/three.module.min.js';
import { writeFileSync } from 'node:fs';

// jede Transformation einer Geometrie mitschreiben (translate/rotate/scale laufen alle über applyMatrix4)
const orig = THREE.BufferGeometry.prototype.applyMatrix4;
THREE.BufferGeometry.prototype.applyMatrix4 = function (m) {
  this.userData.M = (this.userData.M || new THREE.Matrix4()).premultiply(m);
  return orig.call(this, m);
};
const A = await import('../src/avatar.js'), Npc = await import('../src/npc.js'), Ani = await import('../src/animals.js');

const TYPES = { SphereGeometry: 's', CylinderGeometry: 'c', ConeGeometry: 'k', TorusGeometry: 't', BoxGeometry: 'b' };
const r4 = v => Math.round(v * 1e5) / 1e5;
function prim({ g, c }) {
  const t = TYPES[g.type];
  if (!t) throw new Error('Unbekannte Form ' + g.type);
  const P = g.parameters, p = {
    s: [P.radius, P.widthSegments, P.heightSegments, P.phiStart, P.phiLength, P.thetaStart, P.thetaLength],
    c: [P.radiusTop, P.radiusBottom, P.height, P.radialSegments, P.heightSegments, P.openEnded ? 1 : 0, P.thetaStart, P.thetaLength],
    k: [0, P.radius, P.height, P.radialSegments, P.heightSegments, P.openEnded ? 1 : 0, P.thetaStart, P.thetaLength],
    t: [P.radius, P.tube, P.radialSegments, P.tubularSegments, P.arc],
    b: [P.width, P.height, P.depth],
  }[t];
  return [t === 'k' ? 'c' : t, p.map(r4), (g.userData.M || new THREE.Matrix4()).elements.map(r4), new THREE.Color(c).getHex()];
}
const out = {};
const put = (name, parts) => { if (parts && parts.length) out[name] = parts.map(prim); };

// ---------- Avatar (Schlüsselfarben) ----------
const KEY = { skin: '#ff00ff', hairColor: '#00ffff', topColor: '#ffff00', bottomColor: '#0000ff', shoes: '#ff0000' };
const look = o => ({ ...A.defaultLook(), ...KEY, hat: 'none', glasses: 'none', hairStyle: 'bald', ...o });
const P = A.__parts, ids = k => A.LOOKS[k].map(o => (Array.isArray(o) ? o[0] : o));
put('av_head', P.headParts(look({})));
for (const st of ids('hairStyle')) {
  const h = P.hairParts(st, KEY.hairColor);
  put('av_hair_' + st, h);
  put('av_hairlow_' + st, h.filter(q => (q.g.computeBoundingBox(), q.g.boundingBox.min.y + q.g.boundingBox.max.y < 0.28)));
}
for (const h of ids('hat')) put('av_hat_' + h, P.hatParts(look({ hat: h })));
for (const g of ids('glasses')) put('av_glasses_' + g, P.glassesParts(g));
for (const e of ids('eyes')) put('av_eyes_' + e, P.eyeParts(e));
for (const t of ids('top')) put('av_torso_' + t, P.torsoParts(look({ top: t })));
put('av_arm_hoodie', P.armParts(look({ top: 'hoodie' }))); put('av_arm_vest', P.armParts(look({ top: 'vest' }))); put('av_arm_short', P.armParts(look({ top: 'tshirt' })));
put('av_leg_dress', P.legParts(look({ top: 'dress' }))); put('av_leg_pants', P.legParts(look({ top: 'tshirt' })));
for (const [k, [, , fn]] of Object.entries(P.HELD)) put('held_' + k, fn());
for (const k of ids('pet').filter(k => k !== 'none')) {
  const D = P.petParts(k, k === 'pig' ? '#e8a35c' : '#00ff00');
  for (const n of ['body', 'head', 'tail', 'a', 'b']) put(`pet_${k}_${n}`, D[n]);
}
// ---------- Nachbarn ----------
for (const [id, fn] of Object.entries(Npc.__shapes)) {
  const D = fn();
  for (const n of ['leg', 'body', 'arm', 'armR', 'head', 'eyes', 'joy', 'ears', 'tail']) put(`npc_${id}_${n}`, D[n]);
}
// ---------- Nutztiere ----------
for (const [id, fn] of Object.entries(Ani.__shapes)) {
  const D = fn();
  for (const n of ['body', 'head', 'eyes', 'joy', 'tail', 'legA', 'legB']) put(`ani_${id}_${n}`, D[n]);
  put(`ani_${id}_earL`, D.ear(1)); put(`ani_${id}_earR`, D.ear(-1));
}
const n = Object.values(out).reduce((a, b) => a + b.length, 0);
writeFileSync(new URL('../blender/shapes_data.py', import.meta.url), '# erzeugt von tools/dump-shapes.mjs – nicht von Hand ändern\nSHAPES = ' + JSON.stringify(out) + '\n');
console.log(Object.keys(out).length, 'Teile,', n, 'Grundformen');
