# Plan d'Audit et d'Optimisation SEO Complète — IRV'OHM

Ce document présente l'analyse technique initiale, la cartographie des 34 mots-clés stratégiques, les problèmes identifiés sur le code source réel du site IRV'OHM, ainsi que le plan d'action d'optimisation sans dégradation visuelle, fonctionnelle ou technique.

---

## 1. État Initial et Diagnostic Technique

### 1.1 Technologie et Architecture du Site
- **Technologie** : Site HTML5 statique sans framework lourd (HTML, CSS natif, JavaScript vanilla, Tailwind CSS sur certaines pages spécifiques, animations par IntersectionObserver natif, icônes SVG inline).
- **Backend / Fonctions** : Netlify Functions / Vercel API (intégrations Stripe et formulaires).
- **Volume de pages** : 120 fichiers HTML répertoriés :
  - **Pages institutionnelles & commerciales (5)** : `index.html`, `particulier.html`, `entreprise.html`, `devis.html`, `faq.html`.
  - **Hubs départementaux (7)** : `val-doise.html`, `hauts-de-seine.html`, `yvelines.html`, `val-de-marne.html`, `seine-saint-denis.html`, `seine-et-marne.html`, `cote-azur.html`.
  - **Pages locales villes (85)** : pages dédiées aux communes d'Île-de-France et des Alpes-Maritimes / Côte d'Azur.
  - **Section Blog (16)** : hub `blog/index.html` + 15 guides thématiques spécialisés.
  - **Pages utilitaires & légales (3)** : `mentions-legales.html`, `politique-confidentialite.html`, `404.html`.
  - **Pages non indexables / internes (4)** : `admin.html`, `code.html`, `confirmation.html`, `demande-envoyee.html` (toutes dotées de `noindex, nofollow`).

### 1.2 Problèmes Critiques Identifiés lors de l'Audit

1. **Absence des 6 derniers articles du blog dans `sitemap.xml`** :
   - `blog/assurance-habitation-borne-recharge.html`
   - `blog/cout-recharge-voiture-electrique-maison.html`
   - `blog/entretien-borne-recharge.html`
   - `blog/marques-bornes-recharge-comparatif.html`
   - `blog/normes-installation-borne-recharge.html`
   - `blog/recharger-voiture-electrique-hiver.html`
   *Impact* : Ces 6 articles à haute valeur SEO ne sont pas signalés aux moteurs dans le sitemap XML (109 URLs actuellement au lieu de 115).
2. **H1 actuels trop poétiques / axés marketing sans mots-clés prioritaires** :
   - `index.html` : H1 = *"Rechargez l'avenir, simplement chez vous."* (ne contient ni "installateur", ni "borne de recharge", ni "IRVE").
   - `particulier.html` : H1 = *"La recharge intelligente chez vous."* (manque "installation", "borne de recharge à domicile", "particulier").
   - `entreprise.html` : H1 = *"Accélérez votre transition énergétique"* (manque "installation borne de recharge entreprise").
   - `devis.html` : H1 = *"Votre devis borne, en 2 minutes."* (manque "devis installation borne de recharge").
3. **Balises `<title>` et `<meta description>` sous-optimisées sur les pages commerciales clés** :
   - `particulier.html` a pour title *"IRV'OHM — Solutions de recharge pour particuliers"*, manquant les termes *"Installation borne de recharge à domicile & maison"*.
   - `entreprise.html` mentionne les copropriétés dans sa meta description, ce qui brouille l'intention B2B.
