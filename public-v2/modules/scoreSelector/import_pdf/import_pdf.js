import { state, on, emit } from '../state.js';
import { uploadRenderedScore, toScoreName } from '../../../common/proxy.js';
import { renderPdfToImages } from '../../../common/localBackendProxy.js';

(function importPdfModule() {
  const $preview = $('#preview');
  const $drop = $('#drop');
  const $fileInput = $('#file-input');
  const $browseBtn = $('#browse-btn');

  const CATEGORIES = [
    { id: 'chamber', label: 'Musique de chambre' },
    { id: 'symphony', label: 'Symphonie' },
    { id: 'concerto', label: 'Concerto' },
    { id: 'sonata', label: 'Sonate' },
    { id: 'opera', label: 'Opéra' },
    { id: 'lied', label: 'Lied / Mélodie' },
    { id: 'sacred', label: 'Musique sacrée' },
    { id: 'solo', label: 'Pièce pour soliste' },
    { id: 'other', label: 'Autre' },
  ];

  const KNOWN_ARTISTS = [
    'L. v. Beethoven',
    'W. A. Mozart',
    'J. S. Bach',
    'F. Schubert',
    'J. Brahms',
    'G. Mahler',
    'P. I. Tchaïkovski',
    'F. Chopin',
    'C. Debussy',
    'M. Ravel',
    'F. Liszt',
    'R. Schumann',
  ];

  // ============== Score preview card (shown on score-picked event)

  function buildScorePrivacyHTML(node) {
    // Pas encore de gestion du public : seules les partitions privées existent.
    return `
      <div class="sc-social">
        <span class="sc-private">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Privée
        </span>
        <span class="sc-private-note">visible par vous uniquement</span>
      </div>`;
  }

  function renderScoreCard(node) {
    $preview.html(`
      <div class="sc-card">
        <div class="sc-thumb"></div>
        <div class="sc-meta">
          <div>
            <h3 class="sc-title">${node.name}</h3>
            <div class="sc-author">${node.author}</div>
            <div class="sc-row">
              <span><b>${node.meta.pages}</b> pages</span>
            </div>
            ${buildScorePrivacyHTML(node)}
          </div>
        </div>
      </div>
    `);
  }

  // ============== Upload progress tracking

  function setProgressPercent($card, percent) {
    $card.find('.progress-fill').css('width', Math.min(100, Math.max(0, percent)) + '%');
  }

  function buildImportingCardHTML(file) {
    return `
      <div class="importing">
        <div class="importing-head">
          <div class="importing-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>
          </div>
          <div class="importing-meta">
            <div class="importing-name">${file.name}</div>
            <div class="importing-size">${(file.size / 1024).toFixed(1)} Ko · Import en cours...</div>
          </div>
        </div>
        <div class="progress"><div class="progress-fill"></div></div>
      </div>
    `;
  }

  function handleUploadComplete($card, file) {
    setProgressPercent($card, 100);
    showClassifyForm(file);
  }

  // PWA : le PDF est rendu en images PNG DANS le navigateur (pdfjs dans un Web
  // Worker → UI fluide, remplace GraphicsMagick), puis PDF + pages sont envoyés au
  // serveur qui ne fait que les écrire. Le rendu (phase lourde) pilote 0→90 % de
  // la barre ; l'upload 90→100 %.
  async function startUpload($card, file) {
    function setSizeLabel(text) {
      $card.find('.importing-size').text((file.size / 1024).toFixed(1) + ' Ko · ' + text);
    }

    try {
      const pdfData = await file.arrayBuffer();
      const result = await renderPdfToImages(pdfData, 'medium', function (pageNum, totalPages) {
        setProgressPercent($card, Math.round((pageNum / totalPages) * 90));
        setSizeLabel('Rendu ' + pageNum + '/' + totalPages + ' pages');
      });

      const pageBlobs = result.pages.map(function (page) {
        return new Blob([page.bytes], { type: 'image/png' });
      });
      setSizeLabel('Envoi…');

      uploadRenderedScore(
        {
          pdfFile: file,
          pageBlobs: pageBlobs,
          onUploadProgress: function (ratio) {
            setProgressPercent($card, 90 + ratio * 10);
          },
        },
        function (err) {
          if (err) {
            setSizeLabel('Erreur upload (' + err.message + ')');
            return;
          }
          handleUploadComplete($card, file);
        }
      );
    } catch (renderError) {
      setSizeLabel('Erreur rendu PDF (' + (renderError.message || renderError) + ')');
    }
  }

  function handleImport(file) {
    $preview.html(buildImportingCardHTML(file));
    startUpload($preview.find('.importing'), file);
  }

  // ============== Classification form HTML builders

  function buildCategoryOptionsHTML() {
    return CATEGORIES.map(function (category) {
      return `<option value="${category.id}">${category.label}</option>`;
    }).join('');
  }

  function buildArtistDatalistHTML() {
    return KNOWN_ARTISTS.map(function (artistName) {
      return `<option value="${artistName}"></option>`;
    }).join('');
  }

  function buildArtistChipsHTML() {
    return KNOWN_ARTISTS.slice(0, 6)
      .map(function (artistName) {
        return `<button data-artist="${artistName}">${artistName}</button>`;
      })
      .join('');
  }

  function buildClassifyFormHTML(file) {
    return `
      <div class="classify">
        <div class="classify-head">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
          </div>
          <div>
            <div class="ttl">${file.name.replace(/\.[^.]+$/, '')}</div>
            <div class="sb">${(file.size / 1024).toFixed(1)} Ko · prêt à classer dans votre bibliothèque</div>
          </div>
        </div>
        <div class="classify-row">
          <div class="classify-field">
            <label>Catégorie <span class="req">*</span></label>
            <select id="cf-cat">
              <option value="">— Sélectionner —</option>
              ${buildCategoryOptionsHTML()}
            </select>
          </div>
          <div class="classify-field">
            <label>Compositeur / artiste <span class="req">*</span></label>
            <input id="cf-artist" list="cf-artists" placeholder="ex : L. v. Beethoven" />
            <datalist id="cf-artists">
              ${buildArtistDatalistHTML()}
            </datalist>
          </div>
        </div>
        <div>
          <div class="classify-field">
            <label>Suggestions</label>
          </div>
          <div class="classify-suggest" id="cf-suggest">
            ${buildArtistChipsHTML()}
          </div>
        </div>
        <div class="classify-warn" id="cf-warn">Veuillez choisir une catégorie et indiquer l'artiste pour classer la partition.</div>
      </div>
    `;
  }

  // ============== Classification form logic

  function validateClassifyForm($form, file) {
    const selectedCategoryId = $form.find('#cf-cat').val();
    const artistName = $form.find('#cf-artist').val().trim();
    const isFormValid = selectedCategoryId && artistName;

    if (isFormValid) {
      $form.find('#cf-warn').removeClass('show');
      const matchedCategory = CATEGORIES.find(function (category) {
        return category.id === selectedCategoryId;
      });
      const selectedNode = {
        // Même normalisation que le stockage (toScoreName) : le nom est l'identité
        // utilisée pour ouvrir la partition et retrouver ses pages/zones.
        name: toScoreName(file.name),
        author: artistName,
        category: matchedCategory.label,
        meta: { mvts: 1, pages: '?', key: '—', published: false },
        tags: [matchedCategory.label, 'Importé'],
        _isNewImport: true,
      };
      state.selected = selectedNode;
      emit('selection-changed', selectedNode);
    } else {
      state.selected = null;
      emit('selection-pending', null);
    }
  }

  function showClassifyForm(file) {
    $preview.html(buildClassifyFormHTML(file));
    const $form = $preview.find('.classify');

    $form.find('#cf-suggest button').on('click', function () {
      $form.find('#cf-artist').val($(this).data('artist'));
      validateClassifyForm($form, file);
    });

    $form.find('#cf-cat').on('change', function () {
      validateClassifyForm($form, file);
    });
    $form.find('#cf-artist').on('input', function () {
      validateClassifyForm($form, file);
    });

    validateClassifyForm($form, file);
  }

  // ============== Drag and drop / browse

  $drop.on('dragenter dragover', function (e) {
    e.preventDefault();
    $drop.addClass('dragover');
  });

  $drop.on('dragleave drop', function (e) {
    e.preventDefault();
    $drop.removeClass('dragover');
  });

  $drop.on('drop', function (e) {
    const file = e.originalEvent.dataTransfer.files[0];
    if (file) handleImport(file);
  });

  $drop.on('click', function (e) {
    if (e.target.tagName !== 'BUTTON') $fileInput[0].click();
  });

  $browseBtn.on('click', function (e) {
    e.stopPropagation();
    $fileInput[0].click();
  });

  $fileInput.on('change', function () {
    const file = this.files[0];
    if (file) handleImport(file);
  });

  // ============== Events from selector

  on('score-picked', function (e) {
    renderScoreCard(e.detail);
  });

  on('library-changed', function (e) {
    const message =
      e.detail === 'public'
        ? 'Parcourez les partitions publiées par la communauté.<br>Cliquez une partition pour la prévisualiser.'
        : 'Sélectionnez une partition dans la liste<br>ou importez-en une nouvelle ci-dessous.';
    $preview.html(`<div class="preview-empty">${message}</div>`);
  });
})();
