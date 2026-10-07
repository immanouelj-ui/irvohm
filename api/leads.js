const nodemailer = require('nodemailer');

// ── Envoi du lead au CRM (plus de Supabase côté site) ──────────────────────────
const CRM_ENDPOINT = process.env.CRM_ENDPOINT || 'https://crm-zeta-two-60.vercel.app/api/public/leads';
const CRM_API_KEY = process.env.CRM_API_KEY; // à définir dans Vercel > Environment Variables

// Mapping code funnel → valeur exacte des options des colonnes CRM.
const CRM_MAP = {
  statut_du_bien: { proprietaire: 'Propriétaire', locataire: 'Locataire', syndic: 'Syndic' },
  logement: { domicile: 'Maison individuelle', copropriete: 'Copropriété' },
  vehicule: { oui: 'oui', commande: 'Commandé', projet: 'Projet' },
  puissance: { '7.4': '7,4 KW', '11': '11 KW', '22': '22 KW' },
  compteur: { mono: 'Monophasé', tri: 'Triphasé' },
  distance: { '<5': '5 M', '5-15': '5 a 15 M', '>15': '15 et plus' },
  dlai: { asap: 'Urgent', '1m': '1 mois', '3m': '3 mois', compare: 'ne sais pas' },
};
const crmVal = (key, value) =>
  !value ? '' : (CRM_MAP[key] && CRM_MAP[key][value]) || String(value);

// Libellés lisibles pour les notes.
const LBL = {
  logement: { domicile: 'Maison individuelle', copropriete: 'Copropriété' },
  role: { proprietaire: 'Propriétaire', locataire: 'Locataire', syndic: 'Syndic' },
  vehicule: { oui: 'Déjà équipé', commande: 'Véhicule commandé', projet: "En projet d'achat" },
  puissance: { '7.4': '7,4 kW', '11': '11 kW', '22': '22 kW', unknown: 'Ne sait pas' },
  compteur: { mono: 'Monophasé', tri: 'Triphasé', unknown: 'Ne sait pas' },
  distance: { '<5': 'Moins de 5 m', '5-15': '5 à 15 m', '>15': 'Plus de 15 m' },
  delai: { asap: 'Dès que possible', '1m': 'Sous 1 mois', '3m': 'Sous 3 mois', compare: 'Compare les offres' },
};
const lbl = (k, v) => (LBL[k] && LBL[k][v]) || v || '—';

async function forwardToCRM(body) {
  if (!CRM_API_KEY) throw new Error('CRM_API_KEY manquante (variable d\'environnement Vercel)');

  const isPro = body.role === 'syndic';
  const marque = body.marque || '';
  const photoUrls = (Array.isArray(body.photos) ? body.photos : [])
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u));

  const details = [
    `Logement : ${lbl('logement', body.logement)} (${lbl('role', body.role)}) — CP ${body.codePostal || '—'}`,
    isPro
      ? `Projet pro : ${body.nbBornes || '—'} borne(s)`
      : `Véhicule : ${lbl('vehicule', body.vehicule)}${marque ? ` — ${marque}` : ''}`,
    `Puissance : ${lbl('puissance', body.puissance)}`,
    `Compteur : ${lbl('compteur', body.compteur)}${!isPro && body.distance ? ` · Distance tableau-borne : ${lbl('distance', body.distance)}` : ''}`,
    `Délai : ${lbl('delai', body.delai)}`,
    photoUrls.length ? `Photos (${photoUrls.length}) : ${photoUrls.join(' | ')}` : 'Photos : aucune',
  ];

  const crmBody = {
    nom: body.nom,
    email: body.email,
    phone: body.telephone,
    statut: 'Lead',
    source: 'irvohm.fr',
    notes: `🌐 Lead irvohm.fr\n${details.join('\n')}`,
    statut_du_bien: crmVal('statut_du_bien', body.role),
    logement: crmVal('logement', body.logement),
    cp: body.codePostal || '',
    puissance: crmVal('puissance', body.puissance),
    compteur: crmVal('compteur', body.compteur),
    dlai: crmVal('dlai', body.delai),
    photos: photoUrls,
    ...(isPro
      ? {}
      : {
          vehicule: crmVal('vehicule', body.vehicule),
          marque,
          distance: crmVal('distance', body.distance),
        }),
  };
  for (const k of Object.keys(crmBody)) {
    if (k !== 'photos' && !crmBody[k]) delete crmBody[k];
  }

  // 2 tentatives (immédiate, puis +1 s), timeout 3,5 s chacune : reste sous la limite Vercel.
  // Les erreurs client (4xx hors 429) ne sont pas réessayées.
  const payload = JSON.stringify(crmBody);
  const backoffs = [0, 1000];
  let lastErr;
  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i]) await new Promise((r) => setTimeout(r, backoffs[i]));
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3500);
    try {
      const res = await fetch(CRM_ENDPOINT, {
        method: 'POST',
        headers: { 'X-API-Key': CRM_API_KEY, 'Content-Type': 'application/json' },
        body: payload,
        signal: ctrl.signal,
      });
      if (res.ok) return;
      const text = await res.text().catch(() => '');
      lastErr = new Error(`CRM ${res.status}: ${text}`);
      lastErr.permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
      if (lastErr.permanent) throw lastErr;
    } catch (e) {
      lastErr = e;
      if (e && e.permanent) throw e;
    } finally {
      clearTimeout(to);
    }
  }
  throw lastErr;
}

