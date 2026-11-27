# Zwei-Spieler-Test über den lokalen Nachbau des Verbindungsservers (cloud/dev-server.mjs).
#   npm run together        (braucht Node, pip install playwright und Chrome wie beim Smoke-Test)
# Host (PC) und Gast (Handy) spielen zusammen: Bewegung, Sandburg, Riff, Vier gewinnt, Sternbild, Foto-Wettbewerb,
# Nachbarzimmer einrichten, Fahrrad & Drachen, Polaroid, Glückskeks, Advent, Federball und Mühle (Inselleben 15). Statt fester Wartezeiten wird auf das Ergebnis gewartet (bis 15 s),
# und Chrome drosselt Hintergrund-Tabs nicht – so ist der Test auch auf langsamen Rechnern stabil.
import asyncio, os, socket, subprocess, sys, json
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
fails = []
def ok(c, what):
    print(('✔ ' if c else '✘ ') + what)
    if not c: fails.append(what)

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def chrome():
    for p in (os.environ.get('CHROME'), '/usr/bin/google-chrome', '/usr/bin/chromium'):
        if p and os.path.exists(p): return p
    return None

INIT = ("localStorage.setItem('kh.settings', JSON.stringify({quality:'low',sound:0,music:0,fullscreen:false}));"
        "localStorage.setItem('kh.profile', JSON.stringify({name:'%s'}));localStorage.setItem('ki.tutorial','true');localStorage.setItem('ki.buildTip','true')")

async def until(pg, js, arg=None, timeout=15000):
    """Wartet, bis js (Ausdruck oder Funktion) etwas Wahres liefert; gibt den letzten Wert zurück."""
    try:
        h = await pg.wait_for_function(js, arg=arg, timeout=timeout, polling=200)
        return await h.json_value()
    except Exception:  # Zeit um: letzten Wert zurückgeben, damit die Meldung zeigt, was stattdessen da war
        return await (pg.evaluate(js) if arg is None else pg.evaluate(js, arg))

