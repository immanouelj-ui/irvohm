const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('devis.html', 'utf8');
const script = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('function renderStep1()'));
let timers = 0;
let failure = true;
let requests = 0;
const errorBox = { hidden: true, textContent: '', focus() { this.focused = true; } };
const location = { href: '' };
const context = vm.createContext({
  console: { error() {} }, setTimeout() { timers++; }, clearTimeout() {},
  document: { getElementById(id) { assert.equal(id, 'submit-error'); return errorBox; } },
  fetch: async () => { requests++; if (failure) throw Error('simulated network failure'); return { ok: true }; },
  window: { location }, sessionStorage: { setItem() {} },
});
vm.runInContext(script.slice(0, script.indexOf('/* =========================================================\n   INIT')), context);
vm.runInContext(`
  updateFooter = () => {};
  state.nom = 'Test'; state.email = 'test@example.invalid'; state.telephone = '0600000000';
  const option = optCard('logement','entreprise','Entreprise','','business',true);
  if (!option.startsWith('<button type="button" aria-pressed="true"') || !option.endsWith('</button>')) throw Error('non-native choice');
  const consent = renderStep5();
  if (!consent.includes('<button type="button" aria-pressed="false" onclick="toggleRgpd()"')) throw Error('non-native consent');
  for (const id of ['nom','telephone','email']) if (!consent.includes('for="devis-'+id+'"') || !consent.includes('id="devis-'+id+'"')) throw Error('missing label');
  checkAutoAdvance();
`, context);
assert.equal(timers, 0, 'no automatic progression or submission');
(async () => {
  await vm.runInContext('submit()', context);
  assert.equal(requests, 1);
  assert.equal(errorBox.hidden, false);
  assert.equal(errorBox.focused, true);
  assert.match(errorBox.textContent, /pas pu être envoyée/);
  assert.equal(vm.runInContext('isDone', context), false);
  assert.equal(vm.runInContext('isSubmitting', context), false);
  assert.equal(vm.runInContext('state.nom', context), 'Test');
  assert.equal(location.href, '');
  failure = false;
  await vm.runInContext('submit()', context);
  assert.equal(location.href, '/demande-envoyee');
  assert.equal(errorBox.hidden, true);
  console.log('OK: native choices/consent, labels, explicit send, failed-send recovery and successful retry; no real network.');
})().catch(err => { console.error(err); process.exitCode = 1; });
