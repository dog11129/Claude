# Ende-zu-Ende-Test für den eigenen Verbindungsserver und den Cloud-Spielstand (gegen den lokalen Nachbau).
# Start: python3 -m http.server 8080 & node cloud/dev-server.mjs 8787 & python3 test/cloud.e2e.py
import asyncio
from playwright.async_api import async_playwright
BASE = 'http://localhost:8080/index.html?cloud=http://localhost:8787'
def ok(c, what): print(('✔ ' if c else '✘ ') + what)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errs = []
        async def page(name, vp, prof):
            ctx = await b.new_context(viewport=vp)
            await ctx.add_init_script("localStorage.setItem('kh.settings', JSON.stringify({quality:'low',sound:0,music:0,fullscreen:false}));localStorage.setItem('kh.profile', JSON.stringify({name:'%s'}));localStorage.setItem('ki.tutorial','true');localStorage.setItem('ki.buildTip','true')" % prof)
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append(name + ': ' + str(e)))
            return pg
        A = await page('A', {'width': 1000, 'height': 700}, 'Shawn')
        await A.goto(BASE); await A.wait_for_timeout(1500)
        await A.click('[data-go=farms]'); await A.click('#newbtn')
        await A.wait_for_function('window.__game.G?.code', timeout=30000)
        code = await A.evaluate('window.__game.G.code')
        relay = await A.evaluate('window.__game.G.net.relay')
        ok(relay, 'Host über eigenen Verbindungsserver online, Code ' + code)
        B = await page('B', {'width': 420, 'height': 800}, 'Mia')
        await B.goto(BASE); await B.wait_for_timeout(1500)
        await B.click('[data-go=join]'); await B.fill('#jcode', code); await B.click('#jbtn')
        await B.wait_for_function('window.__game.G?.ready', timeout=30000)
        await B.wait_for_timeout(1500)
        n = await A.evaluate('Object.keys(window.__game.G.players).length')
        ok(n == 2, f'Host sieht {n} Spieler')
        hn = await B.evaluate("window.__game.G.players.h?.name")
        ok(hn == 'Shawn', 'Gast sieht den Host: ' + str(hn))
        # Gast bewegt sich
        await B.keyboard.down('d'); await B.wait_for_timeout(700); await B.keyboard.up('d'); await B.wait_for_timeout(800)
        pos = await A.evaluate("(()=>{const G=window.__game.G; const g=Object.values(G.players).find(p=>p.id!=='h'); return [g.x,g.z]})()")
        me = await B.evaluate("(()=>{const G=window.__game.G; const p=G.players[G.me]; return [p.x,p.z]})()")
        ok(abs(pos[0]-me[0]) < 1.5 and abs(pos[1]-me[1]) < 1.5, f'Host sieht Gast-Bewegung {pos} ~ {me}')
        # Gast schüttelt Baum über das Netz
        money0 = await A.evaluate('window.__game.G.s.stats.fruit')
        await B.evaluate("""(async()=>{const {G,S}=window.__game; const all=S.spots(G.s); const k=Object.keys(all).find(k=>all[k]==='tree' && S.fruitReady(G.s,k)); const [x,z]=k.split(',').map(Number); Object.assign(G.players[G.me],{x,z:z-1,ry:0});})()""")
        await B.wait_for_timeout(400); await B.keyboard.press('e'); await B.wait_for_timeout(1500)
        drops = await A.evaluate('Object.values(window.__game.G.s.ground).filter(g=>g.id && ["apfel","kirsche","orange","pfirsich","birne"].includes(g.id)).length')
        ok(drops >= 3, f'Aktion des Gastes kommt beim Host an ({drops} Früchte am Boden)')
        # Cloud-Spielstand: Host lädt neu, schaltet Cloud ein
        await A.reload(); await A.wait_for_timeout(1500)
        await A.click('[data-go=farms]'); await A.wait_for_timeout(300)
        await A.click('[data-cl=on]')
        await A.wait_for_function("document.querySelector('#cloudbox .st')?.textContent.includes('Abgeglichen')", timeout=15000)
        key = await A.evaluate("JSON.parse(localStorage.getItem('ki.cloud')).key")
        st = await A.evaluate("document.querySelector('#cloudbox .st').textContent")
        ok(len(key) == 20, 'Cloud-Schlüssel: ' + key + ' · ' + st)
        
        await B.close()
        C = await page('C', {'width': 420, 'height': 800}, 'Shawn')
        await C.goto(BASE); await C.wait_for_selector('[data-go=farms]', state='visible', timeout=60000)
        await C.click('[data-go=farms]'); await C.wait_for_timeout(300)
        await C.fill('#cloudkey', '-'.join(key[i:i+4] for i in range(0, 20, 4)).lower())
        await C.click('[data-cl=use]')
        await C.wait_for_function("document.querySelectorAll('#farms .farm').length >= 1", timeout=15000)
        names = await C.evaluate("[...document.querySelectorAll('#farms .farm b')].map(b=>b.textContent)")
        ok(any('Shawn' in x for x in names), 'Zweites Gerät holt die Insel aus der Cloud: ' + str(names))
        
        # Weiterspielen auf C und zurück auf A
        await C.click('[data-play]'); await C.wait_for_function('window.__game.G?.ready', timeout=30000)
        await C.evaluate("window.__game.G.s.money += 12345")
        await C.wait_for_timeout(300)
        await C.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        await C.reload(); await C.wait_for_timeout(2500)
        await A.reload(); await A.wait_for_timeout(1000)
        await A.click('[data-go=farms]')
        await A.wait_for_function("document.querySelector('#cloudbox .st')?.textContent.includes('Abgeglichen')", timeout=15000)
        await A.wait_for_timeout(500)
        m = await A.evaluate("Object.values(JSON.parse(localStorage.getItem('ki.islands'))).map(f=>f.s.money)")
        ok(any(x >= 12345 for x in m), f'Fortschritt vom zweiten Gerät kommt zurück: {m}')
        print('Fehler:', errs[:6])
        await b.close()
asyncio.run(main())
