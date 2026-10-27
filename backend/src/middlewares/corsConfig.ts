/**
 * CORS Configuration Middleware
 * Configures Cross-Origin Resource Sharing
 */

import cors, { CorsOptions } from 'cors';
import { env } from '../config/environment';

/**
 * CORS configuration options
 */
export function getCorsOptions(): CorsOptions {
  return {
    origin: (origin, callback) => {
      // Allow localhost origins only in non-production environments
      const isLocalDevelopmentOrigin = Boolean(
        env.nodeEnv !== 'production' &&
        origin &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      );

      if (!origin || env.corsOrigin.includes(origin) || isLocalDevelopmentOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware() {
  return cors(getCorsOptions());
}
