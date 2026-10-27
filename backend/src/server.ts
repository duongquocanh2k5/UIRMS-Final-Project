/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { corsMiddleware } from './middlewares/corsConfig';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { authenticateToken } from './middlewares/auth.middleware';
import routes from './routes';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app = express();

  // ============ Middleware ============
  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // FIX: Static file serving for uploads requires authentication
  // Unauthenticated users cannot access uploaded incident images
  app.use('/uploads', authenticateToken, express.static(path.resolve(process.cwd(), 'uploads')));

  // CORS
  app.use(corsMiddleware());

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // ============ Routes ============
  app.use('/api', routes);

  // ============ Error Handling ============
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
