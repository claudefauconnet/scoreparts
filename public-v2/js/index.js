  // ============== Library data
  const MY_LIB = [
    {
      name: 'Musique de chambre', type: 'folder',
      children: [
        {
          name: 'Beethoven', type: 'folder',
          children: [
            { name: 'Quatuor n°14, op. 131', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 7, pages: 38, key: 'Do# mineur', published: true, hearts: 2841, views: 18420 }, tags: ['Quatuor à cordes', '1826'] },
            { name: 'Quatuor n°16, op. 135', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 4, pages: 22, key: 'Fa majeur', published: true, hearts: 1207, views: 9842 }, tags: ['Quatuor à cordes', '1826'] },
            { name: 'Trio op. 97 « À l\'Archiduc »', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 4, pages: 31, key: 'Si♭ majeur', published: false }, tags: ['Trio', '1811'] },
          ]
        },
        {
          name: 'Schubert', type: 'folder',
          children: [
            { name: 'Quatuor n°14 « La Jeune Fille et la Mort »', type: 'score', author: 'F. Schubert', meta: { mvts: 4, pages: 28, key: 'Ré mineur', published: true, hearts: 1893, views: 12047 }, tags: ['Quatuor à cordes', '1824'] },
            { name: 'Quintette à deux violoncelles, op. 163', type: 'score', author: 'F. Schubert', meta: { mvts: 4, pages: 42, key: 'Do majeur', published: false }, tags: ['Quintette', '1828'] },
          ]
        },
        {
          name: 'Brahms', type: 'folder',
          children: [
            { name: 'Sextuor n°1, op. 18', type: 'score', author: 'J. Brahms', meta: { mvts: 4, pages: 36, key: 'Si♭ majeur', published: true, hearts: 612, views: 4203 }, tags: ['Sextuor', '1860'] },
          ]
        },
      ]
    },
    {
      name: 'Symphonies', type: 'folder',
      children: [
        {
          name: 'Beethoven', type: 'folder',
          children: [
            { name: 'Symphonie n°9, op. 125', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 4, pages: 124, key: 'Ré mineur', published: true, hearts: 8924, views: 64320 }, tags: ['Symphonie', '1824', '« Choral »'] },
            { name: 'Symphonie n°5, op. 67', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 4, pages: 78, key: 'Do mineur', published: true, hearts: 7142, views: 51208 }, tags: ['Symphonie', '1808'] },
          ]
        },
        {
          name: 'Mahler', type: 'folder',
          children: [
            { name: 'Symphonie n°2 « Résurrection »', type: 'score', author: 'G. Mahler', meta: { mvts: 5, pages: 196, key: 'Do mineur', published: false }, tags: ['Symphonie', '1894'] },
          ]
        },
      ]
    },
    {
      name: 'Concertos', type: 'folder',
      children: [
        {
          name: 'Mozart', type: 'folder',
          children: [
            { name: 'Concerto pour piano n°23, K. 488', type: 'score', author: 'W. A. Mozart', meta: { mvts: 3, pages: 64, key: 'La majeur', published: true, hearts: 3204, views: 22417 }, tags: ['Concerto', 'Piano', '1786'] },
            { name: 'Concerto pour clarinette, K. 622', type: 'score', author: 'W. A. Mozart', meta: { mvts: 3, pages: 48, key: 'La majeur', published: false }, tags: ['Concerto', 'Clarinette', '1791'] },
          ]
        },
        {
          name: 'Tchaïkovski', type: 'folder',
          children: [
            { name: 'Concerto pour violon, op. 35', type: 'score', author: 'P. I. Tchaïkovski', meta: { mvts: 3, pages: 72, key: 'Ré majeur', published: true, hearts: 4571, views: 31082 }, tags: ['Concerto', 'Violon', '1878'] },
          ]
        },
      ]
    },
    {
      name: 'Sonates', type: 'folder',
      children: [
        {
          name: 'Beethoven', type: 'folder',
          children: [
            { name: 'Sonate n°14 « Clair de lune »', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 3, pages: 18, key: 'Do# mineur', published: true, hearts: 12407, views: 92531 }, tags: ['Sonate', 'Piano', '1801'] },
            { name: 'Sonate n°8 « Pathétique »', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 3, pages: 22, key: 'Do mineur', published: true, hearts: 5821, views: 38104 }, tags: ['Sonate', 'Piano', '1798'] },
          ]
        },
      ]
    },
    {
      name: 'Récents', type: 'folder',
      children: [
        { name: 'Quatuor n°14, op. 131', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 7, pages: 38, key: 'Do# mineur', published: true, hearts: 2841, views: 18420 }, tags: ['Quatuor à cordes', '1826'] },
        { name: 'Sonate « Clair de lune »', type: 'score', author: 'L. v. Beethoven', meta: { mvts: 3, pages: 18, key: 'Do# mineur', published: false }, tags: ['Sonate', 'Piano'] },
      ]
    },
  ];

  const PUBLIC_LIB = [
    {
      name: 'Populaires cette semaine', type: 'folder',
      children: [
        { name: 'Symphonie n°9 « Du Nouveau Monde »', type: 'score', author: 'A. Dvořák', uploader: '@maestro_alex', meta: { mvts: 4, pages: 142, key: 'Mi mineur', published: true, hearts: 24180, views: 184392 }, tags: ['Symphonie', '1893'] },
        { name: 'Les Quatre Saisons — « Printemps »', type: 'score', author: 'A. Vivaldi', uploader: '@chamberlin', meta: { mvts: 3, pages: 28, key: 'Mi majeur', published: true, hearts: 18742, views: 142817 }, tags: ['Concerto', '1725'] },
        { name: 'Boléro', type: 'score', author: 'M. Ravel', uploader: '@nonalee', meta: { mvts: 1, pages: 44, key: 'Do majeur', published: true, hearts: 11503, views: 89241 }, tags: ['Orchestre', '1928'] },
      ]
    },
    {
      name: 'Musique de chambre', type: 'folder',
      children: [
        {
          name: 'Beethoven', type: 'folder',
          children: [
            { name: 'Quatuor n°14, op. 131', type: 'score', author: 'L. v. Beethoven', uploader: '@quatuor_alma', meta: { mvts: 7, pages: 38, key: 'Do# mineur', published: true, hearts: 5482, views: 41207 }, tags: ['Quatuor à cordes', '1826'] },
            { name: 'Septuor, op. 20', type: 'score', author: 'L. v. Beethoven', uploader: '@vienne_ensemble', meta: { mvts: 6, pages: 52, key: 'Mi♭ majeur', published: true, hearts: 1842, views: 12407 }, tags: ['Septuor', '1799'] },
          ]
        },
        {
          name: 'Debussy', type: 'folder',
          children: [
            { name: 'Quatuor à cordes, op. 10', type: 'score', author: 'C. Debussy', uploader: '@parisensemble', meta: { mvts: 4, pages: 32, key: 'Sol mineur', published: true, hearts: 3092, views: 21408 }, tags: ['Quatuor à cordes', '1893'] },
          ]
        },
        {
          name: 'Ravel', type: 'folder',
          children: [
            { name: 'Trio pour piano, violon et violoncelle', type: 'score', author: 'M. Ravel', uploader: '@nonalee', meta: { mvts: 4, pages: 28, key: 'La mineur', published: true, hearts: 2417, views: 17820 }, tags: ['Trio', '1914'] },
          ]
        },
      ]
    },
    {
      name: 'Piano solo', type: 'folder',
      children: [
        {
          name: 'Chopin', type: 'folder',
          children: [
            { name: 'Nocturne op. 9 n°2', type: 'score', author: 'F. Chopin', uploader: '@nocturna', meta: { mvts: 1, pages: 6, key: 'Mi♭ majeur', published: true, hearts: 28471, views: 218042 }, tags: ['Nocturne', '1832'] },
            { name: 'Ballade n°1, op. 23', type: 'score', author: 'F. Chopin', uploader: '@pianissimo', meta: { mvts: 1, pages: 14, key: 'Sol mineur', published: true, hearts: 9214, views: 71208 }, tags: ['Ballade', '1836'] },
          ]
        },
        {
          name: 'Liszt', type: 'folder',
          children: [
            { name: 'La Campanella', type: 'score', author: 'F. Liszt', uploader: '@virtuoso_l', meta: { mvts: 1, pages: 12, key: 'Sol# mineur', published: true, hearts: 14082, views: 102374 }, tags: ['Étude', '1851'] },
          ]
        },
        {
          name: 'Bach', type: 'folder',
          children: [
            { name: 'Prélude n°1, BWV 846', type: 'score', author: 'J. S. Bach', uploader: '@bachboy', meta: { mvts: 1, pages: 4, key: 'Do majeur', published: true, hearts: 31204, views: 247108 }, tags: ['Prélude', '1722'] },
            { name: 'Goldberg — Aria', type: 'score', author: 'J. S. Bach', uploader: '@cembalo', meta: { mvts: 1, pages: 3, key: 'Sol majeur', published: true, hearts: 8741, views: 65820 }, tags: ['Variations', '1741'] },
          ]
        },
      ]
    },
    {
      name: 'Symphonies', type: 'folder',
      children: [
        {
          name: 'Beethoven', type: 'folder',
          children: [
            { name: 'Symphonie n°9 « Choral »', type: 'score', author: 'L. v. Beethoven', uploader: '@philharmonia', meta: { mvts: 4, pages: 124, key: 'Ré mineur', published: true, hearts: 17820, views: 138420 }, tags: ['Symphonie', '1824'] },
          ]
        },
        {
          name: 'Mozart', type: 'folder',
          children: [
            { name: 'Symphonie n°40, K. 550', type: 'score', author: 'W. A. Mozart', uploader: '@mozartienne', meta: { mvts: 4, pages: 88, key: 'Sol mineur', published: true, hearts: 12048, views: 92810 }, tags: ['Symphonie', '1788'] },
          ]
        },
      ]
    },
    {
      name: 'Opéra & Vocal', type: 'folder',
      children: [
        { name: 'Casta Diva — Norma', type: 'score', author: 'V. Bellini', uploader: '@operaria', meta: { mvts: 1, pages: 16, key: 'Fa majeur', published: true, hearts: 6184, views: 48217 }, tags: ['Air d\'opéra', '1831'] },
        { name: 'La Reine de la Nuit — Air', type: 'score', author: 'W. A. Mozart', uploader: '@diva', meta: { mvts: 1, pages: 8, key: 'Ré mineur', published: true, hearts: 9817, views: 72084 }, tags: ['Opéra', '1791'] },
      ]
    },
  ];

  // ============== Render tree
  const tree = document.getElementById('tree');
  let selected = null;

  // SVG icons
  const ICONS = {
    chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    folderClosed: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
    folderOpen: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3V7zm0 4h18l-1.5 7a2 2 0 0 1-2 1.5H5.5a2 2 0 0 1-2-1.5L3 11z" /></svg>',
  };

  function nodeIconHTML(node, isOpen, depth) {
    if (node.type === 'folder') {
      return `<span class="node-icon ${depth === 0 ? 'folder' : 'subfolder'}">${isOpen ? ICONS.folderOpen : ICONS.folderClosed}</span>`;
    }
    return `<span class="node-icon score">♪</span>`;
  }

  function buildNode(node, depth = 0) {
    const isLeaf = node.type === 'score' || !node.children;
    const wrap = document.createElement('div');
    wrap.className = 'node ' + (isLeaf ? 'leaf' : 'folder') + (node.type === 'score' ? ' score' : '');
    wrap.dataset.depth = depth;

    const row = document.createElement('div');
    row.className = 'node-row';
    row.innerHTML = `
      <span class="caret">${ICONS.chev}</span>
      ${nodeIconHTML(node, false, depth)}
      <span class="node-label">${node.name}</span>
      ${node.type === 'score' && node.meta ? `
        <span class="node-stats">
          ${node.meta.published
            ? `<span class="heart"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z"/></svg> ${node.meta.hearts > 999 ? (node.meta.hearts/1000).toFixed(1)+'k' : node.meta.hearts}</span>`
            : `<span class="lock" title="Privée"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>`
          }
          <span>${node.meta.pages}p</span>
        </span>` : ''}
    `;
    wrap.appendChild(row);

    if (!isLeaf) {
      const kids = document.createElement('div');
      kids.className = 'children';
      node.children.forEach(c => kids.appendChild(buildNode(c, depth + 1)));
      wrap.appendChild(kids);

      row.addEventListener('click', () => {
        wrap.classList.toggle('open');
        // refresh icon
        const ic = row.querySelector('.node-icon');
        ic.innerHTML = wrap.classList.contains('open') ? ICONS.folderOpen : ICONS.folderClosed;
      });
    } else {
      row.addEventListener('click', () => {
        document.querySelectorAll('.node-row.selected').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        selectScore(node);
      });
    }

    return wrap;
  }

  LIB_DATA = { mine: MY_LIB, public: PUBLIC_LIB };
  let activeLib = 'mine';

  function renderTree() {
    tree.innerHTML = '';
    LIB_DATA[activeLib].forEach(n => tree.appendChild(buildNode(n)));
    // open first folder by default
    const firstFolder = tree.querySelector('.node.folder');
    if (firstFolder) {
      firstFolder.classList.add('open');
      const ic = firstFolder.querySelector('.node-row .node-icon');
      if (ic) ic.innerHTML = ICONS.folderOpen;
    }
  }
  renderTree();

  document.querySelectorAll('.lib-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.lib-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      activeLib = t.dataset.lib;
      renderTree();
      // reset preview
      preview.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'preview-empty';
      empty.id = 'preview-empty';
      empty.innerHTML = activeLib === 'public'
        ? 'Parcourez les partitions publiées par la communauté.<br>Cliquez une partition pour la prévisualiser.'
        : 'Sélectionnez une partition dans la liste<br>ou importez-en une nouvelle ci-dessous.';
      preview.appendChild(empty);
      launchBtn.disabled = true;
      footInfo.textContent = 'Aucune partition sélectionnée';
    });
  });

  // ============== Selection
  const preview = document.getElementById('preview');
  const previewEmpty = document.getElementById('preview-empty');
  const launchBtn = document.getElementById('launch-btn');
  const footInfo = document.getElementById('foot-info');

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

  function selectScore(node) {
    selected = node;
    previewEmpty.remove();
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
    launchBtn.disabled = false;
    footInfo.innerHTML = `Sélection : <b>${node.name}</b> · ${node.author}`;
  }

  // ============== Drag and drop / browse
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file-input');

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
  document.getElementById('browse-btn').addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleImport(file);
  });

  function handleImport(file) {
    previewEmpty.remove?.();
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

    const fill = card.querySelector('#imp-fill');
    let p = 0;
    const iv = setInterval(() => {
      p += 8 + Math.random() * 16;
      if (p >= 100) {
        p = 100;
        fill.style.width = '100%';
        clearInterval(iv);
        setTimeout(() => {
          showClassifyForm(file);
        }, 400);
      } else {
        fill.style.width = p + '%';
      }
    }, 200);
  }

  // ============== Classification form (required after import)
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
        // Build "selected" node
        selected = {
          name: file.name.replace(/\.[^.]+$/, ''),
          author: art.value.trim(),
          category: CATEGORIES.find(c => c.id === cat.value).label,
          meta: { mvts: 1, pages: '?', key: '—', published: false },
          tags: [CATEGORIES.find(c => c.id === cat.value).label, 'Importé'],
        };
        launchBtn.disabled = false;
        footInfo.innerHTML = `Import : <b>${selected.name}</b> · ${selected.author} · ${selected.category}`;
      } else {
        launchBtn.disabled = true;
        footInfo.innerHTML = `<i>Renseignez la catégorie et l'artiste pour valider l'import</i>`;
      }
    }
    cat.addEventListener('change', validate);
    art.addEventListener('input', validate);
    validate();
  }

  // ============== Launch
  launchBtn.addEventListener('click', () => {
    if (!selected) return;
    document.getElementById('launch-name').textContent = selected.name;
    document.getElementById('launch-author').textContent = selected.author;
    document.getElementById('launch').classList.add('on');
    setTimeout(() => {
      window.location.href = '/html/partitions.html';
    }, 1800);
  });

  // ============== Cancel/Close
  document.querySelector('.close-btn').addEventListener('click', () => {
    window.location.href = '/html/partitions.html';
  });
  document.querySelector('.btn-ghost').addEventListener('click', () => {
    window.location.href = '/html/partitions.html';
  });
