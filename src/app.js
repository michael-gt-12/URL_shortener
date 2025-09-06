// src/app.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { customAlphabet } = require("nanoid");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Generate secure Base62 short codes of length 7
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const genCode = customAlphabet(alphabet, 7);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "..", "public"))); // optional frontend

// Helpers
function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Healthcheck
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Create short URL
app.post("/api/shorten", async (req, res) => {
  const { url } = req.body;
  if (!url || !isValidHttpUrl(url)) {
    return res.status(400).json({ error: "Provide a valid http(s) URL in 'url'." });
  }

  let code = genCode();
  // Try a few times in the unlikely event of a collision
  for (let tries = 0; tries < 5; tries++) {
    try {
      await pool.execute(
        "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
        [code, url]
      );
      return res.status(201).json({
        code,
        longUrl: url,
        shortUrl: `${BASE_URL}/${code}`,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      // ER_DUP_ENTRY means code already exists -> try a new one
      if (err && err.code === "ER_DUP_ENTRY") {
        code = genCode();
        continue;
      }
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
  }
  return res.status(500).json({ error: "Could not generate a unique short code" });
});

// Optional: fetch info/stats for a code
app.get("/api/info/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT short_code AS code, original_url AS longUrl, created_at AS createdAt, hits FROM urls WHERE short_code = ? LIMIT 1",
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: "Code not found" });
    const row = rows[0];
    res.json({ ...row, shortUrl: `${BASE_URL}/${row.code}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Redirect route: /:code -> original URL
app.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT original_url FROM urls WHERE short_code = ? LIMIT 1",
      [code]
    );
    if (!rows.length) return res.status(404).send("Short URL not found");

    const longUrl = rows[0].original_url;

    // Count a hit (fire-and-forget; don't block redirect if it fails)
    pool.execute("UPDATE urls SET hits = hits + 1 WHERE short_code = ?", [code])
      .catch(() => { /* ignore */ });

    res.redirect(longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`URL Shortener running at ${BASE_URL}`);
});
