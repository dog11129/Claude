// Fotoalbum (nur auf diesem Gerät, IndexedDB): Fotos aus dem Fotomodus und automatische Bilder fürs Fotobuch.
// Postkarten: Foto + Rahmen + Text als Bild – zum Teilen, Speichern oder an Mitspieler schicken.
const DB = 'kuschelinsel-photos', ST = 'pics';
function db() {
  return new Promise((ok, fail) => {
    if (!globalThis.indexedDB) return fail(new Error('kein IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id', autoIncrement: true }).createIndex('isle', 'isle');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
const req = r => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });

// Bild verkleinern (spart Speicher), gibt eine JPEG-dataURL zurück
export function shrink(url, w = 640, q = 0.82) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, w / img.width), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => ok(url);
    img.src = url;
  });
}
export async function add(isle, url, meta = {}) {
  try {
    const d = await db(), st = d.transaction(ST, 'readwrite').objectStore(ST);
    const all = await req(st.index('isle').getAll(isle));
    if (meta.k) for (const p of all) if (p.k === meta.k) st.delete(p.id); // ein Bild pro Fotobuch-Seite
    const photos = all.filter(p => p.kind === 'photo').sort((a, b) => a.time - b.time);
    if (meta.kind === 'photo' && photos.length >= 60) st.delete(photos[0].id); // nicht unendlich wachsen
    return await req(st.add({ isle, time: Date.now(), kind: 'photo', ...meta, url }));
  } catch { return null; }
}
export async function list(isle, kind) {
  try {
    const d = await db();
    return (await req(d.transaction(ST).objectStore(ST).index('isle').getAll(isle))).filter(p => !kind || p.kind === kind).sort((a, b) => b.time - a.time);
  } catch { return []; }
}
export async function del(id) {
  try { const d = await db(); await req(d.transaction(ST, 'readwrite').objectStore(ST).delete(id)); } catch { /* */ }
}
export async function get(id) {
  try { const d = await db(); return await req(d.transaction(ST).objectStore(ST).get(id)); } catch { return null; }
}

// Postkarte zeichnen: Foto mit weißem Rand, Text in Schreibschrift, Briefmarke
export function postcard(url, text, from, to) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const W = 900, H = 640, c = document.createElement('canvas'), g = c.getContext('2d');
      c.width = W; c.height = H;
      g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2e6cf'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      const pw = 560, ph = Math.round(pw * img.height / img.width), py = Math.round((H - ph) / 2);
      g.save(); g.translate(40 + pw / 2, py + ph / 2); g.rotate(-0.025);
      g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 14; g.fillRect(-pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 44); g.shadowBlur = 0;
      g.drawImage(img, -pw / 2, -ph / 2, pw, ph);
      g.restore();
      g.strokeStyle = '#d9c9a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(630, 60); g.lineTo(630, H - 60); g.stroke();
      // Briefmarke
      g.fillStyle = '#ffd6e0'; g.fillRect(W - 140, 40, 100, 120); g.strokeStyle = '#fff'; g.setLineDash([6, 6]); g.lineWidth = 4; g.strokeRect(W - 136, 44, 92, 112); g.setLineDash([]);
      g.font = '54px serif'; g.textAlign = 'center'; g.fillText('🏝️', W - 90, 120);
      g.fillStyle = '#7a6045'; g.textAlign = 'left'; g.font = 'italic 26px Georgia, serif';
      const words = String(text || '').split(/\s+/), lines = [];
      let line = '';
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 220) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line);
      lines.slice(0, 9).forEach((l, i) => g.fillText(l, 650, 210 + i * 34));
      g.font = '20px Georgia, serif'; g.fillStyle = '#a08a6a';
      if (to) g.fillText('An ' + to, 650, 190 - 20);
      if (from) g.fillText('– ' + from, 650, H - 70);
      g.font = 'bold 18px sans-serif'; g.fillStyle = '#c9a26b'; g.fillText('Grüße von der Kuschelinsel', 40, H - 22);
      ok(c.toDataURL('image/jpeg', 0.88));
    };
    img.src = url;
  });
}
