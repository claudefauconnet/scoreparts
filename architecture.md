# Architecture — ScoreParts

```text
frontend/
├── FileImport/                  — import d'une partition
│   ├── FileImport.js
│   └── FileImportTab.html
│
├── Partition/
│   ├── PartitionSelection/      — selection de partitions et mouvement
│   │   ├── PartitionSelection.js
│   │   ├── PartitionSelection.html
│   │   └── PartitionSelection.css
│   └── PartitionPlayer/         — lecteur de partition (rendu + contrôles)
│       ├── PartitionPlayer.js
│       ├── PartitionPlayer.html
│       └── PartitionPlayer.css
│
├── Zones/                       — création et gestion des zones
│   ├── PartitionZoneGestion/    — interactions directes (clic, ctrl+clic…) +
│   │   └── PartitionZoneGestion.js
│   └── ZoneActions/             — panneau de commandes (découper voix, autodetect)
│       ├── ZoneActions.js
│       ├── ZoneActions.html
│       └── ZoneActions.css
│
├── Voices/                      — génération et attribution des voix
│   └── VoiceAttribution/
│       ├── VoiceAttribution.js
│       └── VoiceAttribution.html
│
├── Upload/                      — téléchargement des partitions générées
│   └── Upload.js
│
├── Widget/                      — composants réutilisables
│   ├── PopUpMenu/
│   │   ├── PopUpMenu.js
│   │   └── PopUpMenu.css
│   └── Jstree/
│       └── jstreeWidget.js
│
└── utils/                       — utilitaires partagés
    ├── Common.js
    └── Async.js
```
