# Bauplan der Welt-Modelle für Blender: startet das Spiel im Browser im Bauplan-Modus (alles wird aus Grundformen
# gebaut, src/blend.js merkt sich die Teile jedes benannten Modells), besucht alle Orte, öffnet die Tore, ruft die
# Sonderfälle auf (Schlitten, Pony, Tandem, Kartons, Floß, Tor-Zustände …) und schreibt art/remaster/world.json.
#   python3 tools/capture-world.py        (braucht: pip install playwright und Chrome)
# Danach in Blender: kit.py, PLAN = world.json, remaster.py  ➜  world2.glb nach assets/models/
import asyncio, json, os, functools, threading, http.server, socketserver
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PLACES = ['street', 'island', 'tropic', 'pier', 'wald', 'island', 'wiese', 'island', 'hoehle', 'island', 'reef', 'reefup', 'wreck', 'wreckup', 'hoehle',
          'depth:0', 'depth:1', 'depth:2', 'depthup:2', 'depthup:1', 'depthup:0', 'island', 'volcano', 'pier', 'grotto', 'grottoup', 'deepsea', 'pier',
          'street', 'fair', 'fairback', 'island', 'wiese', 'moor', 'moorback', 'island', 'wald', 'bambus', 'bambusback', 'island']
INIT = ("localStorage.setItem('kh.settings', JSON.stringify({quality:'low',sound:0,music:0,fullscreen:false}));"
        "localStorage.setItem('kh.profile', JSON.stringify({name:'Bauplan'}));localStorage.setItem('ki.tutorial','true');localStorage.setItem('ki.buildTip','true');localStorage.setItem('ki.pickTip','true');"
        "globalThis.KUSCHEL_CAPTURE = true;")

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]

async def main():
    port = serve()
    async with async_playwright() as p:
        exe = next((c for c in (os.environ.get('CHROME'), '/usr/bin/google-chrome', '/usr/bin/chromium') if c and os.path.exists(c)), None)
        b = await p.chromium.launch(executable_path=exe, args=['--no-sandbox'])
        c = await b.new_context(viewport={'width': 1000, 'height': 700})
        await c.add_init_script(INIT)
        pg = await c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/index.html?relay=0')
        await pg.click('[data-go=farms]'); await pg.click('#newbtn')
        await pg.wait_for_function('window.__game.G?.ready', timeout=90000)
        await pg.wait_for_timeout(1500)
        # eine Zeitkapsel neben die Figur, damit ihr Hügel gebaut wird
        await pg.evaluate("""(() => { const { G } = window.__game, me = G.players[G.me];
          G.s.capsules = [{ k: Math.round(me.x + 2) + ',' + Math.round(me.z + 1), open: 9999, opened: false }]; })()""")
        for where in PLACES:
            await pg.evaluate(f'window.__game.travel({json.dumps(where)})')
            await pg.wait_for_timeout(700)
        # alle Tore offen (andere Modelle als geschlossen)
        await pg.evaluate("""(async () => { const { G } = window.__game, { AREAS } = await import('/src/areas.js');
          G.s.areas = Object.fromEntries(Object.keys(AREAS).map(k => [k, true])); window.__game.travel('island'); })()""")
        await pg.wait_for_timeout(1500)
        plan = await pg.evaluate("""(async () => {
          for (const f of ['zones', 'world-extra', 'world-extra2', 'world-extra3', 'world-extra4']) (await import(`/src/${f}.js`)).__capture?.();
          (await import('/src/nature.js')).placeable('eiernest');
          const { REG } = await import('/src/blend.js'), P = await import('/tools/partplan.mjs');
          const models = [];
          for (const [name, e] of REG) models.push({ name, pack: 'world', keep: 1, parts: P.planParts(e.parts, e.glow, e.vc) });
          return { version: 1, models, icons: [], stats: P.stats };
        })()""")
        out = os.path.join(ROOT, 'art', 'remaster')
        os.makedirs(out, exist_ok=True)
        json.dump(plan, open(os.path.join(out, 'world.json'), 'w'))
        n = sum(len(m['parts']) for m in plan['models'])
        print(f"art/remaster/world.json: {len(plan['models'])} Modelle, {n} Bauteile")
        print(', '.join(f'{k} {v}' for k, v in sorted(plan['stats'].items(), key=lambda kv: -kv[1])))
        print(sorted(m['name'] for m in plan['models']))
        if errs: print('Fehler:', errs[:5])
        await b.close()

asyncio.run(main())
