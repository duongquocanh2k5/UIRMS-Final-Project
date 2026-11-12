/**
 * Application Entry Point
 * Initializes Express server and database connection
 */

import { createApp } from './server';
import { env } from './config/environment';
import { testConnection } from './config/database';
import { runMigrations } from './database/migrator';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    // Create Express app and listen immediately to minimize cold-start latency (e.g. on Render)
    const app = createApp();
    const port = env.port;

    app.listen(port, '0.0.0.0', () => {
      logger.info(`✓ Server running on http://localhost:${port}`);
      logger.info(`✓ Environment: ${env.nodeEnv}`);
      logger.info(`✓ API available at http://localhost:${port}/api`);
      logger.info(`✓ Health check: http://localhost:${port}/api/health`);
    });

    // Test database connection and run migrations asynchronously in background
    logger.info('Connecting to database...');
    try {
      await testConnection();

      logger.info('Running database migrations...');
      await runMigrations();
    } catch (dbError) {
      logger.warn('⚠ Database connection failed - running in offline mode');
      logger.warn('Some features may not be available');
    }
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', reason as Error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
