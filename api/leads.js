const nodemailer = require('nodemailer');
const { supabaseFetch } = require('./_lib/supabase');

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

    return res.status(200).json({ ok: true, id: inserted && inserted.id });
  } catch (err) {
    console.error('Erreur création lead:', err);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement du lead." });
  }
};
