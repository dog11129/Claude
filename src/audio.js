// Geräusche, Umgebungsklänge und sanfte Musik – alles direkt im Browser erzeugt (keine Audiodateien).
let ctx, master, sfxGain, musicGain, ambGain, rainGain, musicTimer, nextBird = 0, nextCricket = 0, nextStep = 0;
export const audio = { sound: 0.8, music: 0.6 };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    ambGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain.connect(master);
    ambGain.connect(master);
    // Regen: gefiltertes Rauschen in Dauerschleife, Lautstärke wird geregelt
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    src.buffer = b;
    src.loop = true;
    f.type = 'lowpass';
    f.frequency.value = 1400;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    src.connect(f).connect(rainGain).connect(ambGain);
    src.start();
    setVolumes();
    setMusic(audio.music);
    loadAudio();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = audio.sound * 0.6;
  ambGain.gain.value = audio.sound * 0.5;
  musicGain.gain.value = audio.music * (musicBuf.day ? 0.35 : 0.07);
}

function tone(f, t0, dur, type = 'sine', vol = 0.2, out = sfxGain, f2) {
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

function noise(t0, dur, freq, vol, out = sfxGain, q = 1) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = b;
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t0);
}

const SFX = {
  till: t => { noise(t, 0.14, 500, 0.5); noise(t + 0.05, 0.1, 300, 0.3); },
  water: t => noise(t, 0.35, 2600, 0.22),
  plant: t => tone(420, t, 0.12, 'sine', 0.25, sfxGain, 700),
  harvest: t => { tone(660, t, 0.12, 'triangle', 0.2); tone(990, t + 0.08, 0.18, 'triangle', 0.2); },
  coin: t => { tone(1320, t, 0.08, 'square', 0.05); tone(1760, t + 0.07, 0.22, 'square', 0.05); },
  level: t => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.35, 'triangle', 0.17)),
  love: t => { tone(880, t, 0.15, 'sine', 0.15); tone(1175, t + 0.12, 0.25, 'sine', 0.15); },
  place: t => { tone(260, t, 0.1, 'square', 0.07, sfxGain, 180); noise(t, 0.12, 900, 0.2); },
  chat: t => tone(1200, t, 0.08, 'sine', 0.12),
  bite: t => { tone(1500, t, 0.06, 'square', 0.08); tone(1500, t + 0.1, 0.06, 'square', 0.08); },
  fail: t => tone(330, t, 0.25, 'triangle', 0.15, sfxGain, 200),
  join: t => [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.1, 0.25, 'sine', 0.15)),
  click: t => tone(900, t, 0.05, 'sine', 0.1),
  shutter: t => { noise(t, 0.05, 3000, 0.5); noise(t + 0.08, 0.06, 2000, 0.4); },
  ach: t => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.4, 'sine', 0.16)),
  splash: t => { noise(t, 0.25, 1200, 0.4); tone(300, t, 0.15, 'sine', 0.1, sfxGain, 600); },
  chop: t => { noise(t, 0.08, 900, 0.6, sfxGain, 3); tone(180, t, 0.12, 'triangle', 0.2, sfxGain, 120); },
  door: t => { tone(520, t, 0.12, 'sine', 0.12, sfxGain, 660); tone(780, t + 0.1, 0.18, 'sine', 0.12); },
};

