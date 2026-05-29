import { state, on, emit, instrLabel, SYS_H } from '../partitions.state.js';

// ============== Render staves and notes
function renderSystems(targetId, count) {
  const el = document.getElementById(targetId);
  el.innerHTML = '';
  for (let systemIndex = 0; systemIndex < count; systemIndex++) {
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
    const seed = (targetId.charCodeAt(targetId.length - 1) + systemIndex) * 7;
    const beats = 8 + (seed % 4);
    for (let noteIndex = 0; noteIndex < beats; noteIndex++) {
      const noteX = 14 + (noteIndex + 0.5) * (86 / beats); // % horizontal, leaving room for clef + bar
      const lineY = 6 + ((seed + noteIndex * 3) % 6) * 5; // px vertical jitter inside staff (~33px range)
      const note = document.createElement('span');
      note.className = 'note' + ((seed + noteIndex) % 5 === 0 ? ' hollow' : '');
      note.style.left = noteX + '%';
      note.style.top = 8 + lineY + 'px';
      notes.appendChild(note);

      const stem = document.createElement('span');
      stem.className = 'stem';
      const stemUp = (seed + noteIndex) % 2 === 0;
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
    for (let beamIndex = 0; beamIndex < beats - 1; beamIndex += 3) {
      const beam = document.createElement('span');
      beam.className = 'beam';
      const x1 = 14 + (beamIndex + 0.5) * (86 / beats);
      const x2 = 14 + (beamIndex + 1.5) * (86 / beats);
      beam.style.left = x1 + '%';
      beam.style.width = x2 - x1 + '%';
      beam.style.top = '4px';
      notes.appendChild(beam);
    }
    sys.appendChild(notes);

    el.appendChild(sys);
  }
}

// ============== Zones (interactive)
// top / height stored in % relative to .zones container so we can freely move/resize.
function renderZones() {
  [
    ['zones-left', state.ZONES_LEFT],
    ['zones-right', state.ZONES_RIGHT],
  ].forEach(([containerId, zones]) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    zones.forEach((zone) => {
      const ins = state.INSTRUMENTS.find((i) => i.id === zone.instr);
      if (!ins || !ins.on) return;
      const div = document.createElement('div');
      div.className = 'zone ' + zone.instr;
      div.dataset.zoneId = zone.id;
      div.style.top = zone.top + '%';
      div.style.height = zone.height + '%';
      div.style.left = zone.x + '%';
      div.style.width = zone.w + '%';
      div.innerHTML = `
          <span class="zone-tag" data-act="switch">${instrLabel(zone.instr)}</span>
          <button class="del" data-act="delete" title="Supprimer la zone">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          <div class="rs top" data-act="resize-top"></div>
          <div class="rs bot" data-act="resize-bot"></div>
        `;
      attachZoneEvents(div, zone, zones, containerId);
      el.appendChild(div);
    });
  });
}

function attachZoneEvents(div, zone, zones, containerId) {
  const container = document.getElementById(containerId);

  div.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = zones.indexOf(zone);
    if (idx >= 0) zones.splice(idx, 1);
    emit('zones-changed');
  });

  div
    .querySelector('[data-act="switch"]')
    .addEventListener('mousedown', (e) => e.stopPropagation());
  div.querySelector('[data-act="switch"]').addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.zone-pop').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'zone-pop';
    state.INSTRUMENTS.forEach((ins) => {
      const button = document.createElement('button');
      button.className = ins.id === zone.instr ? 'active' : '';
      button.innerHTML = `<span class="sw" style="background:${ins.color}"></span> ${ins.name}`;
      button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        zone.instr = ins.id;
        zone.label = ins.name;
        if (!ins.on) ins.on = true;
        pop.remove();
        emit('instruments-changed');
        emit('zones-changed');
      });
      pop.appendChild(button);
    });
    const rect = e.target.getBoundingClientRect();
    pop.style.left = rect.left + 'px';
    pop.style.top = rect.bottom + 4 + 'px';
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
  div.querySelectorAll('.rs').forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startResize(e, zone, handle.dataset.act === 'resize-top', container);
    });
  });

  // Delete button shouldn't start drag
  div
    .querySelector('[data-act="delete"]')
    .addEventListener('mousedown', (e) => e.stopPropagation());

  // Drag to move
  div.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-act]')) return;
    startDrag(e, zone, container, div);
  });
}

