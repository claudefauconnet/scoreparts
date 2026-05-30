// Globals externes attendus : `paper` (lib Paper.js).
//
// Éditeur de zones v2. Paper.js reste MAÎTRE de la logique (modèle de zones,
// coordonnées, lecture via getPageZones). Différences avec l'éditeur v1 :
//   - canvas TRANSPARENT par-dessus l'<img> de page (pas de Paper.Raster).
//   - une page courante à la fois : un canvas (donc un projet Paper) par page,
//     activé quand la page devient courante.
//   - coordonnées en pixels-canvas (espace mise en page, hors zoom CSS) : le
//     zoom est une transform CSS sur le conteneur, Paper la neutralise via
//     getBoundingClientRect → les coords persistées sont invariantes au zoom.
//   - interactions sans touches modificatrices : bouton "New zone" (mode pending)
//     pour créer, glisser le corps pour déplacer, glisser le bord bas pour
//     redimensionner, cliquer la croix pour supprimer.
import { scoreParts } from './scoreParts.js';

export const Paper = {};

// ============== Constantes de style / interaction
const ZONE_RADIUS = 4; // coins arrondis (look module)
const EDGE_GRAB = 8; // px de proximité au bord bas → redimensionnement
const BADGE_INSET = 12; // décalage de la croix de suppression depuis le coin haut-droit
const BADGE_GRAB = 11; // px de proximité au centre de la croix → suppression
const MIN_ZONE_HEIGHT = 8;
const HIT_OPTIONS = { fill: true, stroke: true, tolerance: 4 };

// Centre de la croix de suppression d'après les bounds d'une zone.
function deleteBadgeCenter(bounds) {
  return bounds.topRight.add(new paper.Point(-BADGE_INSET, BADGE_INSET));
}

// ============== État privé
var projectsByCanvasId = {}; // id de canvas → projet Paper (un par page)
var toolInstalled = false;

Paper.pendingNewZone = false; // mode "nouvelle zone" piloté par le bouton module
Paper.activeCanvas = null; // <canvas> de la page courante
Paper.currentZoneAction = null;
Paper.currentPath = null;
Paper.defaultZoneHeight = 50;
Paper.margin = 10;
Paper.onPendingChange = null; // hook posé par scorePlayer pour rafraîchir l'UI

// Largeur/hauteur de dessin = taille CSS du canvas actif. C'est l'espace de
// coordonnées du projet Paper (la vue est dimensionnée sur le canvas).
function canvasW() {
  return Paper.activeCanvas ? Paper.activeCanvas.clientWidth : 0;
}
function canvasH() {
  return Paper.activeCanvas ? Paper.activeCanvas.clientHeight : 0;
}

// ============== Setup d'un canvas de page
// Appelé quand une page devient courante. Réutilise le projet existant (active)
// ou en crée un. Aucun raster : le fond est l'<img> sous le canvas transparent.
Paper.setupCanvas = function (canvas, imgEl) {
  Paper.activeCanvas = canvas;
  if (scoreParts.margin == null) {
    scoreParts.margin = Paper.margin;
  }
  if (projectsByCanvasId[canvas.id]) {
    projectsByCanvasId[canvas.id].activate();
  } else {
    paper.setup(canvas);
    projectsByCanvasId[canvas.id] = paper.project;
  }
  // Aligne la taille de vue sur la taille CSS courante du canvas.
  paper.view.viewSize = new paper.Size(canvas.clientWidth, canvas.clientHeight);

  // Coefficients (utilisés par l'auto-détection — phase ultérieure).
  if (imgEl && imgEl.naturalWidth) {
    scoreParts.coefV = canvas.clientHeight / imgEl.naturalHeight;
    scoreParts.coefH = canvas.clientWidth / imgEl.naturalWidth;
  }

  installTool();
};

function installTool() {
  if (toolInstalled) return;
  toolInstalled = true;
  var tool = new paper.Tool();
  tool.onMouseDown = onCanvasMouseDown;
  tool.onMouseMove = onCanvasMouseMove;
}

// ============== Mode "nouvelle zone"
Paper.setPending = function (on) {
  Paper.pendingNewZone = on;
  if (Paper.onPendingChange) Paper.onPendingChange(on);
};

