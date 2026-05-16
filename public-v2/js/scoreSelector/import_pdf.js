import { state, on, emit } from './state.js';

(function importPdfModule() {
  const preview = document.getElementById('preview');
  let previewEmpty = document.getElementById('preview-empty');
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');

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
    'L. v. Beethoven', 'W. A. Mozart', 'J. S. Bach', 'F. Schubert',
    'J. Brahms', 'G. Mahler', 'P. I. Tchaïkovski', 'F. Chopin',
    'C. Debussy', 'M. Ravel', 'F. Liszt', 'R. Schumann',
  ];
  function handleImport(file) {
    if (previewEmpty && previewEmpty.parentNode) previewEmpty.remove();
    preview.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'importing';
    card.innerHTML = `
      <div class="importing-head">
        <div class="importing-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>
        </div>
        <div class="importing-meta">
          <div class="importing-name">${file.name}</div>
          <div class="importing-size">${(file.size / 1024).toFixed(1)} Ko · Import en cours...</div>
        </div>
      </div>
      <div class="progress"><div class="progress-fill" id="imp-fill"></div></div>
    `;
    preview.appendChild(card);
    uploadAndTrack(card, file);
  }

  const socket = (typeof io === 'function') ? io() : null;

  function uploadAndTrack(card, file) {
    const fill = card.querySelector('#imp-fill');
    const sizeEl = card.querySelector('.importing-size');

    const setPercent = (p) => { fill.style.width = Math.min(100, Math.max(0, p)) + '%'; };

    const onProgress = ({ percent, current, total }) => {
      const mapped = 1 + (percent * 0.99);
      setPercent(mapped);
      if (total > 0) {
        sizeEl.textContent = `${(file.size / 1024).toFixed(1)} Ko · Conversion ${current}/${total} pages`;
      }
    };
    const onError = ({ message }) => {
      sizeEl.textContent = 'Erreur backend : ' + message;
    };

    if (socket) {
      socket.on('pdf-progress', onProgress);
      socket.on('pdf-error', onError);
    }

    const cleanup = () => {
      if (socket) {
        socket.off('pdf-progress', onProgress);
        socket.off('pdf-error', onError);
      }
    };

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('imageQuality', 'medium');
    if (socket && socket.id) formData.append('socketId', socket.id);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/pdf/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const uploadPercent = (e.loaded / e.total) * 1;
        setPercent(uploadPercent);
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) {}
        if (data.bigFile) {
          sizeEl.textContent = `Fichier trop gros (${Math.round(data.bigFile / 1000000)} Mo, max 10 Mo)`;
          return;
        }
        setPercent(100);
        showClassifyForm(file, data);
      } else {
        sizeEl.textContent = 'Erreur upload (HTTP ' + xhr.status + ')';
      }
    };

    xhr.onerror = () => {
      cleanup();
      sizeEl.textContent = 'Erreur réseau';
    };

    xhr.send(formData);
  }

  function showClassifyForm(file) {
    preview.innerHTML = '';
    const form = document.createElement('div');
    form.className = 'classify';
    form.innerHTML = `
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
            ${CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="classify-field">
          <label>Compositeur / artiste <span class="req">*</span></label>
          <input id="cf-artist" list="cf-artists" placeholder="ex : L. v. Beethoven" />
          <datalist id="cf-artists">
            ${KNOWN_ARTISTS.map(a => `<option value="${a}"></option>`).join('')}
          </datalist>
        </div>
      </div>

      <div>
        <div class="classify-field">
          <label>Suggestions</label>
        </div>
        <div class="classify-suggest" id="cf-suggest">
          ${KNOWN_ARTISTS.slice(0, 6).map(a => `<button data-a="${a}">${a}</button>`).join('')}
        </div>
      </div>

      <div class="classify-warn" id="cf-warn">Veuillez choisir une catégorie et indiquer l'artiste pour classer la partition.</div>
    `;
    preview.appendChild(form);

    const cat = form.querySelector('#cf-cat');
    const art = form.querySelector('#cf-artist');
    const warn = form.querySelector('#cf-warn');

    form.querySelectorAll('#cf-suggest button').forEach(b => {
      b.addEventListener('click', () => { art.value = b.dataset.a; validate(); });
    });

    function validate() {
      const ok = cat.value && art.value.trim();
      if (ok) {
        warn.classList.remove('show');
        const node = {
          name: file.name.replace(/\.[^.]+$/, ''),
          author: art.value.trim(),
          category: CATEGORIES.find(c => c.id === cat.value).label,
          meta: { mvts: 1, pages: '?', key: '—', published: false },
          tags: [CATEGORIES.find(c => c.id === cat.value).label, 'Importé'],
        };
        state.selected = node;
        emit('selection-changed', node);
      } else {
        state.selected = null;
        emit('selection-pending', null);
      }
    }
    cat.addEventListener('change', validate);
    art.addEventListener('input', validate);
    validate();
  }

  function statsHTML(node) {
    if (node.meta && node.meta.published) {
      return `
        <div class="sc-social">
          <span class="sc-stat heart">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z"/></svg>
            <b>${node.meta.hearts.toLocaleString('fr-FR')}</b>
          </span>
          <span class="sc-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <b>${node.meta.views.toLocaleString('fr-FR')}</b>
          </span>
          <span class="sc-stat" style="margin-left:auto;color:var(--muted);font-style:italic;">Publiée</span>
        </div>`;
    }
    return `
      <div class="sc-social">
        <span class="sc-private">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Privée
        </span>
        <span style="margin-left:auto;color:var(--muted);font-size:11px;font-style:italic;font-family:var(--serif);">visible par vous uniquement</span>
      </div>`;
  }

  function renderScoreCard(node) {
    if (previewEmpty && previewEmpty.parentNode) previewEmpty.remove();
    preview.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'sc-card';
    card.innerHTML = `
      <div class="sc-thumb"></div>
      <div class="sc-meta">
        <div>
          <h3 class="sc-title">${node.name}</h3>
          <div class="sc-author">${node.author}</div>
          <div class="sc-row">
            <span><b>${node.meta.mvts}</b> mouvements</span>
            <span><b>${node.meta.pages}</b> pages</span>
            <span>${node.meta.key}</span>
          </div>
          <div class="sc-tags">
            ${node.tags.map(t => `<span class="sc-tag">${t}</span>`).join('')}
          </div>
          ${statsHTML(node)}
        </div>
      </div>
    `;
    preview.appendChild(card);
  }

  // Show preview card when selector picks a score.
  on('score-picked', (e) => renderScoreCard(e.detail));

  // Reset preview when library tab switches.
  on('library-changed', (e) => {
    preview.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'preview-empty';
    empty.id = 'preview-empty';
    empty.innerHTML = e.detail === 'public'
      ? 'Parcourez les partitions publiées par la communauté.<br>Cliquez une partition pour la prévisualiser.'
      : 'Sélectionnez une partition dans la liste<br>ou importez-en une nouvelle ci-dessous.';
    preview.appendChild(empty);
    previewEmpty = empty;
  });

  // ============== Drag and drop / browse
  ['dragenter', 'dragover'].forEach(ev => {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); });
  });
  drop.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) handleImport(file);
  });
  drop.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') fileInput.click();
  });
  browseBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleImport(file);
  });

  
  
})();
