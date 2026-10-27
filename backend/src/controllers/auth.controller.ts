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

/**
 * Clean up expired entries and check/update rate limit
 * Returns null if allowed, or { retryAfterSeconds } if blocked
 */
function checkRateLimit(
  attemptsMap: Map<string, LoginAttempt>,
  key: string,
  loginSucceeded: boolean
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

  if (loginSucceeded) {
    attemptsMap.delete(key);
    return { blocked: false };
  }

  // Record failed attempt
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
      const preCheck = checkRateLimit(userLoginAttempts, identifier, false);
      // Undo the failed attempt count if we haven't actually tried yet
      // We'll properly count after the login attempt
      if (preCheck.blocked) {
        res.set('Retry-After', String(preCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
        });
        return;
      }
      // Undo the premature increment — we check rate limit properly after login
      const entry = userLoginAttempts.get(identifier);
      if (entry) {
        entry.attempts -= 1;
        if (entry.attempts <= 0) userLoginAttempts.delete(identifier);
      }

      const result = await authService.loginUser(emailOrPhone, password);

      if (!result) {
        // Record failed attempt
        const rateResult = checkRateLimit(userLoginAttempts, identifier, false);
        if (rateResult.blocked) {
          res.set('Retry-After', String(rateResult.retryAfterSeconds));
          res.status(429).json({
            error: 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
          });
          return;
        }
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Invalid credentials',
        });
        return;
      }

      // Clear rate limit on success
      checkRateLimit(userLoginAttempts, identifier, true);

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
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Email/username, mật khẩu và vai trò là bắt buộc' });
        return;
      }

      const identifier = String(emailOrUsername).trim().toLowerCase();

      // Check if rate-limited BEFORE attempting login
      const preCheck = checkRateLimit(adminLoginAttempts, identifier, false);
      if (preCheck.blocked) {
        res.set('Retry-After', String(preCheck.retryAfterSeconds));
        res.status(429).json({ error: 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.' });
        return;
      }
      // Undo premature increment
      const entry = adminLoginAttempts.get(identifier);
      if (entry) {
        entry.attempts -= 1;
        if (entry.attempts <= 0) adminLoginAttempts.delete(identifier);
      }

      const result = await authService.loginAdmin(emailOrUsername, password, role);
      if (!result) {
        const rateResult = checkRateLimit(adminLoginAttempts, identifier, false);
        if (rateResult.blocked) {
          res.set('Retry-After', String(rateResult.retryAfterSeconds));
          res.status(429).json({ error: 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.' });
          return;
        }
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Thông tin đăng nhập admin không hợp lệ' });
        return;
      }

      checkRateLimit(adminLoginAttempts, identifier, true);

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

      await authService.sendPasswordResetOTP(email);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset code sent to your email',
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