// ============== Outil canvas (clic dans le vide / déplacement souris)
function onCanvasMouseDown(event) {
  if (Paper.currentZoneAction === 'removeZone') {
    Paper.currentZoneAction = null;
    return;
  }
  if (!Paper.pendingNewZone) return; // création uniquement en mode pending
  if (!scoreParts.currentMovement) {
    alert('sélectionnez ou déclarez un mouvement');
    return;
  }
  // Clic sur une zone existante : ne pas créer par-dessus.
  var hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);
  if (hitResult && hitResult.item) return;

  var zone = {
    x: scoreParts.margin || Paper.margin,
    y: event.point.y,
    width: canvasW(),
    height: Paper.defaultZoneHeight,
    page: scoreParts.currentPage,
    type: 'zone',
    voice: '',
    movement: scoreParts.currentMovement,
  };
  Paper.drawZone(zone);
  Paper.setPending(false);
  commit();
}

function onCanvasMouseMove(event) {
  if (!Paper.activeCanvas) return;
  if (Paper.pendingNewZone) return; // curseur crosshair géré en CSS
  var group = zoneGroupAt(event.point);
  var cursor = 'default';
  if (group) {
    var bounds = group.bounds;
    if (event.point.getDistance(deleteBadgeCenter(bounds)) < BADGE_GRAB) cursor = 'pointer';
    else if (Math.abs(event.point.y - bounds.bottom) < EDGE_GRAB) cursor = 'ns-resize';
    else cursor = 'move';
  }
  Paper.activeCanvas.style.cursor = cursor;
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

// ============== Interactions sur une zone
function onZoneMouseDown(event) {
  Paper.currentZoneAction = null;
  var group = event.target;
  var bounds = group.bounds;
  var point = event.point;

  if (point.getDistance(deleteBadgeCenter(bounds)) < BADGE_GRAB) {
    Paper.currentZoneAction = 'removeZone';
    Paper.deleteZone(group);
    // Écrit le modèle directement (sans passer par writeCurrentPageZones, qui
    // ignore une page vidée) : indispensable pour supprimer la DERNIÈRE zone.
    scoreParts.allPagesZones.pages[scoreParts.currentPage] = Paper.getPageZones();
    scoreParts.currentZones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
    if (event.stop) event.stop();
    return;
  }
  if (Math.abs(point.y - bounds.bottom) < EDGE_GRAB) {
    Paper.currentZoneAction = 'resizeZone';
    Paper.currentPath = group.children[0];
  } else {
    Paper.currentZoneAction = 'moveZone';
  }
}

function onZoneMouseDrag(event) {
  if (!scoreParts.currentMovement) return;
  var group = event.target;
  if (Paper.currentZoneAction === 'resizeZone') {
    // Redimensionnement vertical depuis le bord bas (haut fixe).
    var newHeight = group.bounds.height + event.delta.y;
    if (newHeight < MIN_ZONE_HEIGHT) return;
    var scaleY = newHeight / group.bounds.height;
    group.scale(1, scaleY, group.bounds.topLeft);
  } else if (Paper.currentZoneAction === 'moveZone') {
    group.position.y += event.delta.y;
  }
}

function onZoneMouseUp() {
  if (Paper.currentZoneAction === 'moveZone' || Paper.currentZoneAction === 'resizeZone') {
    commit();
    Paper.redrawCurrentPage(); // re-dessine propre (poignée/croix non déformées)
  }
  Paper.currentZoneAction = null;
}

// ============== Lecture du modèle depuis le canvas courant
// Pas de selectAll (évite les poignées de sélection Paper) : on parcourt les
// items et on ne garde que les chemins de zone (data.type === 'zone').
Paper.getPageZones = function () {
  if (!paper || !paper.project) return [];
  var zones = [];
  paper.project.getItems({ recursive: true }).forEach(function (item) {
    if (item.data && item.data.type === 'zone') {
      zones.push({
        x: item.bounds.x,
        y: item.bounds.y,
        width: item.bounds.width,
        height: item.bounds.height,
        page: item.data.page,
        voice: item.data.voice,
        movement: item.data.movement,
        measure: item.data.measure,
        text: item.data.text,
      });
    }
  });

  zones.sort(function (a, b) {
    if (a.y > b.y) return 1;
    if (a.y < b.y) return -1;
    return 0;
  });
  zones.forEach(function (zone, index) {
    if (!zone.voice) {
      zone.voice = '' + (index + 1);
    }
  });
  return zones;
};

// ============== Dessin des zones (style module)
Paper.drawZones = function (zones) {
  if (!zones) return;
  zones.forEach(function (zone) {
    Paper.drawZone(zone);
  });
};

Paper.drawZone = function (zone) {
  var width = canvasW();
  var left = Math.round(zone.x);
  var right = Math.round(width); // pleine largeur (logique v1 conservée)
  var top = Math.round(zone.y);
  var bottom = Math.round(zone.y + zone.height);
  var colors = zoneColors(zone);

  var rectangle = new paper.Rectangle(
    new paper.Point(left, top),
    new paper.Point(right, bottom)
  );
  var path = new paper.Path.Rectangle(rectangle, ZONE_RADIUS);
  path.fillColor = colors.fill;
  path.strokeColor = colors.stroke;
  path.strokeWidth = 1.5;
  path.data.type = 'zone';
  path.data.page = scoreParts.currentPage;
  if (zone.voice) path.data.voice = zone.voice;
  if (zone.movement) path.data.movement = zone.movement;
  if (zone.measure) path.data.measure = zone.measure;
  if (zone.text) path.data.text = zone.text;

  var group = new paper.Group([path]);
  group.data.role = 'zoneGroup';

  // Poignée de redimensionnement (barre au centre du bord bas).
  var midX = (left + right) / 2;
  var grip = new paper.Path.Line(
    new paper.Point(midX - 14, bottom - 3),
    new paper.Point(midX + 14, bottom - 3)
  );
  grip.strokeColor = colors.stroke;
  grip.strokeWidth = 3;
  grip.strokeCap = 'round';
  grip.opacity = 0.55;
  group.addChild(grip);

  // Croix de suppression (coin haut-droit).
  var badgeX = right - 12;
  var badgeY = top + 12;
  var badge = new paper.Path.Circle(new paper.Point(badgeX, badgeY), 8);
  badge.fillColor = 'white';
  badge.strokeColor = colors.stroke;
  badge.strokeWidth = 1;
  var crossA = new paper.Path.Line(
    new paper.Point(badgeX - 3, badgeY - 3),
    new paper.Point(badgeX + 3, badgeY + 3)
  );
  var crossB = new paper.Path.Line(
    new paper.Point(badgeX + 3, badgeY - 3),
    new paper.Point(badgeX - 3, badgeY + 3)
  );
  crossA.strokeColor = crossB.strokeColor = colors.stroke;
  crossA.strokeWidth = crossB.strokeWidth = 1.5;
  crossA.strokeCap = crossB.strokeCap = 'round';
  group.addChildren([badge, crossA, crossB]);

  group.onMouseDown = onZoneMouseDown;
  group.onMouseDrag = onZoneMouseDrag;
  group.onMouseUp = onZoneMouseUp;

  scoreParts.modified = true;
  Paper.currentPath = path;
  return group;
};

// Couleur de zone. Instruments/voix = phase ultérieure : couleur neutre acajou
// (translucide) pour l'instant, dans l'esprit du module.
function zoneColors() {
  return {
    fill: new paper.Color(0.42, 0.23, 0.18, 0.16),
    stroke: new paper.Color('#6b3a2e'),
  };
}

// ============== Suppression
Paper.deleteZones = function () {
  if (!paper || !paper.project) return;
  paper.project.activeLayer.removeChildren();
  if (paper.view) paper.view.update();
  scoreParts.modified = true;
};

Paper.deleteZone = function (group) {
  group.removeChildren();
  group.remove();
  if (paper.view) paper.view.update();
  scoreParts.modified = true;
};

// Re-dessine les zones de la page courante depuis le modèle (canvas actif).
Paper.redrawCurrentPage = function () {
  if (!paper || !paper.project) return;
  Paper.deleteZones();
  var zones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
  if (zones && zones.length > 0) {
    scoreParts.currentZones = zones;
    Paper.drawZones(zones);
  }
};

// ============== Helpers
function commit() {
  scoreParts.writeCurrentPageZones();
}
