// Multiplayer über WebRTC (PeerJS). Der Host ist gleichzeitig der "Server", Freunde verbinden sich mit seinem Code.
/* global Peer */
const PREFIX = 'kuschelhof-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
export const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

function opts() {
  const p = new URLSearchParams(location.search).get('peer'); // nur für lokale Tests: ?peer=localhost:9000
  if (!p) return { debug: 1 };
  const [host, port] = p.split(':');
  return { host, port: +port, path: '/', secure: false, debug: 1, config: { iceServers: [] } };
}

export function host(code, h) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(PREFIX + code, opts());
    const conns = new Map();
    let opened = false;
    const api = {
      code,
      send(id, msg) { const c = conns.get(id); if (c?.open) c.send(msg); },
      broadcast(msg, except) { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); },
      drop(id) { const c = conns.get(id); conns.delete(id); if (c) setTimeout(() => c.close(), 1000); },
      close() { peer.destroy(); },
      get online() { return !peer.disconnected; },
    };
    peer.on('open', () => { opened = true; resolve(api); });
    peer.on('error', e => {
      if (!opened) { peer.destroy(); reject(e); } else console.warn('peer', e.type);
    });
    // Verbindung zum Vermittlungs-Server verloren (z.B. Handy kurz offline): neu anmelden, damit Freunde weiter beitreten können
    peer.on('disconnected', () => setTimeout(() => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 2000));
    peer.on('connection', c => {
      c.on('open', () => conns.set(c.peer, c));
      c.on('data', d => { if (conns.get(c.peer) === c) h.onData(c.peer, d); });
      c.on('close', () => { if (conns.get(c.peer) === c) { conns.delete(c.peer); h.onLeave(c.peer); } });
    });
  });
}

export function join(code, h) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(opts());
    let done = false, live = false;
    const fail = e => { if (!done) { done = true; clearTimeout(timer); peer.destroy(); reject(e); } };
    const timer = setTimeout(() => fail({ type: 'timeout' }), 15000);
    // Nach dem Verbinden zählt nur die direkte Verbindung; Fehler des Vermittlungs-Servers sind dann egal.
    peer.on('error', e => { if (!done) fail(e); });
    peer.on('disconnected', () => setTimeout(() => { if (live && !peer.destroyed && peer.disconnected) peer.reconnect(); }, 2000));
    peer.on('open', () => {
      if (done) return; // 'open' kommt nach reconnect() erneut – keine zweite Verbindung aufbauen
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      c.on('open', () => {
        done = live = true;
        clearTimeout(timer);
        resolve({ send: m => { if (c.open) c.send(m); }, close: () => { live = false; peer.destroy(); } });
      });
      c.on('data', d => h.onData(d));
      c.on('close', () => { if (live) { live = false; h.onClose(); } });
    });
  });
}

export function errorText(e) {
  return {
    'peer-unavailable': 'Keine Farm mit diesem Code gefunden. Ist der Host online?',
    'unavailable-id': 'Dieser Code ist gerade belegt.',
    network: 'Keine Verbindung zum Vermittlungs-Server. Bist du online?',
    'server-error': 'Der Vermittlungs-Server antwortet nicht. Versuch es gleich nochmal.',
    'socket-error': 'Keine Verbindung zum Vermittlungs-Server.',
    'browser-incompatible': 'Dieser Browser unterstützt keinen Multiplayer (WebRTC).',
    timeout: 'Zeitüberschreitung – die Verbindung hat nicht geklappt.',
  }[e?.type] || 'Verbindung fehlgeschlagen (' + (e?.type || e?.message || e) + ')';
}
