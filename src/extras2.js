// Inselleben 2: Nachbar-Geschichten, Bauernhof-Ecke, Korallenriff, Strand-Wettbewerbe (Sandburgen & Drachen),
// Fahrrad und Seilbahn. Läuft wie extras.js beim Host in der Spiellogik.
// Modul-Kreis mit state.js/extras.js: deren Funktionen nur innerhalb von Funktionen benutzen.
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from './data.js';
import * as S from './state.js';
import * as X from './extras.js';
import { AREAS, nodeAt, inArea } from './areas.js';

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const fmt = n => Math.round(n).toLocaleString('de-DE');
const note = (s, title, text, item, n, from = 'rosi') => s.mail.push({ kind: 'note', from, title, text, item: item || null, n: n || 1, day: s.day });
const hour = s => 6 + s.dayTime * 18;

// =====================================================================
// Nachbar-Geschichten: vier Kapitel je Nachbar, jedes ab einer bestimmten Herzenzahl.
// give = Sachen vorbeibringen, ev = etwas tun (zählt ab dem Annehmen). Am Ende ein Geschenk, das es nur so gibt.
// =====================================================================
export const TALE_HEARTS = [1, 3, 5, 7];
export const TALES = {
  mira: { title: 'Das große Inselbrot', gift: 'zimtofen', ch: [
    { kind: 'give', item: 'weizen', n: 5, ask: 'Psst … ich habe einen geheimen Plan: Ich möchte ein Brot backen, so groß, dass die ganze Insel davon satt wird! Aber mir fehlt Weizen. Bringst du mir 5 Bündel?', done: 'Fünf Bündel! Der Teig fängt schon an zu träumen. Danke!' },
    { kind: 'give', item: 'kirsche', n: 5, ask: 'In die Mitte kommt eine Füllung. Kirschen! Rote, glänzende, saftige Kirschen. Fünf Stück würden reichen …', done: 'Sie duften himmlisch! Oh je, eine habe ich schon genascht. Pssst.' },
    { kind: 'give', item: 'holz', n: 10, ask: 'Für so ein großes Brot ist mein Ofen viel zu klein. Bruno baut mir einen Steinofen – aber er braucht 10 Holz zum Anheizen.', done: 'Der Ofen glüht! Ich habe noch nie so ein schönes Feuer gesehen.' },
    { kind: 'ev', ev: 'harvest', n: 8, ask: 'Zum Fest soll das Brot mit Blumen geschmückt werden. Erntet 8 Blumen oder Gemüse – dann ist alles bereit!', done: 'Das Inselbrot ist fertig! Alle haben ein Stück bekommen – und eins ist nur für dich. Und dazu … mein kleiner Zimtofen. Er soll bei dir wohnen.' },
  ] },
  bruno: { title: 'Vogelhäuschen für alle', gift: 'schnitzbank', ch: [
    { kind: 'give', item: 'holz', n: 10, ask: 'Hmm. Die Vögel auf der Insel haben kein Zuhause. Ich möchte für jeden ein Vogelhäuschen bauen. Hast du 10 Holz für mich?', done: 'Gutes Holz. Riecht nach Wald. Danke dir.' },
    { kind: 'ev', ev: 'chop', n: 10, ask: 'Ich brauche noch mehr. Hackst du mit mir 10-mal Holz? Zu zweit geht es gemütlicher.', done: 'Das war schön. Hacken, schnaufen, lachen. So mag ich das.' },
    { kind: 'give', item: 'eisen', n: 3, ask: 'Für die Dächer brauche ich kleine Nägel. 3 Eisen müssten reichen. Aus der Kristallhöhle oder vom Felsen.', done: 'Kling, klang. Die Dächer halten jetzt auch bei Sturm.' },
    { kind: 'give', item: 'lachs', n: 1, ask: 'Alle Häuschen hängen! Zum Feiern … würde ich so gern einen Lachs essen. Nur einen. Bitte?', done: 'Ein Lachs! Du bist die Beste. Der Beste. Hier – meine alte Schnitzbank. Ich habe eine neue gebaut. Für dich.' },
  ] },
  pippa: { title: 'Der legendäre Riesenfisch', gift: 'gluecksboje', ch: [
    { kind: 'ev', ev: 'fish', n: 5, ask: 'Ich habe ihn gesehen! Den RIESENFISCH! Er war so groß wie … wie ein Boot! Hilf mir üben: Fang 5 Fische!', done: 'Fünf! Du hast ein Händchen dafür. Ich auch. Meistens.' },
    { kind: 'give', item: 'herzmuschel', n: 3, ask: 'Meine Oma sagte: Wer drei Herzmuscheln in der Tasche hat, dem beißt das Glück. Bringst du mir drei?', done: 'Jetzt kann nichts mehr schiefgehen! Hoffe ich.' },
    { kind: 'ev', ev: 'fish', n: 10, ask: 'Er war wieder da! Und wieder weg. Wir müssen noch besser werden. 10 Fische – los geht\'s!', done: 'Wir sind ein unschlagbares Angelteam!' },
    { kind: 'give', item: 'makrele', n: 3, ask: 'Riesenfische lieben Makrelen. Mit 3 Makrelen als Köder locken wir ihn an!', done: 'ER HAT ANGEBISSEN! … und ist wieder abgehauen. Aber ich habe ihn GESEHEN, und du auch! Das zählt. Hier, meine Glücksboje – sie leuchtet nachts wie seine Augen.' },
  ] },
  lio: { title: 'Das große Inselgemälde', gift: 'staffelei', ch: [
    { kind: 'give', item: 'rose', n: 3, ask: 'Ich male das schönste Bild aller Zeiten: die Insel! Und vorne drauf: Rosen. Bringst du mir 3 als Modell?', done: 'Perfekt. Fast so hübsch wie ich. Fast.' },
    { kind: 'give', item: 'koralle', n: 2, ask: 'Mir geht das Rot aus! Aus Korallen kann man die schönste Farbe mischen. 2 Korallen, bitte!', done: 'Dieses Rot! Das Meer hat es mir geschenkt – und du.' },
    { kind: 'ev', ev: 'harvest', n: 10, ask: 'Ich brauche einen Blumenhimmel im Hintergrund. Erntet 10 Blumen, ich schaue euch beim Pflücken zu und male.', done: 'Ich habe dich auch gemalt. Mit Hut. Ich finde, er steht dir.' },
    { kind: 'give', item: 'sonnenblume', n: 3, ask: 'Der letzte Pinselstrich fehlt: Sonnenblumen in die Ecke. 3 Stück, und das Bild ist fertig!', done: 'Fertig! Es hängt jetzt im Rathaus. Und meine alte Staffelei schenke ich dir – vielleicht malst du ja auch bald!' },
  ] },
  kalle: { title: 'Die perfekte Teemischung', gift: 'teetischchen', ch: [
    { kind: 'give', item: 'orange', n: 4, ask: 'Ich suche seit Jahren die perfekte Teemischung … Beginnen wir mit Orangen. Vier Stück, wenn es dir keine Mühe macht.', done: 'Fruchtig. Frisch. Ein guter Anfang. Wir haben Zeit.' },
    { kind: 'ev', ev: 'water', n: 20, ask: 'Guter Tee braucht gute Kräuter, und gute Kräuter brauchen Wasser. Gieß 20-mal Blumen – ganz in Ruhe.', done: 'Spürst du, wie der Garten dankt? Ich schon.' },
    { kind: 'give', item: 'honig', n: 2, ask: 'Etwas Süße fehlt. Honig von der Blütenwiese – zwei Gläser, bitte.', done: 'Mmh. Jetzt summt der Tee fast von selbst.' },
    { kind: 'give', item: 'kokosnuss', n: 2, ask: 'Das Geheimnis … ist Kokos. Zwei Kokosnüsse noch, dann ist sie vollendet: die Kuschelinsel-Mischung.', done: 'Probier mal … Siehst du? Die perfekte Tasse. Mein Teetischchen soll ab jetzt bei dir stehen – für viele gemütliche Nachmittage.' },
  ] },
  wanda: { title: 'Das Rätsel der Sterne', gift: 'sternteleskop', ch: [
    { kind: 'ev', ev: 'bug', n: 5, ask: 'Ich habe eine Theorie: Glühwürmchen und Sterne sind verwandt! Für meine Forschung brauche ich Beobachtungen. Fang 5 Krabbeltiere!', done: 'Hochinteressant! Meine Notizen werden immer länger.' },
    { kind: 'give', item: 'kristall', n: 2, ask: 'Für mein Messgerät brauche ich zwei Kristalle. Sie bündeln das Sternenlicht.', done: 'Es funkelt! Die Wissenschaft dankt dir.' },
    { kind: 'ev', ev: 'dig', n: 5, ask: 'Vielleicht ist einmal ein Stern auf die Insel gefallen! Grab an 5 Stellen – wer weiß, was wir finden.', done: 'Sternsplitter-Spuren! Ich wusste es!' },
    { kind: 'give', item: 'perle', n: 1, ask: 'Das letzte Stück fehlt: eine Perle als Linse. Sie ist selten, ich weiß … aber dann sehen wir die Sterne ganz nah!', done: 'Schau durch! Siehst du den Sternenhaufen? Er sieht aus wie unsere Insel! Das Teleskop gehört dir – erforsche weiter!' },
  ] },
};
// Status: s.tales[id] = { ch: Kapitel 0–4 (4 = fertig), on: angenommen, p: Fortschritt (ev), ok: bereit zum Abschließen }
export function taleState(s, id) {
  const T = TALES[id], t = s.tales?.[id] || { ch: 0 };
  if (!T || t.ch >= T.ch.length) return { done: true, t };
  const C = T.ch[t.ch], need = TALE_HEARTS[t.ch], heartsOk = S.hearts(s, id) >= need;
  return { T, C, t, need, heartsOk, ready: heartsOk && !t.on, active: !!t.on };
}
export const taleMark = (s, id) => { const st = taleState(s, id); return st.done ? '' : st.ready ? ' 📖' : st.active && (st.t.ok || (st.C.kind === 'give' && (s.inv?.[st.C.item] || 0) >= st.C.n)) ? ' ✨' : ''; };
export function taleEvent(s, ev, n, out) {
  for (const [id, t] of Object.entries(s.tales || {})) {
    const C = TALES[id]?.ch[t.ch];
    if (!t.on || !C || C.kind !== 'ev' || C.ev !== ev || t.ok) continue;
    t.p = Math.min(C.n, (t.p || 0) + n);
    if (t.p >= C.n) { t.ok = 1; if (out) out.taleReady = NPC_DATA[id].name; }
  }
}
function tale(s, a, out) {
  const st = taleState(s, a.id);
  if (!TALES[a.id] || st.done) return false;
  s.tales ||= {};
  const t = s.tales[a.id] ||= { ch: 0 };
  if (a.op === 'start') {
    if (!st.ready) return false;
    Object.assign(t, { on: 1, p: 0, ok: 0 });
    out.taleSay = st.C.ask;
    out.msg = `📖 ${TALES[a.id].title} – Kapitel ${t.ch + 1}`;
    return true;
  }
  if (a.op === 'finish') {
    if (!t.on) return false;
    const C = st.C;
    if (C.kind === 'give') { if (!S.takeInvX(s, C.item, C.n)) { out.msg = `Dafür brauchst du ${C.n}× ${ITEMS[C.item].icon} ${ITEMS[C.item].name}.`; return false; } }
    else if (!t.ok) return false;
    const last = t.ch === TALES[a.id].ch.length - 1, pay = 800 + t.ch * 700;
    Object.assign(t, { ch: t.ch + 1, on: 0, p: 0, ok: 0 });
    s.money += pay; s.stats.earned += pay;
    S.friendX(s, a.id).f += 60;
    out.taleSay = C.done;
    out.msg = `📖 Kapitel geschafft! +${fmt(pay)} Taler, +💕`;
    out.snd = 'fanfare';
    if (last) {
      const gift = TALES[a.id].gift;
      S.addInvX(s, gift, 1);
      out.got = gift;
      s.stats.tales = (s.stats.tales || 0) + 1;
      (s.diary ||= []).push({ day: s.day, icon: '📖', text: `${NPC_DATA[a.id].name}s Geschichte „${TALES[a.id].title}“ zu Ende erlebt!` });
      X.moment(s, 'tale:' + a.id, NPC_DATA[a.id].icon, TALES[a.id].title, `Die ganze Geschichte mit ${NPC_DATA[a.id].name} – vom ersten Kapitel bis zum Geschenk.`, out);
    }
    return true;
  }
  return false;
}

