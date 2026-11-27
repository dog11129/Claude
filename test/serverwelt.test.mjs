// 🌍 Serverwelt: Raum-Code, Taschen je Person, welcher Stand weiter ist
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location ||= { search: '', hash: '', origin: 'https://example.org', pathname: '/Claude/' };
const SW = await import('../src/serverwelt.js');
const S = await import('../src/state.js');

test('Raum-Code: fest, 5 Zeichen, passt zum Server', () => {
  const k = 'ABCDEFGHJKLMNPQRSTUV';
  assert.equal(SW.codeOf(k), SW.codeOf(k));
  assert.match(SW.codeOf(k), /^[A-Z0-9]{5}$/);
  assert.notEqual(SW.codeOf(k), SW.codeOf('ABCDEFGHJKLMNPQRSTUW'));
  assert.match(SW.newKey(), /^[A-Z2-9]{20}$/);
  assert.equal(SW.clean('abcd-efgh-jklm-npqr-stuv'), 'ABCDEFGHJKLMNPQRSTUV');
  assert.equal(SW.link('ABCDEFGHJKLMNPQRSTUV'), 'https://example.org/Claude/#welt=ABCDEFGHJKLMNPQRSTUV');
});

test('Taschen: wer öffnet, bekommt die eigene; die der/des Vorigen bleibt erhalten', () => {
  const s = S.migrate(S.newFarm('Welt'));
  s.owner = 'aaaaaaaaaa';
  s.pinv = { host: { apfel: 2 }, u_bbbbbbbbbb: { birne: 5 } };
  SW.claim(s, 'bbbbbbbbbb');
  assert.deepEqual(s.pinv.host, { birne: 5 });
  assert.deepEqual(s.pinv.u_aaaaaaaaaa, { apfel: 2 });
  assert.equal(s.owner, 'bbbbbbbbbb');
  SW.claim(s, 'cccccccccc'); // neue Person: leere Tasche, nichts geht verloren
  assert.deepEqual(s.pinv.host, {});
  assert.deepEqual(s.pinv.u_bbbbbbbbbb, { birne: 5 });
  SW.claim(s, 'aaaaaaaaaa');
  assert.deepEqual(s.pinv.host, { apfel: 2 });
  assert.equal(Object.values(s.pinv).reduce((n, b) => n + Object.values(b).reduce((a, x) => a + x, 0), 0), 7);
});

test('Dieselbe Person auf einem zweiten Gerät behält ihre Tasche', () => {
  const s = {};
  assert.equal(SW.whoKey(s, 'Shawn', 'handy00001'), 'handy00001');
  assert.equal(SW.whoKey(s, ' shawn ', 'pc00000001'), 'handy00001');
  assert.equal(SW.guestUid(s, 'Shawn', 'pc00000001'), 'handy00001');
  assert.equal(SW.guestUid(s, 'Adriana', 'ipad000001'), 'ipad000001');
  assert.equal(SW.whoKey(s, '', 'xxxxxxxx01'), 'xxxxxxxx01');
});

test('Weiterer Stand gewinnt (Spielzeit)', () => {
  const a = { s: { time: 100 } }, b = { s: { time: 90 } };
  assert.ok(SW.ahead(a, b));
  assert.ok(!SW.ahead(b, a));
  assert.ok(!SW.ahead(a, { s: { time: 100 } }));
  assert.ok(SW.ahead(a, null));
});

test('Große Flächen sind fein unterteilt (Krümmung der Welt)', async () => {
  const M = await import('../src/models.js'), THREE = await import('../vendor/three.module.min.js');
  const edges = g => { const p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); let w = 0;
    for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(p, idx ? idx.getX(i) : i); b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1); c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2); w = Math.max(w, a.distanceTo(b), b.distanceTo(c), a.distanceTo(c)); } return w; };
  assert.ok(edges(M.flat(90, 60, 2)) < 3);
  assert.ok(edges(M.fine(new THREE.PlaneGeometry(40, 34), 1.5)) <= 1.5 + 1e-6);
  const d = M.disc(48, 72, 1.2), p = d.attributes.position;
  let ring = 0; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); if (r > 1 && r < 2) ring++; }
  assert.ok(ring > 0, 'Scheibe hat innere Ringe');
});

test('Insel-Erweiterungen: alles lässt sich benutzen (auch Bienenstöcke)', async () => {
  const S = await import('../src/state.js');
  const s = S.bindInv(S.migrate(S.newFarm('X')), 'host');
  s.areas = { wald: { open: 1 }, wiese: { open: 1 }, hoehle: { open: 1 } };
  for (const id of Object.keys(S.AREAS)) {
    const A = S.AREAS[id];
    for (const n of S.NODES[id]) {
      const r = S.resolve(s, { x: A.x + n.x, z: A.z + n.z + 1, ry: Math.PI }, n.kind === 'ore' ? 'shovel' : 'hand', { x: A.x + n.x, z: A.z + n.z });
      assert.equal(typeof r.label, 'string');
      if (n.kind === 'hive' || n.kind === 'pine' || n.kind === 'ore') assert.ok(r.a, `${id} ${n.kind} ist benutzbar`);
    }
  }
});
