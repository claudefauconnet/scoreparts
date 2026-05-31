// Shared state for the partitions page.
// Components (voices, headerBar, scorePlayer) import the live `state` object,
// mutate it, then emit an event. Other components subscribe with `on` and re-render.
//
// Events:
//   voices-changed    → voices re-renders the list, scorePlayer re-renders zones
//   zones-changed     → scorePlayer re-renders zones
//   movements-changed → headerBar re-renders the movement selector

export const SYS_COUNT = 5;
export const SYS_H = 100 / SYS_COUNT;

export function makeZone(voice, sys, label) {
  return {
    id: 'z' + Math.random().toString(36).slice(2, 7),
    voice,
    top: sys * SYS_H + 1,
    height: SYS_H - 4,
    x: 4,
    w: 94,
    label,
  };
}

// VOICES, MOVEMENTS et la voix active sont chargés depuis le JSON de la partition
// (infos.voices / infos.movements) par les modules voices et headerBar au
// 'score-loaded'. On démarre donc avec des listes vides.
export const state = {
  VOICES: [],
  ZONES_LEFT: [],
  ZONES_RIGHT: [],
  MOVEMENTS: [],
  activeVoice: null,
  activeMvt: 1,
};

const bus = new EventTarget();

export function on(eventName, handler) {
  bus.addEventListener(eventName, handler);
}

export function emit(eventName, detail) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function voiceLabel(id) {
  const voice = state.VOICES.find((v) => v.id === id);
  return voice ? voice.name : id;
}

// Blank template — no zones, no voices, single placeholder movement.
export function resetAll() {
  state.VOICES.length = 0;
  state.ZONES_LEFT = [];
  state.ZONES_RIGHT = [];
  state.activeVoice = null;
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, { id: 1, name: 'Sans titre', startPage: 1 });
  state.activeMvt = 1;
  emit('voices-changed');
  emit('zones-changed');
  emit('movements-changed');
}
