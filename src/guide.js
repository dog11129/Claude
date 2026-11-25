// Inselführer: Was gibt es auf der Insel, was habt ihr schon entdeckt – und wie fängt man an?
// Reine Daten + Prüf-Funktionen (laufen auch in Node-Tests).
import { PLACE, ALBUM } from './data.js';

const has = (s, ...k) => Object.values(s.obj || {}).some(o => k.includes(o?.k));
const album = (s, list) => list.some(id => s.album?.[id]);
const anyInv = (s, id) => s.inv?.[id] > 0 || Object.values(s.pinv || {}).some(v => v?.[id] > 0);

// [Bereich, Symbol, Name, Wie fängt man an?, entdeckt?]
export const GUIDE = [
  ['Insel', '🎣', 'Angeln', 'Mit der Angel ans Wasser – Fluss, Teich und Meer haben eigene Fische. Erst ziehen, wenn der Schwimmer richtig abtaucht!', s => album(s, ALBUM.fish)],
  ['Insel', '🦋', 'Insekten fangen', 'Kescher in der Leiste wählen und an Blumen anschleichen.', s => album(s, ALBUM.bug)],
  ['Insel', '🦴', 'Fossilien', 'Mit der Schaufel an den Stern-Rissen graben.', s => album(s, ALBUM.fossil)],
  ['Insel', '🏛️', 'Museum', 'Fische, Insekten und Fossilien im Museum ausstellen.', s => Object.keys(s.museum || {}).length > 0],
  ['Insel', '🏗️', 'Rathaus-Projekte', 'Im Rathaus ein Projekt wählen, Bauplatz aufstellen und Taler spenden.', s => Object.values(s.obj || {}).some(o => PLACE[o?.k]?.kind === 'project')],
  ['Insel', '🗺️', 'Neue Gebiete', 'Im Rathaus Wald, Wiese und Höhle freischalten.', s => Object.keys(s.areas || {}).length > 0],
  ['Insel', '🗺️', 'Schatzkarten', 'In der Flaschenpost am Strand stecken manchmal Kartenstücke.', s => (s.tmap?.n || 0) > 0 || (s.stats?.bigTreasure || 0) > 0],
  ['Nachbarn', '💬', 'Freundschaft', 'Plaudern, Geschenke machen und Wünsche erfüllen – bis zu 10 Herzen.', s => Object.values(s.npc || {}).some(n => (n?.f || 0) >= 100)],
  ['Nachbarn', '📖', 'Nachbar-Geschichten', 'Ab 1 Herz erzählt jeder Nachbar eine Geschichte in vier Kapiteln (📖 im Gespräch).', s => Object.keys(s.tales || {}).length > 0],
  ['Nachbarn', '🏠', 'Nachbarzimmer', 'Ab 3 Herzen an die Haustür eines Nachbarn gehen und sein Zimmer einrichten.', s => Object.keys(s.nhome || {}).length > 0],
  ['Nachbarn', '🏕️', 'Campingplatz & Besuch', 'Rathaus-Projekt: Besuch zeltet auf der Insel und zieht vielleicht ein.', s => has(s, 'campingplatz')],
  ['Unterwegs', '🛍️', 'Bummelgasse', 'Durchs Tor im Norden: Schneiderei, Gärtnerei und Mondschein-Club.', s => Object.keys(s.songs || {}).length > 0 || Object.keys(s.wardrobe || {}).length > 0],
  ['Unterwegs', '🏝️', 'Tropeninsel', 'Am Steg bringt euch Käpt’n Flossi für 1.000 Taler hinüber.', s => (s.medals || 0) > 0 || Object.keys(s.tropic?.picked || {}).length > 0],
  ['Unterwegs', '⛵', 'Ausflüge ins Blaue', 'Am Steg: jeden Tag eine andere Zufallsinsel.', s => (s.stats?.isleTrips || 0) > 0 || !!s.trip?.seed],
  ['Unterwegs', '🏮', 'Höhlen-Tiefen', 'An der Werkbank eine Grubenlaterne bauen (Kristall, Eisen, Holz), dann hinten in der Kristallhöhle die Treppe hinab. Kristalle, eine singende Tür und ganz unten der Kristallsee.', s => s.depth?.lv >= 1],
  ['Unterwegs', '🪸', 'Korallenriff', 'Mit Neoprenanzug zur rot-weißen Boje schwimmen und abtauchen.', s => !!s.reef?.found],
  ['Unterwegs', '⚓', 'Schiffswrack', 'Zur gelben Boje im Westen schwimmen und abtauchen. Die Bullaugen verraten den Code der Kajüte.', s => !!s.wreck?.found],
  ['Unterwegs', '🚡', 'Seilbahn', 'Rathaus-Projekt: schwebt zu Wald, Wiese und Höhle.', s => has(s, 'seilbahn')],
  ['Unterwegs', '🎈', 'Ballonfahrt', 'Rathaus-Projekt Ballonplatz: Rundflug mit Geschenken am Himmel.', s => (s.stats?.rides || 0) > 0],
  ['Unterwegs', '🚲', 'Fahrrad', 'Im Krämerladen (Werkzeug) – fast doppelt so schnell.', s => anyInv(s, 'fahrrad')],
  ['Garten', '🌷', 'Blumen & Gemüse', 'Samen kaufen, pflanzen, gießen. Neue Sorten in der Gärtnerei.', s => Object.keys(s.tiles || {}).length > 0],
  ['Garten', '🐔', 'Bauernhof', 'Hühnerstall und Kuhweide (Krämerladen ➜ Hof): füttern, streicheln, Eier & Milch.', s => has(s, 'huehnerstall', 'kuhweide')],
  ['Garten', '🦋', 'Schmetterlingsgarten', 'Schmetterlingshaus (Gärtnerei) zwischen die Lieblingsblumen seltener Falter stellen.', s => has(s, 'schmetterlingshaus')],
  ['Garten', '🌱', 'Gewächshaus & Sprinkler', 'Im Gewächshaus wächst alles das ganze Jahr, Sprinkler gießen von allein.', s => has(s, 'gewaechshaus', 'sprinkler', 'sternsprinkler')],
  ['Feste & Spiele', '🏆', 'Kochwettbewerb', 'Sonntags 9–18 Uhr in der Gartenküche.', s => (s.stats?.cookWins || 0) > 0],
  ['Feste & Spiele', '🏮', 'Nachtmarkt', 'Freitags ab 18 Uhr auf dem Dorfplatz – Vorsicht vor Fälschungen!', s => (s.stats?.nightBuys || 0) > 0],
  ['Feste & Spiele', '🏰', 'Sandburgen & Drachenfest', 'Samstags am Strand: Sommer Sandburgen, Frühling & Herbst Drachen.', s => (s.stats?.beachWins || 0) > 0 || (s.stats?.kiteBest || 0) > 0 || Object.keys(s.castles || {}).length > 0],
  ['Feste & Spiele', '🔥', 'Grillabend', 'Strandgrill aufstellen, abends drei Sachen grillen – alle Nachbarn kommen.', s => (s.stats?.grilled || 0) > 0],
  ['Feste & Spiele', '🎲', 'Spieleabend', 'Spieltisch ins Haus stellen: Vier gewinnt und Memory.', s => (s.stats?.games || 0) > 0],
  ['Feste & Spiele', '📸', 'Fotowettbewerb', 'Im Fotomodus auf 🏆 tippen. Sonntags bewertet die Jury.', s => Object.keys(s.photoc?.entries || {}).length > 0 || !!s.photoc?.last],
  ['Kreativ', '🎨', 'Muster-Editor', 'Eigene Muster für Kleidung, Fahne, Wege und Bilderrahmen.', s => (s.patterns || []).some(Boolean)],
  ['Kreativ', '🎹', 'Klavier & Inselmelodie', 'Klavier ins Haus stellen und eine Inselmelodie komponieren.', s => !!s.melody],
  ['Kreativ', '✨', 'Sternbilder', 'Im Handy Sterne verbinden – sie leuchten jede Nacht.', s => (s.consts || []).length > 0],
  ['Kreativ', '🏡', 'Zuhause einrichten', 'Im Haus den 🔨 Baumodus öffnen.', s => Object.keys(s.home?.items || {}).length > 0],
];
export function guideList(s) {
  return GUIDE.map(([area, icon, name, how, test]) => { let done = false; try { done = !!test(s); } catch { /* fehlt im Spielstand */ } return { area, icon, name, how, done }; });
}
