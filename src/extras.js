// Inselleben-Erweiterungen: Inselzeitung, Fotobuch, Jahrestage, Möbelkatalog, Wochenziele, Wetter.
// Alles hier läuft beim Host (bzw. allein) in der Spiellogik und wird mit dem Spielstand gespeichert.
// Achtung: state.js importiert dieses Modul und umgekehrt – darum werden state.js-Funktionen nur in Funktionen benutzt.
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, WEEKDAYS, weekday, FESTS, SEASONS } from './data.js';
import { FURNITURE } from './furni-data.js';
import * as S from './state.js';
import * as Y from './extras2.js';
import * as Z from './extras3.js';
import { TRIP, TRIP_PRICE, TRIP_KINDS, tripLayout, tripNodeAt, onTripDock, tripWalk, SOLID_TRIP, tripUses, nodeThing, TRIP_BUGS, TRIP_FISH } from './trips.js';

// Pixel-Muster prüfen (wie in patterns.js, aber ohne three.js, damit es in Node-Tests läuft)
export const PAT_SLOTS = 8;
// Inselmelodie: Töne als MIDI-Nummern (Pentatonik, klingt immer schön)
export const MEL_NOTES = [0, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
export const MEL_DEFAULT = [6, 0, 5, 3, 4, 0, 3, 1, 2, 3, 4, 0, 6, 5, 6, 0];
const validPx = px => typeof px === 'string' && /^[0-9a-f]{256}$/.test(px);

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const fmt = n => Math.round(n).toLocaleString('de-DE');
const note = (s, title, text, item, n, from = 'rosi') => s.mail.push({ kind: 'note', from, title, text, item: item || null, n: n || 1, day: s.day });

// ---------- Wetter ----------
// sun · rain · snow · storm (Gewitter) · fog (Nebel). Sternenhimmel = klare Nacht (s.starNight).
export const WEATHER = {
  sun: ['☀️', 'Sonnenschein'], rain: ['🌧️', 'Regen'], snow: ['🌨️', 'Schnee'], storm: ['⛈️', 'Gewitter'], fog: ['🌫️', 'Nebel'],
};
export const isWet = s => s.weather === 'rain' || s.weather === 'snow' || s.weather === 'storm';
export const isRainy = s => s.weather === 'rain' || s.weather === 'storm';
export function rollWeather(day) {
  const sea = S.seasonOf(day), r = Math.random();
  if (day <= 2) return 'sun';
  const wet = { spring: 0.25, summer: 0.15, autumn: 0.28, winter: 0.35 }[sea];
  if (r < wet) {
    if (sea === 'winter') return 'snow';
    return Math.random() < (sea === 'summer' ? 0.4 : 0.22) ? 'storm' : 'rain';
  }
  if (r < wet + (sea === 'autumn' ? 0.14 : sea === 'spring' ? 0.08 : sea === 'winter' ? 0.07 : 0.03)) return 'fog';
  return 'sun';
}
// Wetter-Bedingung eines Fisches/Krabbeltiers: storm/fog = heutiges Wetter, stars = klare Sternennacht
export const wxOk = (s, w, night) => !w || (w === 'stars' ? !!s.starNight && (night ?? (6 + s.dayTime * 18 >= 20)) : s.weather === w);
// Vom alten Morgen-Code aufgerufen: heutiges Wetter (wie vorhergesagt) und Vorhersage für morgen
export function nextWeather(s) {
  const w = WEATHER[s.wxNext] && s.wxNext ? s.wxNext : rollWeather(s.day);
  s.wxNext = rollWeather(s.day + 1);
  return w;
}

// ---------- Fotobuch: besondere Momente ----------
// [Schlüssel, Bedingung, Symbol, Titel, Text] – jede Seite gibt es nur einmal
const MOMENTS = [
  ['fish1', s => s.stats.fish >= 1, '🎣', 'Der erste Fisch', 'Zappelnd und glitzernd – der allererste Fang der Insel!'],
  ['bug1', s => s.stats.bugs >= 1, '🦋', 'Das erste Krabbeltier', 'Ganz vorsichtig mit dem Kescher – und schon war es drin.'],
  ['dug1', s => s.stats.dug >= 1, '✨', 'Etwas ausgegraben!', 'Unter einem Stern-Riss lag ein Fundstück versteckt.'],
  ['house2', s => (s.up?.house || 1) >= 2, '🏡', 'Ein größeres Zuhause', 'Mehr Platz für Möbel, Kuscheln und Gemütlichkeit.'],
  ['house4', s => (s.up?.house || 1) >= 4, '🏰', 'Ein richtiges Traumhaus', 'Mit Obergeschoss-Gefühl – das Haus ist kaum wiederzuerkennen.'],
  ['project1', s => (s.mayor?.built || 0) >= 1, '🏗️', 'Das erste Inselprojekt', 'Gemeinsam gespendet, gemeinsam eingeweiht!'],
  ['museum10', s => Object.keys(s.museum || {}).length >= 10, '🏛️', '10 Stücke im Museum', 'Wanda war ganz aus dem Häuschen.'],
  ['museum40', s => Object.keys(s.museum || {}).length >= 40, '🏛️', '40 Stücke im Museum', 'Das Museum wird langsam richtig berühmt.'],
  ['opal', s => !!s.album?.opal, '🫧', 'Ein Opal!', 'Tief in der Kristallhöhle schimmerte er in allen Farben.'],
  ['area1', s => Object.values(s.areas || {}).some(Boolean), '🗺️', 'Neues Land entdeckt', 'Hinter dem Tor wartete ein ganz neues Stück Insel.'],
  ['stars3', s => (s.stars || 1) >= 3, '⭐', 'Drei Inselsterne', 'Rosi hat ein Extra-Lob ins Rathaus gehängt.'],
  ['stars5', s => (s.stars || 1) >= 5, '🌟', 'Fünf Sterne – eine Trauminsel!', 'Die schönste Insel weit und breit. Zeit für ein Sternenfest!'],
  ['tree1', s => (s.stats.replanted || 0) >= 1, '🌳', 'Ein Baum zieht um', 'Mit der Baumschaufel ausgegraben und an einen schöneren Platz gesetzt.'],
  ['level5', s => s.level >= 5, '🎈', 'Level 5', 'Die Insel wächst – und ihr mit ihr.'],
  ['level10', s => s.level >= 10, '🎉', 'Level 10', 'Richtige Insel-Profis seid ihr geworden!'],
  ['treasure', s => (s.stats.bigTreasure || 0) >= 1, '🏴‍☠️', 'Der große Schatz', 'Vier Kartenstücke, ein Kreuz im Sand – und dann klirrte die Schaufel.'],
  ['cookwin', s => (s.stats.cookWins || 0) >= 1, '🏆', 'Sieg beim Kochwettbewerb', 'Die Nachbarn haben sich die Finger geleckt.'],
  ['trip1', s => (s.stats.isleTrips || 0) >= 1, '⛵', 'Ausflug ins Blaue', 'Mit Käpt\'n Flossi zu einer Insel, die es so nur einmal gab.'],
  ['camp1', s => (s.stats.campers || 0) >= 1, '🏕️', 'Besuch auf dem Campingplatz', 'Jemand Neues hat sein Zelt auf der Insel aufgeschlagen.'],
  ['movein', s => Object.keys(s.residents || {}).length >= 1, '📦', 'Neue Nachbarn!', 'Aus einem Campingbesuch wurde ein Zuhause.'],
  ['week1', s => (s.stats.weekGoals || 0) >= 1, '🤝', 'Gemeinsam geschafft', 'Das erste Wochenziel – nur zusammen war das möglich.'],
  ['market1', s => (s.stats.nightBuys || 0) >= 1, '🏮', 'Nachtmarkt-Schnäppchen', 'Bei Lampenschein gefeilscht und etwas Echtes erwischt.'],
  ['song', s => !!s.melody?.made, '🎹', 'Eine eigene Inselmelodie', 'Ab jetzt klingt die Insel nach euch.'],
  ['pattern', s => (s.patterns || []).some(Boolean), '🎨', 'Das erste eigene Muster', 'Pixel für Pixel selbst gemalt.'],
];
export function moment(s, k, icon, title, text, out) {
  s.book ||= [];
  if (s.book.some(p => p.k === k)) return false;
  s.book.push({ k, day: s.day, icon, title, text, t: Date.now() });
  if (s.book.length > 150) s.book.splice(0, s.book.length - 150);
  if (out) out.moment = { k, icon, title };
  return true;
}
export function checkMoments(s, out) {
  if (!s.book) return;
  const have = new Set(s.book.map(p => p.k));
  for (const [k, test, icon, title, text] of MOMENTS) if (!have.has(k) && test(s)) { moment(s, k, icon, title, text, out); break; } // eine neue Seite pro Aktion
}

// ---------- Jahrestage ----------
const two = n => String(n).padStart(2, '0');
export const realToday = () => { const d = new Date(); return { y: d.getFullYear(), md: `${two(d.getMonth() + 1)}-${two(d.getDate())}`, iso: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` }; };
export function annivToday(s) {
  const a = s.anniv;
  if (!a) return null;
  const t = realToday(), [fy] = (a.founded || '').split('-').map(Number), fmd = (a.founded || '').slice(5);
  if (fmd === t.md && fy < t.y) return { k: 'founded', name: 'Inselgeburtstag', icon: '🎂', years: t.y - fy, y: t.y };
  const c = (a.dates || []).find(d => d.md === t.md);
  return c ? { k: 'c:' + c.name, name: c.name, icon: '💕', y: t.y, years: c.y && c.y < t.y ? t.y - c.y : 0 } : null;
}
function annivCheck(s, out) {
  const A = annivToday(s);
  if (!A) return false;
  const id = A.y + ':' + A.k;
  s.anniv.done ||= {};
  if (s.anniv.done[id]) return false;
  s.anniv.done[id] = s.day;
  if (A.k === 'founded') {
    note(s, `🎂 ${A.years} Jahr${A.years === 1 ? '' : 'e'} ${s.name}!`, `Liebe Bürgermeister,\nheute vor ${A.years === 1 ? 'einem Jahr' : A.years + ' Jahren'} habt ihr diese Insel gegründet! Die ganze Insel feiert mit – heute Abend ab 19 Uhr gibt es ein Jubiläums-Feuerwerk.\nAls Geschenk: eine Jubiläumstorte und ${fmt(1000 * A.years)} Taler.\n\nEure Rosi 🦌`, 'torte', 1);
    s.money += 1000 * A.years;
    for (const id of NPC_IDS) if (S.hearts(s, id) >= 2) note(s, `🎉 Alles Gute zum Inselgeburtstag!`, `Ihr Lieben,\nwas für ein Jahr! Danke, dass ihr so tolle Nachbarn seid.\n\n${NPC_DATA[id].name} ${NPC_DATA[id].icon}`, NPC_DATA[id].gift[0], Math.min(3, NPC_DATA[id].gift[1]), id);
    moment(s, 'anniv:' + A.y, '🎂', `${A.years}. Inselgeburtstag`, 'Mit Torte, Briefen von allen Nachbarn und einem Feuerwerk über dem Meer.', out);
  } else {
    note(s, `💕 Heute: ${A.name}!`, `Ihr Lieben,\nheute ist ein besonderer Tag: ${A.name}${A.years ? ` – schon zum ${A.years}. Mal` : ''}! Heute Abend ab 19 Uhr leuchtet ein Feuerwerk nur für euch. Und ein kleiner Herzballon liegt bei.\n\nEure Rosi 🦌`, 'herzballon', 1);
    moment(s, 'anniv:' + A.y + ':' + A.name, '💕', A.name, `Ein besonderer Tag${A.years ? ` – zum ${A.years}. Mal` : ''}, mit Feuerwerk am Abend.`, out);
  }
  (s.diary ||= []).push({ day: s.day, icon: A.icon, text: A.k === 'founded' ? `${A.years}. Inselgeburtstag – Feuerwerk am Abend!` : `${A.name} 💕` });
  return true;
}
// Feuerwerk heute Abend? (Jahrestag, Sternenfest-Rakete)
export const fireworksTonight = s => !!annivToday(s) || s.fw?.day === s.day;

// ---------- Möbelkatalog ----------
export const catalogOk = id => !!(FURNITURE[id] || (PLACE[id] && PLACE[id].kind !== 'project'));
export function catalogPrice(id) {
  const f = FURNITURE[id], p = PLACE[id];
  const base = (f?.buy || p?.buy || 0);
  if (base) return Math.round(base * 1.1);
  const craft = f?.craft || null;
  const v = craft ? Object.entries(craft).reduce((t, [k, n]) => t + (ITEMS[k]?.sell || 100) * n, 0) * 1.6 : 0;
  return Math.max(800, Math.round((v || (f?.rare ? 6000 : 1500)) / 10) * 10);
}

// ---------- Wochenziele (gemeinsam) ----------
// [Ereignis, Menge, Text, Symbol] – immer nur hinten anhängen, gespeichert wird die Nummer
export const WEEK_GOALS = [
  ['fish', 20, 'Fangt zusammen 20 Fische', '🎣'],
  ['bug', 15, 'Fangt zusammen 15 Krabbeltiere', '🦋'],
  ['fruit', 30, 'Sammelt zusammen 30 Obst', '🍎'],
  ['chop', 20, 'Hackt zusammen 20 Holz', '🪵'],
  ['harvest', 25, 'Erntet zusammen 25 Blumen oder Gemüse', '🌷'],
  ['sell', 30000, 'Verdient zusammen 30.000 Taler', '💰'],
  ['gift', 8, 'Macht den Nachbarn 8 Geschenke', '🎁'],
  ['dig', 8, 'Grabt zusammen 8 Sachen aus', '✨'],
  ['shell', 20, 'Sammelt zusammen 20 Muscheln', '🐚'],
  ['talk', 15, 'Plaudert 15× mit Nachbarn', '💬'],
  ['water', 40, 'Gießt zusammen 40 Blumen', '💧'],
  ['mine', 12, 'Haut 12× auf Felsen', '🪨'],
];
export const WEEK_PRIZES = ['sternglobus', 'mondsessel', 'regenbogenregal', 'leuchtturmmodell'];
function newWeek(s) {
  const pool = WEEK_GOALS.map((g, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
  s.week = { start: s.day, goals: pool.map(i => ({ i, p: 0, done: 0 })), prize: WEEK_PRIZES[Math.floor((s.day - 1) / 7) % WEEK_PRIZES.length] };
}
export function weekEvent(s, ev, n, out) {
  Y.taleEvent(s, ev, n, out); // Nachbar-Geschichten zählen mit
  const w = s.week;
  if (!w?.goals) return;
  for (const g of w.goals) {
    const G = WEEK_GOALS[g.i];
    if (!G || g.done || G[0] !== ev) continue;
    g.p = Math.min(G[1], g.p + n);
    if (g.p >= G[1]) {
      g.done = s.day;
      s.stats.weekGoals = (s.stats.weekGoals || 0) + 1;
      if (out) out.weekGoal = G[2];
      if (w.goals.every(x => x.done) && !w.won) {
        w.won = s.day;
        const players = Math.max(1, Object.keys(s.pinv || {}).length);
        note(s, '🤝 Alle Wochenziele geschafft!', `Ihr Lieben,\nwas für ein Team! Alle drei Wochenziele sind erfüllt. Dafür gibt es etwas ganz Seltenes, das man nirgends kaufen kann: ${ITEMS[w.prize]?.icon || '🎁'} ${ITEMS[w.prize]?.name || ''} – für jede und jeden von euch eins.\n\nEure Rosi 🦌`, w.prize, Math.min(4, players));
      } else {
        s.money += 1500; s.stats.earned += 1500;
        note(s, `🤝 Wochenziel geschafft: ${G[3]}`, `Prima Teamarbeit! „${G[2]}“ ist erledigt – 1.500 Taler gehen in die Inselkasse. Schafft ihr alle drei, wartet etwas Seltenes auf euch.\n\nEure Rosi 🦌`);
      }
    }
  }
}

// ---------- Inselzeitung ----------
const TRACK = [['fish', '🎣', n => `${n} Fisch${n === 1 ? '' : 'e'} gefangen`], ['bugs', '🦋', n => `${n} Krabbeltier${n === 1 ? '' : 'e'} gefangen`], ['fruit', '🍎', n => `${n} Obst gepflückt`],
  ['harvested', '🌷', n => `${n}× geerntet`], ['wood', '🪵', n => `${n} Holz gehackt`], ['shells', '🐚', n => `${n} Muschel${n === 1 ? '' : 'n'} gesammelt`], ['earned', '💰', n => `${fmt(n)} Taler verdient`],
  ['cooked', '🍳', n => `${n} Gericht${n === 1 ? '' : 'e'} gekocht`], ['crafted', '🔨', n => `${n}× gebaut`], ['donated', '🏛️', n => `${n} Stück${n === 1 ? '' : 'e'} ans Museum gegeben`], ['dug', '✨', n => `${n}× ausgegraben`]];
function gossip(s) {
  const L = [], ids = NPC_IDS.filter(id => s.npc?.[id]);
  const n = id => `${NPC_DATA[id].icon} ${NPC_DATA[id].name}`;
  if (ids.length) {
    const a = pick(ids), likes = NPC_DATA[a].likes.map(k => ITEMS[k]?.name).filter(Boolean);
    if (likes.length) L.push(`${n(a)} schwärmt seit Tagen von ${pick(likes)}. Ein Geschenk-Tipp?`);
    const best = [...ids].sort((x, y) => (s.npc[y]?.f || 0) - (s.npc[x]?.f || 0))[0];
    if (best && S.hearts(s, best) >= 2) L.push(`${n(best)} erzählt überall, wie lieb ihr seid (${'💗'.repeat(Math.min(5, Math.ceil(S.hearts(s, best) / 2)))}).`);
    const b = ids.find(id => [1, 2, 3].some(d => S.birthdayOf(s.day + d) === id));
    if (b) L.push(`Psst: ${n(b)} hat bald Geburtstag!`);
    const two = ids.length > 1 ? [pick(ids), pick(ids)] : null;
    if (two && two[0] !== two[1]) L.push(pick([`${n(two[0])} und ${n(two[1])} wurden beim gemeinsamen Picknick gesichtet.`, `${n(two[0])} hat ${n(two[1])} einen Brief geschrieben – mit Herzchen!`, `${n(two[0])} und ${n(two[1])} streiten, wer den schöneren Garten hat.`]));
  }
  if (s.camper?.day === s.day) L.push(`Auf dem Campingplatz zeltet heute ${s.camper.icon} ${s.camper.name}. Sagt doch mal Hallo!`);
  if (weekday(s.day) === 5) L.push('🏮 Gerüchte: Heute Abend soll auf dem Dorfplatz der Nachtmarkt öffnen …');
  if (weekday(s.day) === 0) L.push('🍳 Heute ist Kochwettbewerb! Die Nachbarn sind schon ganz hungrig.');
  return L.sort(() => Math.random() - 0.5).slice(0, 3);
}
function makePaper(s) {
  const y = s.day - 1, prev = s.statsAt || {}, done = [];
  if (s.statsAt) for (const [k, ic, txt] of TRACK) { const d = (s.stats[k] || 0) - (prev[k] || 0); if (d > 0) done.push(`${ic} ${txt(d)}`); }
  const diary = (s.diary || []).filter(e => e.day === y).slice(-3).map(e => `${e.icon || '💗'} ${e.text}`);
  const tp = S.turnipPrice({ ...s, dayTime: 0 }), tw = weekday(s.day);
  const turnip = tw === 0 ? 'Heute ist Sonntag: Hoppel verkauft vormittags Rüben auf dem Dorfplatz.' : s.turnip ? `Der Rübenkurs startet heute bei ${tp} Taler.${tp > (s.turnip.buy || 100) * 1.3 ? ' 📈 Jetzt verkaufen könnte sich lohnen!' : tp < (s.turnip.buy || 100) * 0.8 ? ' 📉 Lieber noch abwarten.' : ''}` : 'Diese Woche keine Rübenkurse.';
  const f = FESTS[S.festOf(s.day)], A = annivToday(s);
  const heads = [
    A && `${A.icon} Heute: ${A.name}${A.k === 'founded' ? ` – ${A.years} Jahr${A.years === 1 ? '' : 'e'} ${s.name}!` : ''}`,
    f && `${f.icon} Heute: ${f.name}!`,
    Y.beachKind(s) && (Y.beachKind(s) === 'sand' ? '🏰 Heute ab 10 Uhr: Sandburgen-Wettbewerb am Strand!' : '🪁 Heute ab 10 Uhr: Drachenfest am Strand!'),
    s.week?.won === y && '🤝 Alle Wochenziele geschafft – die Insel jubelt!',
    done.length >= 4 && 'Fleißige Insel: Gestern war richtig was los!',
    s.weather === 'storm' && '⛈️ Gewitterwarnung: Heute lieber mit Schirm!',
    s.weather === 'fog' && '🌫️ Nebel über der Insel – manche Krabbeltiere lieben das.',
  ].filter(Boolean);
  s.paper = {
    day: s.day, head: heads[0] || pick(['Ein ganz normaler, wunderschöner Inseltag', 'Neuer Tag, neues Glück auf der Insel', 'Die Insel erwacht – was steht heute an?']),
    wx: s.weather, wxNext: s.wxNext, turnip, done, diary, gossip: gossip(s),
    week: s.week?.goals?.map(g => { const G = WEEK_GOALS[g.i]; return G && `${G[3]} ${G[2]}: ${fmt(g.p)}/${fmt(G[1])}${g.done ? ' ✅' : ''}`; }).filter(Boolean) || [],
    ad: pick(['🛍️ Krämerladen: Heute frische Samen im Angebot!', '🔨 Tipp: Neue Baupläne stecken in der Flaschenpost am Strand.', '⛵ Käpt\'n Flossi fährt euch zu Inseln, die es nur einmal gibt!', '🌱 Lio empfiehlt: Gewächshaus & Sprinkler aus der Gärtnerei.', '📖 Im Fotobuch sammeln sich eure schönsten Momente.', '🎨 Malt eigene Muster – für Kleidung, Fahnen, Wege und Bilder!']),
  };
  s.statsAt = { ...s.stats };
}

// ---------- Gärtnerei-Technik ----------
// Welche Beete gießt ein Sprinkler, welche stehen im Gewächshaus? (zwischengespeichert, bis sich etwas ändert)
let coverMemo = { sig: null, water: new Set(), green: new Set() };
export function gardenCover(s) {
  let sig = '';
  for (const [k, o] of Object.entries(s.obj || {})) if (o?.k === 'sprinkler' || o?.k === 'sternsprinkler' || o?.k === 'gewaechshaus') sig += k + o.k + ';';
  if (sig === coverMemo.sig) return coverMemo;
  const water = new Set(), green = new Set();
  for (const [k, o] of Object.entries(s.obj || {})) {
    const r = { sprinkler: 1, sternsprinkler: 2, gewaechshaus: 2 }[o?.k];
    if (!r) continue;
    const [x, z] = k.split(',').map(Number);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) if (i || j) (o.k === 'gewaechshaus' ? green : water).add(`${x + i},${z + j}`);
  }
  return (coverMemo = { sig, water, green });
}

// ---------- Schatzkarten ----------
// Flaschenpost enthält manchmal ein Kartenstück; mit vier Stücken erscheint ein Kreuz auf der Inselkarte.
export function mapPiece(s, out) {
  s.tmap ||= { n: 0, spot: null };
  if (s.tmap.spot || Math.random() > 0.3) return false;
  s.tmap.n++;
  if (s.tmap.n >= 4) {
    const free = [];
    for (let x = -30; x <= 30; x++) for (let z = -14; z <= 30; z++) if (S.canPlace(s, x, z) && !s.paths?.[`${x},${z}`] && Math.hypot(x, z - 2) > 6) free.push(`${x},${z}`);
    s.tmap.spot = free.length ? pick(free) : null;
    out.msg = s.tmap.spot ? '🗺️ Das vierte Kartenstück! Die Schatzkarte ist komplett – auf der Inselkarte ist jetzt ein ❌. Nimm die Schaufel mit!' : '🗺️ Die Schatzkarte ist komplett, aber die Insel ist zu voll … räumt ein bisschen auf!';
    if (!s.tmap.spot) s.tmap.n = 3;
  } else out.msg = `🗺️ In der Flasche steckt ein Stück einer Schatzkarte! (${s.tmap.n}/4)`;
  return true;
}
export function digTreasure(s, a, out) {
  const gems = ['amethyst', 'rubin', 'saphir', 'opal'], gem = pick(gems);
  s.tmap = { n: 0, spot: null };
  s.money += 15000; s.stats.earned += 15000;
  S.addInvX(s, 'goldnugget', 2);
  S.addInvX(s, gem, 1);
  S.addInvX(s, 'schatzkiste', 1);
  s.stats.bigTreasure = (s.stats.bigTreasure || 0) + 1;
  (s.diary ||= []).push({ day: s.day, icon: '🏴‍☠️', text: 'Den großen Schatz der Schatzkarte ausgegraben!' });
  out.msg = `🏴‍☠️ DER SCHATZ! 15.000 Taler, 2× 🪙 Goldnugget, ${ITEMS[gem].icon} ${ITEMS[gem].name} und eine Schatzkiste für den Garten!`;
  out.got = 'schatzkiste';
  out.fx.push({ x: a.x, z: a.z, txt: '💰💎✨', k: 'coin' });
  out.snd = 'fanfare';
  return true;
}

// ---------- Fünf Inselsterne ----------
function fiveStars(s) {
  if ((s.stars || 1) < 5 || s.mayor?.rocket) return;
  (s.mayor ||= {}).rocket = s.day;
  s.fw = { day: s.day, t: s.time || 0, by: 'Rosi' };
  note(s, '🌟 Sternenfest! Fünf Inselsterne!', 'Liebe Bürgermeister,\nFÜNF STERNE! Das muss gefeiert werden: Heute Abend gibt es ein großes Sternenfest mit Feuerwerk über der ganzen Insel.\nUnd damit ihr ab jetzt selbst feiern könnt, wann immer ihr wollt: eine Sternenrakete! Stellt sie auf, tippt sie an – und am Abend leuchtet der Himmel.\n\nEure Rosi 🦌', 'sternenrakete', 1);
  (s.diary ||= []).push({ day: s.day, icon: '🌟', text: 'Sternenfest: Fünf Inselsterne!' });
}

// ---------- Kochwettbewerb (sonntags 9–18 Uhr in der Gartenküche) ----------
export const COOK_PRIZES = ['x_sternentorte', 'x_inselcurry', 'x_mondpudding', 'x_regenbogeneis'];
export const cookDay = s => weekday(s.day) === 0;
export const cookOpen = s => { const h = 6 + s.dayTime * 18; return cookDay(s) && h >= 9 && h < 18 && !s.cook?.done; };
function cookStart(s) {
  if (!cookDay(s)) return;
  const judges = [...NPC_IDS].sort(() => Math.random() - 0.5).slice(0, 3);
  s.cook = { day: s.day, judges, entries: {}, done: 0 };
}
const JUDGE = [[9, ['Himmlisch! Das ist das Beste, was ich je gegessen habe!', 'Ich … ich bin sprachlos. Nachschlag bitte!']], [7, ['Mmmh, wirklich lecker! Da steckt Liebe drin.', 'Sehr fein abgeschmeckt!']], [5, ['Schmeckt gut! Ein bisschen mehr Pfiff noch …', 'Ordentlich, ordentlich.']], [0, ['Hm. Interessant. … Sehr interessant.', 'Na ja, Geschmäcker sind verschieden!']]];
function judge(s, id, dish) {
  const N = NPC_DATA[id], base = Math.min(7, (ITEMS[dish].sell || 200) / 260);
  const bonus = N.loves.includes(dish) ? 3 : N.likes.includes(dish) ? 1.5 : N.dislikes.includes(dish) ? -2 : 0;
  const score = Math.max(1, Math.min(10, Math.round(base + bonus + 1.5 + Math.random() * 1.6 - 0.8)));
  return { id, score, line: pick(JUDGE.find(([m]) => score >= m)[1]) };
}
function cookFinish(s) {
  const c = s.cook;
  if (!c || c.done) return false;
  c.done = s.day;
  const list = Object.values(c.entries).sort((a, b) => b.total - a.total);
  if (!list.length) return true;
  const win = list[0], prize = COOK_PRIZES.find(r => !s.recipes?.[r]);
  c.winner = win.name;
  s.stats.cookWins = (s.stats.cookWins || 0) + 1;
  s.money += 3000; s.stats.earned += 3000;
  if (prize) (s.recipes ||= {})[prize] = s.day;
  const R = prize && ITEMS[RECIPE_OUT[prize]];
  note(s, `🏆 Kochwettbewerb: ${win.name} gewinnt!`, `Liebe Köchinnen und Köche,
mit ${ITEMS[win.dish].icon} ${ITEMS[win.dish].name} und ${win.total} von 30 Punkten hat ${win.name} heute gewonnen! 3.000 Taler gehen in die Inselkasse.${R ? `
Der Preis: das geheime Rezept für ${R.icon} ${R.name} – nur Siegerinnen und Sieger kennen es!` : '\nAlle Geheimrezepte kennt ihr schon – Respekt!'}

Die Jury: ${c.judges.map(id => NPC_DATA[id].icon + ' ' + NPC_DATA[id].name).join(', ')}`);
  (s.diary ||= []).push({ day: s.day, icon: '🏆', text: `${win.name} gewinnt den Kochwettbewerb mit ${ITEMS[win.dish].name}!` });
  return true;
}
const RECIPE_OUT = { x_sternentorte: 'sternentorte', x_inselcurry: 'inselcurry', x_mondpudding: 'mondpudding', x_regenbogeneis: 'regenbogeneis' };

// ---------- Nachtmarkt (freitags ab 18 Uhr auf dem Dorfplatz) ----------
// Mottilda, die Nachtfalterin, verkauft seltene Möbel. Manches ist gefälscht: Echte Ware trägt ihr Siegel – eine silberne Motte mit VIER Punkten.
export const NIGHT_AT = [-3, 2];
export const NIGHT_WARES = ['lumilaterne', 'sternkarte', 'windspiel', 'spieluhr', 'schneekugel'];
export const nightOpen = s => weekday(s.day) === 5 && 6 + s.dayTime * 18 >= 18;
const FAKES = [['🦋 Motte · ●●●', 'drei Punkte'], ['🦋 Motte · ●●●●●', 'fünf Punkte'], ['🦋 goldene Motte · ●●●●', 'golden statt silbern'], ['🦋 Motte schaut nach links · ●●●●', 'spiegelverkehrt']];
function nightStock(s) {
  if (weekday(s.day) !== 5) { s.night = null; return; }
  const wares = [...NIGHT_WARES].sort(() => Math.random() - 0.5).slice(0, 4);
  const real = rnd(4);
  s.night = { day: s.day, offers: wares.map((id, i) => { const fake = i !== real && Math.random() < 0.5, f = pick(FAKES); return { id, fake, seal: fake ? f[0] : '🦋 silberne Motte · ●●●●', why: fake ? f[1] : '', price: 3000 + rnd(9) * 500, sold: 0 }; }) };
}

// ---------- Tauschstand ----------
export const STALL_MAX = 8;
const valueOf = id => ITEMS[id]?.sell || (FURNITURE[id] || PLACE[id] ? Math.round(catalogPrice(id) / 4) : 0);
function stallTick(s, hours) {
  const st = s.stall;
  if (!st?.offers?.length) return false;
  let sold = false;
  for (const o of [...st.offers]) {
    if (!o.price) continue;
    const v = valueOf(o.id) * o.n, r = o.price / Math.max(1, v); // Preis im Verhältnis zum Wert
    const p = r <= 1 ? 0.5 : r <= 1.3 ? 0.3 : r <= 1.7 ? 0.14 : r <= 2.5 ? 0.05 : 0.01; // Kaufchance pro Stunde
    if (Math.random() > 1 - (1 - p) ** hours) continue;
    st.offers.splice(st.offers.indexOf(o), 1);
    const buyer = s.camper?.day === s.day && Math.random() < 0.4 ? `${s.camper.icon} ${s.camper.name}` : (id => `${NPC_DATA[id].icon} ${NPC_DATA[id].name}`)(pick(NPC_IDS));
    s.money += o.price; s.stats.earned += o.price;
    (st.log ||= []).push({ day: s.day, txt: `${buyer} hat ${o.n}× ${ITEMS[o.id].icon} ${ITEMS[o.id].name} von ${o.by} für ${fmt(o.price)} Taler gekauft` });
    if (st.log.length > 12) st.log.shift();
    sold = true;
  }
  return sold;
}

// ---------- Bootsausflug zur Zufallsinsel ----------
export function tripBlocked(s, x, z) {
  const lx = x - TRIP.x, lz = z - TRIP.z;
  if (!tripWalk(lx, lz)) return true;
  const n = tripNodeAt(s, Math.round(lx), Math.round(lz));
  return !!(n && SOLID_TRIP.includes(n.kind));
}
export function resolveTrip(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const lx = Math.round(px - TRIP.x), lz = Math.round(pz - TRIP.z), tiles = [[lx + TRIP.x, lz + TRIP.z]];
  if (onTripDock(me.x - TRIP.x, me.z - TRIP.z) && me.z - TRIP.z > TRIP.r + 1.2) return { ui: 'boatback', label: '⛵ Zurück nach Hause', tiles: [] };
  const n = tripNodeAt(s, lx, lz);
  if (!n) return sel === 'net' ? { label: '🦋 Hier flattert nichts – such die Blütenbüsche!', tiles: [] } : { label: '', tiles: [] };
  const used = (s.trip.used?.[n.i] || 0) >= tripUses(n), a = how => ({ a: { t: 'tact', i: n.i, how }, tiles });
  if (used) return { label: { bamboo: '🎋 Genug Bambus für heute', ore: '💎 Leer', pool: '🎣 Hier beißt nichts mehr' }[n.kind] || 'Schon eingesammelt', tiles };
  if (n.kind === 'bamboo') return sel === 'axe' ? { ...a('chop'), label: '🪓 Bambus hacken' } : { ...a('shake'), label: '🌱 Sprossen suchen' };
  if (n.kind === 'ore') return sel === 'shovel' ? { ...a('mine'), label: '💎 Draufhauen' } : { label: '💎 Mit der Schaufel draufhauen!', tiles };
  if (n.kind === 'bugs') return sel === 'net' ? { ...a('net'), label: '🦋 Keschern!' } : { label: '🦋 Nimm den Kescher!', tiles };
  if (n.kind === 'pool') return { ...a('fish'), label: '🎣 Im Becken angeln' };
  const thing = nodeThing(n);
  return { ...a('pick'), label: `${ITEMS[thing]?.icon || '✋'} ${n.kind === 'fruit' ? 'Pflücken' : 'Einsammeln'}` };
}
function tact(s, a, out) {
  if (!s.trip || !Number.isInteger(a.i)) return false;
  const L = tripLayout(s.trip.seed), n = L.nodes[a.i];
  if (!n) return false;
  s.trip.used ||= {};
  if ((s.trip.used[n.i] || 0) >= tripUses(n)) return false;
  const got = (id, c = 1) => { S.addInvX(s, id, c); out.fx.push({ x: TRIP.x + n.x, z: TRIP.z + n.z, txt: `+${c} ${ITEMS[id].icon}`, k: 'leaf' }); out.got = id; };
  const need = { bamboo: ['chop', 'shake'], ore: ['mine'], bugs: ['net'], pool: ['fish'] }[n.kind] || ['pick'];
  if (!need.includes(a.how)) return false;
  s.trip.used[n.i] = (s.trip.used[n.i] || 0) + (n.kind === 'bamboo' && a.how === 'shake' ? 3 : 1);
  if (n.kind === 'bamboo') { if (a.how === 'chop') { got('bambus', 1 + (Math.random() < 0.3 ? 1 : 0)); out.snd = 'chop'; } else { got('bambussprosse', 1 + Math.floor(Math.random() * 2)); out.snd = 'harvest'; } }
  else if (n.kind === 'ore') { const r = Math.random(), id = r < 0.25 ? 'amethyst' : r < 0.38 ? 'rubin' : r < 0.51 ? 'saphir' : r < 0.57 ? 'opal' : r < 0.75 ? 'goldnugget' : 'kristall'; got(id); S.collectX(s, id, out); out.snd = 'mine'; }
  else if (n.kind === 'bugs') { const id = TRIP_BUGS[(n.v + s.trip.used[n.i] * 7 + Math.floor(Math.random() * 3)) % TRIP_BUGS.length]; got(id); S.collectX(s, id, out); s.stats.bugs = (s.stats.bugs || 0) + 1; S.questEventX(s, 'bug', 1, out); out.caught = id; out.snd = 'harvest'; }
  else if (n.kind === 'pool') { const id = TRIP_FISH[Math.floor(Math.random() * TRIP_FISH.length)]; got(id); S.collectX(s, id, out); s.stats.fish = (s.stats.fish || 0) + 1; S.questEventX(s, 'fish', 1, out); out.caught = id; out.snd = 'splash'; }
  else { const id = nodeThing(n); got(id, n.kind === 'fruit' ? 3 : 1); if (n.kind === 'bloom') S.addInvX(s, 's_' + id, 2); if (n.kind === 'mush') S.collectX(s, id, out); out.snd = 'harvest'; }
  return true;
}

// ---------- Campingplatz, Besuch und Umzüge ----------
// Besuch zeltet, wenn der Campingplatz steht. Eingeladene ziehen auf ein Grundstück. Ausziehen nur, wenn ihr zustimmt.
export const VISITORS = {
  flocke: { name: 'Flocke', icon: '🐑', likes: ['kirsche', 'tulpe', 'sternsplitter', 'honig'], loves: ['beerenkuchen', 'kirschtorte'] },
  pingo: { name: 'Pingo', icon: '🐧', likes: ['makrele', 'barsch', 'sorbet', 'krabbe'], loves: ['regenbogeneis', 'kugelfisch'] },
  olli: { name: 'Olli', icon: '🦦', likes: ['krabbe', 'forelle', 'stein', 'koralle'], loves: ['perle', 'fischsuppe'] },
  kruemel: { name: 'Krümel', icon: '🐹', likes: ['apfel', 'weizen', 'kiefernzapfen', 'blaubeere'], loves: ['honigbrot', 'apfelkuchen'] },
  koko: { name: 'Koko', icon: '🐨', likes: ['orange', 'bambussprosse', 'pfirsich'], loves: ['waldtee', 'mondpudding'] },
  pia: { name: 'Pia', icon: '🐼', likes: ['bambus', 'orchidee', 'lilie'], loves: ['bambussprosse', 'sternentorte'] },
};
export const VISITOR_KEYS = Object.keys(VISITORS);
export const MAX_RESIDENTS = 4;
const vname = id => `${VISITORS[id].icon} ${VISITORS[id].name}`;
export const vhearts = f => Math.min(10, Math.floor((f || 0) / 30));
function campMorning(s) {
  s.residents ||= {}; s.pending ||= [];
  // Zugestimmt: heute früh ausgezogen
  for (const [id, r] of Object.entries(s.residents)) if (r.leave && r.leave < s.day) {
    if (r.home && s.obj[r.home]?.who === id) delete s.obj[r.home];
    delete s.residents[id];
    note(s, `📦 ${vname(id)} ist weitergezogen`, `Ihr Lieben,
ich bin heute früh losgereist – danke für die schöne Zeit auf eurer Insel! Ich schicke euch eine Postkarte von unterwegs.
Das Grundstück lege ich euch bei, falls bald wieder jemand einziehen möchte.

${vname(id)}`, 'grundstueck', 1);
    (s.diary ||= []).push({ day: s.day, icon: '📦', text: `${VISITORS[id].name} ist weitergezogen.` });
  }
  // Eingeladene ziehen auf ein freies Grundstück
  for (const id of [...s.pending]) {
    const plot = Object.entries(s.obj).find(([, o]) => o?.k === 'grundstueck');
    if (!plot) break;
    s.obj[plot[0]] = { k: 'nachbarhaus', r: plot[1].r || 0, who: id };
    s.residents[id] = { day: s.day, home: plot[0], f: s.camper?.id === id ? s.camper.f || 30 : 30 };
    s.pending = s.pending.filter(x => x !== id);
    if (s.camper?.id === id) s.camper = null;
    note(s, `🏠 ${vname(id)} wohnt jetzt bei euch!`, `Hallo ihr Lieben!
Ich bin eingezogen – mein Häuschen ist wunderschön geworden. Kommt mich doch mal besuchen!

${vname(id)}`);
    moment(s, 'movein:' + id, '🏠', `${VISITORS[id].name} zieht ein`, 'Aus einem Campingbesuch wurde ein neues Zuhause.');
  }
  // Besuch reist nach einem Tag weiter (außer er wartet aufs Grundstück)
  if (s.camper && s.camper.day < s.day && !s.pending.includes(s.camper.id)) s.camper = null;
  const camp = Object.values(s.obj || {}).some(o => o?.k === 'campingplatz');
  if (camp && !s.camper && Math.random() < 0.6) {
    const pool = VISITOR_KEYS.filter(id => !s.residents[id] && !s.pending.includes(id));
    if (pool.length) {
      const id = pick(pool);
      s.camper = { id, day: s.day, f: 0 };
      s.stats.campers = (s.stats.campers || 0) + 1;
      note(s, `🏕️ Besuch auf dem Campingplatz: ${vname(id)}`, `Liebe Bürgermeister,
heute zeltet ${vname(id)} auf dem Campingplatz. Sagt doch mal Hallo! Wer weiß – vielleicht gefällt es ${VISITORS[id].name} hier so gut, dass ${VISITORS[id].name} bleiben möchte.

Eure Rosi 🦌`);
    }
  }
  // Manchmal denkt jemand übers Weiterziehen nach – aber nur mit eurer Zustimmung
  if (!Object.values(s.residents).some(r => r.ask || r.leave)) for (const [id, r] of Object.entries(s.residents)) {
    if (s.day - r.day > 10 && Math.random() < 0.05) { r.ask = s.day; note(s, `💭 ${vname(id)} überlegt umzuziehen`, `Ihr Lieben,
ich liebe eure Insel … aber ich träume auch von der weiten Welt. Was meint ihr? Kommt bei mir vorbei und sagt mir, ob ich gehen oder bleiben soll.

${vname(id)}`); break; }
  }
}
const vok = (s, id) => typeof id === 'string' && VISITORS[id] && (s.residents?.[id] || s.camper?.id === id);
const vrec = (s, id) => s.residents?.[id] || (s.camper?.id === id ? s.camper : null);

// ---------- Neue Felder für alte Spielstände ----------
export function migrateX(s) {
  s.stats ||= {};
  for (const n of Object.values(s.npc || {})) if (n && typeof n === 'object') { if (!Array.isArray(n.sent)) n.sent = []; if (!Number.isFinite(n.f)) n.f = 0; } // ältere Stände ohne Briefliste
  s.book = Array.isArray(s.book) ? s.book.filter(p => p && typeof p.k === 'string').slice(-150) : [];
  if (!s.book.length && s.day >= 1) s.book.push({ k: 'start', day: 1, icon: '🏝️', title: `${s.name || 'Die Insel'} wird gegründet`, text: 'Ein Zelt, ein paar Bäume, viel Meer – und ganz viel vor.', t: Date.now() });
  const a = s.anniv && typeof s.anniv === 'object' ? s.anniv : {};
  s.anniv = { founded: /^\d{4}-\d{2}-\d{2}$/.test(a.founded || '') ? a.founded : realToday().iso, guess: a.founded ? !!a.guess : !(s.day <= 1), dates: Array.isArray(a.dates) ? a.dates.filter(d => d && /^\d{2}-\d{2}$/.test(d.md) && typeof d.name === 'string').slice(0, 8) : [], done: a.done && typeof a.done === 'object' ? a.done : {} };
  if (!s.catalog || typeof s.catalog !== 'object') {
    s.catalog = {};
    for (const inv of [...Object.values(s.pinv || {}), s.box || {}]) for (const id of Object.keys(inv || {})) if (catalogOk(id)) s.catalog[id] = 1;
    for (const o of Object.values(s.obj || {})) if (catalogOk(o?.k)) s.catalog[o.k] = 1;
    for (const o of [...Object.values(s.home?.items || {}), ...Object.values(s.home?.walls || {})]) if (catalogOk(o?.k)) s.catalog[o.k] = 1;
  }
  if (!s.week?.goals || !Array.isArray(s.week.goals)) newWeek(s);
  if (!WEATHER[s.weather]) s.weather = 'sun';
  if (!WEATHER[s.wxNext]) s.wxNext = rollWeather(s.day + 1);
  s.tmap = s.tmap && Number.isInteger(s.tmap.n) ? { n: Math.min(4, Math.max(0, s.tmap.n)), spot: typeof s.tmap.spot === 'string' && /^-?\d+,-?\d+$/.test(s.tmap.spot) ? s.tmap.spot : null } : { n: 0, spot: null };
  if (s.fw && !(Number.isInteger(s.fw.day))) s.fw = null;
  fiveStars(s);
  Y.migrateY(s);
  Z.migrateZ(s);
  s.patterns = Array.from({ length: PAT_SLOTS }, (_, i) => { const p = Array.isArray(s.patterns) ? s.patterns[i] : null; return p && validPx(p.px) ? { name: String(p.name || 'Muster').slice(0, 20), px: p.px, by: String(p.by || '').slice(0, 16) } : null; });
  if (s.melody && !(Array.isArray(s.melody.notes) && s.melody.notes.length === 16 && s.melody.notes.every(n => Number.isInteger(n) && n >= 0 && n < MEL_NOTES.length))) s.melody = null;
  for (const k of ['flagPat', 'pathPat']) if (!(Number.isInteger(s[k]) && s.patterns[s[k]])) s[k] = null;
  if (s.trip && !(Number.isInteger(s.trip.seed) && Number.isInteger(s.trip.day))) s.trip = null;
  s.residents = s.residents && typeof s.residents === 'object' ? Object.fromEntries(Object.entries(s.residents).filter(([id, r]) => VISITORS[id] && r && typeof r === 'object')) : {};
  s.pending = Array.isArray(s.pending) ? s.pending.filter(id => VISITORS[id] && !s.residents[id]).slice(0, MAX_RESIDENTS) : [];
  if (s.camper && !VISITORS[s.camper.id]) s.camper = null;
  if (!s.stall || !Array.isArray(s.stall.offers)) s.stall = { offers: [], log: [] };
  s.stall.offers = s.stall.offers.filter(o => o && ITEMS[o.id] && Number.isInteger(o.n) && o.n > 0).slice(0, STALL_MAX);
  if (cookDay(s) && s.cook?.day !== s.day) cookStart(s);
  if (weekday(s.day) === 5 && s.night?.day !== s.day) nightStock(s);
  if (!s.paper || s.paper.day !== s.day) makePaper(s);
  return s;
}
// Jeden Morgen (nach dem alten Morgen-Code)
export function morningX(s) {
  if (weekday(s.day) === 0 || !s.week?.goals) newWeek(s);
  const f = S.festOf(s.day);
  if (f) moment(s, 'fest:' + s.day, FESTS[f].icon, FESTS[f].name, `${SEASONS[S.seasonOf(s.day)]?.[0] || ''}, Tag ${s.day} – ein Festtag auf der Insel.`);
  annivCheck(s);
  fiveStars(s);
  if (s.cook && !s.cook.done) cookFinish(s); // gestern nicht mehr ausgewertet
  cookStart(s);
  nightStock(s);
  campMorning(s);
  Y.morningY(s);
  Z.morningZ(s);
  makePaper(s);
}
// Nach jeder Aktion: Katalog, Fotobuch
export function afterAct(s, a, out) {
  checkMoments(s, out);
}
// Läuft beim Host ständig: Jahrestage prüfen (die echte Uhr kann über Mitternacht springen)
let lastDate = '';
export function tickX(s, dt, auth) {
  if (!auth) return false;
  let changed = false;
  const h = 6 + s.dayTime * 18;
  if (s.cook && !s.cook.done && h >= 18) changed = cookFinish(s) || changed;
  changed = Y.tickY(s, dt) || changed;
  s.stallT = (s.stallT || 0) + dt;
  if (s.stallT > 20) { changed = stallTick(s, s.stallT / (S.DAY_SECS / 18)) || changed; s.stallT = 0; } // alle 20 s: Kunden am Tauschstand
  const t = realToday().iso;
  if (t !== lastDate) { lastDate = t; changed = annivCheck(s) || changed; }
  return changed;
}

// ---------- Aktionen ----------
const okName = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 30;
export const X_ACTIONS = {
  anniv(s, a, out) { // Jahrestage verwalten
    s.anniv ||= { dates: [], done: {} };
    if (a.op === 'founded' && /^\d{4}-\d{2}-\d{2}$/.test(a.date || '') && !isNaN(Date.parse(a.date))) { s.anniv.founded = a.date; s.anniv.guess = false; out.msg = '🎂 Gründungstag gespeichert'; annivCheck(s, out); return true; }
    if (a.op === 'add' && okName(a.name) && /^\d{4}-\d{2}-\d{2}$/.test(a.date || '') && !isNaN(Date.parse(a.date))) {
      if (s.anniv.dates.length >= 8) { out.msg = 'Höchstens 8 Jahrestage.'; return false; }
      s.anniv.dates.push({ name: a.name.trim().slice(0, 30), md: a.date.slice(5), y: +a.date.slice(0, 4) });
      out.msg = `💕 „${a.name.trim().slice(0, 30)}“ gemerkt – an diesem Tag gibt's ein Feuerwerk!`;
      annivCheck(s, out);
      return true;
    }
    if (a.op === 'del' && Number.isInteger(a.i) && s.anniv.dates[a.i]) { s.anniv.dates.splice(a.i, 1); return true; }
    return false;
  },
  fwstart(s, a, out) { // Sternenrakete: Feuerwerk heute Abend
    if (s.obj?.[`${a.x},${a.z}`]?.k !== 'sternenrakete') return false;
    if (s.fw?.day === s.day) { out.msg = '🎆 Heute Abend gibt es schon ein Feuerwerk!'; return false; }
    s.fw = { day: s.day, t: s.time, by: a.name || '' };
    const h = 6 + s.dayTime * 18;
    out.msg = h >= 18 ? '🚀 Zisch! Das Feuerwerk beginnt – schaut in den Himmel! (🔭)' : '🚀 Die Rakete ist bereit: Heute Abend ab 18 Uhr gibt es ein Feuerwerk!';
    out.fx.push({ x: a.x, z: a.z, txt: '🎆', k: 'sparkle' });
    out.snd = 'fanfare';
    return true;
  },
  cookin(s, a, out) { // Gericht beim Kochwettbewerb einreichen
    if (!cookOpen(s)) { out.msg = 'Der Kochwettbewerb ist sonntags von 9 bis 18 Uhr.'; return false; }
    if (typeof a.id !== 'string' || ITEMS[a.id]?.cat !== 'dish' || !(s.inv[a.id] > 0)) return false;
    const who = s._who || 'host', c = s.cook, e = c.entries[who];
    if (e && e.n >= 2) { out.msg = 'Du hast schon zwei Gerichte eingereicht!'; return false; }
    S.takeInvX(s, a.id, 1);
    const votes = c.judges.map(id => judge(s, id, a.id)), total = votes.reduce((t, v) => t + v.score, 0);
    if (!e || total > e.total) c.entries[who] = { name: a.name || 'Gast', dish: a.id, total, votes, n: (e?.n || 0) + 1 };
    else e.n++;
    out.cookVotes = votes.map(v => ({ ...v, name: NPC_DATA[v.id].name, icon: NPC_DATA[v.id].icon }));
    out.msg = `🍳 ${ITEMS[a.id].icon} ${ITEMS[a.id].name}: ${total} von 30 Punkten!`;
    out.snd = total >= 24 ? 'fanfare' : 'ach';
    S.questEventX(s, 'cookoff', 1, out);
    return true;
  },
  nightbuy(s, a, out) { // Nachtmarkt
    const o = s.night?.day === s.day && s.night.offers[a.i];
    if (!nightOpen(s) || !o || o.sold || !Number.isInteger(a.i)) return false;
    if (s.money < o.price) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= o.price;
    o.sold = 1;
    if (o.fake) {
      S.addInvX(s, 'faelschung', 1);
      out.msg = `🎭 Oh nein … beim genauen Hinsehen: ${o.why}! Das war eine Fälschung. Mottilda kichert und flattert davon.`;
      out.snd = 'fail';
    } else {
      S.addInvX(s, o.id, 1);
      s.stats.nightBuys = (s.stats.nightBuys || 0) + 1;
      out.msg = `🏮 Echt! ${ITEMS[o.id].icon} ${ITEMS[o.id].name} gehört jetzt euch.`;
      out.got = o.id;
      out.snd = 'love';
    }
    return true;
  },
  stalladd(s, a, out) { // etwas am Tauschstand anbieten
    const st = (s.stall ||= { offers: [], log: [] });
    if (typeof a.id !== 'string' || !ITEMS[a.id] || !Number.isInteger(a.n) || a.n < 1 || a.n > 99) return false;
    if (st.offers.length >= STALL_MAX) { out.msg = 'Der Stand ist voll.'; return false; }
    const price = Number.isInteger(a.price) && a.price > 0 && a.price <= 999999 ? a.price : 0, want = typeof a.want === 'string' && ITEMS[a.want] ? a.want : null;
    if (!price && !want) return false;
    if (!S.takeInvX(s, a.id, a.n)) return false;
    st.offers.push({ id: a.id, n: a.n, price, want, wn: want ? Math.max(1, Math.min(99, a.wn | 0 || 1)) : 0, by: (a.name || 'Gast').slice(0, 16), key: s._who || 'host', day: s.day });
    out.msg = `🏪 ${a.n}× ${ITEMS[a.id].icon} ${ITEMS[a.id].name} liegt jetzt am Tauschstand.`;
    out.snd = 'place';
    return true;
  },
  stalltake(s, a, out) { // eigenes Angebot zurücknehmen
    const st = s.stall, o = st?.offers?.[a.i];
    if (!o || !Number.isInteger(a.i) || (o.key !== (s._who || 'host') && (s._who || 'host') !== 'host')) return false;
    st.offers.splice(a.i, 1);
    if (s.pinv?.[o.key]) s.pinv[o.key][o.id] = (s.pinv[o.key][o.id] || 0) + o.n; else S.addInvX(s, o.id, o.n);
    out.msg = 'Zurück in die Tasche.';
    return true;
  },
  stallswap(s, a, out) { // Tausch annehmen: gewünschte Sache geben, Angebot bekommen
    const st = s.stall, o = st?.offers?.[a.i];
    if (!o || !Number.isInteger(a.i) || !o.want) return false;
    if (o.key === (s._who || 'host')) { out.msg = 'Das ist dein eigenes Angebot.'; return false; }
    if (!S.takeInvX(s, o.want, o.wn)) { out.msg = `Dafür brauchst du ${o.wn}× ${ITEMS[o.want].icon} ${ITEMS[o.want].name}.`; return false; }
    st.offers.splice(a.i, 1);
    const bag = s.pinv?.[o.key] || s.inv;
    bag[o.want] = (bag[o.want] || 0) + o.wn;
    S.addInvX(s, o.id, o.n);
    (st.log ||= []).push({ day: s.day, txt: `${a.name || 'Jemand'} hat ${o.wn}× ${ITEMS[o.want].icon} gegen ${o.n}× ${ITEMS[o.id].icon} von ${o.by} getauscht` });
    if (st.log.length > 12) st.log.shift();
    out.msg = `🤝 Getauscht! ${o.n}× ${ITEMS[o.id].icon} ${ITEMS[o.id].name} ist jetzt deins.`;
    out.snd = 'love';
    return true;
  },
  tripgo(s, a, out) { // mit Käpt'n Flossi zur Zufallsinsel (jeden Tag eine neue)
    if (s.money < TRIP_PRICE) { out.msg = `Der Ausflug kostet ${fmt(TRIP_PRICE)} Taler.`; return false; }
    s.money -= TRIP_PRICE;
    if (s.trip?.day !== s.day) s.trip = { seed: 1 + rnd(2 ** 30), day: s.day, used: {} };
    const K = TRIP_KINDS[tripLayout(s.trip.seed).kind];
    s.stats.isleTrips = (s.stats.isleTrips || 0) + 1;
    out.msg = `⛵ Heute geht's zur ${K.icon} ${K.name}! ${K.desc}.`;
    out.trip = 1;
    out.snd = 'splash';
    return true;
  },
  tact,
  vtalk(s, a, out) { // mit Besuch plaudern
    if (!vok(s, a.id)) return false;
    const r = vrec(s, a.id);
    if (r.talked !== s.day) { r.talked = s.day; r.f = (r.f || 0) + 6; S.questEventX(s, 'talk', 1, out); }
    return true;
  },
  vgift(s, a, out) { // Besuch beschenken
    if (!vok(s, a.id) || typeof a.item !== 'string' || !ITEMS[a.item] || ITEMS[a.item].gear || !S.takeInvX(s, a.item, 1)) return false;
    const r = vrec(s, a.id), V = VISITORS[a.id], love = V.loves.includes(a.item), like = V.likes.includes(a.item);
    r.f = (r.f || 0) + (love ? 30 : like ? 15 : 6);
    out.msg = `${V.icon} ${V.name}: ${love ? '„Waaas?! Das ist ja mein Allerliebstes! Danke, danke, danke!“' : like ? '„Oh, wie lieb! Das mag ich sehr.“' : '„Danke schön! Wie aufmerksam.“'}`;
    out.snd = love ? 'love' : 'harvest';
    S.questEventX(s, 'gift', 1, out);
    return true;
  },
  vinvite(s, a, out) { // Besuch zum Bleiben einladen
    if (s.camper?.id !== a.id || !VISITORS[a.id]) return false;
    if (Object.keys(s.residents || {}).length + (s.pending || []).length >= MAX_RESIDENTS) { out.msg = `Es wohnen schon ${MAX_RESIDENTS} Gäste auf der Insel – mehr Platz gibt es nicht.`; return false; }
    if ((s.pending ||= []).includes(a.id)) return false;
    s.pending.push(a.id);
    S.addInvX(s, 'grundstueck', 1);
    out.msg = `🏡 ${vname(a.id)} möchte bleiben! Stell das 🪧 Grundstück im 🔨 Baumodus auf – am nächsten Morgen steht dort ein Häuschen.`;
    out.got = 'grundstueck';
    out.snd = 'fanfare';
    return true;
  },
  vmove(s, a, out) { // Umzugsfrage beantworten
    const r = s.residents?.[a.id];
    if (!r?.ask || typeof a.ok !== 'boolean') return false;
    if (a.ok) { r.leave = s.day; r.ask = 0; out.msg = `${vname(a.id)}: „Danke, dass ihr mich versteht. Morgen früh reise ich los. Ich werde euch vermissen!“`; }
    else { r.ask = 0; r.f = (r.f || 0) + 20; out.msg = `${vname(a.id)}: „Ihr wollt, dass ich bleibe? … Dann bleibe ich! 💕“`; }
    out.snd = 'love';
    return true;
  },
  melody(s, a, out) { // eigene Inselmelodie (16 Schritte, 0 = Pause, 1–10 = Töne)
    if (!Array.isArray(a.notes) || a.notes.length !== 16 || !a.notes.every(n => Number.isInteger(n) && n >= 0 && n < MEL_NOTES.length) || !a.notes.some(n => n)) return false;
    s.melody = { notes: a.notes.slice(), made: s.day, by: (a.by || '').slice(0, 16) };
    out.msg = '🎶 Die neue Inselmelodie ist gespeichert! Sie erklingt, wenn jemand ankommt, und mittags am Rathaus.';
    out.snd = 'ach';
    return true;
  },
  patsave(s, a, out) { // Muster speichern
    if (!Number.isInteger(a.i) || a.i < 0 || a.i >= PAT_SLOTS || !validPx(a.px)) return false;
    s.patterns ||= [];
    s.patterns[a.i] = { name: (typeof a.name === 'string' && a.name.trim() ? a.name.trim() : 'Muster ' + (a.i + 1)).slice(0, 20), px: a.px, by: (a.by || '').slice(0, 16) };
    out.msg = `🎨 „${s.patterns[a.i].name}“ gespeichert`;
    out.snd = 'place';
    return true;
  },
  patuse(s, a, out) { // als Inselfahne oder Muster-Weg benutzen
    if (!Number.isInteger(a.i) || !s.patterns?.[a.i] || !['flag', 'path'].includes(a.as)) return false;
    s[a.as === 'flag' ? 'flagPat' : 'pathPat'] = a.i;
    out.msg = a.as === 'flag' ? '🚩 Die Inselfahne zeigt jetzt dein Muster!' : '🎨 Muster-Wege zeigen jetzt dieses Muster (Wege-Designer → 🎨 Muster-Weg).';
    out.snd = 'love';
    return true;
  },
  hpat(s, a, out) { // Bilderrahmen im Haus: nächstes Muster zeigen
    const k = `${a.x},${a.z}`, o = s.home?.walls?.[k] || s.home?.items?.[k];
    if (!o || !FURNITURE[o.k]?.pattern) return false;
    const have = (s.patterns || []).map((p, i) => p ? i : -1).filter(i => i >= 0);
    if (!have.length) { out.msg = '🎨 Male erst ein Muster im Muster-Editor (📱 → 🎨).'; return false; }
    o.p = have[(have.indexOf(o.p) + 1) % have.length];
    out.snd = 'click';
    return true;
  },
  catbuy(s, a, out) { // aus dem Katalog nachbestellen
    if (typeof a.id !== 'string' || !s.catalog?.[a.id] || !catalogOk(a.id) || !ITEMS[a.id]) return false;
    const cost = catalogPrice(a.id);
    if (s.money < cost) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= cost;
    S.addInvX(s, a.id, 1);
    out.msg = `📦 ${ITEMS[a.id].icon} ${ITEMS[a.id].name} nachbestellt!`;
    out.snd = 'coin';
    return true;
  },
};
