// Logique des voix (sans DOM). La LISTE des voix vit dans le state global partagé
// (state.VOICES / state.activeVoice) ; ce module la lit depuis infos.voices, la mute,
// la persiste et émet 'voices-changed' pour que le panneau gauche se re-rende. Les
// zones (qui portent une voix) restent gérées par scoreParts : ce module ne fait que
// déléguer leur suppression. Aucun accès DOM ici.
import { state, emit } from '../modules/partitions.state.js';
import { scoreParts } from './scoreParts.js';
import { saveScoreInfos } from './proxy.js';
import { Common } from './common.js';

export const Voices = {};

// Couleur distincte : 1re couleur de la palette non encore utilisée par une voix ;
// si toutes prises, on boucle sur la palette (taille = nombre de voix).
Voices.nextColor = function () {
  const usedColors = new Set(state.VOICES.map((voice) => voice.color));
  const freeColor = Common.palette.find((color) => !usedColors.has(color));
  return freeColor || Common.palette[state.VOICES.length % Common.palette.length];
};

// Premier identifiant 'vN' libre.
Voices.nextId = function () {
  let index = 1;
  while (state.VOICES.some((voice) => voice.id === 'v' + index)) index += 1;
  return 'v' + index;
};

// La LISTE des voix (noms + couleurs + actif) vient de infos.voices (le JSON).
// Charge dans le state global et émet 'voices-changed'.
Voices.load = function () {
  const stored = (scoreParts.infos && scoreParts.infos.voices) || [];
  const voices = stored
    .filter((voice) => voice && voice.name)
    .map((voice, index) => ({
      id: voice.id || 'v' + (index + 1),
      name: voice.name,
      color: voice.color || Common.palette[index % Common.palette.length],
      on: voice.on !== false,
      isNamePending: voice.isNamePending === true,
    }));
  state.VOICES.splice(0, state.VOICES.length, ...voices);
  if (!state.VOICES.find((voice) => voice.id === state.activeVoice)) {
    state.activeVoice = state.VOICES[0] ? state.VOICES[0].id : null;
  }
  emit('voices-changed');
};

// Persiste la liste des voix dans infos.voices (id + nom + couleur + actif).
Voices.persist = function () {
  if (!scoreParts.pdfName) return;
  const payload = state.VOICES.map((voice) => ({
    id: voice.id,
    name: voice.name,
    color: voice.color,
    on: voice.on,
    ...(voice.isNamePending ? { isNamePending: true } : {}),
  }));
  if (scoreParts.infos) scoreParts.infos.voices = payload;
  saveScoreInfos(scoreParts.pdfName, { voices: payload }, function (err) {
    if (err) console.error('Erreur saveScoreInfos (voices)', err);
  });
};

// Crée une voix avec une couleur distincte, la rend active, persiste et émet.
Voices.add = function (voiceName, shouldRequireName = false) {
  const defaultVoiceName = 'Voix ' + (state.VOICES.length + 1);
  const normalizedVoiceName = typeof voiceName === 'string' ? voiceName.trim() : '';
  const voice = {
    id: Voices.nextId(),
    name: normalizedVoiceName || defaultVoiceName,
    color: Voices.nextColor(),
    on: true,
    isNamePending: shouldRequireName,
  };
  state.VOICES.push(voice);
  state.activeVoice = voice.id;
  Voices.persist();
  scoreParts.autoAssignActiveVoices();
  emit('voices-changed');
  return voice;
};

// Supprime une voix de la liste ET ses zones sur toutes les pages (via scoreParts,
// couche zones), réaffecte la voix active, persiste la liste puis émet. La
// confirmation utilisateur et la fermeture du popover restent côté UI.
Voices.remove = function (voiceId) {
  scoreParts.deleteVoiceZones(voiceId);
  const voiceIndex = state.VOICES.findIndex((voice) => voice.id === voiceId);
  if (voiceIndex >= 0) state.VOICES.splice(voiceIndex, 1);
  if (state.activeVoice === voiceId) {
    state.activeVoice = state.VOICES[0] ? state.VOICES[0].id : null;
  }
  Voices.persist();
  emit('voices-changed');
  emit('zones-changed');
};
