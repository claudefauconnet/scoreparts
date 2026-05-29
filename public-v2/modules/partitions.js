// ============== Instruments
const INSTRUMENTS = [
  { id: 'violon1', name: 'Violon I', color: 'var(--violon1)', count: 4, on: true },
  { id: 'violon2', name: 'Violon II', color: 'var(--violon2)', count: 4, on: true },
  { id: 'violoncelle', name: 'Violoncelle', color: 'var(--violoncelle)', count: 3, on: true },
  { id: 'piano', name: 'Piano', color: 'var(--piano)', count: 3, on: false },
];

const list = document.getElementById('instr-list');
let activeInstr = 'violon1';

const COLOR_PALETTE = [
  '#c9534b',
  '#d99441',
  '#4a7a8c',
  '#6b6396',
  '#5e8c61',
  '#a86b9b',
  '#3a342b',
  '#b08a3e',
];

function renderInstruments() {
  list.innerHTML = '';
  INSTRUMENTS.forEach((ins, idx) => {
    const row = document.createElement('div');
    row.className = 'instr' + (ins.on ? ' on' : '') + (activeInstr === ins.id ? ' active' : '');
    row.innerHTML = `
        <button class="instr-del" data-del title="Supprimer cet instrument" aria-label="Supprimer">
          <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>
        </button>
        <div class="instr-main">
          <span class="instr-swatch" data-color title="Changer la couleur" style="background:${ins.color}"></span>
          <span class="instr-name" contenteditable="true" spellcheck="false" data-rename>${ins.name}</span>
          <span class="instr-count">${ins.count} zones</span>
          <span class="instr-toggle" data-toggle></span>
        </div>
        <div class="instr-actions">
          <button class="instr-action" data-act="erase" title="Effacer toutes les zones de cet instrument">
            <svg viewBox="0 0 24 24"><path d="M3 17l8-8 5 5-8 8H3v-5zM14 6l3-3 4 4-3 3"/></svg>
            Effacer
          </button>
          <button class="instr-action" data-act="download" title="Télécharger la voix">
            <svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>
            Télécharger
          </button>
        </div>
      `;
    row.querySelector('[data-toggle]').addEventListener('click', (e) => {
      e.stopPropagation();
      ins.on = !ins.on;
      renderInstruments();
      renderZones();
    });
    row.querySelector('[data-del]').addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.instr-pop').forEach((p) => p.remove());
      document
        .querySelectorAll('.instr.has-open-pop')
        .forEach((r) => r.classList.remove('has-open-pop'));
      const btn = e.currentTarget;
      // Toggle off if same button reopened
      if (btn.classList.contains('open')) {
        btn.classList.remove('open');
        return;
      }
      document.querySelectorAll('.instr-del.open').forEach((b) => b.classList.remove('open'));
      btn.classList.add('open');
      row.classList.add('has-open-pop');

      const pop = document.createElement('div');
      pop.className = 'instr-pop';
      pop.innerHTML = `
          <button class="instr-pop-item" data-pop-act="erase-all">
            <span class="instr-pop-icon">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
            </span>
            <span class="instr-pop-text">
              <span class="instr-pop-title">Effacer de toutes les pages</span>
              <span class="instr-pop-sub">Supprime « ${ins.name} » et ses zones sur toutes les pages</span>
            </span>
          </button>
          <button class="instr-pop-item" data-pop-act="reset-all">
            <span class="instr-pop-icon danger">
              <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            </span>
            <span class="instr-pop-text">
              <span class="instr-pop-title">Tout recommencer</span>
              <span class="instr-pop-sub">Modèle vierge : sans mouvements, sans instruments, sans zones</span>
            </span>
          </button>
        `;
      document.body.appendChild(pop);
      const r = btn.getBoundingClientRect();
      // Anchor to the right edge of the × button so popover doesn't overflow viewport
      const popW = pop.offsetWidth;
      let left = r.right - popW;
      if (left < 8) left = 8;
      pop.style.left = left + 'px';
      pop.style.top = r.bottom + 8 + 'px';

      function closePop() {
        pop.remove();
        btn.classList.remove('open');
        row.classList.remove('has-open-pop');
        document.removeEventListener('click', onDocClick, true);
      }
      function onDocClick(ev) {
        if (pop.contains(ev.target) || btn.contains(ev.target)) return;
        closePop();
      }
      setTimeout(() => document.addEventListener('click', onDocClick, true), 0);

      pop.querySelector('[data-pop-act="erase-all"]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        const i = INSTRUMENTS.findIndex((x) => x.id === ins.id);
        if (i >= 0) INSTRUMENTS.splice(i, 1);
        ZONES_LEFT = ZONES_LEFT.filter((z) => z.instr !== ins.id);
        ZONES_RIGHT = ZONES_RIGHT.filter((z) => z.instr !== ins.id);
        if (activeInstr === ins.id) activeInstr = INSTRUMENTS[0] ? INSTRUMENTS[0].id : null;
        closePop();
        renderInstruments();
        renderZones();
      });
      pop.querySelector('[data-pop-act="reset-all"]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        closePop();
        resetAll();
      });
    });
    row.querySelector('[data-color]').addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.color-pop').forEach((p) => p.remove());
      const pop = document.createElement('div');
      pop.className = 'color-pop';
      COLOR_PALETTE.forEach((c) => {
        const b = document.createElement('button');
        b.style.background = c;
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ins.color = c;
          document.documentElement.style.setProperty('--' + ins.id, c);
          pop.remove();
          renderInstruments();
          renderZones();
        });
        pop.appendChild(b);
      });
      const r = e.target.getBoundingClientRect();
      pop.style.left = r.left + 'px';
      pop.style.top = r.bottom + 6 + 'px';
      document.body.appendChild(pop);
      setTimeout(() => {
        document.addEventListener('click', () => pop.remove(), { once: true });
      }, 0);
    });
    row.querySelector('[data-rename]').addEventListener('click', (e) => e.stopPropagation());
    row.querySelector('[data-rename]').addEventListener('blur', (e) => {
      const v = e.target.textContent.trim();
      ins.name = v || ins.name;
      e.target.textContent = ins.name;
    });
    row.querySelector('[data-rename]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    row.querySelectorAll('.instr-action').forEach((b) => {
      b.addEventListener('click', (e) => e.stopPropagation());
    });
    row.addEventListener('click', () => {
      activeInstr = ins.id;
      renderInstruments();
    });
    list.appendChild(row);
  });
}

