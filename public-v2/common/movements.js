// Logique des mouvements (sans DOM). La LISTE des mouvements vit dans le state
// global partagé (state.MOVEMENTS / state.activeMvt) ; ce module la lit, la mute
// et émet 'movements-changed' pour que la header bar se re-rende. Les zones (via
// scoreParts) servent à inférer les pages d'un mouvement.
import { state, emit } from '../modules/partitions.state.js';
import { scoreParts } from './scoreParts.js';
import { saveScoreInfos } from './proxy.js';

export const Movements = {};

// Plage réelle de chaque mouvement, calculée depuis ses zones : start = 1re page,
// end = dernière page. end est déduit des zones (pas du mvt suivant) car deux
// mouvements peuvent se recouvrir sur une page frontière (A finit p3, B commence p3).
Movements.buildFromZones = function () {
  const pages = scoreParts.allPagesZones.pages;
  const movementRange = {};
  const sortedPageKeys = Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b));

  for (const pageKey of sortedPageKeys) {
    const pageNumber = parseInt(pageKey) + 1;
    pages[pageKey].forEach((zone) => {
      if (!zone.movement) return;
      const range = movementRange[zone.movement];
      if (!range) {
        movementRange[zone.movement] = { startPage: pageNumber, endPage: pageNumber };
      } else if (pageNumber > range.endPage) {
        range.endPage = pageNumber;
      }
    });
  }

  return Object.entries(movementRange).map(([name, range], idx) => ({
    id: idx + 1,
    name,
    startPage: range.startPage,
    endPage: range.endPage,
  }));
};

// La LISTE des mouvements (noms + ordre) vient de infos.movements (le JSON), pas
// des zones. Les zones ne servent qu'à inférer les PAGES (maître) quand le
// mouvement en a ; sinon endPage reste indéfini pour que range() recalcule une
// plage contiguë à jour. startPage stocké sert à localiser un mouvement sans zone.
Movements.merge = function () {
  const inferred = Movements.buildFromZones();
  const inferredByName = {};
  inferred.forEach((inferredMovement) => {
    inferredByName[inferredMovement.name] = inferredMovement;
  });

  let stored = (scoreParts.infos && scoreParts.infos.movements) || [];
  // Migration : ancienne partition sans liste persistée → on la dérive des zones
  // une seule fois (au prochain enregistrement elle sera écrite dans le JSON).
  if (stored.length === 0 && inferred.length > 0) {
    stored = inferred;
  }

  return stored
    .filter((storedMovement) => storedMovement.name)
    .map((storedMovement, movementIndex) => {
      const range = inferredByName[storedMovement.name];
      return {
        id: movementIndex + 1,
        name: storedMovement.name,
        startPage: range ? range.startPage : storedMovement.startPage,
        endPage: range ? range.endPage : undefined,
        stavesPerSystem: storedMovement.stavesPerSystem || storedMovement.systemNumber || null,
      };
    });
};

// Plage de pages d'un mouvement dans une liste TRIÉE par startPage.
// Maître = les zones : si le mouvement en a (endPage défini), on l'utilise (gère
// aussi le recouvrement page frontière). Sinon (pas encore de zones) on déduit une
// plage contiguë : jusqu'au mouvement suivant - 1, ou la fin de la partition.
Movements.range = function (sortedMovements, idx) {
  const movement = sortedMovements[idx];
  if (movement.endPage) {
    return { start: movement.startPage, end: movement.endPage };
  }
  const next = sortedMovements[idx + 1];
  const end = next ? next.startPage - 1 : scoreParts.totalPages;
  return { start: movement.startPage, end };
};

// Persiste la liste des mouvements dans infos.movements (noms + ordre + pages
// inférées). Un mouvement sans zone garde son startPage courant, sinon il serait
// introuvable au rechargement.
Movements.persist = function () {
  if (!scoreParts.pdfName) return;
  // Pages écrites = mêmes que l'affichage (range) sur une liste triée : zones
  // maître si présentes, sinon plage contiguë. Garde le fichier cohérent avec les
  // zones et évite des endPage=startPage incohérents pour les mouvements sans zone.
  const sorted = [...state.MOVEMENTS].sort(
    (firstMovement, secondMovement) => firstMovement.startPage - secondMovement.startPage
  );
  const payload = [];
  sorted.forEach((movement, movementIndex) => {
    if (!movement.name) return;
    const range = Movements.range(sorted, movementIndex);
    payload.push({
      name: movement.name,
      startPage: range.start,
      endPage: range.end,
      stavesPerSystem: movement.stavesPerSystem || null,
    });
  });
  if (scoreParts.infos) scoreParts.infos.movements = payload;
  saveScoreInfos(scoreParts.pdfName, { movements: payload }, function (err) {
    if (err) console.error('Erreur saveScoreInfos (movements)', err);
  });
};

