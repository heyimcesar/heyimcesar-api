/**
 * One-time seed script — run with: node src/scripts/seed-personal-finances.js
 * Requires PERSONAL_FINANCES_DB_* env vars (reads from .env automatically)
 */
import '../env.js';
import pool from '../services/personal-finances-db.js';

// ── Accounts ──────────────────────────────────────────────────────────────────
const accounts = [
  { id: 'acct_001', name: 'HSA Indeed',                   institution: 'Optum',                    category_id: 'bank',        currency: 'USD' },
  { id: 'acct_002', name: 'Checkings Account',             institution: 'First Tech Credit Union',  category_id: 'bank',        currency: 'USD' },
  { id: 'acct_003', name: 'Savings Account',               institution: 'First Tech Credit Union',  category_id: 'bank',        currency: 'USD' },
  { id: 'acct_004', name: 'Savings Account',               institution: 'BECU',                     category_id: 'bank',        currency: 'USD' },
  { id: 'acct_005', name: 'Checkings Account',             institution: 'Venmo',                    category_id: 'bank',        currency: 'USD' },
  { id: 'acct_006', name: 'Checkings Account',             institution: 'Credit Karma',             category_id: 'bank',        currency: 'USD' },
  { id: 'acct_007', name: 'Checkings Account',             institution: 'Albo',                     category_id: 'bank',        currency: 'MXN' },
  { id: 'acct_008', name: 'Checkings Account',             institution: 'BBVA',                     category_id: 'bank',        currency: 'MXN' },
  { id: 'acct_009', name: 'Personal Stocks Brokerage',     institution: 'Fidelity',                 category_id: 'investment',  currency: 'USD' },
  { id: 'acct_010', name: 'Indeed 401K',                   institution: 'Fidelity',                 category_id: 'investment',  currency: 'USD' },
  { id: 'acct_011', name: 'Roth IRA',                      institution: 'Fidelity',                 category_id: 'investment',  currency: 'USD' },
  { id: 'acct_012', name: 'Robinhood Stocks',              institution: 'Robinhood',                category_id: 'investment',  currency: 'USD' },
  { id: 'acct_013', name: 'MUTB Indeed Stocks',            institution: 'MUTB',                     category_id: 'investment',  currency: 'USD' },
  { id: 'acct_014', name: 'Betterment Stocks',             institution: 'Betterment',               category_id: 'investment',  currency: 'USD' },
  { id: 'acct_015', name: 'Coinbase Crypto',               institution: 'Coinbase',                 category_id: 'investment',  currency: 'USD' },
  { id: 'acct_016', name: 'First Tech Choice Mastercard',  institution: 'First Tech Credit Union',  category_id: 'credit_card', currency: 'USD' },
  { id: 'acct_017', name: 'AMEX Platinum',                 institution: 'AMEX',                     category_id: 'credit_card', currency: 'USD' },
  { id: 'acct_018', name: 'Discover',                      institution: 'Discover',                 category_id: 'credit_card', currency: 'USD' },
  { id: 'acct_019', name: 'Amazon Mastercard',             institution: 'Chase Bank',               category_id: 'credit_card', currency: 'USD' },
  { id: 'acct_020', name: 'Costco Visa',                   institution: 'Citi Bank',                category_id: 'credit_card', currency: 'USD' },
  { id: 'acct_021', name: 'Jeep Gladiator Loan',           institution: 'BECU',                     category_id: 'loan',        currency: 'USD' },
  { id: 'acct_022', name: 'Tuxcueca Land Loan',            institution: 'Real Santa Fe',            category_id: 'loan',        currency: 'MXN' },
  { id: 'acct_023', name: 'Sony Camera Loan',              institution: 'Affirm',                   category_id: 'loan',        currency: 'USD' },
  { id: 'acct_024', name: 'Jeep Gladiator 2021',           institution: '',                         category_id: 'asset',       currency: 'USD', notes: 'Vehicle'     },
  { id: 'acct_025', name: 'Xarama Aguascalientes Lot',     institution: '',                         category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
  { id: 'acct_026', name: 'Tuxcueca Small Lot',            institution: '',                         category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
  { id: 'acct_027', name: 'Tuxcueca Big Lot',              institution: '',                         category_id: 'asset',       currency: 'MXN', notes: 'Real estate' },
];

// ── Exchange rates (MXN → USD per snapshot date) ──────────────────────────────
const exchangeRates = [
  { date: '2026-05-22', from_currency: 'MXN', to_currency: 'USD', rate: 0.057614 },
  { date: '2026-05-28', from_currency: 'MXN', to_currency: 'USD', rate: 0.057554 },
  { date: '2026-06-06', from_currency: 'MXN', to_currency: 'USD', rate: 0.057621 },
];

// ── Account history (lean: date, account_id, balance_native, balance_usd) ─────
const history = [
  // 2026-05-22
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
  // 2026-05-28
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
  // 2026-06-06
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

// ── Run ───────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Seeding accounts...');
  for (const a of accounts) {
    await pool.query(`
      INSERT INTO accounts (id, name, institution, category_id, currency, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), institution=VALUES(institution)
    `, [a.id, a.name, a.institution, a.category_id, a.currency, a.notes ?? '']);
  }
  console.log(`  ✓ ${accounts.length} accounts`);

  console.log('Seeding exchange rates...');
  for (const r of exchangeRates) {
    await pool.query(`
      INSERT INTO exchange_rates (date, from_currency, to_currency, rate)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rate=VALUES(rate)
    `, [r.date, r.from_currency, r.to_currency, r.rate]);
  }
  console.log(`  ✓ ${exchangeRates.length} exchange rates`);

  console.log('Seeding account history...');
  for (const h of history) {
    await pool.query(`
      INSERT INTO account_history (date, account_id, balance_native, balance_usd)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE balance_native=VALUES(balance_native), balance_usd=VALUES(balance_usd)
    `, [h.date, h.id, h.balanceNative, h.balanceUSD]);
  }
  console.log(`  ✓ ${history.length} history rows`);

  console.log('\nDone!');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
