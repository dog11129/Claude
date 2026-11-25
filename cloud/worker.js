// Kuschelinsel-Cloud (Cloudflare Worker)
//  • /room/<CODE>  – eigener Verbindungsserver: WebSocket-Raum, der Nachrichten zwischen Gastgeber und Gästen weiterreicht
//  • /vault/<KEY>  – Cloud-Spielstand: Inseln (gzip) unter einem geheimen Cloud-Schlüssel, mit Vorversion als Sicherung
import { DurableObject } from 'cloudflare:workers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const CODE = /^[A-Z0-9]{5}$/, KEY = /^[A-Z2-9]{20}$/, ISLE = /^[A-Za-z0-9_-]{1,40}$/, PEER = /^[A-Za-z0-9_-]{4,40}$/;
const MAX_SAVE = 1_800_000, MAX_ISLES = 40, MAX_MSG = 1_000_000;

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), [, kind, id, isle] = url.pathname.split('/');
    if (kind === 'ping') return json({ ok: true, v: 1 });
    if (kind === 'room' && CODE.test(id || '')) {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket' }, 426);
      return env.ROOM.get(env.ROOM.idFromName(id)).fetch(req);
    }
    if (kind === 'post' && CODE.test(id || '')) return env.VAULT.get(env.VAULT.idFromName('post:' + id)).fetch(req); // Brieffreunde: Postfach je Insel-Code
    if (kind === 'vault' && KEY.test(id || '') && (!isle || ISLE.test(isle))) return env.VAULT.get(env.VAULT.idFromName(id)).fetch(req);
    return json({ error: 'not found' }, 404);
  },
};

