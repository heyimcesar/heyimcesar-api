import pool from './personal-finances-db.js';

// ── Setup ─────────────────────────────────────────────────────────────────────
export async function setupTable() {
  // 1. categories (must exist before accounts FK)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id          VARCHAR(20) NOT NULL PRIMARY KEY,
      label       VARCHAR(50) NOT NULL,
      is_liability TINYINT(1) NOT NULL DEFAULT 0,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Seed default categories
  await pool.query(`
    INSERT IGNORE INTO categories (id, label, is_liability) VALUES
      ('bank',        'Bank',        0),
      ('investment',  'Investment',  0),
      ('asset',       'Asset',       0),
      ('credit_card', 'Credit Card', 1),
      ('loan',        'Loan',        1)
  `);

  // 2. accounts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          VARCHAR(20)  NOT NULL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      institution VARCHAR(100) NOT NULL DEFAULT '',
      category_id VARCHAR(20)  NOT NULL,
      currency    VARCHAR(10)  NOT NULL,
      notes       TEXT,
      active      TINYINT(1)   NOT NULL DEFAULT 1,
      closed_at   DATE         DEFAULT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 3. exchange_rates — one row per currency pair per date
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      date          DATE        NOT NULL,
      from_currency VARCHAR(10) NOT NULL,
      to_currency   VARCHAR(10) NOT NULL DEFAULT 'USD',
      rate          DECIMAL(10,6) NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rate (date, from_currency, to_currency)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 4. account_history — lean, only balances + date
  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_history (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      date           DATE          NOT NULL,
      account_id     VARCHAR(20)   NOT NULL,
      balance_native DECIMAL(15,4) NOT NULL,
      balance_usd    DECIMAL(15,4) NOT NULL,
      notes          TEXT,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_date_account (date, account_id),
      INDEX idx_date (date),
      INDEX idx_account_id (account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories() {
  const [rows] = await pool.query(
    'SELECT id, label, is_liability FROM categories ORDER BY is_liability ASC, id ASC'
  );
  return rows.map(r => ({ ...r, is_liability: r.is_liability === 1 }));
}

export async function upsertCategory(cat) {
  await pool.query(`
    INSERT INTO categories (id, label, is_liability)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      label        = VALUES(label),
      is_liability = VALUES(is_liability)
  `, [cat.id, cat.label, cat.is_liability ? 1 : 0]);
}

// ── Exchange rates ────────────────────────────────────────────────────────────
export async function getExchangeRates(date) {
  const [rows] = date
    ? await pool.query(
        'SELECT date, from_currency, to_currency, rate FROM exchange_rates WHERE date = ? ORDER BY date ASC',
        [date]
      )
    : await pool.query(
        'SELECT date, from_currency, to_currency, rate FROM exchange_rates ORDER BY date ASC'
      );
  return rows.map(r => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    rate: parseFloat(r.rate),
  }));
}

export async function upsertExchangeRate({ date, from_currency, to_currency = 'USD', rate }) {
  await pool.query(`
    INSERT INTO exchange_rates (date, from_currency, to_currency, rate)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE rate = VALUES(rate)
  `, [date, from_currency, to_currency, rate]);
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export async function getAccounts() {
  const [rows] = await pool.query(`
    SELECT a.id, a.name, a.institution, a.category_id AS category,
           c.label AS category_label, c.is_liability,
           a.currency, a.notes, a.active, a.closed_at
    FROM accounts a
    JOIN categories c ON c.id = a.category_id
    ORDER BY a.category_id, a.id
  `);
  return rows.map(r => ({
    ...r,
    active:       r.active === 1,
    is_liability: r.is_liability === 1,
    closed_at:    r.closed_at instanceof Date ? r.closed_at.toISOString().slice(0, 10) : r.closed_at,
  }));
}

export async function upsertAccount(account) {
  await pool.query(`
    INSERT INTO accounts (id, name, institution, category_id, currency, notes, active, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name        = VALUES(name),
      institution = VALUES(institution),
      category_id = VALUES(category_id),
      currency    = VALUES(currency),
      notes       = VALUES(notes),
      active      = VALUES(active),
      closed_at   = VALUES(closed_at)
  `, [
    account.id,
    account.name,
    account.institution ?? '',
    account.category_id ?? account.category,
    account.currency,
    account.notes ?? '',
    account.active !== false ? 1 : 0,
    account.closed_at ?? null,
  ]);
}

// ── Account history ───────────────────────────────────────────────────────────
export async function getHistory() {
  const [rows] = await pool.query(`
    SELECT
      ah.date,
      ah.account_id              AS id,
      a.name,
      a.institution,
      a.category_id              AS category,
      a.currency,
      ah.balance_native          AS balanceNative,
      ah.balance_usd             AS balanceUSD,
      COALESCE(er.rate, 1.0)     AS exchangeRate,
      ah.notes
    FROM account_history ah
    JOIN  accounts       a  ON a.id            = ah.account_id
    LEFT JOIN exchange_rates er ON er.date      = ah.date
                               AND er.from_currency = a.currency
                               AND er.to_currency   = 'USD'
    ORDER BY ah.date ASC, ah.account_id ASC
  `);
  return rows.map(r => ({
    ...r,
    date:          r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    balanceNative: parseFloat(r.balanceNative),
    balanceUSD:    parseFloat(r.balanceUSD),
    exchangeRate:  parseFloat(r.exchangeRate),
  }));
}

export async function insertRows(rows) {
  const sql = `
    INSERT INTO account_history (date, account_id, balance_native, balance_usd, notes)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      balance_native = VALUES(balance_native),
      balance_usd    = VALUES(balance_usd),
      notes          = VALUES(notes)
  `;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of rows) {
      await conn.query(sql, [
        r.date, r.id, r.balanceNative, r.balanceUSD, r.notes ?? '',
      ]);
    }
    await conn.commit();
    return rows.length;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
