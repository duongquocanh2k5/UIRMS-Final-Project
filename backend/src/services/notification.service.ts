/**
 * Notification Service
 * Handles user notifications and preferences
 */

import { Notification } from '../types/index';
import { query, queryOne } from '../config/database';
import { PaginationParams } from '../types/index';
import { calculateOffset } from '../utils/helpers';
import { emailService } from './email.service';

interface NotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}

interface NotificationPreferencesRow {
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

export class NotificationService {
  /**
   * Create notification
   */
  async createNotification(
    userId: number,
    title: string,
    message: string,
    notificationType: string,
    incidentId?: number,
    actionUrl?: string
  ): Promise<Notification> {
    const result = await query<Notification>(
      `INSERT INTO notifications (user_id, incident_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, incident_id, title, message, type AS notification_type,
                 is_read, created_at, read_at;`,
      [userId, incidentId || null, title, message, notificationType]
    );

    const created = result[0]!;

    if (incidentId && (notificationType === 'new_reply' || notificationType === 'status_update')) {
      void this.sendStatusEmailIfEnabled(
        userId,
        incidentId,
        title,
        notificationType === 'new_reply' ? 'Phản hồi từ Ban quản lý / Admin Reply' : 'Cập nhật trạng thái / Status Update',
        message
      );
    }

    return created;
  }

  /**
   * Send incident status/reply email if the citizen has email notifications enabled
   */
  async sendStatusEmailIfEnabled(
    userId: number,
    incidentId: number,
    incidentTitle: string | undefined,
    statusLabel: string,
    message: string
  ): Promise<void> {
    try {
      const prefs = await this.getPreferences(userId);
      if (!prefs.emailNotifications) {
        return;
      }

      const userRow = await queryOne<{ email: string }>(
        `SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL;`,
        [userId]
      );
      if (!userRow?.email) {
        return;
      }

      await emailService.sendIncidentStatusEmail(userRow.email, {
        incidentId,
        incidentTitle,
        statusLabel,
        message,
      });
    } catch (error) {
      console.error('Failed to send incident status notification email:', error);
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: number,
    pagination: PaginationParams
  ): Promise<{ notifications: Notification[]; total: number }> {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1;`,
      [userId]
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    const offset = calculateOffset(pagination.page, pagination.limit);
    const notifications = await query<Notification>(
      `SELECT id, user_id, incident_id, title, message, type AS notification_type,
          is_read, created_at, read_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [userId, pagination.limit, offset]
    );

    return { notifications, total };
  }

  /**
   * Mark notification as read
   * FIX: Added userId parameter to prevent IDOR — users can only mark their own notifications
   */
  async markAsRead(notificationId: number, userId: number): Promise<Notification | null> {
    return queryOne<Notification>(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *;`,
      [notificationId, userId]
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await query<{ count: string }>(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING id;`,
      [userId]
    );

    return result.length;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: number): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false;`,
      [userId]
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Delete notification
   * FIX: Added userId parameter to prevent IDOR — users can only delete their own notifications
   */
  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [notificationId, userId]
    );

    return result.length > 0;
  }

  /**
   * Delete all notifications for user
   */
  async deleteAllNotifications(userId: number): Promise<number> {
    const result = await query(
      `DELETE FROM notifications WHERE user_id = $1 RETURNING id;`,
      [userId]
    );

    return result.length;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: number): Promise<{
    userId: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  }> {
    const preferences = await queryOne<NotificationPreferencesRow>(
      `SELECT user_id, email_notifications, push_notifications, sms_notifications
       FROM user_notification_preferences
       WHERE user_id = $1;`,
      [userId]
    );

    if (preferences) {
      return {
        userId: preferences.user_id,
        emailNotifications: preferences.email_notifications,
        pushNotifications: preferences.push_notifications,
        smsNotifications: preferences.sms_notifications,
      };
    }

    return {
      userId,
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: number,
    preferences: NotificationPreferences
  ): Promise<{
    userId: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  }> {
    const updated = await queryOne<NotificationPreferencesRow>(
      `INSERT INTO user_notification_preferences
         (user_id, email_notifications, push_notifications, sms_notifications)
       VALUES ($1, COALESCE($2::boolean, TRUE), COALESCE($3::boolean, TRUE), COALESCE($4::boolean, FALSE))
       ON CONFLICT (user_id) DO UPDATE SET
         email_notifications = COALESCE($2::boolean, user_notification_preferences.email_notifications),
         push_notifications = COALESCE($3::boolean, user_notification_preferences.push_notifications),
         sms_notifications = COALESCE($4::boolean, user_notification_preferences.sms_notifications),
         updated_at = NOW()
       RETURNING user_id, email_notifications, push_notifications, sms_notifications;`,
      [
        userId,
        preferences.emailNotifications ?? null,
        preferences.pushNotifications ?? null,
        preferences.smsNotifications ?? null,
      ]
    );

    if (!updated) {
      throw new Error('Failed to update notification preferences');
    }

    return {
      userId: updated.user_id,
      emailNotifications: updated.email_notifications,
      pushNotifications: updated.push_notifications,
      smsNotifications: updated.sms_notifications,
    };
  }

  /**
   * Create incident-related notifications
   */
  async notifyIncidentCreated(
    incidentId: number,
    title: string,
    userId: number
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      'Incident Created',
      `Your incident "${title}" has been successfully reported`,
      'system',
      incidentId,
      `/incidents/${incidentId}`
    );
  }

  /**
   * Notify incident status update
   */
  async notifyIncidentStatusUpdate(
    incidentId: number,
    newStatus: string,
    userId: number
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      'Incident Status Updated',
      `Your incident status has been updated to: ${newStatus}`,
      'status_update',
      incidentId,
      `/incidents/${incidentId}`
    );
  }

  /**
   * Notify incident assigned
   */
  async notifyIncidentAssigned(
    incidentId: number,
    technicianName: string,
    technicianId: number
  ): Promise<Notification> {
    return this.createNotification(
      technicianId,
      'New Assignment',
      `You have been assigned to incident #${incidentId}`,
      'system',
      incidentId,
      `/incidents/${incidentId}`
    );
  }

  /**
   * Broadcast notification to admin users
   */
  async broadcastToAdmins(
    title: string,
    message: string,
    notificationType: string
  ): Promise<number> {
    // notifications.user_id references users, so admin IDs must not be inserted here.
    return 0;
  }
}

export const notificationService = new NotificationService();
