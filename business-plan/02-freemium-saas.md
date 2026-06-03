# 02 — SaaS Freemium

## Concept

Application web hébergée. L'utilisateur crée un compte, bénéficie d'un quota gratuit mensuel, puis souscrit un abonnement pour un usage illimité ou étendu.

---

## Structure freemium

| Tier | Prix | Quota | Cible |
|------|------|-------|-------|
| Gratuit | 0€ | 5 exports/mois, watermark | Découverte, étudiants |
| Pro | 8-12€/mois | Illimité, haute résolution, batch | Musiciens professionnels |
| Équipe | 25-40€/mois | Multi-utilisateurs, partage | Petits ensembles, studios |

---

## Coûts d'infrastructure

### Sans Cloudflare (VPS classique)

| Utilisateurs | Compute | BDD | Stockage | Bande passante | Total/mois |
|-------------|---------|-----|----------|----------------|-----------|
| 100 | 8€ | 5€ | 3€ | 1€ | ~20€ |
| 500 | 20€ | 10€ | 10€ | 5€ | ~50€ |
| 1 000 | 35€ | 15€ | 20€ | 10€ | ~80€ |
| 5 000 | 80€ | 25€ | 80€ | 40€ | ~250€ |

### Avec Cloudflare (architecture hybride)

Cloudflare couvre gratuitement : stockage (R2), base de données légère (D1), CDN, routing (Workers).
Le seul poste qui reste payant : **un petit VPS pour le traitement PDF** (opération CPU intensive, impossible dans Workers).

| Utilisateurs | VPS traitement PDF | R2 stockage | D1 base | CDN | Total/mois |
| ------------ | ------------------ | ----------- | ------- | --- | ---------- |
| 100 | 4€ | 0€ | 0€ | 0€ | **~4€** |
| 500 | 6€ | 0€ | 0€ | 0€ | **~6€** |
| 1 000 | 12€ | 0€ | 0€ | 0€ | **~12€** |
| 5 000 | 35€ | 1€ | 0€ | 0€ | **~36€** |
| 10 000 | 70€ | 3€ | 0€ | 0€ | **~73€** |

