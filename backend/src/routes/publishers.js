import express from 'express';
import pool from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, status, hold_percent FROM publishers ORDER BY id DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, email, api_key } = req.body;
  const r = await pool.query('INSERT INTO publishers (name, email, api_key) VALUES ($1,$2,$3) RETURNING *', [name, email, api_key]);
  res.json(r.rows[0]);
});

export default router;
