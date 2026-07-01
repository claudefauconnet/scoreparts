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
  const composerMap = new Map();
  for (const score of scores) {
    const composerName = score.composer || 'Inconnu';
    if (!composerMap.has(composerName)) composerMap.set(composerName, []);
    composerMap.get(composerName).push({
      name: score.pdfName,
      type: 'score',
      author: composerName,
      meta: { pages: score.totalPages, published: score.published },
      tags: [],
    });
  }
  return Array.from(composerMap.entries()).map(([composerName, scoreNodes]) => ({
    name: composerName,
    type: 'folder',
    children: scoreNodes,
  }));
}

loadMyScores(function (err, scores) {
  if (err) return;
  LIB_DATA.mine = buildTreeFromScores(scores);
  emit('lib-loaded', 'mine');
});
