import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { generalLimiter } from './middleware/rateLimiter';
import { i18nMiddleware } from './middleware/i18n';
import authController from '../adapters/controllers/auth.controller';
import tripController from '../adapters/controllers/trip.controller';
import itineraryController from '../adapters/controllers/itinerary.controller';
import disruptionController from '../adapters/controllers/disruption.controller';
import expenseController from '../adapters/controllers/expense.controller';
import checklistController from '../adapters/controllers/checklist.controller';
import geocodingController from '../adapters/controllers/geocoding.controller';
import translationController from '../adapters/controllers/translation.controller';
import suggestionsController from '../adapters/controllers/suggestions.controller';
import bookingSuggestionsController from '../adapters/controllers/booking-suggestions.controller';
import packingController from '../adapters/controllers/packing.controller';

export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use('/api/', generalLimiter);
  app.use(i18nMiddleware);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
  });

  app.use('/api/auth', authController);
  app.use('/api/trips', tripController);
  app.use('/api/itinerary', itineraryController);
  app.use('/api/disruption', disruptionController);
  app.use('/api/expense', expenseController);
  app.use('/api/checklist', checklistController);
  app.use('/api/geocode', geocodingController);
  app.use('/api/translate', translationController);
  app.use('/api/suggestions', suggestionsController);
  app.use('/api/booking-suggestions', bookingSuggestionsController);
  app.use('/api/packing', packingController);

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  });

  return app;
}