function startDrag(e, zone, container, div) {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const startY = e.clientY;
  const startX = e.clientX;
  const startTop = zone.top;
  const startLeft = zone.x;
  div.classList.add('dragging', 'active');
  function move(ev) {
    const dy = ((ev.clientY - startY) / rect.height) * 100;
    const dx = ((ev.clientX - startX) / rect.width) * 100;
    zone.top = Math.max(0, Math.min(100 - zone.height, startTop + dy));
    zone.x = Math.max(0, Math.min(100 - zone.w, startLeft + dx));
    div.style.top = zone.top + '%';
    div.style.left = zone.x + '%';
  }
  function up() {
    div.classList.remove('dragging', 'active');
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function startResize(e, zone, fromTop, container) {
  const rect = container.getBoundingClientRect();
  const startY = e.clientY;
  const startTop = zone.top;
  const startHeight = zone.height;
  const minHeight = 2;
  const div = container.querySelector('[data-zone-id="' + zone.id + '"]');
  div && div.classList.add('active');
  function move(ev) {
    const dy = ((ev.clientY - startY) / rect.height) * 100;
    if (fromTop) {
      const newTop = Math.max(0, Math.min(startTop + startHeight - minHeight, startTop + dy));
      const delta = newTop - startTop;
      zone.top = newTop;
      zone.height = Math.max(minHeight, startHeight - delta);
    } else {
      zone.height = Math.max(minHeight, Math.min(100 - zone.top, startHeight + dy));
    }
    if (div) {
      div.style.top = zone.top + '%';
      div.style.height = zone.height + '%';
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

// ============== Multi-selection (rubber-band marquee)
// Drag on empty area of a page → select all intersecting zones → toolbar appears
function setupMarquee(pageEl) {
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

    const startX = e.clientX;
    const startY = e.clientY;
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
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const mRect = marquee.getBoundingClientRect();
      marquee.remove();
      if (mRect.width < 4 || mRect.height < 4) return;

      // Find intersecting zones across BOTH pages
      const selected = [];
      document.querySelectorAll('.zone').forEach((zoneEl) => {
        const r = zoneEl.getBoundingClientRect();
        const intersects = !(
          r.right < mRect.left ||
          r.left > mRect.right ||
          r.bottom < mRect.top ||
          r.top > mRect.bottom
        );
        if (intersects) {
          zoneEl.classList.add('selected');
          selected.push(zoneEl);
        }
      });
      if (selected.length === 0) return;

      showMultiBar(selected, mRect);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

function findZoneObj(zoneEl) {
  const id = zoneEl.dataset.zoneId;
  let zone = state.ZONES_LEFT.find((x) => x.id === id);
  if (zone) return { zone, arr: state.ZONES_LEFT };
  zone = state.ZONES_RIGHT.find((x) => x.id === id);
  if (zone) return { zone, arr: state.ZONES_RIGHT };
  return null;
}

function showMultiBar(selectedEls, mRect) {
  const bar = document.createElement('div');
  bar.className = 'multi-bar on';
  // position fixed in viewport coordinates, above the marquee
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
    const startX = e.clientX;
    const startY = e.clientY;
    const startStates = selectedEls.map((zoneEl) => {
      const info = findZoneObj(zoneEl);
      const container = zoneEl.parentElement;
      const cRect = container.getBoundingClientRect();
      return { zoneEl, info, cRect, startTop: info.zone.top, startX: info.zone.x };
    });
    function move(ev) {
      startStates.forEach((s) => {
        const dy = ((ev.clientY - startY) / s.cRect.height) * 100;
        const dx = ((ev.clientX - startX) / s.cRect.width) * 100;
        s.info.zone.top = Math.max(0, Math.min(100 - s.info.zone.height, s.startTop + dy));
        s.info.zone.x = Math.max(0, Math.min(100 - s.info.zone.w, s.startX + dx));
        s.zoneEl.style.top = s.info.zone.top + '%';
        s.zoneEl.style.left = s.info.zone.x + '%';
      });
    }
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  // Delete all
  bar.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    selectedEls.forEach((zoneEl) => {
      const info = findZoneObj(zoneEl);
      if (!info) return;
      const idx = info.arr.indexOf(info.zone);
      if (idx >= 0) info.arr.splice(idx, 1);
    });
    bar.remove();
    emit('zones-changed');
  });

  // Change instrument for all
  bar.querySelector('[data-act="instrument"]').addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.zone-pop').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'zone-pop';
    state.INSTRUMENTS.forEach((ins) => {
      const button = document.createElement('button');
      button.innerHTML = `<span class="sw" style="background:${ins.color}"></span> ${ins.name}`;
      button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!ins.on) ins.on = true;
        selectedEls.forEach((zoneEl) => {
          const info = findZoneObj(zoneEl);
          if (info) {
            info.zone.instr = ins.id;
            info.zone.label = ins.name;
          }
        });
        pop.remove();
        emit('instruments-changed');
        emit('zones-changed');
      });
      pop.appendChild(button);
    });
    const rect = e.currentTarget.getBoundingClientRect();
    pop.style.left = rect.left + 'px';
    pop.style.top = rect.bottom + 4 + 'px';
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

function attachCreateOnPage(pageEl, zonesKey, containerId) {
  pageEl.addEventListener('click', (e) => {
    if (!pendingZone) return;
    // only react if click is inside the .zones overlay area
    const container = document.getElementById(containerId);
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;
    if (clickX < rect.left || clickX > rect.right || clickY < rect.top || clickY > rect.bottom)
      return;
    const xPct = ((clickX - rect.left) / rect.width) * 100;
    const yPct = ((clickY - rect.top) / rect.height) * 100;
    const width = 80;
    const height = SYS_H - 4;
    const ins = state.INSTRUMENTS.find((i) => i.id === state.activeInstr) || state.INSTRUMENTS[0];
    if (!ins.on) ins.on = true;
    state[zonesKey].push({
      id: 'z' + Math.random().toString(36).slice(2, 7),
      instr: ins.id,
      label: ins.name,
      x: Math.max(0, Math.min(100 - width, xPct - width / 2)),
      w: width,
      top: Math.max(0, Math.min(100 - height, yPct - height / 2)),
      height,
    });
    setPending(false);
    emit('instruments-changed');
    emit('zones-changed');
  });
}

// ============== Init
renderSystems('systems-left', 4);
renderSystems('systems-right', 4);
renderZones();

const pageLeft = document.querySelector('.page-left');
const pageRight = document.querySelector('.page-right');
setupMarquee(pageLeft);
setupMarquee(pageRight);
attachCreateOnPage(pageLeft, 'ZONES_LEFT', 'zones-left');
attachCreateOnPage(pageRight, 'ZONES_RIGHT', 'zones-right');

on('zones-changed', renderZones);
