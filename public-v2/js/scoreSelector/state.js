// Shared state + event bus for index modules.
export const state = {
  selected: null,
  activeLib: 'mine',
};

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

fetch('/api/score/list', { method: 'POST' })
  .then(r => r.json())
  .then(scores => {
    LIB_DATA.mine = buildTreeFromScores(Array.isArray(scores) ? scores : []);
    emit('lib-loaded', 'mine');
  })
  .catch(() => {});
/*
export const PUBLIC_LIB = [
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
]; */

export const LIB_DATA = { mine: [], public: [] };
