// Globals externes attendus : `paper` (lib Paper.js).
//
// Éditeur de zones v2. Paper.js reste MAÎTRE de la logique (modèle de zones,
// coordonnées, lecture via getPageZones). Différences avec l'éditeur v1 :
//   - canvas TRANSPARENT par-dessus l'<img> de page (pas de Paper.Raster).
//   - une page courante à la fois : un canvas (donc un projet Paper) par page,
//     activé quand la page devient courante.
//   - coordonnées en pixels-canvas (espace mise en page, hors zoom CSS) : le
//     zoom est une transform CSS sur le conteneur. event.point de Paper.js est en
//     pixels écran et n'est juste qu'à zoom 1. correctEventCoords() le remappe dans
//     chaque handler via la boîte rendue du canvas (getBoundingClientRect) → les
//     coords sont exactes à n'importe quel zoom/pan, sans supposer de facteur.
//   - interactions sans touches modificatrices : bouton "New zone" (mode activable
//     persistant → on peut tracer plusieurs zones), glisser le corps pour
//     déplacer, glisser le bord HAUT ou BAS pour redimensionner, croix pour
//     supprimer. Une pastille de voix (placeholder) est affichée par zone
//     (l'affectation réelle se fera dans la partie voices).
import { scoreParts } from './scoreParts.js';
import { state, emit } from '../modules/partitions.state.js';

export const Paper = {};

// ============== Constantes de style / interaction (look module)
const ZONE_RADIUS = 8; // coins arrondis
const EDGE_GRAB = 9; // px de proximité d'un bord (haut/bas) → redimensionnement
const MEASURE_GRAB = 14; // px de proximité de l'abscisse d'une mesure → saisie/déplacement
const MEASURE_DELETE_GRAB = 8; // px de proximité du centre de la croix d'un badge → suppression
const BADGE_INSET = 12; // décalage de la croix depuis le coin haut-droit du rect
const BADGE_GRAB = 12; // px de proximité au centre de la croix → suppression
const MIN_ZONE_HEIGHT = 8;
const HIT_OPTIONS = { fill: true, stroke: true, tolerance: 4 };

// Couleur de base d'une zone non affectée (l'affectation de voix viendra
// dans la partie voices et recolorera la zone).
const BASE_COLOR = '#4a7a8c';
const ZONE_FILL = new paper.Color(0x4a / 255, 0x7a / 255, 0x8c / 255, 0.16);
const ZONE_STROKE = new paper.Color(BASE_COLOR);
const PILL_BG = new paper.Color(BASE_COLOR);
// Barre + badge de numéro de mesure (contraste sur les zones bleues).
const MEASURE_COLOR = new paper.Color('#2f855a');
const MEASURE_FONT_PX = 11; // taille du numéro dans l'espace canvas (sert aussi à dériver la police PDF)
// Badge de texte libre (saisi au clic droit) — distinct de la couleur des mesures.
const TEXT_COLOR = new paper.Color('#2b6cb0');
const TEXT_FONT_PX = 13; // taille par défaut du texte dans l'espace canvas (réglable par texte)
const MIN_TEXT_FONT_PX = 6; // plancher de taille au redimensionnement

// ============== État privé
var projectsByCanvasId = {}; // id de canvas → projet Paper (un par page)
var wiredCanvases = {}; // id de canvas → listeners DOM déjà posés
var isPointerDown = false; // bouton souris enfoncé (drag en cours)
var hoverGroup = null; // zone actuellement survolée (poignées visibles)
var selectedGroups = []; // zones sélectionnées par lasso
var lastCorrectedPoint = null; // dernier point projet corrigé (pour recalculer event.delta)

Paper.pendingNewZone = false; // mode "nouvelle zone" (persistant tant qu'activé)
Paper.pendingMeasure = false; // mode "mesure" (pose un numéro de mesure au clic)
Paper.pendingText = false; // mode "texte" (pose un texte au clic — miroir du mode mesure)
Paper.onMeasurePendingChange = null; // hook posé par scorePlayer pour rafraîchir l'UI
Paper.onTextPendingChange = null; // idem pour le bouton "Texte"
Paper.activeCanvas = null; // <canvas> de la page courante
Paper.currentCanvasId = null; // id du canvas de la page courante (projet actif)
Paper.currentZoneAction = null;
Paper.activeGroup = null; // zone en cours d'action (déplacement / redimensionnement)
Paper.currentPath = null;
Paper.defaultZoneHeight = 20;
Paper.margin = 10;
Paper.onPendingChange = null; // hook posé par scorePlayer pour rafraîchir l'UI
Paper.onSelectionChange = null; // hook(count) posé par scorePlayer pour la toolbar
Paper.isLasso = false;
Paper.lassoStart = null;
Paper.lassoPath = null;
// Centre de la croix de suppression d'après le rectangle (path) d'une zone.
function deleteBadgeCenter(rectBounds) {
  return rectBounds.topRight.add(new paper.Point(-BADGE_INSET, BADGE_INSET));
}
// Couleurs + libellé d'une zone selon la voix affectée (zone.voice = id de voix).
// Voix inconnue / non affectée → couleur neutre de base et libellé générique.
function zoneColors(zone) {
  var voice = zone.voice
    ? state.VOICES.find(function (v) {
        return v.id === zone.voice;
      })
    : null;
  if (!voice) {
    return { fill: ZONE_FILL, stroke: ZONE_STROKE, pill: PILL_BG, label: zone.label || 'Voix' };
  }
  // Voix inactive (toggle off) → couleur grisée, pastille barrée ("/")
  if (!voice.on) {
    var grayFill = new paper.Color(0.6, 0.6, 0.6, 0.1);
    var grayStroke = new paper.Color(0.6, 0.6, 0.6, 0.4);
    return { fill: grayFill, stroke: grayStroke, pill: grayStroke, label: voice.name + ' (off)' };
  }
  var fill = new paper.Color(voice.color);
  fill.alpha = 0.16;
  return {
    fill: fill,
    stroke: new paper.Color(voice.color),
    pill: new paper.Color(voice.color),
    label: voice.name,
  };
}
// Largeur de dessin = taille CSS du canvas actif (espace de coordonnées du projet).
function canvasW() {
  return Paper.activeCanvas ? Paper.activeCanvas.clientWidth : 0;
}

// ============== Projets Paper (un par canvas / page)
// Active (ou crée) le projet d'un canvas et cale sa vue sur sa taille CSS.
// Aucun raster : le fond est l'<img> sous le canvas transparent.
function ensureProject(canvas, imgEl) {
  if (scoreParts.margin == null) {
    scoreParts.margin = Paper.margin;
  }
  if (projectsByCanvasId[canvas.id]) {
    projectsByCanvasId[canvas.id].activate();
  } else {
    paper.setup(canvas);
    projectsByCanvasId[canvas.id] = paper.project;
  }
  paper.view.viewSize = new paper.Size(canvas.clientWidth, canvas.clientHeight);
  if (imgEl) {
    // L'élément est un <canvas> (pas un <img>) : _naturalWidth/Height portent les
    // dimensions du PNG original, width/height celles du backing store capé.
    var naturalW = imgEl._naturalWidth || imgEl.naturalWidth || imgEl.width;
    var naturalH = imgEl._naturalHeight || imgEl.naturalHeight || imgEl.height;
    scoreParts.naturalW = naturalW;
    scoreParts.naturalH = naturalH;
    scoreParts.coefV = canvas.clientHeight / naturalH;
    scoreParts.coefH = canvas.clientWidth / naturalW;
  }
  wireCanvasListeners(canvas);
}

// Réactive le projet de la page COURANTE (le seul éditable / cible de l'outil).
function activateCurrent() {
  var project = projectsByCanvasId[Paper.currentCanvasId];
  if (project) project.activate();
}

