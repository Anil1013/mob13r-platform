import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Ensure table exists
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      advertiser_id INT REFERENCES advertisers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      payout NUMERIC DEFAULT 0,
      cap INT DEFAULT 100,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
init();

// ✅ GET all offers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, a.name AS advertiser_name 
      FROM offers o 
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ORDER BY o.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching offers:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ GET single offer
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM offers WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Offer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ CREATE offer
router.post('/', async (req, res) => {
  const { advertiser_id, title, payout, cap, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO offers (advertiser_id, title, payout, cap, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [advertiser_id, title, payout || 0, cap || 100, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting offer:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ UPDATE offer
router.put('/:id', async (req, res) => {
  const { advertiser_id, title, payout, cap, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE offers 
       SET advertiser_id=$1, title=$2, payout=$3, cap=$4, status=$5 
       WHERE id=$6 RETURNING *`,
      [advertiser_id, title, payout, cap, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ DELETE offer
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM offers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
