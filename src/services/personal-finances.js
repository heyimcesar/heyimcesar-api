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

// ── Seed ──────────────────────────────────────────────────────────────────────
export async function seedData() {
  const accounts = [
    { id: 'acct_001', name: 'HSA Indeed',                  institution: 'Optum',                   category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_002', name: 'Checkings Account',            institution: 'First Tech Credit Union', category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_003', name: 'Savings Account',              institution: 'First Tech Credit Union', category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_004', name: 'Savings Account',              institution: 'BECU',                    category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_005', name: 'Checkings Account',            institution: 'Venmo',                   category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_006', name: 'Checkings Account',            institution: 'Credit Karma',            category_id: 'bank',        currency: 'USD', notes: '' },
    { id: 'acct_007', name: 'Checkings Account',            institution: 'Albo',                    category_id: 'bank',        currency: 'MXN', notes: '' },
    { id: 'acct_008', name: 'Checkings Account',            institution: 'BBVA',                    category_id: 'bank',        currency: 'MXN', notes: '' },
    { id: 'acct_009', name: 'Personal Stocks Brokerage',    institution: 'Fidelity',                category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_010', name: 'Indeed 401K',                  institution: 'Fidelity',                category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_011', name: 'Roth IRA',                     institution: 'Fidelity',                category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_012', name: 'Robinhood Stocks',             institution: 'Robinhood',               category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_013', name: 'MUTB Indeed Stocks',           institution: 'MUTB',                    category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_014', name: 'Betterment Stocks',            institution: 'Betterment',              category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_015', name: 'Coinbase Crypto',              institution: 'Coinbase',                category_id: 'investment',  currency: 'USD', notes: '' },
    { id: 'acct_016', name: 'First Tech Choice Mastercard', institution: 'First Tech Credit Union', category_id: 'credit_card', currency: 'USD', notes: '' },
    { id: 'acct_017', name: 'AMEX Platinum',                institution: 'AMEX',                    category_id: 'credit_card', currency: 'USD', notes: '' },
    { id: 'acct_018', name: 'Discover',                     institution: 'Discover',                category_id: 'credit_card', currency: 'USD', notes: '' },
    { id: 'acct_019', name: 'Amazon Mastercard',            institution: 'Chase Bank',              category_id: 'credit_card', currency: 'USD', notes: '' },
    { id: 'acct_020', name: 'Costco Visa',                  institution: 'Citi Bank',               category_id: 'credit_card', currency: 'USD', notes: '' },
    { id: 'acct_021', name: 'Jeep Gladiator Loan',          institution: 'BECU',                    category_id: 'loan',        currency: 'USD', notes: '' },
    { id: 'acct_022', name: 'Tuxcueca Land Loan',           institution: 'Real Santa Fe',           category_id: 'loan',        currency: 'MXN', notes: '' },
    { id: 'acct_023', name: 'Sony Camera Loan',             institution: 'Affirm',                  category_id: 'loan',        currency: 'USD', notes: '' },
    { id: 'acct_024', name: 'Jeep Gladiator 2021',          institution: '',                        category_id: 'asset',       currency: 'USD', notes: 'Vehicle'     },
    { id: 'acct_025', name: 'Xarama Aguascalientes Lot',    institution: '',                        category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
    { id: 'acct_026', name: 'Tuxcueca Small Lot',           institution: '',                        category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
    { id: 'acct_027', name: 'Tuxcueca Big Lot',             institution: '',                        category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
  ];

  const exchangeRates = [
    { date: '2026-05-22', from_currency: 'MXN', to_currency: 'USD', rate: 0.057614 },
    { date: '2026-05-28', from_currency: 'MXN', to_currency: 'USD', rate: 0.057554 },
    { date: '2026-06-06', from_currency: 'MXN', to_currency: 'USD', rate: 0.057621 },
  ];

  const history = [
    { date: '2026-05-22', id: 'acct_001', balanceNative: 1000,       balanceUSD: 1000       },
    { date: '2026-05-22', id: 'acct_002', balanceNative: 3360.34,    balanceUSD: 3360.34    },
    { date: '2026-05-22', id: 'acct_003', balanceNative: 21591.33,   balanceUSD: 21591.33   },
    { date: '2026-05-22', id: 'acct_004', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-22', id: 'acct_005', balanceNative: 70.23,      balanceUSD: 70.23      },
    { date: '2026-05-22', id: 'acct_006', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-22', id: 'acct_007', balanceNative: 4748.19,    balanceUSD: 273.57     },
    { date: '2026-05-22', id: 'acct_008', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-22', id: 'acct_009', balanceNative: 104849.24,  balanceUSD: 104849.24  },
    { date: '2026-05-22', id: 'acct_010', balanceNative: 271459.58,  balanceUSD: 271459.58  },
    { date: '2026-05-22', id: 'acct_011', balanceNative: 504.26,     balanceUSD: 504.26     },
    { date: '2026-05-22', id: 'acct_012', balanceNative: 16.69,      balanceUSD: 16.69      },
    { date: '2026-05-22', id: 'acct_013', balanceNative: 32582.37,   balanceUSD: 32582.37   },
    { date: '2026-05-22', id: 'acct_014', balanceNative: 13234.3,    balanceUSD: 13234.3    },
    { date: '2026-05-22', id: 'acct_015', balanceNative: 334.03,     balanceUSD: 334.03     },
    { date: '2026-05-22', id: 'acct_016', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-22', id: 'acct_017', balanceNative: 3553.39,    balanceUSD: 3553.39    },
    { date: '2026-05-22', id: 'acct_018', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-22', id: 'acct_019', balanceNative: 55.05,      balanceUSD: 55.05      },
    { date: '2026-05-22', id: 'acct_020', balanceNative: 370.25,     balanceUSD: 370.25     },
    { date: '2026-05-22', id: 'acct_021', balanceNative: 11404.32,   balanceUSD: 11404.32   },
    { date: '2026-05-22', id: 'acct_022', balanceNative: 425352.44,  balanceUSD: 24503.06   },
    { date: '2026-05-22', id: 'acct_023', balanceNative: 441.19,     balanceUSD: 441.19     },
    { date: '2026-05-22', id: 'acct_024', balanceNative: 30000,      balanceUSD: 30000      },
    { date: '2026-05-22', id: 'acct_025', balanceNative: 1200000,    balanceUSD: 69136.27   },
    { date: '2026-05-22', id: 'acct_026', balanceNative: 816187.45,  balanceUSD: 47021.09   },
    { date: '2026-05-22', id: 'acct_027', balanceNative: 1028961.98, balanceUSD: 59282.46   },
    { date: '2026-05-28', id: 'acct_001', balanceNative: 1000,       balanceUSD: 1000       },
    { date: '2026-05-28', id: 'acct_002', balanceNative: 17591.22,   balanceUSD: 17591.22   },
    { date: '2026-05-28', id: 'acct_003', balanceNative: 21591.33,   balanceUSD: 21591.33   },
    { date: '2026-05-28', id: 'acct_004', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-28', id: 'acct_005', balanceNative: 197.67,     balanceUSD: 197.67     },
    { date: '2026-05-28', id: 'acct_006', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-28', id: 'acct_007', balanceNative: 4748.19,    balanceUSD: 273.28     },
    { date: '2026-05-28', id: 'acct_008', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-28', id: 'acct_009', balanceNative: 106140.76,  balanceUSD: 106140.76  },
    { date: '2026-05-28', id: 'acct_010', balanceNative: 274177.95,  balanceUSD: 274177.95  },
    { date: '2026-05-28', id: 'acct_011', balanceNative: 504.19,     balanceUSD: 504.19     },
    { date: '2026-05-28', id: 'acct_012', balanceNative: 15.48,      balanceUSD: 15.48      },
    { date: '2026-05-28', id: 'acct_013', balanceNative: 33830.4,    balanceUSD: 33830.4    },
    { date: '2026-05-28', id: 'acct_014', balanceNative: 13370.49,   balanceUSD: 13370.49   },
    { date: '2026-05-28', id: 'acct_015', balanceNative: 311.65,     balanceUSD: 311.65     },
    { date: '2026-05-28', id: 'acct_016', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-28', id: 'acct_017', balanceNative: 3491.12,    balanceUSD: 3491.12    },
    { date: '2026-05-28', id: 'acct_018', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-05-28', id: 'acct_019', balanceNative: 55.05,      balanceUSD: 55.05      },
    { date: '2026-05-28', id: 'acct_020', balanceNative: 646.15,     balanceUSD: 646.15     },
    { date: '2026-05-28', id: 'acct_021', balanceNative: 11404.32,   balanceUSD: 11404.32   },
    { date: '2026-05-28', id: 'acct_022', balanceNative: 425352.44,  balanceUSD: 24480.73   },
    { date: '2026-05-28', id: 'acct_023', balanceNative: 330.89,     balanceUSD: 330.89     },
    { date: '2026-05-28', id: 'acct_024', balanceNative: 30000,      balanceUSD: 30000      },
    { date: '2026-05-28', id: 'acct_025', balanceNative: 1200000,    balanceUSD: 69064.8    },
    { date: '2026-05-28', id: 'acct_026', balanceNative: 816187.45,  balanceUSD: 46974.85   },
    { date: '2026-05-28', id: 'acct_027', balanceNative: 1028961.98, balanceUSD: 59220.88   },
    { date: '2026-06-06', id: 'acct_001', balanceNative: 1191.71,    balanceUSD: 1191.71    },
    { date: '2026-06-06', id: 'acct_002', balanceNative: 2043.46,    balanceUSD: 2043.46    },
    { date: '2026-06-06', id: 'acct_003', balanceNative: 26000,      balanceUSD: 26000      },
    { date: '2026-06-06', id: 'acct_004', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-06-06', id: 'acct_005', balanceNative: 81.54,      balanceUSD: 81.54      },
    { date: '2026-06-06', id: 'acct_006', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-06-06', id: 'acct_007', balanceNative: 4748.19,    balanceUSD: 273.6      },
    { date: '2026-06-06', id: 'acct_008', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-06-06', id: 'acct_009', balanceNative: 104847.48,  balanceUSD: 104847.48  },
    { date: '2026-06-06', id: 'acct_010', balanceNative: 272431.11,  balanceUSD: 272431.11  },
    { date: '2026-06-06', id: 'acct_011', balanceNative: 496.48,     balanceUSD: 496.48     },
    { date: '2026-06-06', id: 'acct_012', balanceNative: 15.48,      balanceUSD: 15.48      },
    { date: '2026-06-06', id: 'acct_013', balanceNative: 34956.86,   balanceUSD: 34956.86   },
    { date: '2026-06-06', id: 'acct_014', balanceNative: 13167.15,   balanceUSD: 13167.15   },
    { date: '2026-06-06', id: 'acct_015', balanceNative: 239.64,     balanceUSD: 239.64     },
    { date: '2026-06-06', id: 'acct_016', balanceNative: 0,          balanceUSD: 0          },
    { date: '2026-06-06', id: 'acct_017', balanceNative: 643.93,     balanceUSD: 643.93     },
    { date: '2026-06-06', id: 'acct_018', balanceNative: 11.02,      balanceUSD: 11.02      },
    { date: '2026-06-06', id: 'acct_019', balanceNative: 184.88,     balanceUSD: 184.88     },
    { date: '2026-06-06', id: 'acct_020', balanceNative: 93.36,      balanceUSD: 93.36      },
    { date: '2026-06-06', id: 'acct_021', balanceNative: 10637.79,   balanceUSD: 10637.79   },
    { date: '2026-06-06', id: 'acct_022', balanceNative: 414718.63,  balanceUSD: 23896.48   },
    { date: '2026-06-06', id: 'acct_023', balanceNative: 330.89,     balanceUSD: 330.89     },
    { date: '2026-06-06', id: 'acct_024', balanceNative: 30000,      balanceUSD: 30000      },
    { date: '2026-06-06', id: 'acct_025', balanceNative: 1200000,    balanceUSD: 69145.14   },
    { date: '2026-06-06', id: 'acct_026', balanceNative: 816187.45,  balanceUSD: 47029.49   },
    { date: '2026-06-06', id: 'acct_027', balanceNative: 1028961.98, balanceUSD: 59289.76   },
  ];

  for (const a of accounts) {
    await pool.query(`
      INSERT INTO accounts (id, name, institution, category_id, currency, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), institution=VALUES(institution)
    `, [a.id, a.name, a.institution, a.category_id, a.currency, a.notes]);
  }

  for (const r of exchangeRates) {
    await pool.query(`
      INSERT INTO exchange_rates (date, from_currency, to_currency, rate)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rate=VALUES(rate)
    `, [r.date, r.from_currency, r.to_currency, r.rate]);
  }

  for (const h of history) {
    await pool.query(`
      INSERT INTO account_history (date, account_id, balance_native, balance_usd)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE balance_native=VALUES(balance_native), balance_usd=VALUES(balance_usd)
    `, [h.date, h.id, h.balanceNative, h.balanceUSD]);
  }

  return { accounts: accounts.length, exchangeRates: exchangeRates.length, history: history.length };
}