// Dessine les zones d'UNE page dans son canvas.
//   - interactive (page courante) : poignées + croix + drag/resize/suppression,
//     projet laissé ACTIF (cible de l'outil de création et de getPageZones).
//   - non interactive (autre page du spread) : zones visibles mais figées ; le
//     canvas a pointer-events:none (CSS), donc tout clic bascule la page courante.
Paper.renderPage = function (canvas, imgEl, pageIndex, interactive) {
  ensureProject(canvas, imgEl);
  paper.project.activeLayer.removeChildren();
  if (interactive) {
    Paper.activeCanvas = canvas;
    Paper.currentCanvasId = canvas.id;
    hoverGroup = null;
    selectedGroups = [];
    placementGuide = null; // removeChildren a détaché le guide → on oublie la réf morte
    if (Paper.onSelectionChange) Paper.onSelectionChange(0);
  }
  var zones = scoreParts.allPagesZones.pages[pageIndex];
  if (zones && zones.length > 0) {
    // Migration best-effort : zones en anciens pixels canvas (y > 1) → fractions.
    // Exact seulement si le viewport courant est proche du viewport d'origine,
    // mais meilleur que de laisser les coords incohérentes.
    var needsMigration = zones.some(function (z) {
      return z.y > 1 || z.height > 1;
    });
    if (needsMigration) {
      // Ancien format : canvas pixels. Convertir en fractions 0→1 du canvas courant.
      // Exact si dessiné avec le même viewport ; best-effort sinon (user peut rédessiner).
      var canvasWm = (scoreParts.naturalW || 1) * (scoreParts.coefH || 1);
      var canvasHm = (scoreParts.naturalH || 1) * (scoreParts.coefV || 1);
      zones = zones.map(function (z) {
        if (z.y > 1 || z.height > 1) {
          return Object.assign({}, z, {
            x: z.x / canvasWm,
            y: z.y / canvasHm,
            width: z.width / canvasWm,
            height: z.height / canvasHm,
          });
        }
        return z;
      });
      scoreParts.allPagesZones.pages[pageIndex] = zones;
      scoreParts.modified = true;
      scoreParts.saveZones(function () {}); // persistifier le nouveau format
    }
    // Clamp DU MODÈLE (fractions) une seule fois : bord droit qui dépasse la page
    // (anciennes zones width=1.0 → x+width>1). Clamper au DRAW serait relu par
    // writeVisibleSpreadZones et réécrirait le modèle → drift cumulé au zoom.
    var needsClamp = zones.some(function (z) {
      return z.x < 0 || z.x + z.width > 1;
    });
    if (needsClamp) {
      zones = zones.map(function (z) {
        var clampedX = Math.max(0, z.x);
        var clampedRight = Math.min(1, clampedX + z.width);
        return Object.assign({}, z, { x: clampedX, width: clampedRight - clampedX });
      });
      scoreParts.allPagesZones.pages[pageIndex] = zones;
      scoreParts.modified = true;
      scoreParts.saveZones(function () {});
    }
    zones.forEach(function (zone) {
      Paper.drawZone(zone, pageIndex, interactive);
    });
  }
  if (paper.view) paper.view.update();
  // Garde le projet de la page courante actif (rendu de l'autre page après).
  if (!interactive) activateCurrent();
};

// On N'utilise PAS paper.Tool : Paper.js filtre les events à la viewSize du canvas.
// Or le canvas est agrandi par la transform CSS du #book (zoom), donc les offsets
// écran dépassent viewSize dans la zone agrandie → Paper ignore ces events (zone
// morte à droite/en bas). Les listeners DOM natifs, eux, reçoivent les events sur
// TOUTE la surface réelle du canvas ; correctEventCoords() remappe ensuite via le
// getBoundingClientRect. Un seul jeu de listeners par canvas (les éléments persistent).
function wireCanvasListeners(canvas) {
  if (wiredCanvases[canvas.id]) return;
  wiredCanvases[canvas.id] = true;
  canvas.addEventListener('mousedown', onNativeMouseDown);
  canvas.addEventListener('mousemove', onNativeHover);
}

// Construit un pseudo-événement compatible avec les handlers (qui lisent .event,
// .point et .delta). correctEventCoords() remplit .point/.delta depuis .event natif.
function makeToolEvent(nativeEvent, withDelta) {
  return { event: nativeEvent, point: null, delta: withDelta ? new paper.Point(0, 0) : undefined };
}

// Active le projet Paper du canvas visé (cible du hitTest) et le marque courant.
function focusCanvas(canvas) {
  if (projectsByCanvasId[canvas.id]) projectsByCanvasId[canvas.id].activate();
  Paper.activeCanvas = canvas;
}

function onNativeHover(nativeEvent) {
  // Pendant un VRAI drag (action de zone/badge ou lasso en cours), on laisse le
  // listener window gérer le mouvement. Mais isPointerDown peut rester vrai SANS
  // action en cours — typiquement quand un prompt natif (window.prompt) a avalé le
  // mouseup du clic de pose : dans ce cas on laisse passer, sinon le guide de visée
  // (croix + surbrillance) se figerait après la 1re mesure/texte posé.
  if (isPointerDown && (Paper.currentZoneAction || Paper.isLasso)) return;
  focusCanvas(nativeEvent.currentTarget);
  onCanvasMouseMove(makeToolEvent(nativeEvent, false));
}

function onNativeMouseDown(nativeEvent) {
  focusCanvas(nativeEvent.currentTarget);
  isPointerDown = true;
  lastCorrectedPoint = null; // repart proprement pour le calcul des deltas
  // Listeners posés AVANT onCanvasMouseDown : un handler peut ouvrir un prompt
  // natif (window.prompt) qui avale le mouseup du clic — il doit alors pouvoir
  // retirer lui-même ces listeners (cf. releasePointerAfterPrompt) pour libérer
  // le pointeur, sinon le guide de visée se fige (onNativeHover ignore les survols).
  window.addEventListener('mousemove', onNativeDrag);
  window.addEventListener('mouseup', onNativeMouseUp);
  onCanvasMouseDown(makeToolEvent(nativeEvent, false));
}

function onNativeDrag(nativeEvent) {
  onCanvasMouseDrag(makeToolEvent(nativeEvent, true));
}

function onNativeMouseUp(nativeEvent) {
  window.removeEventListener('mousemove', onNativeDrag);
  window.removeEventListener('mouseup', onNativeMouseUp);
  isPointerDown = false;
  onCanvasMouseUp(makeToolEvent(nativeEvent, true));
}

// Un prompt/alerte natif (window.prompt) avale le mouseup du clic qui l'a ouvert :
// sans cette libération, isPointerDown resterait vrai et onNativeHover ignorerait
// tout mouvement de survol → le guide de visée (croix) se figerait après la 1re
// pose. À appeler dès qu'un prompt se ferme dans onCanvasMouseDown.
function releasePointerAfterPrompt() {
  isPointerDown = false;
  window.removeEventListener('mousemove', onNativeDrag);
  window.removeEventListener('mouseup', onNativeMouseUp);
}

// ============== Mode "nouvelle zone" (activable / désactivable)
Paper.setPending = function (on) {
  Paper.pendingNewZone = on;
  if (on && Paper.pendingMeasure) Paper.setPendingMeasure(false); // modes exclusifs
  if (on && Paper.pendingText) Paper.setPendingText(false);
  if (Paper.onPendingChange) Paper.onPendingChange(on);
};

// ============== Mode "mesure" (pose un numéro au clic) — miroir exclusif des autres modes.
Paper.setPendingMeasure = function (on) {
  Paper.pendingMeasure = on;
  if (on && Paper.pendingNewZone) Paper.setPending(false); // modes exclusifs
  if (on && Paper.pendingText) Paper.setPendingText(false);
  if (on) {
    refreshPlacementGuide(); // affiche le guide dès l'entrée du mode (sans attendre un mousemove)
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = 'crosshair';
  } else {
    clearPlacementGuide(); // retire la barre-guide en sortie de mode
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = '';
  }
  if (Paper.onMeasurePendingChange) Paper.onMeasurePendingChange(on);
};

// ============== Mode "texte" — UI identique au mode mesure (bouton + barre-guide).
Paper.setPendingText = function (on) {
  Paper.pendingText = on;
  if (on && Paper.pendingNewZone) Paper.setPending(false); // modes exclusifs
  if (on && Paper.pendingMeasure) Paper.setPendingMeasure(false);
  if (on) {
    refreshPlacementGuide();
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = 'crosshair';
  } else {
    clearPlacementGuide();
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = '';
  }
  if (Paper.onTextPendingChange) Paper.onTextPendingChange(on);
};

// Barre-guide en CROIX (verticale + horizontale, pointillés) qui suit le curseur en mode
// mesure OU texte, plus une SURBRILLANCE du système visé par le Y du curseur : aide à viser
// l'abscisse ET à voir sur quel système la pose va se propager. Non persistée (role ≠ 'zone').
var placementGuide = null;
var lastPlacementCursorX = null; // dernières coords connues du curseur (mode mesure/texte)
var lastPlacementCursorY = null;
function updatePlacementGuide(xpx, ypx) {
  if (!paper || !paper.project) return;
  lastPlacementCursorX = xpx;
  lastPlacementCursorY = ypx;
  clearPlacementGuide();
  var width = (Paper.activeCanvas && Paper.activeCanvas.clientWidth) || 0;
  var height = (Paper.activeCanvas && Paper.activeCanvas.clientHeight) || 0;
  var guide = new paper.Group();
  guide.data.role = 'placementGuide';

  // Surbrillance du système ciblé (sous le trait horizontal) — dessinée en premier pour
  // rester derrière les traits de la croix.
  var systemGroups = currentSystemGroupsForY(ypx);
  if (systemGroups.length) {
    var bandTop = Infinity;
    var bandBottom = -Infinity;
    systemGroups.forEach(function (group) {
      bandTop = Math.min(bandTop, group.data.rect.bounds.top);
      bandBottom = Math.max(bandBottom, group.data.rect.bounds.bottom);
    });
    var highlight = new paper.Path.Rectangle(
      new paper.Rectangle(new paper.Point(0, bandTop), new paper.Size(width, bandBottom - bandTop))
    );
    highlight.fillColor = ZONE_FILL; // léger voile translucide
    highlight.strokeColor = null;
    guide.addChild(highlight);
  }

  // Croix : trait vertical (abscisse) + trait horizontal (ordonnée).
  var verticalLine = new paper.Path.Line(new paper.Point(xpx, 0), new paper.Point(xpx, height));
  var horizontalLine = new paper.Path.Line(new paper.Point(0, ypx), new paper.Point(width, ypx));
  [verticalLine, horizontalLine].forEach(function (line) {
    line.strokeColor = MEASURE_COLOR;
    line.strokeWidth = 1;
    line.dashArray = [4, 4];
    guide.addChild(line);
  });

  placementGuide = guide;
  if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = 'crosshair';
  if (paper.view) paper.view.update();
}
function clearPlacementGuide() {
  if (placementGuide) {
    placementGuide.remove();
    placementGuide = null;
  }
  if (paper && paper.view) paper.view.update();
}
// Redessine le guide aux dernières coords connues : appelé après chaque redraw
// (removeChildren l'efface) et à l'entrée du mode, pour qu'il reste visible sans attendre
// un mouvement de souris (sinon « figé » pendant le prompt / « disparu »).
function refreshPlacementGuide() {
  if (
    (Paper.pendingMeasure || Paper.pendingText) &&
    lastPlacementCursorX != null &&
    lastPlacementCursorY != null
  ) {
    updatePlacementGuide(lastPlacementCursorX, lastPlacementCursorY);
  }
}

