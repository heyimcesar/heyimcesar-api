import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.PERSONAL_FINANCES_DB_HOST,
  user: process.env.PERSONAL_FINANCES_DB_USER,
  password: process.env.PERSONAL_FINANCES_DB_PASSWORD,
  database: process.env.PERSONAL_FINANCES_DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

export default pool;
