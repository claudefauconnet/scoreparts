# 05 — Stockage et infrastructure

## Contexte

Le modèle PWA client-side (voir [03-pwa-client-side.md](./03-pwa-client-side.md)) fait
tourner tout le traitement PDF dans le navigateur. Reste une question : **où vivent les
données** (PDF source, images de pages, et surtout le découpage en zones), et quelle
infrastructure cela impose.

Objectif directeur : **0 € ou presque d'infra, même sur un produit qui scale.**

---

## Le stockage local : IndexedDB et ses risques

Le réflexe naturel est de tout stocker côté client dans **IndexedDB**, et de ne garder
aucun backend. Avantage : zéro coût, zéro serveur.

Problème de fiabilité : si l'utilisateur perd ses données locales, il perd son travail.

### Quand les données locales disparaissent

| Cause | IndexedDB survit ? |
| ----- | ------------------ |
| Purge automatique du navigateur (disque plein) | Non — sauf `navigator.storage.persist()` |
| « Effacer les données de navigation » (manuel) | Non, même avec `persist()` |
| Changement de navigateur (Chrome → Firefox) | Non — IndexedDB est silotée par navigateur |
| Changement d'ordinateur | Non |

Point clé : **IndexedDB est par navigateur et par appareil.** Aucune synchronisation
implicite. `persist()` protège des purges automatiques (quand l'espace disque manque)
mais **pas** d'une suppression manuelle explicite par l'utilisateur.

### Alternatives au stockage navigateur évaluées

- **`navigator.storage.persist()`** — fix rapide : le navigateur ne purge plus
  automatiquement. Reste vulnérable au « clear site data » manuel. Cross-browser.
- **File System Access API** — l'utilisateur choisit un vrai dossier local, l'app y
  lit/écrit. Survit à tout (purge, réinstallation). Défauts : Chrome/Edge uniquement
  (pas Firefox), re-demande la permission quasi à chaque session, plus complexe.
  Pertinent seulement pour un dossier « bibliothèque » visible dans l'explorateur —
  overkill pour du cache de partitions.

Aucune de ces options ne résout la **synchronisation cross-appareil** : pour cela il
faut nécessairement un stockage serveur lié à un compte.

---

## Hiérarchie de valeur des données

Toutes les données n'ont pas la même criticité. C'est ce qui débloque la décision.

| Donnée | Taille | Valeur | Si perdue |
| ------ | ------ | ------ | --------- |
| Zones (découpage) | ~5–50 Ko / partition | **Irremplaçable** | L'utilisateur refait tout son travail |
| PDF source | 5–50 Mo | Remplaçable | Ré-import |
| Images de pages (PNG) | ~25 Mo / partition | Remplaçable | Re-rendu automatique |

→ **Seules les zones méritent vraiment un filet de sécurité.** Le reste est régénérable.

Nuance : pour que le découpage reste valide après ré-import, l'utilisateur doit
retrouver **exactement le même PDF**. D'où l'intérêt de conserver aussi le PDF source
localement.

---

## L'infrastructure : que faut-il côté serveur ?

Constat important sur l'architecture actuelle : **tout le traitement lourd a déjà migré
côté client** (rendu pdfjs, détection de portées, génération des parties — dans des Web
Workers). GraphicsMagick + Ghostscript ont disparu. Le serveur ne faisait plus que du
**stockage de fichiers** (lire/écrire des JSON, servir des PNG).

### Conséquence sur le dimensionnement

Le CPU n'est plus le goulot d'étranglement. Un serveur de fichiers tient un volume
d'utilisateurs bien supérieur à ce que supposait l'estimation initiale (qui partait
d'un traitement GM+GS lourd par requête). Le vrai coût devient le **stockage disque** et
la **bande passante** (servir les PNG aux clients).

---

## Option Cloudflare

L'architecture (stockage de fichiers + service statique) correspond exactement à ce que
Cloudflare fait mieux qu'un VPS.

| Brique | Rôle |
| ------ | ---- |
| **Pages** | Hébergement statique de la PWA (gratuit) |
| **R2** | Object storage (PDF, PNG) — **egress à 0 €** (pas de coût bande passante) |
| **Workers** | Remplacent les routes API si besoin (coordination, pas transport) |
| **KV / D1** | Stockage structuré (clé/valeur ou SQLite edge) pour les zones |

Avantages : scalabilité automatique (pas de mur « 300 users → multi-VPS »), CDN global,
zéro ops, et surtout **egress gratuit** sur R2 — le point décisif quand on sert beaucoup
d'images.

### Limites des free tiers

Le goulot n'est pas le storage mais le **nombre d'écritures**.

| Ressource | Free tier | Goulot réel |
| --------- | --------- | ----------- |
| R2 storage | 10 Go | ~220–330 partitions stockées (≈30–45 Mo/partition) |
| R2 egress | gratuit (toujours) | — |
| KV writes | 1 000 / jour | **très contraignant** |
| D1 writes | 100 000 / jour | confortable |
| D1 storage | 5 Go | ~200 000 partitions de zones |

### Le piège des écritures

L'éditeur sauvegarde les zones **à chaque geste** (tracé, déplacement, redimensionnement).
Une session = facilement 100+ écritures. Avec KV (1 000 writes/jour) cela donne ~5
utilisateurs actifs/jour — inutilisable.

**Solution standard — deux couches :**

```text
Interaction → IndexedDB (immédiat, local, gratuit, illimité)
                │  debounce ~2 s  OU  bouton « sauvegarder »  OU  beforeunload
                ▼
              backup cloud (1 écriture par pause d'édition, pas par geste)
```

IndexedDB reste la vérité locale écrite à chaque geste ; le cloud ne reçoit qu'une
écriture par pause. On passe de 100+ à ~5–10 écritures cloud par session.

Avec ce schéma :

| Backend zones | DAU gratuit (avec debounce) |
| ------------- | --------------------------- |
| Cloudflare KV | ~100 |
| Cloudflare D1 | ~5 000 |

(DAU = Daily Active Users.) Au-delà, le coût reste marginal : KV ≈ 0,50 $/million
d'écritures, D1 dans le même ordre.

---

## Décision retenue

**Phase actuelle : tout en IndexedDB côté client, aucun backend de données.**

- Stockage local de tout : zones, PDF source, images de pages.
- `navigator.storage.persist()` pour bloquer les purges automatiques.
- **Bouton export / import** (ZIP) pour que l'utilisateur sauvegarde son travail.
- Message clair : « vos données sont locales — exportez régulièrement ».

Ce que l'export doit contenir : **les zones** (précieux, léger) + les infos de
partition. Pas les PNG (régénérables). Le PDF reste local.

### Pourquoi c'est raisonnable

- Couvre les purges automatiques (`persist()`) et la panique « j'ai tout perdu »
  (réimport / import du ZIP).
- Ne couvre pas la suppression manuelle sans export préalable — risque assumé.
- Audience = musiciens professionnels, habitués à gérer leurs fichiers (Sibelius,
  Finale…). Référence : Sublime Text ne sauvegarde pas votre travail, personne ne s'en
  plaint. Le taux de perte réel sur cette audience est négligeable.

### Évolution prévue

Si à l'échelle des plaintes récurrentes de perte de données apparaissent → ajouter un
**backup cloud des zones uniquement** via **Cloudflare D1** (avec debounce). Migration
ciblée, gratuite longtemps, sans toucher au reste. PDF et PNG restent locaux pour
toujours.

---

## Synthèse

| Question | Réponse |
| -------- | ------- |
| Stockage par défaut | IndexedDB (client) |
| Risque principal | Suppression manuelle des données du navigateur |
| Atténuation | `persist()` + export/import ZIP des zones |
| Données à protéger en priorité | Les zones (le reste est régénérable) |
| Coût infra cible | 0 € (hébergement statique) |
| Backend de données aujourd'hui | Aucun |
| Évolution si besoin de durabilité/sync | Cloudflare D1 pour les zones, avec debounce |
| Hébergement | N'importe quel statique (Cloudflare Pages, Netlify, S3…) |
