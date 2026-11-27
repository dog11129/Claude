// Insel-Sicherung: als Datei speichern/laden und automatische Zwischenstände im Browser (IndexedDB).
// Die Inseln selbst liegen weiter in localStorage ('ki.islands'); hier kommen nur Kopien dazu.

const DB = 'kuschelinsel-backup', STORE = 'snaps', KEEP = 12;

function db() {
  return new Promise((ok, fail) => {
    if (!globalThis.indexedDB) return fail(new Error('kein IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }).createIndex('key', 'key');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
const req = r => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });

// Zwischenstand einer Insel ablegen (höchstens alle paar Minuten, je Insel die letzten KEEP)
let lastSnap = {};
export async function snapshot(key, entry, force = false) {
  const now = Date.now();
  if (!force && now - (lastSnap[key] || 0) < 5 * 60000) return;
  lastSnap[key] = now;
  try {
    const d = await db(), st = d.transaction(STORE, 'readwrite').objectStore(STORE);
    await req(st.add({ key, time: now, name: entry.name, day: entry.s.day, level: entry.s.level, s: JSON.parse(JSON.stringify(entry.s)) }));
    const all = (await req(st.index('key').getAll(key))).sort((a, b) => b.time - a.time);
    for (const old of all.slice(KEEP)) st.delete(old.id);
  } catch { /* ohne IndexedDB eben ohne Zwischenstände */ }
}
export async function snapshots(key) {
  try {
    const d = await db();
    return (await req(d.transaction(STORE).objectStore(STORE).index('key').getAll(key))).sort((a, b) => b.time - a.time);
  } catch { return []; }
}

// Browser bitten, die Daten nicht von selbst zu löschen (Chrome/Android geben das meist, Safari ignoriert es)
export function keepData() { navigator.storage?.persist?.().catch(() => {}); }

// ---------- Datei ----------
export function download(entries, file) {
  const data = { kuschelinsel: 1, exported: Date.now(), islands: entries.map(([key, f]) => ({ key, name: f.name, saved: f.saved, guest: f.guest || null, s: f.s })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const fileName = name => `${String(name || 'Insel').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-') || 'Insel'}-${new Date().toISOString().slice(0, 10)}.kuschelinsel.json`;

// Datei lesen und prüfen: gibt [{key, name, saved, guest, s}] zurück
export async function readFile(file) {
  const d = JSON.parse(await file.text());
  const list = Array.isArray(d?.islands) ? d.islands : d?.s ? [d] : [];
  const ok = list.filter(f => f && typeof f.s === 'object' && Number.isFinite(f.s.money) && Number.isFinite(f.s.day) && f.s.tiles && typeof f.s.tiles === 'object');
  if (!ok.length) throw new Error('Keine Insel in der Datei gefunden.');
  return ok;
}
