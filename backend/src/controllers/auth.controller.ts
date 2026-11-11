/**
 * Authentication Controller
 * Handles authentication-related requests
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { authService } from '../services/auth.service';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';
import { isValidEmail, isValidPhoneNumber, isValidPassword, isValidIdentityNumber } from '../utils/validators';
import { generateToken } from '../utils/jwt';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_LOCK_MS = 10 * 60 * 1000;   // 10 minutes lock

interface LoginAttempt {
  attempts: number;
  windowStartedAt: number;
  lockedUntil?: number;
}

// Rate limiting maps for both user and admin login
const userLoginAttempts = new Map<string, LoginAttempt>();
const adminLoginAttempts = new Map<string, LoginAttempt>();

function isRateLimited(
  attemptsMap: Map<string, LoginAttempt>,
  key: string
): { blocked: true; retryAfterSeconds: number } | { blocked: false } {
  const now = Date.now();

  // Cleanup expired entries
  for (const [k, attempt] of attemptsMap) {
    if ((attempt.lockedUntil && attempt.lockedUntil <= now) || (!attempt.lockedUntil && now - attempt.windowStartedAt >= LOGIN_WINDOW_MS)) {
      attemptsMap.delete(k);
    }
  }

  const currentAttempt = attemptsMap.get(key);

  // Check if currently locked
  if (currentAttempt?.lockedUntil && currentAttempt.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((currentAttempt.lockedUntil - now) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false };
}

function recordLoginAttempt(
  attemptsMap: Map<string, LoginAttempt>,
  key: string,
  succeeded: boolean
): { blocked: true; retryAfterSeconds: number } | { blocked: false } {
  if (succeeded) {
    attemptsMap.delete(key);
    return { blocked: false };
  }

  const now = Date.now();
  const currentAttempt = attemptsMap.get(key);
  const attempt = currentAttempt && now - currentAttempt.windowStartedAt < LOGIN_WINDOW_MS
    ? currentAttempt
    : { attempts: 0, windowStartedAt: now };
  attempt.attempts += 1;

  if (attempt.attempts >= LOGIN_MAX_ATTEMPTS) {
    attempt.lockedUntil = now + LOGIN_LOCK_MS;
    attemptsMap.set(key, attempt);
    return { blocked: true, retryAfterSeconds: LOGIN_LOCK_MS / 1000 };
  }

  attemptsMap.set(key, attempt);
  return { blocked: false };
}

export class AuthController {
  /**
   * Register new user
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { phone, email, password, full_name, identity_number, bio } = req.body;

      // Validate inputs
      if (!phone || !isValidPhoneNumber(phone)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid phone number format (Vietnamese only)',
        });
        return;
      }

      if (!email || !isValidEmail(email)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid email address format',
        });
        return;
      }

      if (!identity_number || !isValidIdentityNumber(identity_number)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid CMND/CCCD format (9 or 12 digits)',
        });
        return;
      }

      if (!password || !isValidPassword(password)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Password must contain at least 8 characters, 1 uppercase, 1 number, and 1 special character',
        });
        return;
      }

      if (!full_name || full_name.trim().length < 2) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Full name must be at least 2 characters',
        });
        return;
      }

      const user = await authService.registerUser({
        phone,
        email,
        password,
        full_name,
        identity_number,
        bio: bio || null,
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.USER_CREATED,
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            full_name: user.full_name,
            is_verified: user.is_verified,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.message?.includes('email')) {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Email already exists' });
      } else if (error.message?.includes('phone')) {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Phone already exists' });
      } else if (error.message?.includes('identity_number')) {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'CMND/CCCD already exists' });
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: ERROR_MESSAGES.INTERNAL_ERROR,
        });
      }
    }
  }

  /**
   * Login user
   * POST /auth/login
   * FIX: Added rate limiting to prevent brute-force attacks
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrPhone, password } = req.body;

      if (!emailOrPhone || !password) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Email/phone and password are required',
        });
        return;
      }

      const identifier = String(emailOrPhone).trim().toLowerCase();

      // Check if rate-limited BEFORE attempting login
      const preCheck = isRateLimited(userLoginAttempts, identifier);
      if (preCheck.blocked) {
        res.set('Retry-After', String(preCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Your account is temporarily locked due to too many failed login attempts. Please try again later.',
        });
        return;
      }

      const result = await authService.loginUser(emailOrPhone, password);

      if (!result) {
        const rateResult = recordLoginAttempt(userLoginAttempts, identifier, false);
        if (rateResult.blocked) {
          res.set('Retry-After', String(rateResult.retryAfterSeconds));
          res.status(429).json({
            error: 'Your account is temporarily locked due to too many failed login attempts. Please try again later.',
          });
          return;
        }
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Invalid credentials',
        });
        return;
      }

      // Clear rate limit on success
      recordLoginAttempt(userLoginAttempts, identifier, true);

      // FIX: result.user already has password_hash stripped by service layer
      res.json({
        success: true,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        data: {
          token: result.token,
          user: {
            id: result.user.id,
            email: result.user.email,
            phone: result.user.phone,
            full_name: result.user.full_name,
            is_verified: result.user.is_verified,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrUsername, password, role } = req.body;
      if (!emailOrUsername || !password || !role) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Email/username, password, and role are required.' });
        return;
      }

      const identifier = String(emailOrUsername).trim().toLowerCase();

      // Check if rate-limited BEFORE attempting login
      const preCheck = isRateLimited(adminLoginAttempts, identifier);
      if (preCheck.blocked) {
        res.set('Retry-After', String(preCheck.retryAfterSeconds));
        res.status(429).json({ error: 'Your account is temporarily locked due to too many failed login attempts. Please try again in 10 minutes.' });
        return;
      }

      const result = await authService.loginAdmin(emailOrUsername, password, role);
      if (!result) {
        const rateResult = recordLoginAttempt(adminLoginAttempts, identifier, false);
        if (rateResult.blocked) {
          res.set('Retry-After', String(rateResult.retryAfterSeconds));
          res.status(429).json({ error: 'Your account is temporarily locked due to too many failed login attempts. Please try again in 10 minutes.' });
          return;
        }
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      recordLoginAttempt(adminLoginAttempts, identifier, true);

      // FIX: result.admin already has password_hash stripped by service layer
      res.json({
        success: true,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        data: {
          token: result.token,
          user: {
            id: result.admin.id,
            email: result.admin.email,
            username: result.admin.username,
            full_name: result.admin.full_name,
            role: result.admin.role,
          },
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
    }
  }

  /**
   * Send email verification OTP
   * POST /auth/send-verification-email
   */
  async sendVerificationEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const result = await authService.sendEmailVerificationOTP(userId);
      if (result === 'not_found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      if (result === 'already_verified') {
        res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Email is already verified',
        });
        return;
      }

      if (result === 'delivery_failed') {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          error: 'Unable to send verification email. Check server email configuration.',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Verification code sent to your email address',
      });
    } catch (error) {
      console.error('Send verification email error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Verify email
   * POST /auth/verify-email
   */
  async verifyEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { verificationCode } = req.body;
      const userId = req.user?.id;

      if (!userId || !verificationCode) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'User ID and verification code are required',
        });
        return;
      }

      const success = await authService.verifyUserEmail(userId, verificationCode);

      if (!success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid or expired verification code',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Forgot password
   * POST /auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || !isValidEmail(email)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Valid email address is required',
        });
        return;
      }

      const deliveryResult = await authService.sendPasswordResetOTP(email);

      if (deliveryResult === 'delivery_failed') {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          error: 'Unable to send the password reset email. Check the server email configuration or contact an administrator.',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'If this email address is registered, a password reset code will be sent to your inbox.',
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Reset password with OTP
   * POST /auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, resetCode, newPassword } = req.body;

      if (!email || !resetCode || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Email, reset code, and new password are required',
        });
        return;
      }

      if (!isValidPassword(newPassword)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'New password does not meet requirements',
        });
        return;
      }

      const resetSuccessful = await authService.resetPassword(email, resetCode, newPassword);

      if (!resetSuccessful) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid or expired reset code',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Update current user profile
   * PUT /auth/profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    const { full_name, phone, bio } = req.body;
    if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length < 2)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Full name must be at least 2 characters',
      });
      return;
    }

    if (phone !== undefined && (typeof phone !== 'string' || !isValidPhoneNumber(phone))) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid phone number format (Vietnamese only)',
      });
      return;
    }

    if (bio !== undefined && typeof bio !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Bio must be a string',
      });
      return;
    }

    try {
      const user = await authService.updateUserProfile(userId, {
        ...(full_name !== undefined ? { full_name: full_name.trim() } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
      });

      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Phone number is already in use',
        });
        return;
      }

      console.error('Update profile error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Change current user password
   * PATCH /auth/change-password
   */
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Current password and new password are required',
      });
      return;
    }

    if (!isValidPassword(newPassword)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'New password does not meet requirements',
      });
      return;
    }

    try {
      const result = await authService.changeUserPassword(userId, currentPassword, newPassword);
      if (result === 'not_found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      if (result === 'invalid_password') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Current password is incorrect',
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const user = await authService.getUserById(req.user.id);

      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
}

export const authController = new AuthController();