async function notifyNewLead(lead) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) return false;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD },
  });

  const row = (label, value) =>
    value ? `<tr><td style="padding:8px 0;color:#6c7b6d;width:40%">${label}</td><td style="padding:8px 0;font-weight:600;color:#191c1e">${value}</td></tr>` : '';

  await transporter.sendMail({
    from: `"IRV'OHM" <${process.env.GMAIL_USER}>`,
    to: 'contact@irvohm.fr',
    replyTo: lead.email || undefined,
    subject: `Nouveau lead — ${lead.nom || 'Sans nom'} (${lead.codePostal || '?'})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0e3e5">
        <div style="background:linear-gradient(135deg,#006d37,#006397);padding:32px;color:#fff;text-align:center">
          <div style="font-size:24px;font-weight:700">IRV'OHM</div>
          <div style="font-size:12px;opacity:0.75;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">Nouveau lead — Formulaire devis</div>
        </div>
        <div style="padding:32px">
          <div style="background:#f7f9fb;border-radius:12px;padding:20px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${row('Nom', lead.nom)}
              ${row('Téléphone', lead.telephone)}
              ${row('Email', lead.email)}
              ${row('Code postal', lead.codePostal)}
              ${row('Logement', lead.logement)}
              ${row('Profil', lead.role)}
              ${row('Véhicule', lead.vehicule)}
              ${row('Marque', lead.marque)}
              ${row('Puissance', lead.puissance)}
              ${row('Nb bornes', lead.nbBornes)}
              ${row('Compteur', lead.compteur)}
              ${row('Distance', lead.distance)}
              ${row('Délai souhaité', lead.delai)}
            </table>
          </div>
          <p style="color:#6c7b6d;font-size:13px;margin:24px 0 0">Consultez le CRM pour gérer ce lead.</p>
        </div>
      </div>
    `,
  });
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const body = req.body || {};
  const nom = String(body.nom || '').trim();
  const email = String(body.email || '').trim();
  const telephone = String(body.telephone || '').trim();

  if (!nom || !email || !telephone) {
    return res.status(400).json({ error: 'Nom, email et téléphone sont requis.' });
  }

  // CRM et email en parallèle ; on attend les deux (Vercel peut geler la fonction après la réponse).
  const [crmResult, mailResult] = await Promise.allSettled([
    forwardToCRM({ ...body, nom, email, telephone }),
    notifyNewLead({ ...body, nom, email, telephone }),
  ]);

  const crmOk = crmResult.status === 'fulfilled';
  const mailOk = mailResult.status === 'fulfilled' && mailResult.value === true;

  if (!crmOk) console.error('forwardToCRM:', crmResult.reason);
  if (mailResult.status === 'rejected') console.error('notifyNewLead:', mailResult.reason);

  // Le lead est considéré reçu s'il est arrivé dans le CRM, ou à défaut par email
  // (il n'est alors pas perdu). Erreur 500 uniquement si les deux ont échoué.
  if (crmOk || mailOk) {
    return res.status(200).json({ ok: true, crm: crmOk });
  }
  return res.status(500).json({ error: "Erreur lors de l'enregistrement du lead." });
};
