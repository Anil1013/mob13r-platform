import express from 'express';
import pool from '../db.js';
const router = express.Router();

// Example: set hold percent for a publisher
router.post('/publisher/:id/hold', async (req, res) => {
  const { id } = req.params;
  const { hold_percent } = req.body;
  try {
    await pool.query('UPDATE publishers SET hold_percent = $1 WHERE id = $2', [hold_percent, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