// =====================================================================
// Bauernhof-Ecke: Hühnerstall & Kuhweide (Produzenten mit Tieren). Gefüttert wird jeden Tag, gestreichelt macht glücklich.
// =====================================================================
export const FARM_FOOD = { huehnerstall: ['weizen', 'kartoffel'], kuhweide: ['weizen', 'karotte', 'apfel'] };
export const farmHappy = o => Math.min(10, o?.h || 0);
// Darf der Produzent heute wachsen? (Tiere wollen gefüttert sein: heute oder gestern)
export const farmFed = (s, o) => o.fed >= s.day - 1;
export function farmResolve(s, o, x, z) {
  const p = PLACE[o.k], one = [[x, z]], kind = o.k === 'kuhweide' ? '🐄' : '🐔';
  if (o.t >= p.every) return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} ${o.k === 'kuhweide' ? 'Melken' : 'Eier einsammeln'}`, tiles: one };
  if (o.fed !== s.day) {
    const food = FARM_FOOD[o.k].find(f => s.inv?.[f] > 0);
    return food ? { a: { t: 'farm', op: 'feed', x, z, item: food }, label: `${ITEMS[food].icon} ${kind} füttern`, tiles: one } : { label: `${kind} haben Hunger: ${FARM_FOOD[o.k].map(f => ITEMS[f]?.icon).join(' ')} mitbringen`, tiles: one };
  }
  if (o.pet !== s.day) return { a: { t: 'farm', op: 'pet', x, z }, label: `🤗 ${kind} streicheln`, tiles: one };
  return { label: `${kind} ${'💗'.repeat(Math.ceil(farmHappy(o) / 2)) || '🤍'} – morgen gibt es mehr`, tiles: one };
}
function farm(s, a, out) {
  const k = `${a.x},${a.z}`, o = s.obj?.[k], p = o && PLACE[o.k];
  if (!p?.farm) return false;
  if (a.op === 'feed') {
    if (o.fed === s.day || !FARM_FOOD[o.k].includes(a.item) || !S.takeInvX(s, a.item, 1)) return false;
    o.fed = s.day;
    out.msg = o.k === 'kuhweide' ? '🐄 Muuuh! Die Kuh mampft zufrieden.' : '🐔 Gack gack! Die Hühner picken alles auf.';
    out.fx.push({ x: a.x, z: a.z, txt: '🌾', k: 'leaf' });
    out.snd = 'harvest';
    S.questEventX(s, 'farm', 1, out);
    return true;
  }
  if (a.op === 'pet') {
    if (o.pet === s.day) return false;
    o.pet = s.day;
    o.h = Math.min(10, (o.h || 0) + 1);
    out.msg = `${o.k === 'kuhweide' ? '🐄' : '🐔'} ${'💗'.repeat(Math.ceil(o.h / 2))} So glücklich!`;
    out.fx.push({ x: a.x, z: a.z, txt: '💕', k: 'heart' });
    out.snd = 'love';
    return true;
  }
  return false;
}
// Ernte mit Glücks-Bonus (aus state.use aufgerufen)
export function farmHarvest(s, o, p, out) {
  const n = p.n + (farmHappy(o) >= 5 ? 1 : 0), extra = farmHappy(o) >= 10 && Math.random() < (o.k === 'kuhweide' ? 0.3 : 0.15) ? (o.k === 'kuhweide' ? 'kaese' : 'goldei') : null;
  S.addInvX(s, p.item, n);
  if (extra) { S.addInvX(s, extra, 1); out.msg = `✨ Was für ein Glück: ${ITEMS[extra].icon} ${ITEMS[extra].name}!`; }
  s.stats.farm = (s.stats.farm || 0) + n;
  return n;
}

// =====================================================================
// Korallenriff: An der Riffboje abtauchen (Neoprenanzug), unten sammeln und 14 Plätze selbst gestalten.
// =====================================================================
export const REEF = { x: 0, z: 1200, r: 11 };
export const REEF_BUOY = [26, -17];
export const REEF_SLOTS = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = i % 2 ? 6.6 : 4.4; return [Math.round(Math.cos(a) * r * 10) / 10, Math.round(Math.sin(a) * r * 10) / 10 - 1]; });
export const REEF_DECO = ['koralle', 'seestern', 'seeanemone', 'auster', 'seeigel', 'perle', 'herzmuschel', 'jakobsmuschel', 'sanddollar', 'kauri', 'seeglas', 'riffkoralle'];
export const REEF_FINDS = [['koralle', 22], ['seestern', 16], ['seeanemone', 14], ['seeglas', 16], ['riffkoralle', 12], ['auster', 8], ['jakobsmuschel', 8], ['perle', 2]];
export const REEF_SPOTS = [[-7, 3], [7, 3], [-3, -7], [4, -6], [-8, -4], [8, -3], [0, 6]];
export const onReefExit = (lx, lz) => Math.abs(lx) <= 1.2 && lz >= REEF.r - 2.2;
export const reefWalk = (lx, lz) => Math.hypot(lx, lz) <= REEF.r - 0.4;
export function reefScore(s) {
  const v = Object.values(s.reef?.slots || {}).filter(Boolean);
  return { n: v.length, kinds: new Set(v).size, stars: Math.min(5, Math.floor((v.length + new Set(v).size * 2) / 6)) };
}
export function reefBlocked(s, x, z) {
  const lx = x - REEF.x, lz = z - REEF.z;
  if (!reefWalk(lx, lz)) return true;
  return REEF_SLOTS.some(([sx, sz], i) => s.reef?.slots?.[i] && Math.hypot(lx - sx, lz - sz) < 0.45);
}
export function resolveReef(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - REEF.x, lz = pz - REEF.z;
  if (onReefExit(me.x - REEF.x, me.z - REEF.z)) return { go: 'reefup', label: '🫧 Auftauchen', tiles: [] };
  const sp = REEF_SPOTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.1);
  if (sp >= 0) return s.reef?.got?.[sp] === s.day ? { label: '🫧 Heute schon abgesucht', tiles: [] } : { a: { t: 'reef', op: 'find', i: sp }, label: '🤿 Absuchen', tiles: [] };
  const sl = REEF_SLOTS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 0.8);
  if (sl >= 0) return { ui: 'reef', slot: sl, label: s.reef?.slots?.[sl] ? `🪸 ${ITEMS[s.reef.slots[sl]].name} · ändern` : '🪸 Hier etwas hinsetzen', tiles: [] };
  return { label: '', tiles: [] };
}
function reef(s, a, out) {
  s.reef ||= { found: 0, slots: {}, got: {} };
  const R = s.reef;
  if (a.op === 'found') {
    if (R.found) return false;
    R.found = s.day;
    X.moment(s, 'reef', '🪸', 'Das Korallenriff entdeckt', 'Unter der Boje lag ein ganzes Riff voller Farben – und es wartet darauf, gestaltet zu werden.', out);
    out.msg = '🪸 Ihr habt ein Korallenriff entdeckt! Sucht die Fundstellen ab und gestaltet die 14 Plätze mit Korallen und Muscheln.';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'find') {
    const i = a.i;
    if (!Number.isInteger(i) || !REEF_SPOTS[i] || R.got[i] === s.day) return false;
    R.got[i] = s.day;
    const tot = REEF_FINDS.reduce((t, f) => t + f[1], 0);
    let r = Math.random() * tot, id = 'koralle';
    for (const [f, w] of REEF_FINDS) if ((r -= w) <= 0) { id = f; break; }
    S.addInvX(s, id, 1);
    S.collectX(s, id, out);
    S.questEventX(s, 'dive', 1, out);
    out.fx.push({ x: REEF.x + REEF_SPOTS[i][0], z: REEF.z + REEF_SPOTS[i][1], txt: `+1 ${ITEMS[id].icon}`, k: 'splash' });
    out.got = id;
    out.snd = 'harvest';
    return true;
  }
  if (a.op === 'set') {
    if (!Number.isInteger(a.i) || !REEF_SLOTS[a.i]) return false;
    const old = R.slots[a.i];
    if (a.item === null) { if (!old) return false; delete R.slots[a.i]; S.addInvX(s, old, 1); out.msg = `${ITEMS[old].icon} zurück in die Tasche`; return true; }
    if (!REEF_DECO.includes(a.item) || !S.takeInvX(s, a.item, 1)) return false;
    if (old) S.addInvX(s, old, 1);
    R.slots[a.i] = a.item;
    const sc = reefScore(s);
    if (sc.stars >= 5 && !R.prize) {
      R.prize = s.day;
      note(s, '🪸 Euer Riff ist ein Wunder!', 'Liebe Riff-Gestalter,\nich bin mit Taucherbrille und Notizbuch zu eurem Riff getaucht – fünf Sterne! So viele Farben, so viele Fische! Als Dank: meine Korallenlampe. Sie leuchtet wie das Riff bei Nacht.\n\nEure Wanda 🔬', 'korallenlampe', 1, 'wanda');
      X.moment(s, 'reef5', '🐠', 'Ein Fünf-Sterne-Riff', 'Bunte Fische schwärmen jetzt um eure Korallen.', out);
    }
    out.msg = `🪸 ${ITEMS[a.item].icon} ${ITEMS[a.item].name} gesetzt · Riff: ${'⭐'.repeat(sc.stars) || '–'}`;
    out.snd = 'place';
    return true;
  }
  return false;
}

// =====================================================================
// Strand-Wettbewerbe: samstags 10–17 Uhr. Sommer: Sandburgen. Frühling & Herbst: Drachen steigen lassen.
// =====================================================================
export const beachKind = s => weekday(s.day) !== 6 ? null : { summer: 'sand', spring: 'kite', autumn: 'kite' }[S.seasonOf(s.day)] || null;
export const beachOpen = s => !!beachKind(s) && hour(s) >= 10 && hour(s) < 17 && !s.beach?.done;
export const CASTLE_MAX = 5;
export const castleScore = c => c.lv * 12 + Math.min(10, c.sh?.length || 0) * 4 + new Set(c.sh || []).size * 5;
export const SHELL_IDS = SHELLS.map(x => x[0]);
function beachStart(s) {
  const k = beachKind(s);
  s.beach = k ? { day: s.day, kind: k, judges: [...NPC_IDS].sort(() => Math.random() - 0.5).slice(0, 3), entries: {}, done: 0 } : null;
}
function beachFinish(s) {
  const b = s.beach;
  if (!b || b.done) return false;
  b.done = s.day;
  if (b.kind === 'sand') for (const [k, c] of Object.entries(s.castles || {})) if (c.by) b.entries[c.by] = { name: c.name, score: castleScore(c) + rnd(7), k };
  const list = Object.values(b.entries).sort((x, y) => y.score - x.score);
  if (!list.length) return true;
  const win = list[0], prize = b.kind === 'sand' ? 'strandpokal' : 'windpokal';
  b.winner = win.name;
  s.money += 3000; s.stats.earned += 3000;
  s.stats.beachWins = (s.stats.beachWins || 0) + 1;
  const jury = b.judges.map(id => NPC_DATA[id].icon + ' ' + NPC_DATA[id].name).join(', ');
  note(s, `🏆 ${b.kind === 'sand' ? 'Sandburgen' : 'Drachen'}-Wettbewerb: ${win.name} gewinnt!`, `Liebe Insel,\n${b.kind === 'sand' ? `die schönste Sandburg hat ${win.name} gebaut – ${win.score} Punkte!` : `${win.name}s Drache flog am höchsten – ${win.score} Meter!`} 3.000 Taler gehen in die Inselkasse, und der Pokal steht bereit.\n\nDie Jury: ${jury}`, prize, 1);
  (s.diary ||= []).push({ day: s.day, icon: b.kind === 'sand' ? '🏰' : '🪁', text: `${win.name} gewinnt den ${b.kind === 'sand' ? 'Sandburgen' : 'Drachen'}-Wettbewerb!` });
  X.moment(s, 'beach:' + s.day, b.kind === 'sand' ? '🏰' : '🪁', b.kind === 'sand' ? 'Sandburgen-Wettbewerb' : 'Drachenfest', `${win.name} hat gewonnen – mit ${win.score} ${b.kind === 'sand' ? 'Punkten' : 'Metern'}.`);
  return true;
}
export function castleResolve(s, x, z, sel) {
  const k = `${x},${z}`, c = s.castles?.[k], one = [[x, z]];
  if (c) {
    if (sel === 'shovel' && c.lv < CASTLE_MAX) return { a: { t: 'castle', op: 'grow', x, z }, label: `🏰 Weiterbauen (${c.lv}/${CASTLE_MAX})`, tiles: one };
    return { ui: 'castle', castle: k, label: `🏰 Sandburg von ${c.name}${c.sh?.length ? ' · 🐚 ' + c.sh.length : ''}`, tiles: one };
  }
  return null;
}
export const castleOk = (s, x, z) => { const k = `${x},${z}`; return !s.obj[k] && !s.shells?.[k] && !s.ground?.[k] && !S.resAt(s, k) && !s.drift?.[k] && Object.keys(s.castles || {}).length < 12; };
function castle(s, a, out) {
  s.castles ||= {};
  const k = `${a.x},${a.z}`, c = s.castles[k];
  if (a.op === 'build') {
    if (c || !S.sandX(a.x, a.z) || !castleOk(s, a.x, a.z)) return false;
    s.castles[k] = { lv: 1, sh: [], by: s._who || 'host', name: (a.name || 'Gast').slice(0, 16), day: s.day };
    out.msg = '🏰 Eine Sandburg! Mit der Schaufel weiterbauen, mit der Hand Muscheln draufsetzen.';
    out.fx.push({ x: a.x, z: a.z, txt: '🏰', k: 'dust' });
    out.snd = 'till';
    S.questEventX(s, 'castle', 1, out);
    return true;
  }
  if (!c) return false;
  if (a.op === 'grow') {
    if (c.lv >= CASTLE_MAX) return false;
    c.lv++;
    out.fx.push({ x: a.x, z: a.z, txt: '🏰'.repeat(Math.min(3, c.lv)), k: 'dust' });
    out.snd = 'till';
    return true;
  }
  if (a.op === 'shell') {
    if (!SHELL_IDS.includes(a.item) || (c.sh || []).length >= 10 || !S.takeInvX(s, a.item, 1)) return false;
    (c.sh ||= []).push(a.item);
    out.msg = `${ITEMS[a.item].icon} Schön! Burg-Punkte: ${castleScore(c)}`;
    out.snd = 'place';
    return true;
  }
  if (a.op === 'flat') { // Burg einebnen (eigene oder als Gastgeber)
    if (c.by !== (s._who || 'host') && (s._who || 'host') !== 'host') return false;
    for (const id of c.sh || []) S.addInvX(s, id, 1);
    delete s.castles[k];
    return true;
  }
  return false;
}
function kitescore(s, a, out) { // Ergebnis vom Drachen-Minispiel
  if (!(s.inv.drache > 0) || !Number.isInteger(a.score) || a.score < 0 || a.score > 120) return false;
  s.stats.kiteBest = Math.max(s.stats.kiteBest || 0, a.score);
  const b = s.beach;
  if (b?.kind === 'kite' && beachOpen(s)) {
    const who = s._who || 'host', e = b.entries[who];
    if (!e || a.score > e.score) b.entries[who] = { name: (a.name || 'Gast').slice(0, 16), score: a.score };
    out.msg = `🪁 ${a.score} Meter! ${e && a.score <= e.score ? `(Dein bester Flug: ${e.score} m)` : 'Neuer Bestwert beim Drachenfest!'}`;
  } else out.msg = `🪁 ${a.score} Meter hoch! (Rekord: ${s.stats.kiteBest} m)`;
  out.snd = a.score >= 60 ? 'fanfare' : 'ach';
  return true;
}

// =====================================================================
// Seilbahn (Rathaus-Projekt): Station auf der Insel, Haltestellen in den freigeschalteten Gebieten.
// =====================================================================
export const cableBuilt = s => Object.entries(s.obj || {}).find(([, o]) => o?.k === 'seilbahn') || null;
const stops = {};
export function cableStop(id) { // Haltestelle im Gebiet: freier Platz vorne links (nicht auf Bäumen oder Erz)
  if (stops[id]) return stops[id];
  const A = AREAS[id];
  for (let lz = A.d - 2; lz > 0; lz--) for (let lx = -A.w + 2; lx < 0; lx++) {
    let free = true;
    for (let i = -1; i <= 1 && free; i++) for (let j = -1; j <= 1; j++) if (nodeAt(id, lx + i, lz + j) || !inArea(id, lx + i, lz + j)) { free = false; break; }
    if (free) return (stops[id] = [A.x + lx, A.z + lz]);
  }
  return (stops[id] = [A.x - A.w + 2, A.z + A.d - 2]);
}

// ---------- Morgen, Laden, Ticken ----------
export function migrateY(s) {
  s.tales = s.tales && typeof s.tales === 'object' ? Object.fromEntries(Object.entries(s.tales).filter(([id, t]) => TALES[id] && t && Number.isInteger(t.ch)).map(([id, t]) => [id, { ch: Math.max(0, Math.min(TALES[id].ch.length, t.ch)), on: t.on ? 1 : 0, p: Number.isFinite(t.p) ? t.p : 0, ok: t.ok ? 1 : 0 }])) : {};
  const r = s.reef && typeof s.reef === 'object' ? s.reef : {};
  s.reef = { found: Number.isInteger(r.found) ? r.found : 0, slots: Object.fromEntries(Object.entries(r.slots || {}).filter(([i, id]) => REEF_SLOTS[i] && REEF_DECO.includes(id))), got: r.got && typeof r.got === 'object' ? r.got : {}, prize: r.prize || 0 };
  s.castles = s.castles && typeof s.castles === 'object' ? Object.fromEntries(Object.entries(s.castles).filter(([k, c]) => /^-?\d+,-?\d+$/.test(k) && c && Number.isInteger(c.lv))) : {};
  if (beachKind(s) && s.beach?.day !== s.day) beachStart(s);
  if (s.beach && s.beach.day !== s.day) s.beach = null;
}
export function morningY(s) {
  if (s.beach && !s.beach.done) beachFinish(s);
  // Die Flut holt die Sandburgen (Muscheln bleiben liegen, wer sie wiederhaben will, ebnet vorher ein)
  s.castles = {};
  beachStart(s);
}
export function tickY(s, dt) {
  let changed = false;
  if (s.beach && !s.beach.done && hour(s) >= 17) changed = beachFinish(s) || changed;
  return changed;
}

export const Y_ACTIONS = { tale, farm, reef, castle, kitescore };
