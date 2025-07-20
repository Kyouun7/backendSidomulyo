const mysql = require('mysql2');
require('dotenv').config();

// Konfigurasi database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'websido123!',
  database: process.env.DB_NAME || 'websidomulyo',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Membuat connection pool (lebih efisien dari single connection)
const pool = mysql.createPool(dbConfig);

// Promise wrapper untuk async/await
const promisePool = pool.promise();

// Test koneksi
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    return;
  }
  console.log('✅ Database connected successfully!');
  connection.release();
});

module.exports = {
  pool,
  promisePool,
  dbConfig
}; 