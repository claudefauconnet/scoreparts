import { state, emit, LIB_DATA } from './state.js';

(function selectorModule() {
  const tree = document.getElementById('tree');

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
    LIB_DATA[state.activeLib].forEach(n => tree.appendChild(buildNode(n)));
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
      state.activeLib = t.dataset.lib;
      renderTree();
      state.selected = null;
      emit('library-changed', state.activeLib);
      emit('selection-changed', null);
    });
  });
})();
