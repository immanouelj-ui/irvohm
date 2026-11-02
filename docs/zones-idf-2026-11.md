# Extension des zones d’intervention — 2 novembre 2026

30 nouvelles communes et une page Essonne. La présentation des pages existantes est conservée. Chaque nouvelle commune a une introduction et un angle de préparation du projet distincts ; les critères décrivent des besoins possibles et ne prétendent pas documenter un chantier local.

Les nouvelles pages sont reliées depuis tous les 149 footers existants après génération et depuis les pages départementales. Le sitemap contient les 31 nouvelles URL. Les données structurées décrivent un service et sa zone desservie, sans inventer une adresse d’agence dans chaque ville. Les FAQ visibles et JSON-LD sont synchronisées.

Les six photos communales vérifiées sont attribuées dans les pages ; leur provenance, auteur et licence sont conservés dans `city_image_sources.json`. Les images ont été redimensionnées et converties en WebP. Pour les autres communes, l’illustration de recharge existante du site est utilisée, avec une légende qui précise qu’il ne s’agit pas d’un chantier dans la commune. Elle n’est pas présentée comme une photo de la ville.

Les noms et contenus du lot sont conservés dans `city_batch.json`. `generate_city_batch.py` permet de reconstruire ce lot et ses liens ; il ne régénère pas les autres contenus. `check_city_batch.py` contrôle les URL, liens, images, FAQ, sitemap, footers et le périmètre des changements des pages existantes.

Validation : contrôles structurels réussis. Le rendu visuel navigateur n’a pas pu être contrôlé dans cet environnement, faute d’exécutable Chromium. Les six photos ont été examinées visuellement sous forme de planche contact. Aucun changement aux API, formulaires et paiements.
