// Charakter-Editor und Einstellungen (im Hauptmenü und im Spiel genutzt).
import * as THREE from '../vendor/three.module.min.js';
import { LOOKS, cleanLook, randomLook, makeAvatar, makePet, lookKey } from './avatar.js';

// Kleine 3D-Vorschaubilder für jede Option (eigener Mini-Renderer, Ergebnis wird zwischengespeichert)
const VIEW = { hairStyle: 'head', hat: 'head', glasses: 'face', eyes: 'face', top: 'body', pet: 'pet' };
const CAM = { head: [[0, 1.32, 1.7], [0, 1.13, 0]], face: [[0, 1.08, 0.85], [0, 1.03, 0]], body: [[0, 0.85, 2.5], [0, 0.62, 0]], pet: [[0, 0.42, 1.0], [0, 0.2, 0]] };
let tr = null, ts, tc;
const thumbs = new Map();
function thumb(look, view) {
  const k = view + lookKey(look) + look.pet + look.petColor;
  if (thumbs.has(k)) return thumbs.get(k);
  if (!tr) {
    tr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    tr.setPixelRatio(1);
    tr.setSize(112, 112);
    tr.toneMapping = THREE.NeutralToneMapping;
    ts = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xfff6e8, 2.2);
    sun.position.set(-1, 2, 2);
    ts.add(new THREE.HemisphereLight(0xffffff, 0xd8c8b8, 1.6), sun);
    tc = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
  }
  if (view === 'pet' && look.pet === 'none') { thumbs.set(k, ''); return ''; }
  const o = view === 'pet' ? makePet(look.pet, look.petColor) : makeAvatar(look);
  o.userData.update?.(1, {});
  o.rotation.y = 0.35;
  ts.add(o);
  const [p, t] = CAM[view];
  tc.position.set(...p);
  tc.lookAt(...t);
  tr.render(ts, tc);
  ts.remove(o);
  const url = tr.domElement.toDataURL('image/png');
  thumbs.set(k, url);
  return url;
}

const $ = id => document.getElementById(id);

const TABS = [
  ['face', '🙂 Gesicht', [['skin', 'Hautfarbe'], ['eyes', 'Augen']]],
  ['hair', '💇 Haare', [['hairStyle', 'Frisur'], ['hairColor', 'Haarfarbe']]],
  ['outfit', '👕 Outfit', [['top', 'Oberteil'], ['topColor', 'Farbe Oberteil'], ['bottomColor', 'Hose / Rock'], ['shoes', 'Schuhe']]],
  ['extra', '🎩 Extras', [['hat', 'Kopfbedeckung'], ['glasses', 'Brille']]],
  ['pet', '🐾 Haustier', [['pet', 'Begleiter'], ['petColor', 'Fellfarbe']]],
];

function options(field, value, look) {
  const list = LOOKS[field];
  if (VIEW[field]) {
    return `<div class="thumbs">${list.map(([id, l]) => { const src = thumb({ ...look, [field]: id }, VIEW[field]);
      return `<button data-f="${field}" data-v="${id}" class="${id === value ? 'on' : ''}">${src ? `<img src="${src}" alt="">` : '<span>🚫</span>'}<small>${l}</small></button>`; }).join('')}</div>`;
  }
  if (typeof list[0] === 'string') {
    return `<div class="swatches">${list.map(c => `<button style="background:${c}" data-f="${field}" data-v="${c}" class="${c === value ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div>`;
  }
  return `<div class="chips">${list.map(([id, l]) => `<button data-f="${field}" data-v="${id}" class="${id === value ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

export class Editor {
  constructor() {
    this.tab = 'face';
    $('edtabs').innerHTML = TABS.map(([id, l]) => `<button data-t="${id}">${l}</button>`).join('');
    $('edtabs').onclick = e => { const t = e.target.closest('button')?.dataset.t; if (t) { this.tab = t; this.render(); } };
    $('edbody').onclick = e => {
      const b = e.target.closest('button[data-f]');
      if (!b) return;
      this.look = { ...this.look, [b.dataset.f]: b.dataset.v };
      this.render();
      this.onChange?.(this.look);
    };
    $('edrand').onclick = () => {
      this.look = { ...randomLook(), pet: this.look.pet, petColor: this.look.petColor };
      this.render();
      this.onChange?.(this.look);
    };
    $('edok').onclick = () => {
      const name = $('pname').value.trim().slice(0, 16);
      if (!name) { $('perr').textContent = 'Gib dir einen Namen 🙂'; $('pname').focus(); return; }
      this.close();
      this.onDone?.(name, cleanLook(this.look));
    };
    $('edcancel').onclick = () => { this.close(); this.onCancel?.(); };
    for (const b of document.querySelectorAll('#edrot [data-rot]')) b.onclick = () => this.onRotate?.(+b.dataset.rot);
  }
  open({ name, look }, { onChange, onDone, onCancel, onRotate, canCancel = true }) {
    Object.assign(this, { look: cleanLook(look), onChange, onDone, onCancel, onRotate, isOpen: true });
    $('pname').value = name || '';
    $('perr').textContent = '';
    $('edcancel').classList.toggle('hidden', !canCancel);
    $('editor').classList.remove('hidden');
    $('edrot').classList.remove('hidden');
    this.render();
  }
  close() {
    this.isOpen = false;
    $('editor').classList.add('hidden');
    $('edrot').classList.add('hidden');
  }
  render() {
    for (const b of $('edtabs').children) b.classList.toggle('on', b.dataset.t === this.tab);
    const [, , fields] = TABS.find(t => t[0] === this.tab);
    $('edbody').innerHTML = fields.map(([f, l]) => `<div><h4>${l}</h4>${options(f, this.look[f], this.look)}</div>`).join('');
  }
}

// Einstellungen: dieselben Regler im Hauptmenü und im Spiel-Menü
export function settingsHtml(st, touch) {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${k}" data-v="${v}" class="${st[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const tog = k => `<button class="toggle ${st[k] ? 'on' : ''}" data-tog="${k}" aria-label="${k}"><i></i></button>`;
  const vol = k => `<input type="range" min="0" max="100" value="${Math.round(st[k] * 100)}" data-vol="${k}">`;
  return `<div class="set"><b>🎨 Grafik</b>${seg('quality', [['low', 'Niedrig'], ['mid', 'Mittel'], ['high', 'Hoch']])}</div>
    <div class="set"><b>🎵 Musik</b>${vol('music')}</div>
    <div class="set"><b>🔊 Geräusche</b>${vol('sound')}</div>
    ${touch ? `<div class="set"><b>📱 Querformat</b>${tog('landscape')}</div>` : ''}
    <div class="set"><b>🏷️ Namen anzeigen</b>${tog('names')}</div>
    <div class="set"><b>🕰️ Echte Uhrzeit<br><small style="font-weight:400;color:var(--soft)">Tag & Nacht wie draußen (gilt für die Insel des Hosts)</small></b>${tog('realtime')}</div>
    <div class="set"><b>⛶ Vollbild</b>${touch ? tog('fullscreen') : '<button class="btn small white" data-ui="fullscreen">Umschalten</button>'}</div>`;
}
