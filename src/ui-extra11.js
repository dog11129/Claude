// Fenster für Inselleben 15 „Winterzauber“: Adventskalender, Glückskeks, Koi-Teich, Puzzle, Federball, Kostümfest,
// Erinnerungsbaum, Polaroid-Wand, Goldschmiede (Reiter im Salon) und die neuen Spiele am Spieltisch.
import { ITEMS } from './data.js';
import * as S from './state.js';
import * as E from './extras15.js';
import { pzStyle, pzPiece, myLook } from './client/fun11.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const act = a => `data-act='${JSON.stringify(a)}'`;
const btn = (label, a, cls = 'pink', dis = false) => `<button class="btn small ${cls}" ${act(a)} ${dis ? 'disabled' : ''}>${label}</button>`;
const ubtn = (label, ui, data = {}, cls = 'pink', dis = false) => `<button class="btn small ${cls}" data-ui="y:${ui}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} ${dis ? 'disabled' : ''}>${label}</button>`;
const row = (icon, title, sub, right = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${right}</div></div>`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const myKey = g => g.players?.[g.me]?.key || 'host';
const hex = c => '#' + c.toString(16).padStart(6, '0');

// ---------- Adventskalender ----------
const DOOR_ORDER = [7, 18, 3, 22, 11, 14, 1, 9, 20, 5, 16, 24, 12, 2, 23, 8, 19, 6, 15, 21, 4, 17, 10, 13]; // wie auf einem echten Kalender: bunt gemischt
const DOOR_ICON = g => (g.item ? ITEMS[g.item]?.icon || '🎁' : g.money ? '💰' : g.stars ? '⭐' : '🎁');
function advent15(s, g) {
  const I = E.adventInfo(), me = myKey(g), open = E.adventOpened(s, me);
  let h = I.on ? hero('🎄 Advent', I.day <= 24 ? `Heute ist der ${I.day}. Dezember` : 'Frohe Weihnachten!', I.day <= 24 ? 'Jeden Tag ein Türchen – für jede:n von euch eins. Verpasste Türchen könnt ihr bis Silvester nachholen.' : 'Der Kalender bleibt bis Silvester hängen: Holt nach, was noch zu ist.')
    : hero('🎄 Advent', I.soon ? `Noch ${I.soon === 1 ? 'ein Tag' : I.soon + ' Tage'} bis zum 1. Dezember` : 'Der Kalender öffnet am 1. Dezember', '24 Türchen warten auf euch – am 24. steckt etwas ganz Besonderes dahinter.');
  h += `<div class="adv15">${DOOR_ORDER.map(d => {
    const got = open.includes(d), can = I.on && d <= I.max && !got, G = E.ADVENT[d];
    return `<button class="${got ? 'got' : can ? 'can' : 'shut'}${d === 24 ? ' big' : ''}${g.adv15 === d ? ' new' : ''}" ${can ? act({ t: 'advent15', d }) : 'disabled'} title="${got ? esc(E.adventLabel(G)) : 'Türchen ' + d}">${got ? `<span>${DOOR_ICON(G)}</span>` : `<b>${d}</b>`}</button>`;
  }).join('')}</div>`;
  const last = g.adv15 && open.includes(g.adv15) ? g.adv15 : open.length ? Math.max(...open) : 0;
  if (last) h += `<div class="note">🎁 Türchen ${last}: <b>${esc(E.adventLabel(E.ADVENT[last]))}</b>${last === 24 ? ' – frohe Weihnachten! 🎄' : ''}</div>`;
  h += `<div class="note">${open.length} von 24 Türchen geöffnet${I.on && E.adventWaiting(s, me) ? ' · tippe ein leuchtendes Türchen an' : ''}.</div>`;
  return h;
}

// ---------- Glückskeks ----------
function cookie15(s, g) {
  const me = myKey(g), i = E.cookieOpen(s, me), k = E.luckOf(s), L = k ? E.LUCKS[k] : null;
  let h = i === null ? `<div class="cookie15"><button class="ck15" ${act({ t: 'cookie15' })}>🥠</button><b>Dein Glückskeks für heute</b><small>Antippen und knacken!</small></div>`
    : `<div class="cookie15"><div class="ck15 open">🥠</div><div class="slip15">${esc(E.FORTUNES[i] || '')}</div><small>Morgen liegt ein neuer Keks für dich bereit.</small></div>`;
  h += L ? row(L[0], `Tagesglück: ${L[1]}`, L[2], '<span class="chip">heute</span>') : row('🍀', 'Tagesglück', 'Der erste Keks des Tages entscheidet, worin die ganze Insel heute Glück hat.', '');
  h += `<div class="note">Mögliches Glück: ${Object.values(E.LUCKS).map(l => `${l[0]} ${l[1]}`).join(' · ')}</div>`;
  return h;
}

// ---------- Koi-Teich ----------
const koiDot = v => `<span class="koi15" style="--a:${hex(E.KOI[v][2])};--b:${hex(E.KOI[v][3] ?? E.KOI[v][2])}"></span>`;
function koi15(s, g, tab) {
  const K = s.koi || { fish: [], fed: { day: 0, by: [] }, book: {}, news: null }, cap = E.koiCap(s), me = myKey(g), water = E.waterCount(s);
  if (tab === 'buch') {
    const n = Object.keys(K.book).length;
    let h = hero('📖 Koi-Buch', `${n} von ${E.KOI_IDS.length} Sorten`, 'Manche Sorten gibt es nur als Nachwuchs: Füttert eure Koi jeden Tag – am besten beide –, dann schlüpft über Nacht manchmal ein Kleines. Welche Farbe es bekommt, hängt von den Eltern ab.');
    h += E.KOI_IDS.map(v => (K.book[v] ? row(koiDot(v), `${E.KOI[v][1]} ${E.KOI[v][0]}`, `Seit Tag ${K.book[v]} · ${E.koiHint(v)}`) : row('❔', '???', E.KOI[v][4] ? 'Gibt es bei Wanda zu kaufen.' : `Tipp: ${E.koiHint(v)}`))).join('');
    h += `<div class="note">🎏 Fünf Sorten: Wanda schickt eine Koi-Fahne. 🏆 Alle zwölf: eine Statue für euren Teich.</div>`;
    return h;
  }
  let h = hero('🐟 Koi-Teich', `${K.fish.length} von ${cap} Plätzen`, cap < 1 ? 'Für Koi braucht ihr einen Teich aus mindestens zwei Wasser-Kacheln (🔨 Bauen ➜ ⛰️ Gelände ➜ Wasser).' : `Euer Wasser: ${water} Kacheln – je zwei Kacheln ein Fisch, höchstens ${E.KOI_MAX}.`);
  if (K.news?.day === s.day) h += `<div class="note">🐣 Über Nacht ist ein <b>${E.KOI[K.news.v][1]} ${E.KOI[K.news.v][0]}</b> geschlüpft!${K.news.neu ? ' Eine neue Sorte fürs Koi-Buch!' : ''}</div>`;
  if (K.fish.length) {
    const fed = E.koiFedBy(s, me), n = K.fed.day === s.day ? K.fed.by.length : 0;
    h += row('🍞', 'Füttern', fed ? (n >= 2 ? 'Ihr habt heute beide gefüttert – die besten Chancen auf Nachwuchs. 💕' : 'Du hast heute schon gefüttert. Füttert ihr beide, schlüpft öfter ein Kleines.') : 'Einmal am Tag für jede:n. Nur gefütterte Koi bekommen Nachwuchs.', btn('🍞 Füttern', { t: 'koi15', op: 'feed' }, 'pink', fed));
    h += '<h3>Eure Koi</h3>' + K.fish.map((f, i) => (g.koiSel === i
      ? row(koiDot(f.v), `<input id="koiname15" class="tin14" maxlength="12" placeholder="Name" value="${esc(f.n || '')}">`, E.KOI[f.v][0], `${ubtn('💾', 'koiname', { i })} ${btn(`Abgeben (+${fmt(E.KOI[f.v][5])})`, { t: 'koi15', op: 'sell', i }, 'white')}`)
      : row(koiDot(f.v), esc(f.n || E.KOI[f.v][0]), `${f.n ? E.KOI[f.v][0] + ' · ' : ''}seit Tag ${f.b}`, ubtn('✏️', 'koisel', { i }, 'white')))).join('');
  }
  if (cap > 0) h += '<h3>Bei Wanda bestellen</h3>' + E.KOI_IDS.filter(v => E.KOI[v][4]).map(v => row(koiDot(v), `${E.KOI[v][1]} ${E.KOI[v][0]}`, `${fmt(E.KOI[v][4])} Taler`, btn('Kaufen', { t: 'koi15', op: 'buy', v }, 'pink', K.fish.length >= cap || s.money < E.KOI[v][4]))).join('');
  return h;
}

// ---------- Puzzle ----------
const pzPos = i => `background-position:${(i % E.PZ_W) * 100 / (E.PZ_W - 1)}% ${Math.floor(i / E.PZ_W) * 100 / (E.PZ_H - 1)}%`;
function puzzle15(s, g) {
  const P = s.puzzle || { m: 0, got: [], done: 0 }, me = myKey(g), left = E.puzzleLeft(s, me), [, name, icon] = E.PUZZLES[P.m];
  pzStyle(P.m);
  const piece = left > 0 ? pzPiece(s, g) : -1;
  let h = hero('🧩 Puzzle', `${icon} ${name}`, `${P.got.length} von ${E.PZ_N} Teilen liegen. Jede:r legt ${E.PZ_DAY} Teile am Tag – das fertige Bild hängt ihr euch an die Wand.`);
  h += piece >= 0 ? `<div class="pznext15"><i class="pzp15" style="${pzPos(piece)}"></i><div><b>Dein nächstes Teil</b><small>Wo gehört es hin? Tippe den Platz im Rahmen an. Heute noch ${left} ${left === 1 ? 'Teil' : 'Teile'}.</small></div></div>`
    : `<div class="note">${left > 0 ? 'Alle Teile liegen!' : `Für heute hast du deine ${E.PZ_DAY} Teile gelegt – morgen geht es weiter. 🧩`}</div>`;
  h += `<div class="pz15">${Array.from({ length: E.PZ_N }, (_, i) => (P.got.includes(i) ? `<i style="${pzPos(i)}"></i>` : `<button data-ui="y:pz" data-i="${i}" ${piece >= 0 ? '' : 'disabled'} aria-label="Platz ${i + 1}"></button>`)).join('')}</div>`;
  if (P.done) h += `<div class="note">🖼️ Schon fertig: ${P.done} ${P.done === 1 ? 'Puzzle' : 'Puzzles'}. Es gibt ${E.PUZZLES.length} Motive – danach geht es von vorn los.</div>`;
  return h;
}

// ---------- Federball ----------
function rally15(s, g) {
  const R = s.rally || { best: 0, solo: 0, n: 0, p: [], names: [] }, live = E.rallyLive(s), me = myKey(g), duo = !!R.p?.[1];
  if (live && R.p.includes(me)) {
    const mine = R.p[duo ? R.turn : 0] === me;
    let h = `<div class="rcount15"><b>${R.n}</b><small>${duo ? `${esc(R.names[0])} & ${esc(R.names[1])}` : 'Allein am Netz'}</small></div>`;
    h += `<div class="note"><b>${mine ? 'Der Ball kommt – drück im grünen Feld!' : `${esc(R.names[R.turn] || '')} ist dran …`}</b></div>`;
    h += `<div class="rbar15${mine ? '' : ' off'}"><b id="rzone15"></b><i id="rmark15"></i></div>`;
    h += `<div class="pattools"><button class="btn pink rhit15" data-ui="y:rhit" ${mine ? '' : 'disabled'}>🏸 Schlag!</button></div>`;
    h += `<div class="note">Mit jedem Schlag wird der Ball schneller und das Feld kleiner. Rekord zu zweit: ${R.best} · allein: ${R.solo}</div>`;
    return h;
  }
  let h = hero('🏸 Federball', R.best ? `Rekord zu zweit: ${R.best} Schläge` : 'Wie lange bleibt der Ball in der Luft?', `${R.best ? `Aufgestellt von ${esc(R.bestBy)}. ` : ''}Schlagt den Ball abwechselnd zurück – wer dran ist, drückt im richtigen Moment. Ab 10 Schlägen gibt es einmal am Tag 200 Taler und 3 Herzpunkte.${R.solo ? ` Allein geschafft: ${R.solo}.` : ''}`);
  if (live) return h + `<div class="note">Gerade spielen ${esc(R.names.filter(Boolean).join(' und '))} – ${R.n} Schläge bisher. Schau zu!</div>`;
  const others = Object.values(g.players || {}).filter(p => p.key && p.key !== me);
  h += `<div class="pattools">${others.map(p => ubtn(`🏸 Mit ${esc(p.name)}`, 'rstart', { vs: p.key, name: p.name })).join('')}${ubtn('Allein üben', 'rstart', { vs: 'solo' }, 'white')}</div>`;
  if (!others.length) h += '<div class="note">Zu zweit macht es am meisten Spaß – sobald ihr beide auf der Insel seid, könnt ihr gegeneinander aufschlagen.</div>';
  return h;
}

// ---------- Kostümfest ----------
function kostuem15(s, g) {
  const fest = E.kostuemFest(s), bon = s.inv.bonbon || 0, pk = s.inv.kuerbis || 0, look = myLook();
  let h = hero('🎃 Kostümfest', fest ? 'Heute ist Kürbisfest!' : 'Am 5. Herbsttag ist Kürbisfest', fest ? `Besucht alle Nachbarn: Jede:r hat Bonbons für euch${E.candyBonus(s) ? ' – und weil ihr schon geschnitzt habt, gibt es eins mehr' : ''}. Die ersten ${E.CARVE_CANDY} geschnitzten Kürbisse bringen heute je 2 Bonbons.` : 'Schnitzen und verkleiden könnt ihr euch immer – Bonbons gibt es am Festtag von den Nachbarn und fürs Kürbisschnitzen.');
  h += `<h3>🔪 Kürbis schnitzen <small>(du hast ${pk} 🎃)</small></h3><div class="pattools">${E.FACES.map(([f, n, ic]) => btn(`${ic} ${n}`, { t: 'carve15', face: f }, 'white', pk < 1)).join('')}</div>`;
  h += `<div class="note">Aus einem Kürbis wird eine Laterne für draußen – nachts leuchtet sie.${pk < 1 ? ' Kürbisse wachsen im Herbst auf dem Feld.' : ''}</div>`;
  h += `<h3>🎭 Kostümkiste <small>(du hast ${bon} 🍬)</small></h3>`;
  h += E.COSTUMES.map(([id, n, c]) => (s.wardrobe?.[id] ? row('🎭', n, look.hat === id ? 'Trägst du gerade' : 'In eurer Garderobe', ubtn(look.hat === id ? '✓' : 'Anziehen', 'wearhat', { id }, 'white', look.hat === id)) : row('🎭', n, `${c} Bonbons`, btn(`🍬 ${c}`, { t: 'costume15', id }, 'pink', bon < c)))).join('');
  return h;
}

// ---------- Erinnerungsbaum ----------
function tree15(s, g) {
  const T = s.tree || { days: 0, notes: [], noted: {} }, st = E.treeStage(s), next = E.treeNext(s), pts = E.treePts(s), me = myKey(g), marks = E.treeMarks(s);
  let h = hero('🌳 Erinnerungsbaum', E.TREE_NAMES[st], `${T.days} gemeinsame ${T.days === 1 ? 'Tag' : 'Tage'} · ${s.day} Tage auf der Insel. Der Baum wächst jeden Tag ein Stück – und doppelt so schnell an Tagen, an denen ihr beide da seid.${next ? ` Noch ${next - pts} Wachstumspunkte bis zur nächsten Größe.` : ' Größer wird er nicht – aber immer voller.'}`);
  h += `<h3>✨ Anhänger <small>(${marks.length} von ${E.TREE_MARKS.length})</small></h3><div class="marks15">${E.TREE_MARKS.map(m => `<span class="${m[3](s) ? 'on' : ''}" title="${esc(m[2])}">${m[1]}<small>${esc(m[2])}</small></span>`).join('')}</div>`;
  h += `<h3>💌 Zettel am Baum <small>(${T.notes.length})</small></h3>`;
  h += T.noted?.[me] === s.day ? '<div class="note">Heute hängt schon ein Zettel von dir – morgen wieder.</div>' : `<div class="diaryadd"><input id="treenote15" maxlength="${E.NOTE_LEN}" placeholder="Was war heute schön?">${ubtn('💌 Aufhängen', 'treenote')}</div>`;
  h += T.notes.length ? T.notes.map((n, i) => [n, i]).reverse().map(([n, i]) => row('💌', esc(n.t), `${esc(n.n)} · Tag ${n.d}`, n.w === me || g.role === 'host' ? btn('🗑️', { t: 'tree15', op: 'del', i }, 'white') : '')).join('') : '<div class="note">Noch hängt nichts. Schreibt euch kleine Erinnerungen – einen Zettel am Tag, jeder bringt einen Herzpunkt.</div>';
  return h;
}

// ---------- Polaroid-Wand ----------
function pola15(s, g) {
  const P = s.pola || { img: {}, cap: {}, got: [] }, pick = g.polaPick != null;
  let h = pick ? hero('🖼️ Polaroid', 'Auf welchen Platz?', 'Wähle einen der sechs Plätze. Beim ersten Mal bekommst du das Bild für die Wand in die Tasche – später tauschst du einfach das Foto aus.')
    : hero('🖼️ Polaroid-Wand', `${Object.keys(P.img).length} von ${E.POLA_SLOTS} Bildern`, 'So kommt ein Foto an die Wand: 📱 Handy ➜ 📸 Fotobuch ➜ 🖼️ Fotos ➜ beim Foto auf 🖼️ tippen. Fotos macht ihr im 📷 Fotomodus.');
  h += `<div class="polas15">${Array.from({ length: E.POLA_SLOTS }, (_, k) => k + 1).map(n => `<div class="pola15"><div class="pimg15">${P.img[n] ? `<img src="${P.img[n]}" alt="">` : '<span>leer</span>'}</div><input id="polacap${n}" maxlength="${E.POLA_CAP}" placeholder="Bildunterschrift" value="${esc(P.cap?.[n] || '')}">${pick ? ubtn('Hier hin', 'polaset', { slot: n }) : P.img[n] ? ubtn('💾 Text', 'polacap', { slot: n }, 'white') : `<small>Platz ${n}</small>`}</div>`).join('')}</div>`;
  if (pick) h += `<div class="pattools">${ubtn('Abbrechen', 'polano', {}, 'white')}</div>`;
  return h;
}

// ---------- Goldschmiede (Reiter im Salon) ----------
export function jewelTab(s, g) {
  const look = myLook();
  let h = hero('💎 Goldschmiede', 'Schmuck aus euren Edelsteinen', 'Was ihr in den Höhlen und Felsen findet, wird hier zu Ketten, Ohrringen und Armbändern. Einmal geschmiedet, gehört das Stück euch beiden – anlegen könnt ihr es jederzeit im Aussehen (💎 Schmuck).');
  for (const [slot, title] of E.JEWEL_SLOTS) {
    h += `<h3>${title}</h3>` + E.JEWELS[slot].map(([id, name, cost, c]) => {
      const have = !!s.wardrobe?.[E.jewelKey(id)], on = look[slot] === id;
      return row(`<span class="gem15" style="background:${c}"></span>`, name + (id === 'partnerband' ? ' 💞' : ''), have ? (on ? 'Trägst du gerade' : 'In eurer Schmuckschatulle') : E.costText(cost), have ? ubtn(on ? 'Ablegen' : 'Anlegen', 'wearjw', { slot, id }, 'white') : btn('⚒️ Schmieden', { t: 'jewel15', slot, id }, 'pink', !E.canPay(s, cost)));
    }).join('');
  }
  return h;
}

// ---------- Spieltisch: Mühle und Würfelglück ----------
export const GAMES_15 = [['muehle', '⚪ Mühle'], ['dice', '🎲 Würfelglück']];
const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
export function games15(G2, g, mine) {
  if (G2.k === 'muehle') {
    const p = G2.turn, fly = E.millFly(G2, p), moves = mine && !G2.rm ? E.millMoves(G2, p) : [], takes = mine && G2.rm ? E.millTakes(G2, p) : [], sel = g.mSel;
    const hint = !mine ? '' : G2.rm ? 'Mühle! Tippe einen Stein deines Gegenübers an.' : G2.hand[p] > 0 ? `Setze einen Stein (noch ${G2.hand[p]}).` : sel == null ? (fly ? 'Du hast nur noch drei Steine: Sie dürfen springen! Tippe einen an.' : 'Tippe einen deiner Steine an, dann das Ziel.') : 'Wohin?';
    let h = `<div class="note">⚪ Mühle: 🔴 ${esc(G2.p[0].name)} (${G2.hand[0]} in der Hand) gegen 🟡 ${esc(G2.p[1].name)} (${G2.hand[1]})<br><b>${mine ? 'Du bist dran! ' + hint : `${esc(G2.p[p].name)} ist dran …`}</b></div>`;
    h += '<div class="mill15"><svg viewBox="0 0 6 6" preserveAspectRatio="none"><path d="M0 0H6V6H0ZM1 1H5V5H1ZM2 2H4V4H2ZM3 0V2M3 4V6M0 3H2M4 3H6" fill="none" stroke="#b98d5e" stroke-width=".07"/></svg>';
    h += E.MILL_XY.map(([x, y], i) => {
      const v = G2.b[i], ok = mine && (G2.rm ? takes.includes(i) : G2.hand[p] > 0 ? v < 0 : v === p ? moves.some(m => m[0] === i) : sel != null && moves.some(m => m[0] === sel && m[1] === i));
      return `<button class="${v === 0 ? 'r' : v === 1 ? 'y' : ''}${sel === i ? ' sel' : ''}${G2.last === i ? ' last' : ''}${ok && v < 0 ? ' go' : ''}${ok && G2.rm ? ' take' : ''}" style="left:${x / 6 * 100}%;top:${y / 6 * 100}%" data-ui="y:msel" data-i="${i}" ${ok ? '' : 'disabled'} aria-label="Punkt ${i + 1}"></button>`;
    }).join('') + '</div>';
    return h;
  }
  const rolled = !!G2.d[0], hold = g.dHold || [0, 0, 0, 0, 0], L = G2.lastPts, sc = rolled ? E.diceScore(G2.d) : null;
  let h = `<div class="note">🎲 Würfelglück: ${G2.p.map((q, i) => `${esc(q.name)} <b>${G2.score[i]}</b> (${G2.rd[i]}/${E.DICE_ROUNDS})`).join(' · ')}<br><b>${mine ? 'Du bist dran!' : `${esc(G2.p[G2.turn].name)} ist dran …`}</b></div>`;
  if (L && !rolled) h += `<div class="note">${L.d.map(v => PIPS[v]).join(' ')} – ${esc(G2.p[L.p].name)}: ${esc(L.name)}, ${L.pts} Punkte</div>`;
  h += `<div class="dice15">${G2.d.map((v, i) => `<button class="${rolled && hold[i] && mine ? 'hold' : ''}" data-ui="y:dhold" data-i="${i}" ${mine && rolled && G2.left > 0 ? '' : 'disabled'}>${v ? PIPS[v] : '🎲'}</button>`).join('')}</div>`;
  if (sc) h += `<div class="note">${esc(sc.name)}: <b>${sc.pts} Punkte</b>${mine && G2.left > 0 ? ` · Tippe Würfel an, die du behalten willst (noch ${G2.left}× würfeln).` : ''}</div>`;
  if (mine) h += `<div class="pattools">${ubtn(rolled ? `🎲 Nachwürfeln (${G2.left})` : '🎲 Würfeln', 'droll', {}, 'pink', rolled && (G2.left < 1 || hold.every(Boolean)))}${ubtn('✅ Aufschreiben', 'dbank', {}, 'white', !rolled)}</div>`;
  h += '<div class="note">Augen zählen immer. Dazu: Zwei Paare +5 · Drei Gleiche +10 · Drei und zwei +20 · Vier Gleiche +25 · Straße +30 · Fünf Gleiche +50.</div>';
  return h;
}

export const PANELS_15 = { advent15, cookie15, koi15, puzzle15, rally15, kostuem15, tree15, pola15 };
export const TITLES_15 = { advent15: '🎄 Advent', cookie15: '🥠 Glückskeks', koi15: '🐟 Koi-Teich', puzzle15: '🧩 Puzzle', rally15: '🏸 Federball', kostuem15: '🎃 Kostümfest', tree15: '🌳 Unser Baum', pola15: '🖼️ Polaroids' };
export const TABS_15 = { koi15: [['teich', '🐟 Teich'], ['buch', '📖 Koi-Buch']] };
export const KIND_15 = { love: ['tree15', 'pola15', 'puzzle15'], green: ['koi15', 'rally15'], blue: ['advent15', 'cookie15', 'kostuem15'] };
const polaSig = s => Object.entries(s.pola?.img || {}).map(([k, v]) => k + v.length + v.slice(-6)).join() + JSON.stringify(s.pola?.cap || {});
export const sig15 = (s, g, open) => (PANELS_15[open] ? [s.advent, s.cookie, s.luck, s.koi, s.puzzle, s.rally?.on, s.rally?.n, s.rally?.turn, s.rally?.best, s.tree, polaSig(s), s.wardrobe, s.fest, s.money, s.day, g.koiSel, g.pz15, g.polaPick, g.adv15, E.adventInfo().day, Object.keys(g.players || {}).length, E.rallyLive(s)]
  : open === 'games' ? [g.mSel, g.dHold] : open === 'salon14' ? [s.wardrobe, myLook().neck, myLook().ear, myLook().wrist] : open === 'phone' ? [E.cookieOpen(s, myKey(g)), E.adventWaiting(s, myKey(g))] : 0);
// Handy: Apps, die es nur manchmal gibt
export function apps15(s, g) {
  const I = E.adventInfo(), me = myKey(g), out = [['cookie15', '🥠', 'Glückskeks', '#ffe9c2', E.cookieOpen(s, me) === null ? 1 : 0]];
  if (I.on || I.soon) out.push(['advent15', '🎄', 'Advent', '#d9f2e0', E.adventWaiting(s, me)]);
  if (S.seasonOf(s.day) === 'autumn') out.push(['kostuem15', '🎃', 'Kostümfest', '#ffe0c2', E.kostuemFest(s) ? 1 : 0]);
  return out;
}
