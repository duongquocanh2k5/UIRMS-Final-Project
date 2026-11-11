/**
 * Database Migration Runner
 * Executes all migrations in order
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const DIST_MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SRC_MIGRATIONS_DIR = path.resolve(__dirname, '../../src/database/migrations');
const MIGRATIONS_DIR =
  fs.existsSync(DIST_MIGRATIONS_DIR) && fs.readdirSync(DIST_MIGRATIONS_DIR).some((f) => f.endsWith('.sql'))
    ? DIST_MIGRATIONS_DIR
    : SRC_MIGRATIONS_DIR;
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Create separate pool for migrations (to avoid conflicts)
 */
function createMigrationPool(): Pool {
  const useSsl =
    process.env.DB_SSL === 'true' ||
    env.nodeEnv === 'production' ||
    env.databaseUrl.includes('supabase.co') ||
    env.databaseUrl.includes('supabase.com');
  return new Pool({
    connectionString: env.databaseUrl,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Execute a SQL file atomically, recording its migration name when provided.
 */
async function executeSql(pool: Pool, sql: string, migrationName?: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    if (migrationName) {
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1);`,
        [migrationName]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Failed to rollback migration transaction', rollbackError as Error);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize migrations table
 */
async function initMigrationsTable(pool: Pool): Promise<void> {
  try {
    await executeSql(
      pool,
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    );
    logger.info('✓ Migrations table initialized');
  } catch (error) {
    logger.error('Failed to init migrations table', error as Error);
    throw error;
  }
}

/**
 * Get executed migrations
 */
async function getExecutedMigrations(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY executed_at;`
    );
    return result.rows.map((row: any) => row.name);
  } finally {
    client.release();
  }
}

/**
 * Get all migration files
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

/**
 * Run migrations
 */
export async function runMigrations(): Promise<void> {
  const pool = createMigrationPool();

  try {
    logger.info('🔄 Starting database migrations...');

    // Initialize migrations table
    await initMigrationsTable(pool);

    // Get executed migrations
    const executed = await getExecutedMigrations(pool);
    logger.info(`✓ Found ${executed.length} executed migrations`);

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    logger.info(`✓ Found ${migrationFiles.length} migration files`);

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (executed.includes(file)) {
        logger.debug(`⊘ Skipping executed migration: ${file}`);
        continue;
      }

      logger.info(`🚀 Executing migration: ${file}`);

      try {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await executeSql(pool, sql, file);

        logger.info(`✓ Migration completed: ${file}`);
      } catch (error) {
        logger.error(`✗ Migration failed: ${file}`, error as Error);
        throw error;
      }
    }

    logger.info('✓ All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed', error as Error);
    throw error;
  } finally {
    await pool.end();
  }
}
