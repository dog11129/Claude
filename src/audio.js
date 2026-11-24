// Kleine Geräusche und sanfte Hintergrundmusik, direkt im Browser erzeugt (keine Audiodateien).
let ctx, master, musicGain, musicTimer;
export const audio = { sound: true, music: true };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.05;
    musicGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  setMusic(audio.music);
}

function tone(f, t0, dur, type = 'sine', vol = 0.2, out = master, f2) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(t0, dur, freq, vol) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = b;
  f.type = 'bandpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

const SFX = {
  till: t => noise(t, 0.14, 500, 0.5),
  water: t => noise(t, 0.3, 2600, 0.25),
  plant: t => tone(420, t, 0.12, 'sine', 0.25, master, 700),
  harvest: t => { tone(660, t, 0.12, 'triangle', 0.2); tone(990, t + 0.08, 0.18, 'triangle', 0.2); },
  coin: t => { tone(1320, t, 0.08, 'square', 0.06); tone(1760, t + 0.07, 0.2, 'square', 0.06); },
  level: t => [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.18)),
  love: t => { tone(880, t, 0.15, 'sine', 0.15); tone(1175, t + 0.12, 0.25, 'sine', 0.15); },
  place: t => tone(260, t, 0.1, 'square', 0.08, master, 180),
  chat: t => tone(1200, t, 0.08, 'sine', 0.12),
  bite: t => { tone(1500, t, 0.06, 'square', 0.08); tone(1500, t + 0.1, 0.06, 'square', 0.08); },
  fail: t => tone(330, t, 0.25, 'triangle', 0.15, master, 200),
  join: t => [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.1, 0.25, 'sine', 0.15)),
};

export function play(name) {
  if (!ctx || !audio.sound || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01);
}

// Gemütliche Zufallsmelodie in Pentatonik
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const CHORDS = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]];
export function setMusic(on) {
  audio.music = on;
  clearInterval(musicTimer);
  if (!ctx || !on) return;
  let step = 0;
  musicTimer = setInterval(() => {
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05, chord = CHORDS[Math.floor(step / 8) % 4], hz = n => 261.6 * 2 ** (n / 12);
    if (step % 8 === 0) chord.forEach(n => tone(hz(n - 12), t, 3.2, 'sine', 0.35, musicGain));
    if (Math.random() < 0.6) tone(hz(SCALE[Math.floor(Math.random() * SCALE.length)] + (step % 16 < 8 ? 0 : 5)), t, 0.6, 'triangle', 0.5, musicGain);
    step++;
  }, 420);
}