// Groupes de zone du projet (page) actuellement actif.
function currentZoneGroups() {
  if (!paper || !paper.project) return [];
  return paper.project.activeLayer.children.filter(function (item) {
    return item.data && item.data.role === 'zoneGroup';
  });
}

// Index, dans une liste de groupes triée par `y`, du groupe dont la bande verticale
// [top, bottom] contient `y` ; à défaut, le plus proche par distance au centre.
function nearestGroupIndexToY(sortedGroups, y) {
  var nearestIndex = -1;
  var nearestDistance = Infinity;
  for (var groupIndex = 0; groupIndex < sortedGroups.length; groupIndex++) {
    var bounds = sortedGroups[groupIndex].data.rect.bounds;
    if (y >= bounds.top && y <= bounds.bottom) return groupIndex;
    var distance = Math.min(Math.abs(y - bounds.top), Math.abs(y - bounds.bottom));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = groupIndex;
    }
  }
  return nearestIndex;
}

// Groupes de zone du SYSTÈME visé par l'ordonnée y du curseur. Un système = bloc de
// `voiceCount` zones consécutives (triées par y) du mouvement courant — voiceCount = nombre
// de voix déclarées, la même base que l'attribution cyclique des voix
// (zone.voice = voiceIds[index % voiceCount]). Repli : page entière si pas de voix connue ou
// s'il n'y a qu'un système. Sert à propager mesures ET textes sur le seul système courant.
function currentSystemGroupsForY(y) {
  var groups = currentZoneGroups();
  if (scoreParts.currentMovement) {
    var movementGroups = groups.filter(function (group) {
      return group.data.rect.data.movement === scoreParts.currentMovement;
    });
    if (movementGroups.length) groups = movementGroups;
  }
  groups.sort(function (groupA, groupB) {
    return groupA.data.rect.bounds.top - groupB.data.rect.bounds.top;
  });
  var voiceCount = state.VOICES.length || scoreParts.allPagesZones.numberOfVoices;
  if (!voiceCount || voiceCount >= groups.length) return groups;
  var referenceIndex = nearestGroupIndexToY(groups, y);
  if (referenceIndex < 0) return groups;
  var systemIndex = Math.floor(referenceIndex / voiceCount);
  return groups.slice(systemIndex * voiceCount, systemIndex * voiceCount + voiceCount);
}

// Pose INITIALE : même abscisse (point.x) sur les zones du SYSTÈME visé, le badge juste
// au-dessus du haut de chaque zone. Ensuite chaque badge se déplace individuellement
// (x, y) sans re-propagation (cf. moveMeasureBadge).
var INITIAL_MEASURE_OFFSET = 16; // px au-dessus du haut de la zone à la pose
function setMeasureOnCurrentSystem(point, number) {
  currentSystemGroupsForY(point.y).forEach(function (group) {
    var rect = group.data.rect;
    if (!rect.data.measures) rect.data.measures = [];
    // Plusieurs mesures par zone (voix/portée) : on AJOUTE, sans écraser les précédentes.
    rect.data.measures.push({
      x: point.x,
      y: rect.bounds.top - INITIAL_MEASURE_OFFSET,
      number: number,
    });
  });
}

// Pose un texte sur les zones du SYSTÈME visé (même propagation que les mesures).
function setTextOnCurrentSystem(point, textStr) {
  currentSystemGroupsForY(point.y).forEach(function (group) {
    var rect = group.data.rect;
    if (!rect.data.texts) rect.data.texts = [];
    rect.data.texts.push({
      x: point.x,
      y: rect.bounds.top - INITIAL_MEASURE_OFFSET,
      text: textStr,
    });
  });
}

// Le découpage en systèmes suppose des zones attribuées à une voix. Avant toute pose de
// mesure/texte, si la page courante a des zones SANS voix → on lance l'auto-attribution
// (même logique que le bouton Auto-attribuer), on redessine, puis on autorise la pose.
// Renvoie false (et alerte) seulement si aucune voix active ne permet d'attribuer.
function ensureCurrentPageVoicesAssigned() {
  var groups = currentZoneGroups();
  if (!groups.length) return true;
  var anyUnassigned = groups.some(function (group) {
    return !group.data.rect.data.voice;
  });
  if (!anyUnassigned) return true;
  var activeVoiceIds = state.VOICES.filter(function (voice) {
    return voice.on;
  }).map(function (voice) {
    return voice.id;
  });
  if (!activeVoiceIds.length) {
    alert('Activez au moins une voix pour attribuer les zones.');
    return false;
  }
  scoreParts.assignVoicesToZones(activeVoiceIds, scoreParts.currentMovement);
  Paper.redrawCurrentPage(); // les groupes reflètent l'attribution avant le découpage en systèmes
  emit('voices-changed'); // met à jour les compteurs du panneau voix
  return true;
}

// Efface TOUTES les mesures de TOUTES les zones de la page puis persiste.
Paper.clearMeasureOnCurrentPage = function () {
  currentZoneGroups().forEach(function (group) {
    delete group.data.rect.data.measures;
  });
  commit(); // synchronise le modèle (les mesures disparaissent de toutes les zones)
  Paper.redrawCurrentPage();
  scoreParts.saveZones(function () {});
};

// Supprime UNE seule mesure d'UNE zone (croix d'un badge) puis persiste. Les autres
// mesures de la zone et de la page restent en place.
function deleteMeasureFromZone(group, measure) {
  var measures = group.data.rect.data.measures;
  if (!measures) return;
  var measureIndex = measures.indexOf(measure);
  if (measureIndex === -1) return;
  measures.splice(measureIndex, 1);
  if (measures.length === 0) delete group.data.rect.data.measures;
  commit();
  Paper.redrawCurrentPage();
  scoreParts.saveZones(function () {});
}

// Badge de mesure (carré OU sa croix) contenant le point, parmi TOUS les badges de
// TOUTES les zones de la page. Renvoie { group, badge, measure } ou null. `badge` est
// le paper.Group du badge ; `measure` l'objet de rect.data.measures qu'il représente.
function measureBadgeAt(point) {
  var groups = currentZoneGroups();
  for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    var group = groups[groupIndex];
    var badges = group.data.measureBadges;
    if (!badges) continue;
    for (var badgeIndex = 0; badgeIndex < badges.length; badgeIndex++) {
      var badge = badges[badgeIndex];
      if (badge.data.measureBar.bounds.contains(point))
        return { group: group, badge: badge, measure: badge.data.measure };
      var cross = badge.data.measureDelete;
      if (cross && point.getDistance(cross.position) < MEASURE_DELETE_GRAB) {
        return { group: group, badge: badge, measure: badge.data.measure }; // croix débordant le carré
      }
    }
  }
  return null;
}

// Vrai si le point tombe sur la croix de suppression d'un badge donné.
function measureDeleteHit(badge, point) {
  var cross = badge && badge.data.measureDelete;
  return !!(cross && point.getDistance(cross.position) < MEASURE_DELETE_GRAB);
}

// Déplace UN badge de mesure (delta pixels) et met à jour SA mesure — chaque badge
// est repositionnable individuellement (x, y) après la pose initiale.
function moveMeasureBadge(badge, delta) {
  var measure = badge.data.measure;
  if (!measure) return;
  measure.x += delta.x;
  measure.y += delta.y;
  badge.position = badge.position.add(delta);
  if (paper.view) paper.view.update();
}

