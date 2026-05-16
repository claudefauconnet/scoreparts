import { state, on } from './state.js';

(function dialogModule() {
  const launchBtn = document.getElementById('launch-btn');
  const footInfo = document.getElementById('foot-info');
  const launch = document.getElementById('launch');
  const launchName = document.getElementById('launch-name');
  const launchAuthor = document.getElementById('launch-author');

  // Reflect selection state in footer + launch button.
  on('selection-changed', (e) => {
    const node = e.detail;
    if (!node) {
      launchBtn.disabled = true;
      footInfo.textContent = 'Aucune partition sélectionnée';
      return;
    }
    launchBtn.disabled = false;
    if (node.category) {
      footInfo.innerHTML = `Import : <b>${node.name}</b> · ${node.author} · ${node.category}`;
    } else {
      footInfo.innerHTML = `Sélection : <b>${node.name}</b> · ${node.author}`;
    }
  });

  on('selection-pending', (e) => {
    launchBtn.disabled = true;
    footInfo.innerHTML = e.detail || '<i>Renseignez la catégorie et l\'artiste pour valider l\'import</i>';
  });

  async function openScore() {
    if (!state.selected) return;
    if (state.selected._isNewImport) {
      await fetch('/api/pdf/scoreInfos/' + encodeURIComponent(state.selected.name), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: state.selected.category, composer: state.selected.author }),
      });
    }
    launchName.textContent = state.selected.name;
    launchAuthor.textContent = state.selected.author;
    launch.classList.add('on');
    setTimeout(() => {
      window.location.href = '/html/partitions.html';
    }, 1800);
  }

  // Launch
  launchBtn.addEventListener('click', openScore);

  // Close + cancel
  document.querySelector('.close-btn').addEventListener('click', () => {
    window.location.href = '/html/partitions.html';
  });
  document.querySelector('.btn-ghost').addEventListener('click', () => {
    window.location.href = '/html/partitions.html';
  });
})();
