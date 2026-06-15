import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Le backend (routes API + traitement + filesystem) a été retiré : tout le
// stockage et le traitement vivent désormais côté client (IndexedDB + Web Workers).
// Express ne sert plus qu'à délivrer les fichiers statiques de la PWA — équivalent
// d'un hébergement Cloudflare Pages en production.
const staticDir = path.join(__dirname, 'public-v2');
app.use(express.static(staticDir));

// Fallback SPA : toute requête non servie par un fichier statique renvoie l'app.
app.get('*', function (req, res) {
  res.sendFile(path.join(staticDir, 'index.html'));
});

export default app;