// Décorations d'un badge révélées au survol : croix de suppression (mesure ou texte)
// et, pour le texte, la poignée de redimensionnement.
function badgeHoverDecorations(badge) {
  if (!badge) return [];
  var decorations = [];
  var cross = badge.data.measureDelete || badge.data.textDelete;
  if (cross) decorations.push(cross);
  if (badge.data.textResize) decorations.push(badge.data.textResize);
  return decorations;
}

// Survol d'un badge (mesure OU texte) : révèle SES décorations, masque celles du badge
// précédemment survolé.
var hoveredBadge = null;
function setBadgeHover(badge) {
  if (badge === hoveredBadge) return;
  badgeHoverDecorations(hoveredBadge).forEach(function (decoration) {
    decoration.visible = false;
  });
  hoveredBadge = badge;
  badgeHoverDecorations(hoveredBadge).forEach(function (decoration) {
    decoration.visible = true;
  });
  if (paper.view) paper.view.update();
}

// ============== Badges de texte (miroir des badges de mesure, mais PAR ZONE)
// Un texte n'est PAS propagé : il n'existe que sur la zone où il est saisi (clic droit).
// Chaque zone peut en porter plusieurs (group.data.textBadges) ; chaque badge référence
// SON texte (badge.data.text) pour déplacement/suppression unitaires.

// Badge de texte (rectangle OU sa croix) contenant le point, parmi TOUS les badges de
// TOUTES les zones de la page. Renvoie { group, badge, text } ou null.
function textBadgeAt(point) {
  var groups = currentZoneGroups();
  for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    var group = groups[groupIndex];
    var badges = group.data.textBadges;
    if (!badges) continue;
    for (var badgeIndex = 0; badgeIndex < badges.length; badgeIndex++) {
      var badge = badges[badgeIndex];
      if (badge.data.textBar.bounds.contains(point))
        return { group: group, badge: badge, text: badge.data.text };
      var cross = badge.data.textDelete;
      if (cross && point.getDistance(cross.position) < MEASURE_DELETE_GRAB) {
        return { group: group, badge: badge, text: badge.data.text }; // croix débordant le rectangle
      }
    }
  }
  return null;
}

// Vrai si le point tombe sur la croix de suppression d'un badge de texte donné.
function textDeleteHit(badge, point) {
  var cross = badge && badge.data.textDelete;
  return !!(cross && point.getDistance(cross.position) < MEASURE_DELETE_GRAB);
}

// Vrai si le point tombe sur la poignée de redimensionnement d'un badge de texte.
function textResizeHit(badge, point) {
  var handle = badge && badge.data.textResize;
  return !!(handle && point.getDistance(handle.position) < MEASURE_DELETE_GRAB);
}

// Badge de texte dont la poignée de redimensionnement contient le point (la poignée
// déborde du rectangle, d'où une recherche dédiée). Renvoie { group, badge, text }.
function textResizeAt(point) {
  var groups = currentZoneGroups();
  for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    var group = groups[groupIndex];
    var badges = group.data.textBadges;
    if (!badges) continue;
    for (var badgeIndex = 0; badgeIndex < badges.length; badgeIndex++) {
      var badge = badges[badgeIndex];
      if (textResizeHit(badge, point)) return { group: group, badge: badge, text: badge.data.text };
    }
  }
  return null;
}

// Déplace UN badge de texte (delta pixels) et met à jour SON texte.
function moveTextBadge(badge, delta) {
  var text = badge.data.text;
  if (!text) return;
  text.x += delta.x;
  text.y += delta.y;
  badge.position = badge.position.add(delta);
  if (paper.view) paper.view.update();
}

// Supprime UN seul texte d'UNE zone (croix d'un badge) puis persiste.
function deleteTextFromZone(group, text) {
  var texts = group.data.rect.data.texts;
  if (!texts) return;
  var textIndex = texts.indexOf(text);
  if (textIndex === -1) return;
  texts.splice(textIndex, 1);
  if (texts.length === 0) delete group.data.rect.data.texts;
  commit();
  Paper.redrawCurrentPage();
  scoreParts.saveZones(function () {});
}

// ============== Sélection multiple (lasso)
function clearSelection() {
  selectedGroups.forEach(function (g) {
    setGroupSelected(g, false);
  });
  selectedGroups = [];
  if (Paper.onSelectionChange) Paper.onSelectionChange(0);
}

function setGroupSelected(group, isSelected) {
  if (!group || !group.data || !group.data.rect) return;
  group.data.isSelected = isSelected;
  group.data.rect.dashArray = isSelected ? [6, 3] : null;
  group.data.rect.strokeWidth = isSelected ? 2.5 : 1.5;
}

function selectGroupsInRect(selRect) {
  var found = [];
  paper.project.activeLayer.children.forEach(function (item) {
    if (item.data && item.data.role === 'zoneGroup' && selRect.intersects(item.data.rect.bounds)) {
      setGroupSelected(item, true);
      found.push(item);
    }
  });
  return found;
}

// Recalcule event.point (et event.delta) en coordonnées PROJET à partir de la
// boîte RÉELLEMENT rendue du canvas (getBoundingClientRect). Cette boîte inclut
// déjà toutes les transforms (zoom CSS, pan), le devicePixelRatio et les contraintes
// de layout — on ne suppose donc AUCUN facteur de zoom. Sans cette correction,
// event.point de Paper.js (pixels écran relatifs au BCR) n'est juste qu'à zoom 1.
function correctEventCoords(event) {
  var canvas = Paper.activeCanvas;
  var domEvent = event.event; // MouseEvent natif porté par le ToolEvent
  if (!canvas || !domEvent) return;
  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  // Espace projet = dimensions de CE canvas (ensureProject pose viewSize =
  // clientWidth/clientHeight). On les lit directement pour rester lié au canvas
  // mesuré, sans dépendre du projet Paper actif (deux canvas par spread).
  // Fraction 0→1 du pointeur dans la boîte rendue, puis dénormalisée vers l'espace projet.
  var projectX = ((domEvent.clientX - rect.left) / rect.width) * canvas.clientWidth;
  var projectY = ((domEvent.clientY - rect.top) / rect.height) * canvas.clientHeight;
  var corrected = new paper.Point(projectX, projectY);
  // event.delta n'existe que sur les drags : on le recalcule dans le même espace
  // projet à partir du point corrigé précédent (les deltas bruts de Paper sont aussi
  // en pixels écran et donc faux au zoom).
  if (event.delta && lastCorrectedPoint) {
    event.delta = corrected.subtract(lastCorrectedPoint);
  }
  event.point = corrected;
  lastCorrectedPoint = corrected;
}

function onCanvasMouseDrag(event) {
  correctEventCoords(event);
  // Déplacement individuel d'un badge de mesure (x, y) — la zone saisie est activeGroup.
  if (Paper.currentZoneAction === 'measureBadge') {
    if (Paper.activeMeasureBadge) moveMeasureBadge(Paper.activeMeasureBadge, event.delta);
    return;
  }
  if (Paper.currentZoneAction === 'textBadge') {
    if (Paper.activeTextBadge) moveTextBadge(Paper.activeTextBadge, event.delta);
    return;
  }
  if (Paper.currentZoneAction === 'textResize') {
    var resizeState = Paper.activeTextResize;
    if (resizeState) {
      // Mise à l'échelle live du badge autour de son coin haut-gauche fixe (la taille
      // de police réelle est recalculée au relâchement, cf. onCanvasMouseUp).
      var currentHeight = resizeState.badge.data.textBar.bounds.height;
      var scaleFactor = 1 + event.delta.y / Math.max(1, currentHeight);
      if (scaleFactor > 0.2) resizeState.badge.scale(scaleFactor, resizeState.topLeft);
      if (paper.view) paper.view.update();
    }
    return;
  }
  if (isZoneAction(Paper.currentZoneAction)) {
    if (Paper.activeGroup) dragZoneAction(Paper.activeGroup, event.delta);
    return;
  }
  if (!Paper.isLasso) return;
  if (Paper.lassoPath) {
    Paper.lassoPath.remove();
    Paper.lassoPath = null;
  }
  var start = Paper.lassoStart;
  var end = event.point;
  var lassoRect = new paper.Rectangle(
    new paper.Point(Math.min(start.x, end.x), Math.min(start.y, end.y)),
    new paper.Size(Math.abs(end.x - start.x), Math.abs(end.y - start.y))
  );
  var lassoPath = new paper.Path.Rectangle(lassoRect);
  lassoPath.strokeColor = ZONE_STROKE;
  lassoPath.strokeWidth = 1.5;
  lassoPath.dashArray = [5, 4];
  lassoPath.fillColor = new paper.Color(0x4a / 255, 0x7a / 255, 0x8c / 255, 0.07);
  lassoPath.data.role = 'lasso';
  Paper.lassoPath = lassoPath;
  if (paper.view) paper.view.update();
}

