import express from 'express';
import dotenv from 'dotenv';
import ouraRouter from './routes/oura.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import serveStatic from 'serve-static';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// API routes first
app.use('/oura', ouraRouter);

// React app catches everything else
app.use(serveStatic(join(__dirname, '../client/dist')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));