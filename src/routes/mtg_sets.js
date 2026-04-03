import { Router } from 'express';
import {
  getMTGSetsList,
  getMissingCardIds,
  getOwnedCardIds,
  getCardFromScryfall,
  getSetInfo
} from '../services/mtg_sets.js';

const router = Router();

router.get('/', (req, res) => res.json({ service: 'mtg-sets', status: 'ok' }));

router.get('/my-sets', async (req, res) => {
  const data = await getMTGSetsList();
  res.json(data);
});

router.get('/missing-ids/:set', async (req, res) => {
  const { set } = req.params;
  const ids = await getMissingCardIds(set);
  res.json(ids);
});

router.get('/owned-ids/:set', async (req, res) => {
  const { set } = req.params;
  const ids = await getOwnedCardIds(set);
  res.json(ids);
});

router.get('/card/:set/:number', async (req, res) => {
  const { set, number } = req.params;
  const scryfallCard = await getCardFromScryfall(set, number);

  if (scryfallCard.object === 'error') {
    if (scryfallCard.status === 429) {
      return res.status(429).json({ id: number });
    }
    console.log(`Card not found: ${set} ${number}`, scryfallCard);
    return res.json({ id: number, back_image_uri: null });
  }

  res.json({
    id: number,
    tcgplayer_id: scryfallCard.tcgplayer_id,
    name: scryfallCard.name,
    price: scryfallCard.prices?.usd,
    price_foil: scryfallCard.prices?.usd_foil,
    image_uri: scryfallCard.card_faces
      ? scryfallCard.card_faces[0].image_uris?.normal
      : scryfallCard.image_uris?.normal,
    back_image_uri: scryfallCard.card_faces
      ? scryfallCard.card_faces[1]?.image_uris?.normal
      : null
  });
});

router.get('/set-info/:setId', async (req, res) => {
  const { setId } = req.params;
  const data = await getSetInfo(setId);
  res.json(data);
});

export default router;