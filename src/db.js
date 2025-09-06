// src/db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "url_user",
  password: process.env.DB_PASSWORD || "YourStrongPasswordHere",
  database: process.env.DB_NAME || "url_shortener",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
