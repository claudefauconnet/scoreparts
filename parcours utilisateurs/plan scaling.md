# Choix d'infra

- **Serveur OVH ou équivalent** : mise en place Docker pour les services, gestion du traffic et de la mémoire manuellement. Coût fixe prévisible mais plus cher en temps de travail. Pertinent uniquement si la charge est constante et prévisible — sinon on paye pour de la capacité idle.

- **Serverless** : scale nativement, pas de gestion de charge / mémoire / Docker. Coût quasi nul jusqu'au trafic réel, mais la facture monte si le volume explose. Recommandé au départ pour un volume incertain — basculer vers OVH si le coût serverless dépasse ~500€/mois.

---

# Plan

## 1. Remplacer les JSON par PostgreSQL

Enlever tout ce qui est JSON de zones, instruments, partitions... et associer une base PostgreSQL via `.env`.

### Pourquoi les JSON ne scalent pas

**Problème 1 — Zéro concurrence (race condition) :**

Deux utilisateurs (ou deux sauvegardes quasi-simultanées du même utilisateur) qui modifient le même fichier JSON en même temps provoquent un "lost update" silencieux :

```text
T=0ms   User A lit zones.json  → { zones: [z1, z2] }
T=0ms   User B lit zones.json  → { zones: [z1, z2] }

T=10ms  User A ajoute z3, écrit → { zones: [z1, z2, z3] }
T=12ms  User B ajoute z4, écrit → { zones: [z1, z2, z4] }  ← z3 perdu
```

Aucune erreur, aucun log — la donnée disparaît silencieusement. Ce risque existe aussi pour un seul utilisateur si autosave + save manuel arrivent quasi-simultanément (HTTP ne garantit pas l'ordre d'arrivée = ordre d'envoi).

**Problème 2 — Pas de transactions (état incohérent sur crash) :**

Sauvegarder une session implique plusieurs écritures liées (zones, partition, user_data). Si le serveur crash entre deux écritures :

```text
✅ zones.json        → nouvelles zones écrites
❌ partitions.json   → ancienne version
❌ user_data.json    → jamais écrit
```

État partiellement mis à jour, aucun mécanisme natif pour rollback. Bugs silencieux garantis en production.

**Lecture :** scan complet du fichier à chaque requête → O(n), lent dès 100+ partitions.

### Pourquoi PostgreSQL résout tout ça

- **Locking natif** : quand User A modifie une ligne, User B attend — impossible de se chevaucher.
- **Transactions ACID** : soit tout s'applique (`COMMIT`), soit rien (`ROLLBACK` automatique si crash). Jamais d'état à moitié écrit.
- **Optimistic concurrency** pour les sauvegardes rapides du même utilisateur :

```sql
UPDATE zones SET data = $1, version = version + 1
WHERE partition_id = $2 AND version = $3  -- version attendue
RETURNING version;
-- 0 rows = version périmée → client relit avant de réécrire
```

- **Index B-tree** → lookup O(log n) peu importe le volume.
- **Foreign keys** → relations entre entités (partition ↔ zones ↔ instruments) en queries simples, pas de JSON.find() manuel.
- **Read replicas** si la charge lecture explose.
- Si un format JSON est nécessaire en sortie, PostgreSQL peut le générer nativement (`json_agg`, `row_to_json`).

---

## 2. Auth (login + Google Auth)

Page de login avec inscription + Google Auth. Augmente le taux de conversion (moins de friction). Lien en base pour gérer les utilisateurs, leurs partitions disponibles, ownership partition...

**Dépendance critique** : l'auth doit être en place avant la DB car sans utilisateur identifié, impossible de lier une partition à un owner.

---

## 3. Remplacer le dossier `data/` par S3 (ou équivalent)

- **OVH** : stocker images et PDF dans `data/` sur le serveur. Problème : storage lié à une instance → horizontal scaling impossible (2 serveurs = 2 dossiers désynchronisés). Le client ne peut pas charger toutes les images — alourdit l'application rapidement.
- **Cloud (recommandé)** : tout stocker dans un S3 ou équivalent. Découple storage ↔ compute → N serveurs, 1 seul storage. CDN devant S3 → images servies depuis le edge, zéro charge serveur. Coût ~0.023$/GB/mois.

---

## Ordre d'implémentation

1. **Auth + schéma DB** (dépendance de tout le reste)
2. **Migration JSON → DB** (script de migration, sans casser l'existant)
3. **Remplacement `data/` → S3**
4. **Choix infra final** (évaluer coût serverless vs OVH sur trafic réel)

---

## Risques à ne pas oublier

- **Migration** : les JSON existants doivent être convertis sans perte — script de migration obligatoire avant de couper l'ancien système.
- **Backup DB** : PostgreSQL en prod sans backup automatique = risque fatal. À configurer dès le premier déploiement.
- **Coût serverless** : monitorer dès le départ, seuil d'alerte à définir avant de dépasser le budget.
