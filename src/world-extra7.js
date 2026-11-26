// Grafik für Inselleben 10: Mieze im Katzenkörbchen schläft (💤 steigen auf). Wird über decorFurniture (world-extra3.js) eingehängt.
import * as THREE from '../vendor/three.module.min.js';

let zzz = null;
function zzzMat() {
  if (zzz || typeof document === 'undefined') return zzz;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = '48px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('💤', 32, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (zzz = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
}
export function decorFurniture10(m, o) {
  if (o.k !== 'katzenbett') return null;
  const mat = zzzMat();
  if (!mat) return null;
  const sp = new THREE.Sprite(mat.clone());
  sp.scale.setScalar(0.22);
  m.add(sp);
  return t => {
    const k = (t * 0.35) % 1;
    sp.position.set(0.1 + Math.sin(t * 2) * 0.03, 0.45 + k * 0.4, 0.05);
    sp.material.opacity = Math.sin(k * Math.PI) * 0.85;
  };
}
