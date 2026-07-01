# Lessons

- Quand une demande précise qu’un composant doit seulement gérer un overflow,
  conserver strictement son apparence existante : ne pas ajouter de carte, fond,
  bordure ou autre traitement visuel sans demande explicite.
- Pour un nouvel ordre de pied de panneau, valider la position par rapport à tous
  les éléments existants, notamment les paramètres.
- Tester un panneau fixe en hauteur réduite : les zones flexibles essentielles ne
  doivent jamais être écrasées par des contrôles secondaires à hauteur fixe.
