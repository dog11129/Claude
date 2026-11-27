// 🌍 Serverwelt: eine gemeinsame Insel, die auf dem eigenen Server liegt (Cloudflare-Worker, cloud/worker.js).
// Wer zuerst kommt, öffnet sie; wer dazukommt, landet automatisch dort – ohne Code, ohne Einladen.
// Geht die/der Erste, übernimmt die/der andere die Insel nahtlos. Gespeichert wird laufend auf dem Server.
// Eingerichtet wird sie mit einem geheimen Link (…#welt=SCHLÜSSEL): der Schlüssel ist der Zugang zum Spielstand.
import { CLOUD, gzip, gunzip, valid } from './cloud.js';

const CFG = 'ki.server', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', KEY = /^[A-Z2-9]{20}$/;
export const ISLE = 'welt';        // Name der Insel im Server-Speicher
export const LOCAL = 'srv:welt';   // Spiegel auf dem Gerät (unter „Meine Inseln“, wird nie zur eigenen Insel)
export const SAVE_EVERY = 15000;   // so oft speichert, wer die Insel gerade offen hat

export const clean = k => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[01IO]/g, '');
export function cfg() {
  try { const c = JSON.parse(localStorage.getItem(CFG)); return KEY.test(c?.key || '') ? c : null; } catch { return null; }
}
function save(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch { /* */ } return c; }
export function setup(key) {
  key = clean(key);
  if (!KEY.test(key)) return null;
  const old = cfg();
  return save(old?.key === key ? old : { key });
}
export function remember(s) { // Name & Insel-ID merken (fürs Menü und um alte Kopien derselben Insel zu erkennen)
  const c = cfg();
  if (c && s && (c.id !== s.id || c.name !== s.name)) save({ ...c, id: s.id, name: s.name });
}
export function forget() { try { localStorage.removeItem(CFG); } catch { /* */ } }
export const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => ALPHA[b % ALPHA.length]).join('');
export const link = key => `${location.origin}${location.pathname}#welt=${key}`;

// Raum-Code aus dem Schlüssel: beide Geräte landen im selben Raum, ohne dass jemand einen Code verschickt
export function codeOf(key) {
  let h = 0x811c9dc5;
  for (const ch of 'raum:' + key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  let out = '';
  for (let i = 0; i < 5; i++) { out += ALPHA[h & 31]; h >>>= 5; }
  return out;
}

// Link …#welt=SCHLÜSSEL (oder ?welt=) einlesen, merken und aus der Adresszeile nehmen
export function readLink() {
  const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search);
  const raw = h.get('welt') || q.get('welt');
  if (!raw) return null;
  const before = cfg()?.key, c = setup(raw);
  h.delete('welt'); q.delete('welt');
  const qs = q.toString(), hs = h.toString();
  try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (hs ? '#' + hs : '')); } catch { /* */ }
  return c ? (before === c.key ? 'same' : 'new') : 'bad';
}

// ---------- Server-Speicher ----------
let lastT = 0;              // jüngste Zeitmarke, die wir vom Server kennen oder selbst geschickt haben
const mine = new Set();     // Zeitmarken unserer eigenen Uploads
export async function pull(c) {
  const r = await fetch(`${CLOUD}/vault/${c.key}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('Server antwortet nicht (' + r.status + ')');
  const it = ((await r.json()).islands || []).find(x => x.id === ISLE);
  if (!it) return null;
  const d = await fetch(`${CLOUD}/vault/${c.key}/${ISLE}`, { cache: 'no-store' });
  if (d.status === 404) return null;
  if (!d.ok) throw new Error('Server antwortet nicht (' + d.status + ')');
  const f = JSON.parse(await gunzip(await d.arrayBuffer()));
  if (!valid(f)) throw new Error('Spielstand auf dem Server ist unlesbar');
  lastT = Math.max(lastT, it.t);
  return { name: f.name || it.name, saved: f.saved || it.t, s: f.s, t: it.t };
}
// Hochladen. Die Zeitmarke ist immer jünger als alles Bekannte (falsch gehende Uhren stören so nicht);
// der Server lehnt ab, wenn dort inzwischen etwas Jüngeres liegt – außer force.
// o.keepalive (Seite wird geschlossen): sofort und ungepackt losschicken, Packen bräuchte zu lange.
export function push(c, f, o = {}) {
  if (!c || !valid(f)) return Promise.resolve('bad');
  const t = lastT = Math.max(Date.now(), lastT + 1);
  mine.add(t);
  const json = JSON.stringify({ name: f.name, saved: f.saved, s: f.s });
  const url = `${CLOUD}/vault/${c.key}/${ISLE}?t=${t}&name=${encodeURIComponent(f.name || '')}${o.force ? '&force=1' : ''}`;
  const send = (body, keepalive) => fetch(url, { method: 'PUT', body, keepalive }).then(async r => {
    if (r.ok) return 'ok';
    if (r.status !== 409) return 'fail';
    const j = await r.json().catch(() => ({}));
    if (j.error !== 'newer') return 'full';
    if (j.t) lastT = Math.max(lastT, j.t);
    return mine.has(j.t) ? 'old' : 'conflict'; // 'old': ein eigener, späterer Upload war schneller – alles gut
  }).catch(() => 'fail');
  if (o.keepalive && new TextEncoder().encode(json).length < 60000) return send(json, true);
  return gzip(json).then(b => send(b, false), () => 'fail');
}

// Welcher Stand ist weiter? (Spielzeit läuft nur vorwärts)
export const ahead = (a, b) => !b || (a && (a.s.time || 0) > (b.s.time || 0));

// ---------- Taschen ----------
// Dieselbe Person behält ihre Tasche – auch auf einem anderen Gerät (Handy & PC): Name → erste Geräte-ID.
const nm = n => String(n || '').trim().toLowerCase().slice(0, 16);
const UID = /^[a-z0-9]{8,16}$/;
export function whoKey(s, name, uid) { // Gastgeber: merkt sich neue Namen
  const n = nm(name);
  if (!n) return uid;
  if (!s.srvWho || typeof s.srvWho !== 'object') s.srvWho = {};
  if (!UID.test(s.srvWho[n] || '')) s.srvWho[n] = uid;
  return s.srvWho[n];
}
export const guestUid = (s, name, uid) => { const u = s?.srvWho?.[nm(name)]; return UID.test(u || '') ? u : uid; };
// Wer die Insel öffnet, bekommt "host" (eigene Tasche); die Tasche der/des Vorigen wandert zu ihrer/seiner ID.
export function claim(s, uid) {
  s.pinv ||= {};
  if (s.owner === uid) return;
  const add = (k, bag) => {
    const t = (s.pinv[k] ||= {});
    for (const [id, n] of Object.entries(bag || {})) if (Number.isFinite(n) && n > 0) t[id] = (t[id] || 0) + n;
  };
  const old = s.pinv.host || {};
  if (Object.keys(old).length) add(s.owner && UID.test(s.owner) ? 'u_' + s.owner : 'n_Gastgeber', old);
  s.pinv.host = s.pinv['u_' + uid] || {};
  delete s.pinv['u_' + uid];
  s.owner = uid;
}
