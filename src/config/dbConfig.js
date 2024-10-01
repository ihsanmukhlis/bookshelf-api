const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'book_db',
  password: 'kosong',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
