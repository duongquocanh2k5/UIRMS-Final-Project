/**
 * Authentication Routes
 * POST /auth/register      - Register new user
 * POST /auth/login         - User login
 * POST /auth/verify-email  - Verify email with OTP
 * POST /auth/forgot-password - Request password reset
 * POST /auth/reset-password - Reset password with OTP
 * GET  /auth/me           - Get current user profile
 * PUT  /auth/profile      - Update user profile
 * DELETE /auth/account    - Delete account
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { REGEX_PATTERNS } from '../config/constants';

const router = Router();

// Register new user
router.post(
  '/register',
  validateRequest({
    phone: { required: true, type: 'string', pattern: REGEX_PATTERNS.VIETNAMESE_PHONE },
    email: { required: true, type: 'string', pattern: REGEX_PATTERNS.EMAIL },
    identity_number: { required: true, type: 'string', pattern: REGEX_PATTERNS.CMND_CCCD },
    password: { required: true, type: 'string', minLength: 8 },
    full_name: { required: true, type: 'string', minLength: 2 },
    bio: { required: false, type: 'string' },
  }),
  (req, res) => authController.register(req, res)
);

// Login user
router.post(
  '/login',
  validateRequest({
    emailOrPhone: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  (req, res) => authController.login(req, res)
);

// Verify email
router.post(
  '/verify-email',
  authenticateToken,
  validateRequest({
    verificationCode: { required: true, type: 'string' },
  }),
  (req, res) => authController.verifyEmail(req, res)
);

// Forgot password
router.post(
  '/forgot-password',
  validateRequest({
    email: { required: true, type: 'string', pattern: REGEX_PATTERNS.EMAIL },
  }),
  (req, res) => authController.forgotPassword(req, res)
);

// Reset password
router.post(
  '/reset-password',
  validateRequest({
    email: { required: true, type: 'string', pattern: REGEX_PATTERNS.EMAIL },
    resetCode: { required: true, type: 'string' },
    newPassword: { required: true, type: 'string', minLength: 8 },
  }),
  (req, res) => authController.resetPassword(req, res)
);

// Get current user
router.get(
  '/me',
  authenticateToken,
  (req, res) => authController.getCurrentUser(req, res)
);

export default router;
