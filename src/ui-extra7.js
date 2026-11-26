// Fenster für Inselleben 10 „Herzstücke“: das Herzensbuch (Handy-App) und der Blumenbinde-Tisch.
import { ITEMS, SOCIAL } from './data.js';
import { FURNITURE } from './furni-data.js';
import { itemIcon } from './icons.js';
import * as E from './extras10.js';
import * as E11 from './extras11.js';

const btn = (label, data, cls = '', dis = false) => `<button class="btn small ${cls}" data-act='${JSON.stringify(data)}' ${dis ? 'disabled' : ''}>${label}</button>`;
const hero = (who, title, text) => `<div class="quest-hero"><div class="qh-top"><span class="qh-chap">${who}</span><b>${title}</b></div><p>${text}</p></div>`;
const chip = t => `<span class="chip">${t}</span>`;
const card = (icon, name, info, buttons, o = {}) => `<div class="pcard${o.have ? ' have' : ''}${o.locked ? ' locked' : ''}"><div class="pc-ic">${icon}</div><div class="pc-tx"><b>${name}</b><div class="pc-info">${info}</div></div><div class="pc-bt">${buttons}</div></div>`;
const grid = list => `<div class="pgrid">${list.join('')}</div>`;

const reward = st => (st.hat ? `<span style="font-size:22px">👑</span>` : itemIcon(st.furn));
const rewardName = st => (st.hat ? E.LOVE_HATS[st.hat] : FURNITURE[st.furn].name);
const flowerName = k => (k === '*pfingstrose' ? 'Pfingstrosen (jede Farbe)' : k === '*bunt' ? 'verschiedene Blumensorten' : ITEMS[k]?.name || k);
const flowerIcon = k => (k === '*pfingstrose' ? '🩷' : k === '*bunt' ? '🌈' : ITEMS[k]?.icon || '🌸');

