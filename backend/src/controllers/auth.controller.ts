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

      const result = await authService.loginUser(emailOrPhone, password);

      if (!result) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Invalid credentials',
        });
        return;
      }

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
          error: 'Invalid verification code',
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
