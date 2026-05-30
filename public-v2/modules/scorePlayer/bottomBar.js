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
    var step = scoreParts.pageStep();
    var lastIndex = Math.floor((scoreParts.totalPages - 1) / step) * step;
    scoreParts.changePage(lastIndex);
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
  var step = scoreParts.pageStep();
  var pageIndex = Math.floor((pageNumber - 1) / step) * step;
  scoreParts.changePage(pageIndex);
});
