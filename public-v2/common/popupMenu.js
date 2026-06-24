// Menu contextuel d'une zone (clic droit) — version v2 dépoussiérée.
// Remplace l'ancien couple popupMenu/popupMenuWidget (logique mouseleave fragile) par
// un menu unique positionné au curseur, fermé au clic extérieur / Échap / défilement.
// Globals externes attendus : `paper` n'est PAS requis ici (on travaille en coords écran).
import { Paper } from './paper.js';

export const popupMenu = {};

// Élément DOM du menu, créé une seule fois et réutilisé.
var menuElement = null;
// Contexte de la zone visée par le menu actuellement ouvert.
var currentGroup = null;
var currentPaperPoint = null;

const MENU_ITEMS = [
  { label: 'Ajouter texte', action: 'add-text' },
  { label: 'Effacer zone', action: 'clear-zone' },
];

function buildMenuElement() {
  var element = document.createElement('div');
  element.className = 'zone-context-menu';
  element.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'display:none',
    'min-width:150px',
    'padding:4px 0',
    'background:#fff',
    'border:1px solid #d0d7de',
    'border-radius:6px',
    'box-shadow:0 6px 20px rgba(0,0,0,0.15)',
    'font:13px Inter, system-ui, sans-serif',
    'color:#1a1a1a',
    'user-select:none',
  ].join(';');

  MENU_ITEMS.forEach(function (menuItem) {
    var itemElement = document.createElement('div');
    itemElement.className = 'zone-context-menu-item';
    itemElement.dataset.action = menuItem.action;
    itemElement.textContent = menuItem.label;
    itemElement.style.cssText = 'padding:6px 14px; cursor:pointer; white-space:nowrap;';
    itemElement.addEventListener('mouseenter', function () { itemElement.style.background = '#f0f3f6'; });
    itemElement.addEventListener('mouseleave', function () { itemElement.style.background = ''; });
    itemElement.addEventListener('click', function () { runAction(menuItem.action); });
    element.appendChild(itemElement);
  });

  document.body.appendChild(element);
  return element;
}

function ensureMenuElement() {
  if (!menuElement) menuElement = buildMenuElement();
  return menuElement;
}

// Ouvre le menu pour une zone à la position écran (screenPoint = clientX/clientY).
// paperPoint = coords pixels-canvas du clic, mémorisées pour y poser un texte.
popupMenu.showForZone = function (group, screenPoint, paperPoint) {
  currentGroup = group;
  currentPaperPoint = paperPoint;
  var element = ensureMenuElement();
  element.style.display = 'block';
  // Replace dans la fenêtre si le menu déborde à droite / en bas.
  var menuWidth = element.offsetWidth;
  var menuHeight = element.offsetHeight;
  var left = Math.min(screenPoint.x, window.innerWidth - menuWidth - 4);
  var top = Math.min(screenPoint.y, window.innerHeight - menuHeight - 4);
  element.style.left = Math.max(4, left) + 'px';
  element.style.top = Math.max(4, top) + 'px';
  // Fermeture automatique : prochain clic extérieur, Échap, défilement ou redimension.
  setTimeout(function () {
    document.addEventListener('mousedown', onOutsideInteraction, true);
    document.addEventListener('keydown', onEscape, true);
    window.addEventListener('scroll', popupMenu.hide, true);
    window.addEventListener('resize', popupMenu.hide, true);
  }, 0);
};

popupMenu.hide = function () {
  if (menuElement) menuElement.style.display = 'none';
  currentGroup = null;
  currentPaperPoint = null;
  document.removeEventListener('mousedown', onOutsideInteraction, true);
  document.removeEventListener('keydown', onEscape, true);
  window.removeEventListener('scroll', popupMenu.hide, true);
  window.removeEventListener('resize', popupMenu.hide, true);
};

function onOutsideInteraction(event) {
  if (menuElement && menuElement.contains(event.target)) return; // clic dans le menu : géré par l'item
  popupMenu.hide();
}

function onEscape(event) {
  if (event.key === 'Escape') popupMenu.hide();
}

function runAction(action) {
  var group = currentGroup;
  var paperPoint = currentPaperPoint;
  popupMenu.hide();
  if (!group) return;
  if (action === 'add-text') {
    var textValue = window.prompt('Texte');
    if (textValue === null || textValue === '') return;
    Paper.addTextToZone(group, paperPoint, textValue);
  } else if (action === 'clear-zone') {
    Paper.removeZoneAndSave(group);
  }
}
