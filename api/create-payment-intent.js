const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  const {
    paymentMethodId,
    paiement,
    borne,
    totalTTC,
    client,
    date,
    heure
  } = req.body;

  if (!paymentMethodId || !totalTTC || !client) {
    return res.status(400).json({
      error: 'Données manquantes.'
    });
  }

  const montant =
    paiement === 'acompte'
      ? Math.ceil(totalTTC * 0.4)
      : totalTTC;

  const montantCentimes = Math.round(montant * 100);

  try {
    const paymentIntent =
      await stripe.paymentIntents.create({
        amount: montantCentimes,
        currency: 'eur',
        payment_method: paymentMethodId,
        confirm: true,
        receipt_email: client.email,
        return_url: `${process.env.SITE_URL}/confirmation.html?mode=carte`
      });

    return res.status(200).json(paymentIntent);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
};