function onCanvasMouseUp(event) {
  correctEventCoords(event);
  // Fin d'un redimensionnement de texte : convertit l'échelle visuelle accumulée en
  // une nouvelle taille de police réelle (fontPx), puis persiste et redessine proprement.
  if (Paper.currentZoneAction === 'textResize') {
    var resizeState = Paper.activeTextResize;
    if (resizeState) {
      var scaleRatio = resizeState.badge.data.textBar.bounds.height / resizeState.initialHeight;
      var baseFontPx = resizeState.text.fontPx || TEXT_FONT_PX;
      resizeState.text.fontPx = Math.max(MIN_TEXT_FONT_PX, Math.round(baseFontPx * scaleRatio));
      commit();
      Paper.redrawCurrentPage();
      scoreParts.saveZones(function () {});
    }
    Paper.activeTextResize = null;
    Paper.currentZoneAction = null;
    return;
  }
  if (isZoneAction(Paper.currentZoneAction)) {
    endZoneAction();
    Paper.activeGroup = null;
    Paper.activeMeasureBadge = null;
    Paper.activeTextBadge = null;
    return;
  }
  if (!Paper.isLasso) return;
  Paper.isLasso = false;
  if (Paper.lassoPath) {
    Paper.lassoPath.remove();
    Paper.lassoPath = null;
  }
  var start = Paper.lassoStart;
  Paper.lassoStart = null;
  if (!start) return;
  var dx = Math.abs(event.point.x - start.x);
  var dy = Math.abs(event.point.y - start.y);
  if (dx < 5 && dy < 5) {
    if (paper.view) paper.view.update();
    return;
  }
  var selRect = new paper.Rectangle(
    new paper.Point(Math.min(start.x, event.point.x), Math.min(start.y, event.point.y)),
    new paper.Size(dx, dy)
  );
  selectedGroups = selectGroupsInRect(selRect);
  if (paper.view) paper.view.update();
  if (Paper.onSelectionChange) Paper.onSelectionChange(selectedGroups.length);
}

// ============== Outil canvas (clic dans le vide / déplacement souris)
function onCanvasMouseDown(event) {
  correctEventCoords(event);
  if (Paper.currentZoneAction === 'removeZone') {
    Paper.currentZoneAction = null;
    return;
  }
  var hitGroup = zoneInteractiveAt(event.point);

  // Badges interactifs D'ABORD (détection serrée : boîte + croix proche) : croix →
  // suppression unitaire ; poignée texte → redimensionnement ; sinon → déplacement du badge.
  // Le badge ne prime que sur SA propre empreinte ; la zone reste accessible ailleurs.
  var measureHit = measureBadgeAt(event.point);
  if (measureHit) {
    if (measureDeleteHit(measureHit.badge, event.point)) {
      deleteMeasureFromZone(measureHit.group, measureHit.measure);
      return;
    }
    Paper.activeMeasureBadge = measureHit.badge;
    Paper.currentZoneAction = 'measureBadge';
    clearPlacementGuide();
    return;
  }

  var textResize = textResizeAt(event.point);
  if (textResize) {
    Paper.activeTextResize = {
      badge: textResize.badge,
      text: textResize.text,
      initialHeight: textResize.badge.data.textBar.bounds.height,
      topLeft: textResize.badge.data.textBar.bounds.topLeft.clone(),
    };
    Paper.currentZoneAction = 'textResize';
    return;
  }

  var textHit = textBadgeAt(event.point);
  if (textHit) {
    if (textDeleteHit(textHit.badge, event.point)) {
      deleteTextFromZone(textHit.group, textHit.text);
      return;
    }
    Paper.activeTextBadge = textHit.badge;
    Paper.currentZoneAction = 'textBadge';
    return;
  }

  if (Paper.pendingMeasure) {
    // Clic dans un système → pose une mesure à cette abscisse sur les zones de CE
    // système (badge au-dessus de chacune), puis ajustable individuellement.
    if (!ensureCurrentPageVoicesAssigned()) {
      releasePointerAfterPrompt();
      return;
    } // alerte native → mouseup avalé
    var number = window.prompt('Numéro de mesure');
    releasePointerAfterPrompt(); // le prompt natif avale le mouseup → libère le guide
    if (number === null || number === '') return;
    lastPlacementCursorX = event.point.x;
    lastPlacementCursorY = event.point.y;
    setMeasureOnCurrentSystem(event.point, number);
    commit();
    Paper.redrawCurrentPage(); // redessine barres + guide (refreshPlacementGuide le remet)
    scoreParts.saveZones(function () {});
    // Mode persistant : on reste en "mesure" pour enchaîner plusieurs numéros
    // (comme le mode "new zone"). Sortie uniquement via le bouton Annuler.
    return;
  }

  if (Paper.pendingText) {
    // Miroir du mode mesure : clic dans un système → texte sur les zones de CE système.
    if (!ensureCurrentPageVoicesAssigned()) {
      releasePointerAfterPrompt();
      return;
    }
    var textStr = window.prompt('Texte');
    releasePointerAfterPrompt(); // le prompt natif avale le mouseup → libère le guide
    if (textStr === null || textStr === '') return;
    lastPlacementCursorX = event.point.x;
    lastPlacementCursorY = event.point.y;
    setTextOnCurrentSystem(event.point, textStr);
    commit();
    Paper.redrawCurrentPage(); // refreshPlacementGuide y remet la croix-guide
    scoreParts.saveZones(function () {});
    // Mode persistant : on reste en "texte" pour enchaîner plusieurs textes.
    return;
  }

  // Mode "new zone" : seul un clic dans le VIDE crée une zone. Un clic sur une
  // zone existante tombe dans le bloc commun ci-dessous (déplacement /
  // redimensionnement / suppression) : l'utilisateur n'est donc pas bloqué tant
  // qu'il est en mode pose — il crée dans le vide et ajuste les zones en place,
  // sans avoir à quitter le mode pour corriger une zone mal placée.
  if (Paper.pendingNewZone && !hitGroup) {
    if (!scoreParts.currentMovement) {
      alert('sélectionnez ou déclarez un mouvement');
      return;
    }
    var naturalW = scoreParts.naturalW || canvasW() || 1;
    var naturalH =
      scoreParts.naturalH || (Paper.activeCanvas ? Paper.activeCanvas.clientHeight : 1) || 1;
    var coefH = scoreParts.coefH || 1;
    var coefV = scoreParts.coefV || 1;
    var marginFraction = (scoreParts.margin || Paper.margin) / (naturalW * coefH);
    var zone = {
      x: marginFraction,
      y: event.point.y / (naturalH * coefV),
      width: 1.0 - 2 * marginFraction, // marge droite = marge gauche → reste dans la page
      height: Paper.defaultZoneHeight / (naturalH * coefV),
      page: scoreParts.currentPage,
      type: 'zone',
      voice: '',
      movement: scoreParts.currentMovement,
    };
    Paper.drawZone(zone, scoreParts.currentPage, true);
    commit();
    scoreParts.saveZones(function () {});
    return;
  }

  // Clic sur une zone (aucun badge sous le curseur) → démarrer une action (déplacement /
  // redimensionnement / suppression). zoneInteractiveAt est géométrique : il ignore les
  // badges enfants du groupe, donc la zone reste cliquable partout sauf sous une boîte de badge.
  // Atteint hors mode pose OU en mode pose sur une zone existante (cf. ci-dessus).
  if (hitGroup) {
    if (!hitGroup.data.isSelected) clearSelection();
    Paper.activeGroup = hitGroup;
    beginZoneAction(hitGroup, event.point);
    return;
  }

  // Clic dans le vide hors mode pose → démarrer le lasso. En mode pose, le vide
  // a déjà créé une zone ci-dessus.
  clearSelection();
  Paper.isLasso = true;
  Paper.lassoStart = event.point.clone();
}

function onCanvasMouseMove(event) {
  correctEventCoords(event);
  if (!Paper.activeCanvas) return;

  // Mode pose : la croix-guide prime sur tout (pas de survol de badge/zone).
  if (Paper.pendingMeasure || Paper.pendingText) {
    setBadgeHover(null);
    setHoverGroup(null);
    updatePlacementGuide(event.point.x, event.point.y);
    return;
  }
  // En mode "new zone" on laisse le survol des zones/badges actif : l'utilisateur
  // voit qu'il peut aussi ajuster une zone existante (poignées + curseur move/resize),
  // et seul le vide reste en croix (création). Pas de return anticipé ici.

  // Survol d'un badge (mesure puis texte) D'ABORD : la croix / la poignée apparaissent dès
  // qu'on survole la BOÎTE du badge (détection serrée : boîte + croix proche).
  var hoverHit = measureBadgeAt(event.point);
  if (hoverHit) {
    setHoverGroup(null);
    setBadgeHover(hoverHit.badge);
    Paper.activeCanvas.style.cursor = measureDeleteHit(hoverHit.badge, event.point)
      ? 'pointer'
      : 'move';
    return;
  }
  var textHover = textResizeAt(event.point) || textBadgeAt(event.point);
  if (textHover) {
    setHoverGroup(null);
    setBadgeHover(textHover.badge);
    if (textResizeHit(textHover.badge, event.point)) {
      Paper.activeCanvas.style.cursor = 'nwse-resize';
    } else {
      Paper.activeCanvas.style.cursor = textDeleteHit(textHover.badge, event.point)
        ? 'pointer'
        : 'move';
    }
    return;
  }
  setBadgeHover(null);

  // Sinon → survol de la zone (test géométrique : ignore les badges enfants du groupe).
  var group = zoneInteractiveAt(event.point);
  setHoverGroup(group);
  // Vide en mode "new zone" → croix (création) ; sinon curseur par défaut.
  var cursor = Paper.pendingNewZone ? 'crosshair' : 'default';
  if (group) {
    switch (hitRegion(group, event.point)) {
      case 'delete':
      case 'pill':
        cursor = 'pointer';
        break;
      case 'resizeTop':
      case 'resizeBot':
        cursor = 'ns-resize';
        break;
      default:
        cursor = 'move';
    }
  }
  Paper.activeCanvas.style.cursor = cursor;
}

