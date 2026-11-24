// Kuschelinsel-Cloud: eigener Verbindungsserver (WebSocket-Raum) und Cloud-Spielstand – beides läuft als
// Cloudflare Worker (Quelltext: cloud/worker.js). Fällt die Cloud aus, spielt man wie bisher lokal / über PeerJS weiter.
const q = new URLSearchParams(location.search);
export const CLOUD = (q.get('cloud') || 'https://kuschelinsel.shawnschwanitz.workers.dev').replace(/\/$/, '');
export const RELAY_ON = q.get('relay') !== '0';
const WS = CLOUD.replace(/^http/, 'ws');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rid = (n, a = 'abcdefghijkmnpqrstuvwxyz23456789') => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => a[b % a.length]).join('');

// ---------- Verbindungsserver ----------
function open(url, ms = 8000) {
  return new Promise((ok, fail) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return fail({ type: 'network' }); }
    const t = setTimeout(() => { try { ws.close(); } catch { /* */ } fail({ type: 'timeout' }); }, ms);
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      clearTimeout(t);
      ws.onmessage = null;
      if (m.sys === 'ok') ok(ws);
      else { try { ws.close(); } catch { /* */ } fail({ type: m.sys === 'taken' ? 'unavailable-id' : m.sys === 'nohost' ? 'peer-unavailable' : 'server-error' }); }
    };
    ws.onerror = () => { clearTimeout(t); fail({ type: 'network' }); };
  });
}
const keepAlive = ws => { const i = setInterval(() => { if (ws.readyState === 1) ws.send('p'); }, 20000); return () => clearInterval(i); };

// Gastgeber: hält den Raum offen; verbindet sich bei kurzen Aussetzern von selbst neu
export async function relayHost(code, h) {
  const sec = sessionStorage.getItem('ki.hostsec.' + code) || rid(16);
  sessionStorage.setItem('ki.hostsec.' + code, sec);
  const url = `${WS}/room/${code}?role=host&s=${sec}`;
  let ws = await open(url), closed = false, stop = null;
  const guests = new Set();
  let stale = new Set();
  const wire = () => {
    stop = keepAlive(ws);
    ws.onmessage = e => {
      if (e.data === 'q') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.sys === 'join' && stale.has(m.id)) out({ drop: m.id, to: '-', d: null }); // war vor dem Aussetzer da: sauber neu verbinden lassen
      else if (m.sys === 'join') guests.add(m.id);
      else if (m.sys === 'leave') { if (guests.delete(m.id)) h.onLeave(m.id); }
      else if (m.f && !stale.has(m.f)) { guests.add(m.f); h.onData(m.f, m.d); }
    };
    ws.onclose = () => {
      stop?.();
      if (closed) return;
      for (const id of guests) h.onLeave(id); // Gäste wurden vom Server getrennt und melden sich neu an
      stale = new Set(guests);
      guests.clear();
      const retry = async (n = 0) => {
        if (closed) return;
        try { ws = await open(url); wire(); } catch { setTimeout(() => retry(n + 1), Math.min(15000, 1500 * (n + 1))); }
      };
      setTimeout(retry, 1200);
    };
  };
  wire();
  const out = m => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
  return {
    code, relay: true,
    send(id, msg) { out({ to: id, d: msg }); },
    broadcast(msg, except) { out({ ex: except || undefined, d: msg }); },
    drop(id) { guests.delete(id); setTimeout(() => out({ drop: id, d: null, to: '-' }), 1000); },
    close() { closed = true; stop?.(); try { ws.close(); } catch { /* */ } },
    get online() { return ws.readyState === 1; },
  };
}

export async function relayJoin(code, h) {
  const ws = await open(`${WS}/room/${code}?role=guest&id=g${rid(11)}`, 10000);
  const stop = keepAlive(ws);
  let live = true;
  ws.onmessage = e => {
    if (e.data === 'q') return;
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m?.sys) { if (m.sys === 'hostgone') { live = false; ws.close(); h.onClose(); } return; }
    h.onData(m);
  };
  ws.onclose = () => { stop(); if (live) { live = false; h.onClose(); } };
  return { relay: true, send: m => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }, close: () => { live = false; stop(); ws.close(); } };
}

