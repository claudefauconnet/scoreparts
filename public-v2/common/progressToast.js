// Toast de progression réutilisable (coin bas-droite). UI seule, sans logique
// métier : un seul toast partagé dans le DOM, piloté par show/setProgress/hide.
// Utilisé pour toute tâche longue où l'utilisateur a besoin d'un retour discret —
// téléchargement PDF/zip, auto-détection des systèmes, génération d'une voix.
// Le toast construit lui-même son DOM (aucune dépendance à un fragment HTML ni à
// l'ordre de chargement) ; le style vit dans common/progressToast.css.

let toast;
let labelEl;
let pctEl;
let fillEl;

// Construit le toast une seule fois et le rattache au body. Le body est choisi
// volontairement : un ancêtre transformé capterait le position:fixed et ancrerait
// le toast au mauvais endroit au lieu du coin bas-droite du viewport.
function ensureToast() {
  if (toast) return;
  toast = document.createElement('div');
  toast.className = 'progress-toast';
  toast.hidden = true;
  toast.innerHTML =
    '<div class="progress-toast-head">' +
    '<span class="progress-toast-label"></span>' +
    '<span class="progress-toast-pct"></span>' +
    '</div>' +
    '<div class="progress-toast-track"><div class="progress-toast-fill"></div></div>';
  document.body.appendChild(toast);
  labelEl = toast.querySelector('.progress-toast-label');
  pctEl = toast.querySelector('.progress-toast-pct');
  fillEl = toast.querySelector('.progress-toast-fill');
}

// Affiche le toast. indeterminate=true → barre animée sans pourcentage (tâche dont
// on ne connaît pas l'avancement) ; sinon démarre à 0 % (progression mesurée).
function show(label, indeterminate) {
  ensureToast();
  labelEl.textContent = label;
  toast.hidden = false;
  if (indeterminate) {
    toast.classList.add('indeterminate');
    pctEl.textContent = '';
    fillEl.style.width = '';
  } else {
    toast.classList.remove('indeterminate');
    setProgress(0);
  }
}

function setProgress(percent, label) {
  ensureToast();
  toast.classList.remove('indeterminate');
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  fillEl.style.width = clamped + '%';
  pctEl.textContent = clamped + '%';
  if (label) labelEl.textContent = label;
}

function hide(delay) {
  ensureToast();
  window.setTimeout(() => {
    toast.hidden = true;
  }, delay || 0);
}

function error(message) {
  alert(message);
}

export const ProgressToast = { show, setProgress, hide, error };
