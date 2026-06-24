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
import { state } from '../modules/partitions.state.js';

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



// ============== État privé
var projectsByCanvasId = {}; // id de canvas → projet Paper (un par page)
var wiredCanvases = {}; // id de canvas → listeners DOM déjà posés
var isPointerDown = false; // bouton souris enfoncé (drag en cours)
var hoverGroup = null; // zone actuellement survolée (poignées visibles)
var selectedGroups = []; // zones sélectionnées par lasso
var lastCorrectedPoint = null; // dernier point projet corrigé (pour recalculer event.delta)

Paper.pendingNewZone = false; // mode "nouvelle zone" (persistant tant qu'activé)
Paper.pendingMeasure = false; // mode "mesure" (pose/efface un numéro de mesure au clic)
Paper.onMeasurePendingChange = null; // hook posé par scorePlayer pour rafraîchir l'UI
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
  if (imgEl && imgEl.naturalWidth) {
    scoreParts.naturalW = imgEl.naturalWidth;
    scoreParts.naturalH = imgEl.naturalHeight;
    scoreParts.coefV = canvas.clientHeight / imgEl.naturalHeight;
    scoreParts.coefH = canvas.clientWidth / imgEl.naturalWidth;
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
    if (Paper.onSelectionChange) Paper.onSelectionChange(0);
  }
  var zones = scoreParts.allPagesZones.pages[pageIndex];
  if (zones && zones.length > 0) {
    // Migration best-effort : zones en anciens pixels canvas (y > 1) → fractions.
    // Exact seulement si le viewport courant est proche du viewport d'origine,
    // mais meilleur que de laisser les coords incohérentes.
    var needsMigration = zones.some(function (z) { return z.y > 1 || z.height > 1; });
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
    var needsClamp = zones.some(function (z) { return z.x < 0 || z.x + z.width > 1; });
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
  if (isPointerDown) return; // pendant un drag, le listener window gère le mouvement
  focusCanvas(nativeEvent.currentTarget);
  onCanvasMouseMove(makeToolEvent(nativeEvent, false));
}

