import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import pool from './db.js';
import adminRoutes from './routes/admin.js';
import publishersRoutes from './routes/publishers.js';
import advertisersRoutes from './routes/advertisers.js';
import offersRoutes from './routes/offers.js';
import clickRoutes from './routes/clicks.js';
import postbackRoutes from './routes/postbacks.js';
import conversionsRoutes from './routes/conversions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT now() as db_time');
    res.json({ status: 'ok', db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ error: 'DB connection error', details: err.message });
  }
});

// mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/publishers', publishersRoutes);
app.use('/api/advertisers', advertisersRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/clicks', clickRoutes);
app.use('/api/postbacks', postbackRoutes);
app.use('/api/conversions', conversionsRoutes);

// safe query runner for the QueryConsole (READ-ONLY)
app.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'Invalid SQL' });

    // very simple safety: only allow SELECT and limit to 1MB length
    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed via this route' });
    }
    if (sql.length > 10000) return res.status(400).json({ error: 'Query too large' });

    const result = await pool.query(sql);
    return res.json({ rows: result.rows, fields: result.fields.map(f => f.name) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✔️ Server running on port ${PORT}`);
});