// Affiche les poignées de la zone survolée uniquement (comme le hover CSS module).
function setHoverGroup(group) {
  if (group === hoverGroup) return;
  if (hoverGroup && hoverGroup.data && hoverGroup.data.handles) {
    hoverGroup.data.handles.forEach(function (h) {
      h.visible = false;
    });
  }
  hoverGroup = group;
  if (hoverGroup && hoverGroup.data && hoverGroup.data.handles) {
    hoverGroup.data.handles.forEach(function (h) {
      h.visible = true;
    });
  }
  if (paper.view) paper.view.update();
}

// Retourne le groupe de zone sous un point (ou null).
// Zone dont la région interactive (corps, bords haut/bas, pastille, croix) contient le
// point — calcul GÉOMÉTRIQUE volontaire : le hitTest Paper.js capterait aussi les badges
// (mesure/texte) enfants du groupe et « volerait » le survol/clic de la zone. Ici la zone
// est PRIORITAIRE sur les badges qui la chevauchent près de ses bords.
function zoneInteractiveAt(point) {
  var groups = currentZoneGroups();
  for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    var group = groups[groupIndex];
    var rect = group.data.rect.bounds;
    var withinX = point.x >= rect.left && point.x <= rect.right;
    var overBody = withinX && point.y >= rect.top && point.y <= rect.bottom;
    var overTopEdge = withinX && Math.abs(point.y - rect.top) < EDGE_GRAB;
    var overBotEdge = withinX && Math.abs(point.y - rect.bottom) < EDGE_GRAB;
    var overPill = group.data.pillBounds && group.data.pillBounds.contains(point);
    var overDelete = point.getDistance(deleteBadgeCenter(rect)) < BADGE_GRAB;
    if (overBody || overTopEdge || overBotEdge || overPill || overDelete) return group;
  }
  return null;
}

// Région cliquée d'une zone, calculée sur le RECTANGLE (pas le groupe, qui inclut
// la pastille débordant en haut). Ordre de priorité : croix > pastille > bords.
function hitRegion(group, point) {
  var rect = group.data.rect.bounds;
  if (point.getDistance(deleteBadgeCenter(rect)) < BADGE_GRAB) return 'delete';
  if (group.data.pillBounds && group.data.pillBounds.contains(point)) return 'pill';
  if (Math.abs(point.y - rect.top) < EDGE_GRAB) return 'resizeTop';
  if (Math.abs(point.y - rect.bottom) < EDGE_GRAB) return 'resizeBot';
  return 'move';
}

// ============== Interactions sur une zone
// Une action de zone manipule un groupe au pointeur (déplacement / redimensionnement).
function isZoneAction(action) {
  return (
    action === 'moveZone' ||
    action === 'resizeTop' ||
    action === 'resizeBot' ||
    action === 'measureBadge' ||
    action === 'textBadge'
  );
}

// Démarre une action sur la zone `group` au point papier `point` (déjà corrigé du
// zoom CSS). Appelé depuis onCanvasMouseDown — pas un handler d'item Paper.js.
function beginZoneAction(group, point) {
  Paper.currentZoneAction = null;
  var region = hitRegion(group, point);

  if (region === 'delete') {
    Paper.currentZoneAction = 'removeZone';
    Paper.deleteZone(group);
    if (hoverGroup === group) hoverGroup = null;
    if (Paper.activeGroup === group) Paper.activeGroup = null;
    // Écrit le modèle directement (writeCurrentPageZones ignore une page vidée) :
    // indispensable pour supprimer la DERNIÈRE zone.
    scoreParts.allPagesZones.pages[scoreParts.currentPage] = Paper.getPageZones();
    scoreParts.currentZones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
    scoreParts.saveZones(function () {}); // enregistrement immédiat
    return;
  }
  if (region === 'pill') {
    // Réservé à l'affectation de voix (phase voices). Aucun effet pour l'instant.
    return;
  }
  if (region === 'resizeTop' || region === 'resizeBot') {
    Paper.currentZoneAction = region;
    Paper.currentPath = group.data.rect;
    // Masque les décorations pendant le redimensionnement (évite de déformer le
    // texte de la pastille) — elles sont redessinées proprement au relâchement.
    if (group.data.isSelected && selectedGroups.length > 1) {
      selectedGroups.forEach(function (selectedGroup) {
        hideDecorations(selectedGroup);
      });
    } else {
      hideDecorations(group);
    }
  } else {
    Paper.currentZoneAction = 'moveZone';
  }
}

// Redimensionne un groupe sur la hauteur d'un delta vertical. fromTop=true →
// bord haut saisi (le bas reste fixe) ; false → bord bas saisi (le haut reste fixe).
// Renvoie false si la hauteur cible passe sous le minimum (resize ignoré).
function resizeGroupHeight(group, deltaY, fromTop) {
  var groupRect = group.data.rect.bounds;
  var targetHeight = fromTop ? groupRect.height - deltaY : groupRect.height + deltaY;
  if (targetHeight < MIN_ZONE_HEIGHT) return false;
  var anchor = fromTop ? groupRect.bottomLeft : groupRect.topLeft;
  group.scale(1, targetHeight / groupRect.height, anchor);
  return true;
}

// Applique le déplacement `delta` (déjà corrigé du zoom CSS) à la zone `group`
// selon l'action courante. Appelé depuis onCanvasMouseDrag.
function dragZoneAction(group, delta) {
  if (!scoreParts.currentMovement) return;
  var isMultiResize = group.data.isSelected && selectedGroups.length > 1;
  if (Paper.currentZoneAction === 'resizeBot') {
    if (isMultiResize) {
      selectedGroups.forEach(function (selectedGroup) {
        resizeGroupHeight(selectedGroup, delta.y, false);
      });
    } else {
      resizeGroupHeight(group, delta.y, false);
    }
  } else if (Paper.currentZoneAction === 'resizeTop') {
    if (isMultiResize) {
      selectedGroups.forEach(function (selectedGroup) {
        resizeGroupHeight(selectedGroup, delta.y, true);
      });
    } else {
      resizeGroupHeight(group, delta.y, true);
    }
  } else if (Paper.currentZoneAction === 'moveZone') {
    if (isMultiResize) {
      selectedGroups.forEach(function (selectedGroup) {
        selectedGroup.position.y += delta.y;
      });
    } else {
      group.position.y += delta.y;
    }
  }
}

// Termine l'action de zone : persiste et redessine. Appelé depuis onCanvasMouseUp.
function endZoneAction() {
  var action = Paper.currentZoneAction;
  if (isZoneAction(action)) {
    commit();
    // Vider la sélection avant le redraw (les groupes vont être recrées).
    selectedGroups = [];
    if (Paper.onSelectionChange) Paper.onSelectionChange(0);
    Paper.redrawCurrentPage();
    scoreParts.saveZones(function () {});
  }
  Paper.currentZoneAction = null;
}

function hideDecorations(group) {
  if (group.data.pill) group.data.pill.visible = false;
  if (group.data.measureBadges)
    group.data.measureBadges.forEach(function (badge) {
      badge.visible = false;
    });
  if (group.data.textBadges)
    group.data.textBadges.forEach(function (badge) {
      badge.visible = false;
    });
  if (group.data.handles) {
    group.data.handles.forEach(function (h) {
      h.visible = false;
    });
  }
}

