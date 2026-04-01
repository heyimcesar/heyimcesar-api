import express from 'express';
import dotenv from 'dotenv';
import ouraRouter from './routes/oura.js';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'heyimcesar-api is running' }));
app.use('/oura', ouraRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));