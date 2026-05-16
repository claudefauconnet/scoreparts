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

// Library datasets (shared so selector and any future consumer agree).
export const MY_LIB = [
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
];

export const LIB_DATA = { mine: MY_LIB, public: PUBLIC_LIB };
