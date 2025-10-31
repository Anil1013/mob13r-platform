import express from 'express';
import pool from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, status, hold_percentage FROM publishers ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error("Publishers GET Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, api_key, hold_percentage = 20 } = req.body;

    const result = await pool.query(
      'INSERT INTO publishers (name, email, api_key, hold_percentage) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, api_key, hold_percentage]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Publishers POST Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
