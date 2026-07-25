import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();

app.use(express.json());

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'Nigerian Data & Airtime VTU Backend Platform', timestamp: new Date() });
});

// API Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
