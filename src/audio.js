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
  musicGain.gain.value = audio.music * (musicBuf.day ? 0.35 : 0.5);
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
  // Update 6: Feste, Turniere, Pfützen
  egg: t => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.18, 'sine', 0.12)),
  fanfare: t => { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + [0, 0.11, 0.22, 0.33, 0.5, 0.66, 0.78, 0.95][i], i === 7 ? 0.6 : 0.14, 'square', 0.06)); [262, 330, 392].forEach(f => tone(f, t + 0.95, 0.7, 'triangle', 0.08)); },
  whistle: t => { tone(2100, t, 0.18, 'sine', 0.12, sfxGain, 2300); tone(2100, t + 0.22, 0.4, 'sine', 0.12, sfxGain, 2500); },
  launch: t => { noise(t, 0.6, 1800, 0.06, sfxGain, 6); tone(500, t, 0.7, 'sine', 0.03, sfxGain, 1600); },
  boom: t => { noise(t, 0.5, 220, 0.5, sfxGain, 0.8); noise(t, 0.12, 1400, 0.25); for (let i = 0; i < 8; i++) noise(t + 0.25 + Math.random() * 0.5, 0.03, 3500 + Math.random() * 2000, 0.07, sfxGain, 4); },
  puddle: t => { noise(t, 0.12, 1600, 0.3, sfxGain, 3); tone(520, t, 0.08, 'sine', 0.08, sfxGain, 900); },
  plopp: t => tone(380, t, 0.09, 'sine', 0.18, sfxGain, 760),
  party: t => [784, 880, 784, 1047, 988].forEach((f, i) => tone(f, t + i * 0.13, 0.2, 'triangle', 0.12)),
  thunder: t => { noise(t, 2.2, 90, 0.9, sfxGain, 0.5); noise(t + 0.04, 0.5, 500, 0.35, sfxGain, 0.7); noise(t + 0.4, 1.6, 140, 0.5, sfxGain, 0.6); },
  burner: t => { noise(t, 0.9, 700, 0.35, sfxGain, 0.9); noise(t + 0.05, 0.7, 2400, 0.08, sfxGain, 2); }, // Ballon-Brenner
  crackle: t => { for (let i = 0; i < 7; i++) noise(t + Math.random() * 0.6, 0.02, 2500 + Math.random() * 2500, 0.12, sfxGain, 5); noise(t, 0.6, 400, 0.05, sfxGain, 0.7); }, // Grill & Lagerfeuer
  bubble: t => { for (let i = 0; i < 4; i++) tone(500 + i * 180 + Math.random() * 80, t + i * 0.07, 0.07, 'sine', 0.08, sfxGain, 1100 + i * 200); },
  lock: t => { noise(t, 0.04, 2600, 0.5, sfxGain, 4); tone(220, t + 0.05, 0.12, 'square', 0.05, sfxGain, 160); },
  unlock: t => { noise(t, 0.04, 2600, 0.5, sfxGain, 4); tone(330, t + 0.06, 0.1, 'triangle', 0.12); tone(660, t + 0.16, 0.3, 'triangle', 0.12); },
  card: t => { noise(t, 0.05, 3800, 0.25, sfxGain, 3); tone(1400, t, 0.04, 'sine', 0.05); },
  gondola: t => { tone(1568, t, 0.5, 'sine', 0.09); tone(1175, t + 0.25, 0.7, 'sine', 0.09); noise(t + 0.4, 1.2, 600, 0.05, sfxGain, 0.6); },
  found: t => { [659, 784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.25, 'triangle', 0.14)); noise(t + 0.3, 0.3, 3000, 0.08, sfxGain, 2); },
};

