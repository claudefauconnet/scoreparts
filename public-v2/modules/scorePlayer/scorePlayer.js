import { on, state } from '../partitions.state.js';
import { scoreParts } from '../../common/scoreParts.js';
import { Paper } from '../../common/paper.js';

// scorePlayer v2 = éditeur de zones. Paper.js (commun) est maître de la logique :
// modèle de zones, coordonnées, lecture (getPageZones) et persistance (via
// scoreParts). Ce module ne fait que :
//   - poser un <canvas> transparent par-dessus l'image de la PAGE COURANTE et y
//     activer Paper (une seule page éditée à la fois, celle cliquée) ;
//   - câbler les contrôles UI (bouton "New zone", clic page, effacer page) ;
//   - garder la navigation, le zoom/pan et le mode mono-page existants.

// ============== Canvas overlay : géométrie
// Le <canvas> est enfant de .page (transformée CSS pour le zoom). On le
// positionne/dimensionne sur la boîte de mise en page de l'<img> via la chaîne
// offsetParent (valeurs de layout, insensibles à la transform de zoom) → le zoom
// reste purement visuel et les coordonnées Paper restent invariantes au zoom.
function offsetWithinPage(el, pageEl) {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== pageEl) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function fitCanvasToImage(canvas, img, pageEl) {
  const box = offsetWithinPage(img, pageEl);
  canvas.style.left = box.x + 'px';
  canvas.style.top = box.y + 'px';
  canvas.style.width = box.w + 'px';
  canvas.style.height = box.h + 'px';
  canvas.width = box.w;
  canvas.height = box.h;
}

function whenImageReady(img, callback) {
  if (img.complete && img.naturalWidth) {
    callback();
  } else {
    img.addEventListener('load', callback, { once: true });
  }
}

// L'image d'une page peut être chargée de façon asynchrone (la page de droite du
// spread n'a pas de callback). On attend qu'un <img> soit injecté ET chargé.
function waitForPageImage(systemsId, callback) {
  const systems = document.getElementById(systemsId);
  if (!systems) return;
  const existing = systems.querySelector('img');
  if (existing) {
    whenImageReady(existing, () => callback(existing));
    return;
  }
  const observer = new MutationObserver(() => {
    const img = systems.querySelector('img');
    if (img) {
      observer.disconnect();
      whenImageReady(img, () => callback(img));
    }
  });
  observer.observe(systems, { childList: true });
}

// Côté (0 = gauche, 1 = droite) affichant la page courante dans le spread.
function currentSide() {
  if (scoreParts.singlePage) return 0;
  return scoreParts.currentPage === scoreParts.spreadOrigin() ? 0 : 1;
}

