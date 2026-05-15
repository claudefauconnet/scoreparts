# Choix d'infra

- Serveur OVH ou équivalent : plus de maintient mise en place docker pour les services et gestion du serveur par rapport au gens consultant en meme temps le site , mise en place gestion du traffic et gestion de la mémoire.
  Avantages peut couter moins cher mais plus cher en temps de temps de travail.
- Serverless : tout scale nativement pas besoin de gérer la charge d'utilisateur la mémoire ou la base de donnée ou un docker. Par contre cela ne coute pas très cher pour quelques utilisateurs mais la facture peut monter si le volume d'utilisateur augmente beaucoup.

# Plan

- Enlever tout ce qui va être json de zone...
  associer une base postgresSQL via le .env et mettre à jour les différents appels pour gérer via des tables toutes les informations que le projet a besoin. Lien entre partition et images, zones enregistrée, instruments, partitions ...  
  La base de donnée est fiable rapide et scale très bien. On peut ajuster les tables et colonnes pour développer les nouvelles features tout est centralisé. Pas de json à explorer peut provoquer lenteur et empecher le scaling. De plus si pour un format en particulier du json est nécessaire on pourra l'ajouter comme dans les users data content sur SLS.

- Faire une page de login avec inscrption + google auth (augmente la facilité d'inscription et permet un meilleur taux de convertion). Lien dans la base de donnée pour gérer les utilisateurs leur partitions disponbles , ownership partition ...

- Selon l'infra choisie :
- OVH : tout mettre dans data avec images et pdf, le client ne pourra pas charger toutes les images sur son client cela alourdit l'application rapidement. De plus que ce soit client ou serveur nous serons obligés de les stocker aussi dans notre infra sinon le client perds toutes les images à chaque rechargement de la page.
- cloud: tout stocker dans un s3 ou équivalent pour remplacer le dossier data
