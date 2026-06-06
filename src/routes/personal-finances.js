import { Router } from 'express';
import {
  setupTable,
  getCategories, upsertCategory,
  getExchangeRates, upsertExchangeRate,
  getAccounts, upsertAccount,
  getHistory, insertRows,
} from '../services/personal-finances.js';

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (!process.env.PERSONAL_FINANCES_API_KEY || key !== process.env.PERSONAL_FINANCES_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
// POST /personal-finances/setup — create all tables (run once)
router.post('/setup', requireApiKey, async (req, res) => {
  try {
    await setupTable();
    res.json({ status: 'ok', message: 'All tables created' });
  } catch (err) {
    console.error('personal-finances setup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────
// GET /personal-finances/categories
router.get('/categories', requireApiKey, async (req, res) => {
  try {
    res.json({ categories: await getCategories() });
  } catch (err) {
    console.error('personal-finances categories GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /personal-finances/categories — create or update { id, label, is_liability }
router.post('/categories', requireApiKey, async (req, res) => {
  try {
    const cat = req.body;
    if (!cat.id || !cat.label) {
      return res.status(400).json({ error: 'Required fields: id, label' });
    }
    await upsertCategory(cat);
    res.json({ status: 'ok', category: cat });
  } catch (err) {
    console.error('personal-finances categories POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Exchange rates ────────────────────────────────────────────────────────────
// GET /personal-finances/exchange-rates?date=YYYY-MM-DD
router.get('/exchange-rates', requireApiKey, async (req, res) => {
  try {
    res.json({ exchange_rates: await getExchangeRates(req.query.date) });
  } catch (err) {
    console.error('personal-finances exchange-rates GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /personal-finances/exchange-rates — { date, from_currency, to_currency?, rate }
router.post('/exchange-rates', requireApiKey, async (req, res) => {
  try {
    const r = req.body;
    if (!r.date || !r.from_currency || !r.rate) {
      return res.status(400).json({ error: 'Required fields: date, from_currency, rate' });
    }
    await upsertExchangeRate(r);
    res.json({ status: 'ok', exchange_rate: r });
  } catch (err) {
    console.error('personal-finances exchange-rates POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Accounts ──────────────────────────────────────────────────────────────────
// GET /personal-finances/accounts
router.get('/accounts', requireApiKey, async (req, res) => {
  try {
    res.json({ accounts: await getAccounts() });
  } catch (err) {
    console.error('personal-finances accounts GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /personal-finances/accounts — { id, name, category_id, currency, institution?, notes?, active?, closed_at? }
router.post('/accounts', requireApiKey, async (req, res) => {
  try {
    const account = req.body;
    if (!account.id || !account.name || !account.currency || !(account.category_id || account.category)) {
      return res.status(400).json({ error: 'Required fields: id, name, currency, category_id' });
    }
    await upsertAccount(account);
    res.json({ status: 'ok', account });
  } catch (err) {
    console.error('personal-finances accounts POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── History ───────────────────────────────────────────────────────────────────
// GET /personal-finances/history
router.get('/history', requireApiKey, async (req, res) => {
  try {
    res.json({ rows: await getHistory() });
  } catch (err) {
    console.error('personal-finances history GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /personal-finances/history — { rows: [{ date, id, balanceNative, balanceUSD, notes? }] }
router.post('/history', requireApiKey, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Expected non-empty "rows" array' });
    }
    const inserted = await insertRows(rows);
    res.json({ inserted, status: 'ok' });
  } catch (err) {
    console.error('personal-finances history POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
