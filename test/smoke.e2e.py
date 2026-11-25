# Browser-Smoke-Test: startet das Spiel wirklich im Browser und klappert alles einmal ab.
#   npm run smoke            (braucht: pip install playwright  und Chrome – /usr/bin/google-chrome oder `playwright install chromium`)
# Prüft: neue Insel, Möbel im Haus, alle Orte (Gasse, Tropeninsel, Gebiete, Höhlen-Tiefen, Riff, Wrack, Nachbarzimmer, Haus),
# alle Fenster, Handy-Ansicht (nichts ragt aus dem Fenster) und einen alten Spielstand. Jeder JS-Fehler lässt den Test scheitern.
import asyncio, json, os, sys, threading, functools, http.server, socketserver
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
fails = []
def ok(c, what):
    print(('✔ ' if c else '✘ ') + what)
    if not c: fails.append(what)

def shot(name):  # Bildschirmfotos zum Nachsehen (test/out/ wird nicht hochgeladen)
    os.makedirs(os.path.join(ROOT, 'test', 'out'), exist_ok=True)
    return os.path.join(ROOT, 'test', 'out', name)

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]

INIT = ("localStorage.setItem('kh.settings', JSON.stringify({quality:'low',sound:0,music:0,fullscreen:false}));"
        "localStorage.setItem('kh.profile', JSON.stringify({name:'Test'}));localStorage.setItem('ki.tutorial','true');localStorage.setItem('ki.buildTip','true')")
# Fenster, die nur mit Zusammenhang (Gesprächspartner, Ort …) sinnvoll sind, werden über ihren echten Weg getestet
PANELS = ['nature', 'stamps', 'capsule', 'golf', 'dancegame', 'cafe', 'library', 'radio', 'guestbook', 'fashion', 'gardenc', 'depthdoor', 'guide', 'balloon', 'grill', 'butterfly', 'games', 'stars', 'cable', 'reef', 'piano', 'patterns', 'night', 'stall', 'news', 'book', 'catalog',
          'chest', 'mayor', 'boat', 'tailor', 'garden', 'club', 'hut', 'phone', 'map', 'turnip', 'designer', 'recipes', 'shop', 'sell', 'orders', 'museum',
          'friends', 'emotes', 'settings', 'craft', 'cook', 'together', 'mail', 'contest', 'diary', 'fests']
PLACES = ['street', 'island', 'tropic', 'pier', 'wald', 'island', 'wiese', 'island', 'hoehle', 'island', 'reef', 'reefup', 'wreck', 'wreckup', 'hoehle', 'depth:0', 'depth:1', 'depth:2', 'depthup:2', 'depthup:1', 'depthup:0', 'island', 'volcano', 'pier', 'grotto', 'grottoup', 'nroom:mira']

def chrome():
    for p in (os.environ.get('CHROME'), '/usr/bin/google-chrome', '/usr/bin/chromium'):
        if p and os.path.exists(p): return p
    return None  # Playwrights eigenes Chromium

async def open_game(b, url, errs, name, **ctx):
    c = await b.new_context(**ctx)
    await c.add_init_script(INIT)
    pg = await c.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    pg.on('console', lambda m: m.type == 'error' and not any(x in m.text for x in ('peerjs', 'PeerJS', '404', 'WebSocket', 'net::')) and errs.append(f'{name}: {m.text[:300]}'))
    await pg.goto(url)
    return pg

async def new_island(pg):
    await pg.click('[data-go=farms]'); await pg.click('#newbtn')
    await pg.wait_for_function('window.__game.G?.ready', timeout=60000)
    await pg.wait_for_timeout(800)

async def frames(pg, n=20):  # warten, bis wirklich n Bilder gezeichnet wurden
    await pg.evaluate('n => new Promise(r => { let i = 0; const f = () => ++i >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); })', n)

