// Lokaler Ersatz für die Cloudflare-Laufzeit, nur für Tests: führt cloud/worker.js mit nachgebauten
// Durable Objects (WebSocket-Hibernation-API, SQLite-Speicher) aus.  node cloud/dev-server.mjs [port]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require(process.env.WS_PATH || '/opt/npm-tools/node_modules/ws');
const PORT = +process.argv[2] || 8787;

class FakeSocket {
  constructor() { this.q = []; this.real = null; this.att = null; this.tags = []; this.dead = false; }
  send(m) { if (this.real) this.real.send(m); else this.q.push(m); }
  close(code, reason) { this.dead = true; if (this.real) { try { this.real.close(code, reason); } catch { /* */ } } else this.q.push({ close: [code, reason] }); }
  serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)); }
  deserializeAttachment() { return this.att; }
  attach(ws) {
    this.real = ws;
    for (const m of this.q) if (m.close) ws.close(...m.close); else ws.send(m);
    this.q = [];
  }
}
class Ctx {
  constructor() { this.sockets = new Set(); this.auto = null; this.storage = { sql: new Sql() }; }
  acceptWebSocket(ws, tags = []) { ws.tags = tags; ws.ctx = this; this.sockets.add(ws); }
  getWebSockets(tag) { return [...this.sockets].filter(s => !s.closedFor && (!tag || s.tags.includes(tag))); }
  setWebSocketAutoResponse(p) { this.auto = p; }
}
class Sql {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  exec(q, ...b) {
    b = b.map(v => v instanceof ArrayBuffer ? new Uint8Array(v) : v);
    const st = this.db.prepare(q), rows = /^\s*select/i.test(q) ? st.all(...b).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v]))) : (st.run(...b), []);
    return { toArray: () => rows, one: () => rows[0] };
  }
}
class R extends Response {
  constructor(body, init = {}) {
    super(init.status === 101 ? null : body, { ...init, status: init.status === 101 ? 200 : init.status });
    if (init.status === 101) { this.webSocket = init.webSocket; this.upgraded = true; }
  }
}
globalThis.__cf = {
  DurableObject: class { constructor(ctx, env) { this.ctx = ctx; this.env = env; } },
  Response: R,
};
globalThis.WebSocketPair = class { constructor() { const c = new FakeSocket(), s = new FakeSocket(); c.peer = s; s.peer = c; this[0] = c; this[1] = s; } };
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.request = a; this.response = b; } };

const src = readFileSync(new URL('./worker.js', import.meta.url), 'utf8')
  .replace("import { DurableObject } from 'cloudflare:workers';", 'const { DurableObject, Response } = globalThis.__cf;');
const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const ns = Cls => { const objs = new Map(); return { idFromName: n => n, get: id => { if (!objs.has(id)) objs.set(id, new Cls(new Ctx(), env)); return objs.get(id); } }; };
const env = { ROOM: ns(mod.Room), VAULT: ns(mod.Vault) };

const toReq = (req, body) => new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const r = await mod.default.fetch(toReq(req, Buffer.concat(chunks)), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', async (req, sock, head) => {
  const r = await mod.default.fetch(toReq(req), env);
  if (!r.upgraded) { sock.end('HTTP/1.1 ' + r.status + ' x\r\n\r\n'); return; }
  const server = r.webSocket.peer, obj = server.ctx;
  wss.handleUpgrade(req, sock, head, ws => {
    server.attach(ws);
    ws.on('message', (data, bin) => {
      const m = bin ? data : data.toString();
      if (obj?.auto && m === obj.auto.request) return ws.send(obj.auto.response);
      handler(server)?.webSocketMessage?.(server, m);
    });
    ws.on('close', () => { if (server.closedFor) return; server.closedFor = true; obj?.sockets.delete(server); handler(server)?.webSocketClose?.(server); });
  });
});
// Zu welchem Durable Object gehört ein Socket?
const owners = new WeakMap();
const origAccept = Ctx.prototype.acceptWebSocket;
Ctx.prototype.acceptWebSocket = function (ws, tags) { origAccept.call(this, ws, tags); owners.set(ws, this.owner); };
const handler = ws => owners.get(ws);
for (const n of Object.values(env)) { const g = n.get; n.get = id => { const o = g(id); o.ctx.owner = o; return o; }; }
server.listen(PORT, () => console.log('Kuschelinsel-Cloud (lokal) auf http://localhost:' + PORT));
