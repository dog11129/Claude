// Kleine Helfer für die Erweiterungen (Zufall, Zahlen, Post, Uhrzeit).
export const rnd = n => Math.floor(Math.random() * n);
export const pick = a => a[rnd(a.length)];
export const fmt = n => Math.round(n).toLocaleString('de-DE');
export const hour = s => 6 + s.dayTime * 18;
export const who = s => s._who || 'host';
export const note = (s, title, text, item, n, from = 'rosi') => s.mail.push({ kind: 'note', from, title, text, item: item || null, n: n || 1, day: s.day });
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const near = (s, kind, x, z, r) => Object.entries(s.obj || {}).find(([k, o]) => o?.k === kind && Math.hypot(+k.split(',')[0] - x, +k.split(',')[1] - z) <= r) || null;
