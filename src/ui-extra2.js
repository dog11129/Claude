// Fenster für Inselleben 5. Knöpfe mit ui: 'v:…' landen in src/client/fun3.js, Aktionen (t: …) gehen an den Host.
import { ITEMS, NPC_IDS, NPC_DATA } from './data.js';
import { POT_FORMS, POT_GLAZES } from './furni-data.js';
import { itemIcon } from './icons.js';
import { esc } from './world.js';
import * as V from './extras5.js';

const myKey = g => g.players?.[g.me]?.key || 'host';
const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const big = (icon, label, sub, data, cls = '', dis = false) => `<button class="big ${cls}" data-act='${JSON.stringify(data)}'${dis ? ' disabled' : ''}><span class="i">${icon}</span><span>${label}<small>${sub}</small></span></button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const row = (icon, title, sub, buttons = '') => `<div class="row"><div class="ic">${icon}</div><div class="tx"><b>${title}</b><small>${sub}</small></div><div class="bt">${buttons}</div></div>`;
const npc = id => `${NPC_DATA[id]?.icon || ''} ${NPC_DATA[id]?.name || id}`;
const fmt = n => Math.round(n).toLocaleString('de-DE');
const hour = s => 6 + s.dayTime * 18;

export const TITLES_V = { xbuild: '🏠 Mehr Zimmer', compost: '🟫 Komposter', pottery: '🏺 Töpferscheibe', florist: '💐 Blumenladen', pony: '🐴 Ponyhof', petschool: '🐾 Haustierschule', olympia: '🏅 Inselolympiade', hunt: '🔍 Schnitzeljagd', cinema: '🎬 Freiluftkino', theater: '🎭 Inselbühne', train: '🚂 Bimmelbahn', lighthouse: '🗼 Leuchtturm', penpal: '📮 Brieffreunde', party: '🎉 Geburtstagsparty' };
export const APPS_V = [['rooms', '🪜', 'Zimmer', '#e8c8a8'], ['florist', '💐', 'Blumen', '#ffc8e0'], ['petschool', '🐾', 'Tierschule', '#f0d8b0'], ['olympia', '🏅', 'Olympiade', '#c8e0ff'], ['hunt', '🔍', 'Suche', '#d8f0c0'], ['penpal', '📮', 'Post', '#ffd8a8'], ['party', '🎉', 'Party', '#ffd0f0']];
export const APP_PANELS_V = { rooms: ['xbuild'], florist: ['florist'], petschool: ['petschool'], olympia: ['olympia'], hunt: ['hunt'], penpal: ['penpal'], party: ['party'] };

export const PANELS_V = {
  xbuild(s) {
    let h = hero('🪜 Mehr Platz im Haus', 'Dachboden & Keller', 'Ab Ausbaustufe 3 könnt ihr einen Dachboden und einen Keller einrichten. Danach liegt eine Treppe in der Tasche – im Haus aufstellen, antippen und hinauf bzw. hinunter. Mit dem 🖌️ Farbpinsel (Krämerladen) könnt ihr im Baumodus Möbel umlackieren.');
    for (const id of ['attic', 'cellar']) { const X = V.XROOMS[id], has = !!s.xrooms?.[id]; h += row(X.icon, X.name + (has ? ' <span class="lv">✓ gebaut</span>' : ''), has ? 'Treppe im Haus aufstellen, um hinzukommen' : `${fmt(X.price)} Taler aus der Inselkasse`, has ? '' : btn(`🪙 ${fmt(X.price)}`, { t: 'xroom', op: 'build', id }, 'pink', s.money < X.price || s.up.house < 3)); }
    h += row(itemIcon('farbpinsel'), 'Farbpinsel', '600 Taler · Baumodus im Haus ➜ 🎨 Lackieren', s.inv.farbpinsel > 0 ? '✓' : btn('🪙 600', { t: 'buy', id: 'farbpinsel', n: 1 }, 'pink', s.money < 600));
    return h;
  },
  compost(s) {
    const C = s.compost || {}, inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && V.COMPOST_IN(id));
    let h = hero('🟫 Komposter', `${C.pts || 0} Teile drin · ${C.ready || 0}× Kompost fertig`, 'Unkraut, Äste und übriges Obst oder Gemüse hinein – je 4 Teile werden über Nacht zu Kompost, dabei kriechen Regenwürmer heraus. Kompost in der Leiste wählen und auf ein wachsendes Beet streuen, Würmer machen das Angeln besser.');
    h += btn(`🟫 Herausholen (${C.ready || 0} Kompost, ${C.worms || 0} Würmer)`, { t: 'compost', op: 'take' }, 'pink', !(C.ready > 0) && !(C.worms > 0));
    h += '<h3>Hinein damit</h3>' + (inv.length ? inv.map(([id, n]) => row(itemIcon(id), ITEMS[id].name, `${n}× in der Tasche`, btn('+1', { t: 'compost', op: 'add', id, n: 1 }, 'white') + btn(`+${n}`, { t: 'compost', op: 'add', id, n }, 'white'))).join('') : '<div class="note">Gerade nichts Passendes in der Tasche – Unkraut zupfen!</div>');
    return h;
  },
  pottery(s, g) {
    const sel = g.pot || { form: 'vase', glaze: 'rosa' };
    let h = hero('🏺 Töpferscheibe', 'Aus 2 Lehm wird …', 'Form und Glasur wählen, dann kommt alles in den Ofen. Morgen früh liegt das fertige Stück im Briefkasten – zum Aufstellen im Haus.');
    h += `<div class="pattools">${POT_FORMS.map(([id, n, ic]) => btn(`${ic} ${n}`, { ui: 'v:potform', id }, sel.form === id ? 'pink' : 'white')).join('')}</div>`;
    h += `<div class="pattools">${POT_GLAZES.map(([id, n, c]) => `<button class="btn small ${sel.glaze === id ? 'pink' : 'white'}" data-act='${JSON.stringify({ ui: 'v:potglaze', id })}'><span style="display:inline-block;width:14px;height:14px;border-radius:7px;background:#${c.toString(16).padStart(6, '0')}"></span> ${n}</button>`).join('')}</div>`;
    h += big('🏺', 'Formen & brennen', `2 Lehm · ${s.inv.lehm || 0} in der Tasche · ${(s.kiln || []).length}/6 im Ofen`, { t: 'pottery', op: 'make', form: sel.form, glaze: sel.glaze }, 'pink', (s.inv.lehm || 0) < 2);
    return h;
  },
  florist(s) {
    const F = s.florist || {}, done = F.day === s.day ? F.done || {} : {};
    let h = hero('💐 Blumenladen', 'Heute bestellt', 'Die Nachbarn wünschen sich Sträuße in bestimmten Farben. Erntet Blumen und liefert hier – die passenden Blumen aus der Tasche werden automatisch gebunden.');
    V.bouquetOrders(s.day).forEach(([id, want], i) => {
      const can = !!V.bouquetPick(s.inv || {}, want);
      h += row('💐', npc(id), Object.entries(want).map(([c, n]) => `${n}× ${V.COLOR_NAMES[c]}`).join(' · '), done[i] ? '✓ geliefert' : btn('💐 Liefern', { t: 'bouquet', op: 'deliver', i }, 'pink', !can));
    });
    const have = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && V.flowerColor(id));
    if (have.length) h += `<div class="note">In der Tasche: ${have.map(([id, n]) => `${ITEMS[id].icon} ${n}× ${ITEMS[id].name} (${V.COLOR_NAMES[V.flowerColor(id)]})`).join(', ')}</div>`;
    return h;
  },
  pony(s) {
    const P = s.pony || {}, happy = V.ponyHappy(s);
    let h = hero('🐴 Ponyhof', P.name || 'Euer Pony', `Füttern (Karotte oder Apfel) und striegeln machen das Pony glücklich – dann trägt es euch über die Insel. Zuneigung: ${'💗'.repeat(Math.ceil((P.love || 0) / 20)) || '🤍'}`);
    h += `<div class="pattools"><input id="ponyname" maxlength="14" placeholder="Name" value="${esc(P.name || '')}" style="font:inherit;border-radius:10px;border:2px solid var(--line);padding:6px">${btn('✍️ Taufen', { ui: 'v:ponyname' }, 'white')}</div>`;
    h += `<div class="pattools">${btn('🥕 Füttern', { t: 'pony', op: 'feed' }, 'white', P.fed === s.day)}${btn('🪮 Striegeln', { t: 'pony', op: 'brush' }, 'white', P.brushed === s.day)}</div>`;
    h += big('🐴', 'Ausreiten', happy ? 'In der Leiste erscheint das Pony – antippen zum Auf- und Absteigen' : 'Erst füttern oder striegeln', { ui: 'v:ponyride' }, 'pink', !happy);
    return h;
  },
  petschool(s, g) {
    const me = myKey(g), P = s.petschool?.[me] || { t: {} }, pet = g.players?.[g.me]?.look?.pet;
    if (!pet || pet === 'none') return '<div class="note">🐾 Du hast noch kein Haustier – unter ⚙️ ➜ Aussehen kannst du eins aussuchen.</div>';
    let h = hero('🐾 Haustierschule', 'Einmal am Tag üben', `Jeder Trick braucht ${V.TRICK_DAYS} Übungstage. Gelernte Tricks kannst du jederzeit vorführen – ab drei Tricks gibt es täglich eine kleine Show für die Nachbarn.`);
    for (const [id, n, ic] of V.TRICKS) { const p = P.t?.[id] || 0, ok = p >= V.TRICK_DAYS; h += row(ic, n, ok ? '✓ kann es!' : `${p}/${V.TRICK_DAYS} geübt`, ok ? btn('▶️ Vorführen', { ui: 'v:trick', k: id }, 'white') : btn('🐾 Üben', { t: 'petschool', op: 'train', k: id }, 'pink', P.day === s.day)); }
    h += big('🎪', 'Haustier-Show', 'ab 3 Tricks, einmal am Tag', { t: 'petschool', op: 'show' }, '', V.TRICKS.filter(x => (P.t?.[x[0]] || 0) >= V.TRICK_DAYS).length < 3 || P.show === s.day);
    return h;
  },
  olympia(s, g) {
    const O = s.olymp?.[myKey(g)] || { best: {} };
    let h = hero('🏅 Inselolympiade', 'Drei Disziplinen', 'Schlagt die Bestwerte der Nachbarn: Bronze, Silber, Gold. Jede Medaille bringt einmal am Tag Taler – dreimal Gold den Olympia-Pokal.');
    for (const [id, n, ic, L] of V.OLYMPIA) { const b = O.best?.[id] || 0, m = V.medalOf(id, b); h += row(ic, n, `Bestwert ${b} · ${['–', '🥉', '🥈', '🥇'][m]} · Gold ab ${L[2]}`, btn('▶️ Los', { ui: 'v:olymp', d: id }, 'pink')); }
    return h;
  },
  hunt(s, g) {
    const me = myKey(g), open = (s.hunts || []).filter(h => !h.found);
    let h = hero('🔍 Schnitzeljagd', 'Versteckt & gesucht', 'Versteck etwas aus deiner Tasche genau da, wo du gerade stehst, und schreib einen Hinweis. Die anderen suchen – wer davor steht, sieht „Hier ist etwas versteckt!“.');
    const others = open.filter(x => x.who !== me), mine = open.filter(x => x.who === me);
    h += '<h3>Hinweise zum Suchen</h3>' + (others.length ? others.map(x => row('🧩', `„${esc(x.clue)}“`, `von ${esc(x.by)} · Tag ${x.day}`)).join('') : '<div class="note">Gerade ist nichts versteckt.</div>');
    if (mine.length) h += '<h3>Deine Verstecke</h3>' + mine.map(x => row(itemIcon(x.item), ITEMS[x.item]?.name || x.item, `„${esc(x.clue)}“ · noch nicht gefunden`)).join('');
    const inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id] && !ITEMS[id].gear).slice(0, 30), sel = g.huntItem;
    h += `<h3>Etwas verstecken</h3><div class="pattools">${inv.map(([id]) => btn(ITEMS[id].icon, { ui: 'v:huntitem', id }, sel === id ? 'pink' : 'white')).join('')}</div>`;
    h += `<input id="huntclue" maxlength="120" placeholder="Hinweis, z. B. „Wo die Frösche quaken …“" style="width:100%;font:inherit;border-radius:12px;border:2px solid var(--line);padding:8px">`;
    h += btn('🔍 Hier verstecken', { ui: 'v:hide' }, 'pink', !sel);
    return h;
  },
  cinema(s, g) {
    const open = V.cinemaOpen(s);
    return hero('🎬 Freiluftkino', open ? 'Heute Abend: eure Erinnerungen!' : 'Erst ab 18 Uhr', 'Auf der Leinwand laufen eure Fotos aus dem Fotoalbum als Diashow mit Musik. Die Nachbarn kommen dazu, und es gibt Popcorn.')
      + big('🎬', 'Film ab!', open ? 'Fotos als Diashow' : 'abends ab 18 Uhr', { ui: 'v:cinema' }, 'pink', !open);
  },
  theater(s) {
    const T = s.theater || {};
    let h = hero('🎭 Inselbühne', 'Heute wird geprobt!', 'Wählt ein Stück. Dann die Sätze in der richtigen Reihenfolge antippen – jeder Fehler kostet einen Stern. Einmal am Tag ist Vorstellung.');
    for (const [id, n] of V.PLAYS) h += row('🎭', n, T.best?.[id] ? `Bestes: ${'⭐'.repeat(T.best[id])}` : 'noch nicht gespielt', btn('🎬 Spielen', { ui: 'v:theater', p: id }, 'pink', T.day === s.day));
    return h;
  },
  train(s) {
    return hero('🚂 Bimmelbahn', 'Einmal rund um die Insel', 'Einsteigen und am Strand entlang die ganze Insel umrunden. Aussteigen geht jederzeit mit der Aktionstaste.') + big('🚂', 'Einsteigen', 'Rundfahrt, gratis', { ui: 'v:train' }, 'pink');
  },
  lighthouse(s) {
    const L = s.lighthouse || {}, T = L.trader?.day === s.day ? L.trader : null, night = V.lighthouseNight(s);
    let h = hero('🗼 Leuchtturm', night ? 'Nebel über dem Meer …' : 'Am Tag ist hier nichts zu tun', `Nachts suchen Schiffe ihren Weg. Haltet den Lichtstrahl auf sie, bis sie sicher im Hafen sind. Gerettete Händler kommen am nächsten Tag vorbei. Bisher gerettet: ${L.saved || 0}.`);
    h += big('🔦', 'Schiffe lotsen', night ? 'einmal pro Nacht' : 'nachts ab 20 Uhr', { ui: 'v:ships' }, 'pink', !night || L.night === s.day);
    if (T) h += '<h3>⛵ Der dankbare Händler</h3>' + T.offer.map((id, i) => row(itemIcon(id), ITEMS[id]?.name || id, 'seltene Ware · 3.000 Taler', btn('🪙 3.000', { t: 'lighthouse', op: 'buy', i }, 'pink', s.money < 3000))).join('');
    return h;
  },
  penpal(s, g) {
    const inv = Object.entries(s.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id] && !ITEMS[id].gear).slice(0, 30), sel = g.ppItem;
    let h = hero('📮 Brieffreunde', `Eure Insel-Adresse: ${g.code || '(nur mit Verbindung)'}`, 'Schreibt anderen Kuschelinseln – ihr braucht nur ihren 5-stelligen Insel-Code. Ein Geschenk aus der Tasche kann mit. Briefe an euch landen im Briefkasten, sobald der Gastgeber online ist.');
    h += `<input id="ppto" maxlength="5" placeholder="Insel-Code" style="width:120px;font:inherit;border-radius:12px;border:2px solid var(--line);padding:8px;text-transform:uppercase">`;
    h += `<textarea id="pptext" maxlength="400" rows="3" placeholder="Liebe Grüße von unserer Insel …" style="width:100%;font:inherit;border-radius:12px;border:2px solid var(--line);padding:8px"></textarea>`;
    h += `<div class="note">Geschenk: ${sel ? `${ITEMS[sel].icon} ${ITEMS[sel].name}` : 'keins'}</div><div class="pattools">${inv.map(([id]) => btn(ITEMS[id].icon, { ui: 'v:ppitem', id }, sel === id ? 'pink' : 'white')).join('')}</div>`;
    h += btn('📮 Abschicken', { ui: 'v:ppsend' }, 'pink');
    if (s.penpal?.out?.length) h += `<div class="note">📤 Im Postausgang: ${s.penpal.out.length}</div>`;
    return h;
  },
  party(s, g) {
    const nb = V.nextBirthday(s);
    if (!nb) return '<div class="note">Keine Geburtstage in Sicht.</div>';
    const [id, day] = nb, P = s.party?.id === id && s.party?.day === day ? s.party : { guests: [] }, left = day - s.day;
    let h = hero('🎉 Geburtstagsparty', `${npc(id)} hat ${left ? `in ${left} Tag${left > 1 ? 'en' : ''}` : 'heute'} Geburtstag!`, 'Plant eine Überraschung: Deko, Kuchen und Gäste. Am Geburtstag startet ihr die Party – psst!');
    if (left > 7) return h + '<div class="note">Planen könnt ihr in der Woche vor dem Geburtstag.</div>';
    h += row('🎊', 'Deko', P.deco ? '✓ bereit' : `Partydeko (Krämerladen, ${s.inv.partydeko || 0} in der Tasche)`, P.deco ? '' : (s.inv.partydeko > 0 ? btn('🎊 Nehmen', { t: 'party', op: 'deco' }, 'pink') : btn('🪙 1.500', { t: 'buy', id: 'partydeko', n: 1 }, 'white', s.money < 1500)));
    h += row('🎂', 'Kuchen', P.cake ? `✓ ${ITEMS[P.cake].name}` : 'Einen Kuchen backen (Gartenküche)', P.cake ? '' : btn('🎂 Nehmen', { t: 'party', op: 'cake' }, 'pink', !V.CAKES.some(k => s.inv[k] > 0)));
    const sel = g.partyGuests || P.guests || [];
    h += `<h3>Gäste (bis 3)</h3><div class="pattools">${NPC_IDS.filter(x => x !== id).map(x => btn(npc(x), { ui: 'v:guest', id: x }, sel.includes(x) ? 'pink' : 'white')).join('')}</div>${btn('💌 Einladen', { ui: 'v:invite' }, 'white', !sel.length)}`;
    if (P.guests?.length) h += `<div class="note">Eingeladen: ${P.guests.map(npc).join(', ')}</div>`;
    h += big('🎉', 'Überraschung!', P.done ? 'Die Party war wunderschön' : left ? 'am Geburtstag' : 'Jetzt!', { t: 'party', op: 'start' }, 'pink', !!left || !!P.done || !P.deco || !P.cake || !P.guests?.length);
    return h;
  },
};
