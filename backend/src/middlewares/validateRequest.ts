/**
 * Request Validation Middleware
 * Validates request data structure and types
 */

import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

export interface ValidationRules {
  [key: string]: {
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
  };
}

/**
 * Validate request body against rules
 */
export function validateRequest(rules: ValidationRules) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { [key: string]: string } = {};

    for (const field in rules) {
      const rule = rules[field]!;
      const value = req.body[field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (rule.type) {
        if (typeof value !== rule.type) {
          errors[field] = `${field} must be of type ${rule.type}`;
          continue;
        }
      }

      // Check string length
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors[field] = `${field} must be at least ${rule.minLength} characters`;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors[field] = `${field} has invalid format`;
        }
      }

      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        errors[field] = `${field} failed custom validation`;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.INVALID_INPUT,
        details: errors,
      });
      return;
    }

    next();
  };
}
