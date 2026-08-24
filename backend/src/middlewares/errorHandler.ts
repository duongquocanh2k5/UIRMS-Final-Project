/**
 * Error Handler Middleware
 * Global error handling for all routes
 */

import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || ERROR_MESSAGES.INTERNAL_ERROR;

  console.error(`[Error] ${statusCode} - ${message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.details }),
  });
}

/**
 * Middleware to handle 404 errors
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: ERROR_MESSAGES.NOT_FOUND,
  });
}

/**
 * Utility to create API error
 */
export function createApiError(
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: any
): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
