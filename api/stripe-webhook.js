const Stripe = require('stripe');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Traitement des événements Stripe
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
      // TODO : envoyer un email de confirmation via Amen SMTP
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = stripeEvent.data.object;
      console.error('❌ Paiement échoué:', pi.id, pi.last_payment_error?.message);
      break;
    }

    case 'checkout.session.completed': {
      // Klarna : paiement validé
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
      // TODO : envoyer un email de confirmation via Amen SMTP
      break;
    }

    case 'charge.refunded': {
      const charge = stripeEvent.data.object;
      console.log('↩️ Remboursement:', charge.id, charge.amount_refunded / 100 + '€');
      break;
    }

    default:
      console.log('Événement non géré:', stripeEvent.type);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
