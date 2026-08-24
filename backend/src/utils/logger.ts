/**
 * Logger Utility
 * Centralized logging configuration
 */

import { env } from '../config/environment';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Format timestamp
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message
 */
function formatLog(level: LogLevel, message: string, data?: any): string {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

/**
 * Logger object
 */
export const logger = {
  debug: (message: string, data?: any): void => {
    if (env.nodeEnv === 'development') {
      console.log(formatLog(LogLevel.DEBUG, message, data));
    }
  },

  info: (message: string, data?: any): void => {
    console.log(formatLog(LogLevel.INFO, message, data));
  },

  warn: (message: string, data?: any): void => {
    console.warn(formatLog(LogLevel.WARN, message, data));
  },

  error: (message: string, error?: Error | any): void => {
    console.error(formatLog(LogLevel.ERROR, message, error?.message || error));
    if (env.nodeEnv === 'development' && error?.stack) {
      console.error(error.stack);
    }
  },
};