// ============== Zones (interactive)
// top / height stored in % relative to .zones container so we can freely move/resize.
const SYS_COUNT = 5;
const SYS_H = 100 / SYS_COUNT;
function makeZone(instr, sys, label) {
  return {
    id: 'z' + Math.random().toString(36).slice(2, 7),
    instr,
    top: sys * SYS_H + 1,
    height: SYS_H - 4,
    x: 4,
    w: 94,
    label,
  };
}
let ZONES_LEFT = [
  makeZone('violon1', 0, 'Violon I'),
  makeZone('violon2', 1, 'Violon II'),
  makeZone('violoncelle', 2, 'Violoncelle'),
  makeZone('piano', 3, 'Piano'),
];
let ZONES_RIGHT = [
  makeZone('violon2', 0, 'Violon II'),
  makeZone('violon1', 1, 'Violon I'),
  makeZone('violoncelle', 2, 'Violoncelle'),
  makeZone('piano', 3, 'Piano'),
];

function instrLabel(id) {
  const ins = INSTRUMENTS.find((i) => i.id === id);
  return ins ? ins.name : id;
}

function renderZones() {
  [
    ['zones-left', ZONES_LEFT],
    ['zones-right', ZONES_RIGHT],
  ].forEach(([containerId, zones]) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    zones.forEach((z) => {
      const ins = INSTRUMENTS.find((i) => i.id === z.instr);
      if (!ins || !ins.on) return;
      const div = document.createElement('div');
      div.className = 'zone ' + z.instr;
      div.dataset.zoneId = z.id;
      div.style.top = z.top + '%';
      div.style.height = z.height + '%';
      div.style.left = z.x + '%';
      div.style.width = z.w + '%';
      div.innerHTML = `
          <span class="zone-tag" data-act="switch">${instrLabel(z.instr)}</span>
          <button class="del" data-act="delete" title="Supprimer la zone">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          <div class="rs top" data-act="resize-top"></div>
          <div class="rs bot" data-act="resize-bot"></div>
        `;
      attachZoneEvents(div, z, zones, containerId);
      el.appendChild(div);
    });
  });
}

