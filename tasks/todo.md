# Voices in JSON + rename instruments→voices (public-v2)

## Goal
- Store voices list in score JSON (`infos.voices`), synced w/ backend, editable in frontend, distinct colors per voice.
- Frontend term "instrument" disappears → "voix"/voice everywhere in public-v2.

## Pattern
Mirror movements: list in `state`, loaded from `scoreParts.infos.voices` on `score-loaded`, persisted via `saveScoreInfos`.

## Tasks
- [ ] data JSON: add real `voices` array to L_Estro_Armonico conc 10 (id/name/color/on)
- [ ] partitions.state.js: INSTRUMENTS→VOICES, activeInstr→activeVoice, instrLabel→voiceLabel, makeZone arg instr→voice, zone .instr→.voice, event instruments-changed→voices-changed, empty default list, resetAll
- [ ] voices module js: loadVoices + persistVoices (mirror movements), renderVoices, rename instr→voice, distinct color picker, wire add/del/rename/color/toggle persist, +Ajouter handler
- [ ] voices.html: ids/classes instr→voice, texts instrument→voix
- [ ] voices.css: .instr*→.voice*
- [ ] headerBar.js: state.INSTRUMENTS→VOICES, texts
- [ ] scoreParts.js: init infos.voices on load
- [ ] paper.js: zone.instrLabel→voiceLabel, default 'Instrument'→'Voix', comments
- [ ] partitions.css + scorePlayer.css: comments instrument→voix
- [ ] verify: no remaining instr/INSTRUMENT/instrument in public-v2

## Phase 2 — boutons voix + generateVoiceScore
- [x] A: rename generateInstrumentScore→generateVoiceScore (v1: proxy.js def, voices.js, cutParts.html ; v2 legacy call) + nouvelle fn ESM generateVoiceScore dans public-v2/common/proxy.js (POST /api/score/generatePart, sans DOM v1)
- [x] B: scoreParts.deleteVoiceZones(id) + bouton Effacer câblé
- [x] C: scoreParts.voicePagesZones(id) + downloadVoice → generateVoiceScore + bouton Télécharger
- [x] E: count zones dérivé (zoneCountsByVoice par zone.voice===id)
- [x] D: gate "≥1 voix pour tracer" (scorePlayer act-new-zone) + Auto-attribuer (mvt courant, cyclique j%n) → scoreParts.assignVoicesToZones ; pastille nom+couleur de la voix (paper.zoneColors + makePill colorée)

## Review
Done. JSON valide, `node --check` OK sur tous les .js touchés.
- JSON: `voices` ajouté (7 voix réelles, couleurs distinctes) à L_Estro conc 10.
- state.js: VOICES/activeVoice/voiceLabel, makeZone(voice), event voices-changed, listes vides par défaut.
- voices.js: loadVoices/persistVoices (miroir movements via saveScoreInfos), renderVoices, couleur distincte (nextVoiceColor), +Ajouter câblé, persist sur add/del/rename/color/toggle.
- voices.html/.css, headerBar.js/.html, scoreParts.js (init infos.voices), paper.js, partitions.css, scorePlayer.css: instr→voice, textes instrument→voix.

Reste (hors scope frontend pur):
- `Proxy.generateInstrumentScore` (common/voices.js legacy v1) : nom de méthode proxy défini côté v1 + route backend. Non renommé (casse la def). À traiter si on régularise le backend.
- `count` des voix = 0 (pas encore dérivé des zones).
