# IRV'OHM — Backend Paiement Stripe + Netlify Functions

## Pages locales du Val-d’Oise

Les 183 communes sont recensées dans `communes_95.json`, avec les codes postaux et centres du référentiel officiel dans `geo_95_verified.json`. Les 155 nouvelles pages utilisent les textes dédiés de `city_95_editorial.tsv` ; leurs photographies et les deux remplacements d’images génériques sont documentés dans `city_95_image_sources.json` (auteur, licence, source et empreinte du fichier).

Pour reproduire l’intégration après modification des textes : `python complete_95.py`. Le script conserve les corps des 28 pages déjà présentes. Le contrôle `python check_complete_95.py` vérifie notamment les liens, les données structurées, les photographies et la préservation des autres contenus ; il nécessite Pillow et lxml. Le téléchargement des photographies peut être reproduit avec `python fetch_95_assets.py` (Pillow et lxml), en utilisant son cache local ignoré par Git.

## Navigation et pieds de page

Les six pages principales partagent une navigation complète sur ordinateur et un menu mobile natif sans dépendance JavaScript. Le pied de page est produit depuis `components/footer.html` au déploiement Vercel et mis en forme par `site-chrome.css`. Les liens communaux sont inscrits dans le HTML et regroupés par territoire. Pour prévisualiser une modification du pied de page en local, exécuter `node sync_footers.cjs`.

Après une génération de pages locales, lancer `node sync_footers.cjs` pour réappliquer le modèle partagé. Contrôles : `python check_site_revision.py`, `python check_complete_92.py` et `python check_complete_95.py`. Le premier vérifie aussi la conservation des liens des anciens pieds de page et du contenu hors navigation des pages locales, ainsi que la logique du formulaire de devis. Les deux contrôles géographiques réservent désormais les modifications éditoriales aux six pages principales.

La révision retire les chiffres et témoignages non documentés, les promesses de délai contradictoires et les garanties uniformes non justifiées. L’éligibilité aux aides et les conditions de garantie sont à confirmer pour chaque projet. Sources de référence : [ADVENIR](https://advenir.mobi/beneficier-dadvenir/) et [droit à la prise](https://www.energie-info.fr/fiche_pratique/je-fais-installer-une-borne-de-rechargement-pour-un-vehicule-electrique/).

## Responsive et utilisation du devis

Les six pages principales utilisent `site-ux.js` et les règles `.ui-main` de `site-chrome.css` : accès direct au contenu au clavier, gestion de fermeture du menu, états accessibles des FAQ, focus visible et prise en compte des animations réduites. Sur mobile, les choix du devis et les coordonnées passent en une colonne, les champs restent à 16 px et les contrôles principaux ont une hauteur minimale de 44 px.

Le devis avance et s’envoie uniquement avec les boutons Continuer / Envoyer. Les choix et le consentement utilisent des boutons natifs, les champs disposent de libellés associés et d’autocomplétion. Une erreur d’envoi conserve les réponses et affiche un message permettant de réessayer. `node test_site_ux.cjs` vérifie les contrôles natifs, les libellés, l’absence d’envoi automatique, le traitement d’échec et la nouvelle tentative avec réseau simulé. Compléter avec `node test_devis_entreprise.cjs` et `python check_site_revision.py`.

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

Le formulaire `devis.html` envoie chaque lead à `/api/leads`, qui l'enregistre dans Supabase et notifie `contact@irvohm.fr` par email. Le CRM interne est accessible sur `/admin.html`, avec des comptes employés individuels (pas un mot de passe partagé).

### Variables d'environnement à ajouter sur Vercel

| Variable                | Valeur                                                    |
|-------------------------|------------------------------------------------------------|
| `SUPABASE_URL`           | `https://xulawpcvjaozyftwsrzk.supabase.co` (projet Supabase dédié "irvohm") |
| `SUPABASE_SERVICE_KEY`   | Clé `service_role` du projet Supabase "irvohm" (Project Settings → API) |
| `ADMIN_PASSWORD`         | Clé d'installation à usage unique, sert uniquement à créer le tout premier compte admin (voir ci-dessous) |
| `ADMIN_SESSION_SECRET`   | Chaîne aléatoire longue (ex : `openssl rand -hex 32`), sert à signer les sessions |

### Premier lancement — créer le compte admin

1. Ajoute les 4 variables ci-dessus sur Vercel, puis redéploie.
2. Va sur `/admin.html` : comme aucun compte n'existe encore, un écran "Créer le compte administrateur" s'affiche.
3. Renseigne la valeur de `ADMIN_PASSWORD` comme "clé d'installation", ton nom, ton email et un mot de passe perso.
4. Une fois le compte admin créé, va dans l'onglet **Employés** pour ajouter les comptes de tes employés (chacun avec son propre email/mot de passe). `ADMIN_PASSWORD` ne sert plus après cette étape — tout le monde se connecte avec son propre compte.

### Fonctionnalités du CRM

- **Leads/clients** : recherche, filtre par statut et par source (formulaire / ajout manuel / import), ajout manuel d'un client
- **Notes** : fil de notes horodatées par client, avec l'auteur de chaque note
- **Documents** : upload de fichiers (3 Mo max) rattachés à un client, stockés dans Supabase Storage (bucket privé, accès via URL signée)
- **Import CSV** : upload d'un fichier CSV existant avec mapping manuel des colonnes vers les champs du CRM
- **Employés** (admin uniquement) : création de comptes, activation/désactivation, changement de rôle
- **Activité** (admin uniquement) : journal de toutes les actions (connexions, statuts modifiés, notes, imports, suppressions...) avec l'employé responsable

Seuls les admins peuvent supprimer un lead, gérer les employés ou consulter le journal d'activité — les employés voient et modifient tous les leads mais ne peuvent pas les supprimer.

### Fichiers concernés

- `api/leads.js` — reçoit le POST du formulaire public, insère le lead, envoie l'email de notification
- `api/admin-auth.js` — setup / login / logout / whoami, choisi via `?action=` (regroupés dans une seule fonction pour rester sous la limite Vercel Hobby de 12 fonctions)
- `api/admin-leads.js` — leads / notes / documents / import, choisi via `?resource=lead|note|document|import`
- `api/admin-users.js` — comptes employés / journal d'activité (admin uniquement), choisi via `?resource=user|activity`
- `admin.html` — interface CRM complète (leads, import, employés, activité)

> Le plan Vercel Hobby limite à 12 fonctions serverless par déploiement (un fichier = une fonction). Si tu ajoutes de nouveaux endpoints, regroupe-les dans un fichier existant via un paramètre `?action=`/`?resource=` plutôt que d'en créer un nouveau, pour ne pas dépasser la limite.

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