function herz(s) {
  const L = s.love || { pts: 0 }, lvl = E.loveLevel(s), next = E.nextStep(s), prev = lvl ? E.LOVE_STEPS[lvl - 1] : null;
  const from = prev?.at || 0, pct = next ? Math.round(((L.pts - from) / (next.at - from)) * 100) : 100;
  const did = L.day === s.day ? L.did || {} : {}, gift = L.day === s.day ? L.gift || 0 : 0;
  let h = hero('💗 Herzensbuch', prev ? `${prev.icon} ${prev.name}` : 'Euer gemeinsames Herzensbuch', `Ihr habt zusammen <b>${L.pts} Herzpunkte</b> gesammelt.${next ? ` Noch ${next.at - L.pts} bis „${next.name}“.` : ' Alle Seiten sind voll – ihr seid einfach füreinander gemacht. ♾️'}`);
  h += `<div class="sumbar"><span>💗 ${L.pts}</span><div style="flex:1;height:12px;border-radius:8px;background:#ffe3ec;overflow:hidden;margin:0 10px"><div style="width:${Math.max(0, Math.min(100, pct))}%;height:100%;background:linear-gradient(90deg,#ff9ac4,#ff6f9f)"></div></div><span>${next ? next.icon + ' ' + next.at : '♾️'}</span></div>`;
  // 📅 Unser Tag
  const days = E11.daysTogether(s), nmd = E11.nextMonthDay(s), T = E11.coupleToday(s);
  h += '<h3>📅 Unser Tag</h3>';
  if (days != null) {
    const since = new Date(s.couple.since + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    h += `<div class="note" style="text-align:center"><span style="font-size:30px;font-weight:700;color:#e8508a">${days.toLocaleString('de-DE')}</span><br>Tag${days === 1 ? '' : 'e'} zusammen – seit ${since} 💕<br><small>${T ? (T.years ? `💍 Heute ist euer ${T.years}. Jahrestag!` : `💕 Heute ist Monatstag: ${T.months} Monate!`) : nmd != null ? `Nächster Monatstag in ${nmd} Tag${nmd === 1 ? '' : 'en'}` : ''}</small></div>`;
    h += `<details class="tip"><summary>📅 Datum ändern</summary><div class="diaryadd"><input type="date" id="since11" value="${s.couple.since}"><button class="btn small white" data-ui="h:since">Speichern</button><button class="btn small white" data-ui="h:sinceclear">🗑️</button></div></details>`;
  } else {
    h += `<div class="note">Seit wann seid ihr zusammen? Dann zählt das Herzensbuch eure Tage, jeden Monatstag gibt es Post mit einer Überraschung und Herzchenregen – und am Jahrestag ein Feuerwerk.</div><div class="diaryadd"><input type="date" id="since11"><button class="btn small pink" data-ui="h:since">Speichern</button></div>`;
  }
  h += '<h3>Heute schon</h3>';
  const dinner = s.dinner11?.day === s.day;
  h += `<div class="note">${E.LOVE_SOCIAL.map(k => `<span style="opacity:${did[k] ? 1 : 0.35};font-size:22px" title="${SOCIAL[k]?.[1] || k}">${SOCIAL[k]?.[0] || '💗'}</span>`).join(' ')} <span style="opacity:${did.letter ? 1 : 0.35};font-size:22px" title="Liebesbrief">💌</span> <span style="opacity:${dinner ? 1 : 0.35};font-size:22px" title="Dinner zu zweit">🕯️</span><br><small>Jede Zärtlichkeit zählt einmal am Tag (antippen ➜ eure Figur ➜ Herz-Menü). Geschenke heute: ${gift}/${E.GIFT_CAP} Punkte</small></div>`;
  h += '<details class="tip"><summary>💡 So sammelt ihr Herzpunkte</summary><p>🤗 Umarmen, 😘 Küsschen, 🥰 Kuscheln, 💫 Drehen, 💞 Herz formen, 😚 Nasenstupser, 💋 Stirnküsschen, 🫂 Anlehnen, 💃 Tanzen, 🤝 Händchen halten, ✋ High-Five, 🙈 Verstecken: je 1 Punkt am Tag.<br>💐 Einen Strauß vom Blumenbinde-Tisch schenken: 3 · 🧁 Selbstgebackenes (Herzkekse, Cupcakes, Macarons, Herzchentorte) oder 🧸 ein Kuscheltier: 2 · andere Blumen oder Gerichte: 1 – bis zu 6 Punkte am Tag.<br>💌 Einen Liebesbrief schreiben: 2 (einmal am Tag) · 🕯️ Dinner zu zweit am Dinnertisch (ein Gericht mitbringen): 3 · 💕 Monatstag: 5 · 💍 Jahrestag: 10.</p></details>';
  h += '<h3>Seiten im Herzensbuch</h3>';
  h += grid(E.LOVE_STEPS.map((st, i) => card(reward(st), `${st.icon} ${st.name}`, chip(`💗 ${st.at}`) + chip(rewardName(st)), i < lvl ? '<span class="lv">✔ geschafft</span>' : `<span class="lv">noch ${st.at - L.pts}</span>`, { have: i < lvl, locked: i >= lvl })));
  return h;
}

function bind10(s) {
  let h = hero('💐 Blumenbinde-Tisch', 'Sträuße & Blütenschmuck', 'Aus euren Blumen werden Sträuße in der Vase – zum Aufstellen oder zum Verschenken an deinen Schatz (3 Herzpunkte!). Blütenschmuck kommt direkt in die Garderobe.');
  const need = R => Object.entries(R.in).map(([k, n]) => { const have = E.bindHave(s, k); return `<span style="color:${have >= n ? '#5aa84a' : '#d64545'}">${flowerIcon(k)} ${Math.min(have, 99)}/${n} ${flowerName(k)}</span>`; }).join(' · ');
  h += '<h3>💐 Sträuße</h3>' + grid(Object.entries(E.BIND).map(([id, R]) => {
    const ok = !!E.bindTake(s, R.in);
    return card(itemIcon(id), FURNITURE[id].name, `<small>${R.desc}</small><br>${need(R)}`, btn('Binden', { t: 'bind10', id }, 'pink', !ok), { have: s.inv?.[id] > 0 });
  }));
  h += '<h3>🌸 Blütenschmuck</h3>' + grid(Object.entries(E.BIND_HATS).map(([id, R]) => {
    const own = !!s.wardrobe?.[id], ok = !own && !!E.bindTake(s, R.in);
    return card('<span style="font-size:26px">🌸</span>', R.name, `<small>${R.desc}</small><br>${own ? '✔ in der Garderobe' : need(R)}`, own ? '<span class="lv">✔</span>' : btn('Binden', { t: 'bind10', id }, 'pink', !ok), { have: own });
  }));
  return h;
}

export const PANELS_10 = { herz, bind10 };
export const TITLES_10 = { herz: '💗 Herzensbuch', bind10: '💐 Blumen binden' };
export const APPS_10 = [['herz', '💗', 'Herzensbuch', '#ffd0e0']];
export const sig10 = (s, g, open) => (open === 'herz' || open === 'bind10' ? [s.love, s.wardrobe] : 0);
