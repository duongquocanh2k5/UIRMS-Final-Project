/**
 * Application Constants
 * Centralized configuration for enums and constant values
 */

// User & Admin Roles
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

// Incident Status
export enum IncidentStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

// Incident Priority
export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Incident Update Types
export enum IncidentUpdateType {
  STATUS_CHANGE = 'status_change',
  ASSIGNMENT = 'assignment',
  COMMENT = 'comment',
  IMAGE_ADDED = 'image_added',
}

// Notification Types
export enum NotificationType {
  STATUS_UPDATE = 'status_update',
  NEW_REPLY = 'new_reply',
  SYSTEM = 'system',
  REMINDER = 'reminder',
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized - Invalid or missing token',
  FORBIDDEN: 'Forbidden - You do not have permission to access this resource',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_INPUT: 'Invalid input data',
  DUPLICATE_ENTRY: 'This record already exists',
  DATABASE_ERROR: 'Database connection error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  OPERATION_SUCCESS: 'Operation completed successfully',
  USER_CREATED: 'User created successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  INCIDENT_CREATED: 'Incident reported successfully',
  INCIDENT_UPDATED: 'Incident updated successfully',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Cache Duration (in seconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 24 * 60 * 60, // 24 hours
} as const;

// Spatial Query Defaults
export const SPATIAL_DEFAULTS = {
  DEFAULT_RADIUS_METERS: 5000,
  MAX_RADIUS_METERS: 50000,
  EARTH_RADIUS_METERS: 6371000,
} as const;

// API Rate Limiting
export const RATE_LIMITS = {
  AUTH_ATTEMPTS: 5,
  AUTH_WINDOW_MINUTES: 15,
  API_CALLS_PER_MINUTE: 60,
  FILE_UPLOAD_LIMIT_MB: 10,
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  PHONE: /^(\+\d{1,3}[- ]?)?\d{9,}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  VIETNAMESE_PHONE: /^(0|\+84)(1|2|3|4|5|6|7|8|9)[0-9]{8}$/,
  PASSWORD: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/,
  CMND_CCCD: /^(?:\d{9}|\d{12})$/,
} as const;
