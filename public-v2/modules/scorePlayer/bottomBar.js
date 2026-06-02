import { scoreParts } from '../../common/scoreParts.js';

const $pageInput = $('#page-input');

$('#first-page-btn').on('click', function () {
  scoreParts.changePage(0);
});

$('#prev-page-btn').on('click', function () {
  scoreParts.previousPage();
});

$('#next-page-btn').on('click', function () {
  scoreParts.nextPage();
});

$('#last-page-btn').on('click', function () {
  if (scoreParts.totalPages) {
    // Dernière page exacte ; le spread affiché est aligné au rendu.
    scoreParts.changePage(scoreParts.totalPages - 1);
  }
});

$pageInput.on('change', function () {
  var pageNumber = parseInt($pageInput.val(), 10);
  var isInvalid = isNaN(pageNumber) || pageNumber < 1;
  var isOverMax = scoreParts.totalPages !== null && pageNumber > scoreParts.totalPages;
  if (isInvalid || isOverMax) {
    $pageInput.val(scoreParts.currentPage + 1);
    return;
  }
  // La page tapée devient la page courante exacte (même si c'est la page de
  // droite, paire, d'un spread). L'alignement du spread se fait au rendu.
  scoreParts.changePage(pageNumber - 1);
});
