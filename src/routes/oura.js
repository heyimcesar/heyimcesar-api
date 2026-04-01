import { Router } from 'express';
import { getSleep } from '../services/oura.js';

const router = Router();

router.get('/', (req, res) => res.json({ service: 'oura', status: 'ok' }));

router.get('/sleep', async (req, res) => {
  const data = await getSleep();
  res.json(data);
});

export default router;