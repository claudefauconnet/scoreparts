# 03 — PWA Client-Side

## Concept

Application web progressive (PWA) sans serveur de traitement. Tout le pipeline PDF tourne dans le navigateur via Web Workers. Les données sont stockées localement dans IndexedDB. Le modèle commercial est identique au logiciel desktop (01) — achat unique via Lemon Squeezy, licence RSA — mais sans Electron ni installation.

---

## Comparaison avec les autres modèles

| Critère | 01 Desktop | 02 SaaS | **03 PWA** |
| ------- | ---------- | ------- | ---------- |
| Installation | Exe/dmg | Aucune | Optionnelle (PWA installable) |
| Traitement | Local (Node) | Serveur | Local (Web Workers) |
| Stockage données | Filesystem | Cloud | IndexedDB |
| Coût infra | ~8-25€/mois | ~4-35€/mois | **~0€/mois** |
| Cross-device sync | ❌ | ✅ | ❌ (sauf export manuel) |
| Offline | ✅ | ❌ | ✅ (Service Worker) |
| Effort dev vs actuel | Moyen | Élevé | **Moyen** |

---

## Architecture technique

```text
Browser
├── UI (HTML/CSS/JS — réutilise frontend existant)
├── Main thread       → routing, UI, licence check
├── Web Worker        → traitement PDF lourd (non-bloquant)
│   ├── pdfjs-dist    → PDF → images (remplace GM+GS)
│   ├── pdf-lib       → déjà compatible browser
│   └── Canvas API    → manipulation image
└── IndexedDB
    ├── scores/       → PDFs uploadés (ArrayBuffer)
    ├── zones/        → définitions de zones (JSON)
    └── parts/        → parties générées (Blob)
```

### Ce qui disparaît

- Express, Node.js, toutes les routes API
- GraphicsMagick + Ghostscript
- Tout code serveur

### Ce qui change

| Actuel (Node) | PWA (Browser) |
| ------------- | ------------- |
| `gm convert` | `pdfjs-dist` rendu canvas |
| `fs.readFile` | `IndexedDB.get` |
| `res.sendFile` | `URL.createObjectURL` |
| `multer` upload | `FileReader` / `File API` |
| `socket.io` progress | `Worker.postMessage` progress |

### Ce qui est réutilisé tel quel

- `pdf-lib` — compatible browser sans modification
- Logique de détection de zones — pure JS, portable
- Frontend jQuery existant — adaptations mineures

---

## Politique tarifaire

