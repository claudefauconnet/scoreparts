import { loadMyScores } from '../../common/proxy.js';

export const state = {
  selected: null,
  activeLib: 'mine',
};

export const LIB_DATA = { mine: [], public: [] };

const bus = new EventTarget();

export function on(eventName, handler) {
  bus.addEventListener(eventName, handler);
}

export function emit(eventName, detail) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function buildTreeFromScores(scores) {
  const categoryMap = new Map();
  for (const score of scores) {
    const categoryName = score.category || 'Autres';
    const composerName = score.composer || 'Inconnu';
    if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, new Map());
    const composerMap = categoryMap.get(categoryName);
    if (!composerMap.has(composerName)) composerMap.set(composerName, []);
    composerMap.get(composerName).push({
      name: score.pdfName,
      type: 'score',
      author: composerName,
      meta: { pages: score.totalPages, published: score.published },
      tags: [],
    });
  }
  return Array.from(categoryMap.entries()).map(([categoryName, composerMap]) => ({
    name: categoryName,
    type: 'folder',
    children: Array.from(composerMap.entries()).map(([composerName, scoreNodes]) => ({
      name: composerName,
      type: 'folder',
      children: scoreNodes,
    })),
  }));
}

loadMyScores(function (err, scores) {
  if (err) return;
  LIB_DATA.mine = buildTreeFromScores(scores);
  emit('lib-loaded', 'mine');
});