function clearCanvasPixels(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Jeton de rendu : invalide les rendus asynchrones en attente quand un nouveau
// changement de page survient (navigations rapides, double-page) → évite qu'un
// callback périmé dessine la mauvaise page sur un canvas.
let renderToken = 0;

// ============== (Re)configure l'éditeur sur le spread affiché
// Les DEUX pages affichées montrent leurs zones. Seule la page COURANTE est
// éditable (.editing → pointer-events) ; l'autre est figée. Un clic sur l'autre
// page la rend courante (géré par le handler de clic de page).
function setupEditorForCurrentPage() {
  const token = ++renderToken;
  const stage = document.getElementById('stage');
  if (stage) stage.classList.remove('empty');

  const side = currentSide();
  const single = scoreParts.singlePage;
  const origin = scoreParts.spreadOrigin();
  const leftPage = document.querySelector('.page-left');
  const rightPage = document.querySelector('.page-right');
  if (!leftPage || !rightPage) return;

  leftPage.classList.toggle('editing', side === 0);
  rightPage.classList.toggle('editing', side === 1 && !single);

  // Fixe le canvas courant tout de suite : les rendus asynchrones de l'autre page
  // réactivent ce projet, et getPageZones/redraw le ciblent.
  const currentCanvasId = side === 0 ? 'canvas-left' : 'canvas-right';
  Paper.currentCanvasId = currentCanvasId;
  Paper.activeCanvas = document.getElementById(currentCanvasId);

  // Pages à rendre : page courante d'abord (projet actif), puis l'autre (figée).
  const descriptors = [
    { side: 0, pageIndex: origin, canvasId: 'canvas-left', systemsId: 'systems-left', pageEl: leftPage },
  ];
  if (!single) {
    descriptors.push({ side: 1, pageIndex: origin + 1, canvasId: 'canvas-right', systemsId: 'systems-right', pageEl: rightPage });
  } else {
    clearCanvasPixels(document.getElementById('canvas-right'));
  }
  descriptors.sort((a, b) => (b.side === side) - (a.side === side)); // courante en premier

  descriptors.forEach((d) => {
    const canvas = document.getElementById(d.canvasId);
    if (!canvas) return;
    const isCurrent = d.side === side;
    // Attend l'<img> de la page (chargement async possible pour la page de droite).
    waitForPageImage(d.systemsId, (img) => {
      if (token !== renderToken) return; // changement de page survenu entre-temps
      // setTimeout(0) : laisse les handlers synchrones (aspect-ratio mono-page,
      // resetZoom) s'appliquer avant de mesurer la boîte de l'image.
      setTimeout(() => {
        if (token !== renderToken) return;
        fitCanvasToImage(canvas, img, d.pageEl);
        Paper.renderPage(canvas, img, d.pageIndex, isCurrent);
      }, 0);
    });
  });
}

// ============== Contrôles UI
function wireControls() {
  const stage = document.getElementById('stage');
  const actNewZone = document.getElementById('act-new-zone');
  const cancelNewZone = document.getElementById('cancel-new-zone');

  // Reflète le mode "pending new zone" dans l'UI (bannière + bouton actif).
  Paper.onPendingChange = (isPending) => {
    if (stage) stage.classList.toggle('pending-zone', isPending);
    if (actNewZone) actNewZone.classList.toggle('active', isPending);
  };

  if (actNewZone) {
    actNewZone.addEventListener('click', () => {
      // Pas de zone sans voix : on ne peut tracer qu'une fois au moins une voix
      // renseignée (l'auto-attribution les répartira ensuite).
      if (state.VOICES.length === 0) {
        alert('Renseignez au moins une voix avant de tracer des zones.');
        return;
      }
      Paper.setPending(!Paper.pendingNewZone);
    });
  }
  if (cancelNewZone) {
    cancelNewZone.addEventListener('click', () => Paper.setPending(false));
  }

  // Clic sur une page → elle devient la page courante (gauche = origine du
  // spread, droite = origine + 1). scoreParts sauve les zones de l'ancienne page.
  document.querySelectorAll('.page').forEach((pageEl) => {
    const side = pageEl.classList.contains('page-left') ? 0 : 1;
    pageEl.addEventListener('mousedown', () => {
      const origin = scoreParts.spreadOrigin();
      const targetPage = scoreParts.singlePage ? origin : origin + side;
      scoreParts.setCurrentPage(targetPage);
    });
  });

  // Effacer les zones d'une page.
  document.querySelectorAll('.clear-zones-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pageEl = btn.closest('.page');
      const side = pageEl.classList.contains('page-left') ? 0 : 1;
      const origin = scoreParts.spreadOrigin();
      const pageIndex = scoreParts.singlePage ? origin : origin + side;
      scoreParts.deletePageZones(pageIndex);
      if (pageIndex === scoreParts.currentPage) Paper.redrawCurrentPage();
      scoreParts.saveZones(function () {});
    });
  });
}

// ============== Navigation (flèches latérales)
document.querySelector('.nav-arrow.prev').addEventListener('click', function () {
  scoreParts.previousPage();
});
document.querySelector('.nav-arrow.next').addEventListener('click', function () {
  scoreParts.nextPage();
});

// Redessine les deux pages du spread depuis le modèle (allPagesZones), sans
// async waitForPageImage. Les images sont déjà dans le DOM après score-loaded.
function redrawSpread() {
  Paper.redrawSpread();
}

// ============== Init
wireControls();
on('score-loaded', setupEditorForCurrentPage);
on('page-changed', setupEditorForCurrentPage);
on('zones-changed', redrawSpread);

// ============== Responsive single-page mode (small / short screens)
// On small screens the 2-page spread is unreadable, so we show one page at a
// time (full width). scoreParts drives the ±1 navigation; we just sync the flag
// and the layout class, then reload the current page.
const stageEl = document.getElementById('stage');
const smallScreen = window.matchMedia('(max-width: 1100px), (max-height: 820px)');

function applyResponsiveMode() {
  const single = smallScreen.matches;
  if (scoreParts.singlePage === single) return;
  scoreParts.singlePage = single;
  stageEl.classList.toggle('single-page', single);
  // Plus de snap de currentPage : il reste la page exacte. loadPageSpread aligne
  // l'origine du spread (page de gauche paire) au rendu.
  // Re-render (not navigate) so the right page is dropped/added for the new mode.
  scoreParts.reloadCurrentPage();
  resetZoom();
  fitSinglePageToImage();
}

