const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  const { borne, totalTTC, client, date, heure } = req.body;

  if (!totalTTC || !client) {
    return res.status(400).json({
      error: 'Données manquantes.'
    });
  }

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
        email: client.email,
      },
      success_url: `${siteUrl}/confirmation.html?mode=klarna`,
      cancel_url: `${siteUrl}/particulier.html`,
    });

    return res.status(200).json({
      url: session.url
    });

  } catch (err) {
    console.error('Stripe Klarna error:', err);

    return res.status(500).json({
      error: err.message || 'Erreur lors de la création de la session Klarna.'
    });
  }
};