function onNativeMouseDown(nativeEvent) {
  focusCanvas(nativeEvent.currentTarget);
  isPointerDown = true;
  lastCorrectedPoint = null; // repart proprement pour le calcul des deltas
  onCanvasMouseDown(makeToolEvent(nativeEvent, false));
  // Le drag et le relâchement sont suivis au niveau window : le pointeur peut
  // sortir du canvas pendant un déplacement/lasso sans interrompre l'action.
  window.addEventListener('mousemove', onNativeDrag);
  window.addEventListener('mouseup', onNativeMouseUp);
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

// ============== Mode "nouvelle zone" (activable / désactivable)
Paper.setPending = function (on) {
  Paper.pendingNewZone = on;
  if (on && Paper.pendingMeasure) Paper.setPendingMeasure(false); // modes exclusifs
  if (Paper.onPendingChange) Paper.onPendingChange(on);
};

// ============== Mode "mesure" (pose / efface un numéro au clic) — miroir exclusif
// du mode "nouvelle zone".
Paper.setPendingMeasure = function (on) {
  Paper.pendingMeasure = on;
  if (on && Paper.pendingNewZone) Paper.setPending(false); // modes exclusifs
  if (on) {
    refreshMeasureGuide(); // affiche le guide dès l'entrée du mode (sans attendre un mousemove)
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = 'crosshair';
  } else {
    clearMeasureGuide(); // retire la barre-guide en sortie de mode
    if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = '';
  }
  if (Paper.onMeasurePendingChange) Paper.onMeasurePendingChange(on);
};

// Barre-guide verticale (pointillés) qui suit le curseur en mode mesure : aide à
// viser l'abscisse avant de poser. Non persistée (data.role ≠ 'zone').
var measureGuide = null;
var lastMeasureCursorX = null; // dernière abscisse connue du curseur en mode mesure
function updateMeasureGuide(xpx) {
  if (!paper || !paper.project) return;
  lastMeasureCursorX = xpx;
  clearMeasureGuide();
  var height = (Paper.activeCanvas && Paper.activeCanvas.clientHeight) || 0;
  var line = new paper.Path.Line(new paper.Point(xpx, 0), new paper.Point(xpx, height));
  line.strokeColor = MEASURE_COLOR;
  line.strokeWidth = 1;
  line.dashArray = [4, 4];
  line.data.role = 'measureGuide';
  measureGuide = line;
  if (Paper.activeCanvas) Paper.activeCanvas.style.cursor = 'crosshair';
  if (paper.view) paper.view.update();
}
function clearMeasureGuide() {
  if (measureGuide) { measureGuide.remove(); measureGuide = null; }
  if (paper && paper.view) paper.view.update();
}
// Redessine le guide à la dernière abscisse connue : appelé après chaque redraw
// (removeChildren l'efface) et à l'entrée du mode, pour qu'il reste visible sans
// attendre un mouvement de souris (sinon « figé » pendant le prompt / « disparu »).
function refreshMeasureGuide() {
  if (Paper.pendingMeasure && lastMeasureCursorX != null) updateMeasureGuide(lastMeasureCursorX);
}

// Groupes de zone du projet (page) actuellement actif.
function currentZoneGroups() {
  if (!paper || !paper.project) return [];
  return paper.project.activeLayer.children.filter(function (item) {
    return item.data && item.data.role === 'zoneGroup';
  });
}

// Pose INITIALE : même abscisse (measureXpx) sur TOUTES les zones de la page, le
// badge juste au-dessus du haut de chaque zone. Ensuite chaque badge se déplace
// individuellement (x, y) sans re-propagation (cf. moveMeasureBadge).
var INITIAL_MEASURE_OFFSET = 16; // px au-dessus du haut de la zone à la pose
function setMeasureOnCurrentPage(measureXpx, number) {
  currentZoneGroups().forEach(function (group) {
    var rect = group.data.rect;
    if (!rect.data.measures) rect.data.measures = [];
    // Plusieurs mesures par zone (voix/portée) : on AJOUTE, sans écraser les précédentes.
    rect.data.measures.push({ x: measureXpx, y: rect.bounds.top - INITIAL_MEASURE_OFFSET, number: number });
  });
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
      if (badge.data.measureBar.bounds.contains(point)) return { group: group, badge: badge, measure: badge.data.measure };
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

// Survol d'un badge : révèle SA croix de suppression, masque celle précédemment survolée.
var hoveredBadge = null;
function setBadgeHover(badge) {
  if (badge === hoveredBadge) return;
  if (hoveredBadge && hoveredBadge.data.measureDelete) hoveredBadge.data.measureDelete.visible = false;
  hoveredBadge = badge;
  if (hoveredBadge && hoveredBadge.data.measureDelete) hoveredBadge.data.measureDelete.visible = true;
  if (paper.view) paper.view.update();
}

// ============== Sélection multiple (lasso)
function clearSelection() {
  selectedGroups.forEach(function (g) { setGroupSelected(g, false); });
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
  if (isZoneAction(Paper.currentZoneAction)) {
    if (Paper.activeGroup) dragZoneAction(Paper.activeGroup, event.delta);
    return;
  }
  if (!Paper.isLasso) return;
  if (Paper.lassoPath) { Paper.lassoPath.remove(); Paper.lassoPath = null; }
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
  if (isZoneAction(Paper.currentZoneAction)) {
    endZoneAction();
    Paper.activeGroup = null;
    Paper.activeMeasureBadge = null;
    return;
  }
  if (!Paper.isLasso) return;
  Paper.isLasso = false;
  if (Paper.lassoPath) { Paper.lassoPath.remove(); Paper.lassoPath = null; }
  var start = Paper.lassoStart;
  Paper.lassoStart = null;
  if (!start) return;
  var dx = Math.abs(event.point.x - start.x);
  var dy = Math.abs(event.point.y - start.y);
  if (dx < 5 && dy < 5) { if (paper.view) paper.view.update(); return; }
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
  var hitGroup = zoneGroupAt(event.point);

  // Badge de mesure interactif EN TOUT TEMPS (hors mode mesure aussi) : croix →
  // supprime CETTE mesure ; sinon → saisie pour déplacer ce badge (x, y).
  var measureHit = measureBadgeAt(event.point);
  if (measureHit) {
    if (measureDeleteHit(measureHit.badge, event.point)) {
      deleteMeasureFromZone(measureHit.group, measureHit.measure);
      return;
    }
    Paper.activeMeasureBadge = measureHit.badge;
    Paper.currentZoneAction = 'measureBadge';
    clearMeasureGuide();
    return;
  }

  if (Paper.pendingMeasure) {
    // Clic ailleurs (n'importe où sur la feuille) → pose une mesure à cette abscisse
    // sur toutes les zones (badge au-dessus de chacune), puis ajustable individuellement.
    var number = window.prompt('Numéro de mesure');
    if (number === null || number === '') return;
    lastMeasureCursorX = event.point.x;
    setMeasureOnCurrentPage(event.point.x, number);
    commit();
    Paper.redrawCurrentPage(); // redessine barres + guide (refreshMeasureGuide)
    scoreParts.saveZones(function () {});
    Paper.setPendingMeasure(false); // une mesure posée → on sort du mode (badges restent ajustables)
    return;
  }

  if (Paper.pendingNewZone) {
    if (!scoreParts.currentMovement) {
      alert('sélectionnez ou déclarez un mouvement');
      return;
    }
    if (hitGroup) return; // ne pas créer par-dessus une zone existante
    var naturalW = scoreParts.naturalW || canvasW() || 1;
    var naturalH = scoreParts.naturalH || (Paper.activeCanvas ? Paper.activeCanvas.clientHeight : 1) || 1;
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

  // Clic sur une zone → démarrer une action (déplacement / redimensionnement /
  // suppression). Tout passe par le Tool : ses coords sont remappées par
  // correctEventCoords(), contrairement au dispatch d'event d'item de Paper.js qui
  // utilise le point écran brut et rate les zones au zoom > 1.
  if (hitGroup) {
    if (!hitGroup.data.isSelected) clearSelection();
    Paper.activeGroup = hitGroup;
    beginZoneAction(hitGroup, event.point);
    return;
  }

  // Clic dans le vide → démarrer le lasso.
  clearSelection();
  Paper.isLasso = true;
  Paper.lassoStart = event.point.clone();
}

function onCanvasMouseMove(event) {
  correctEventCoords(event);
  if (!Paper.activeCanvas) return;
  // Survol d'un badge de mesure EN TOUT TEMPS → révèle sa croix + curseur déplacement.
  var hoverHit = measureBadgeAt(event.point);
  if (hoverHit) {
    setBadgeHover(hoverHit.badge);
    clearMeasureGuide();
    Paper.activeCanvas.style.cursor = measureDeleteHit(hoverHit.badge, event.point) ? 'pointer' : 'move';
    return;
  }
  setBadgeHover(null);
  if (Paper.pendingMeasure) { updateMeasureGuide(event.point.x); return; } // barre-guide qui suit le curseur
  if (Paper.pendingNewZone) return; // curseur crosshair géré en CSS
  var group = zoneGroupAt(event.point);
  setHoverGroup(group);
  var cursor = 'default';
  if (group) {
    switch (hitRegion(group, event.point)) {
      case 'delete':
        cursor = 'pointer';
        break;
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
function zoneGroupAt(point) {
  var hitResult = paper.project.hitTest(point, HIT_OPTIONS);
  if (!hitResult || !hitResult.item) return null;
  return zoneGroupOf(hitResult.item);
}
function zoneGroupOf(item) {
  var node = item;
  while (node) {
    if (node.data && node.data.role === 'zoneGroup') return node;
    node = node.parent;
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
  return action === 'moveZone' || action === 'resizeTop' || action === 'resizeBot' || action === 'measureBadge';
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
    hideDecorations(group);
  } else {
    Paper.currentZoneAction = 'moveZone';
  }
}

// Applique le déplacement `delta` (déjà corrigé du zoom CSS) à la zone `group`
// selon l'action courante. Appelé depuis onCanvasMouseDrag.
function dragZoneAction(group, delta) {
  if (!scoreParts.currentMovement) return;
  var rect = group.data.rect.bounds;
  if (Paper.currentZoneAction === 'resizeBot') {
    // Bord bas : le haut reste fixe.
    var newHeightBot = rect.height + delta.y;
    if (newHeightBot < MIN_ZONE_HEIGHT) return;
    group.scale(1, newHeightBot / rect.height, rect.topLeft);
  } else if (Paper.currentZoneAction === 'resizeTop') {
    // Bord haut : le bas reste fixe.
    var newHeightTop = rect.height - delta.y;
    if (newHeightTop < MIN_ZONE_HEIGHT) return;
    group.scale(1, newHeightTop / rect.height, rect.bottomLeft);
  } else if (Paper.currentZoneAction === 'moveZone') {
    if (group.data.isSelected && selectedGroups.length > 1) {
      selectedGroups.forEach(function (selectedGroup) { selectedGroup.position.y += delta.y; });
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
  if (group.data.measureBadges) group.data.measureBadges.forEach(function (badge) { badge.visible = false; });
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
      var text = item.data.text;
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
              return { x: measure.x / canvasWval, y: measure.y / canvasH, number: measure.number, fontFrac: MEASURE_FONT_PX / canvasH };
            })
          : undefined,
        text: text ? { x: text.x / canvasWval, y: text.y / canvasH, text: text.text } : undefined,
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
  var left   = Math.round(zone.x * naturalW * coefH);
  var right  = Math.round((zone.x + zone.width) * naturalW * coefH);
  var top    = Math.round(zone.y * naturalH * coefV);
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
  if (zone.text) path.data.text = zone.text;

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
  var grip = new paper.Path.Line(
    new paper.Point(cx - 14, cy),
    new paper.Point(cx + 14, cy)
  );
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
  var cross = makeDeleteBadge(badgeBg.bounds.topRight.add(new paper.Point(7, -7)));
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

// ============== Suppression
Paper.deleteZones = function () {
  if (!paper || !paper.project) return;
  paper.project.activeLayer.removeChildren();
  hoverGroup = null;
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
    var imgEl = document.querySelector('#' + sysIds[sideIndex] + ' img');
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
  var zones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
  if (zones && zones.length > 0) {
    scoreParts.currentZones = zones;
    Paper.drawZones(zones);
  }
  refreshMeasureGuide(); // removeChildren a effacé le guide → on le remet en mode mesure
  if (paper.view) paper.view.update();
};

// ============== Suppression multiple
Paper.deleteSelectedZones = function () {
  if (!selectedGroups.length) return;
  selectedGroups.forEach(function (g) { Paper.deleteZone(g); });
  selectedGroups = [];
  commit();
  scoreParts.saveZones(function () {});
  if (Paper.onSelectionChange) Paper.onSelectionChange(0);
};

// ============== Helpers
function commit() {
  scoreParts.writeCurrentPageZones();
}
