const Stripe = require('stripe');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide.' }) };
  }

  const { borne, totalTTC, client, date, heure } = body;

  if (!totalTTC || !client) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Données manquantes.' }) };
  }

  // Klarna 3× : Stripe Checkout gère les 3 mensualités automatiquement
  const montantCentimes = Math.round(totalTTC * 100);
  const siteUrl = process.env.SITE_URL || 'https://irvohm.fr';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['klarna'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Installation borne ${borne}`,
              description: `Intervention le ${date} de ${heure} — Adresse : ${client.adresse}`,
            },
            unit_amount: montantCentimes,
          },
          quantity: 1,
        },
      ],
      customer_email: client.email,
      metadata: {
        borne,
        totalTTC: String(totalTTC),
        paiement: 'klarna',
        date,
        heure,
        prenom: client.prenom,
        nom: client.nom,
        tel: client.tel,
        adresse: client.adresse,
      },
      success_url: `${siteUrl}/confirmation.html?mode=klarna`,
      cancel_url: `${siteUrl}/particulier.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe Klarna error:', err);
    return {
      statusCode: 200,
      body: JSON.stringify({ error: err.message || 'Erreur lors de la création de la session Klarna.' }),
    };
  }
};