async def main():
    import time; t0 = time.time()
    port = serve()
    url = f'http://127.0.0.1:{port}/index.html?relay=0'
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=chrome(), args=['--no-sandbox'])
        # 1) PC: neue Insel
        pg = await open_game(b, url, errs, 'PC', viewport={'width': 1100, 'height': 760})
        await new_island(pg)
        ok(await pg.evaluate('!!window.__game.G.s && window.__game.world.renderer.domElement.width > 0'), 'neue Insel startet')
        await frames(pg)
        # 2) Möbel im eigenen Haus aufstellen
        r = await pg.evaluate("""(() => { const {G, S, send} = window.__game, me = G.players[G.me];
            G.s.inv.stuhl = (G.s.inv.stuhl || 0) + 1; Object.assign(me, { x: S.HOME_X, z: 1 }); send({ t: 'hplace', x: 1, z: 0, item: 'stuhl', r: 0 });
            return 1 })()""")
        await frames(pg)
        r = await pg.evaluate("JSON.stringify(window.__game.G.s.home.items)")
        ok('stuhl' in r, 'Stuhl steht im Haus ' + r)
        # 3) alle Orte besuchen
        for where in PLACES:
            n0 = len(errs)
            await pg.evaluate(f'window.__game.travel({json.dumps(where)})')
            await frames(pg, 6)
            pos = await pg.evaluate('(() => { const me = window.__game.G.players[window.__game.G.me]; return [Math.round(me.x), Math.round(me.z)] })()')
            ok(len(errs) == n0, f'Ort {where} {pos}')
        await pg.evaluate("window.__game.travel('island')")
        # 4) alle Fenster öffnen (mit allen Reitern)
        for k in PANELS:
            n0 = len(errs)
            await pg.evaluate(f'window.__game.panels.show({json.dumps(k)})')
            await frames(pg, 2)
            tabs = await pg.evaluate("[...document.querySelectorAll('#ptabs button')].map(b => b.dataset.tab)")
            for t in tabs[1:]:
                await pg.evaluate(f'window.__game.panels.show({json.dumps(k)}, {json.dumps(t)})')
                await frames(pg, 2)
            ok(len(errs) == n0, f'Fenster {k}' + (f' ({len(tabs)} Reiter)' if tabs else ''))
        await pg.evaluate('window.__game.panels.close()')
        # 4b) Minispiele starten und wieder schließen (Minigolf, Tanzabend, Kaffee)
        for btn, panel in (('w:golf', 'golf'), ('w:dance', 'dancegame'), ('w:brew', 'cafe')):
            n0 = len(errs)
            await pg.evaluate(f"window.__game.panels.show('{panel}')")
            await frames(pg, 2)
            await pg.evaluate(f"""document.querySelector(`[data-act*='"{btn}"']`)?.click()""")
            await frames(pg, 6)
            on = await pg.evaluate("!document.getElementById('mgame').classList.contains('hidden')")
            await pg.click('#mgquit')
            ok(on and len(errs) == n0, f'Minispiel {btn[2:]}')
        await pg.screenshot(path=shot('smoke-pc.png'))
        # 5) Handy: Fenster passen in die Breite, Spiele & Sterne lassen sich antippen
        ph = await open_game(b, url, errs, 'Handy', viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
        await new_island(ph)
        wide = []
        for k in PANELS:
            await ph.evaluate(f'window.__game.panels.show({json.dumps(k)})')
            await frames(ph, 2)
            w = await ph.evaluate("(() => { const p = document.getElementById('panel'), r = p.getBoundingClientRect(), b = document.getElementById('pbody'); return [Math.round(r.left), Math.round(r.right), b.scrollWidth - b.clientWidth] })()")
            if w[0] < -1 or w[1] > 391 or w[2] > 4: wide.append(f'{k}{w}')
        ok(not wide, 'Handy: alle Fenster passen in die Breite' + (f' – zu breit: {", ".join(wide)}' if wide else ''))
        await ph.evaluate("window.__game.panels.show('stars')"); await frames(ph, 5)
        cv = await ph.evaluate("(() => { const c = document.querySelector('#pbody canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.width, r.height] })()")
        ok(cv is None or (cv[0] > 200 and cv[0] <= 390), f'Handy: Sternenhimmel-Editor passt {cv}')
        await ph.evaluate('window.__game.panels.close()')
        await ph.screenshot(path=shot('smoke-phone.png'))
        # 6) alter Spielstand lädt ohne Fehler (Vorlage aus test/fixtures)
        old = open(os.path.join(ROOT, 'test', 'fixtures', 'old-save.json'), encoding='utf-8').read()
        n0 = len(errs)
        r = await pg.evaluate("""raw => { const {G, S} = window.__game; const s = S.migrate(JSON.parse(raw)); return [Object.keys(s).length > 20, s.money >= 0] }""", old)
        ok(all(r) and len(errs) == n0, 'alter Spielstand wird übernommen')
        await b.close()
    for e in errs[:10]: print('  ⚠️', e)
    ok(not errs, f'keine JS-Fehler ({len(errs)})')
    print(f'\n{time.time() - t0:.0f} s · ' + ('ALLES OK' if not fails else f'{len(fails)} FEHLGESCHLAGEN'))
    sys.exit(1 if fails else 0)

asyncio.run(main())