function attachZoneEvents(div, z, zones, containerId) {
  const container = document.getElementById(containerId);

  div.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = zones.indexOf(z);
    if (idx >= 0) zones.splice(idx, 1);
    renderZones();
  });

  div
    .querySelector('[data-act="switch"]')
    .addEventListener('mousedown', (e) => e.stopPropagation());
  div.querySelector('[data-act="switch"]').addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.zone-pop').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'zone-pop';
    INSTRUMENTS.forEach((ins) => {
      const b = document.createElement('button');
      b.className = ins.id === z.instr ? 'active' : '';
      b.innerHTML = `<span class="sw" style="background:${ins.color}"></span> ${ins.name}`;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        z.instr = ins.id;
        z.label = ins.name;
        if (!ins.on) ins.on = true;
        pop.remove();
        renderInstruments();
        renderZones();
      });
      pop.appendChild(b);
    });
    const r = e.target.getBoundingClientRect();
    pop.style.left = r.left + 'px';
    pop.style.top = r.bottom + 4 + 'px';
    document.body.appendChild(pop);
    setTimeout(() => {
      const closer = (ev) => {
        if (!pop.contains(ev.target)) {
          pop.remove();
          document.removeEventListener('click', closer);
        }
      };
      document.addEventListener('click', closer);
    }, 0);
  });

  // Resize handles (vertical only)
  div.querySelectorAll('.rs').forEach((h) => {
    h.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startResize(e, z, h.dataset.act === 'resize-top', container);
    });
  });

  // Delete button shouldn't start drag
  div
    .querySelector('[data-act="delete"]')
    .addEventListener('mousedown', (e) => e.stopPropagation());

  // Drag to move
  div.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-act]')) return;
    startDrag(e, z, container, div);
  });
}

