# Ende-zu-Ende-Test der 🌍 Serverwelt (gegen den lokalen Nachbau des Servers, cloud/dev-server.mjs):
# Insel zur Serverwelt machen → zweites Gerät per Link → wer zuerst kommt, öffnet sie, der andere kommt automatisch dazu →
# Gastgeber verschwindet (Tab zu) → der andere übernimmt mit allen Taschen → regulär gehen → Übernahme → alles auf dem Server →
# gleichzeitig rein → Funkloch → App im Hintergrund.
#   npm run serverwelt        (braucht Node, pip install playwright und Chrome wie beim Smoke-Test)
import asyncio, json, os, socket, subprocess, sys
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
def chrome():
    for p in (os.environ.get('CHROME'), '/usr/bin/google-chrome', '/usr/bin/chromium'):
        if p and os.path.exists(p): return p
    return None
WEB, CLOUD = free_port(), free_port()
BASE = f'http://127.0.0.1:{WEB}/index.html?cloud=http://127.0.0.1:{CLOUD}'
fails = []
def ok(c, what):
    print(('✔ ' if c else '✘ ') + what)
    if not c: fails.append(what)
G = 'window.__game.G'
# Verbindungen mitschneiden und auf Wunsch kurz blockieren (simuliert ein Funkloch)
WSHOOK = """(()=>{const W=window.WebSocket; window.__ws=[]; window.WebSocket=function(u,p){ if((window.__blockWs||0)>Date.now()) u='ws://127.0.0.1:9/'; const w=new W(u,p); window.__ws.push(w); return w; };
window.WebSocket.prototype=W.prototype; Object.assign(window.WebSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});})()"""
async def main():
    procs = [subprocess.Popen([sys.executable, '-m', 'http.server', str(WEB), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
             subprocess.Popen(['node', 'cloud/dev-server.mjs', str(CLOUD)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    await asyncio.sleep(1.2)
    try:
        await run()
    finally:
        for pr in procs: pr.terminate()
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=chrome(), args=['--no-sandbox', '--disable-background-timer-throttling',
                                                                     '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'])
        errs = []
        async def context(name, prof):
            ctx = await b.new_context(viewport={'width': 900, 'height': 650})
            await ctx.add_init_script("localStorage.setItem('kh.settings', JSON.stringify({quality:'low',sound:0,music:0,fullscreen:false}));if(!localStorage.getItem('kh.profile'))localStorage.setItem('kh.profile', JSON.stringify({name:'%s'}));localStorage.setItem('ki.tutorial','true');localStorage.setItem('ki.buildTip','true');" % prof + WSHOOK)
            return ctx
        async def page(ctx, name, url=BASE):
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append(name + ': ' + str(e) + ' @ ' + str(e.stack)[:600]))
            pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await pg.goto(url); await pg.wait_for_selector('[data-go=farms]', state='visible', timeout=60000)
            return pg
        async def role(pg, want, t=30000):
            await pg.wait_for_function(f"{G}?.ready && {G}.role === '{want}' && !document.querySelector('#cover:not(.hidden)')", timeout=t)

        ca, cb = await context('A', 'Shawn'), await context('B', 'Adriana')
        # A: Insel besiedeln, kurz spielen, zurück ins Menü, zur Serverwelt machen
        A = await page(ca, 'A')
        await A.click('[data-go=farms]'); await A.fill('#fname', 'Testwelt'); await A.click('#newbtn')
        await A.wait_for_function(f'{G}?.ready', timeout=30000)
        await A.evaluate(f"{G}.s.money = 4242")
        await A.evaluate('window.__game.leave()')
        await A.click('[data-go=farms]'); await A.wait_for_selector('#swpick')
        await A.click('[data-sw=make]')
        await A.wait_for_function("JSON.parse(localStorage.getItem('ki.server')||'null')?.key", timeout=15000)
        key = await A.evaluate("JSON.parse(localStorage.getItem('ki.server')).key")
        ok(len(key) == 20, 'Serverwelt angelegt, Schlüssel ' + key)
        await A.evaluate("document.querySelector('#m-farms [data-go=title]').click()")

        # B: Link öffnen → eingerichtet, Link verschwindet aus der Adresszeile
        B = await page(cb, 'B', BASE + '#welt=' + key)
        await B.wait_for_timeout(500)
        ok('welt=' not in B.url, 'Schlüssel nicht mehr in der Adresszeile')
        ok(await B.is_visible('#b-server'), 'Button „Serverwelt“ im Hauptmenü')
        # B kommt zuerst → öffnet die Insel vom Server
        await B.click('#b-server'); await role(B, 'host')
        ok(await B.evaluate(f"{G}.s.money") == 4242, 'B öffnet die Insel vom Server (Geld 4242)')
        code = await B.evaluate(f"{G}.code")
        # A kommt dazu → landet automatisch bei B
        await A.click('#b-server'); await role(A, 'guest')
        ok(await B.evaluate(f"Object.keys({G}.players).length") == 2, 'A ist automatisch bei B gelandet (Code ' + code + ')')
        # Taschen: jede/r hat eine eigene
        akey = await B.evaluate(f"Object.values({G}.players).find(p => p.id !== 'h').key")
        await B.evaluate(f"(()=>{{const G={G}; G.s.pinv['{akey}'] = {{...G.s.pinv['{akey}'], apfel: 7}}; G.s.pinv.host.birne = 3; G.s.money = 5000; G.dirty = true; G.lastFull = 0}})()")
        await A.wait_for_function(f"{G}.s.inv.apfel === 7", timeout=10000)
        ok(True, 'A sieht die eigene Tasche (7 Äpfel) als Gast')
        await B.wait_for_timeout(16000)  # einmal auf den Server speichern lassen
        # B macht den Tab einfach zu → A übernimmt
        await B.close()
        await role(A, 'host', 40000)
        ok(await A.evaluate(f"{G}.s.inv.apfel") == 7, 'A hat übernommen und behält die eigene Tasche')
        ok(await A.evaluate(f"{G}.s.money") == 5000, 'Stand von B ist mit übernommen (Geld 5000)')
        await A.evaluate(f"{G}.s.money = 6000")
        # B kommt wieder → landet als Gast bei A, mit der alten Tasche
        B = await page(cb, 'B2')
        await B.click('#b-server'); await role(B, 'guest')
        ok(await B.evaluate(f"{G}.s.inv.birne") == 3, 'B ist zurück (Gast) und hat die eigene Tasche (3 Birnen)')
        # A geht regulär → B übernimmt
        await A.evaluate('window.__game.leave()')
        await role(B, 'host', 40000)
        ok(await B.evaluate(f"{G}.s.money") == 6000, 'B übernimmt nach regulärem Gehen von A (Geld 6000)')
        ok(await B.evaluate(f"{G}.s.inv.birne") == 3, 'B hat als Gastgeberin wieder die eigene Tasche')
        # A kommt wieder → Gast bei B (Taschen bleiben getrennt)
        await A.click('#b-server'); await role(A, 'guest')
        ok(await A.evaluate(f"{G}.s.inv.apfel") == 7 and not await A.evaluate(f"{G}.s.inv.birne"), 'Taschen bleiben getrennt')
        # Zuletzt geht B → alles liegt auf dem Server
        await B.evaluate(f"{G}.s.money = 7777")
        await B.evaluate('window.__game.leave()')
        await role(A, 'host', 40000)
        await A.evaluate('window.__game.leave()')
        await A.wait_for_timeout(1500)
        st = await A.evaluate("(async()=>{const c=JSON.parse(localStorage.getItem('ki.server')); const f=await window.__game.SW.pull(c); return f && {money:f.s.money, owner:f.s.owner, bags:Object.keys(f.s.pinv)}})()")
        ok(st and st['money'] == 7777, 'Letzter Stand liegt auf dem Server: ' + json.dumps(st))
        # Zwei kommen gleichzeitig, niemand ist da: genau eine/r öffnet, die/der andere kommt dazu
        await asyncio.gather(A.click('#b-server'), B.click('#b-server'))
        await A.wait_for_function(f"{G}?.ready && !document.querySelector('#cover:not(.hidden)')", timeout=40000)
        await B.wait_for_function(f"{G}?.ready && !document.querySelector('#cover:not(.hidden)')", timeout=40000)
        roles = sorted([await A.evaluate(f"{G}.role"), await B.evaluate(f"{G}.role")])
        await A.wait_for_timeout(1500)
        n = await A.evaluate(f"Object.keys({G}.players).length")
        ok(roles == ['guest', 'host'] and n == 2, f'Gleichzeitig rein: {roles}, {n} Spieler')
        # Funkloch beim Gastgeber: der andere übernimmt, der Gastgeber kommt danach als Gast dazu
        H, Q = (A, B) if roles and await A.evaluate(f"{G}.role") == 'host' else (B, A)
        await Q.evaluate(f"{G}.keepMe = null")
        await H.evaluate("window.__blockWs = Date.now() + 9000; window.__ws.forEach(w => w.close())")
        await role(Q, 'host', 40000)
        await role(H, 'guest', 60000)
        n = await Q.evaluate(f"Object.keys({G}.players).length")
        ok(n == 2, f'Nach dem Funkloch: Rollen getauscht, wieder {n} Spieler zusammen')
        # App in den Hintergrund (Handy in die Tasche): Insel wird freigegeben, der andere übernimmt; zurück → dabei
        H, Q = (A, B) if await A.evaluate(f"{G}.role") == 'host' else (B, A)
        await Q.evaluate(f"{G}.s.money")
        hide = "(h=>{Object.defineProperty(document,'hidden',{value:h,configurable:true});Object.defineProperty(document,'visibilityState',{value:h?'hidden':'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))})"
        await H.evaluate(hide + '(true)')
        await role(Q, 'host', 40000)
        ok(await H.evaluate(f"{G} === null"), 'Im Hintergrund gibt der Gastgeber die Insel frei, der andere übernimmt')
        await H.evaluate(hide + '(false)')
        await role(H, 'guest', 40000)
        ok(await Q.evaluate(f"Object.keys({G}.players).length") == 2, 'Zurück aus dem Hintergrund: wieder zusammen')
        ok(not errs, 'Keine Fehler: ' + str(errs[:4]))
        await b.close()
    print('ALLES OK' if not fails else f'{len(fails)} FEHLER')
    sys.exit(1 if fails else 0)
asyncio.run(main())