// Echte Aufnahmen (Musik & Effekte aus assets/audio, aufgelistet in list.json). Fehlt eine Datei, spielt die erzeugte Version.
const SAMPLES = {}, SAMPLE_FILES = {
  harvest: 'sfx-harvest.mp3', coin: 'sfx-coin.mp3', level: 'sfx-level.mp3', ach: 'sfx-quest.mp3', till: 'sfx-dig.mp3', water: 'sfx-water.mp3',
  place: 'sfx-place.mp3', splash: 'sfx-splash.mp3', door: 'sfx-door.mp3', love: 'sfx-love.mp3', chop: 'sfx-chop.mp3', click: 'sfx-click.mp3',
};
const TRACKS = { day: 'music-day.mp3', night: 'music-night.mp3' };
let musicBuf = {}, musicSrc = null, musicKind = null, loading = false;
async function loadAudio() {
  if (loading) return;
  loading = true;
  // assets/audio/list.json nennt die vorhandenen Dateien – so gibt es keine 404-Anfragen für fehlende
  const list = await fetch('assets/audio/list.json').then(r => r.ok ? r.json() : [], () => []);
  const get = async f => { if (!list.includes(f)) return null; try { const r = await fetch('assets/audio/' + f); return r.ok ? await ctx.decodeAudioData(await r.arrayBuffer()) : null; } catch { return null; } };
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

// Plapper-Stimme der Nachbarn: eine kurze Silbe je Vokal, eigene Tonlage, Klangfarbe und Tempo je Figur.
// Fragen gehen am Satzende hoch, Punkte runter – so klingt das Gebrabbel wie echte Sätze.
const VOW = { a: [0, 1.0], e: [3, 1.5], i: [5, 2.1], o: [-2, 0.7], u: [-4, 0.5], ä: [2, 1.3], ö: [0, 0.9], ü: [3, 1.0], y: [4, 1.6] };
export function speak(ch, v = {}, end = '') {
  if (!ctx || !audio.sound) return;
  const [semi, bright] = VOW[ch] || VOW.a, t = ctx.currentTime + 0.005, dur = v.len || 0.075;
  let f = (v.pitch || 500) * 2 ** ((semi * (v.range ?? 1) + (Math.random() - 0.5) * (v.wob ?? 2)) / 12);
  if (end === '?') f *= 1.18; else if (end === '!') f *= 1.1; else if (end === '.') f *= 0.9;
  const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = v.wave || 'triangle';
  o.frequency.setValueAtTime(f * 1.05, t);
  o.frequency.exponentialRampToValueAtTime(f * (end === '?' ? 1.16 : 0.92), t + dur);
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(9000, f * 3 * bright * (v.bright || 1));
  lp.Q.value = 4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16 * (v.vol || 1), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.03);
}
export function blip(base) { speak('a', { pitch: base }); }

export function play(name) {
  if (!ctx || !audio.sound) return;
  if (sample(name) || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01);
}

