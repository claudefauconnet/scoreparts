# ScoreParts — Vue d'ensemble des modèles économiques

Application d'extraction de parties instrumentales depuis des partitions PDF (IMSLP / upload).

---

## 01 — Logiciel Desktop

Application Electron installée sur la machine. Traitement local. Achat unique via Lemon Squeezy, licence RSA validée offline.

→ [Détail complet](./01-logiciel-desktop.md)

| Critère | Valeur |
| ------- | ------ |
| **Effort d'implémentation** | 15-20 jours |
| **Coût infra** | 0-25€/mois (certificats Apple/Windows) |
| **Prix de vente** | 25€ — net reçu ~21€ |
| **Revenu à 100 ventes/an** | ~2 100€ net |
| **Revenu à 500 ventes/an** | ~10 500€ net |
| **Revenu à 1 000 ventes/an** | ~21 000€ net |
| **+ Pour** | Zéro serveur, rentable dès la 1ère vente, offline, confidentialité |
| **− Contre** | Packaging lourd par OS, Gatekeeper Mac, revenu non récurrent |

---

## 02 — SaaS Freemium

Application web hébergée. Comptes utilisateurs, quota mensuel, abonnement Pro. Infrastructure Cloudflare (R2, D1, Workers) + VPS léger pour le traitement PDF.

→ [Détail complet](./02-freemium-saas.md)

| Critère | Valeur |
| ------- | ------ |
| **Effort d'implémentation** | 25-32 jours |
| **Coût infra** | 4-35€/mois (Cloudflare + VPS) |
| **Prix abonnement Pro** | 10€/mois |
| **MRR à 50 abonnés** | ~500€/mois |
| **MRR à 100 abonnés** | ~1 000€/mois |
| **MRR à 200 abonnés** | ~2 000€/mois |
| **Inscrits pour 100 abonnés** | ~2 500 (conversion 4%) |
| **+ Pour** | Revenu récurrent, cross-device, infra quasi gratuite (Cloudflare) |
| **− Contre** | Dev le plus lourd, churn, fichiers utilisateurs côté serveur |

---

## 03 — PWA Client-Side

Site web progressif sans serveur de traitement. Tout tourne dans le navigateur (Web Workers + pdfjs-dist). Stockage IndexedDB. Même modèle commercial que 01. Installable comme app native, fonctionne offline.

→ [Détail complet](./03-pwa-client-side.md)

| Critère | Valeur |
| ------- | ------ |
| **Effort d'implémentation** | 13-15 jours (réutilise licence RSA de 01) |
| **Coût infra** | 0€ (Cloudflare Pages) |
| **Prix de vente** | 25€ — net reçu ~21€ |
| **Revenu à 100 ventes/an** | ~2 100€ net |
| **Revenu à 500 ventes/an** | ~10 500€ net |
| **Revenu à 1 000 ventes/an** | ~21 000€ net |
| **+ Pour** | Zéro infra, multiplateforme natif, chemin le plus court au marché |
| **− Contre** | Réécriture pipeline PDF, quota contournable, pas de sync cross-device |

---

## Comparaison rapide

| | 01 Desktop | 02 SaaS | 03 PWA |
| - | ---------- | ------- | ------ |
| Effort | 15-20j | 25-32j | **13-15j** |
| Coût infra | 0-25€/mois (prix certificat windows/apple) | 4-35€/mois | **0€** |
| Modèle revenu | One-shot | MRR | One-shot |
| Net/vente ou MRR/abonné | ~21€ | ~10€/mois | ~21€ |
| Rentable dès | 1ère vente | ~2 abonnés | **1ère vente** |
| Multiplateforme | Repackager | Natif | **Natif** |
| Offline | ✅ | ❌ | ✅ |

---

## Trajectoire recommandée

```text
Maintenant   →   03 PWA  (chemin le plus court, 0€ infra)
                  ↓
100+ ventes  →   01 Desktop en parallèle (audience institutionnelle)
                  ↓
500+ users   →   02 SaaS si demande de sync/collaboration confirmée
```
