/**
 * Notification Service
 * Handles user notifications and preferences
 */

import { Notification } from '../types/index';
import { query, queryOne } from '../config/database';
import { PaginationParams } from '../types/index';
import { calculateOffset } from '../utils/helpers';

interface NotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
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

    return result[0]!;
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
    // For now, return default preferences
    // In production, these would be stored in a user_preferences table
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
  ): Promise<NotificationPreferences> {
    // In production, these would be stored in user_preferences table
    return {
      emailNotifications: preferences.emailNotifications ?? true,
      pushNotifications: preferences.pushNotifications ?? true,
      smsNotifications: preferences.smsNotifications ?? false,
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
   * FIX: Query the correct 'admins' table instead of 'users', and use correct column name 'type'
   */
  async broadcastToAdmins(
    title: string,
    message: string,
    notificationType: string
  ): Promise<number> {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT id, $1, $2, $3 FROM admins WHERE (role = 'super_admin' OR role = 'manager') AND is_active = true
       RETURNING id;`,
      [title, message, notificationType]
    );

    return result.length;
  }
}

export const notificationService = new NotificationService();
