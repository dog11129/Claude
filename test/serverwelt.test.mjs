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
