import express from 'express';
import pool from '../db.js';
const router = express.Router();

// GET publishers
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, status, hold_percentage FROM publishers ORDER BY id DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

// CREATE publisher
router.post('/', async (req, res) => {
  try {
    const { name, email, api_key, hold_percentage = 0 } = req.body;
    
    const r = await pool.query(
      'INSERT INTO publishers (name, email, api_key, hold_percentage) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, api_key, hold_percentage]
    );
    
    res.json(r.rows[0]);
  } catch (error) {
    console.error("Insert Error:", error);
    res.status(500).json({ error: "Insert failed" });
  }
});

export default router;
