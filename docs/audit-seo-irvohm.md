# Audit SEO IRV’OHM — 20 octobre 2026

## Diagnostic et périmètre
Site statique HTML/CSS/JavaScript, fonctions de formulaires et paiement existantes. Inventaire réel : 120 pages HTML, dont 115 indexables, quatre pages internes noindex et une page 404. Le sitemap initial comptait 109 URL ; six articles étaient absents. Les pages piliers avaient des titres et H1 peu alignés sur les intentions de recherche du plan.

## Actions prioritaires réalisées
Optimisation des cinq pages piliers et de cinq guides, maillage interne, enrichissements sur gratuité, qualification IRVE et recharge AC/DC. Synchronisation des métadonnées de partage et dates de modification des articles concernés. FAQ visible et JSON-LD cohérentes. Sitemap complété à 115 URL, sans doublon /blog/index.html puisque la canonique est /blog/.

## Corrections apportées au plan
- Crédit d’impôt : les 75 % plafonnés à 500 € sont présentés pour les dépenses éligibles de 2025. Suppression pour les paiements à compter du 1er janvier 2026, confirmée par Service Public. Pas de promesse de crédit pour un nouveau projet 2026.
- robots.txt : conserver les quatre pages noindex explorables pour que Google lise leur directive. Le blocage /api/ reste en place.
- Recharge : pas de durée universelle de 2 à 4 heures ni de transformateur haute tension systématiquement requis. Exemple chiffré conditionné par la puissance acceptée et hors pertes.
- Qualification : vérification du certificat et de l’assurance, sans assimilation automatique entre qualification, couverture d’assurance et obtention d’une aide.

## Sources vérifiées
- https://www.service-public.gouv.fr/particuliers/vosdroits/F35578
- https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=fr
- https://irve.qualifelec.fr/

## Vérification
`python scratch/verify_seo.py` : 120 pages HTML, 115 indexables, 115 URL du sitemap, zéro erreur. Vérifie titles/descriptions uniques et non vides, H1, canonicals, liens et fragments internes, réécriture Vercel existante, JSON-LD et noindex. Ce contrôle hors ligne ne mesure pas les codes HTTP de production, les performances, l’indexation effective ni le classement. Les fonctions de paiement et formulaires ne sont pas soumises en test.

Contrôle de non-régression : blocs CSS, formulaires et scripts exécutables identiques sur les dix pages HTML modifiées. Contrôle visuel non effectué : aucun navigateur Chromium installé dans cet environnement. À vérifier sur la prévisualisation de la pull request, en particulier les H1 plus longs sur mobile.

