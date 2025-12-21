import express from 'express';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);

export default app;