4. **Lacunes de contenu sur 4 requêtes clés à forte intention** :
   - *« borne de recharge gratuite »* / *« installation borne de recharge gratuite »* : Absent du site. Risque de déception ou de suspicion si non traité. Doit être traité pédagogiquement (démystification des arnaques à 0 € vs aides réelles ADVENIR, TVA 5,5% et crédit d'impôt 500 €).
   - *« liste installateur irve »* : Absent. Doit expliquer comment vérifier les installateurs agréés sur les registres officiels (Qualifelec / AFNOR / Ademe) et valoriser l'agrément IRV'OHM, sans inventer un faux annuaire.
   - *« borne de recharge rapide »* : Non différencié. Clarifier la recharge accélérée AC 7,4 à 22 kW proposée par IRV'OHM par rapport aux superchargeurs DC 50-350 kW publics d'autoroute.
5. **Directives `robots.txt` incomplètes** :
   - Les pages d'administration et de confirmation (`/admin.html`, `/code.html`, `/confirmation.html`, `/demande-envoyee.html`) ne sont pas formellement bloquées au crawl dans `robots.txt`.

---

## 2. User Review Required

> [!IMPORTANT]
> **Aucune URL existante ne sera modifiée ni supprimée**. Toutes les URLs actuelles sont conservées à l'identique pour éviter toute régression de trafic ou problème de redirection 301.

> [!NOTE]
> **Préservation totale de l'identité et du design** : Les structures HTML, les classes CSS, les styles visuels, les scripts de formulaires Netlify/Vercel et le parcours utilisateur restent inchangés. Les modifications portent sur la sémantique (Title, Meta, H1/H2, enrichissements textuels ciblés, maillage interne, données structurées, sitemap et robots.txt).

---

## 3. Cartographie Complète des 34 Mots-Clés (Ordre Initial Conservé)

Catégories de couverture :
- **A** : Couvert correctement.
- **B** : Sujet couvert, mais métadonnées (Title / Meta / H1) à optimiser.
- **C** : Sujet insuffisamment traité dans le contenu (enrichissement éditorial requis).
- **D** : Aucune page pertinente identifiée.
- **E** : Expression à regrouper avec une autre intention, sans page distincte.

| # | Mot-clé | Intention | Importance | Page cible | Cat. | Title proposé | H1 proposé | Action & Justification |
|---|---|---|---|---|:---:|---|---|---|
| 1 | `installateur borne de recharge` | Commerciale / Transac | Maximale | `index.html` | **B** | Installateur Borne de Recharge Électrique IRVE \| IRV'OHM | Installateur de borne de recharge électrique certifié IRVE | Optimiser Title, H1 et premier paragraphe de l'accueil. |
| 2 | `borne de recharge électrique` | Info / Commerciale | Haute | `index.html` | **B** | Installateur Borne de Recharge Électrique IRVE \| IRV'OHM | Installateur de borne de recharge électrique certifié IRVE | Intégrer naturellement dans le Title et le corpus de l'accueil. |
| 3 | `installation borne de recharge entreprise` | Commerciale B2B | Maximale | `entreprise.html` | **B** | Installation Borne de Recharge Entreprise & Flotte IRVE \| IRV'OHM | Installation de bornes de recharge pour entreprise et professionnels | Rehausser le ciblage B2B sur `entreprise.html`. |
| 4 | `installateur de borne de recharge` | Commerciale | Maximale | `index.html` | **E** | (Groupé avec #1 sur `index.html`) | Installateur de borne de recharge électrique certifié IRVE | Variante avec particule "de", couverte directement par le H1. |
| 5 | `installation borne de recharge à domicile` | Commerciale B2C | Maximale | `particulier.html` | **B** | Installation Borne de Recharge à Domicile & Particulier \| IRV'OHM | Installation de borne de recharge à domicile & en copropriété | Cœur de cible de la page particuliers. |
| 6 | `pose borne de recharge` | Commerciale | Haute | `particulier.html` | **E** | (Groupé avec #5 sur `particulier.html`) | (Couvert dans section technique & FAQ) | Synonyme de pose/installation, intégré dans les sous-titres H2. |
| 7 | `devis installation borne de recharge` | Transactionnelle | Maximale | `devis.html` | **B** | Devis Installation Borne de Recharge Électrique Gratuit \| IRV'OHM | Devis installation borne de recharge : étude gratuite sous 24h | Optimiser Title et H1 du formulaire de devis. |
| 8 | `borne recharge électrique` | Info / Commerciale | Moyenne | `index.html` | **E** | (Groupé avec #2 sur `index.html`) | (Couvert sur l'accueil) | Variante syntaxique sans préposition. |
| 9 | `borne de recharge maison` | Commerciale B2C | Haute | `particulier.html` | **B** | Installation Borne de Recharge à Domicile & Particulier \| IRV'OHM | (H2 : Borne de recharge pour maison individuelle) | Mettre en valeur la section maison individuelle de la page. |
| 10 | `installateur irve` | Commerciale / Label | Maximale | `index.html` | **B** | Installateur Borne de Recharge Électrique IRVE \| IRV'OHM | Installateur de borne de recharge électrique certifié IRVE | Positionner la qualification IRVE en Title et H1. |
| 11 | `borne de recharge à domicile` | Commerciale B2C | Haute | `particulier.html` | **B** | Installation Borne de Recharge à Domicile & Particulier \| IRV'OHM | Installation de borne de recharge à domicile & en copropriété | Aligner Title et H1 avec la requête. |
| 12 | `borne irve` | Commerciale / Tech | Haute | `index.html` | **E** | (Groupé avec #10 sur `index.html`) | (Couvert sur l'accueil et guide normes) | Regrouper avec la thématique de conformité IRVE. |
| 13 | `installation de borne électrique` | Commerciale | Haute | `index.html` | **E** | (Groupé avec #1 sur `index.html`) | (Couvert sur l'accueil) | Variante syntaxique courante. |
| 14 | `borne de recharge domicile` | Commerciale B2C | Haute | `particulier.html` | **E** | (Groupé avec #11 sur `particulier.html`) | (Couvert sur particulier.html) | Variante sans accent/préposition. |
| 15 | `installation borne de recharge domicile` | Commerciale B2C | Haute | `particulier.html` | **E** | (Groupé avec #5 sur `particulier.html`) | (Couvert sur particulier.html) | Variante sans préposition. |
| 16 | `borne de recharge rapide` | Info / Commerciale | Haute | `blog/borne-7kw-ou-22kw-quelle-puissance-choisir.html` | **C** | Borne 7 kW ou 22 kW : quelle puissance choisir ? (2026) \| IRV'OHM | Borne 7 kW ou 22 kW : quelle puissance choisir ? | Ajouter section H2 pédagogique distinguant charge accélérée AC 22 kW (IRV'OHM) et superchargeurs DC autoroutiers. |
| 17 | `irve borne` | Commerciale | Moyenne | `index.html` | **E** | (Groupé avec #10/#12) | (Couvert sur l'accueil) | Requête inversée. |
| 18 | `installation borne de recharge copropriété` | Commerciale B2C / Syndic | Maximale | `blog/borne-recharge-copropriete-droit-a-la-prise.html` | **B** | Installation Borne de Recharge en Copropriété : Droit à la Prise \| IRV'OHM | Installation de borne de recharge en copropriété : droit à la prise | Optimiser le Title et H1 du guide copropriété (relais sur `particulier.html`). |
| 19 | `installateur de bornes de recharge pour véhicules électriques` | Longue traîne | Haute | `index.html` | **B** | Installateur Borne de Recharge Électrique IRVE \| IRV'OHM | Installateur de borne de recharge électrique certifié IRVE | Intégrer dans le corps d'introduction et le chapô de l'accueil. |
| 20 | `borne de recharge électrique domicile` | Commerciale B2C | Haute | `particulier.html` | **E** | (Groupé avec #5) | (Couvert sur particulier.html) | Variante combinée. |
| 21 | `pose de borne de recharge` | Commerciale | Haute | `particulier.html` | **E** | (Groupé avec #6) | (Couvert sur particulier.html) | Variante avec particule "de". |
| 22 | `faire installer une borne de recharge` | Commerciale / Action | Maximale | `particulier.html` | **B** | (Couvert sur `particulier.html`) | (H2 : Faire installer une borne de recharge : nos étapes clés) | Section d'accompagnement sur le parcours d'installation. |
| 23 | `installateur borne de recharge irve` | Commerciale | Maximale | `index.html` | **E** | (Groupé avec #1 et #10) | Installateur de borne de recharge électrique certifié IRVE | Combinaison directe des termes phares de l'accueil. |
| 24 | `borne de recharge a domicile` | Commerciale B2C | Haute | `particulier.html` | **E** | (Groupé avec #11) | (Couvert sur particulier.html) | Variante sans accent. |
| 25 | `borne de recharge pour véhicule électrique` | Générique | Haute | `index.html` | **B** | Installateur Borne de Recharge Électrique IRVE \| IRV'OHM | Installateur de borne de recharge électrique certifié IRVE | Corpus et sous-titres de l'accueil. |
| 26 | `borne de recharge gratuite` | Informationnelle / Mythe | Moyenne | `blog/aides-borne-recharge-advenir.html` | **C** | Aides Borne de Recharge : ADVENIR, Crédit d'Impôt & TVA 5,5 % \| IRV'OHM | Aides pour une borne de recharge : ADVENIR, crédit d'impôt et TVA 5,5 % | Ajouter section H2 clarifiant la réalité des aides vs arnaques à la gratuité. |
| 27 | `borne de recharge entreprise` | Commerciale B2B | Maximale | `entreprise.html` | **B** | Installation Borne de Recharge Entreprise & Flotte IRVE \| IRV'OHM | Installation de bornes de recharge pour entreprise et professionnels | Title, H1 et corpus B2B. |
| 28 | `borne de recharge particulier` | Commerciale B2C | Maximale | `particulier.html` | **B** | Installation Borne de Recharge à Domicile & Particulier \| IRV'OHM | Installation de borne de recharge à domicile & en copropriété | Title, H1 et sections offres particuliers. |
| 29 | `installation borne` | Générique courte | Moyenne | `index.html` | **E** | (Groupé avec #1) | (Couvert sur l'accueil) | Requête tronquée. |
| 30 | `aide installation borne de recharge particulier` | Info / Transac | Haute | `blog/aides-borne-recharge-advenir.html` | **C** | Aides Borne de Recharge : ADVENIR, Crédit d'Impôt & TVA 5,5 % \| IRV'OHM | Aides pour une borne de recharge : ADVENIR, crédit d'impôt et TVA 5,5 % | Ajouter les détails du Crédit d'impôt particulier (500 €) en plus d'ADVENIR et TVA. |
| 31 | `installation borne de recharge gratuite` | Info / Mythe | Moyenne | `blog/aides-borne-recharge-advenir.html` | **C** | (Groupé avec #26 dans l'article Aides) | (H2 : Une borne de recharge peut-elle être installée gratuitement ?) | Démystification pédagogique dans le même chapitre. |
| 32 | `installation bornes de recharge électrique` | Commerciale pluriel | Haute | `entreprise.html` / `index.html` | **E** | (Groupé avec #1 et #3) | (Couvert sur les pages piliers) | Forme plurielle. |
| 33 | `liste installateur irve` | Navigationnelle / Annuaire | Haute | `blog/normes-installation-borne-recharge.html` | **C** | Quelles normes pour l'installation d'une borne de recharge ? \| IRV'OHM | Quelles normes pour l'installation d'une borne de recharge ? | Ajouter section H2 expliquant où trouver les registres officiels d'installateurs IRVE (Qualifelec, AFNOR) et les garanties associées. |
| 34 | `borne de recharge wallbox` | Commerciale / Matériel | Haute | `blog/prise-renforcee-ou-wallbox.html` | **B** | Prise renforcée ou borne wallbox : que choisir en 2026 ? \| IRV'OHM | Prise renforcée ou borne wallbox : que choisir ? | Optimiser Title, H1 et renforcer le lien avec `particulier.html`. |

---

## 4. Proposed Changes

### Composant 1 : Pages Commerciales & Institutionnelles Piliers

#### [MODIFY] [index.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/index.html)
- **Title** : Remplacer par `Installateur Borne de Recharge Électrique IRVE | IRV'OHM` (58 caractères, ciblage parfait des mots-clés 1, 2, 10, 23).
- **Meta Description** : Optimiser en conservant les informations réelles : `IRV'OHM, électricien certifié IRVE : installation de bornes de recharge pour véhicules électriques chez les particuliers et entreprises. Devis gratuit sous 48h.` (170 car.).
- **H1** : Remplacer `Rechargez l'avenir,<br/><span class="text-gradient-brand">simplement chez vous.</span>` par `Installateur de borne de recharge électrique<br/><span class="text-gradient-brand">certifié IRVE</span>` pour ancrer la requête principale exacte.
- **Contenu** : Conserver le slogan marketing en sous-titre immédiat pour préserver l'impact visuel et la promesse de marque.

#### [MODIFY] [particulier.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/particulier.html)
- **Title** : `Installation Borne de Recharge à Domicile & Particulier | IRV'OHM` (66 caractères, cible les requêtes 5, 11, 28).
- **Meta Description** : `Installation de bornes de recharge à domicile pour particuliers : maison individuelle et copropriété. Électricien IRVE, TVA 5,5 %, crédit d'impôt. Devis gratuit.` (170 car.).
- **H1** : Remplacer `La recharge intelligente <span class="accent">chez vous</span>.` par `Installation de borne de recharge <span class="accent">à domicile & en copropriété</span>`.
- **H2 et sous-titres** : Intégrer les sections *"Faire installer une borne de recharge à domicile : étapes et garanties"* et enrichir le maillage vers `devis.html`.

#### [MODIFY] [entreprise.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/entreprise.html)
- **Title** : `Installation Borne de Recharge Entreprise & Flotte IRVE | IRV'OHM` (64 caractères, cible les requêtes 3, 27).
- **Meta Description** : `Installation de bornes de recharge pour entreprises, parkings professionnels et flottes de véhicules électriques en Île-de-France. Devis gratuit sous 48h.` (166 car., supprime la mention parasite des copropriétés).
- **H1** : Remplacer `Accélérez votre<br/><span class="accent">transition énergétique</span>` par `Installation de bornes de recharge<br/><span class="accent">pour entreprise & flotte</span>`.

#### [MODIFY] [devis.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/devis.html)
- **Title** : `Devis Installation Borne de Recharge Électrique Gratuit | IRV'OHM` (64 caractères, cible la requête 7).
- **Meta Description** : `Demandez votre devis gratuit d'installation de borne de recharge IRVE en 2 minutes. Étude personnalisée pour particulier, copropriété et entreprise sous 24h.` (169 car.).
- **H1** : Remplacer `Votre devis borne, <span class="accent">en 2 minutes.</span>` par `Devis installation borne de recharge : <span class="accent">votre étude sous 24h</span>`.

#### [MODIFY] [faq.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/faq.html)
- **Title** : `FAQ Borne de Recharge IRVE : Prix, Aides, Installation | IRV'OHM`
- **H1** : `Questions fréquentes sur l'installation de borne de recharge`
- **Contenu** : Ajouter 2 questions-réponses clés :
  1. *« Une borne de recharge peut-elle être totalement gratuite ? »* (réponse transparente sur le crédit d'impôt 500 €, la TVA à 5,5 %, et l'absence d'installation à 0 € légitime).
  2. *« Comment vérifier qu'un installateur est bien certifié IRVE ? »* (renvoi vers les organismes certificateurs officiels).
- **Données structurées** : Mettre à jour le schéma JSON-LD `FAQPage` avec ces nouvelles questions.

---

### Composant 2 : Articles du Blog Ciblés

#### [MODIFY] [blog/aides-borne-recharge-advenir.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/blog/aides-borne-recharge-advenir.html)
- **Title** : `Aides Borne de Recharge : ADVENIR, Crédit d'Impôt & TVA 5,5 % | IRV'OHM` (Cible requêtes 26, 30, 31).
- **Contenu** :
  - Ajouter la section sur le **Crédit d'impôt pour borne de recharge (CGI art. 200 quater C)** : 75 % du montant des dépenses dans la limite de 500 € par système de charge pour les particuliers (résidence principale ou secondaire).
  - Ajouter la section **« Borne de recharge gratuite : réalité ou promesse trompeuse ? »** : expliquer que si des bornes publiques ou d'entreprises peuvent offrir des sessions gratuites, l'installation d'une borne privée n'est jamais à 0 €. Mettre en garde contre les démarchages abusifs tout en valorisant les vraies aides (crédit d'impôt + ADVENIR + TVA 5,5 %).
  - Renforcer les liens internes vers `particulier.html` et `devis.html`.

#### [MODIFY] [blog/normes-installation-borne-recharge.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/blog/normes-installation-borne-recharge.html)
- **Contenu** :
  - Ajouter une section H2 explicite : **« Où consulter la liste des installateurs IRVE certifiés ? »** (Cible requête 33).
  - Expliquer comment vérifier la mention IRVE d'une entreprise sur les registres officiels des organismes certificateurs accrédités (Qualifelec, AFNOR Certification).
  - Expliquer pourquoi faire appel à un installateur agréé figurant sur ces registres est obligatoire pour bénéficier des garanties d'assurance et des aides de l'État.

#### [MODIFY] [blog/borne-7kw-ou-22kw-quelle-puissance-choisir.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/blog/borne-7kw-ou-22kw-quelle-puissance-choisir.html)
- **Contenu** :
  - Ajouter une section H2 explicite : **« Borne de recharge rapide : quelle réalité pour un particulier ou une entreprise ? »** (Cible requête 16).
  - Clarifier la différence entre la **recharge accélérée AC** (7,4 kW, 11 kW, 22 kW installée par IRV'OHM en habitat et parking d'entreprise, charge en 2h à 4h) et la **recharge ultra-rapide DC** (50 kW à 350 kW, dédiée aux stations publiques d'autoroute nécessitant un transformateur haute tension).

#### [MODIFY] [blog/borne-recharge-copropriete-droit-a-la-prise.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/blog/borne-recharge-copropriete-droit-a-la-prise.html)
- **Title** : `Installation Borne de Recharge en Copropriété : Droit à la Prise (2026) | IRV'OHM` (Cible requête 18).
- **H1** : `Installation de borne de recharge en copropriété : le droit à la prise`
- **Maillage** : Ancre descriptive vers `devis.html` pour l'étude technique en copropriété.

#### [MODIFY] [blog/prise-renforcee-ou-wallbox.html](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/blog/prise-renforcee-ou-wallbox.html)
- **Title** : `Prise renforcée ou borne wallbox : que choisir pour recharger ? | IRV'OHM` (Cible requête 34).
- **H1** : `Prise renforcée ou borne wallbox : que choisir ?`

---

### Composant 3 : Fichiers Techniques & Indexation

#### [MODIFY] [sitemap.xml](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/sitemap.xml)
- Ajouter les 6 articles de blog actuellement manquants :
  - `https://www.irvohm.fr/blog/assurance-habitation-borne-recharge.html`
  - `https://www.irvohm.fr/blog/cout-recharge-voiture-electrique-maison.html`
  - `https://www.irvohm.fr/blog/entretien-borne-recharge.html`
  - `https://www.irvohm.fr/blog/marques-bornes-recharge-comparatif.html`
  - `https://www.irvohm.fr/blog/normes-installation-borne-recharge.html`
  - `https://www.irvohm.fr/blog/recharger-voiture-electrique-hiver.html`
- Mettre à jour les balises `<lastmod>` des pages modifiées.

#### [MODIFY] [robots.txt](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/robots.txt)
- Bloquer explicitement les pages techniques et de confirmation pour préserver le budget de crawl :
  ```
  Disallow: /admin.html
  Disallow: /code.html
  Disallow: /confirmation.html
  Disallow: /demande-envoyee.html
  ```

---

### Composant 4 : Livrables de Documentation Obligatoires

#### [NEW] [docs/audit-seo-irvohm.md](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/docs/audit-seo-irvohm.md)
Rapport d'audit complet détaillant :
- Diagnostic technologique et structurel du site.
- Recensement exhaustif des 120 fichiers et analyse des URLs indexables.
- Problèmes identifiés (balisage, sitemap, meta, sémantique).
- Priorités d'action.

#### [NEW] [docs/mapping-34-mots-cles.md](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/docs/mapping-34-mots-cles.md)
Tableau détaillé des 34 mots-clés dans leur ordre exact avec :
- Mot-clé exact.
- Page cible assignée.
- Intention de recherche et valeur commerciale.
- Title actuel et Title proposé.
- Meta description actuelle et proposée.
- H1 actuel et recommandé.
- Statut de couverture et plan d'action.

#### [NEW] [docs/seo-changelog.md](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/docs/seo-changelog.md)
Journal des modifications apportées fichier par fichier, avec justifications techniques et éléments à valider.

#### [NEW] [scratch/verify_seo.ps1](file:///C:/Users/Host/.gemini/antigravity/scratch/irvohm/scratch/verify_seo.ps1)
Script automatisé de contrôle qualité réutilisable : vérifie l'unicité des titles/descriptions, la validité des H1, les canonicals, le sitemap XML et les liens internes.

---

## 5. Verification Plan

### Automated Tests
1. **Script de validation global** (`scratch/verify_seo.ps1`) :
   - Vérification de l'unicité et de la non-vacuité des balises `<title>` et `<meta name="description">` sur toutes les pages indexables.
   - Contrôle de la présence d'un H1 unique par page.
   - Validation de la concordance des balises `<link rel="canonical">`.
   - Contrôle d'intégrité du fichier `sitemap.xml` (présence des 115 URLs indexables, aucune URL 404).
   - Contrôle des liens internes brisés.
   - Validation syntaxique JSON-LD.
2. **Git status et Git diff** :
   - Vérification que seuls les fichiers ciblés ont été modifiés sur la branche dédiée `seo-optimization-34kw`.

### Manual Verification
- Contrôle visuel du rendu HTML dans le navigateur pour garantir qu'aucun style CSS ou comportement JavaScript/formulaire n'a été altéré.
- Vérification de l'intégrité des formulaires de devis et boutons d'appel à l'action.