// ---------- Verbindungsserver ----------
// Ein Raum pro Insel-Code. Der Gastgeber ist der "Server" des Spiels, der Raum reicht nur weiter.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('p', 'q')); // Lebenszeichen ohne Aufwecken
  }
  async fetch(req) {
    const url = new URL(req.url), role = url.searchParams.get('role'), sec = url.searchParams.get('s') || '', id = url.searchParams.get('id') || '';
    const [client, server] = Object.values(new WebSocketPair());
    const hosts = this.ctx.getWebSockets('host');
    if (role === 'host') {
      if (!PEER.test(sec)) return json({ error: 'bad' }, 400);
      for (const h of hosts) {
        const a = h.deserializeAttachment();
        if (a?.s !== sec) { this.ctx.acceptWebSocket(server, ['dead']); server.send('{"sys":"taken"}'); server.close(4001, 'taken'); return new Response(null, { status: 101, webSocket: client }); }
        try { h.close(4002, 'replaced'); } catch { /* schon zu */ }
      }
      this.ctx.acceptWebSocket(server, ['host']);
      server.serializeAttachment({ role: 'host', s: sec });
      server.send('{"sys":"ok"}');
      // Gäste, die noch da sind (Gastgeber hat sich neu verbunden), wieder anmelden
      for (const g of this.ctx.getWebSockets('guest')) { const a = g.deserializeAttachment(); if (a?.id) server.send(JSON.stringify({ sys: 'join', id: a.id })); }
    } else {
      if (!PEER.test(id)) return json({ error: 'bad' }, 400);
      if (!hosts.length) { this.ctx.acceptWebSocket(server, ['dead']); server.send('{"sys":"nohost"}'); server.close(4004, 'nohost'); return new Response(null, { status: 101, webSocket: client }); }
      for (const old of this.ctx.getWebSockets('g:' + id)) try { old.close(4002, 'replaced'); } catch { /* */ }
      this.ctx.acceptWebSocket(server, ['guest', 'g:' + id]);
      server.serializeAttachment({ role: 'guest', id });
      server.send('{"sys":"ok"}');
      for (const h of hosts) h.send(JSON.stringify({ sys: 'join', id }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    const a = ws.deserializeAttachment();
    if (a?.role === 'guest') {
      for (const h of this.ctx.getWebSockets('host')) h.send('{"f":' + JSON.stringify(a.id) + ',"d":' + msg + '}');
    } else if (a?.role === 'host') {
      let m;
      try { m = JSON.parse(msg); } catch { return; }
      const d = JSON.stringify(m.d);
      if (m.to) { for (const g of this.ctx.getWebSockets('g:' + m.to)) g.send(d); }
      else for (const g of this.ctx.getWebSockets('guest')) { if (m.ex && g.deserializeAttachment()?.id === m.ex) continue; g.send(d); }
      if (m.drop) for (const g of this.ctx.getWebSockets('g:' + m.drop)) try { g.close(4003, 'dropped'); } catch { /* */ }
    }
  }
  webSocketClose(ws) { this.gone(ws); }
  webSocketError(ws) { this.gone(ws); }
  gone(ws) {
    const a = ws.deserializeAttachment();
    if (a?.role === 'guest') { for (const h of this.ctx.getWebSockets('host')) try { h.send(JSON.stringify({ sys: 'leave', id: a.id })); } catch { /* */ } }
    else if (a?.role === 'host' && !this.ctx.getWebSockets('host').some(h => h !== ws)) {
      for (const g of this.ctx.getWebSockets('guest')) try { g.send('{"sys":"hostgone"}'); g.close(4005, 'hostgone'); } catch { /* */ }
    }
    try { ws.close(1000, 'bye'); } catch { /* */ }
  }
}

// ---------- Cloud-Spielstand ----------
export class Vault extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS isl (id TEXT PRIMARY KEY, name TEXT, t INTEGER, n INTEGER, data BLOB, pt INTEGER, prev BLOB)');
  }
  // Brieffreunde: Postfach einer Insel (GET = lesen, POST = einwerfen, DELETE ?ids= = abgeholt)
  async post(req, url) {
    this.sql.exec('CREATE TABLE IF NOT EXISTS post (id TEXT PRIMARY KEY, t INTEGER, body TEXT)');
    if (req.method === 'GET') return json({ letters: this.sql.exec('SELECT body FROM post ORDER BY t').toArray().map(r => JSON.parse(r.body)) });
    if (req.method === 'POST') {
      const b = await req.text();
      if (b.length > 2000) return json({ error: 'size' }, 413);
      let l;
      try { l = JSON.parse(b); } catch { return json({ error: 'json' }, 400); }
      if (typeof l?.id !== 'string' || typeof l.text !== 'string') return json({ error: 'bad' }, 400);
      if (this.sql.exec('SELECT COUNT(*) AS c FROM post').one().c >= 50) return json({ error: 'full' }, 409);
      this.sql.exec('INSERT OR IGNORE INTO post (id, t, body) VALUES (?, ?, ?)', l.id.slice(0, 40), Date.now(), b);
      return json({ ok: true });
    }
    if (req.method === 'DELETE') { for (const id of (url.searchParams.get('ids') || '').split(',').slice(0, 50)) this.sql.exec('DELETE FROM post WHERE id = ?', id); return json({ ok: true }); }
    return json({ error: 'method' }, 405);
  }
  async fetch(req) {
    const url = new URL(req.url), [, , , isle] = url.pathname.split('/');
    if (url.pathname.startsWith('/post/')) return this.post(req, url);
    if (!isle) {
      if (req.method !== 'GET') return json({ error: 'method' }, 405);
      return json({ islands: this.sql.exec('SELECT id, name, t, n, pt FROM isl ORDER BY t DESC').toArray() });
    }
    if (req.method === 'GET') {
      const r = this.sql.exec(`SELECT name, t, ${url.searchParams.get('prev') ? 'prev AS data, pt AS t2' : 'data'} FROM isl WHERE id = ?`, isle).toArray()[0];
      if (!r?.data) return json({ error: 'not found' }, 404);
      return new Response(r.data, { headers: { ...CORS, 'Content-Type': 'application/octet-stream', 'X-Name': encodeURIComponent(r.name || ''), 'X-Time': String(r.t2 || r.t) } });
    }
    if (req.method === 'PUT') {
      const t = Math.floor(Number(url.searchParams.get('t'))), name = (url.searchParams.get('name') || '').slice(0, 60);
      if (!Number.isFinite(t) || t <= 0) return json({ error: 'time' }, 400);
      const body = await req.arrayBuffer(); // BLOBs gehen als ArrayBuffer in SQLite
      if (!body.byteLength || body.byteLength > MAX_SAVE) return json({ error: 'size' }, 413);
      const cur = this.sql.exec('SELECT t, data, pt FROM isl WHERE id = ?', isle).toArray()[0];
      if (!cur && this.sql.exec('SELECT COUNT(*) AS c FROM isl').one().c >= MAX_ISLES) return json({ error: 'full' }, 409);
      if (cur && cur.t > t && !url.searchParams.get('force')) return json({ error: 'newer', t: cur.t }, 409); // nie einen neueren Stand überschreiben
      // Vorversion behalten (höchstens alle 10 Minuten weiterrücken, damit eine Sicherung von "vor einer Weile" bleibt)
      const keepPrev = cur && (!cur.pt || cur.t - cur.pt > 600_000);
      if (cur) this.sql.exec(`UPDATE isl SET name = ?, t = ?, n = ?, data = ?${keepPrev ? ', pt = ?, prev = ?' : ''} WHERE id = ?`, ...[name, t, body.byteLength, body, ...(keepPrev ? [cur.t, cur.data] : []), isle]);
      else this.sql.exec('INSERT INTO isl (id, name, t, n, data) VALUES (?, ?, ?, ?, ?)', isle, name, t, body.byteLength, body);
      return json({ ok: true, t });
    }
    if (req.method === 'DELETE') { this.sql.exec('DELETE FROM isl WHERE id = ?', isle); return json({ ok: true }); }
    return json({ error: 'method' }, 405);
  }
}