Réduction de coût : **60-75% selon le volume**, principalement grâce à R2 (zéro frais d'egress, vs S3 qui facture chaque GB sortant) et D1 (remplace un Postgres managé à 10-15€/mois).

### Pourquoi Cloudflare Workers ne remplace pas le VPS

Workers ont une limite de CPU time : 50ms sur le plan payant (5$/mois). Le traitement PDF prend plusieurs secondes. Workers convient pour le routing, l'auth, la gestion des quotas — pas pour la conversion PDF elle-même.

**Exception possible :** si GM/GS est remplacé par `pdfjs-dist` (pure JS), il devient envisageable d'utiliser Cloudflare Workers avec le plan Unbound (30s wall-clock). À évaluer selon la complexité des partitions traitées.

### Architecture recommandée avec Cloudflare

```text
Cloudflare (gratuit / quasi-gratuit)     VPS Hetzner ~4-12€/mois
─────────────────────────────────────    ─────────────────────────
Pages         → frontend statique        Node.js + Express
Workers       → auth, routing, quotas    Traitement PDF (GM ou pdfjs)
R2            → PDFs uploadés + exports  Queue de jobs (BullMQ)
D1            → users, zones, metadata
KV            → sessions, cache
```

---

## Politique tarifaire

### Grille de prix

| Tier | Prix mensuel | Prix annuel | Quota | Cible |
| ---- | ------------ | ----------- | ----- | ----- |
| **Gratuit** | 0€ | — | 5 exports/mois, watermark | Découverte, étudiants |
| **Pro** | 10€/mois | 90€/an (-25%) | Illimité, haute résolution, batch | Musiciens professionnels |
| **Équipe** | 30€/mois | 270€/an (-25%) | Tout Pro + 5 membres, partage de projets | Ensembles, studios |

### Principes

- **Tier gratuit réellement utile.** 5 exports suffit pour tester sur une vraie partition — pas une démo castrated.
- **Watermark sur le gratuit**, pas de limite de temps. L'utilisateur peut rester gratuit indéfiniment s'il accepte le tampon.
- **Annuel = 2 mois offerts.** Discount de 25% standard dans le SaaS, incite à l'engagement long terme.
- **Pas de tier entre Gratuit et Pro.** Complexité inutile à ce stade.
- **Prix en euros.** Audience principale européenne — pas de confusion avec le dollar.

### Déclencheurs d'upgrade

Un utilisateur passe au Pro quand :

- Il atteint la limite de 5 exports et a un vrai besoin professionnel
- Il a besoin des exports sans watermark pour livrer à un client/élève
- Il utilise le batch (plusieurs parties en une fois)

---

## Rentabilité

### Hypothèses de conversion

Taux de conversion gratuit → payant typique pour un outil de niche B2C : **3-5%**.

| Utilisateurs inscrits | Payants (4%) | Pro 10€ | MRR |
| --------------------- | ------------ | ------- | --- |
| 100 | 4 | 4 | **40€** |
| 500 | 20 | 20 | **200€** |
| 1 000 | 40 | 40 | **400€** |
| 2 500 | 100 | 100 | **1 000€** |
| 5 000 | 200 | 200 | **2 000€** |

### Seuil de rentabilité infra (avec Cloudflare)

| Utilisateurs | Infra/mois | MRR nécessaire | Payants nécessaires (10€) |
| ------------ | ---------- | -------------- | ------------------------- |
| 500 | 6€ | 6€ | **1 abonné** |
| 1 000 | 12€ | 12€ | **2 abonnés** |
| 5 000 | 36€ | 36€ | **4 abonnés** |
| 10 000 | 73€ | 73€ | **8 abonnés** |

L'infra Cloudflare est si peu coûteuse que **la rentabilité infra est triviale**. La vraie question est la récupération du coût de développement.

### Récupération du coût de développement

En estimant ~6-8 semaines pour le MVP SaaS (auth + quotas + billing) :

| Valorisation journée | Coût dev estimé | MRR pour récupérer en 12 mois |
| -------------------- | --------------- | ----------------------------- |
| 200€/jour | ~6 000€ | **500€ MRR** = 50 abonnés Pro |
| 350€/jour | ~10 500€ | **875€ MRR** = 88 abonnés Pro |
| 500€/jour | ~15 000€ | **1 250€ MRR** = 125 abonnés Pro |

50-125 abonnés payants sur 12 mois → objectif atteignable à partir d'une base de **1 250-3 000 inscrits** (au taux de 4%).

### Projection sur 18 mois (scénario prudent, croissance lente)

| Mois | Inscrits | Payants | MRR | Revenu cumulé net | Vs coût dev 8 000€ |
| ---- | -------- | ------- | --- | ----------------- | ------------------ |
| 3 | 150 | 6 | 60€ | 180€ | -7 820€ |
| 6 | 400 | 16 | 160€ | 720€ | -7 280€ |
| 9 | 700 | 28 | 280€ | 1 560€ | -6 440€ |
| 12 | 1 000 | 40 | 400€ | 2 880€ | -5 120€ |
| 18 | 2 000 | 80 | 800€ | 7 080€ | **-920€ → rentable mois 19** |

Avec Cloudflare, les coûts infra n'impactent quasi pas ces chiffres — chaque euro de revenu va presque entièrement en bénéfice net une fois le dev amorti.

---

## Effort d'implémentation

### Tâches et estimations

| Tâche | Existe | Effort | Bloque |
| ----- | ------ | ------ | ------ |
| Traitement PDF (Node.js) | ✅ | — | — |
| Setup Cloudflare (Pages + R2 + D1 + Workers) | ❌ | 2 jours | tout |
| Auth utilisateurs (Clerk recommandé — zéro code auth) | ❌ | 2-3 jours | comptes |
| Middleware quota — compteur exports/mois en D1 | ❌ | 2 jours | freemium |
| Watermark sur exports tier gratuit | ❌ | 1 jour | freemium |
| Stripe Subscriptions (checkout + webhook) | ❌ | 3-4 jours | billing |
| Upgrade / downgrade / annulation abonnement | ❌ | 2 jours | billing |
| Dashboard utilisateur (quota restant, historique) | ❌ | 3-4 jours | UX |
| VPS traitement PDF + queue BullMQ | ❌ | 2-3 jours | perf |
| Tests end-to-end (inscription → paiement → export) | ❌ | 2 jours | lancement |

### Total

| Scénario | Effort total |
| -------- | ------------ |
| MVP minimal (auth + quota + billing basique) | **~18-22 jours** |
| MVP complet (dashboard + queue + annulation) | **~25-32 jours** |

### Chemin critique

```text
Cloudflare setup → Auth → Quota middleware → Watermark → Lancement gratuit
                                    ↓
                     Stripe → Webhook → Unlock quota → Dashboard
```

### Roadmap de lancement

| Semaine | Livrable |
| ------- | -------- |
| 1 | Cloudflare setup + auth + comptes utilisateurs |
| 2-3 | Quota + watermark + tier gratuit fonctionnel |
| 4-5 | Stripe + webhook + upgrade Pro |
| 6 | VPS + BullMQ + dashboard |
| 7 | Tests end-to-end + corrections |
| **8** | **Lancement — tier gratuit ouvert, Pro disponible** |

---

## Avantages

- Revenu récurrent et prévisible
- Pas de problème de copyright (utilisateur traite ses propres fichiers)
- Facilité de mise à jour (déploiement centralisé)
- Données d'usage disponibles

## Inconvénients

- Infrastructure coûteuse et à opérer en permanence
- Complexité technique bien supérieure au modèle desktop
- Churn (résiliation) = revenu instable
- Confidentialité : les fichiers des utilisateurs passent par vos serveurs

---

## Quand envisager ce modèle

- Après validation du marché avec le modèle desktop (01)
- Si des fonctionnalités collaboratives sont demandées (partage de partitions, annotations)
- Si le volume d'utilisateurs dépasse 500 actifs réguliers
- Si des intégrations web sont nécessaires (plugins MuseScore, IMSLP direct)
