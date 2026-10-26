# DecanteAssil

Boutique de parfums React + Vite, responsive, avec catalogue, filtres, recherche, formats, panier persistant et demande de commande sur WhatsApp.

## Développement

Node.js 22 ou 24 et npm.

```sh
npm ci
npm run dev -- --port 5173
```

## Ancien déploiement statique sur Cloudflare Pages

Pour utiliser l’administration et enregistrer les commandes, suivre **[ADMIN_SETUP.md](ADMIN_SETUP.md)** et utiliser le Worker ci-dessous. Pages seul ne fournit pas les API de gestion.

### Boutique statique uniquement

Connecter ce dépôt GitHub à **Cloudflare Pages** (Workers & Pages → Create → Pages → Import an existing Git repository).

- Branche de production : `main`
- Framework : Vite
- Commande de build : `npm run build`
- Dossier de sortie : `dist`
- Dossier racine : racine du dépôt
- Variable de build : `NODE_VERSION=24`

Ce mode statique ne nécessite aucun backend, base de données ou secret et ne propose pas d’administration. Ne pas ajouter de commande de déploiement Workers à ce projet Pages. Cloudflare republie le site après chaque push sur `main`.

## Cloudflare Workers (configuration actuelle)

Le dépôt inclut `wrangler.jsonc` pour servir le site statique sur Workers.

Dans Settings → Build :

- Build command : `npm run build`
- Deploy command : `npx wrangler deploy --assets ./dist` (ou `npx wrangler deploy`)
- Branche : `main`

La date de compatibilité et le dossier `dist` sont déclarés dans le dépôt. Le lien `workers.dev` est activé par la configuration. Après le push, suivre le nouveau build dans Deployments ; un ancien build échoué conserve ses anciens fichiers.

## Modifier les produits et prix

Avec D1 activé, gérer les produits depuis `/admin` → Produits. `public/catalog.json` sert uniquement au premier remplissage de la base et au fallback statique ; le modifier ne remplace pas les produits déjà enregistrés dans D1. Pour la boutique statique sans D1, modifier ce fichier directement sur GitHub.

- `price` : prix en DH du décant 10 ml, ou du flacon pour `type: "full"`.
- `fullPrice` : prix indicatif du flacon complet.
- Le décant 5 ml utilise actuellement `Math.round(price * 0.58)`, calcul modifiable dans `src/main.jsx`.
- `type` : `decant`, `full` ou `niche`.
- `gender` : `homme`, `femme` ou `mixte`.
- `image` : chemin dans `public`, par exemple `/products/1.jpg`.

Les prix actuels sont des estimations de lancement, pas des relevés vérifiés du marché. Confirmer ou remplacer prix, contenances et disponibilité avant lancement commercial. Les images fournies incluent parfois un flacon original et un décant ; la variante sélectionnée fait foi. Les fiches flacons reprennent ces visuels.

## Commandes WhatsApp

Destination : **+39 350 907 1813**, configurable en remplaçant `393509071813` dans `src/main.jsx`.

Le client remplit nom, téléphone, ville et adresse. Le site ouvre WhatsApp avec le récapitulatif et le sous-total. **Le client doit envoyer le message**, puis le vendeur confirme prix, frais de livraison et disponibilité. Il n’y a ni paiement en ligne ni transmission automatique silencieuse. Avec D1 activé, une demande contenant les coordonnées et le panier est enregistrée côté serveur avant l’ouverture de WhatsApp. Le panier reste aussi conservé dans le navigateur. Sans D1 (mode statique), seul le message WhatsApp est préparé et aucun suivi serveur n’est disponible.

## Validation

```sh
npm run build
npm run preview -- --port 4173
```

Les cinq catégories ont des produits issus des photos fournies. Logo transparent retouché à partir de la référence. Les polices Google ont des alternatives système si le service est indisponible.

## Présentation de la boutique

Interface crème et or inspirée des captures de référence fournies : logo centré, menu latéral, sections par catégorie et trois cartes produit par ligne sur ordinateur. Deux cartes par ligne sur mobile. Chaque carte propose le format et un ajout direct au panier. Le panier latéral regroupe les articles, les quantités et le formulaire de livraison (Casablanca ou autre ville). Les frais de livraison restent à confirmer sur WhatsApp ; aucun tarif du site de référence n’est appliqué automatiquement.

Les descriptions sont dans `src/main.jsx`, les prix et les images du catalogue dans `public/catalog.json`. Le visuel de campagne `public/hero-perfume.png` a été retouché à partir d’une photo produit fournie ; les fiches conservent les photos originales du catalogue.

## Administration et tickets

Voir **[ADMIN_SETUP.md](ADMIN_SETUP.md)** pour activer D1 et les secrets dans Cloudflare, se connecter à `/admin`, gérer les produits/commandes/clients et imprimer les tickets A6. Instagram est configuré sur [@elabbari10](https://www.instagram.com/elabbari10/).