function startDrag(e, z, container, div) {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const startY = e.clientY;
  const startX = e.clientX;
  const startTop = z.top;
  const startLeft = z.x;
  div.classList.add('dragging', 'active');
  function move(ev) {
    const dy = ((ev.clientY - startY) / rect.height) * 100;
    const dx = ((ev.clientX - startX) / rect.width) * 100;
    z.top = Math.max(0, Math.min(100 - z.height, startTop + dy));
    z.x = Math.max(0, Math.min(100 - z.w, startLeft + dx));
    div.style.top = z.top + '%';
    div.style.left = z.x + '%';
  }
  function up() {
    div.classList.remove('dragging', 'active');
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function startResize(e, z, fromTop, container) {
  const rect = container.getBoundingClientRect();
  const startY = e.clientY;
  const startTop = z.top;
  const startH = z.height;
  const minH = 2;
  const div = container.querySelector('[data-zone-id="' + z.id + '"]');
  div && div.classList.add('active');
  function move(ev) {
    const dy = ((ev.clientY - startY) / rect.height) * 100;
    if (fromTop) {
      const newTop = Math.max(0, Math.min(startTop + startH - minH, startTop + dy));
      const delta = newTop - startTop;
      z.top = newTop;
      z.height = Math.max(minH, startH - delta);
    } else {
      z.height = Math.max(minH, Math.min(100 - z.top, startH + dy));
    }
    if (div) {
      div.style.top = z.top + '%';
      div.style.height = z.height + '%';
    }
  }
  function up() {
    div && div.classList.remove('active');
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

// ============== Render staves and notes
function renderSystems(targetId, count) {
  const el = document.getElementById(targetId);
  el.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sys = document.createElement('div');
    sys.className = 'system';
    const staff = document.createElement('div');
    staff.className = 'staff';
    sys.appendChild(staff);

    // Treble clef
    const clef = document.createElement('div');
    clef.className = 'clef';
    clef.innerHTML = `
        <svg viewBox="0 0 22 60" fill="currentColor">
          <path d="M11 2c-1.5 0-3 1.2-3.2 2.8C7.5 6.8 8 8.5 9 10.4c.5 1 1 2 1.4 3.1.4 1 .6 2.1.7 3.3 0 1-.1 2-.4 2.9-.3 1-.7 1.9-1.2 2.8-1.2 2.1-3 4-3 6.5 0 2.4 1.7 4.5 4 5 .4.1.9.1 1.3.1 1.4 0 2.7-.6 3.7-1.6 1-1 1.6-2.4 1.6-3.9 0-1.4-.5-2.7-1.4-3.7-.9-1-2.2-1.6-3.6-1.7v1.6c.9.1 1.7.5 2.3 1.1.6.6 1 1.5 1 2.4 0 .9-.4 1.8-1 2.4-.6.6-1.5 1-2.4 1-1.4 0-2.6-.8-3.2-2C9.4 25.7 11 23.6 12.2 21c.6-1.3 1-2.6 1.3-4 .3-1.4.4-2.8.3-4.2 0-1.4-.3-2.8-.8-4.1-.5-1.3-1.2-2.5-2-3.5-.6-.7-1-1.3-1-2 0-.6.5-1.2 1.1-1.2.6 0 1.1.5 1.1 1.1 0 .3-.1.6-.3.8 0 0-.2.2-.2.4 0 .4.4.6.7.6.5 0 1-.5 1-1.1C13.4 3 12.4 2 11 2zM10.4 36c-.4 0-.8.1-1.1.3-.3.2-.5.5-.5.9 0 .5.4.9.9.9.2 0 .4-.1.5-.2.1-.1.1-.2.1-.3 0-.1 0-.1-.1-.2-.1-.1-.2-.1-.3-.1-.1 0-.3 0-.3-.2 0-.2.2-.3.4-.3.4 0 .8.3.8.7 0 .5-.4 1-1 1-.7 0-1.2-.6-1.2-1.3 0-.9.7-1.6 1.7-1.6.5 0 1 .2 1.4.5l.6.5-.4.4-.5-.5c-.3-.2-.7-.4-1-.4z"/>
        </svg>`;
    sys.appendChild(clef);

    // Notes layer
    const notes = document.createElement('div');
    notes.className = 'notes';
    // Generate procedural notes
    const seed = (targetId.charCodeAt(targetId.length - 1) + i) * 7;
    const beats = 8 + (seed % 4);
    for (let n = 0; n < beats; n++) {
      const noteX = 14 + (n + 0.5) * (86 / beats); // % horizontal, leaving room for clef + bar
      const lineY = 6 + ((seed + n * 3) % 6) * 5; // px vertical jitter inside staff (~33px range)
      const note = document.createElement('span');
      note.className = 'note' + ((seed + n) % 5 === 0 ? ' hollow' : '');
      note.style.left = noteX + '%';
      note.style.top = 8 + lineY + 'px';
      notes.appendChild(note);

      const stem = document.createElement('span');
      stem.className = 'stem';
      const stemUp = (seed + n) % 2 === 0;
      stem.style.left = noteX + 0.7 + '%';
      if (stemUp) {
        stem.style.top = 8 + lineY - 22 + 'px';
        stem.style.height = '22px';
      } else {
        stem.style.top = 8 + lineY + 4 + 'px';
        stem.style.height = '22px';
      }
      notes.appendChild(stem);
    }
    // Beam pairs
    for (let n = 0; n < beats - 1; n += 3) {
      const beam = document.createElement('span');
      beam.className = 'beam';
      const x1 = 14 + (n + 0.5) * (86 / beats);
      const x2 = 14 + (n + 1.5) * (86 / beats);
      beam.style.left = x1 + '%';
      beam.style.width = x2 - x1 + '%';
      beam.style.top = '4px';
      notes.appendChild(beam);
    }
    sys.appendChild(notes);

    el.appendChild(sys);
  }
}

renderSystems('systems-left', 4);
renderSystems('systems-right', 4);
renderInstruments();
renderZones();

// ============== Mouvements
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const TOTAL_PAGES = 8;
let currentPage = 3;
const MOVEMENTS = [
  { id: 1, name: 'Adagio ma non troppo', startPage: 1 },
  { id: 2, name: 'Allegro molto vivace', startPage: 4 },
  { id: 3, name: 'Allegro moderato', startPage: 7 },
];
let activeMvt = 1;

function mvtRange(idx) {
  const m = MOVEMENTS[idx];
  const next = MOVEMENTS[idx + 1];
  const end = next ? next.startPage - 1 : TOTAL_PAGES;
  return { start: m.startPage, end };
}

function currentMvtIdx() {
  // index of movement that contains currentPage
  for (let i = MOVEMENTS.length - 1; i >= 0; i--) {
    if (currentPage >= MOVEMENTS[i].startPage) return i;
  }
  return 0;
}

function renderMvt() {
  MOVEMENTS.sort((a, b) => a.startPage - b.startPage);
  const idx = MOVEMENTS.findIndex((m) => m.id === activeMvt);
  const m = MOVEMENTS[idx >= 0 ? idx : 0];
  if (idx < 0) activeMvt = m.id;
  const order = MOVEMENTS.findIndex((x) => x.id === activeMvt);
  document.getElementById('mvt-number').innerHTML =
    'Mouvement <span class="roman">' + (ROMAN[order] || order + 1) + '</span>';
  document.getElementById('mvt-name').value = m.name;

  const list = document.getElementById('mvt-list');
  list.innerHTML = '';
  MOVEMENTS.forEach((mv, i) => {
    const r = mvtRange(i);
    const item = document.createElement('div');
    item.className = 'mvt-item' + (mv.id === activeMvt ? ' active' : '');
    item.innerHTML = `
        <span class="num">${ROMAN[i] || i + 1}</span>
        <span class="name">${mv.name || 'Sans titre'}</span>
        <span class="range">p. ${r.start}–${r.end}</span>
        <button class="del" title="Supprimer ce mouvement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      `;
    item.addEventListener('click', () => {
      activeMvt = mv.id;
      renderMvt();
      closeMvtPop();
    });
    item.querySelector('.del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (MOVEMENTS.length <= 1) return;
      const removeIdx = MOVEMENTS.findIndex((x) => x.id === mv.id);
      MOVEMENTS.splice(removeIdx, 1);
      if (activeMvt === mv.id) activeMvt = MOVEMENTS[0].id;
      renderMvt();
    });
    list.appendChild(item);
  });

  // Update "Créer un mouvement ici" subtitle
  const sub = document.getElementById('mvt-add-sub');
  if (sub) {
    const exists = MOVEMENTS.find((mv) => mv.startPage === currentPage);
    if (exists) {
      sub.textContent = `un mouvement commence déjà à la page ${currentPage}`;
    } else {
      const sorted = [...MOVEMENTS].sort((a, b) => a.startPage - b.startPage);
      const nextMvt = sorted.find((mv) => mv.startPage > currentPage);
      const endPage = nextMvt ? nextMvt.startPage - 1 : TOTAL_PAGES;
      const target = nextMvt ? `avant « ${nextMvt.name} »` : `jusqu'à la fin de la partition`;
      sub.innerHTML = `pages <b>${currentPage}–${endPage}</b> — ${target}`;
    }
  }
}

function openMvtPop() {
  document.getElementById('mvt-pop').classList.add('open');
}
function closeMvtPop() {
  document.getElementById('mvt-pop').classList.remove('open');
}
document.getElementById('mvt-dd').addEventListener('click', (e) => {
  e.stopPropagation();
  const pop = document.getElementById('mvt-pop');
  pop.classList.toggle('open');
});
document.getElementById('mvt-edit').addEventListener('click', () => {
  document.getElementById('mvt-name').focus();
  document.getElementById('mvt-name').select();
});
document.getElementById('mvt-name').addEventListener('input', (e) => {
  const m = MOVEMENTS.find((x) => x.id === activeMvt);
  if (m) m.name = e.target.value;
});
document.getElementById('mvt-name').addEventListener('blur', renderMvt);
document.getElementById('mvt-add').addEventListener('click', () => {
  // Create a new movement starting at currentPage (if no conflict)
  if (MOVEMENTS.some((m) => m.startPage === currentPage)) {
    // already a movement here — just switch to it
    const existing = MOVEMENTS.find((m) => m.startPage === currentPage);
    activeMvt = existing.id;
  } else {
    const newId = Math.max(...MOVEMENTS.map((m) => m.id)) + 1;
    MOVEMENTS.push({ id: newId, name: 'Nouveau mouvement', startPage: currentPage });
    activeMvt = newId;
  }
  renderMvt();
  closeMvtPop();
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('mvt-pop');
  if (!pop.classList.contains('open')) return;
  if (!document.getElementById('mvt').contains(e.target)) closeMvtPop();
});
renderMvt();

function resetAll() {
  // Blank template — no zones, no instruments, single placeholder mouvement
  INSTRUMENTS.length = 0;
  ZONES_LEFT = [];
  ZONES_RIGHT = [];
  activeInstr = null;
  MOVEMENTS.splice(0, MOVEMENTS.length, { id: 1, name: 'Sans titre', startPage: 1 });
  activeMvt = 1;
  renderInstruments();
  renderZones();
  renderMvt();
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', resetAll);

// ============== Download split button
const dlSplit = document.getElementById('dl-split');
const dlMenu = document.getElementById('dl-menu');
const dlCaret = document.getElementById('dl-caret');
// Mark PDF as default
dlMenu.querySelector('[data-fmt="pdf"]').classList.add('default');
dlCaret.addEventListener('click', (e) => {
  e.stopPropagation();
  dlMenu.classList.toggle('open');
  // refresh zip count from active instruments
  const n = INSTRUMENTS.filter((i) => i.on).length;
  const badge = document.getElementById('dl-zip-count');
  const sub = document.getElementById('dl-zip-sub');
  badge.textContent = n;
  sub.textContent =
    n === 0
      ? 'aucun instrument actif'
      : n === 1
        ? '1 PDF (instrument actif)'
        : `${n} PDF (un par instrument actif)`;
});
document.addEventListener('click', (e) => {
  if (!dlSplit.contains(e.target)) dlMenu.classList.remove('open');
});

// ============== Multi-selection (rubber-band marquee)
// Drag on empty area of a page → select all intersecting zones → toolbar appears
function setupMarquee(pageEl, zonesArr, containerId) {
  pageEl.addEventListener('mousedown', (e) => {
    // ignore if on a zone, a clear button, or in 'new zone' mode
    if (pendingZone) return;
    if (e.target.closest('.zone') || e.target.closest('.clear-zones-btn')) return;
    e.preventDefault();

    // clear previous selection across pages
    document.querySelectorAll('.zone.selected').forEach((z) => z.classList.remove('selected'));
    document.querySelectorAll('.multi-bar').forEach((b) => b.remove());

    const stageBody = document.getElementById('stage-body');
    const sbRect = stageBody.getBoundingClientRect();
    const marquee = document.createElement('div');
    marquee.className = 'marquee';
    stageBody.appendChild(marquee);

    const startX = e.clientX,
      startY = e.clientY;
    function move(ev) {
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      const w = Math.abs(ev.clientX - startX);
      const h = Math.abs(ev.clientY - startY);
      marquee.style.left = x - sbRect.left + 'px';
      marquee.style.top = y - sbRect.top + 'px';
      marquee.style.width = w + 'px';
      marquee.style.height = h + 'px';
    }
    function up(ev) {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const mRect = marquee.getBoundingClientRect();
      marquee.remove();
      if (mRect.width < 4 || mRect.height < 4) return;

      // Find intersecting zones across BOTH pages
      const selected = [];
      document.querySelectorAll('.zone').forEach((zEl) => {
        const r = zEl.getBoundingClientRect();
        const inter = !(
          r.right < mRect.left ||
          r.left > mRect.right ||
          r.bottom < mRect.top ||
          r.top > mRect.bottom
        );
        if (inter) {
          zEl.classList.add('selected');
          selected.push(zEl);
        }
      });
      if (selected.length === 0) return;

      showMultiBar(selected, mRect);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}
// attach to both pages
setupMarquee(document.querySelector('.page-left'), ZONES_LEFT, 'zones-left');
setupMarquee(document.querySelector('.page-right'), ZONES_RIGHT, 'zones-right');

function findZoneObj(zEl) {
  const id = zEl.dataset.zoneId;
  let z = ZONES_LEFT.find((x) => x.id === id);
  if (z) return { z, arr: ZONES_LEFT };
  z = ZONES_RIGHT.find((x) => x.id === id);
  if (z) return { z, arr: ZONES_RIGHT };
  return null;
}

function showMultiBar(selectedEls, mRect) {
  const bar = document.createElement('div');
  bar.className = 'multi-bar on';
  // position fixed in viewport coordinates, above the marquee
  const bw = 200; // approx min width
  const margin = 10;
  let left = mRect.left + mRect.width / 2;
  let top = mRect.top - 50;
  if (top < margin) top = mRect.bottom + 10;
  bar.style.left = left + 'px';
  bar.style.top = top + 'px';
  bar.style.transform = 'translateX(-50%)';
  bar.innerHTML = `
      <span class="mb-count">${selectedEls.length} zones</span>
      <button data-act="move" title="Déplacer toutes les zones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M12 2v20M2 12h20"/></svg>
      </button>
      <button data-act="instrument" title="Changer l'instrument">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M14 18h7M18 14v8"/></svg>
      </button>
      <button data-act="delete" class="danger" title="Supprimer toutes les zones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
      </button>
    `;
  document.body.appendChild(bar);

  // clamp horizontal to viewport
  requestAnimationFrame(() => {
    const r = bar.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    if (dx) bar.style.left = parseFloat(bar.style.left) + dx + 'px';
  });

  // Move all
  bar.querySelector('[data-act="move"]').addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX,
      startY = e.clientY;
    const startStates = selectedEls.map((zEl) => {
      const info = findZoneObj(zEl);
      const cont = zEl.parentElement;
      const cRect = cont.getBoundingClientRect();
      return { zEl, info, cRect, startTop: info.z.top, startX: info.z.x };
    });
    function mv(ev) {
      startStates.forEach((s) => {
        const dy = ((ev.clientY - startY) / s.cRect.height) * 100;
        const dx = ((ev.clientX - startX) / s.cRect.width) * 100;
        s.info.z.top = Math.max(0, Math.min(100 - s.info.z.height, s.startTop + dy));
        s.info.z.x = Math.max(0, Math.min(100 - s.info.z.w, s.startX + dx));
        s.zEl.style.top = s.info.z.top + '%';
        s.zEl.style.left = s.info.z.x + '%';
      });
    }
    function mu() {
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', mu);
    }
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', mu);
  });

  // Delete all
  bar.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    selectedEls.forEach((zEl) => {
      const info = findZoneObj(zEl);
      if (!info) return;
      const idx = info.arr.indexOf(info.z);
      if (idx >= 0) info.arr.splice(idx, 1);
    });
    bar.remove();
    renderZones();
  });

  // Change instrument for all
  bar.querySelector('[data-act="instrument"]').addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.zone-pop').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'zone-pop';
    INSTRUMENTS.forEach((ins) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="sw" style="background:${ins.color}"></span> ${ins.name}`;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!ins.on) ins.on = true;
        selectedEls.forEach((zEl) => {
          const info = findZoneObj(zEl);
          if (info) {
            info.z.instr = ins.id;
            info.z.label = ins.name;
          }
        });
        pop.remove();
        renderInstruments();
        renderZones();
      });
      pop.appendChild(b);
    });
    const r = e.currentTarget.getBoundingClientRect();
    pop.style.left = r.left + 'px';
    pop.style.top = r.bottom + 4 + 'px';
    document.body.appendChild(pop);
    setTimeout(() => {
      const closer = (ev) => {
        if (!pop.contains(ev.target)) {
          pop.remove();
          document.removeEventListener('click', closer);
        }
      };
      document.addEventListener('click', closer);
    }, 0);
  });
}

// Click outside any selected zone or the bar deselects
document.addEventListener('mousedown', (e) => {
  if (
    e.target.closest('.multi-bar') ||
    e.target.closest('.zone.selected') ||
    e.target.closest('.marquee') ||
    e.target.closest('.zone-pop')
  )
    return;
  document.querySelectorAll('.zone.selected').forEach((z) => z.classList.remove('selected'));
  document.querySelectorAll('.multi-bar').forEach((b) => b.remove());
});

// ============== Global tooltip (body-attached, escapes overflow clipping)
(function () {
  let tip = null;
  let timer = null;
  function show(el) {
    const title = el.getAttribute('data-tooltip');
    const sub = el.getAttribute('data-tooltip-sub') || '';
    if (!title) return;
    tip = document.createElement('div');
    tip.className = 'global-tooltip';
    tip.innerHTML = sub ? `<strong>${title}</strong>${sub}` : `<strong>${title}</strong>`;
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect();
    // measure
    const tw = tip.offsetWidth,
      th = tip.offsetHeight;
    let cx = r.left + r.width / 2;
    let top = r.top - th - 10;
    let placeBelow = false;
    if (top < 8) {
      top = r.bottom + 10;
      placeBelow = true;
    }
    // clamp horizontal
    const margin = 8;
    let left = cx - tw / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tw - margin, left));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.transform = 'none';
    // reposition arrow
    const arrowX = cx - left;
    tip.style.setProperty('--arrow-x', arrowX + 'px');
    tip.classList.toggle('below', placeBelow);
    requestAnimationFrame(() => tip.classList.add('show'));
  }
  function hide() {
    clearTimeout(timer);
    if (tip) {
      tip.remove();
      tip = null;
    }
  }
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tooltip]');
    if (!t) return;
    hide();
    timer = setTimeout(() => show(t), 350);
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target.closest('[data-tooltip]');
    if (!t) return;
    hide();
  });
  window.addEventListener('scroll', hide, true);
})();

// ============== New zone (action)
const stage = document.getElementById('stage');
const actNewZone = document.getElementById('act-new-zone');
let pendingZone = false;
function setPending(on) {
  pendingZone = on;
  stage.classList.toggle('pending-zone', on);
  actNewZone.classList.toggle('active', on);
}
actNewZone.addEventListener('click', () => setPending(!pendingZone));
document.getElementById('cancel-new-zone').addEventListener('click', () => setPending(false));

function attachCreateOnPage(pageEl, zonesArr, containerId) {
  pageEl.addEventListener('click', (e) => {
    if (!pendingZone) return;
    // only react if click is inside the .zones overlay area
    const container = document.getElementById(containerId);
    const rect = container.getBoundingClientRect();
    const cx = e.clientX,
      cy = e.clientY;
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return;
    const xPct = ((cx - rect.left) / rect.width) * 100;
    const yPct = ((cy - rect.top) / rect.height) * 100;
    const w = 80;
    const h = SYS_H - 4;
    const ins = INSTRUMENTS.find((i) => i.id === activeInstr) || INSTRUMENTS[0];
    if (!ins.on) ins.on = true;
    zonesArr.push({
      id: 'z' + Math.random().toString(36).slice(2, 7),
      instr: ins.id,
      label: ins.name,
      x: Math.max(0, Math.min(100 - w, xPct - w / 2)),
      w: w,
      top: Math.max(0, Math.min(100 - h, yPct - h / 2)),
      height: h,
    });
    setPending(false);
    renderInstruments();
    renderZones();
  });
}
attachCreateOnPage(document.querySelector('.page-left'), ZONES_LEFT, 'zones-left');
attachCreateOnPage(document.querySelector('.page-right'), ZONES_RIGHT, 'zones-right');

// ============== Paramètres
const rectInput = document.getElementById('rect-h');
function applyRectH() {
  const h = Math.max(10, Math.min(200, parseInt(rectInput.value) || 40));
  document.documentElement.style.setProperty('--zone-h', h + 'px');
  document.querySelectorAll('.zone').forEach((z) => {
    z.style.minHeight = h + 'px';
  });
}
rectInput.addEventListener('input', applyRectH);
document.getElementById('rect-minus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || 40) - 1;
  applyRectH();
});
document.getElementById('rect-plus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || 40) + 1;
  applyRectH();
});

const pill = document.getElementById('tweaks-pill');
const panel = document.getElementById('tweaks-panel');
pill.addEventListener('click', () => panel.classList.toggle('open'));

document.querySelectorAll('#tw-book-style button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#tw-book-style button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('stage').dataset.bookStyle = b.dataset.val;
  });
});

document.querySelectorAll('#tw-state button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#tw-state button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    const stage = document.getElementById('stage');
    const book = document.getElementById('book');
    const closed = document.getElementById('closed-book-wrap');
    if (b.dataset.val === 'empty') {
      stage.classList.add('empty');
      book.style.display = 'none';
      closed.style.display = 'grid';
    } else {
      stage.classList.remove('empty');
      book.style.display = 'grid';
      closed.style.display = 'none';
    }
  });
});

// Toggle empty state via "Open" button
document.getElementById('open-btn').addEventListener('click', () => {
  document.querySelector('#tw-state button[data-val="loaded"]').click();
});
