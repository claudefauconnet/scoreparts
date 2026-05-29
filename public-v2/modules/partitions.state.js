// Shared state for the partitions page.
// Components (voices, headerBar, scorePlayer) import the live `state` object,
// mutate it, then emit an event. Other components subscribe with `on` and re-render.
//
// Events:
//   instruments-changed → voices re-renders the list, scorePlayer re-renders zones
//   zones-changed       → scorePlayer re-renders zones
//   movements-changed   → headerBar re-renders the movement selector

export const SYS_COUNT = 5;
export const SYS_H = 100 / SYS_COUNT;

export function makeZone(instr, sys, label) {
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

export const state = {
  INSTRUMENTS: [
    { id: 'violon1', name: 'Violon I', color: 'var(--violon1)', count: 4, on: true },
    { id: 'violon2', name: 'Violon II', color: 'var(--violon2)', count: 4, on: true },
    { id: 'violoncelle', name: 'Violoncelle', color: 'var(--violoncelle)', count: 3, on: true },
    { id: 'piano', name: 'Piano', color: 'var(--piano)', count: 3, on: false },
  ],
  ZONES_LEFT: [
    makeZone('violon1', 0, 'Violon I'),
    makeZone('violon2', 1, 'Violon II'),
    makeZone('violoncelle', 2, 'Violoncelle'),
    makeZone('piano', 3, 'Piano'),
  ],
  ZONES_RIGHT: [
    makeZone('violon2', 0, 'Violon II'),
    makeZone('violon1', 1, 'Violon I'),
    makeZone('violoncelle', 2, 'Violoncelle'),
    makeZone('piano', 3, 'Piano'),
  ],
  MOVEMENTS: [
    { id: 1, name: 'Adagio ma non troppo', startPage: 1 },
    { id: 2, name: 'Allegro molto vivace', startPage: 4 },
    { id: 3, name: 'Allegro moderato', startPage: 7 },
  ],
  activeInstr: 'violon1',
  activeMvt: 1,
};

const bus = new EventTarget();

export function on(eventName, handler) {
  bus.addEventListener(eventName, handler);
}

export function emit(eventName, detail) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function instrLabel(id) {
  const ins = state.INSTRUMENTS.find((instrument) => instrument.id === id);
  return ins ? ins.name : id;
}

// Blank template — no zones, no instruments, single placeholder movement.
export function resetAll() {
  state.INSTRUMENTS.length = 0;
  state.ZONES_LEFT = [];
  state.ZONES_RIGHT = [];
  state.activeInstr = null;
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, { id: 1, name: 'Sans titre', startPage: 1 });
  state.activeMvt = 1;
  emit('instruments-changed');
  emit('zones-changed');
  emit('movements-changed');
}
