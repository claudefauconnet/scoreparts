# scoreparts

## Prérequis

Installer GraphicsMagick et Ghostscript :

### Windows

```sh
scoop install graphicsmagick ghostscript
```

ou via les installeurs officiels :

- GraphicsMagick : <http://www.graphicsmagick.org/download.html>
- Ghostscript : <https://www.ghostscript.com/releases/>

### Mac

```sh
brew install graphicsmagick ghostscript
```

### Linux

```sh
apt install graphicsmagick ghostscript
```

## Configuration

```sh
cp .env.example .env
```

Remplir `.env` si `gm` ou `gs` ne sont pas dans le PATH :

```env
GM_EXE=C:\Users\toi\scoop\shims\gm.exe
GS_BIN=C:\Users\toi\tools\gs\bin
```

## Lancer le projet

```sh
npm install
npm run start
```

Ouvrir : <http://localhost:3006/>

## Formatage du code (Prettier)

Ce projet utilise [Prettier](https://prettier.io/) pour garantir un style uniforme et éviter les conflits Git sur le formatage.

### Formater le code

```sh
npm run format
```

### Vérifier sans modifier

```sh
npm run format:check
```

### Avant de pousser en production

> **Conseil** : Toujours lancer `npm run format` avant de pousser. Un code non formaté génère des diffs parasites, complique les revues et augmente les risques de conflits Git stylistiques.

```sh
npm run format
git add -A
git commit -m "style: format code"
```

La config Prettier est dans [.prettierrc](.prettierrc), les exclusions dans [.prettierignore](.prettierignore).
