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
│   └── Jimp v1       → crop/blit/buffer (browser-compatible, fs retiré)
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
| `fs.readFile` dans `jimpProxy.js` | Supprimé — buffer passé directement depuis pdfjs |
| `res.sendFile` | `URL.createObjectURL` |
| `multer` upload | `FileReader` / `File API` |
| `socket.io` progress | `Worker.postMessage` progress |

### Ce qui est réutilisé tel quel

- `pdf-lib` — compatible browser sans modification
- `Jimp v1` — compatible browser, seul `fs.readFileSync` à retirer de `jimpProxy.js` (~2 lignes). Toutes les opérations crop/blit/getBuffer restent identiques.
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

Valorisation retenue : **350€/jour**. Zéro coût infra récurrent (Cloudflare Pages).

Référence : v1→v2 fonctionnelle réalisée en 26h avec Claude Code sur ce même projet.

| Scénario | Durée | Coût (350€/j) | Ventes pour récupérer |
| -------- | ----- | ------------- | --------------------- |
| Prudent (tests rendu inclus) | 5 jours | 1 750€ | **84 ventes** |
| Réaliste | 3-4 jours | 1 050-1 400€ | **50-67 ventes** |

Le seul imprévu non compressible : **qualité du rendu pdfjs-dist sur vraies partitions**. Tâche humaine — vérifier sur des scores IMSLP réels, ajuster densité/résolution si besoin.

### Projection 12 mois (350€/j, 4 jours → 1 400€ dev)

| Mois | Ventes cumulées | Revenu net cumulé | Vs coût dev 1 400€ |
| ---- | --------------- | ----------------- | ------------------ |
| 1 | 20 (beta 15€) | ~260€ | -1 140€ |
| 2-3 | +30 (25€) | +630€ → 890€ | -510€ |
| 4 | +25 (25€) | +525€ → 1 415€ | **rentable mois 4** |

Scénario optimiste : **rentable en 6 semaines**.

---

## Avantages vs modèles 01 et 02

- **Zéro infra** — pas de VPS, pas de BDD, pas de monitoring
- **Pas d'installation** — l'utilisateur ouvre une URL, c'est prêt
- **Offline natif** — Service Worker met l'app en cache
- **Multiplateforme immédiat** — Windows, Mac, Linux, iPad sans repackager
- **Pas de Mac Gatekeeper** — aucun binaire à signer
- **Même modèle commercial que 01** — Lemon Squeezy + RSA, code quasi identique

## Inconvénients

- **Performances** — pdfjs-dist plus lent que GM+GS natif, mais acceptable : le traitement se fait en Web Worker (UI reste réactive) et le cas d'usage est une tâche planifiée, pas interactive. L'utilisateur lance et attend — comme il le ferait avec n'importe quel outil de traitement lourd.
- **Stockage limité** — IndexedDB limité par le navigateur (~1-5 GB selon OS/browser)
- **Pas de sync cross-device** — l'utilisateur ne retrouve pas ses zones sur un autre ordinateur
- **Réécriture du pipeline** — `pdfToImages` et toutes les routes Express à supprimer/réécrire

---

## Prérequis machine utilisateur

La contrainte principale n'est pas le CPU ni la RAM — c'est le **navigateur**. pdfjs-dist, Jimp v1 et Service Workers requièrent des APIs modernes absentes des browsers anciens.

### Compatibilité OS / browser

| OS | Browser | Verdict |
| -- | ------- | ------- |
| Windows XP | Chrome 49 max (arrêt support 2016) | ❌ incompatible — ESM et APIs modernes absentes |
| Windows 7 | Chrome / Edge récent | ✅ fonctionne — lent mais viable |
| Windows 8.1+ | Chrome / Edge / Firefox | ✅ correct |
| Windows 10+ | Tout navigateur moderne | ✅ |
| macOS 10.13+ | Safari / Chrome / Firefox | ✅ |
| iPad (iOS 14+) | Safari | ✅ |

**Minimum réel : Windows 7 + Chrome récent.** XP bloqué non par le CPU mais par l'absence d'ESM et Service Workers dans Chrome 49. Dans le parc musical en 2025, XP est quasi inexistant — Win7 encore présent dans quelques conservatoires anciens.

### RAM et CPU

| Spec | Minimum | Confortable |
| ---- | ------- | ----------- |
| RAM | 4 GB | 8 GB |
| CPU | Core 2 Duo Win7 era | i5 2018+ |
| Pic mémoire (une page à la fois) | ~200-250 MB | — |

### Temps de traitement estimé par page

| Machine | Temps/page | Score 50 pages |
| ------- | ---------- | -------------- |
| M1 / i7 récent | 0.3-0.8s | ~20s |
| i5 2018 | 0.8-1.5s | ~50s |
| i5 2014 | 2-4s | ~2 min |
| Core 2 Duo / Win7 era | 15-30s | ~15-25 min |

La lenteur sur vieilles machines est acceptable : le Web Worker isole le traitement (UI toujours réactive), et le cas d'usage est une tâche planifiée — l'utilisateur lance et attend. Un utilisateur habitué à une machine lente est habitué à attendre. Une barre de progression suffit.

---

## Effort d'implémentation

### Tâches et estimations

| Tâche | Existe | Effort | Bloque |
| ----- | ------ | ------ | ------ |
| Réécriture `pdfToImages` avec pdfjs-dist en Web Worker | ❌ | 3-4 jours | tout |
| Retrait `fs` de `jimpProxy.js` (2 lignes) + passage buffer direct | ❌ | 0.5 jour | image |
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
| Estimation classique | ~13-15 jours |
| **Réaliste avec Claude Code** | **3-5 jours** |

Référence terrain : v1→v2 fonctionnelle réalisée en 26h avec Claude Code sur ce projet. Les tâches de migration PWA sont du même ordre (systématiques, bien définies). Seuls les tests qualité rendu pdfjs-dist sur vraies partitions ne sont pas compressibles.

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
