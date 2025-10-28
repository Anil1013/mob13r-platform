import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 🧩 Auto-create postbacks table
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS postbacks (
      id SERIAL PRIMARY KEY,
      click_id VARCHAR(100) NOT NULL,
      offer_id INT REFERENCES offers(id) ON DELETE CASCADE,
      advertiser_id INT REFERENCES advertisers(id) ON DELETE CASCADE,
      revenue NUMERIC DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      callback_url TEXT,
      response_code INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
init();

// ✅ Register new postback
router.post('/', async (req, res) => {
  const { click_id, offer_id, advertiser_id, revenue, status, callback_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO postbacks (click_id, offer_id, advertiser_id, revenue, status, callback_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [click_id, offer_id, advertiser_id, revenue || 0, status || 'pending', callback_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting postback:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Get all postbacks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, o.title AS offer_title, a.name AS advertiser_name
      FROM postbacks p
      LEFT JOIN offers o ON p.offer_id = o.id
      LEFT JOIN advertisers a ON p.advertiser_id = a.id
      ORDER BY p.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching postbacks:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Update postback status (e.g., mark as "validated" or "failed")
router.put('/:id', async (req, res) => {
  const { status, response_code } = req.body;
  try {
    const result = await pool.query(
      `UPDATE postbacks SET status=$1, response_code=$2 WHERE id=$3 RETURNING *`,
      [status, response_code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating postback:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Delete postback
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM postbacks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting postback:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
