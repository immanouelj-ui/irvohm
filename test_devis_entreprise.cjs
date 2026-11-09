const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('devis.html', 'utf8');
const script = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes('function renderStep1()'));
const context = vm.createContext({ console, setTimeout, clearTimeout });
vm.runInContext(script.slice(0, script.indexOf('/* =========================================================\n   INIT')), context);
vm.runInContext(`
  fullRender = () => {}; quickUpdate = () => {};
  if (!renderStep1().includes('Entreprise')) throw Error('missing business option');
  setLogement('entreprise'); state.codePostal = '95200';
  if (!isPro() || !canNext() || state.role !== 'entreprise') throw Error('business step 1');
  currentStep = 1;
  if (canNext()) throw Error('missing project requirements');
  state.puissance = '22'; state.nbBornes = 4;
  if (!canNext() || renderStep2().includes('Marque du véhicule') || !renderStep2().includes('Combien de bornes')) throw Error('business step 2');
  currentStep = 2; state.compteur = 'tri'; state.delai = '1m';
  if (!canNext() || renderStep3().includes('Distance entre')) throw Error('business step 3');
  setLogement('domicile'); currentStep = 0;
  if (isPro() || canNext() || state.role !== '') throw Error('reset household role');
  state.role = 'proprietaire';
  if (!canNext()) throw Error('household step 1');
  currentStep = 1;
  if (canNext()) throw Error('household vehicle requirements');
  state.vehicule = 'oui'; state.marque = 'Tesla';
  if (!canNext()) throw Error('household step 2');
  setLogement('copropriete'); state.role = 'syndic';
  if (!isPro()) throw Error('syndic regression');
`, context);

(async () => {
  let captured;
  const api = vm.createContext({
    module: { exports: {} },
    require: name => { assert.equal(name, 'nodemailer'); return {}; },
    process: { env: { CRM_API_KEY: 'test-only' } },
    console, setTimeout, clearTimeout, AbortController,
    fetch: async (url, options) => { captured = JSON.parse(options.body); return { ok: true }; },
  });
  vm.runInContext(fs.readFileSync('api/leads.js', 'utf8'), api);
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await api.module.exports({ method: 'POST', body: {
    nom: 'Test entreprise', email: 'test@example.invalid', telephone: '0600000000',
    logement: 'entreprise', role: 'entreprise', codePostal: '95200',
    nbBornes: 4, puissance: '22', compteur: 'tri', delai: '1m',
    vehicule: 'oui', marque: 'Tesla', distance: '<5',
  } }, res);
  assert.equal(res.code, 200);
  assert.match(captured.notes, /Entreprise/);
  assert.match(captured.notes, /Projet pro : 4 borne/);
  for (const field of ['vehicule', 'marque', 'distance', 'statut_du_bien', 'logement']) assert.equal(captured[field], undefined);
  assert.equal(captured.puissance, '22 KW');
  console.log('OK: entreprise, household and syndic paths; business CRM payload verified without network or email.');
})().catch(err => { console.error(err); process.exitCode = 1; });
