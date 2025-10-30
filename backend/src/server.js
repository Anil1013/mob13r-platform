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
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ CORS fix — allow frontend domain
app.use(cors({
  origin: ["https://dashboard.mob13r.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(helmet());
app.use(bodyParser.json({ limit: '10mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT now() as db_time');
    res.json({ status: 'ok', db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ error: 'DB connection error', details: err.message });
  }
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/publishers', publishersRoutes);
app.use('/api/advertisers', advertisersRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/clicks', clickRoutes);
app.use('/api/postbacks', postbackRoutes);
app.use('/api/conversions', conversionsRoutes);
app.use('/api/stats', statsRoutes);

// ✅ Listen on 0.0.0.0 for AWS
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✔️ Server running at http://0.0.0.0:${PORT}`);
});
