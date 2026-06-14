const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

async function sendConfirmationEmail({ client, borne, totalTTC, paiement, date, heure }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD }
  });

  const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const parts = heure.split('–');
  const startStr = parts[0];
  const endStr = parts[1];

  const montantAffiche = paiement === 'klarna'
    ? `${Number(totalTTC).toLocaleString('fr-FR')} € (Klarna 3×, 1ère mensualité débitée)`
    : `${Number(totalTTC).toLocaleString('fr-FR')} €`;

  await transporter.sendMail({
    from: `"IRV'OHM" <${process.env.GMAIL_USER}>`,
    to: client.email,
    bcc: process.env.GMAIL_USER,
    subject: `Confirmation de votre installation IRVE — ${dateLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0e3e5">
        <div style="background:linear-gradient(135deg,#006d37,#006397);padding:32px;color:#fff;text-align:center">
          <div style="font-size:24px;font-weight:700">IRV'OHM</div>
          <div style="font-size:12px;opacity:0.75;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">Solutions de Recharge Électrique</div>
        </div>
        <div style="padding:32px">
          <h2 style="color:#006d37;font-size:20px;margin:0 0 8px">Votre installation est confirmée !</h2>
          <p style="color:#6c7b6d;font-size:14px;margin:0 0 24px">Bonjour ${client.prenom},<br><br>Merci pour votre commande. Voici le récapitulatif de votre intervention.</p>
          <div style="background:#f7f9fb;border-radius:12px;padding:20px;margin-bottom:24px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#6c7b6d;width:40%">Borne</td><td style="padding:8px 0;font-weight:600;color:#191c1e">${borne}</td></tr>
              <tr><td style="padding:8px 0;color:#6c7b6d">Date</td><td style="padding:8px 0;font-weight:600;color:#191c1e">${dateLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#6c7b6d">Créneau</td><td style="padding:8px 0;font-weight:600;color:#191c1e">${startStr} – ${endStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6c7b6d">Adresse</td><td style="padding:8px 0;font-weight:600;color:#191c1e">${client.adresse}</td></tr>
              <tr style="border-top:1px solid #e0e3e5">
                <td style="padding:12px 0 4px;color:#6c7b6d">Montant</td>
                <td style="padding:12px 0 4px;font-weight:700;color:#006d37">${montantAffiche}</td>
              </tr>
            </table>
          </div>
          <p style="color:#6c7b6d;font-size:13px;margin:0">Notre équipe vous contactera sous 24h pour confirmer les détails de l'intervention.<br>En cas de question, répondez directement à cet email.</p>
        </div>
        <div style="background:#f7f9fb;padding:20px;text-align:center;font-size:12px;color:#6c7b6d;border-top:1px solid #e0e3e5">
          IRV'OHM — Solutions de Recharge Électrique &nbsp;·&nbsp;
          <a href="mailto:${process.env.GMAIL_USER}" style="color:#006d37">${process.env.GMAIL_USER}</a>
        </div>
      </div>
    `
  });
}

async function createCalendarEvent({ client, borne, date, heure }) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GCAL_ID) return;

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const calendar = google.calendar({ version: 'v3', auth });

  const parts = heure.split('–');
  const startTime = parts[0].replace('h', ':');
  const endTime = parts[1].replace('h', ':');

  await calendar.events.insert({
    calendarId: process.env.GCAL_ID,
    requestBody: {
      summary: `Installation IRVE — ${client.prenom} ${client.nom}`,
      description: `Borne : ${borne}\nClient : ${client.prenom} ${client.nom}\nTél : ${client.tel}\nEmail : ${client.email}\nAdresse : ${client.adresse}`,
      start: { dateTime: `${date}T${startTime}:00`, timeZone: 'Europe/Paris' },
      end: { dateTime: `${date}T${endTime}:00`, timeZone: 'Europe/Paris' },
      colorId: '2'
    }
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId manquant.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.json({ error: 'Paiement non abouti. Statut : ' + session.payment_status });
    }

    const meta = session.metadata || {};

    const client = {
      prenom: meta.prenom,
      nom: meta.nom,
      tel: meta.tel,
      email: meta.email || session.customer_email,
      adresse: meta.adresse,
    };
    const borne = meta.borne;
    const totalTTC = meta.totalTTC ? Number(meta.totalTTC) : session.amount_total / 100;
    const paiement = meta.paiement || 'klarna';
    const date = meta.date;
    const heure = meta.heure;

    const results = await Promise.allSettled([
      sendConfirmationEmail({ client, borne, totalTTC, paiement, date, heure }),
      createCalendarEvent({ client, borne, date, heure })
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`confirm-klarna-session: tâche ${i} échouée:`, r.reason);
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
