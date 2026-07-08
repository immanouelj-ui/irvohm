const nodemailer = require('nodemailer');
const { supabaseFetch } = require('./_lib/supabase');

// ── Envoi du lead au CRM (mêmes colonnes que les leads choisistaborne) ──────────
const CRM_ENDPOINT = 'https://crm-pro-backend.fly.dev/api/public/leads';
const CRM_API_KEY = 'b0b84ca9fd93429d993e4fae3b3322e77a783593e0184b90939abeeda87ae2e7';

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
// Valeur mappée, sinon la valeur brute (par sécurité si un code diffère), sinon vide.
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
    photos: photoUrls, // → pièces jointes CRM (pas une colonne)
    ...(isPro
      ? {}
      : {
          vehicule: crmVal('vehicule', body.vehicule),
          marque,
          distance: crmVal('distance', body.distance),
        }),
  };
  // N'envoie pas les valeurs vides (évite de créer/polluer une colonne).
  for (const k of Object.keys(crmBody)) {
    if (k !== 'photos' && !crmBody[k]) delete crmBody[k];
  }

  const res = await fetch(CRM_ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-Key': CRM_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(crmBody),
  });
  if (!res.ok) throw new Error(`CRM ${res.status}: ${await res.text().catch(() => '')}`);
}

async function notifyNewLead(lead) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) return;

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
          <p style="color:#6c7b6d;font-size:13px;margin:24px 0 0">Consultez le CRM pour gérer ce lead : <a href="${process.env.SITE_URL || 'https://irvohm.fr'}/admin.html" style="color:#006d37">${process.env.SITE_URL || 'https://irvohm.fr'}/admin.html</a></p>
        </div>
      </div>
    `,
  });
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

  const lead = {
    nom,
    email,
    telephone,
    logement: body.logement || null,
    role: body.role || null,
    code_postal: body.codePostal || null,
    vehicule: body.vehicule || null,
    marque: body.marque || null,
    puissance: body.puissance ? String(body.puissance) : null,
    nb_bornes: body.nbBornes || null,
    compteur: body.compteur || null,
    distance: body.distance || null,
    delai: body.delai || null,
    photos: Array.isArray(body.photos) ? body.photos : [],
  };

  try {
    const [inserted] = await supabaseFetch('irvohm_leads', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(lead),
    });

    notifyNewLead(body).catch((err) => console.error('notifyNewLead:', err));
    forwardToCRM(body).catch((err) => console.error('forwardToCRM:', err));

    return res.status(200).json({ ok: true, id: inserted && inserted.id });
  } catch (err) {
    console.error('Erreur création lead:', err);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement du lead." });
  }
};
