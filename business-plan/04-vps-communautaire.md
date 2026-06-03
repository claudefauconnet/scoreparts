# 04 — VPS Communautaire

## Concept

App déployée telle quelle sur un VPS. Accès libre, aucun compte requis. Financé par dons volontaires (Ko-fi, GitHub Sponsors). Zéro dev supplémentaire — l'app tourne déjà en Node.js + Express.

→ Revenir à l'index [index.md](./index.md)

---

## Ce que ça demande

| Tâche | Effort |
| ----- | ------ |
| VPS Hetzner/OVH + config Node.js + PM2 | 0.5 jour |
| Nom de domaine + HTTPS (Let's Encrypt) | 0.5 jour |
| Page Ko-fi ou GitHub Sponsors | 1h |
| **Total** | **~1 jour** |

Zéro modification du code existant.

---

## Coûts d'infrastructure

| Utilisateurs actifs/jour | VPS nécessaire | Coût/mois |
| ------------------------ | -------------- | --------- |
| 1-20 | CAX11 Hetzner (2 vCPU ARM, 4GB) | **3.5€** |
| 20-100 | CPX21 Hetzner (3 vCPU, 4GB) | **7€** |
| 100-300 | CPX31 Hetzner (4 vCPU, 8GB) | **13€** |
| 300+ | Plusieurs VPS + queue BullMQ | 30€+ et refacto |

---

## Politique tarifaire

Aucune. Accès libre. Dons volontaires via Ko-fi ou GitHub Sponsors.

| Plateforme don | Commission | Montant suggéré |
| -------------- | ---------- | --------------- |
| Ko-fi | 0% (one-time) | 3-5€ |
| GitHub Sponsors | 0% | 2-10€/mois |
| Liberapay | 0% | Libre |

---

## Rentabilité

| Coût/mois | Donateurs 3€ nécessaires | Donateurs 5€ nécessaires |
| --------- | ------------------------ | ------------------------ |
| 3.5€ | 2 | 1 |
| 7€ | 3 | 2 |
| 13€ | 5 | 3 |

Atteignable avec 50-100 utilisateurs réguliers satisfaits.

### Ce modèle ne génère pas de revenu net

L'objectif est uniquement de couvrir les coûts. Pas un business plan — un service communautaire. Revenu espéré = 0€ au-delà de l'équilibre.

---

## Risques

| Risque | Impact | Mitigation |
| ------ | ------ | ---------- |
| Abus / requêtes massives | CPU saturé | Rate limiting Nginx (10 req/min/IP) |
| Coûts non couverts | App hors ligne | Seuil minimum de dons — couper si non atteint |
| Partitions protégées uploadées | Responsabilité légale | CGU + disclaimer IMSLP uniquement |
| Croissance → coûts explosent | Insoutenable | Basculer vers modèle 01 ou 03 dès signal |

---

## Avantages / Inconvénients

| **+ Pour** | **− Contre** |
| ---------- | ------------ |
| Lancement immédiat (1 jour) | Zéro revenu net |
| Zéro dev supplémentaire | Dons imprévisibles |
| Communauté + visibilité + feedback | Pas de rate limiting natif → abus possible |
| Valide l'usage réel avant de monétiser | Ne scale pas au-delà de 300 users actifs |

---

## Quand utiliser ce modèle

Phase de **validation uniquement**. Objectif : confirmer que des inconnus utilisent l'outil régulièrement avant d'investir dans 01, 02 ou 03.

Si après 2-3 mois vous avez 50+ utilisateurs actifs réguliers → basculer vers 03 PWA (chemin le plus court vers la monétisation).
