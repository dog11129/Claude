// Teil von extras2.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { AREAS, nodeAt, inArea } from '../areas.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

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
  const T = Object.hasOwn(TALES, id) ? TALES[id] : null, t = (T && s.tales?.[id]) || { ch: 0 };
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
export function tale(s, a, out) {
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