// ============== Lecture du modèle depuis le canvas courant
// Lit les zones d'un projet Paper donné (déjà activé) et les renvoie normalisées
// en fractions 0→1. canvasW = naturalW * coefH, canvasH = naturalH * coefV.
// stored_y = canvas_y / canvasH → drawZone: top = stored_y * canvasH ✓
// PDF backend: png_y = stored_y * naturalH (avec coefV=1/naturalH depuis leftPanel.js).
function readZonesFromProject(project) {
  var naturalW = scoreParts.naturalW || 1;
  var naturalH = scoreParts.naturalH || 1;
  var coefH = scoreParts.coefH || 1;
  var coefV = scoreParts.coefV || 1;
  var canvasH = naturalH * coefV;
  var canvasWval = naturalW * coefH;
  var zones = [];
  project.getItems({ recursive: true }).forEach(function (item) {
    if (item.data && item.data.type === 'zone') {
      var measures = item.data.measures;
      var texts = item.data.texts;
      zones.push({
        x: item.bounds.x / canvasWval,
        y: item.bounds.y / canvasH,
        width: item.bounds.width / canvasWval,
        height: item.bounds.height / canvasH,
        page: item.data.page,
        voice: item.data.voice,
        movement: item.data.movement,
        measures: measures
          ? measures.map(function (measure) {
              return {
                x: measure.x / canvasWval,
                y: measure.y / canvasH,
                number: measure.number,
                fontFrac: MEASURE_FONT_PX / canvasH,
              };
            })
          : undefined,
        texts: texts
          ? texts.map(function (text) {
              // fontFrac = taille / hauteur canvas → indépendant du zoom/échelle ; sert à
              // restaurer fontPx au rechargement et à dimensionner la police PDF.
              return {
                x: text.x / canvasWval,
                y: text.y / canvasH,
                text: text.text,
                fontFrac: (text.fontPx || TEXT_FONT_PX) / canvasH,
              };
            })
          : undefined,
      });
    }
  });
  zones.sort(function (a, b) {
    if (a.y > b.y) return 1;
    if (a.y < b.y) return -1;
    return 0;
  });
  // Pas de voix inventée : une zone sans voix reste sans voix (zoneColors la rend
  // neutre, l'auto-attribution la remplira). Inventer '1','2'… créait des IDs de
  // voix inexistants dans state.VOICES.
  return zones;
}

// On ne garde que les chemins de zone (data.type === 'zone'), donc le rect.
Paper.getPageZones = function () {
  if (!paper || !paper.project) return [];
  activateCurrent(); // lit toujours le projet de la page courante
  return readZonesFromProject(paper.project);
};

// Flush les DEUX pages visibles du spread vers le modèle (allPagesZones).
// writeCurrentPageZones ne capture que la page courante : sur un spread 2 pages,
// les zones fraîchement dessinées sur l'autre page visible n'étaient jamais
// flushées avant l'auto-attribution → elles restaient sans voix.
Paper.writeVisibleSpreadZones = function () {
  if (!paper) return;
  var origin = scoreParts.spreadOrigin();
  var visiblePages = [{ canvasId: 'canvas-left', pageIndex: origin }];
  if (!scoreParts.singlePage) {
    visiblePages.push({ canvasId: 'canvas-right', pageIndex: origin + 1 });
  }
  visiblePages.forEach(function (visiblePage) {
    var project = projectsByCanvasId[visiblePage.canvasId];
    if (!project) return;
    project.activate();
    var zones = readZonesFromProject(project);
    if (zones.length === 0) return; // ne pas écraser une page qui a des zones par []
    scoreParts.allPagesZones.pages[visiblePage.pageIndex] = zones;
  });
  activateCurrent();
};

// ============== Dessin des zones (style module)
Paper.drawZones = function (zones) {
  if (!zones) return;
  zones.forEach(function (zone) {
    Paper.drawZone(zone, scoreParts.currentPage, true);
  });
};

// pageIndex : page à laquelle appartient la zone (taggue path.data.page).
// interactive : true → poignées + croix + drag/resize/suppression ; false →
// zone figée (visible sur une page non courante).
Paper.drawZone = function (zone, pageIndex, interactive) {
  if (pageIndex == null) pageIndex = scoreParts.currentPage;
  // Dénormaliser les fractions stockées vers des pixels canvas courants.
  // naturalW * coefH = canvasW, naturalH * coefV = canvasH.
  var naturalW = scoreParts.naturalW || 1;
  var naturalH = scoreParts.naturalH || 1;
  var coefH = scoreParts.coefH || 1;
  var coefV = scoreParts.coefV || 1;
  var left = Math.round(zone.x * naturalW * coefH);
  var right = Math.round((zone.x + zone.width) * naturalW * coefH);
  var top = Math.round(zone.y * naturalH * coefV);
  var bottom = Math.round((zone.y + zone.height) * naturalH * coefV);
  var midX = (left + right) / 2;

  // Rectangle de la zone (corps).
  var rectangle = new paper.Rectangle(new paper.Point(left, top), new paper.Point(right, bottom));
  var colors = zoneColors(zone);
  var path = new paper.Path.Rectangle(rectangle, ZONE_RADIUS);
  path.fillColor = colors.fill;
  path.strokeColor = colors.stroke;
  path.strokeWidth = 1.5;
  path.data.type = 'zone';
  path.data.page = pageIndex;
  if (zone.voice) path.data.voice = zone.voice;
  if (zone.movement) path.data.movement = zone.movement;
  // Compat ascendante : anciennes zones avec une mesure unique (zone.measure) →
  // promues en tableau à un élément avant rendu.
  if (zone.measure && !zone.measures) zone.measures = [zone.measure];
  // measures (x, y de chaque badge) stockées en PIXELS-canvas sur le path ;
  // readZonesFromProject re-normalise en fractions. zone.measures vient du modèle en
  // fractions → on dénormalise ici (x ET y, chaque badge étant positionnable librement).
  if (zone.measures) {
    path.data.measures = zone.measures.map(function (measure) {
      return {
        x: Math.round(measure.x * naturalW * coefH),
        y: Math.round(measure.y * naturalH * coefV),
        number: measure.number,
      };
    });
  }
  // Compat ascendante : ancien texte unique (zone.text) → promu en tableau.
  if (zone.text && !zone.texts) zone.texts = [zone.text];
  // texts (x, y de chaque badge) stockés en PIXELS-canvas sur le path ; même
  // dénormalisation que les mesures. Un texte est PROPRE à sa zone (pas de propagation).
  if (zone.texts) {
    var canvasHpx = naturalH * coefV;
    path.data.texts = zone.texts.map(function (text) {
      return {
        x: Math.round(text.x * naturalW * coefH),
        y: Math.round(text.y * naturalH * coefV),
        text: text.text,
        // fontFrac (fraction de hauteur canvas) → taille en pixels canvas courants.
        fontPx: text.fontFrac ? Math.round(text.fontFrac * canvasHpx) : TEXT_FONT_PX,
      };
    });
  }

  var group = new paper.Group([path]);
  group.data.role = 'zoneGroup';
  group.data.rect = path;

  // Pastille de voix — toujours visible, chevauche le bord haut. Couleur + nom
  // de la voix affectée (zone.voice), sinon neutre.
  var pill = makePill(colors.label, left + 1, top, colors.pill);
  group.addChild(pill);
  group.data.pill = pill;
  group.data.pillBounds = pill.bounds;

  // Badges de mesure (la zone peut en porter plusieurs), chacun à sa position propre —
  // rendus aussi sur les pages figées.
  if (path.data.measures) {
    path.data.measures.forEach(function (measure) {
      Paper.drawMeasure(group, measure);
    });
  }

  // Badges de texte (propres à la zone), chacun à sa position — rendus aussi figés.
  if (path.data.texts) {
    path.data.texts.forEach(function (text) {
      Paper.drawText(group, text);
    });
  }

  // Page non courante : zone figée et lisible, sans poignées ni interactions.
  if (!interactive) {
    Paper.currentPath = path;
    return group;
  }

  // Poignées de redimensionnement (haut + bas) — visibles au survol.
  var gripTop = makeGrip(midX, top);
  var gripBot = makeGrip(midX, bottom);

  // Croix de suppression (coin haut-droit) — visible au survol.
  var deleteBadge = makeDeleteBadge(deleteBadgeCenter(path.bounds));

  group.addChildren([gripTop, gripBot, deleteBadge]);
  group.data.handles = [gripTop, gripBot, deleteBadge];
  group.data.handles.forEach(function (h) {
    h.visible = false; // révélées au survol (comme le hover CSS du module)
  });

  // Interactions gérées par le Tool (onCanvasMouse*) via hitTest manuel corrigé
  // du zoom CSS — pas de handler d'item Paper.js (dispatch non corrigé du zoom).

  scoreParts.modified = true;
  Paper.currentPath = path;
  return group;
};

// Pastille arrondie (fond coloré + texte blanc), ancrée par son coin haut-gauche
// sur (leftX, centerY) → centrée verticalement sur le bord haut de la zone.
function makePill(text, leftX, centerY, pillColor) {
  var label = new paper.PointText(new paper.Point(0, 0));
  label.content = text;
  label.fontFamily = 'Inter, system-ui, sans-serif';
  label.fontWeight = 'bold';
  label.fontSize = 10;
  label.fillColor = 'white';
  var padX = 7;
  var padY = 3;
  var w = label.bounds.width + padX * 2;
  var h = label.bounds.height + padY * 2;
  var topLeft = new paper.Point(leftX, centerY - h / 2);
  var bg = new paper.Path.Rectangle(new paper.Rectangle(topLeft, new paper.Size(w, h)), 3);
  bg.fillColor = pillColor || PILL_BG;
  label.position = bg.bounds.center;
  var pill = new paper.Group([bg, label]);
  pill.data.role = 'pill';
  return pill;
}

