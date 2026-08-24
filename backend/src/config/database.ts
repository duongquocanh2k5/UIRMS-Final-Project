/**
 * Database Configuration & Connection Pool
 * Manages PostgreSQL connection using pg library
 */

import { Pool, PoolClient } from 'pg';
import { env } from './environment';

/**
 * Create and configure database connection pool
 */
const useSsl = process.env.DB_SSL === 'true' || env.databaseUrl.includes('supabase.co');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

/**
 * Event handlers for pool
 */
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✓ New database connection established');
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful:', result.rows[0]);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

/**
 * Close all database connections
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('✗ Error closing database connections:', error);
    throw error;
  }
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  try {
    const result = await pool.query(text, values);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute a single query and return one row
 */
export async function queryOne<T = any>(
  text: string,
  values?: any[]
): Promise<T | null> {
  try {
    const result = await pool.query(text, values);
    return result.rows[0] as T | undefined || null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
