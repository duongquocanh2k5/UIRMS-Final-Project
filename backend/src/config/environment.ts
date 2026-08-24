/**
 * Environment Configuration & Validation
 * Validates and provides type-safe access to environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiry: string;
  corsOrigin: string[];
  geminiApiKey: string;
  otpExpiryMinutes: number;
  maxFileSizeMb: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  emailFrom?: string | null;
}

/**
 * Validate that required environment variables are set
 */
function validateEnv(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GEMINI_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }
}

/**
 * Get environment configuration
 */
function getEnvironment(): EnvironmentConfig {
  validateEnv();

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const port = parseInt(process.env.PORT || '5000', 10);
  const jwtExpiry = process.env.JWT_EXPIRY || '7d';
  const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

  const corsOriginString = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const corsOrigin = corsOriginString.split(',').map((origin) => origin.trim());

  const smtpHost = process.env.SMTP_HOST || null;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null;
  const smtpUser = process.env.SMTP_USER || null;
  const smtpPass = process.env.SMTP_PASS || null;
  const emailFrom = process.env.EMAIL_FROM || null;

  return {
    nodeEnv,
    port,
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiry,
    corsOrigin,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    otpExpiryMinutes,
    maxFileSizeMb,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    emailFrom,
  };
}

export const env = getEnvironment();
export type { EnvironmentConfig };