async def main():
    web, cloud = free_port(), free_port()
    procs = [subprocess.Popen([sys.executable, '-m', 'http.server', str(web), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
             subprocess.Popen(['node', 'cloud/dev-server.mjs', str(cloud)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    await asyncio.sleep(1.2)
    base = f'http://127.0.0.1:{web}/index.html?cloud=http://127.0.0.1:{cloud}'
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=chrome(), args=['--no-sandbox', '--disable-background-timer-throttling',
                                                                         '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'])
            async def page(name, prof, **ctx):
                c = await b.new_context(**ctx)
                await c.add_init_script(INIT % prof)
                pg = await c.new_page()
                pg.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
                return pg
            A = await page('Host', 'Shawn', viewport={'width': 900, 'height': 650})
            await A.goto(base)
            await A.click('[data-go=farms]'); await A.click('#newbtn')
            code = await until(A, 'window.__game?.G?.code', timeout=30000)
            ok(bool(code), f'Host online, Code {code}')
            B = await page('Gast', 'Mia', viewport={'width': 390, 'height': 760}, is_mobile=True, has_touch=True)
            await B.goto(base)
            await B.click('[data-go=join]'); await B.fill('#jcode', code); await B.click('#jbtn')
            await until(B, 'window.__game?.G?.ready', timeout=30000)
            n = await until(A, 'Object.keys(window.__game.G.players).length === 2')
            ok(n is True, 'Host sieht beide Spieler')
            mia = "Object.values(window.__game.G.players).find(p => p.name === 'Mia')"
            # Bewegung
            await B.evaluate("(() => { const G = window.__game.G, me = G.players[G.me]; me.x += 2; me.z += 1; })()")
            me = await B.evaluate("(() => { const p = window.__game.G.players[window.__game.G.me]; return [p.x, p.z] })()")
            r = await until(A, f"(m => {{ const g = {mia}; return g && Math.abs(g.x - m[0]) < 0.6 && Math.abs(g.z - m[1]) < 0.6 }})", me)
            ok(r is True, 'Host sieht die Bewegung des Gastes')
            # Sandburg: Name kommt vom Host, nicht vom Gast
            await B.evaluate("""(() => { const {G, S, send} = window.__game; let p = null;
                for (let x = -30; x <= 30 && !p; x++) for (let z = -30; z <= 30 && !p; z++) { const k = S.key(x, z); if (S.sandX(x, z) && !G.s.digs.includes(k) && !G.s.obj[k] && !G.s.shells?.[k] && !G.s.ground?.[k] && !G.s.drift?.[k] && !S.resAt(G.s, k)) p = [x, z]; }
                send({ t: 'castle', op: 'build', x: p[0], z: p[1], name: 'Schummel' }); })()""")
            r = await until(A, "Object.keys(window.__game.G.s.castles || {}).length > 0 && JSON.stringify(Object.values(window.__game.G.s.castles).map(c => [c.name, c.by]))")
            ok(isinstance(r, str) and 'Mia' in r and 'Schummel' not in r, f'Sandburg des Gastes {r}')
            # Riff entdecken (Gast) -> beide sehen es
            await B.evaluate("window.__game.send({ t: 'reef', op: 'found' })")
            ok(await until(A, 'window.__game.G.s.reef?.found > 0') is True, 'Riff entdeckt (vom Gast)')
            ok(await until(B, 'window.__game.G.s.reef?.found > 0 && Object.keys(window.__game.G.s.castles || {}).length === 1') is True, 'Gast sieht Riff & Burg (Teil-Updates)')
            # Vier gewinnt: Gast fordert Host heraus, abwechselnd ziehen
            hk = await A.evaluate('window.__game.G.players[window.__game.G.me].key')
            await B.evaluate("k => window.__game.send({ t: 'game', op: 'start', k: 'c4', vs: k, vsName: 'Shawn', name: 'Mia' })", hk)
            await until(A, 'window.__game.G.s.game?.k === "c4"')
            for i in range(6):
                await until(A, f'(n => (window.__game.G.s.game?.b || []).filter(v => v >= 0).length >= n)', i)
                turn_host = await A.evaluate("(() => { const g = window.__game.G.s.game; return g.p[g.turn].name === 'Shawn' })()")
                pg = A if turn_host else B
                await until(pg, f'(n => (window.__game.G.s.game?.b || []).filter(v => v >= 0).length >= n)', i)
                await pg.evaluate("(() => { const g = window.__game.G.s.game; const c = [3, 3, 3, 3, 2, 4, 1].find(c => g.b[c] < 0); window.__game.send({ t: 'game', op: 'move', col: c }); })()")
            r = await until(A, "(() => { const g = window.__game.G.s.game; return g && g.b.filter(v => v >= 0).length >= 6 && [g.p.map(p => p.name), g.b.filter(v => v >= 0).length] })()")
            ok(isinstance(r, list) and r[0] == ['Mia', 'Shawn'], f'Vier gewinnt Gast gegen Host {r}')
            # Sternbild & Foto vom Gast
            await B.evaluate("window.__game.send({ t: 'sternbild', op: 'add', n: 'Mias Stern', sec: 2, l: [[0, 1]], by: 'Mia' })")
            await B.evaluate("window.__game.send({ t: 'photoentry', score: 60, img: 'data:image/jpeg;base64,AAAA', name: 'Mia' })")
            r = await until(A, "(() => { const s = window.__game.G.s; return s.consts?.length && Object.keys(s.photoc?.entries || {}).length && [s.consts.map(c => c.n), Object.values(s.photoc.entries).map(e => e.name)] })()")
            ok(r == [['Mias Stern'], ['Mia']], f'Sternbild & Foto vom Gast {r}')
            # Gast richtet Miras Zimmer ein (3 Herzen nötig)
            await A.evaluate(f"(() => {{ const {{G, S}} = window.__game; S.friendX(G.s, 'mira').f = 500; (G.s.pinv[{mia}.key] ||= {{}}).stuhl = 1; G.dirty = true; }})()")
            await until(B, 'window.__game.G.s.inv?.stuhl >= 1')
            await B.evaluate("(() => { const {G, S, send} = window.__game, me = G.players[G.me]; me.x = S.HOME_X; me.z = S.nroomZ('mira') + 1.5; send({ t: 'hplace', x: 1, z: 0, item: 'stuhl', r: 0, room: 'mira' }); })()")
            r = await until(A, "JSON.stringify(window.__game.G.s.nhome?.mira?.items || {}).includes('stuhl') && JSON.stringify(window.__game.G.s.nhome.mira.items)")
            ok(isinstance(r, str) and 'stuhl' in r, f'Gast richtet Miras Zimmer ein {r}')
            # Fahrrad & Drachen des Gastes sieht der Host
            await A.evaluate(f"(() => {{ const G = window.__game.G, k = {mia}.key; Object.assign(G.s.pinv[k] ||= {{}}, {{ fahrrad: 1, drache: 1 }}); G.dirty = true; }})()")
            await until(B, 'window.__game.G.s.inv?.fahrrad >= 1')
            await B.evaluate("window.__game.travel('island')")  # draußen – im Zimmer steigt man vom Rad ab
            await B.evaluate("(() => { const G = window.__game.G, me = G.players[G.me]; me.bike = me.bk = true; G.kite = { t: 0, h: 60, best: 60, armed: true, cool: 0 }; })()")
            r = await until(A, f"(() => {{ const o = {mia}; return o?.bk === true && o?.kh > 10 && [o.bk, o.kh] }})()")
            ok(isinstance(r, list), f'Host sieht Fahrrad & Drachen des Gastes {r}')
            # Inselleben 7: Gast führt den Laternenumzug an – beim Host laufen die Nachbarn hinterher; Gast trägt einen Umzugskarton
            await B.evaluate("(() => { const G = window.__game.G, me = G.players[G.me]; me.bike = me.bk = false; G.kite = null; })()")
            await A.evaluate(f"(() => {{ const {{G}} = window.__game, s = G.s; s.day = 20; s.dayTime = (19 - 6) / 18; (s.pinv[{mia}.key] ||= {{}}).papierlaterne = 1; G.dirty = true; }})()")
            await until(B, 'window.__game.G.s.day === 20 && window.__game.G.s.inv?.papierlaterne >= 1')
            await B.evaluate("window.__game.send({ t: 'fests2', op: 'pstart' })")
            await B.evaluate("(async () => { const G = window.__game.G, me = G.players[G.me]; for (let i = 0; i < 12; i++) { me.x = -6 + i * 0.6; me.z = 4; await new Promise(r => setTimeout(r, 200)); } })()")
            r = await until(A, "(() => { const P = window.__game.world.parade7; return P && P.trail.length > 3 && P.trail.length })()")
            ok(isinstance(r, int) and r > 3, f'Host sieht den Umzug des Gastes (Spur {r})')
            await A.evaluate(f"(() => {{ const {{G}} = window.__game, s = G.s; s.moving = {{ id: 'pingo', home: '8,8', boxes: [[5, 5], [6, 5]], done: 0, hold: {{ [{mia}.key]: 0 }}, day: s.day }}; G.dirty = true; }})()")
            r = await until(B, "(() => { const G = window.__game.G; return G.players[G.me].hb === true })()")
            ok(r is True, 'Gast trägt einen Karton (sichtbar)')
            r = await until(A, f"(() => {{ const o = {mia}; return o?.hb === true }})()")
            ok(r is True, 'Host sieht den Karton des Gastes')
            # Inselleben 8: Sonnenuntergang zu zweit auf der Klippenbank, Hochzeit – der Gast sagt auch Ja
            await A.evaluate("(() => { const {G} = window.__game, s = G.s; s.moving = null; s.dayTime = (18.6 - 6) / 18; s.weather = 'sun'; s.obj['2,-3'] = { k: 'klippenbank', r: 0 }; G.dirty = true; })()")
            await until(B, "window.__game.G.s.obj['2,-3']?.k === 'klippenbank'")
            await A.evaluate("(() => { const {G} = window.__game, me = G.players[G.me]; Object.assign(me, { x: 2 - 0.36, z: -3, ry: 0, pose: 'sit' }); })()")
            await B.evaluate("(() => { const {G} = window.__game, me = G.players[G.me]; Object.assign(me, { x: 2 + 0.36, z: -3, ry: 0, pose: 'sit' }); })()")
            r = await until(A, "(window.__game.G.s.bench8?.n || 0) >= 1 && window.__game.G.s.bench8.n")
            ok(r == 1, f'Sonnenuntergang zu zweit auf der Klippenbank ({r})')
            await A.evaluate("(() => { const {G, send} = window.__game; for (const id in G.players) G.players[id].pose = null; delete G.s.obj['2,-3']; G.s.obj['4,-2'] = { k: 'kapelle', r: 0 }; G.dirty = true; send({ t: 'wed', op: 'start', x: 4, z: -2 }); })()")
            await until(B, "!!window.__game.G.s.wedding")
            await A.evaluate("(() => { const {G, send} = window.__game; G.players[G.me].pose = null; G.s.time += 30; G.dirty = true; send({ t: 'wed', op: 'yes' }); })()")
            r = await until(B, "window.__game.G.ctx?.wedYes === true")
            await B.evaluate("window.__game.send({ t: 'wed', op: 'yes' })")
            r = await until(A, "window.__game.G.s.married?.names?.length === 2 && window.__game.G.s.married.names")
            ok(r == ['Shawn', 'Mia'], f'Hochzeit: beide sagen Ja {r}')
            r = await until(B, "window.__game.G.s.inv?.ehering >= 1 && document.getElementById('wed8').textContent.includes('verheiratet')")
            ok(r is True, 'Gast hat den Ring und sieht die Feier')
            # Inselleben 10: Gast kuschelt mit dem Host und schenkt einen Strauß -> Herzpunkte im gemeinsamen Herzensbuch
            hid = await A.evaluate('window.__game.G.me')
            await A.evaluate(f"(() => {{ const {{G}} = window.__game, me = G.players[G.me], o = {mia}; Object.assign(o, {{ x: me.x + 1, z: me.z }}); (G.s.pinv[o.key] ||= {{}}).rosenstrauss = 1; G.dirty = true; }})()")
            await until(B, 'window.__game.G.s.inv?.rosenstrauss >= 1')
            await B.evaluate("(() => { const {G} = window.__game, h = Object.values(G.players).find(p => p.name === 'Shawn'), me = G.players[G.me]; Object.assign(me, { x: h.x + 1, z: h.z }); })()")
            await B.wait_for_timeout(400)
            await B.evaluate("hid => window.__game.G.conn.send({ t: 'soc', id: hid, k: 'cuddle' })", hid)
            r = await until(A, "(window.__game.G.s.love?.pts || 0) >= 1 && (window.__game.G.s.diary || []).some(d => d.text.includes('gekuschelt')) && window.__game.G.s.love.pts")
            ok(r == 1, f'Kuscheln zählt im Herzensbuch ({r})')
            await B.evaluate("hid => window.__game.send({ t: 'give', item: 'rosenstrauss', n: 1, to: hid })", hid)
            r = await until(A, "(window.__game.G.s.inv?.rosenstrauss || 0) >= 1 && window.__game.G.s.love.pts")
            ok(r == 4, f'Strauß verschenkt: Host hat ihn, +3 Herzpunkte ({r})')
            r = await until(B, "window.__game.G.s.love?.pts === 4 && document.querySelector('#toasts') !== null")
            ok(r is True, 'Gast sieht die Herzpunkte')
            # Inselleben 11: Dinner zu zweit – der Gastgeber prüft, dass beide am Tisch sind
            await A.evaluate(f"(() => {{ const {{G, S}} = window.__game, o = {mia}; G.s.home.items = {{ '0,0': {{ k: 'dinnertisch', r: 0 }} }}; (G.s.pinv[o.key] ||= {{}}).cupcake = 1; Object.assign(G.players[G.me], {{ x: S.HOME_X - 1, z: 1.4 }}); G.dirty = true; }})()")
            await until(B, "window.__game.G.s.inv?.cupcake >= 1 && !!window.__game.G.s.home.items['0,0']")
            await B.evaluate("(() => { const {G, S} = window.__game; Object.assign(G.players[G.me], { x: S.HOME_X + 1, z: 1.4 }); })()")
            await until(A, f"(() => {{ const o = {mia}, S = window.__game.S; return Math.abs(o.x - S.HOME_X - 1) < 0.3 }})()")
            p0 = await A.evaluate('window.__game.G.s.love.pts')
            await B.evaluate("window.__game.send({ t: 'dinner11', x: 0, z: 0, room: null, names: ['Schummel'] })")
            r = await until(A, f"(window.__game.G.s.love.pts >= {p0 + 3}) && (window.__game.G.s.diary || []).at(-1).text")
            ok(isinstance(r, str) and 'Mia' in r and 'Shawn' in r and 'Schummel' not in r, f'Dinner zu zweit: {r}')
            # Inselleben 15: Polaroid (auch nach dem Vollabgleich noch da), Glückskeks, Adventstürchen, Federball zu zweit, Mühle
            key = await A.evaluate(f"({mia}).key")
            img = 'data:image/jpeg;base64,' + 'A' * 2000
            await A.evaluate("img => window.__game.send({ t: 'pola15', op: 'set', slot: 3, img, cap: 'Wir zwei' })", img)
            r = await until(B, "window.__game.G.s.pola?.img?.[3]?.length === 2023 && window.__game.G.s.pola.cap[3]")
            ok(r == 'Wir zwei', f'Polaroid kommt beim Gast an ({r})')
            await A.evaluate("import('/src/extras15.js').then(E => { E.setClock15(() => new Date(2026, 11, 2)); })")
            await B.evaluate("import('/src/extras15.js').then(E => { E.setClock15(() => new Date(2026, 11, 2)); })")
            await B.evaluate("window.__game.send({ t: 'cookie15' })")
            r = await until(A, "!!window.__game.G.s.luck && Object.keys(window.__game.G.s.cookie.who).length === 1 && window.__game.G.s.luck.k")
            ok(isinstance(r, str), f'Glückskeks vom Gast legt das Tagesglück fest ({r})')
            await B.evaluate("window.__game.send({ t: 'advent15', d: 1 })")
            r = await until(A, f"(() => {{ const s = window.__game.G.s, o = {mia}; return s.advent?.open?.[o.key]?.includes(1) && !(s.advent.open.host || []).includes(1) && (s.pinv[o.key].kakao || 0) }})()")
            ok(r == 2, f'Adventstürchen: der Gast bekommt sein eigenes Geschenk ({r})')
            await A.evaluate("([key]) => window.__game.send({ t: 'rally15', op: 'start', vs: key, vsName: 'Mia', name: 'Shawn' })", [key])
            r = await until(B, "window.__game.G.s.rally?.on === 1 && window.__game.panels.open")
            ok(r == 'rally15', f'Federball: Beim Gast geht das Fenster von selbst auf ({r})')
            await A.evaluate("window.__game.send({ t: 'rally15', op: 'hit' })")
            r = await until(B, "window.__game.G.s.rally.n === 1 && window.__game.G.s.rally.turn === 1 && !!window.__game.G.r15 && document.querySelector('.rhit15')?.disabled === false")
            ok(r is True, 'Federball: Nach dem Schlag des Hosts ist der Gast dran')
            await B.evaluate("(() => { const W = window.__game.G.r15; W.t = (W.z0 + W.zw / 2) * W.dur; document.querySelector('.rhit15').click(); })()")
            r = await until(A, "window.__game.G.s.rally.n === 2 && window.__game.G.s.rally.turn === 0")
            ok(r is True, 'Federball: Der Gast schlägt im Fenster zurück')
            await A.evaluate("window.__game.send({ t: 'rally15', op: 'miss' })")
            r = await until(B, "window.__game.G.s.rally.on === 0 && window.__game.G.s.rally.best")
            ok(r == 2, f'Federball: Rekord zu zweit steht bei beiden ({r})')
            await A.evaluate("([key]) => { const g = window.__game; g.send({ t: 'game', op: 'quit' }); g.send({ t: 'game', op: 'start', k: 'muehle', vs: key, vsName: 'Mia', name: 'Shawn' }); }", [key])
            await until(B, "window.__game.G.s.game?.k === 'muehle'")
            first = await A.evaluate("window.__game.G.s.game.turn")
            await (A if first == 0 else B).evaluate("window.__game.send({ t: 'game', op: 'mplace', i: 4 })")
            r = await until(B if first == 0 else A, f"window.__game.G.s.game.b[4] === {first} && window.__game.G.s.game.turn === {1 - first}")
            ok(r is True, 'Mühle zu zweit: Der gesetzte Stein kommt drüben an')
            await A.evaluate("window.__game.send({ t: 'game', op: 'quit' })")
            await asyncio.sleep(17)  # länger als der Abstand zwischen zwei Vollabgleichen (15 s)
            r = await B.evaluate("[window.__game.G.s.pola?.img?.[3]?.length, window.__game.G.sRaw?.pola?.img?.[3]?.length]")
            ok(r == [2023, 2023], f'Polaroid bleibt beim Gast auch nach dem Vollabgleich ({r})')
            await b.close()
    finally:
        for pr in procs: pr.terminate()
    for e in errs[:10]: print('  ⚠️', e)
    ok(not errs, f'keine JS-Fehler ({len(errs)})')
    print('\n' + ('ALLES OK' if not fails else f'{len(fails)} FEHLGESCHLAGEN'))
    sys.exit(1 if fails else 0)

asyncio.run(main())
