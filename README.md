# IRV'OHM — Backend Paiement Stripe + Netlify Functions

## Structure du projet

```
irv-ohm/
├── netlify.toml                          ← Config Netlify
├── package.json                          ← Dépendances (stripe)
├── netlify/
│   └── functions/
│       ├── create-payment-intent.js      ← Paiement comptant / acompte 40%
│       ├── create-klarna-session.js      ← Paiement Klarna 3× sans frais
│       └── stripe-webhook.js            ← Réception événements Stripe
└── public/
    ├── particulier.html                  ← Page principale avec paiement intégré
    └── confirmation.html                 ← Page après paiement Klarna
```

---

## Étape 1 — Récupérer vos clés Stripe

1. Allez sur **https://dashboard.stripe.com**
2. Activez votre compte (ou mode test pour commencer)
3. Dans **Développeurs → Clés API** :
   - Copiez la **Clé publique** : `pk_live_...` (ou `pk_test_...` pour les tests)
   - Copiez la **Clé secrète** : `sk_live_...` (ou `sk_test_...` pour les tests)

---

## Étape 2 — Activer Klarna sur Stripe

1. Dashboard Stripe → **Paramètres → Moyens de paiement**
2. Cherchez **Klarna** et cliquez **Activer**
3. Klarna nécessite un compte Stripe vérifié (SIRET, RIB, etc.)

---

## Étape 3 — Configurer les variables d'environnement sur Netlify

1. Allez sur **https://app.netlify.com** → votre site → **Site settings → Environment variables**
2. Ajoutez ces 3 variables :

| Variable                  | Valeur                              |
|---------------------------|-------------------------------------|
| `STRIPE_SECRET_KEY`       | `sk_live_...` (votre clé secrète)   |
| `STRIPE_WEBHOOK_SECRET`   | `whsec_...` (voir étape 4)          |
| `SITE_URL`                | `https://votre-site.netlify.app`    |

---

## Étape 4 — Configurer le Webhook Stripe

1. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
2. URL : `https://votre-site.netlify.app/api/stripe-webhook`
3. Événements à écouter :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `charge.refunded`
4. Copiez le **Secret de signature** (`whsec_...`) → collez dans `STRIPE_WEBHOOK_SECRET`

---

## Étape 5 — Mettre votre clé publique dans particulier.html

Ouvrez `public/particulier.html` et remplacez :

```js
var STRIPE_PK = 'pk_test_REMPLACEZ_PAR_VOTRE_CLE_PUBLIQUE_STRIPE';
```

par votre vraie clé publique :

```js
var STRIPE_PK = 'pk_live_votre_vraie_cle_ici';
```

---

## Étape 6 — Déployer sur Netlify

### Option A — Via GitHub (recommandé)
1. Créez un repo GitHub et poussez ce dossier
2. Sur Netlify : **Add new site → Import from Git**
3. Sélectionnez votre repo — Netlify détecte automatiquement `netlify.toml`
4. Cliquez **Deploy**

### Option B — Via Netlify CLI
```bash
npm install
npx netlify login
npx netlify deploy --prod
```

---

## Tester en local

```bash
npm install
npx netlify dev
```

Le site tourne sur `http://localhost:8888` avec les Functions actives.

---

## CRM Leads (formulaire de devis)

Le formulaire `devis.html` envoie chaque lead à `/api/leads`, qui l'enregistre dans Supabase et notifie `contact@irvohm.fr` par email. Le CRM interne est accessible sur `/admin.html` (protégé par mot de passe).

### Variables d'environnement à ajouter sur Vercel

| Variable                | Valeur                                                    |
|-------------------------|------------------------------------------------------------|
| `SUPABASE_URL`           | `https://xulawpcvjaozyftwsrzk.supabase.co` (projet Supabase dédié "irvohm") |
| `SUPABASE_SERVICE_KEY`   | Clé `service_role` du projet Supabase "irvohm" (Project Settings → API) |
| `ADMIN_PASSWORD`         | Mot de passe pour accéder à `/admin.html`                  |
| `ADMIN_SESSION_SECRET`   | Chaîne aléatoire longue (ex : `openssl rand -hex 32`), sert à signer la session admin |

Les leads sont stockés dans la table `irvohm_leads` du projet Supabase (RLS activé, accès uniquement via la clé `service_role` côté serveur).

### Fichiers concernés

- `api/leads.js` — reçoit le POST du formulaire, insère le lead, envoie l'email de notification
- `api/admin-login.js` / `api/admin-logout.js` — authentification du CRM (cookie signé, 8h)
- `api/admin-leads.js` — liste / met à jour le statut & les notes / supprime un lead
- `admin.html` — interface CRM (recherche, filtre par statut, notes, changement de statut)

---

## Cartes de test Stripe

| Carte                | Numéro              | Résultat          |
|----------------------|---------------------|-------------------|
| Paiement OK          | 4242 4242 4242 4242 | ✅ Succès         |
| 3D Secure            | 4000 0025 0000 3155 | 🔐 Auth requise   |
| Carte refusée        | 4000 0000 0000 9995 | ❌ Refusée        |

Date d'expiration : n'importe quelle date future | CVC : n'importe quels 3 chiffres

---

## Ce qui se passe lors d'un paiement

### Comptant ou Acompte 40%
1. Client remplit le formulaire → entre sa carte
2. Stripe crée un `PaymentMethod` côté client (la carte ne quitte jamais votre serveur)
3. Votre Netlify Function crée et confirme le `PaymentIntent`
4. Si 3D Secure requis → Stripe gère l'authentification automatiquement
5. Webhook `payment_intent.succeeded` → vous recevez la confirmation

### Klarna 3×
1. Client clique "Payer avec Klarna"
2. Netlify Function crée une Checkout Session Stripe avec Klarna
3. Client est redirigé vers la page Klarna officielle (hébergée par Stripe)
4. Klarna gère l'identification et l'accord de paiement
5. Client revient sur `confirmation.html` après validation
6. Webhook `checkout.session.completed` → confirmation côté serveur
