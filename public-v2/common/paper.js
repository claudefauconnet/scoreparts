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



// ============== État privé
var projectsByCanvasId = {}; // id de canvas → projet Paper (un par page)
var toolInstalled = false;
var hoverGroup = null; // zone actuellement survolée (poignées visibles)
var selectedGroups = []; // zones sélectionnées par lasso

Paper.pendingNewZone = false; // mode "nouvelle zone" (persistant tant qu'activé)
Paper.activeCanvas = null; // <canvas> de la page courante
Paper.currentCanvasId = null; // id du canvas de la page courante (projet actif)
Paper.currentZoneAction = null;
Paper.currentPath = null;
Paper.defaultZoneHeight = 50;
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
  installTool();
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
    zones.forEach(function (zone) {
      Paper.drawZone(zone, pageIndex, interactive);
    });
  }
  if (paper.view) paper.view.update();
  // Garde le projet de la page courante actif (rendu de l'autre page après).
  if (!interactive) activateCurrent();
};

function installTool() {
  if (toolInstalled) return;
  toolInstalled = true;
  var tool = new paper.Tool();
  tool.onMouseDown = onCanvasMouseDown;
  tool.onMouseMove = onCanvasMouseMove;
  tool.onMouseDrag = onCanvasMouseDrag;
  tool.onMouseUp = onCanvasMouseUp;
}

// ============== Mode "nouvelle zone" (activable / désactivable)
Paper.setPending = function (on) {
  Paper.pendingNewZone = on;
  if (Paper.onPendingChange) Paper.onPendingChange(on);
};

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

function onCanvasMouseDrag(event) {
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
  if (Paper.currentZoneAction === 'removeZone') {
    Paper.currentZoneAction = null;
    return;
  }
  var hitResult = paper.project.hitTest(event.point, HIT_OPTIONS);
  var hitGroup = hitResult ? zoneGroupOf(hitResult.item) : null;

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
    var zone = {
      x: (scoreParts.margin || Paper.margin) / (naturalW * coefH),
      y: event.point.y / (naturalH * coefV),
      width: 1.0,
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

  // Clic sur zone non sélectionnée → vider la sélection et laisser la zone gérer.
  if (hitGroup && !hitGroup.data.isSelected) {
    clearSelection();
    if (paper.view) paper.view.update();
    return;
  }
  // Clic dans le vide → démarrer le lasso.
  if (!hitGroup) {
    clearSelection();
    Paper.isLasso = true;
    Paper.lassoStart = event.point.clone();
  }
}

function onCanvasMouseMove(event) {
  if (!Paper.activeCanvas) return;
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
function onZoneMouseDown(event) {
  Paper.currentZoneAction = null;
  var group = event.target;
  var region = hitRegion(group, event.point);

  if (region === 'delete') {
    Paper.currentZoneAction = 'removeZone';
    Paper.deleteZone(group);
    if (hoverGroup === group) hoverGroup = null;
    // Écrit le modèle directement (writeCurrentPageZones ignore une page vidée) :
    // indispensable pour supprimer la DERNIÈRE zone.
    scoreParts.allPagesZones.pages[scoreParts.currentPage] = Paper.getPageZones();
    scoreParts.currentZones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
    scoreParts.saveZones(function () {}); // enregistrement immédiat
    if (event.stop) event.stop();
    return;
  }
  if (region === 'pill') {
    // Réservé à l'affectation de voix (phase voices). Aucun effet pour l'instant.
    if (event.stop) event.stop();
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

function onZoneMouseDrag(event) {
  if (!scoreParts.currentMovement) return;
  var group = event.target;
  var rect = group.data.rect.bounds;
  if (Paper.currentZoneAction === 'resizeBot') {
    // Bord bas : le haut reste fixe.
    var newHeightBot = rect.height + event.delta.y;
    if (newHeightBot < MIN_ZONE_HEIGHT) return;
    group.scale(1, newHeightBot / rect.height, rect.topLeft);
  } else if (Paper.currentZoneAction === 'resizeTop') {
    // Bord haut : le bas reste fixe.
    var newHeightTop = rect.height - event.delta.y;
    if (newHeightTop < MIN_ZONE_HEIGHT) return;
    group.scale(1, newHeightTop / rect.height, rect.bottomLeft);
  } else if (Paper.currentZoneAction === 'moveZone') {
    if (group.data.isSelected && selectedGroups.length > 1) {
      selectedGroups.forEach(function (g) { g.position.y += event.delta.y; });
    } else {
      group.position.y += event.delta.y;
    }
  }
}

function onZoneMouseUp() {
  var action = Paper.currentZoneAction;
  if (action === 'moveZone' || action === 'resizeTop' || action === 'resizeBot') {
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
  if (group.data.handles) {
    group.data.handles.forEach(function (h) {
      h.visible = false;
    });
  }
}

// ============== Lecture du modèle depuis le canvas courant
// On ne garde que les chemins de zone (data.type === 'zone'), donc le rect.
Paper.getPageZones = function () {
  if (!paper || !paper.project) return [];
  activateCurrent(); // lit toujours le projet de la page courante
  var zones = [];
  // Normaliser en fractions 0→1 de la taille de canvas (= fraction de l'image).
  // canvasW = naturalW * coefH, canvasH = naturalH * coefV.
  // stored_y = canvas_y / canvasH → drawZone: top = stored_y * canvasH ✓
  // PDF backend: png_y = stored_y * naturalH (avec coefV=1/naturalH envoyé depuis leftPanel.js).
  var naturalW = scoreParts.naturalW || 1;
  var naturalH = scoreParts.naturalH || 1;
  var coefH = scoreParts.coefH || 1;
  var coefV = scoreParts.coefV || 1;
  var canvasH = naturalH * coefV;
  var canvasWval = naturalW * coefH;
  paper.project.getItems({ recursive: true }).forEach(function (item) {
    if (item.data && item.data.type === 'zone') {
      var measure = item.data.measure;
      var text = item.data.text;
      zones.push({
        x: item.bounds.x / canvasWval,
        y: item.bounds.y / canvasH,
        width: item.bounds.width / canvasWval,
        height: item.bounds.height / canvasH,
        page: item.data.page,
        voice: item.data.voice,
        movement: item.data.movement,
        measure: measure ? { x: measure.x / canvasWval, y: measure.y / canvasH, number: measure.number } : undefined,
        text: text ? { x: text.x / canvasWval, y: text.y / canvasH, text: text.text } : undefined,
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
  if (zone.measure) path.data.measure = zone.measure;
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

  group.onMouseDown = onZoneMouseDown;
  group.onMouseDrag = onZoneMouseDrag;
  group.onMouseUp = onZoneMouseUp;

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
