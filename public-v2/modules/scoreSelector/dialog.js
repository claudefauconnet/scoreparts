import { state, on } from './state.js';
import { saveScoreInfos } from '../../common/proxy.js';

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
    if (node.category) {
      $footInfo.html(`Import : <b>${node.name}</b> · ${node.author} · ${node.category}`);
    } else {
      $footInfo.html(`Sélection : <b>${node.name}</b> · ${node.author}`);
    }
  }

  function updateFooterPending(message) {
    $launchBtn.prop('disabled', true);
    $footInfo.html(message || "<i>Renseignez la catégorie et l'artiste pour valider l'import</i>");
  }

  // ============== Launch

  function showLaunchAndRedirect() {
    $launchName.text(state.selected.name);
    $launchAuthor.text(state.selected.author);
    $launch.addClass('on');
    setTimeout(function () {
      window.location.href = '/modules/partitions.html';
    }, 1800);
  }

  function openScore() {
    if (!state.selected) return;
    if (state.selected._isNewImport) {
      const infos = { category: state.selected.category, composer: state.selected.author };
      saveScoreInfos(state.selected.name, infos, function (err) {
        if (err) console.error('Erreur saveScoreInfos', err);
        showLaunchAndRedirect();
      });
    } else {
      showLaunchAndRedirect();
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
    window.location.href = '/modules/partitions.html';
  });
  $('.btn-ghost').on('click', function () {
    window.location.href = '/modules/partitions.html';
  });
})();
