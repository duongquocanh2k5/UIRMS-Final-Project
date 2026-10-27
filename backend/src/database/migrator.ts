/**
 * Database Migration Runner
 * Executes all migrations in order
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Create separate pool for migrations (to avoid conflicts)
 */
function createMigrationPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Execute SQL safely (Handle multi-statement SQL files)
 */
async function executeSql(pool: Pool, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    // Split by semicolon, but be careful with function definitions
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await client.query(statement + ';');
        } catch (err: any) {
          // Log more details to debug
          logger.error(`Statement execution failed: ${statement.substring(0, 100)}...`, err);
          throw err;
        }
      }
    }
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
 * Record migration execution
 * FIX: Use parameterized query to prevent SQL injection via filenames
 */
async function recordMigration(pool: Pool, name: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1);`,
      [name]
    );
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

        // Execute migration with proper statement handling
        await executeSql(pool, sql);

        // Record migration
        await recordMigration(pool, file);

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