// In single-page mode, size the page box to the image's natural ratio so it
// hugs the score (no wide empty paper). Cleared in spread mode.
function fitSinglePageToImage() {
  const page = document.querySelector('.page-left');
  if (!page) return;
  if (!scoreParts.singlePage) {
    page.style.aspectRatio = '';
    return;
  }
  const img = document.getElementById('systems-left').querySelector('img');
  if (!img) return;
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight) {
      page.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
    }
  };
  if (img.complete && img.naturalWidth) apply();
  else img.addEventListener('load', apply, { once: true });
}
smallScreen.addEventListener('change', applyResponsiveMode);
// Initialise le flag sans recharger (aucune partition chargée au boot).
scoreParts.singlePage = smallScreen.matches;
stageEl.classList.toggle('single-page', smallScreen.matches);

// ============== Resize → redraw zones
// Quand une page change de taille (resize de fenêtre, layout), le canvas doit être
// re-calé sur l'<img> et les zones re-dessinées avec les nouveaux coefs.
// On observe les deux pages séparément car leur taille peut diverger (single-page, etc.).
(function () {
  let resizeTimer = null;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (scoreParts.pdfName) setupEditorForCurrentPage();
    }, 80);
  });
  ['.page-left', '.page-right'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) observer.observe(el);
  });
})();

// ============== Zoom & pan on the book
// Transform model: book transform-origin is 0 0, transform = translate(pan) scale(zoom).
// Cursor-anchored wheel zoom keeps the point under the pointer fixed.
const bookEl = document.getElementById('book');
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
let zoom = 1;
let panX = 0;
let panY = 0;

function applyTransform() {
  bookEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  stageEl.classList.toggle('zoomed', zoom > 1);
  const reset = document.getElementById('zoom-reset');
  if (reset) reset.textContent = Math.round(zoom * 100) + '%';
}

function resetZoom() {
  zoom = 1;
  panX = 0;
  panY = 0;
  applyTransform();
}

// Zoom toward a screen point (clientX/clientY). Keeps that point stationary.
function zoomAt(clientX, clientY, nextZoom) {
  nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
  if (nextZoom === zoom) return;
  // book's untransformed top-left origin: measured left minus current pan.
  const rect = bookEl.getBoundingClientRect();
  const originX = rect.left - panX;
  const originY = rect.top - panY;
  const localX = clientX - originX;
  const localY = clientY - originY;
  const ratio = nextZoom / zoom;
  panX = localX - ratio * (localX - panX);
  panY = localY - ratio * (localY - panY);
  zoom = nextZoom;
  if (zoom === ZOOM_MIN) {
    panX = 0;
    panY = 0;
  }
  applyTransform();
}

function zoomFromCenter(nextZoom) {
  const rect = bookEl.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
}

// Wheel / trackpad pinch (ctrlKey) zoom
document.getElementById('stage-body').addEventListener(
  'wheel',
  (e) => {
    if (e.target.closest('.zoom-controls')) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(e.clientX, e.clientY, zoom * factor);
  },
  { passive: false }
);

// Drag to pan (only while zoomed). Capture phase so it pre-empts zone drag.
document.getElementById('stage-body').addEventListener(
  'mousedown',
  (e) => {
    if (zoom <= 1) return;
    if (Paper.pendingNewZone) return;
    if (e.target.closest('.zone-canvas.editing') || e.target.closest('[data-act]')) return;
    if (e.target.closest('.page.editing .zone-canvas')) return;
    if (e.target.closest('.zoom-controls') || e.target.closest('.nav-arrow')) return;
    e.preventDefault();
    e.stopPropagation();
    bookEl.classList.add('panning');
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = panX;
    const startPanY = panY;
    function move(ev) {
      panX = startPanX + (ev.clientX - startX);
      panY = startPanY + (ev.clientY - startY);
      applyTransform();
    }
    function up() {
      bookEl.classList.remove('panning');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  },
  true
);

document.getElementById('zoom-in').addEventListener('click', () => zoomFromCenter(zoom * 1.25));
document.getElementById('zoom-out').addEventListener('click', () => zoomFromCenter(zoom / 1.25));
document.getElementById('zoom-reset').addEventListener('click', resetZoom);

// Reset zoom whenever the page changes or a new score loads.
on('page-changed', resetZoom);
on('score-loaded', resetZoom);

// Keep the single-page box hugging the current image.
on('page-changed', fitSinglePageToImage);
on('score-loaded', fitSinglePageToImage);

applyTransform();
