# Activer l’administration sur Cloudflare

Le chemin de connexion est **`/admin`** sur le même domaine que la boutique. Le code de l’administration et du stockage est fourni ; une validation locale n’active pas les secrets de production.

## 1. Déploiement et D1

Le projet utilise désormais un Worker avec stockage **Cloudflare D1**, et non un hébergement purement statique.

Conserver les commandes du projet Cloudflare Workers :

- Build : `npm run build`
- Deploy : `npx wrangler deploy --assets ./dist`
- Branche : `main`

`wrangler.jsonc` contient le binding `DB` pour la base `decanteassil-store`. Wrangler 4.153.0, installé par le projet, peut créer/résoudre cette base au déploiement. La création et les accès D1 exigent les permissions D1 du jeton de build Cloudflare. La création n’est pas vérifiée depuis l’environnement de développement, qui n’a pas accès à votre compte Cloudflare.

Si le build échoue sur la création ou la recherche D1 :

1. Dans Cloudflare → Storage & databases → D1, créer `decanteassil-store`.
2. Copier son **Database ID** (identifiant non secret) et l’ajouter dans `wrangler.jsonc` à l’entrée D1 : `"database_id": "votre-identifiant"`.
3. Donner au jeton utilisé par le build l’accès D1 nécessaire, puis redéployer le dernier commit.

Après le déploiement, vérifier dans Workers & Pages → decanteassil → Bindings que `DB` pointe vers la base prévue. Le schéma et les produits initiaux sont créés au premier accès API. Il n’y a pas de script SQL à copier. Les redéploiements ne remplacent pas les produits modifiés dans l’administration. Ne pas supprimer cette base pour redéployer le site.

## 2. Secrets administrateur

Dans Workers & Pages → decanteassil → Settings → Variables and Secrets, ajouter deux entrées de type **Secret**, puis enregistrer/déployer ces paramètres :

| Nom | Valeur à choisir dans Cloudflare |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe privé de 12 caractères minimum ; privilégier un mot de passe long et unique. |
| `SESSION_SECRET` | Chaîne aléatoire privée de 32 caractères minimum, distincte du mot de passe. |

**Ne jamais mettre les valeurs dans GitHub, les variables Vite, le code frontend ou le chat.** Aucun mot de passe de démonstration n’est livré en production. Les identifiants temporaires utilisés pour les tests locaux ne sont ni publiés ni réutilisés pour le site.

Sans ces paramètres, la page de connexion indique que la configuration manque. Les API privées refusent l’accès. La boutique peut continuer à enregistrer les demandes dès que D1 est lié, indépendamment de la configuration du mot de passe.

## 3. Vérification sur le site publié

1. Ouvrir `/admin` et se connecter avec le mot de passe choisi.
2. Ouvrir la boutique, ajouter un parfum et saisir des coordonnées de test.
3. Cliquer « Commander sur WhatsApp ». Une demande est enregistrée dans D1 avant l’ouverture du message. Le lien de réouverture reste disponible si le navigateur bloque la fenêtre WhatsApp.
4. Dans l’administration, cliquer sur Actualiser, puis Commandes & tickets. Retrouver le client et la référence `DA-…`.
5. Cliquer **Ticket → Imprimer**. Sélectionner une imprimante ou Enregistrer au format PDF. Le format prévu est **105 × 148 mm (A6)** ; choisir une échelle de 100 % et désactiver les en-têtes/pieds de page du navigateur. Une commande très longue peut nécessiter plusieurs feuilles.
6. Changer le statut quand la commande est confirmée, expédiée ou livrée. Le montant « livré » est calculé uniquement sur les commandes marquées Livré, hors livraison.

Les tickets contiennent nom, téléphone, ville, adresse, référence, date, produits, formats, quantités et montant des produits. Ils n’attestent pas le paiement. Pour les nouvelles demandes, les frais sont fixés à 20 DH à Casablanca et 35 DH dans les autres villes. Le ticket et le montant enregistré incluent la livraison. Les anciennes demandes conservent leur montant historique ; les frais non enregistrés ne sont pas ajoutés rétroactivement.

## Gestion quotidienne

- **Produits** : ajouter, modifier, masquer, rendre indisponible ou supprimer un parfum. Modifier les prix et descriptions. Importer une image JPG/PNG/WebP de 512 Ko maximum, ou utiliser une URL HTTPS. Les images importées sont stockées dans D1 ; les photos initiales sont conservées dans les assets.
- **Commandes & tickets** : recherche, filtres, statut, détails, ticket imprimable et export CSV.
- **Clients** : coordonnées et historique agrégés par téléphone.
- **Paramètres** : liens Instagram et WhatsApp.
- **Sécurité** : accès vérifié par le serveur, cookie HttpOnly/SameSite, expiration après 8 heures, limitation des tentatives de connexion et vérification de l’origine. Modifier le mot de passe ou la clé de session invalide les sessions existantes.

La vue et l’export portent sur les **1 000 dernières demandes**. Les anciens échanges WhatsApp ne sont pas importés. Le site ne sait pas si le message WhatsApp a réellement été envoyé ni si un paiement a été reçu. Les doubles clics et les relances d’une même demande utilisent une référence d’idempotence pour éviter la création de doublons.

Les commandes enregistrées gardent une copie des produits et prix au moment de la demande ; modifier ou supprimer un produit n’altère pas les anciens tickets.

## Développement et tests

```sh
npm ci
npm test
```

`npm test` construit l’application puis lance des tests API contre un Worker et une base D1 **locaux isolés**. Les secrets sont générés temporairement, ne sont jamais affichés et les fichiers temporaires sont supprimés. Aucun compte Cloudflare ni secret de production n’est nécessaire.

Pour développer le parcours complet : préparer localement un `.dev.vars` ignoré par Git avec des secrets de développement propres, puis lancer `npm run dev:worker`. L’application et l’API sont servies ensemble sur le port 8787. Les données locales restent dans `.wrangler/state`. `npm run dev` sert uniquement le frontend Vite ; son fallback statique conserve le parcours WhatsApp sans suivi D1.

Les tests navigateur effectués pendant l’implémentation couvrent aussi le parcours boutique → D1 → message WhatsApp, les formulaires de gestion, les statuts, la prévisualisation du ticket, l’impression PDF et l’affichage mobile.