// Echte Aufnahmen (Musik & Effekte aus assets/audio). Fehlt eine Datei, spielt die erzeugte Version.
const SAMPLES = {}, SAMPLE_FILES = {
  harvest: 'sfx-harvest.mp3', coin: 'sfx-coin.mp3', level: 'sfx-level.mp3', ach: 'sfx-quest.mp3', till: 'sfx-dig.mp3', water: 'sfx-water.mp3',
  place: 'sfx-place.mp3', splash: 'sfx-splash.mp3', door: 'sfx-door.mp3', love: 'sfx-love.mp3', chop: 'sfx-chop.mp3', click: 'sfx-click.mp3',
};
const TRACKS = { day: 'music-day.mp3', night: 'music-night.mp3' };
let musicBuf = {}, musicSrc = null, musicKind = null, loading = false;
async function loadAudio() {
  if (loading) return;
  loading = true;
  const get = async f => { try { const r = await fetch('assets/audio/' + f); return r.ok ? await ctx.decodeAudioData(await r.arrayBuffer()) : null; } catch { return null; } };
  await Promise.all(Object.entries(SAMPLE_FILES).map(async ([k, f]) => { const b = await get(f); if (b) SAMPLES[k] = b; }));
  for (const [k, f] of Object.entries(TRACKS)) { const b = await get(f); if (b) musicBuf[k] = b; }
  if (musicBuf.day) { clearInterval(musicTimer); musicKind = null; }
}
function sample(name) {
  const b = SAMPLES[name];
  if (!b) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b;
  src.playbackRate.value = 0.94 + Math.random() * 0.12; // nie zweimal genau gleich
  g.gain.value = name === 'click' ? 0.5 : 0.9;
  src.connect(g).connect(sfxGain);
  src.start();
  return true;
}
// Musik je Tageszeit, mit sanftem Überblenden
export function musicFor(kind) {
  if (!ctx || !audio.music || !musicBuf.day) return;
  const want = musicBuf[kind] ? kind : 'day';
  if (want === musicKind) return;
  musicKind = want;
  const t = ctx.currentTime, old = musicSrc;
  if (old) { old.g.gain.setTargetAtTime(0, t, 1.2); setTimeout(() => old.src.stop(), 5000); }
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = musicBuf[want];
  src.loop = true;
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, t, 1.5);
  src.connect(g).connect(musicGain);
  src.start();
  musicSrc = { src, g };
}

// Plapper-Stimme der Nachbarn: kurze, weiche Silben in eigener Tonlage
export function blip(base) {
  if (!ctx || !audio.sound) return;
  const t = ctx.currentTime + 0.005, f = base * (0.85 + Math.random() * 0.35);
  tone(f, t, 0.07, 'triangle', 0.06, sfxGain, f * (0.9 + Math.random() * 0.25));
}

export function play(name) {
  if (!ctx || !audio.sound) return;
  if (sample(name) || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01);
}

// Umgebung: Vögel am Tag, Grillen in der Nacht, Regen, Schritte
export function ambience({ day, night, rain, walking }) {
  if (!ctx || ctx.state !== 'running' || !audio.sound) return;
  const t = ctx.currentTime;
  rainGain.gain.setTargetAtTime(rain ? 0.35 : 0, t, 0.8);
  if (!rain && day > 0.5 && t > nextBird) {
    nextBird = t + 2 + Math.random() * 6;
    const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(base, t + i * 0.13, 0.09, 'sine', 0.05, ambGain, base * (1.2 + Math.random() * 0.4));
  }
  if (night > 0.6 && t > nextCricket) {
    nextCricket = t + 0.8 + Math.random() * 1.6;
    for (let i = 0; i < 3; i++) tone(4400 + Math.random() * 300, t + i * 0.06, 0.04, 'square', 0.012, ambGain);
  }
  if (walking && t > nextStep) {
    nextStep = t + 0.3;
    noise(t, 0.06, 350 + Math.random() * 150, 0.12, sfxGain, 2);
  }
}

// Gemütliche Zufallsmelodie in Pentatonik
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const CHORDS = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]];
export function setMusic(vol) {
  audio.music = vol;
  setVolumes();
  clearInterval(musicTimer);
  if (!ctx) return;
  if (!vol && musicSrc) { musicSrc.src.stop(); musicSrc = null; musicKind = null; }
  if (!vol || musicBuf.day) return;
  let step = 0;
  musicTimer = setInterval(() => {
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05, chord = CHORDS[Math.floor(step / 8) % 4], hz = n => 261.6 * 2 ** (n / 12);
    if (step % 8 === 0) chord.forEach(n => tone(hz(n - 12), t, 3.2, 'sine', 0.35, musicGain));
    if (Math.random() < 0.6) tone(hz(SCALE[Math.floor(Math.random() * SCALE.length)] + (step % 16 < 8 ? 0 : 5)), t, 0.6, 'triangle', 0.5, musicGain);
    step++;
  }, 420);
}
