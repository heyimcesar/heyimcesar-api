import './env.js';
import express from 'express';
import ouraRouter from './routes/oura.js';
import mtgSetsRouter from './routes/mtg_sets.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import serveStatic from 'serve-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// API routes
app.use('/oura', ouraRouter);
app.use('/mtg-sets', mtgSetsRouter);

// Static files
app.use(serveStatic(join(__dirname, '../client/dist')));

// Catch-all for React Router
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));