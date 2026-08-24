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
    origin: env.corsOrigin,
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
