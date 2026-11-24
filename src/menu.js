// Charakter-Editor und Einstellungen (im Hauptmenü und im Spiel genutzt).
import * as THREE from '../vendor/three.module.min.js';
import { LOOKS, cleanLook, randomLook, makeAvatar, makePet, lookKey, PREMIUM_HATS } from './avatar.js';

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

// Besondere Hüte sind erst nach dem Kauf (Schneiderei / Tauschhütte) wählbar
let owned = new Set();
export const setOwnedHats = list => { owned = new Set(list || []); };
const lockedHat = (field, id) => field === 'hat' && PREMIUM_HATS.includes(id) && !owned.has(id);
function options(field, value, look) {
  const list = LOOKS[field];
  if (VIEW[field]) {
    return `<div class="thumbs">${list.map(([id, l]) => { const lock = lockedHat(field, id) && id !== value, src = thumb({ ...look, [field]: id }, VIEW[field]);
      return `<button data-f="${field}" data-v="${id}" class="${id === value ? 'on' : ''}"${lock ? ' disabled title="Gibt es in der Schneiderei der Bummelgasse" style="opacity:.45"' : ''}>${src ? `<img src="${src}" alt="">` : '<span>🚫</span>'}<small>${lock ? '🔒 ' : ''}${l}</small></button>`; }).join('')}</div>`;
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
      if (!b || b.disabled) return;
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
export const PRESETS = {
  low:   { scale: 0.75, shadows: 0, bloom: false, grass: 0, lights: false, view: 0.8, fps: 30 },
  mid:   { scale: 1.0, shadows: 1024, bloom: false, grass: 4, lights: false, view: 1, fps: 60 },
  high:  { scale: 1.0, shadows: 2048, bloom: true, grass: 9, lights: true, view: 1.2, fps: 0 },
  ultra: { scale: 1.25, shadows: 4096, bloom: true, grass: 12, lights: true, view: 1.5, fps: 0 },
};
export const SETTING_DEFAULTS = { camSpeed: 1, mouseSens: 1, zoomSpeed: 1, invert: false, camAngle: 0.74, camSmooth: 1, uiScale: 1, anim: true };
export function settingsHtml(st, touch, tab = 'all') {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${k}" data-v="${v}" class="${String(st[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const tog = k => `<button class="toggle ${st[k] ? 'on' : ''}" data-tog="${k}" aria-label="${k}"><i></i></button>`;
  const vol = k => `<input type="range" min="0" max="100" value="${Math.round(st[k] * 100)}" data-vol="${k}">`;
  const rng = (k, min, max, step, fmt) => `<span class="rng"><input type="range" min="${min}" max="${max}" step="${step}" value="${st[k]}" data-rng="${k}"><output>${fmt(st[k])}</output></span>`;
  const pct = v => Math.round(v * 100) + ' %';
  const row = (label, ctl, hint) => `<div class="set"><b>${label}${hint ? `<br><small style="font-weight:400;color:var(--soft)">${hint}</small>` : ''}</b>${ctl}</div>`;
  const preset = Object.keys(PRESETS).find(p => Object.entries(PRESETS[p]).every(([k, v]) => st[k] === v)) || 'custom';
  return `<h3 class="sethead">🎨 Grafik</h3>
    <div class="set"><b>Voreinstellung</b><div class="seg">${[['low', 'Niedrig'], ['mid', 'Mittel'], ['high', 'Hoch'], ['ultra', 'Ultra']].map(([v, l]) => `<button data-set="quality" data-v="${v}" class="${preset === v ? 'on' : ''}">${l}</button>`).join('')}${preset === 'custom' ? '<button class="on" disabled>Eigene</button>' : ''}</div></div>
    ${row('Auflösung', rng('scale', 0.5, 1.5, 0.05, pct), 'Weniger = flüssiger auf schwachen Geräten')}
    ${row('Schatten', seg('shadows', [[0, 'Aus'], [1024, 'Weich'], [2048, 'Schön'], [4096, 'Scharf']]))}
    ${row('Leuchten (Bloom)', tog('bloom'), 'Lampen und Fenster strahlen nachts')}
    ${row('Laternenlicht', tog('lights'), 'Laternen beleuchten nachts ihre Umgebung')}
    ${row('Grashalme', rng('grass', 0, 12, 1, v => v ? v : 'Aus'))}
    ${row('Sichtweite', rng('view', 0.6, 1.8, 0.1, pct))}
    ${row('Bilder pro Sekunde', seg('fps', [[30, '30'], [60, '60'], [0, 'Max']]), 'Begrenzen spart Akku')}
    ${row('Animationen', tog('anim'), 'Wippen, Fahnen, Windräder, Hüpfer')}
    <h3 class="sethead">🎥 Kamera & Steuerung</h3>
    ${row('Drehtempo (Tasten Z/C)', rng('camSpeed', 0.3, 2.5, 0.1, pct))}
    ${row(touch ? 'Wisch-Empfindlichkeit' : 'Maus-Empfindlichkeit', rng('mouseSens', 0.2, 3, 0.1, pct), touch ? 'Drehen mit zwei Fingern' : 'Drehen mit gedrückter rechter Maustaste')}
    ${row('Zoom-Tempo', rng('zoomSpeed', 0.3, 3, 0.1, pct))}
    ${row('Kamera folgt', rng('camSmooth', 0.3, 2, 0.1, v => v < 0.8 ? 'weich' : v > 1.3 ? 'direkt' : 'normal'))}
    ${row('Blickwinkel', seg('camAngle', [[0.55, 'Flach'], [0.74, 'Normal'], [0.95, 'Steil']]))}
    ${row('Drehrichtung umkehren', tog('invert'))}
    <h3 class="sethead">🖥️ Anzeige</h3>
    ${row('Größe der Knöpfe', seg('uiScale', [[0.85, 'Klein'], [1, 'Normal'], [1.15, 'Groß'], [1.3, 'Riesig']]))}
    ${row('🏷️ Namen anzeigen', tog('names'))}
    ${touch ? row('📱 Querformat', tog('landscape')) : ''}
    ${row('🕰️ Echte Uhrzeit', tog('realtime'), 'Tag & Nacht wie draußen (gilt für die Insel des Hosts)')}
    ${row('⛶ Vollbild', touch ? tog('fullscreen') : '<button class="btn small white" data-ui="fullscreen">Umschalten</button>')}
    <h3 class="sethead">🎵 Klang</h3>
    ${row('Musik', vol('music'))}
    ${row('Geräusche', vol('sound'))}`;
}
