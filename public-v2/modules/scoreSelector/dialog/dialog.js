import { state, on } from '../state.js';
import { saveScoreInfos } from '../../../common/proxy.js';
import { scoreParts } from '../../../common/scoreParts.js';

(function dialogModule() {
  const $launchBtn = $('#launch-btn');
  const $footInfo = $('#foot-info');
  const $launch = $('#launch');
  const $launchName = $('#launch-name');
  const $launchAuthor = $('#launch-author');

  // ============== Footer state

  function updateFooterSelection(node) {
    if (!node) {
      $launchBtn.prop('disabled', true);
      $footInfo.text('Aucune partition sélectionnée');
      return;
    }
    $launchBtn.prop('disabled', false);
    $footInfo.html(`Sélection : <b>${node.name}</b> · ${node.author}`);
  }

  function updateFooterPending(message) {
    $launchBtn.prop('disabled', true);
    $footInfo.html(message || "<i>Renseignez l'artiste pour valider l'import</i>");
  }

  // ============== Launch

  function showLaunchAndOpen() {
    $launchName.text(state.selected.name);
    $launchAuthor.text(state.selected.author);
    $launch.addClass('on');
    scoreParts.openFirstPdfPage(state.selected.name, false, function () {
      $launch.removeClass('on');
      $('#dialog-overlay').hide();
      $('.crumbs strong').text(state.selected.name);
    });
  }

  function openScore() {
    if (!state.selected) return;
    if (state.selected._isNewImport) {
      const infos = { composer: state.selected.author };
      saveScoreInfos(state.selected.name, infos, function (err) {
        if (err) console.error('Erreur saveScoreInfos', err);
        showLaunchAndOpen();
      });
    } else {
      showLaunchAndOpen();
    }
  }

  // ============== Events

  on('selection-changed', function (e) {
    updateFooterSelection(e.detail);
  });
  on('selection-pending', function (e) {
    updateFooterPending(e.detail);
  });

  $launchBtn.on('click', openScore);
  $('.close-btn').on('click', function () {
    $('#dialog-overlay').hide();
  });
  $('.btn-ghost').on('click', function () {
    $('#dialog-overlay').hide();
  });
})();
