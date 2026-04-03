import { Router } from 'express';
import pool from '../services/db.js';
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

router.get('/cards/:set', async (req, res) => {
  const { set } = req.params;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM mtg_cards WHERE set_id = ?',
      [set]
    );

    const cards = {};
    for (const card of rows) {
      cards[card.number] = {
        id: card.number,
        tcgplayer_id: card.tcgplayer_id,
        name: card.name,
        price: card.price,
        price_foil: card.price_foil,
        image_uri: card.image_uri,
        back_image_uri: card.back_image_uri,
        source: 'db',
        updated_at: card.updated_at
      };
    }

    res.json(cards);
  } catch (err) {
    console.error('DB error on batch fetch:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/card/:set/:number', async (req, res) => {
  const { set, number } = req.params;

  // Try DB first
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM mtg_cards WHERE set_id = ? AND number = ?',
      [set, number]
    );

    if (rows.length > 0) {
      const card = rows[0];
      return res.json({
        id: number,
        tcgplayer_id: card.tcgplayer_id,
        name: card.name,
        price: card.price,
        price_foil: card.price_foil,
        image_uri: card.image_uri,
        back_image_uri: card.back_image_uri,
        source: 'db',
        updated_at: card.updated_at
      });
    }
  } catch (err) {
    console.error('DB error, falling back to Scryfall:', err.message);
  }

  // Fall back to Scryfall if not in DB
  const scryfallCard = await getCardFromScryfall(set, number);

  if (scryfallCard.object === 'error') {
    if (scryfallCard.status === 429) return res.status(429).json({ id: number });
    console.log(`Card not found in Scryfall: ${set} ${number}`);
    return res.json({
      id: number,
      not_found: true,
      back_image_uri: null
    });
  }

  const imageUri = scryfallCard.card_faces
    ? scryfallCard.card_faces[0].image_uris?.normal
    : scryfallCard.image_uris?.normal;

  const backImageUri = scryfallCard.card_faces
    ? scryfallCard.card_faces[1]?.image_uris?.normal
    : null;

  const now = new Date();

  // Save to DB for next time
  try {
    await pool.execute(`
      INSERT INTO mtg_cards (set_id, number, name, tcgplayer_id, price, price_foil, image_uri, back_image_uri)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        tcgplayer_id = VALUES(tcgplayer_id),
        price = VALUES(price),
        price_foil = VALUES(price_foil),
        image_uri = VALUES(image_uri),
        back_image_uri = VALUES(back_image_uri),
        updated_at = CURRENT_TIMESTAMP
    `, [
      set,
      number,
      scryfallCard.name ?? null,
      scryfallCard.tcgplayer_id ?? null,
      scryfallCard.prices?.usd ?? null,
      scryfallCard.prices?.usd_foil ?? null,
      imageUri ?? null,
      backImageUri ?? null
    ]);
  } catch (err) {
    console.error('Failed to cache card in DB:', err.message);
  }

  res.json({
    id: number,
    tcgplayer_id: scryfallCard.tcgplayer_id,
    name: scryfallCard.name,
    price: scryfallCard.prices?.usd,
    price_foil: scryfallCard.prices?.usd_foil,
    image_uri: imageUri,
    back_image_uri: backImageUri,
    source: 'scryfall',
    updated_at: now
  });
});

router.get('/set-info/:setId', async (req, res) => {
  const { setId } = req.params;
  const data = await getSetInfo(setId);
  res.json(data);
});

export default router;