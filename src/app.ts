import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import { BaseDomainError } from './errors/vtuErrors';

dotenv.config();

const app = express();

// Express JSON body parser with raw body buffer preservation for HMAC webhook signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'Nigerian Data & Airtime VTU Backend Platform', timestamp: new Date() });
});

// API Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]:', err);

  if (err instanceof BaseDomainError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.errorCode,
      details: err.details,
    });
  }

  return res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