Movements.ensureStavesPerSystem = function (movementName) {
  const movement = state.MOVEMENTS.find(
    (candidateMovement) => candidateMovement.name === movementName
  );
  if (!movement) return null;
  if (Number.isInteger(movement.stavesPerSystem) && movement.stavesPerSystem > 0) {
    return movement.stavesPerSystem;
  }

  const stavesPerSystemInput = prompt(
    'Combien de portées contient un système complet dans ce mouvement ?'
  );
  if (stavesPerSystemInput === null) return null;

  const stavesPerSystem = Number(stavesPerSystemInput);
  if (!Movements.setStavesPerSystem(movementName, stavesPerSystem)) {
    alert('Veuillez entrer un nombre entier de portées supérieur à zéro.');
    return null;
  }

  return stavesPerSystem;
};

Movements.setStavesPerSystem = function (movementName, stavesPerSystem) {
  if (!Number.isInteger(stavesPerSystem) || stavesPerSystem <= 0) return false;

  const movement = state.MOVEMENTS.find(
    (candidateMovement) => candidateMovement.name === movementName
  );
  if (!movement) return false;

  movement.stavesPerSystem = stavesPerSystem;
  Movements.persist();
  return true;
};

// Charge la liste dans le state global et émet 'movements-changed'. Retourne
// { needsNaming } : true si la partition est ouverte mais sans aucun mouvement →
// la header bar forcera la saisie du nom (UI). Aucun accès DOM ici.
Movements.load = function () {
  const movements = Movements.merge();
  if (movements.length === 0) {
    state.MOVEMENTS.splice(0, state.MOVEMENTS.length, {
      id: 1,
      name: '',
      startPage: 1,
      stavesPerSystem: null,
    });
    state.activeMvt = 1;
    emit('movements-changed');
    return { needsNaming: !!scoreParts.pdfName };
  }
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, ...movements);
  if (!state.MOVEMENTS.find((m) => m.id === state.activeMvt)) {
    state.activeMvt = state.MOVEMENTS[0].id;
  }
  emit('movements-changed');
  return { needsNaming: false };
};

// Crée un mouvement à la page courante. Si un mouvement y commence déjà, on bascule
// dessus sans doublon. Retourne { created } : true → la header bar force la saisie
// du nom ; false → un mouvement existait déjà à cette page.
Movements.add = function (currentPage) {
  const existing = state.MOVEMENTS.find((m) => m.startPage === currentPage);
  if (existing) {
    state.activeMvt = existing.id;
    emit('movements-changed');
    return { created: false };
  }
  const newId = Math.max(...state.MOVEMENTS.map((movement) => movement.id)) + 1;
  state.MOVEMENTS.push({ id: newId, name: '', startPage: currentPage, stavesPerSystem: null });
  state.activeMvt = newId;
  emit('movements-changed');
  return { created: true };
};

// Supprime le mouvement (zones comprises) puis persiste. Refuse de supprimer le
// dernier mouvement. La confirmation utilisateur est gérée côté UI.
Movements.remove = function (id) {
  if (state.MOVEMENTS.length <= 1) return;
  const movement = state.MOVEMENTS.find((m) => m.id === id);
  if (!movement) return;
  // Supprime d'abord les zones du mouvement (modèle + canvas + sauvegarde),
  // puis retire le mouvement de la liste et persiste infos.movements.
  if (movement.name) scoreParts.deleteMovement(movement.name);
  const removeIdx = state.MOVEMENTS.findIndex((m) => m.id === id);
  state.MOVEMENTS.splice(removeIdx, 1);
  if (state.activeMvt === id) state.activeMvt = state.MOVEMENTS[0].id;
  Movements.persist();
  emit('movements-changed');
};

// Sélectionne un mouvement : devient l'actif et le mouvement courant (tag des
// zones). La navigation vers sa première page reste côté UI.
Movements.select = function (id) {
  const movement = state.MOVEMENTS.find((m) => m.id === id);
  if (!movement) return;
  state.activeMvt = id;
  scoreParts.fillMovement(movement.name);
  emit('movements-changed');
};

// Applique un changement de nom : renomme (retag des zones) si le mouvement existait
// déjà sous un autre nom, sinon fixe le mouvement courant (première nomination),
// puis persiste. La validation du champ et le DOM restent côté UI.
Movements.applyRename = function (previousName, newName) {
  if (previousName && newName !== previousName) {
    scoreParts.renameMovement(previousName, newName);
  } else {
    scoreParts.fillMovement(newName);
  }
  Movements.persist();
};
