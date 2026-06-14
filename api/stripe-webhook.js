const Stripe = require('stripe');

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    const sig = req.headers['stripe-signature'];
    const rawBody = await buffer(req);

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (stripeEvent.type) {

    case 'payment_intent.succeeded': {
      const pi = stripeEvent.data.object;

      console.log('✅ Paiement reçu:', {
        id: pi.id,
        montant: pi.amount / 100 + '€',
        client: pi.metadata?.prenom + ' ' + pi.metadata?.nom,
        borne: pi.metadata?.borne,
        adresse: pi.metadata?.adresse,
        date: pi.metadata?.date,
        heure: pi.metadata?.heure,
      });

      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = stripeEvent.data.object;

      console.error(
        '❌ Paiement échoué:',
        pi.id,
        pi.last_payment_error?.message
      );

      break;
    }

    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;

      console.log('✅ Session Klarna complétée:', {
        id: session.id,
        montant: session.amount_total / 100 + '€',
        email: session.customer_email,
        borne: session.metadata?.borne,
        adresse: session.metadata?.adresse,
        date: session.metadata?.date,
        heure: session.metadata?.heure,
      });

      break;
    }

    case 'charge.refunded': {
      const charge = stripeEvent.data.object;

      console.log(
        '↩️ Remboursement:',
        charge.id,
        charge.amount_refunded / 100 + '€'
      );

      break;
    }

    default:
      console.log('Événement non géré:', stripeEvent.type);
  }

  return res.status(200).json({
    received: true
  });
};
