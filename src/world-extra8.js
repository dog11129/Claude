// Grafik für Inselleben 12: schlafende Nachbarn im Bett (mit Decke und 💤).
import * as THREE from '../vendor/three.module.min.js';
import { FURNITURE } from './furni-data.js';
import { NPCS } from './npc.js';
import { HOME_X, footprint } from './state.js';

const DEG90 = Math.PI / 2;
// Bett des Zimmers finden (zuerst das eigene, sonst irgendeins)
function bedOf(R) {
  const beds = Object.entries(R.items).filter(([, o]) => FURNITURE[o?.k]?.bed);
  const [key, o] = beds.find(([k, b]) => k === '-2,-1' || b.npc) || beds[0] || [];
  if (!o) return null;
  const [ax, az] = key.split(',').map(Number), fp = footprint(o.k, ax, az, o.r || 0);
  return { o, cx: fp.reduce((a, p) => a + p[0], 0) / fp.length, cz: fp.reduce((a, p) => a + p[1], 0) / fp.length, len: Math.max(FURNITURE[o.k].w, FURNITURE[o.k].d), wide: Math.min(FURNITURE[o.k].w, FURNITURE[o.k].d) };
}
export function clearSleep(w) {
  if (w.sleepFx) { w.scene.remove(w.sleepFx); w.sleepFx.traverse(o => { o.geometry?.dispose?.(); }); w.sleepFx = null; }
}
// Nachbar liegt im Bett: auf dem Rücken, Kopf am Kopfende, Decke bis zur Brust. Ohne Bett: schläft im Stehen.
export function sleepInBed(w, s, R, e) {
  const bed = bedOf(R), u = e.m.userData, tall = u.headTop || 1.2, time = w.time || 0, id = e.id;
  e.m.userData.update(w.dt || 0.016, { speed: 0, mood: 'sleep', time });
  if (!bed) {
    e.m.position.set(HOME_X + 1.6, 0, R.z0 - 0.6); e.m.rotation.set(0, 0, 0);
    w.tag('nroomnpc', `${NPCS[id].icon} ${NPCS[id].name} 💤`, HOME_X + 1.6, tall + 0.3, R.z0 - 0.6, 'name npc');
    return;
  }
  const r = bed.o.r || 0, a = r * DEG90, bx = HOME_X + bed.cx, bz = R.z0 + bed.cz, top = 0.5, off = Math.min(tall, bed.len - 0.25) / 2 + 0.02;
  // Füße zeigen vom Kopfende weg: bei r = 0 liegt das Kopfende hinten (−z)
  e.m.rotation.order = 'YXZ';
  e.m.rotation.set(-DEG90, a, 0);
  e.m.scale.setScalar(Math.min(1, (bed.len - 0.2) / tall));
  e.x = bx + Math.sin(a) * off; e.z = bz + Math.cos(a) * off;
  e.m.position.set(e.x, top + (u.bodyR || 0.28) * 0.75 + Math.sin(time * 1.4) * 0.006, e.z);
  if (!w.sleepFx) { // Decke: flaches, weiches Kissen in der Farbe des Nachbarn
    const g = new THREE.Group(), col = new THREE.Color(NPCS[id].color || '#ffb7c5').lerp(new THREE.Color(0xffffff), 0.35);
    const geo = new THREE.SphereGeometry(0.5, 14, 10); geo.scale(Math.min(0.95, bed.wide * 0.92), 0.36, bed.len * 0.62);
    const quilt = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
    quilt.position.set(0, top + 0.16, bed.len * 0.17); quilt.castShadow = true;
    g.add(quilt);
    g.position.set(bx, 0, bz); g.rotation.y = a;
    w.scene.add(g); w.sleepFx = g; g.userData.quilt = quilt;
  }
  w.sleepFx.userData.quilt.scale.y = 1 + Math.sin(time * 1.4) * 0.04; // atmet
  const k = (time * 0.4) % 1;
  w.tag('nroomnpc', `${NPCS[id].icon} ${NPCS[id].name} <span style="opacity:${(Math.sin(k * Math.PI)).toFixed(2)}">💤</span>`, bx, top + 1.0 + k * 0.25, bz, 'name npc');
}
