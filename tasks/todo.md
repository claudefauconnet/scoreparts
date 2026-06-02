# Découpage leftPanel + headerBar en sous-composants

## Décisions (validées)
- leftPanel → actions / voices / progress / scoreInfo (brand + layout = shell)
- headerBar → movements / download / reset (crumbs = shell, pas de JS shell)
- Orchestration : index.html charge tous les sous-fragments + scripts (pattern scoreSelector)

## leftPanel/
- [ ] leftPanel.html shell (brand + .panel hosts actions/voices/progress + host scoreInfo)
- [ ] leftPanel.css shell (sidebar, brand, panel, section-label, global-tooltip)
- [ ] leftPanel.js shell (setupGlobalTooltip)
- [ ] actions/{html,css,js}
- [ ] voices/{html,css,js}
- [ ] progress/{html,css,js}
- [ ] scoreInfo/{html,css,js}

## headerBar/
- [ ] headerBar.html shell (crumbs + hosts)
- [ ] headerBar.css shell (stage-top, crumbs, top-actions, btn, icon-btn, media)
- [ ] supprimer headerBar.js
- [ ] movements/{html,css,js}
- [ ] download/{html,css,js}
- [ ] reset/{html,css,js}

## index.html + paths
- [ ] bootstrap : shells → sous-fragments → scripts
- [ ] liens CSS par sous-composant
- [ ] corriger imports (+1 niveau ../)
- [ ] node --check

## Review
Fait. `node --check` OK sur les 8 nouveaux JS. Aucun import croisé entre panneaux.

Créé :
- leftPanel/ shell (html/css/js=tooltip) + actions/ voices/ progress/ scoreInfo/ ({html,css,js})
- headerBar/ shell (html/css, pas de js) + movements/ download/ reset/ ({html,css,js})
- index.html : liens CSS par sous-composant + bootstrap 2 phases (shells → sous-fragments → scripts)

Points d'attention :
- Hosts headerBar en `display:contents` pour préserver la grille `.stage-top` (3 colonnes).
- `#act-new-zone` (actions.html) reste câblé dans scorePlayer.js (couplage DOM existant).
- Communication inter-panneaux uniquement via bus `on/emit` + modules common.

Reste : valider le rendu réel (layout) dans le navigateur.