// Umgebung: Vögel am Tag, Grillen in der Nacht, Regen, Schritte
let nextFire = 0, nextZone = 0;
export function ambience({ day, night, rain, walking, area, storm, fog, underwater, fire }) {
  if (!ctx || ctx.state !== 'running' || !audio.sound) return;
  const t = ctx.currentTime;
  // Unter Wasser: dumpfes Rauschen und ab und zu Blubbern – keine Vögel, kein Regen
  if (underwater) {
    rainGain.gain.setTargetAtTime(0, t, 0.5);
    if (t > nextZone) { nextZone = t + 0.9 + Math.random() * 2; noise(t, 1.4, 260, 0.08, ambGain, 0.5); if (Math.random() < 0.5) for (let i = 0; i < 3; i++) tone(380 + Math.random() * 300, t + 0.3 + i * 0.09, 0.08, 'sine', 0.03, ambGain, 900); }
    return;
  }
  // Knistern in der Nähe von Grill und Lagerfeuer
  if (fire && t > nextFire) { nextFire = t + 0.25 + Math.random() * 0.6; noise(t, 0.02, 2600 + Math.random() * 2400, 0.05 * fire, ambGain, 5); }
  rainGain.gain.setTargetAtTime(rain ? (storm ? 0.5 : 0.35) : 0, t, 0.8);
  // Geräusche je Gebiet: Vögel und Specht im Wald, Bienen auf der Wiese, Tropfen in der Höhle
  if (area && t > nextZone) {
    if (area === 'hoehle') {
      nextZone = t + 0.7 + Math.random() * 2.2;
      const f = 900 + Math.random() * 900;
      tone(f, t, 0.18, 'sine', 0.07, ambGain, f * 0.55);
      tone(f * 0.98, t + 0.32, 0.22, 'sine', 0.025, ambGain, f * 0.5); // Echo
    } else if (area === 'wiese' && day > 0.3 && !rain) {
      nextZone = t + 1.2 + Math.random() * 2.5;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), dur = 1.2 + Math.random() * 1.4, f = 210 + Math.random() * 60;
      o.type = 'sawtooth'; o.frequency.value = f; lfo.frequency.value = 9 + Math.random() * 6; lg.gain.value = 14;
      lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900;
      o.connect(flt).connect(g).connect(ambGain);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    } else if (area === 'wald' && day > 0.3) {
      nextZone = t + 3 + Math.random() * 6;
      if (Math.random() < 0.35) for (let i = 0; i < 6 + Math.floor(Math.random() * 6); i++) noise(t + i * 0.07, 0.03, 1100, 0.18, ambGain, 6); // Specht
      else { const b = 1500 + Math.random() * 500; tone(b, t, 0.35, 'sine', 0.05, ambGain, b * 0.8); tone(b * 0.8, t + 0.4, 0.45, 'sine', 0.05, ambGain, b * 0.66); } // Kuckuck-artig
    }
  }
  if (!rain && !fog && area !== 'hoehle' && day > 0.5 && t > nextBird) {
    nextBird = t + (area === 'wald' ? 1 : 2) + Math.random() * 6;
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

// ---------- Klavier: einzelne Töne (MIDI-Nummer) ----------
export function pianoNote(midi, vel = 0.5, dur = 0.6) {
  if (!ctx || ctx.state !== 'running' || !audio.sound) return;
  INST.keys(440 * 2 ** ((midi - 69) / 12), ctx.currentTime + 0.01, dur, 0.16 * vel + 0.04, sfxGain);
}
// Instrumente der Inselband (Gitarre, Trommel, Flöte, Glockenspiel)
export function instNote(kind, midi, dur = 0.4, vel = 0.5) {
  if (!ctx || ctx.state !== 'running' || !audio.sound) return;
  const t = ctx.currentTime + 0.01, f = 440 * 2 ** ((midi - 69) / 12), v = 0.14 * vel + 0.03;
  if (kind === 'trommel') { INST.thump(f, t, dur, v * 1.6, sfxGain); INST.brush(f, t, dur, v * 0.6, sfxGain); return; }
  INST[{ gitarre: 'pluck', floete: 'flute', glocken: 'bell' }[kind] || 'keys'](f, t, dur, v, sfxGain);
}

// ---------- Eigene Musik: jede Stunde ein eigenes, im Browser komponiertes Stück ----------
// Tonart, Tempo, Instrumente und Melodie werden aus der Stunde abgeleitet (immer gleich für dieselbe Stunde).
let verb, musicBus, song = null, wantHour = -1, wantRain = false, wantPlace = null, sched = 0, step = 0;
function hall() {
  if (verb) return verb;
  const len = Math.floor(ctx.sampleRate * 2.2), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.4; }
  verb = ctx.createConvolver();
  verb.buffer = b;
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  verb.connect(wet).connect(master);
  return verb;
}
function bus() {
  if (musicBus) return musicBus;
  musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  const send = ctx.createGain();
  send.gain.value = 0.55;
  musicBus.connect(musicGain);
  musicBus.connect(send).connect(hall());
  return musicBus;
}
const mhz = m => 440 * 2 ** ((m - 69) / 12);
function env(g, t, a, peak, d, sus, rel, end) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0002), t + a + d);
  g.gain.setValueAtTime(Math.max(peak * sus, 0.0002), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
}
function osc(type, f, t, stop, out, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.connect(out);
  o.start(t);
  o.stop(stop);
  return o;
}
// Kleine Instrumente aus Oszillatoren
const INST = {
  keys(f, t, d, v, out) { // weiches E-Piano
    const g = ctx.createGain(); g.connect(out);
    env(g, t, 0.006, v, 0.35, 0.28, 0.5, t + d);
    osc('sine', f, t, t + d + 0.6, g);
    const g2 = ctx.createGain(); g2.gain.value = 0.22; g2.connect(g);
    osc('sine', f * 2, t, t + d + 0.6, g2, 3);
    const g3 = ctx.createGain(); g3.connect(out); env(g3, t, 0.002, v * 0.18, 0.06, 0.01, 0.05, t + 0.07);
    osc('triangle', f * 4, t, t + 0.2, g3);
  },
  mallet(f, t, d, v, out) { // Holzklangstäbe
    const g = ctx.createGain(); g.connect(out);
    env(g, t, 0.003, v, 0.42, 0.01, 0.1, t + 0.45);
    osc('sine', f, t, t + 0.6, g);
    const g2 = ctx.createGain(); g2.connect(out); env(g2, t, 0.002, v * 0.3, 0.05, 0.01, 0.03, t + 0.06);
    osc('sine', f * 3.98, t, t + 0.15, g2);
  },
  bell(f, t, d, v, out) { // Glöckchen
    const g = ctx.createGain(); g.connect(out);
    env(g, t, 0.004, v, 1.4, 0.02, 0.4, t + 1.5);
    osc('sine', f, t, t + 2, g);
    const g2 = ctx.createGain(); g2.gain.value = 0.35; g2.connect(g);
    osc('sine', f * 2.76, t, t + 2, g2);
    const g3 = ctx.createGain(); g3.gain.value = 0.12; g3.connect(g);
    osc('sine', f * 5.4, t, t + 2, g3);
  },
  pluck(f, t, d, v, out) { // gezupfte Saite
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(Math.min(f * 8, 5000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + 0.25);
    lp.connect(g).connect(out);
    env(g, t, 0.003, v, 0.3, 0.05, 0.15, t + Math.min(d, 0.4));
    osc('sawtooth', f, t, t + 0.7, lp);
  },
  flute(f, t, d, v, out) { // Flöte mit Vibrato
    const g = ctx.createGain(); g.connect(out);
    env(g, t, 0.07, v, 0.1, 0.8, 0.18, t + d);
    const o = osc('sine', f, t, t + d + 0.3, g);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.25);
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + d + 0.3);
    const g2 = ctx.createGain(); g2.gain.value = 0.08; g2.connect(g);
    osc('triangle', f * 2, t, t + d + 0.3, g2);
  },
  pad(f, t, d, v, out) { // weiche Fläche
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1300;
    lp.connect(g).connect(out);
    env(g, t, Math.min(0.8, d * 0.4), v, 0.2, 0.85, 1.2, t + d);
    osc('triangle', f, t, t + d + 1.4, lp, -7);
    osc('triangle', f, t, t + d + 1.4, lp, 7);
  },
  bass(f, t, d, v, out) {
    const g = ctx.createGain(); g.connect(out);
    env(g, t, 0.01, v, 0.3, 0.45, 0.12, t + d * 0.9);
    osc('triangle', f, t, t + d + 0.3, g);
    const g2 = ctx.createGain(); g2.gain.value = 0.5; g2.connect(g);
    osc('sine', f / 2, t, t + d + 0.3, g2);
  },
  brush(f, t, d, v, out) { noise(t, 0.07, 7000, v, out, 0.7); },
  shaker(f, t, d, v, out) { noise(t, 0.035, 9000, v, out, 1.2); },
  thump(f, t, d, v, out) { tone(110, t, 0.16, 'sine', v, out, 48); },
};
// Stimmungen je Tageszeit
const MOODS = [
  { from: 0, tempo: [62, 70], modes: ['dorian', 'major'], lead: ['bell', 'keys'], comp: 'pad', drums: 0, dens: 0.32 },
  { from: 5, tempo: [84, 94], modes: ['major', 'lydian'], lead: ['flute', 'keys'], comp: 'arp', drums: 1, dens: 0.42 },
  { from: 9, tempo: [100, 112], modes: ['major', 'mixo'], lead: ['mallet', 'pluck'], comp: 'block', drums: 2, dens: 0.55 },
  { from: 13, tempo: [94, 106], modes: ['major', 'lydian', 'mixo'], lead: ['keys', 'mallet', 'flute'], comp: 'arp', drums: 2, dens: 0.5 },
  { from: 17, tempo: [82, 92], modes: ['mixo', 'major', 'dorian'], lead: ['keys', 'flute'], comp: 'block', drums: 1, dens: 0.42 },
  { from: 20, tempo: [68, 78], modes: ['dorian', 'major'], lead: ['bell', 'keys'], comp: 'pad', drums: 0, dens: 0.34 },
];
// Eigene Stimmung je Ort (überschreibt die Tageszeit; Tonart & Melodie bleiben pro Stunde und Ort gleich)
const PLACE_MOODS = {
  deepsea: { tempo: [86, 94], modes: ['dorian', 'mixo'], lead: ['flute', 'pluck'], comp: 'arp', drums: 1, dens: 0.45 },
  volcano: { tempo: [96, 104], modes: ['dorian'], lead: ['pluck', 'mallet'], comp: 'block', drums: 2, dens: 0.5 },
  grotto: { tempo: [60, 68], modes: ['lydian', 'dorian'], lead: ['bell'], comp: 'pad', drums: 0, dens: 0.3 },
  depths: { tempo: [58, 64], modes: ['dorian'], lead: ['bell', 'keys'], comp: 'pad', drums: 0, dens: 0.28 },
  reef: { tempo: [64, 72], modes: ['lydian'], lead: ['bell', 'flute'], comp: 'pad', drums: 0, dens: 0.32 },
  wreck: { tempo: [62, 70], modes: ['dorian'], lead: ['keys', 'bell'], comp: 'pad', drums: 0, dens: 0.3 },
  tropic: { tempo: [100, 112], modes: ['lydian', 'major'], lead: ['mallet', 'pluck'], comp: 'arp', drums: 2, dens: 0.55 },
  street: { tempo: [92, 102], modes: ['mixo', 'major'], lead: ['keys', 'pluck'], comp: 'block', drums: 1, dens: 0.48 },
  fair: { tempo: [116, 126], modes: ['major'], lead: ['mallet', 'keys'], comp: 'block', drums: 2, dens: 0.6 },
  attic: { tempo: [74, 82], modes: ['major', 'lydian'], lead: ['keys', 'flute'], comp: 'arp', drums: 0, dens: 0.38 },
  cellar: { tempo: [66, 72], modes: ['dorian'], lead: ['pluck', 'bell'], comp: 'pad', drums: 1, dens: 0.34 },
  tree: { tempo: [88, 96], modes: ['lydian', 'major'], lead: ['flute', 'mallet'], comp: 'arp', drums: 1, dens: 0.45 },
  moor: { tempo: [72, 80], modes: ['lydian', 'dorian'], lead: ['flute', 'bell'], comp: 'arp', drums: 0, dens: 0.36 },
  bambus: { tempo: [62, 70], modes: ['dorian', 'major'], lead: ['pluck', 'flute'], comp: 'pad', drums: 0, dens: 0.3 },
};
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
const PROGS = [[0, 5, 3, 4], [0, 3, 4, 0], [0, 4, 5, 3], [5, 3, 0, 4], [0, 2, 3, 4], [3, 4, 2, 5], [0, 3, 1, 4], [0, 5, 1, 4], [3, 0, 3, 4]];
function srng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function composeHour(hour, rain = false, place = null) {
  const ph = place ? [...place].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 9973 : 0;
  const r = srng(hour * 7919 + (rain ? 101 : 0) + 4242 + ph * 13), pick = a => a[Math.floor(r() * a.length)];
  const mood = PLACE_MOODS[place] || [...MOODS].reverse().find(m => hour >= m.from);
  const scale = MODES[pick(mood.modes)], root = 55 + Math.floor(r() * 9);
  const tempo = (mood.tempo[0] + r() * (mood.tempo[1] - mood.tempo[0])) * (rain ? 0.9 : 1);
  const lead = pick(mood.lead), progA = pick(PROGS), progB = pick(PROGS);
  const deg = d => root + 12 * Math.floor(d / 7) + scale[((d % 7) + 7) % 7];
  const chordOf = c => [c, c + 2, c + 4];
  const near = (d, c) => { let best = d, bd = 99; for (const t of chordOf(c)) for (let o = -14; o <= 14; o += 7) { const x = t + o; if (Math.abs(x - d) < bd) { bd = Math.abs(x - d); best = x; } } return best; };
  // Motiv: Rhythmus (8 Achtel) + Tonschritte
  const motif = () => {
    const on = [], pitches = [];
    let d = 7 + Math.floor(r() * 4);
    for (let i = 0; i < 8; i++) if (i === 0 || r() < mood.dens + (i % 2 ? -0.12 : 0.12)) on.push(i);
    for (let k = 0; k < on.length; k++) { d += Math.round((r() - 0.5) * 4); d = Math.max(5, Math.min(14, d)); pitches.push(d); }
    return { on, pitches };
  };
  const mA = motif(), mB = motif(), mC = motif();
  const bars = [];
  const phrase = (prog, motifs, vary) => prog.forEach((c, bi) => {
    const ev = [], m = motifs[bi % motifs.length], last = bi === 3;
    m.on.forEach((s, k) => {
      if (last && s > 4) return;
      let d = m.pitches[k] + (vary && r() < 0.25 ? (r() < 0.5 ? 1 : -1) : 0);
      if (s % 4 === 0) d = near(d, c);
      const next = m.on[k + 1] ?? 8;
      ev.push({ s, len: last && s >= 4 ? 4 : next - s, m: deg(d), i: lead, v: 0.11 + (s % 4 === 0 ? 0.03 : 0) });
    });
    if (last) ev.push({ s: 4, len: 4, m: deg(near(7, c)), i: lead, v: 0.12 });
    const ch = chordOf(c).map(x => deg(x));
    if (mood.comp === 'pad' || rain) ch.forEach(n => ev.push({ s: 0, len: 8, m: n, i: 'pad', v: 0.045 }));
    if (mood.comp === 'arp') [0, 1, 2, 1, 0, 1, 2, 1].forEach((x, s) => ev.push({ s, len: 1, m: ch[x] + (s >= 4 && x === 0 ? 12 : 0), i: 'mallet', v: 0.05 }));
    if (mood.comp === 'block') [0, 3, 4, 6].forEach(s => ch.forEach(n => ev.push({ s, len: 1, m: n, i: 'keys', v: 0.04 })));
    ev.push({ s: 0, len: 3, m: deg(c) - 12, i: 'bass', v: 0.14 }, { s: 4, len: 3, m: deg(c + (r() < 0.5 ? 4 : 0)) - 12, i: 'bass', v: 0.11 });
    if (mood.drums && !rain) {
      [2, 6].forEach(s => ev.push({ s, i: 'brush', v: 0.05 }));
      if (mood.drums > 1) { [0, 4].forEach(s => ev.push({ s, i: 'thump', v: 0.12 })); [1, 3, 5, 7].forEach(s => ev.push({ s, i: 'shaker', v: 0.025 })); }
    }
    bars.push(ev);
  });
  phrase(progA, [mA, mB], false);
  phrase(progA, [mA, mB], true);
  phrase(progB, [mC, mA], false);
  phrase(progA, [mA, mB], true);
  return { hour, rain, place, slot: 30 / tempo, bars, root, lead };
}
// Glöckchen zur vollen Stunde
function chime(root) {
  const t = ctx.currentTime + 0.05, out = bus();
  [0, 4, 7, 12].forEach((n, i) => INST.bell(mhz(root + 12 + n), t + i * 0.22, 0.5, 0.1, out));
}
function pump() {
  if (!ctx || ctx.state !== 'running' || !audio.music || musicBuf.day || wantHour < 0) return;
  const out = bus();
  if (!song) { song = composeHour(wantHour, wantRain, wantPlace); step = 0; sched = ctx.currentTime + 0.1; }
  if (sched < ctx.currentTime - 0.5) sched = ctx.currentTime + 0.05; // nach Pause nicht alles nachholen
  while (sched < ctx.currentTime + 0.3) {
    const bar = step >> 3, s = step & 7;
    if (s === 0 && (song.hour !== wantHour || song.rain !== wantRain || song.place !== wantPlace)) {
      const changedHour = song.hour !== wantHour && song.place === wantPlace;
      song = composeHour(wantHour, wantRain, wantPlace);
      step = 0;
      if (changedHour) { chime(song.root); sched += 1.4; }
      continue;
    }
    for (const e of song.bars[bar % song.bars.length]) if (e.s === s) INST[e.i](mhz(e.m || 60), sched, (e.len || 1) * song.slot, e.v, out);
    sched += song.slot;
    step = (step + 1) % (song.bars.length * 8);
  }
}
// Wird jedes Bild aufgerufen: welche Stunde gerade läuft
export function musicTick(hour, rain, place = null) {
  wantHour = Math.floor(hour) % 24;
  wantRain = !!rain;
  wantPlace = PLACE_MOODS[place] ? place : null;
  if (musicBuf.day) { musicFor(hour >= 20 || hour < 5 ? 'night' : 'day'); return; }
}
export function setMusic(vol) {
  audio.music = vol;
  setVolumes();
  clearInterval(musicTimer);
  if (!ctx) return;
  if (!vol && musicSrc) { musicSrc.src.stop(); musicSrc = null; musicKind = null; }
  if (!vol || musicBuf.day) return;
  song = null;
  musicTimer = setInterval(pump, 60);
}
// Für Tests: läuft die Musik?
export const musicState = () => ({ ctx: ctx?.state || null, hour: song?.hour ?? null, lead: song?.lead || null, place: song?.place || null });
