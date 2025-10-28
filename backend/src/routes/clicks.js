import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 🧩 Auto-create clicks table
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clicks (
      id SERIAL PRIMARY KEY,
      offer_id INT REFERENCES offers(id) ON DELETE CASCADE,
      advertiser_id INT REFERENCES advertisers(id) ON DELETE CASCADE,
      publisher_id INT,
      click_id VARCHAR(100) UNIQUE NOT NULL,
      ip_address VARCHAR(100),
      user_agent TEXT,
      status VARCHAR(20) DEFAULT 'valid',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
init();

// ✅ Log new click
router.post('/', async (req, res) => {
  const { offer_id, advertiser_id, publisher_id, click_id, ip_address, user_agent } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clicks (offer_id, advertiser_id, publisher_id, click_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [offer_id, advertiser_id, publisher_id, click_id, ip_address, user_agent]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting click:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Duplicate click_id' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// ✅ Get all clicks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, o.title AS offer_title, a.name AS advertiser_name
      FROM clicks c
      LEFT JOIN offers o ON c.offer_id = o.id
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      ORDER BY c.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching clicks:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Get click by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clicks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Click not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Delete click
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clicks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting click:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