## Inventaire exhaustif
| Fichier | Indexation |
|---|---|
| 404.html | Exclu |
| admin.html | Exclu |
| antibes.html | Indexable |
| argenteuil.html | Indexable |
| arnouville.html | Indexable |
| asnieres-sur-seine.html | Indexable |
| aulnay-sous-bois.html | Indexable |
| blog/aides-borne-recharge-advenir.html | Indexable |
| blog/assurance-habitation-borne-recharge.html | Indexable |
| blog/borne-7kw-ou-22kw-quelle-puissance-choisir.html | Indexable |
| blog/borne-recharge-copropriete-droit-a-la-prise.html | Indexable |
| blog/borne-recharge-entreprise-flotte.html | Indexable |
| blog/borne-recharge-panneaux-solaires.html | Indexable |
| blog/cout-recharge-voiture-electrique-maison.html | Indexable |
| blog/entretien-borne-recharge.html | Indexable |
| blog/index.html | Indexable |
| blog/installer-borne-recharge-soi-meme.html | Indexable |
| blog/marques-bornes-recharge-comparatif.html | Indexable |
| blog/normes-installation-borne-recharge.html | Indexable |
| blog/prise-renforcee-ou-wallbox.html | Indexable |
| blog/prix-installation-borne-recharge.html | Indexable |
| blog/recharger-voiture-electrique-hiver.html | Indexable |
| blog/temps-de-recharge-voiture-electrique.html | Indexable |
| bondy.html | Indexable |
| bussy-saint-georges.html | Indexable |
| cagnes-sur-mer.html | Indexable |
| cannes.html | Indexable |
| cergy.html | Indexable |
| champigny-sur-marne.html | Indexable |
| champs-sur-marne.html | Indexable |
| chatou.html | Indexable |
| chelles.html | Indexable |
| code.html | Exclu |
| colombes.html | Indexable |
| confirmation.html | Exclu |
| conflans-sainte-honorine.html | Indexable |
| cormeilles-en-parisis.html | Indexable |
| cote-azur.html | Indexable |
| courbevoie.html | Indexable |
| creteil.html | Indexable |
| demande-envoyee.html | Exclu |
| deuil-la-barre.html | Indexable |
| devis.html | Indexable |
| domont.html | Indexable |
| eaubonne.html | Indexable |
| enghien-les-bains.html | Indexable |
| entreprise.html | Indexable |
| ermont.html | Indexable |
| faq.html | Indexable |
| fontenay-sous-bois.html | Indexable |
| franconville.html | Indexable |
| gagny.html | Indexable |
| garges-les-gonesse.html | Indexable |
| gonesse.html | Indexable |
| grasse.html | Indexable |
| hauts-de-seine.html | Indexable |
| herblay-sur-seine.html | Indexable |
| houilles.html | Indexable |
| index.html | Indexable |
| lagny-sur-marne.html | Indexable |
| le-blanc-mesnil.html | Indexable |
| le-cannet.html | Indexable |
| le-perreux-sur-marne.html | Indexable |
| le-raincy.html | Indexable |
| lisle-adam.html | Indexable |
| livry-gargan.html | Indexable |
| maisons-alfort.html | Indexable |
| maisons-laffitte.html | Indexable |
| mandelieu-la-napoule.html | Indexable |
| mantes-la-jolie.html | Indexable |
| meaux.html | Indexable |
| melun.html | Indexable |
| mentions-legales.html | Indexable |
| menton.html | Indexable |
| montigny-le-bretonneux.html | Indexable |
| montmorency.html | Indexable |
| montreuil.html | Indexable |
| mougins.html | Indexable |
| nanterre.html | Indexable |
| nice.html | Indexable |
| nogent-sur-marne.html | Indexable |
| noisy-le-grand.html | Indexable |
| paris.html | Indexable |
| particulier.html | Indexable |
| poissy.html | Indexable |
| politique-confidentialite.html | Indexable |
| pontault-combault.html | Indexable |
| pontoise.html | Indexable |
| roissy-en-france.html | Indexable |
| rosny-sous-bois.html | Indexable |
| rueil-malmaison.html | Indexable |
| saint-brice-sous-foret.html | Indexable |
| saint-germain-en-laye.html | Indexable |
| saint-laurent-du-var.html | Indexable |
| saint-leu-la-foret.html | Indexable |
| saint-maur-des-fosses.html | Indexable |
| saint-ouen-laumone.html | Indexable |
| saint-raphael.html | Indexable |
| sannois.html | Indexable |
| sarcelles.html | Indexable |
| sartrouville.html | Indexable |
| savigny-le-temple.html | Indexable |
| seine-et-marne.html | Indexable |
| seine-saint-denis.html | Indexable |
| sevran.html | Indexable |
| soisy-sous-montmorency.html | Indexable |
| taverny.html | Indexable |
| torcy.html | Indexable |
| val-de-marne.html | Indexable |
| val-doise.html | Indexable |
| vallauris.html | Indexable |
| vence.html | Indexable |
| versailles.html | Indexable |
| villejuif.html | Indexable |
| villeneuve-loubet.html | Indexable |
| villeparisis.html | Indexable |
| villiers-le-bel.html | Indexable |
| vincennes.html | Indexable |
| vitry-sur-seine.html | Indexable |
| yvelines.html | Indexable |
