# DecanteAssil

Boutique de parfums React + Vite, responsive, avec catalogue, filtres, recherche, formats, panier persistant et demande de commande sur WhatsApp.

## Développement

Node.js 22 ou 24 et npm.

```sh
npm ci
npm run dev -- --port 5173
```

## Cloudflare Pages

Connecter ce dépôt GitHub à **Cloudflare Pages** (Workers & Pages → Create → Pages → Import an existing Git repository).

- Branche de production : `main`
- Framework : Vite
- Commande de build : `npm run build`
- Dossier de sortie : `dist`
- Dossier racine : racine du dépôt
- Variable de build : `NODE_VERSION=24`

Aucun backend, base de données ou secret n’est nécessaire. Ne pas ajouter de commande de déploiement Workers à ce projet Pages. Cloudflare republie le site après chaque push sur `main`.

## Cloudflare Workers (configuration actuelle)

Le dépôt inclut `wrangler.jsonc` pour servir le site statique sur Workers.

Dans Settings → Build :

- Build command : `npm run build`
- Deploy command : `npx wrangler deploy --assets ./dist` (ou `npx wrangler deploy`)
- Branche : `main`

La date de compatibilité et le dossier `dist` sont déclarés dans le dépôt. Le lien `workers.dev` est activé par la configuration. Après le push, suivre le nouveau build dans Deployments ; un ancien build échoué conserve ses anciens fichiers.

## Modifier les produits et prix

Modifier `public/catalog.json` directement sur GitHub (crayon → enregistrer le commit).

- `price` : prix en DH du décant 10 ml, ou du flacon pour `type: "full"`.
- `fullPrice` : prix indicatif du flacon complet.
- Le décant 5 ml utilise actuellement `Math.round(price * 0.58)`, calcul modifiable dans `src/main.jsx`.
- `type` : `decant`, `full` ou `niche`.
- `gender` : `homme`, `femme` ou `mixte`.
- `image` : chemin dans `public`, par exemple `/products/1.jpg`.

Les prix actuels sont des estimations de lancement, pas des relevés vérifiés du marché. Confirmer ou remplacer prix, contenances et disponibilité avant lancement commercial. Les images fournies incluent parfois un flacon original et un décant ; la variante sélectionnée fait foi. Les fiches flacons reprennent ces visuels.

## Commandes WhatsApp

Destination : **+39 350 907 1813**, configurable en remplaçant `393509071813` dans `src/main.jsx`.

Le client remplit nom, téléphone, ville et adresse. Le site ouvre WhatsApp avec le récapitulatif et le sous-total. **Le client doit envoyer le message**, puis le vendeur confirme prix, frais de livraison et disponibilité. Il n’y a ni paiement en ligne ni transmission automatique silencieuse. Les coordonnées ne sont pas stockées côté serveur ; le panier est conservé uniquement dans le navigateur.

## Validation

```sh
npm run build
npm run preview -- --port 4173
```

Les cinq catégories ont des produits issus des photos fournies. Logo transparent retouché à partir de la référence. Les polices Google ont des alternatives système si le service est indisponible.
