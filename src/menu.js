// Charakter-Editor und Einstellungen (im Hauptmenü und im Spiel genutzt).
import { LOOKS, cleanLook, randomLook } from './avatar.js';

const $ = id => document.getElementById(id);

const TABS = [
  ['face', '🙂 Gesicht', [['skin', 'Hautfarbe'], ['eyes', 'Augen']]],
  ['hair', '💇 Haare', [['hairStyle', 'Frisur'], ['hairColor', 'Haarfarbe']]],
  ['outfit', '👕 Outfit', [['top', 'Oberteil'], ['topColor', 'Farbe Oberteil'], ['bottomColor', 'Hose / Rock'], ['shoes', 'Schuhe']]],
  ['extra', '🎩 Extras', [['hat', 'Kopfbedeckung'], ['glasses', 'Brille']]],
  ['pet', '🐾 Haustier', [['pet', 'Begleiter'], ['petColor', 'Fellfarbe']]],
];

function options(field, value) {
  const list = LOOKS[field];
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
    $('edbody').innerHTML = fields.map(([f, l]) => `<div><h4>${l}</h4>${options(f, this.look[f])}</div>`).join('');
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
    <div class="set"><b>⛶ Vollbild</b><button class="btn small white" data-ui="fullscreen">Umschalten</button></div>`;
}
