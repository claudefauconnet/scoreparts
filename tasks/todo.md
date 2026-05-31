# Todo — Zones éditables Paper.js dans scorePlayer v2

## Objectif
v2 scorePlayer devient l'éditeur de zones réel. Paper.js = maître de la logique
(modèle de zones, coords, persistance backend via scoreParts). Zones dessinées par
Paper sur un **canvas transparent** par-dessus le `<img>` de page, stylées comme le
module (rect arrondi translucide + bordure couleur). Contrôles : bouton "New zone"
(module), drag pour déplacer, poignée pour redimensionner.

## Décisions
- [x] Rendu : Paper dessine sur canvas (option 2), corps de zone stylé module.
- [x] Cible : v2 scorePlayer = éditeur. Instruments/voices = phase ultérieure.
- [x] Data model : format backend pixels conservé (x,y,width,height,page,voice,movement,measure).
- [x] Zoom : canvas DANS `.page` (transformée CSS) → Paper en pixel-image, coords backend invariantes au zoom.
- [x] Spread : 2 pages affichées, Paper édite la page courante uniquement (canvas par page).
- [x] Image : canvas transparent, pas de Paper.Raster.

## Étapes
- [ ] 1. HTML : ajouter `<canvas>` overlay transparent dans `.page-left` et `.page-right`
      (id par côté), dans scorePlayer.html. Garde `<img>` dans `.systems`.
- [ ] 2. CSS : canvas en absolute inset:0 au-dessus de `.systems`, pointer-events activés
      seulement sur la page courante (classe `.page.editing`). Curseurs crosshair/move/ns-resize.
- [ ] 3. paper.js : adapter `drawImage` → `setupPageCanvas(canvasId, img)` :
      pas de raster, calcule coefV/coefH depuis img naturel vs canvas, configure tool+handlers.
      Min de modif : garder drawZone/getPageZones/deleteZones/dragPath/onItemMouseDown.
- [ ] 4. paper.js : style zone façon module — rect arrondi (radius), fill translucide
      couleur instrument (defaut neutre tant que pas d'instruments), bordure couleur.
- [ ] 5. paper.js : `onMouseDown` création gâtée par mode "pending new zone" (au lieu de
      créer sur tout clic vide). Drag = moveZone par défaut. Resize via poignée bas (handle
      dessiné + curseur ns-resize) au lieu de ctrl. Delete : croix dessinée ou bouton.
- [ ] 6. scorePlayer.js : remplacer le rendu DOM bidon (renderZones/state.ZONES) par le
      pilotage Paper. Bouton #act-new-zone → mode pending → clic page courante crée zone.
      Clic page → setCurrentPage + active le canvas Paper de cette page (page courante).
      Navigation prev/next + zoom existants conservés.
- [ ] 7. scoreParts.js : le canvas existe maintenant en v2 → isEditorContext devient vrai.
      Vérifier loadPdfPages/changePage branche éditeur : draw via Paper sur la page courante.
      Adapter pour spread (dessiner zones de currentPage sur son canvas).
- [ ] 8. Persistance : writeCurrentPageZones/getPageZones/saveZones inchangés. Sauver au
      changement de page courante et avant navigation.
- [ ] 9. Test manuel : ouvrir partition, créer/déplacer/redimensionner/supprimer zone,
      changer page courante (clic gauche/droite), zoomer (coords stables), recharger → zones persistées.

## Hors scope (phases suivantes)
- Édition simultanée des 2 pages (2 PaperScopes).
- Instruments/voices (couleur par instrument, pastille switch, multi-select bar).
- Auto-detect / dupliquer / auto-attribuer.

## Review
Implémenté + testé (Playwright, partition réelle IMSLP572178) :
- Canvas transparent par page, calé sur l'<img> via chaîne offsetParent → zoom CSS
  purement visuel, coords Paper invariantes (vérifié : zone (10,92) inchangée à 156%).
- Création (bouton New zone → pending → clic), déplacement (corps), redimensionnement
  (bord bas), suppression (croix) : tous OK, y compris suppression de la dernière zone.
- Style module : rect arrondi translucide acajou + bordure + poignée + croix.
- Persistance backend round-trip OK (clear→2 zones→nav→reload→reopen = 2 zones restaurées).
- Navigation de page conserve/charge les zones par page.

Bugs trouvés & corrigés en cours de test :
1. paper.js : détection croix delete visait le coin topRight (dist ~17px) au lieu du
   centre de la pastille → ajout deleteBadgeCenter().
2. scoreParts.loadPdfPages (branche éditeur) émettait 'score-loaded' AVANT le chargement
   async de l'image → l'éditeur ne trouvait pas l'<img>. Déplacé dans le callback d'image.
3. requestAnimationFrame remplacé par setTimeout(0) (rAF throttlé en onglet masqué).
4. Suppression de la DERNIÈRE zone : writeCurrentPageZones ignore une page vidée →
   écriture directe du modèle dans la branche delete.
5. loadPdfPages éditeur faisait saveZones(modèle vide) AVANT loadZones → écrasait le
   backend à chaque ouverture. Pré-save destructif supprimé (save = à la navigation/édition).

Itération UI (retour utilisateur) :
- Zones re-stylées façon module : pastille "Instrument ▾" (placeholder, affectation
  voices plus tard) toujours visible, fill translucide + bordure arrondie (radius 8).
- Poignées resize HAUT + BAS + croix delete révélées au survol (comme le hover CSS).
- "New zone" = mode activable/désactivable PERSISTANT → tracer plusieurs zones d'affilée.
- Resize haut (bord haut bouge, bas fixe) et bas implémentés + testés.

Itération UI 2 (retour utilisateur) :
- Pastille sans flèche ▾ (pas encore changeable).
- Couleur de base non affectée = #4a7a8c (teal).
- Auto-save backend (scoreParts.saveZones) à CHAQUE create/move/resize/delete (vérifié
  sur disque : zone tracée → écrite immédiatement dans le json).
- Les DEUX pages du spread affichent leurs zones (renderPage par canvas, projet Paper
  par page). Seule la page courante est éditable ; cliquer l'autre page la rend courante
  (canvas non courant en pointer-events:none → le clic remonte et bascule la page).
- Fix : l'<img> de la page de droite se charge en async → waitForPageImage
  (MutationObserver) attend son injection avant de caler le canvas.

Itération UI 3 (changement de page mal géré) — corrigé :
- loadImageIntoContainer insérait l'<img> seulement au onload → au page-changed,
  l'ancienne image (page droite, sans callback) restait → canvas calé sur l'image
  périmée, jamais re-rendu. Fix : insertion immédiate de l'<img> (avant load).
- Navigations rapides → callbacks async périmés dessinaient la mauvaise page. Fix :
  jeton renderToken, rendus périmés ignorés.
- Vérifié : nav avant/arrière + nav rapide → canvas aligné sur l'image, pageTag==src,
  zones correctes par page.

Limites connues (phases suivantes, hors scope validé) :
- La pastille deviendra le sélecteur d'instrument coloré dans la partie voices ;
  la couleur de zone suivra l'instrument affecté.
- Une seule page éditable à la fois (page courante = page cliquée) ; zones visibles
  uniquement sur la page courante.
- Instruments/voix : couleur neutre, pas de pastille switch ni multi-sélection.
- Auto-detect / dupliquer / auto-attribuer non câblés.
- Redimensionnement viewport (pas zoom) : coords en px de layout, non recalées (comme v1).