Identique au modèle 01 — voir [01-logiciel-desktop.md](./01-logiciel-desktop.md#politique-tarifaire).

| Segment | Prix |
| ------- | ---- |
| Lancement beta | 15€ |
| Standard | 25€ |
| Pro (batch, multi-résolution) | 35€ |
| Institutionnel | 150€/an |

**Free trial : watermark** sur les 3 premiers exports. Pas de compte requis. Pas de limite de temps.

### Quota et contournement

Le quota est enforced côté client (IndexedDB). Contournable en vidant le stockage. Réponse : idem Sublime Text — les utilisateurs honnêtes paient, les autres ne seraient pas des clients de toute façon. Pour une audience de musiciens professionnels, le taux de contournement est négligeable.

---

## Rentabilité

### Coûts fixes mensuels

| Poste | Coût |
| ----- | ---- |
| Cloudflare Pages (hosting statique) | 0€ |
| Lemon Squeezy | 0€ fixe |
| Certificat Apple (si PWA packagée en App Store) | ~8€/mois |
| **Total minimal** | **0€/mois** |

Zéro coût d'infrastructure récurrent. Rentable dès la première vente.

### Seuil de rentabilité

Identique au modèle 01 mais **sans les 8-25€/mois de certificats** si on reste web pur :

| Net par vente (25€) | Coût fixe | Ventes pour couvrir dev (8 000€) |
| ------------------- | --------- | -------------------------------- |
| ~21€ | 0€ | **381 ventes** |

### Projection 12 mois (scénario prudent)

| Mois | Ventes cumulées | Revenu net cumulé | Vs coût dev 8 000€ |
| ---- | --------------- | ----------------- | ------------------ |
| 1-2 | 30 (beta 15€) | ~390€ | -7 610€ |
| 3-6 | +50 (25€) | +1 050€ → 1 440€ | -6 560€ |
| 7-12 | +100 (25€) | +2 100€ → 3 540€ | -4 460€ |

Rentabilité complète autour du mois 20 en scénario prudent, mois 12 en scénario optimiste (article dans une newsletter musique, recommandations IMSLP community).

---

## Avantages vs modèles 01 et 02

- **Zéro infra** — pas de VPS, pas de BDD, pas de monitoring
- **Pas d'installation** — l'utilisateur ouvre une URL, c'est prêt
- **Offline natif** — Service Worker met l'app en cache
- **Multiplateforme immédiat** — Windows, Mac, Linux, iPad sans repackager
- **Pas de Mac Gatekeeper** — aucun binaire à signer
- **Même modèle commercial que 01** — Lemon Squeezy + RSA, code quasi identique

## Inconvénients

- **Performances** — pdfjs-dist moins rapide que GM+GS natif pour les grosses partitions
- **Stockage limité** — IndexedDB limité par le navigateur (~1-5 GB selon OS/browser)
- **Pas de sync cross-device** — l'utilisateur ne retrouve pas ses zones sur un autre ordinateur
- **Réécriture du pipeline** — `pdfToImages` et toutes les routes Express à supprimer/réécrire

---

## Effort d'implémentation

### Tâches et estimations

| Tâche | Existe | Effort | Bloque |
| ----- | ------ | ------ | ------ |
| Réécriture `pdfToImages` avec pdfjs-dist en Web Worker | ❌ | 3-4 jours | tout |
| Remplacement routes Express / `fs` par IndexedDB | ❌ | 3-4 jours | stockage |
| Adaptation frontend (suppression appels API Express) | ❌ | 2-3 jours | UX |
| Watermark sur exports trial | ❌ | 1 jour | freemium |
| Système de licence RSA — génération (script vendeur) | ❌ | 1 jour | paywall |
| Système de licence RSA — validation dans le browser | ❌ | 1 jour | paywall |
| UI paywall + saisie clé | ❌ | 1 jour | paywall |
| Webhook Lemon Squeezy → génération + envoi clé | ❌ | 1 jour | vente |
| `manifest.json` + Service Worker offline | ❌ | 1 jour | PWA |
| Tests qualité rendu pdfjs-dist sur vraies partitions | ❌ | 2 jours | lancement |
| Déploiement Cloudflare Pages | ❌ | 0.5 jour | lancement |

### Total

| Scénario | Effort total |
| -------- | ------------ |
| Sans réutilisation modèle 01 | **~16-19 jours** |
| Avec réutilisation licence RSA depuis 01 | **~13-15 jours** |

### Chemin critique

```text
pdfjs-dist Web Worker → IndexedDB → Frontend adapté → Trial watermark
                                                              ↓
                               Licence RSA → Webhook LS → UI paywall → Deploy CF Pages
```

### Roadmap de lancement

| Semaine | Livrable |
| ------- | -------- |
| 1-2 | Pipeline PDF en Web Worker fonctionnel, IndexedDB en place |
| 3 | Frontend adapté, trial watermark |
| 3-4 | Licence RSA + paywall + webhook Lemon Squeezy |
| 4 | Service Worker offline + manifest PWA |
| **5** | **Lancement beta 15€ sur Cloudflare Pages** |

---

## Quand choisir ce modèle plutôt que 01 (Desktop)

- Si vous ne voulez pas gérer le packaging Electron multiplateforme
- Si votre audience est à l'aise avec les outils web (jeunes musiciens, étudiants)
- Si la portabilité (iPad, Linux) est importante
- Si vous voulez zéro friction à l'essai (pas d'installation)

Le modèle 01 reste préférable si votre cible principale est des institutions ou des professionnels habitués aux logiciels desktop installés.
