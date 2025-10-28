import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Ensure table exists
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS advertisers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      balance NUMERIC DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
init();

// ✅ GET all advertisers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM advertisers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching advertisers:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ GET advertiser by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM advertisers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Advertiser not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ CREATE advertiser
router.post('/', async (req, res) => {
  const { name, company, email, balance } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO advertisers (name, company, email, balance) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, company, email, balance || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting advertiser:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ UPDATE advertiser
router.put('/:id', async (req, res) => {
  const { name, company, email, balance, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE advertisers 
       SET name=$1, company=$2, email=$3, balance=$4, status=$5 
       WHERE id=$6 RETURNING *`,
      [name, company, email, balance, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ DELETE advertiser
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM advertisers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