// ---------- Cloud-Spielstand ----------
const CFG = 'ki.cloud';
const cfg = () => { try { return JSON.parse(localStorage.getItem(CFG)) || {}; } catch { return {}; } };
const setCfg = c => { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch { /* */ } };
export const cloudKey = () => cfg().key || null;
export const fmtKey = k => (k || '').match(/.{1,4}/g)?.join('-') || '';
export const cleanKey = k => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[01IO]/g, '');
export function enable(key) {
  key = key ? cleanKey(key) : rid(20, ALPHA);
  if (!/^[A-Z2-9]{20}$/.test(key)) return null;
  setCfg({ ...cfg(), key, pushed: {} });
  return key;
}
export function disable() { setCfg({}); }
const ISLE = k => /^[A-Za-z0-9_-]{1,40}$/.test(k);

async function gzip(text) {
  if (!globalThis.CompressionStream) return new TextEncoder().encode(text);
  return new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
}
async function gunzip(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 0x1f || b[1] !== 0x8b) return new TextDecoder().decode(b);
  return await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
const valid = f => f && typeof f.s === 'object' && Number.isFinite(f.s.money) && Number.isFinite(f.s.day) && f.s.tiles && typeof f.s.tiles === 'object';

// Eine Insel hochladen (nur wenn sie sich seit dem letzten Mal geändert hat)
const busy = new Set();
export async function push(id, f, force = false) {
  const key = cloudKey();
  if (!key || !ISLE(id) || !valid(f) || busy.has(id)) return false;
  const c = cfg();
  if (!force && c.pushed?.[id] >= f.saved) return true;
  busy.add(id);
  try {
    const body = await gzip(JSON.stringify({ name: f.name, saved: f.saved, guest: f.guest || null, s: f.s }));
    const r = await fetch(`${CLOUD}/vault/${key}/${id}?t=${f.saved}&name=${encodeURIComponent(f.name || '')}`, { method: 'PUT', body, keepalive: body.length < 60000 });
    if (r.ok || r.status === 409) { const n = cfg(); if (n.key === key) { n.pushed = { ...n.pushed, [id]: r.ok ? f.saved : (await r.json().catch(() => ({}))).t || f.saved }; setCfg(n); } }
    return r.ok;
  } catch { return false; } finally { busy.delete(id); }
}

// Abgleich: Neueres aus der Cloud holen, Neueres von hier hochladen. Nichts wird ohne Sicherung ersetzt –
// der alte Stand landet vorher in den automatischen Zwischenständen (backup.snapshot), die Cloud hebt ihre Vorversion auf.
export async function sync(farms, keep) {
  const key = cloudKey();
  if (!key) return { off: true };
  const r = await fetch(`${CLOUD}/vault/${key}`);
  if (!r.ok) throw new Error('Cloud antwortet nicht (' + r.status + ')');
  const list = (await r.json()).islands || [];
  let got = 0, sent = 0;
  for (const it of list) {
    const local = farms[it.id];
    if (local && local.saved >= it.t) continue;
    const d = await fetch(`${CLOUD}/vault/${key}/${it.id}`);
    if (!d.ok) continue;
    const f = JSON.parse(await gunzip(await d.arrayBuffer()));
    if (!valid(f)) continue;
    if (local) await keep(it.id, local);
    farms[it.id] = { name: f.name || it.name, saved: f.saved || it.t, s: f.s, guest: f.guest || undefined };
    const c = cfg(); c.pushed = { ...c.pushed, [it.id]: farms[it.id].saved }; setCfg(c);
    got++;
  }
  const inCloud = new Map(list.map(x => [x.id, x.t]));
  for (const [id, f] of Object.entries(farms)) if (valid(f) && !(inCloud.get(id) >= f.saved) && await push(id, f, true)) sent++;
  return { got, sent, n: list.length };
}
export async function ping() {
  try { const r = await fetch(`${CLOUD}/ping`, { signal: AbortSignal.timeout?.(5000) }); return r.ok; } catch { return false; }
}
