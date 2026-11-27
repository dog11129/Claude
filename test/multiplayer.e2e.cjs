// Ende-zu-Ende-Test: Host (PC) + Gast (Handy) spielen zusammen über einen lokalen PeerJS-Server.
// Einmalig: npm i --no-save playwright peer   ·   Start: node test/multiplayer.e2e.cjs
const { chromium, devices } = require('playwright');
const { PeerServer } = require('peer');
const http = require('http'), fs = require('fs'), path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const web = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
}).listen(8091, '127.0.0.1');
const peer = PeerServer({ port: 9091, host: '127.0.0.1', path: '/' });
const URL = 'http://127.0.0.1:8091/?peer=127.0.0.1:9091';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (ok, what) => { console.log((ok ? '✔ ' : '✘ ') + what); if (!ok) process.exitCode = 1; };

(async () => {
  const browser = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const errors = [];
  const open = async (opts, name) => {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('kh.settings', JSON.stringify({ quality: 'low', sound: 0, music: 0 })));
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    return p;
  };
  const A = await open({ viewport: { width: 1280, height: 800 } }, 'host');
  await A.goto(URL);
  await A.fill('#pname', 'Host');
  await A.click('#edok');
  await A.click('[data-go=farms]');
  await A.click('#newbtn');
  await A.waitForFunction(() => window.__game.G?.code, null, { timeout: 15000 });
  const code = await A.evaluate(() => window.__game.G.code);
  check(/^[A-Z0-9]{5}$/.test(code), 'Host bekommt Einladungscode ' + code);

  // Baum vor der Figur schütteln (E), dann einen anderen Baum anklicken: hinlaufen & schütteln
  const trees = await A.evaluate(async () => { const m = await import('./src/data.js'); return Object.keys(m.RES_SPOTS).filter(k => m.RES_SPOTS[k] === 'tree').slice(0, 2).map(k => k.split(',').map(Number)); });
  await A.evaluate(([x, z]) => Object.assign(window.__game.G.players.h, { x, z: z + 0.95, ry: Math.PI }), trees[0]);
  await sleep(150);
  await A.keyboard.press('e');
  await sleep(300);
  check(await A.evaluate(() => window.__game.G.s.stats.fruit === 3), 'Host schüttelt mit E einen Baum – Obst fällt herunter');
  const pt = await A.evaluate(([x, z]) => window.__game.world.project(x, 1.2, z), trees[1]);
  await A.mouse.click(pt[0], pt[1]);
  await A.waitForFunction(() => window.__game.G.s.stats.fruit >= 6, null, { timeout: 8000 }).catch(() => {});
  check(await A.evaluate(() => window.__game.G.s.stats.fruit >= 6), 'Klick auf Baum: hinlaufen & schütteln');
  const spot = await A.evaluate(() => { const S = window.__game.S, s = window.__game.G.s; for (let x = -8; x < 0; x++) for (let z = 3; z < 9; z++) if (S.canPlace(s, x, z)) return [x, z]; });
  await A.evaluate(([x, z]) => window.__game.S.act(window.__game.G.s, { t: 'plant', x, z, item: 's_tulpe' }), spot);

  const B = await open({ ...devices['Pixel 7'] }, 'guest');
  await B.goto(URL + '&join=' + code);
  await B.fill('#pname', 'Gast');
  await B.click('#edok');
  await B.click('#jbtn');
  await B.waitForFunction(() => window.__game.G?.ready, null, { timeout: 20000 });
  await sleep(800);
  check(await A.evaluate(() => Object.keys(window.__game.G.players).length === 2), 'Gast tritt per Code bei');

  await B.evaluate(([x, z]) => { const g = window.__game.G; Object.assign(g.players[g.me], { x, z: z - 1, ry: 0 }); g.sel = 'can'; }, spot);
  await sleep(200);
  await B.tap('#actbtn');
  await sleep(600);
  check(await A.evaluate(([x, z]) => window.__game.G.s.tiles[x + ',' + z].w > 0, spot), 'Gast gießt – Host sieht die gegossene Blume');

  await B.evaluate(() => document.getElementById('chatbtn').click());
  await B.fill('#chatin', 'Hallo 💕');
  await B.press('#chatin', 'Enter');
  await sleep(500);
  check((await A.evaluate(() => document.getElementById('chatlog').textContent)).includes('Hallo'), 'Chat kommt beim Host an');

  await A.evaluate(() => window.__game.S.act(window.__game.G.s, { t: 'buy', id: 's_tulpe', n: 2 }));
  await A.evaluate(() => { window.__game.G.dirty = true; });
  await sleep(600);
  const hostMoney = await A.evaluate(() => window.__game.G.s.money);
  check(await B.evaluate(m => window.__game.G.s.money === m, hostMoney), 'Geteilte Taler werden synchronisiert');
  check(await B.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ki.islands'))).length === 1), 'Gast hat eine Sicherheitskopie');

  await B.evaluate(() => { const g = window.__game.G; Object.assign(g.players[g.me], { x: -4, z: -2 }); });
  await A.evaluate(() => Object.assign(window.__game.G.players.h, { x: -4, z: -3, ry: 0 }));
  await sleep(500);
  check((await A.evaluate(() => window.__game.G.ctx?.label || '')).includes('umarmen'), 'Partner vor dir: Umarmen wird angeboten');
  await A.keyboard.press('e');
  await sleep(300);
  await A.click('#pbody [data-ui=soc][data-k=hug]');
  await sleep(600);
  check(await B.evaluate(() => window.__game.G.players[window.__game.G.me].ak === 'hug'), 'Umarmung (Zusammen-Menü) kommt beim Gast an');
  await B.evaluate(() => { window.__game.profile.look = { ...window.__game.profile.look, hat: 'crown' }; });
  await B.evaluate(() => [...document.querySelectorAll('[data-open=settings]')][0].click());
  await B.click('#pbody [data-ui=editlook]');
  await B.click('#edok');
  await sleep(600);
  check(await A.evaluate(() => Object.values(window.__game.G.players).some(p => p.look.hat === 'crown')), 'Neues Aussehen des Gasts sieht der Host');

  await A.evaluate(() => { const g = window.__game.G; g.s.dayTime = 0.85; g.players.h.pose = 'sleep'; });
  await sleep(500);
  check(await A.evaluate(() => window.__game.G.s.day === 1), 'Nur einer im Bett: noch kein neuer Tag');
  await B.evaluate(() => { const g = window.__game.G; g.players[g.me].pose = 'sleep'; });
  await A.waitForFunction(() => window.__game.G.s.day === 2, null, { timeout: 5000 }).catch(() => {});
  await sleep(600);
  check(await A.evaluate(() => window.__game.G.s.day === 2) && await B.evaluate(() => window.__game.G.players[window.__game.G.me].pose === null), 'Beide schlafen → neuer Tag, beide wach');

  await A.evaluate(() => [...document.querySelectorAll('[data-open=settings]')][0].click());
  await A.click('#pbody [data-ui=leave]');
  await sleep(800);
  check(await B.evaluate(() => !document.getElementById('cover').classList.contains('hidden')), 'Gast erfährt, dass der Host gegangen ist');

  check(!errors.length, 'keine JS-Fehler ' + errors.join(' | '));
  await browser.close();
  peer.close?.();
  web.close();
  process.exit();
})().catch(e => { console.error(e); process.exit(1); });