// Barre de préhension (poignée resize), centrée en (cx, cy).
function makeGrip(cx, cy) {
  var grip = new paper.Path.Line(new paper.Point(cx - 14, cy), new paper.Point(cx + 14, cy));
  grip.strokeColor = ZONE_STROKE;
  grip.strokeWidth = 3;
  grip.strokeCap = 'round';
  grip.opacity = 0.7;
  return grip;
}

// Pastille croix (cercle blanc + ×) centrée sur `center`.
function makeDeleteBadge(center) {
  var circle = new paper.Path.Circle(center, 8);
  circle.fillColor = 'white';
  circle.strokeColor = ZONE_STROKE;
  circle.strokeWidth = 1;
  var a = new paper.Path.Line(center.add([-3, -3]), center.add([3, 3]));
  var b = new paper.Path.Line(center.add([3, -3]), center.add([-3, 3]));
  a.strokeColor = b.strokeColor = ZONE_STROKE;
  a.strokeWidth = b.strokeWidth = 1.5;
  a.strokeCap = b.strokeCap = 'round';
  return new paper.Group([circle, a, b]);
}

// Badge de mesure ajouté au groupe de zone (suit déplacement / redimensionnement).
// Une zone peut porter PLUSIEURS badges (group.data.measureBadges) ; chaque badge
// référence SA mesure (badge.data.measure) pour déplacement/suppression unitaires.
// Volontairement minimal pour NE PAS masquer la partition : NUMÉRO noir dans un petit
// carré TRANSPARENT (juste un contour), ancré par son coin haut-gauche en (measure.x,
// measure.y). Une croix de suppression (masquée hors survol) efface cette mesure seule.
Paper.drawMeasure = function (group, measure) {
  var label = new paper.PointText(new paper.Point(0, 0));
  label.content = String(measure.number);
  label.fontFamily = 'Inter, system-ui, sans-serif';
  label.fontWeight = 'bold';
  label.fontSize = MEASURE_FONT_PX;
  label.fillColor = 'black';
  var padX = 4;
  var padY = 1;
  var badgeW = label.bounds.width + padX * 2;
  var badgeH = label.bounds.height + padY * 2;
  var badgeBg = new paper.Path.Rectangle(
    new paper.Rectangle(new paper.Point(measure.x, measure.y), new paper.Size(badgeW, badgeH)),
    2
  );
  badgeBg.fillColor = null; // carré transparent
  badgeBg.strokeColor = MEASURE_COLOR;
  badgeBg.strokeWidth = 0.75;
  label.position = badgeBg.bounds.center;

  // Croix de suppression DÉCALÉE hors du carré (coin haut-droit, vers l'extérieur)
  // pour ne pas chevaucher le corps du badge, révélée au survol (cf. setBadgeHover).
  var cross = makeDeleteBadge(badgeBg.bounds.topRight.add(new paper.Point(3, -3)));
  cross.visible = false;

  var badge = new paper.Group([badgeBg, label, cross]);
  badge.data.role = 'measureBar';
  badge.data.measure = measure; // ref vers l'objet de path.data.measures que ce badge représente
  badge.data.measureBar = badgeBg;
  badge.data.measureDelete = cross;
  group.addChild(badge);
  if (!group.data.measureBadges) group.data.measureBadges = [];
  group.data.measureBadges.push(badge);
  return badge;
};

// Badge de texte ajouté au groupe de zone — miroir de drawMeasure mais PAR ZONE.
// Une zone peut porter plusieurs textes (group.data.textBadges) ; chaque badge référence
// SON texte (badge.data.text) pour déplacement/suppression unitaires. Rendu : texte bleu
// dans un rectangle transparent, ancré par son coin haut-gauche en (text.x, text.y).
Paper.drawText = function (group, text) {
  var fontPx = text.fontPx || TEXT_FONT_PX; // taille propre à CE texte (réglable à la poignée)
  var label = new paper.PointText(new paper.Point(0, 0));
  label.content = String(text.text);
  label.fontFamily = 'Inter, system-ui, sans-serif';
  label.fontWeight = 'bold';
  label.fontSize = fontPx;
  label.fillColor = 'black'; // police noire (à l'écran comme en sortie PDF)
  var padX = 4;
  var padY = 1;
  var badgeW = label.bounds.width + padX * 2;
  var badgeH = label.bounds.height + padY * 2;
  var badgeBg = new paper.Path.Rectangle(
    new paper.Rectangle(new paper.Point(text.x, text.y), new paper.Size(badgeW, badgeH)),
    2
  );
  badgeBg.fillColor = null; // rectangle transparent (le contour bleu reste un repère d'édition)
  badgeBg.strokeColor = TEXT_COLOR;
  badgeBg.strokeWidth = 0.75;
  label.position = badgeBg.bounds.center;

  // Croix de suppression DÉCALÉE hors du rectangle (coin haut-droit), révélée au survol.
  var cross = makeDeleteBadge(badgeBg.bounds.topRight.add(new paper.Point(3, -3)));
  cross.visible = false;

  // Poignée de redimensionnement (coin bas-droit) — glisser pour changer la taille du
  // texte. Révélée au survol comme la croix.
  var resizeHandle = makeTextResizeHandle(badgeBg.bounds.bottomRight);
  resizeHandle.visible = false;

  var badge = new paper.Group([badgeBg, label, cross, resizeHandle]);
  badge.data.role = 'textBar';
  badge.data.text = text; // ref vers l'objet de path.data.texts que ce badge représente
  badge.data.textBar = badgeBg;
  badge.data.textDelete = cross;
  badge.data.textResize = resizeHandle;
  group.addChild(badge);
  if (!group.data.textBadges) group.data.textBadges = [];
  group.data.textBadges.push(badge);
  return badge;
};

// Petit carré plein servant de poignée de redimensionnement d'un badge de texte.
function makeTextResizeHandle(center) {
  var size = 7;
  var handle = new paper.Path.Rectangle(
    new paper.Rectangle(
      center.subtract(new paper.Point(size / 2, size / 2)),
      new paper.Size(size, size)
    ),
    1
  );
  handle.fillColor = 'white';
  handle.strokeColor = TEXT_COLOR;
  handle.strokeWidth = 1;
  return handle;
}

// ============== Suppression
Paper.deleteZones = function () {
  if (!paper || !paper.project) return;
  paper.project.activeLayer.removeChildren();
  hoverGroup = null;
  placementGuide = null; // removeChildren a détaché le guide → on oublie la réf
  if (paper.view) paper.view.update();
  scoreParts.modified = true;
};

Paper.deleteZone = function (group) {
  group.removeChildren();
  group.remove();
  if (paper.view) paper.view.update();
  scoreParts.modified = true;
};

// Redessine les deux pages du spread depuis le modèle (allPagesZones) sans
// recréer les projets ni recaler les canvas. Utilisé après effacer/auto-attribuer.
Paper.redrawSpread = function () {
  var ids = ['canvas-left', 'canvas-right'];
  var sysIds = ['systems-left', 'systems-right'];
  var origin = scoreParts.spreadOrigin();
  ids.forEach(function (canvasId, sideIndex) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || canvas.width === 0) return;
    var imgEl = document.querySelector('#' + sysIds[sideIndex] + ' canvas');
    if (!imgEl) return;
    var pageIndex = scoreParts.singlePage ? origin : origin + sideIndex;
    var isCurrent = canvasId === Paper.currentCanvasId;
    Paper.renderPage(canvas, imgEl, pageIndex, isCurrent);
  });
};

// Re-dessine les zones de la page COURANTE depuis le modèle (canvas courant).
Paper.redrawCurrentPage = function () {
  if (!paper || !paper.project) return;
  activateCurrent();
  paper.project.activeLayer.removeChildren();
  hoverGroup = null;
  selectedGroups = [];
  placementGuide = null; // removeChildren a détaché le guide → on oublie la réf avant refreshPlacementGuide
  var zones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
  if (zones && zones.length > 0) {
    scoreParts.currentZones = zones;
    Paper.drawZones(zones);
  }
  refreshPlacementGuide(); // removeChildren a effacé le guide → on le remet en mode mesure
  if (paper.view) paper.view.update();
};

// ============== Sélection de toutes les zones de la page courante
Paper.selectAllZones = function () {
  if (!paper || !paper.project) return;
  activateCurrent();
  clearSelection(); // retire toute sélection précédente
  paper.project.activeLayer.children.forEach(function (item) {
    if (item.data && item.data.role === 'zoneGroup') {
      setGroupSelected(item, true);
      selectedGroups.push(item);
    }
  });
  if (Paper.onSelectionChange) Paper.onSelectionChange(selectedGroups.length);
};

// ============== Suppression multiple
Paper.deleteSelectedZones = function () {
  if (!selectedGroups.length) return;
  selectedGroups.forEach(function (g) {
    Paper.deleteZone(g);
  });
  selectedGroups = [];
  commit();
  scoreParts.saveZones(function () {});
  if (Paper.onSelectionChange) Paper.onSelectionChange(0);
};

// ============== Helpers
function commit() {
  scoreParts.writeCurrentPageZones();
}
