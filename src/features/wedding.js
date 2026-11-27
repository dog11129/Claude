// Teil von extras8.js – 💍 Inselhochzeit in der Inselkapelle (Rathaus-Projekt).
// Ablauf (Sekunden ab Beginn): Nachbarn nehmen Platz → Mira spricht → die Frage → beide sagen „Ja“ → Ringe, Kuss, Feuerwerk, Foto.
// Gelübde lassen sich später jederzeit erneuern.
import * as X from '../extras.js';

export const WED = { seat: 8, speech: [8, 13, 18], ask: 22, timeout: 150, party: 45 };
export const WED_LINES = [
  'Liebe Inselbewohner, schön, dass ihr alle gekommen seid! 💐',
  'Heute feiern wir zwei Menschen, die diese Insel jeden Tag ein bisschen wärmer machen.',
  'Ihr habt zusammen gepflanzt, gefischt, gelacht und gekuschelt – und das soll für immer so bleiben.',
];
export const WED_ASK = 'Wollt ihr beide füreinander da sein – an sonnigen und an verregneten Tagen? 💍';
export const chapels = s => Object.entries(s.obj || {}).filter(([, o]) => o?.k === 'kapelle').map(([k, o]) => [+k.split(',')[0], +k.split(',')[1], o.r | 0]);
export const wedT = s => (s.wedding ? (s.time || 0) - s.wedding.t0 : -1);
// Vor der Kapelle: Altar-Platz (2 Felder vor der Tür), das Paar links und rechts, die Gäste in Reihen dahinter
export function wedSpots(x, z, r) {
  const a = r * Math.PI / 2, fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a), ax = x + fx * 1.9, az = z + fz * 1.9;
  return { altar: [ax, az], face: a, couple: [[ax - sx * 0.5, az - sz * 0.5, a + Math.PI / 2], [ax + sx * 0.5, az + sz * 0.5, a - Math.PI / 2]], priest: [x + fx * 1.15, z + fz * 1.15, a],
    guest: i => { const row = Math.floor(i / 3), col = (i % 3) - 1; return [ax + fx * (1.9 + row * 1.1) + sx * col * 1.05, az + fz * (1.9 + row * 1.1) + sz * col * 1.05, a + Math.PI]; } };
}

export function wed(s, a, out) {
  const key = s._who || 'host', name = String(a.name || '').trim().slice(0, 16) || 'Jemand';
  if (a.op === 'start') {
    const c = chapels(s).find(([x, z]) => x === a.x && z === a.z);
    if (!c) return false;
    if (s.wedding) { out.msg = '💒 In der Kapelle wird gerade schon gefeiert!'; return false; }
    s.wedding = { t0: s.time || 0, x: c[0], z: c[1], r: c[2], yes: {}, by: name };
    out.msg = s.married ? '💐 Die Nachbarn kommen – gleich erneuert ihr eure Gelübde!' : '💒 Die Nachbarn kommen schon … gleich geht es los!';
    out.snd = 'join';
    return true;
  }
  if (a.op === 'yes') {
    const W = s.wedding;
    if (!W || W.done || wedT(s) < WED.ask) return false;
    if (W.yes[key]) { out.msg = '💍 Du hast schon Ja gesagt – jetzt fehlt nur noch dein Schatz!'; return false; }
    W.yes[key] = name;
    out.snd = 'love';
    const ks = Object.keys(W.yes);
    if (ks.length < 2) { out.msg = '💍 Ja! Jetzt bist du dran, Schatz …'; return true; }
    // Beide haben Ja gesagt
    const names = ks.slice(0, 2).map(k => W.yes[k]), who = names.join(' & ');
    W.done = s.time || 0;
    if (!s.married) {
      const d = new Date(), md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      s.married = { day: s.day, iso: d.toISOString().slice(0, 10), names, renew: 0 };
      for (const k of ks.slice(0, 2)) { const inv = (s.pinv ||= {})[k] ||= {}; inv.ehering = (inv.ehering || 0) + 1; }
      (s.wardrobe ||= {}).veil = s.day;
      s.anniv ||= { dates: [], done: {} };
      if (!s.anniv.dates.some(x => x.name === 'Hochzeitstag 💍') && s.anniv.dates.length < 8) s.anniv.dates.push({ md, name: 'Hochzeitstag 💍', y: d.getFullYear() });
      (s.diary ||= []).push({ day: s.day, icon: '💍', text: `${who} haben in der Inselkapelle geheiratet!` });
      X.moment(s, 'wedding', '💍', `Die Hochzeit von ${who}`, 'Alle Nachbarn waren da, es gab Ringe, einen Kuss und ein Feuerwerk.', out);
      out.msg = `💍 Ihr seid verheiratet! Alles Liebe, ${who}!`;
    } else {
      s.married.renew = (s.married.renew || 0) + 1;
      (s.diary ||= []).push({ day: s.day, icon: '💐', text: `${who} haben ihre Gelübde erneuert` });
      X.moment(s, 'renew:' + s.day, '💐', 'Gelübde erneuert', `${who} – noch einmal Ja gesagt.`, out);
      out.msg = '💐 Noch einmal Ja – wie schön!';
    }
    return true;
  }
  if (a.op === 'cancel') { if (!s.wedding || s.wedding.done) return false; s.wedding = null; out.msg = '💒 Vielleicht ein andermal.'; return true; }
  return false;
}
// Beim Gastgeber: Zeit abgelaufen bzw. Feier vorbei
export function wedTick(s) {
  const W = s.wedding;
  if (!W) return false;
  if (!Number.isFinite(W.t0) || (s.time || 0) < W.t0) { s.wedding = null; return true; }
  if (W.done ? (s.time || 0) - W.done > WED.party : wedT(s) > WED.timeout) { s.wedding = null; return true; }
  return false;
}
