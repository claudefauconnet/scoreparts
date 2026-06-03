# 01 — Logiciel Desktop

## Concept

Application Electron distribuée en achat unique. L'utilisateur installe le logiciel, bénéficie d'un essai gratuit, puis achète une licence pour déverrouiller l'accès complet. Tout le traitement se fait localement — aucun serveur requis à l'usage.

---

## Modèles de licence

| Modèle | Prix | Récurrence | Recommandé |
|--------|------|-----------|-----------|
| Achat unique perpétuel | 20-35€ | Aucune | ✅ Pour démarrer |
| Achat + mises à jour majeures payantes | 25€ + 10€/version | Faible | À envisager après v2 |
| Licence annuelle | 15-20€/an | Annuelle | Si fonctionnalités cloud ajoutées |

---

## Free trial

**Recommandé : watermark sur les exports**

- Les 3 premiers exports sont gratuits, avec tampon "ScoreParts Trial" sur les PDF
- L'utilisateur voit la valeur immédiatement, le fichier est inutilisable professionnellement
- Pas de limite de temps (évite la frustration, encourage l'achat quand besoin)
- Implémentation : ~1 jour

Alternatives : compteur d'exports (5 gratuits), fonctionnalités limitées (pas de batch).

---

## Système de licences

### Architecture

```
Votre machine         Lemon Squeezy          App Electron (chez l'acheteur)
─────────────         ─────────────          ──────────────────────────────
Script génère    →    Webhook reçoit    →    Clé entrée par l'utilisateur
clé signée RSA        envoie clé email       App vérifie signature RSA locale
                                             electron-store sauvegarde état
```

### Sécurité

- Clé = payload JSON (email + date) signé RSA avec votre clé privée
- App embarque la clé publique, vérifie la signature mathématiquement
- Validation **100% offline** — pas de serveur nécessaire
- Impossible de fabriquer une clé sans la clé privée

### Volume de code

- Script de génération : ~50 lignes (tourne côté vendeur, via webhook)
- Validation dans l'app : ~30 lignes
- UI paywall + saisie clé : ~1 jour

---

## Distribution

**Plateforme recommandée : Lemon Squeezy**

- Merchant of Record → gère TVA mondiale automatiquement
- Génération de clés + email de livraison automatique
- Commission : 5% + $0.50 par vente
- Sur 25€ → vous recevez ~21€ net

Sur 25€ vendu, rentabilité dès la **première vente** (zéro coût d'infrastructure à l'usage).

---

## Packaging Electron

### Option A — Embarquer GM + GS (conserver le code actuel)

Binaires GraphicsMagick + Ghostscript embarqués dans `resources/bin/<plateforme>/`.

```
resources/
  bin/
    win32/   gm.exe, gswin64c.exe, gsdll64.dll
    darwin/  gm, gs
    linux/   gm, gs
```

- Effort : 4-6 jours
- Taille app : ~300-400 MB
- Complexité : Mac Gatekeeper (certificat Apple 99$/an recommandé)

### Option B — Remplacer GM/GS par pdfjs-dist (stack 100% JS)

Réécriture de `pdfToImages` dans `bin/scoreSplitter..js` (~80 lignes).

- Effort : 3-5 jours (inclut tests qualité rendu)
- Taille app : ~120-150 MB
- Complexité : packaging Electron standard, aucune dépendance native

**Recommandation : Option B** — moins de complexité, meilleure maintenabilité.

---

## Coûts et revenus

### Coûts fixes

| Poste | Coût |
|-------|------|
| Site de présentation + page vente | ~5-10€/mois (ou GitHub Pages gratuit) |
| Certificat Apple Developer (Mac) | 99$/an (~8€/mois) |
| Certificat Windows (optionnel) | 200-400€/an |
| Lemon Squeezy | 0€ fixe |
| **Total minimal** | **~5-10€/mois** |

### Projection revenus (25€/licence)

| Ventes/mois | Revenu brut | Net après commission | Bénéfice |
|-------------|-------------|---------------------|----------|
| 5 | 125€ | 110€ | ~100€ |
| 20 | 500€ | 440€ | ~430€ |
| 50 | 1 250€ | 1 100€ | ~1 090€ |
| 100 | 2 500€ | 2 200€ | ~2 190€ |

---

## Politique tarifaire

### Grille de prix

| Segment | Prix | Justification |
| ------- | ---- | ------------- |
| **Lancement beta** | 15€ | Réduction 40% pour les 50 premiers — crée urgence, génère avis |
| **Standard** | 25€ | Prix cible permanent — accessible, non-négligeable |
| **Pro** (batch, résolutions multiples) | 35€ | Pour utilisateurs intensifs, orchestres, bibliothécaires |
| **Institutionnel** (multi-postes) | 150€/an | Site illimité, facturation annuelle, support email |

### Principes

- **Pas de prix ronds.** 25€ bat 20€ en valeur perçue dans le logiciel de niche.
- **Pas de remise permanente.** La beta à 15€ est temporaire et communiquée comme telle.
- **Annuel uniquement pour l'institutionnel.** Évite la confusion avec un abonnement SaaS pour le grand public.
- **Pas de "contact us" pour les prix.** Tout affiché publiquement, friction zéro.

### Évolution tarifaire

```text
Lancement          →   Beta 15€ (50 licences)
Mois 3             →   Standard 25€ permanent
Après v2 majeure   →   25€ nouveaux acheteurs / 10€ upgrade pour existants
Institutionnel     →   Dès les premières demandes constatées
```

---

## Rentabilité

### Coûts fixes mensuels

| Poste | Coût/mois |
| ----- | --------- |
| Site de présentation (GitHub Pages) | 0€ |
| Certificat Apple Developer | ~8€ |
| Certificat Windows (optionnel) | ~17€ |
| Lemon Squeezy | 0€ |
| **Total minimal (Mac uniquement)** | **~8€/mois** |
| **Total complet (Mac + Windows)** | **~25€/mois** |

### Seuil de rentabilité

Au prix standard 25€ → net reçu ~21€ après commission Lemon Squeezy.

| Scénario coûts | Ventes/mois nécessaires | Commentaire |
| -------------- | ----------------------- | ----------- |
| Mac seulement (8€/mois) | **1 vente** | Rentable dès le premier acheteur |
| Mac + Windows (25€/mois) | **2 ventes** | Toujours trivial |

### Récupération du coût de développement

En estimant ~3 semaines de développement pour le MVP Electron + système de licences :

| Valorisation journée | Coût dev estimé | Ventes pour récupérer |
| -------------------- | --------------- | --------------------- |
| 200€/jour | ~3 000€ | **143 ventes** |
| 350€/jour | ~5 250€ | **250 ventes** |
| 500€/jour | ~7 500€ | **357 ventes** |

Avec une audience de niche ciblée (conservatoires, réseaux de chefs d'orchestre, forums de musique de chambre), 150-300 ventes sur 12 mois est un objectif réaliste si le produit répond à un vrai besoin.

### Projection sur 12 mois (scenario prudent)

| Mois | Ventes cumulées | Revenu net cumulé | Bénéfice net (après dev 3 500€) |
| ---- | --------------- | ----------------- | ------------------------------- |
| 1-2 | 30 (beta 15€) | ~390€ | -3 110€ |
| 3-6 | +40 (25€) | +840€ → 1 230€ | -2 270€ |
| 7-9 | +40 (25€) | +840€ → 2 070€ | -1 430€ |
| 10-12 | +40 (25€) | +840€ → 2 910€ | **-590€ → rentable mois 13** |

Scenario optimiste (bouche-à-oreille + un article dans une newsletter musique) : rentable dès le mois 8.

---

## Effort d'implémentation

### Tâches et estimations

| Tâche | Effort | Bloque |
| ----- | ------ | ------ |
| Setup projet Electron (main + BrowserWindow + Express local) | 2 jours | tout |
| **Option A** — Sourcer binaires GM+GS par plateforme + bundling `resources/bin/` | 3-4 jours | traitement |
| **Option B** — Réécriture `pdfToImages` avec pdfjs-dist | 3-5 jours | traitement |
| Résolution chemins runtime (`app.isPackaged`, `process.resourcesPath`) | 1 jour | traitement |
| Système de licence : génération RSA (script vendeur) | 1 jour | paywall |
| Système de licence : validation dans l'app + `electron-store` | 1 jour | paywall |
| UI paywall + saisie clé + watermark trial | 1-2 jours | paywall |
| Webhook Lemon Squeezy → génération + envoi clé | 1 jour | vente |
| Setup electron-builder (packaging .exe, .dmg, .AppImage) | 1-2 jours | distribution |
| Signature Mac (Gatekeeper) + notarisation | 1-2 jours | distribution Mac |
| Tests multiplateforme Windows + Mac + Linux | 2-3 jours | lancement |
| Page de vente (Lemon Squeezy hosted ou site simple) | 1-2 jours | lancement |

### Total par option

| Scénario | Effort total |
| -------- | ------------ |
| Option A (GM+GS bundlés) | **~18-24 jours** |
| Option B (pdfjs-dist, recommandé) | **~15-20 jours** |

### Chemin critique

```text
Electron setup → Option A ou B → Runtime paths → Tests → Packaging
                                                         ↓
                    Licence RSA → Webhook LS → UI paywall
```

### Roadmap de lancement

| Semaine | Livrable |
| ------- | -------- |
| 1-2 | Electron fonctionnel, traitement PDF opérationnel en local |
| 3 | Licence RSA + paywall + watermark |
| 4 | Webhook Lemon Squeezy + test achat end-to-end |
| 5 | Packaging multiplateforme + tests |
| **6** | **Lancement beta 15€ — 50 premiers acheteurs** |
