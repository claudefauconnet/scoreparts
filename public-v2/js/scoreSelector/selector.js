import { state, emit, on, LIB_DATA, buildTreeFromScores } from './state.js';

(function selectorModule() {
  const tree = document.getElementById('tree');
  const searchInput = document.querySelector('.pane-head .search input');
  let searchQuery = '';
  const ICONS = {
    chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    folderClosed: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
    folderOpen: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3V7zm0 4h18l-1.5 7a2 2 0 0 1-2 1.5H5.5a2 2 0 0 1-2-1.5L3 11z" /></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  };
  function nodeMatchesQuery(node, q) {
    const hay = [
      node.name,
      node.author,
      node.uploader,
      ...(Array.isArray(node.tags) ? node.tags : []),
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  function filterNodes(nodes, q) {
    if (!q) return nodes;
    const out = [];
    for (const n of nodes) {
      if (n.type === 'folder' && n.children) {
        const kids = filterNodes(n.children, q);
        if (kids.length || nodeMatchesQuery(n, q)) {
          out.push({ ...n, children: kids.length ? kids : n.children });
        }
      } else if (nodeMatchesQuery(n, q)) {
        out.push(n);
      }
    }
    return out;
  }

  

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
      ${node.type === 'score' && node.meta && !node.meta.published ? `
        <span class="node-stats">
          <span class="lock" title="Privée"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
          <button class="btn-delete" title="Supprimer la partition">${ICONS.trash}</button>
        </span>` : ''}
    `;
    wrap.appendChild(row);

    const deleteBtn = row.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Supprimer définitivement "${node.name}" ?\n\nTous les fichiers associés (PDF, images, zones) seront supprimés.`)) return;
        fetch(`/api/score/delete/${encodeURIComponent(node.name)}`, { method: 'DELETE' })
          .then(r => r.json())
          .then(() => {
            fetch('/api/score/list', { method: 'POST' })
              .then(r => r.json())
              .then(scores => {
                LIB_DATA.mine = buildTreeFromScores(Array.isArray(scores) ? scores : []);
                emit('lib-loaded', 'mine');
              });
          })
          .catch(() => alert('Erreur lors de la suppression.'));
      });
    }

    if (!isLeaf) {
      const kids = document.createElement('div');
      kids.className = 'children';
      node.children.forEach(c => kids.appendChild(buildNode(c, depth + 1)));
      wrap.appendChild(kids);

      row.addEventListener('click', () => {
        wrap.classList.toggle('open');
        const ic = row.querySelector('.node-icon');
        ic.innerHTML = wrap.classList.contains('open') ? ICONS.folderOpen : ICONS.folderClosed;
      });
    } else {
      row.addEventListener('click', () => {
        document.querySelectorAll('.node-row.selected').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        state.selected = node;
        emit('score-picked', node);
        emit('selection-changed', node);
      });
    }

    return wrap;
  }

  function renderTree() {
    tree.innerHTML = '';
    const data = filterNodes(LIB_DATA[state.activeLib], searchQuery);
    data.forEach(n => tree.appendChild(buildNode(n)));
    if (searchQuery) {
      tree.querySelectorAll('.node.folder').forEach(f => {
        f.classList.add('open');
        const ic = f.querySelector(':scope > .node-row .node-icon');
        if (ic) ic.innerHTML = ICONS.folderOpen;
      });
    } else {
      const firstFolder = tree.querySelector('.node.folder');
      if (firstFolder) {
        firstFolder.classList.add('open');
        const ic = firstFolder.querySelector('.node-row .node-icon');
        if (ic) ic.innerHTML = ICONS.folderOpen;
      }
    }
  }
  renderTree();

  on('lib-loaded', (e) => {
    if (e.detail === state.activeLib) renderTree();
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderTree();
    });
  }

  document.querySelectorAll('.lib-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.lib-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      state.activeLib = t.dataset.lib;
      renderTree();
      state.selected = null;
      emit('library-changed', state.activeLib);
      emit('selection-changed', null);
    });
  });
})();
