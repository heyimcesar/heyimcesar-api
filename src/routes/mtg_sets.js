import { Router } from 'express';
import { getMissingMTGSets, getMTGSetsList } from '../services/mtg_sets.js';

const router = Router();

router.get('/my-sets', async (req, res) => {
  const data = await getMTGSetsList();
  res.json(data);
});

router.get('/missing/:set', async (req, res) => {
    const { set } = req.params;
    const data = await getMissingMTGSets(set);
    res.json(data);
  });

export default router;