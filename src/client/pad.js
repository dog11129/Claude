// Controller (Gamepad) am PC: linker Stick laufen, rechter Stick Kamera, A Aktion, B zurück, X Tasche, Y Handy,
// LB/RB Werkzeug wechseln (im Baumodus: drehen), LT Karte, RT rennen, Back Baumodus, Start Menü.
// In Fenstern springt das Steuerkreuz (oder der linke Stick) von Knopf zu Knopf, A drückt ihn.
let prev = [], navT = 0, was = false, P = null;
const key = (k, up) => dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { key: k, bubbles: true }));
const tapKey = k => { key(k); key(k, true); };
const visible = el => !!el && el.offsetParent !== null && !el.closest('.hidden');

export function initPad(ctx) {
  P = ctx;
  addEventListener('gamepadconnected', e => { P.toast(`🎮 Controller verbunden${e.gamepad?.id ? '' : ''} – A: Aktion · B: zurück · Y: Handy`); });
  addEventListener('gamepaddisconnected', () => { P.joy.x = P.joy.y = 0; P.keys.delete('shift'); });
  const st = document.createElement('style');
  st.textContent = '.padfocus { outline: 4px solid #ff8fab !important; outline-offset: 2px; border-radius: 12px; }';
  document.head.appendChild(st);
}

// Wo gerade Knöpfe sind: Minispiel, Fenster, Gespräch, Menü
function container() {
  const G = P.G;
  if (G?.mg) return null;
  for (const id of ['rev7', 'panel', 'dialog', 'menu', 'editor']) { const el = document.getElementById(id); if (visible(el) && (id !== 'panel' || P.panels.open)) return el; }
  return null;
}
function focusables(box) { return [...box.querySelectorAll('button:not([disabled]), [data-act], [data-ui], input, select')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
function moveFocus(box, dx, dy) {
  const list = focusables(box);
  if (!list.length) return;
  let cur = document.activeElement;
  if (!list.includes(cur)) { setFocus(list[0]); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2 - ax, y = r.top + r.height / 2 - ay, along = x * dx + y * dy;
    if (along <= 4) continue;
    const d = along + Math.abs(x * dy + y * dx) * 2.5;
    if (d < bd) { bd = d; best = el; }
  }
  if (best) setFocus(best);
}
function setFocus(el) {
  document.querySelector('.padfocus')?.classList.remove('padfocus');
  el.classList.add('padfocus');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function pollPad(dt) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const gp = pads.find(p => p.mapping === 'standard') || pads[0];
  if (!gp || !P) { if (was) { P.joy.x = P.joy.y = 0; was = false; } return; }
  const G = P.G, b = gp.buttons.map(x => x.pressed || x.value > 0.5), down = i => b[i] && !prev[i], up = i => !b[i] && prev[i];
  const ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < 0.2 ? 0 : v; };
  const box = container(), now = performance.now();
  // Steuerkreuz / Stick: in Fenstern Fokus bewegen
  const dir = [b[14] || ax(0) < -0.6 ? -1 : b[15] || ax(0) > 0.6 ? 1 : 0, b[12] || ax(1) < -0.6 ? -1 : b[13] || ax(1) > 0.6 ? 1 : 0];
  if (box?.id === 'rev7') { if (down(0) || down(15)) G?.review7?.next(); if (down(1) || down(9)) G?.review7?.close(); P.joy.x = P.joy.y = 0; }
  else if (box) {
    if ((dir[0] || dir[1]) && now > navT) { navT = now + (prev.navHeld ? 160 : 320); moveFocus(box, dir[0], dir[0] ? 0 : dir[1]); }
    prev.navHeld = !!(dir[0] || dir[1]);
    if (!dir[0] && !dir[1]) navT = 0;
    if (down(0)) { const f = document.querySelector('.padfocus'); if (f && box.contains(f)) f.click(); else { const l = focusables(box); if (l[0]) setFocus(l[0]); } }
    if (down(1) || down(9)) tapKey('Escape');
    if (down(3) && box.id === 'panel') tapKey('h');
    if (box.id === 'panel' && ax(3)) box.querySelector('#pbody')?.scrollBy(0, ax(3) * dt * 900);
    P.joy.x = P.joy.y = 0;
  } else if (G?.ready) {
    document.querySelector('.padfocus')?.classList.remove('padfocus');
    if (G.mg) { // Minispiele: Steuerkreuz = Pfeiltasten, A = Leertaste
      for (const [i, k] of [[12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']]) if (down(i)) tapKey(k);
      if (down(0)) tapKey(' ');
      if (down(1)) document.getElementById('mgquit')?.click();
    } else {
      if (P.joy.id == null) { P.joy.x = ax(0) + (b[15] ? 1 : 0) - (b[14] ? 1 : 0); P.joy.y = ax(1) + (b[13] ? 1 : 0) - (b[12] ? 1 : 0); }
      if (down(0)) key('e'); if (up(0)) key('e', true);
      if (down(1)) tapKey('Escape');
      if (down(2)) tapKey(G.build ? 'x' : 'i'); // im Baumodus: Aufheben an/aus
      if (down(3)) tapKey('h');
      if (down(4) || down(5)) { if (G.build) tapKey('r'); else P.cycle(down(4) ? -1 : 1); }
      if (down(6)) tapKey('m');
      if (b[7]) P.keys.add('shift'); else if (prev[7]) P.keys.delete('shift');
      if (down(8)) tapKey('g');
      if (down(9)) tapKey('Escape');
      if (down(10)) tapKey('p');
    }
    const rx = ax(2), ry = ax(3);
    if (rx && !G.talk) { P.world.rotate(-rx * dt * 2.6 * (P.settings.invert ? -1 : 1)); P.world.yaw = P.world.yawT; }
    if (ry && !G.mg) P.world.zoom = Math.max(0.5, Math.min(1.9, P.world.zoom * (1 + ry * dt * 1.2)));
  }
  was = true;
  const nh = prev.navHeld;
  prev = b; prev.navHeld = nh;
}
