import { state, emit, on, LIB_DATA, buildTreeFromScores } from './state.js';
import { deleteScore, loadMyScores } from '../proxy.js';

(function selectorModule() {
  const $tree = $('#tree');
  const $searchInput = $('.pane-head .search input');
  let searchQuery = '';

  const ICONS = {
    chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    folderClosed:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
    folderOpen:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3V7zm0 4h18l-1.5 7a2 2 0 0 1-2 1.5H5.5a2 2 0 0 1-2-1.5L3 11z" /></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  };

  // ============== Search / filter

  function nodeMatchesQuery(node, query) {
    const searchableText = [
      node.name,
      node.author,
      node.uploader,
      ...(Array.isArray(node.tags) ? node.tags : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchableText.includes(query);
  }

  function filterNodes(nodes, query) {
    if (!query) return nodes;
    const filteredNodes = [];
    for (const node of nodes) {
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterNodes(node.children, query);
        if (filteredChildren.length || nodeMatchesQuery(node, query)) {
          filteredNodes.push({
            ...node,
            children: filteredChildren.length ? filteredChildren : node.children,
          });
        }
      } else if (nodeMatchesQuery(node, query)) {
        filteredNodes.push(node);
      }
    }
    return filteredNodes;
  }

  // ============== Node HTML builders

  function buildFolderIconHTML(isOpen, depth) {
    const folderClass = depth === 0 ? 'folder' : 'subfolder';
    const iconSvg = isOpen ? ICONS.folderOpen : ICONS.folderClosed;
    return `<span class="node-icon ${folderClass}">${iconSvg}</span>`;
  }

  function buildNodeIconHTML(node, isOpen, depth) {
    if (node.type === 'folder') return buildFolderIconHTML(isOpen, depth);
    return `<span class="node-icon score">♪</span>`;
  }

  function buildPrivacyBadgeHTML(node) {
    if (node.type !== 'score' || !node.meta || node.meta.published) return '';
    return `
      <span class="node-stats">
        <span class="lock" title="Privée"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
        <button class="btn-delete" title="Supprimer la partition">${ICONS.trash}</button>
      </span>`;
  }

  // ============== Node event handlers

  function onDeleteClick(node, event) {
    event.stopPropagation();
    if (
      !confirm(
        `Supprimer définitivement "${node.name}" ?\n\nTous les fichiers associés (PDF, images, zones) seront supprimés.`
      )
    )
      return;
    deleteScore(node.name, function (err) {
      if (err) return alert('Erreur lors de la suppression.');
      loadMyScores(function (loadErr, scores) {
        if (loadErr) return;
        LIB_DATA.mine = buildTreeFromScores(scores);
        emit('lib-loaded', 'mine');
      });
    });
  }

  function onFolderRowClick($wrap, $row) {
    $wrap.toggleClass('open');
    const isOpen = $wrap.hasClass('open');
    $row.find('.node-icon').html(isOpen ? ICONS.folderOpen : ICONS.folderClosed);
  }

  function onScoreRowClick(node, $row) {
    $('.node-row.selected').removeClass('selected');
    $row.addClass('selected');
    state.selected = node;
    emit('score-picked', node);
    emit('selection-changed', node);
  }

  // ============== Node DOM builder

  function buildNode(node, depth) {
    depth = depth || 0;
    const isLeaf = node.type === 'score' || !node.children;
    const nodeClass =
      'node ' + (isLeaf ? 'leaf' : 'folder') + (node.type === 'score' ? ' score' : '');

    const $wrap = $('<div>').addClass(nodeClass).attr('data-depth', depth);
    const $row = $('<div>').addClass('node-row').html(`
      <span class="caret">${ICONS.chev}</span>
      ${buildNodeIconHTML(node, false, depth)}
      <span class="node-label">${node.name}</span>
      ${buildPrivacyBadgeHTML(node)}
    `);
    $wrap.append($row);

    const $deleteBtn = $row.find('.btn-delete');
    if ($deleteBtn.length) {
      $deleteBtn.on('click', function (event) {
        onDeleteClick(node, event);
      });
    }

    if (!isLeaf) {
      const $children = $('<div>').addClass('children');
      node.children.forEach(function (childNode) {
        $children.append(buildNode(childNode, depth + 1));
      });
      $wrap.append($children);
      $row.on('click', function () {
        onFolderRowClick($wrap, $row);
      });
    } else {
      $row.on('click', function () {
        onScoreRowClick(node, $row);
      });
    }

    return $wrap;
  }

  // ============== Tree rendering

  function openFirstFolder() {
    const $firstFolder = $tree.find('.node.folder').first();
    if (!$firstFolder.length) return;
    $firstFolder.addClass('open');
    $firstFolder.children('.node-row').find('.node-icon').html(ICONS.folderOpen);
  }

  function openAllFolders() {
    $tree.find('.node.folder').each(function () {
      $(this).addClass('open');
      $(this).children('.node-row').find('.node-icon').html(ICONS.folderOpen);
    });
  }

  function renderTree() {
    $tree.empty();
    const visibleNodes = filterNodes(LIB_DATA[state.activeLib], searchQuery);
    visibleNodes.forEach(function (treeNode) {
      $tree.append(buildNode(treeNode));
    });
    if (searchQuery) {
      openAllFolders();
    } else {
      openFirstFolder();
    }
  }

  // ============== Events

  on('lib-loaded', function (e) {
    if (e.detail === state.activeLib) renderTree();
  });

  $searchInput.on('input', function () {
    searchQuery = $searchInput.val().trim().toLowerCase();
    renderTree();
  });

  $('.lib-tab').on('click', function () {
    $('.lib-tab').removeClass('active');
    $(this).addClass('active');
    state.activeLib = $(this).data('lib');
    state.selected = null;
    renderTree();
    emit('library-changed', state.activeLib);
    emit('selection-changed', null);
  });

  renderTree();
})();
