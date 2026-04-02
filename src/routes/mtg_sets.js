import { Router } from 'express';
import { getMissingMTGSets, getMTGSetsList, getSetInfo } from '../services/mtg_sets.js';

const router = Router();

router.get('/my-sets', async (req, res) => {
  const data = await getMTGSetsList();
  res.json(data);
});

router.get('/missing/:set', async (req, res) => {
  const { set } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  await getMissingMTGSets(set, (card) => {
    res.write(`data: ${JSON.stringify(card)}\n\n`);
  });

  res.write('event: done\ndata: done\n\n');
  res.end();
});

router.get('/set-info/:setId', async (req, res) => {
  const { setId } = req.params;
  const data = await getSetInfo(setId);
  res.json(data);
});

export default router;