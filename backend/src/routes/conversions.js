import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Ensure table exists
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      offer_id INT REFERENCES offers(id) ON DELETE CASCADE,
      advertiser_id INT REFERENCES advertisers(id) ON DELETE CASCADE,
      click_id VARCHAR(100),
      revenue NUMERIC DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
init();

// ✅ GET all conversions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, o.title AS offer_title, a.name AS advertiser_name
      FROM conversions c
      LEFT JOIN offers o ON c.offer_id = o.id
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      ORDER BY c.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching conversions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ CREATE conversion
router.post('/', async (req, res) => {
  const { offer_id, advertiser_id, click_id, revenue, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO conversions (offer_id, advertiser_id, click_id, revenue, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [offer_id, advertiser_id, click_id, revenue || 0, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting conversion:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ UPDATE conversion
router.put('/:id', async (req, res) => {
  const { status, revenue } = req.body;
  try {
    const result = await pool.query(
      'UPDATE conversions SET status=$1, revenue=$2 WHERE id=$3 RETURNING *',
      [status, revenue, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ DELETE conversion
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM conversions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
