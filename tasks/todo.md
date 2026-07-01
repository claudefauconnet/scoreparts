# Restructuration du panneau gauche

## Tâches

- [x] Fixer la progression en bas du panneau
- [x] Déplacer le téléchargement de la barre haute au-dessus de la progression
- [x] Cloisonner les voix dans une zone à défilement
- [x] Vérifier la structure, le formatage et le diff
- [x] Réallouer l’espace libéré de la header bar au titre et aux mouvements
- [x] Réduire la hauteur du téléchargement et de la progression
- [x] Préserver l’accès aux voix sur les écrans courts
- [x] Ramener la progression à la hauteur du téléchargement
- [x] Compacter les lignes de voix actives et inactives

## Review

Le téléchargement quitte la barre haute et rejoint le pied fixe du panneau,
directement au-dessus de la progression. Son menu s’ouvre vers le haut.

Les voix conservent leur design initial : en-tête et bouton d’ajout restent visibles,
seule la liste centrale défile quand elle devient trop longue.

Téléchargement et progression sont placés avant les paramètres.

Vérification :

- serveur local : HTTP 200 ;
- Prettier ciblé : OK ;
- chargement unique des hosts et IDs : OK ;
- `git diff --check` : OK ;
- vérification visuelle non exécutée : navigateur intégré indisponible.

---

# Migration backend → IndexedDB (full client-side)

But : supprimer tout le backend de traitement/stockage. Le stockage passe en IndexedDB
(objets/Blobs structurés, jamais de JSON sérialisé). Express ne sert plus que les
fichiers statiques de la PWA.

## Schéma IndexedDB (DB `scoreparts`, v1)

- `scores` (key `pdfName`) → infos partition (objet)
- `zones` (key `pdfName`) → `{ pdfName, allPagesZones }` (objet, pas string)
- `pdfs` (key `pdfName`) → `{ pdfName, blob }` PDF source
- `pages` (key `[pdfName, page]`) → `{ pdfName, page, blob }` une image PNG/page

## Tâches

- [ ] Nouveau module `public-v2/common/localDb.js` (wrapper IndexedDB promise-based)
- [ ] Réécrire `public-v2/common/proxy.js` → mêmes signatures, backend = localDb
- [ ] `public-v2/common/localBackendProxy.js` → `fetchPageBuffer` lit IndexedDB
- [ ] `public-v2/common/scoreParts.js` → images via object URLs (Blob) au lieu de HTTP
- [ ] Réduire `app.js` à un serveur statique (public-v2) + fallback SPA
- [ ] Supprimer `api/` (toutes routes + swagger.js)
- [ ] Supprimer `bin/scoreSplitter..js`, `bin/fileUpload.js`, `bin/processResponse.js`
- [ ] Nettoyer `package.json` (deps backend mortes + entrée `bin`)
- [ ] Vérif : import PDF, dessin zones, navigation, reload, génération partie/zip, suppression
- [ ] Commit (sans push)

## Review

Fait. Backend de stockage entièrement remplacé par IndexedDB ; backend Express
réduit à un serveur statique.

Créé :

- `public-v2/common/localDb.js` — wrapper IndexedDB promise-based. Stores `scores`,
  `zones`, `pdfs`, `pages` (clé composite `[pdfName, page]`). Objets/Blobs structurés,
  aucun JSON sérialisé. Suppression d'une partition = purge des 4 stores (pages via
  range sur clé composite).

Modifié :

- `proxy.js` — mêmes signatures (callback err-first), backend = localDb. Ajout de
  `toScoreName()` (source unique du nom canonique : ext retirée, espaces → `_`).
- `localBackendProxy.js` — `fetchPageBuffer` lit IndexedDB au lieu de `fetch` HTTP.
- `scoreParts.js` — images affichées via object URLs (Blob → `createObjectURL`),
  révoqués au remplacement. Plus de `imagesDir` HTTP.
- `import_pdf.js` — nom de la partition normalisé via `toScoreName` (corrige un
  désalignement latent : `selected.name` avec espaces vs clé stockée avec `_`).
- `app.js` — réduit à `express.static(public-v2)` + fallback SPA.
- `package.json` — deps backend mortes retirées (body-parser, multer, swagger, jade,
  morgan, cookie-parser, serve-favicon) + entrée `bin` supprimée.

Supprimé :

- `api/` (toutes les routes + swagger.js)
- `bin/scoreSplitter..js`, `bin/fileUpload.js`, `bin/processResponse.js`

Vérification :

- `node --check` OK sur tous les JS touchés.
- Serveur boote, sert `/`, les modules `/common/*` et le fallback SPA.
- Playwright : round-trip IndexedDB complet (put/get/merge objets, Blob pages,
  `getPageBuffer`, liste, suppression purge la range composite) → tout vert.
- Zéro erreur console au chargement de l'app.

Points d'attention :

- Le frontend v1 (`public/js/`) appelle encore `/api/*` mais n'est plus servi
  (app.js sert `public-v2`). Hors scope ; à retirer si v1 est abandonné.
- `node_modules` garde les deps retirées tant que `npm prune` n'est pas lancé.
- Données pré-existantes (`data/`, `public/data/`) ne sont plus utilisées (départ
  à zéro : l'utilisateur réimporte). Non supprimées du disque.

---

# Suppression des catégories de partitions

## Tâches

- [x] Retirer la catégorie de l’arbre et ignorer les valeurs historiques
- [x] Retirer catégorie et suggestions du formulaire d’import
- [x] Retirer la catégorie du flux de sauvegarde et du stockage IndexedDB
- [x] Migrer les enregistrements IndexedDB historiques
- [x] Vérifier syntaxe, format et occurrences restantes

## Review

Catégorie supprimée de la sélection, de l’import et des nouvelles écritures
IndexedDB. La bibliothèque est désormais groupée directement par compositeur.

La base passe en version 3 : chaque navigateur nettoie ses propres partitions lors
de sa prochaine ouverture. Les lectures et restaurations retirent également
`category`, afin qu’une ancienne valeur ne soit jamais prise en compte.

Suggestions d’auteurs supprimées : ni chips ni `datalist`.

Vérification :

- `node --check` OK sur les fichiers JavaScript concernés.
- `prettier --check` OK.
- `git diff --check` OK.
- Recherche globale : aucune utilisation fonctionnelle restante de `category`.
- Test navigateur non exécuté : aucune instance du navigateur intégré disponible.

---

# Ouverture rapide depuis le sélecteur

## Tâches

- [x] Centraliser l’ouverture via un événement du sélecteur
- [x] Ouvrir sur double-clic d’une partition
- [x] Ouvrir sur clic de la carte de prévisualisation
- [x] Vérifier syntaxe, format et diff

## Review

Le double-clic d’une ligne de partition et le clic sur `.sc-card` émettent
`open-selected-score`. Le module de dialogue reçoit cet événement et réutilise
`openScore`, comme le bouton d’ouverture existant.

Le double-clic provenant du bouton de suppression est ignoré. La carte affiche un
curseur interactif.

Vérification : `node --check`, Prettier et `git diff --check` réussis.
