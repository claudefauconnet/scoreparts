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
