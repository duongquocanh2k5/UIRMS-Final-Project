/**
 * Model Type Definitions
 * Centralized type exports for all models
 */

import { IncidentStatus, IncidentPriority, AdminRole } from '../config/constants';

// ==================== User Model ====================
export interface IUser {
  id: number;
  phone: string;
  email: string;
  password_hash: string;
  full_name: string;
  identity_number?: string;
  avatar_url?: string;
  is_verified: boolean;
  verification_code?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface ICreateUserInput {
  phone: string;
  email: string;
  password: string;
  full_name: string;
  identity_number: string;
  bio?: string;
}

export interface IUpdateUserInput {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

// ==================== Incident Model ====================
export interface IIncident {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description?: string;
  location_name?: string;
  location_point: any; // PostGIS Point type
  priority: IncidentPriority;
  status: IncidentStatus;
  assigned_to?: number;
  assigned_technician?: number;
  ai_confidence?: number;
  ai_suggested_category?: number;
  is_duplicate: boolean;
  duplicate_of?: number;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  deleted_at?: Date;
}

export interface ICreateIncidentInput {
  category_id: number;
  title: string;
  description?: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  priority?: IncidentPriority;
  image_urls?: string[];
}

export interface IUpdateIncidentInput {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  priority?: IncidentPriority;
  assigned_to?: number;
  assigned_technician?: number;
}

export interface IIncidentFilters {
  status?: IncidentStatus;
  category_id?: number;
  user_id?: number;
  priority?: IncidentPriority;
  assigned_to?: number;
  start_date?: Date;
  end_date?: Date;
  search?: string;
}

export interface IPaginationParams {
  page: number;
  limit: number;
}

// ==================== Category Model ====================
export interface ICategory {
  id: number;
  name: string;
  description?: string;
  icon_url?: string;
  color_code?: string;
  severity_weight: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ICreateCategoryInput {
  name: string;
  description?: string;
  icon_url?: string;
  color_code?: string;
  severity_weight: number;
}

export interface IUpdateCategoryInput {
  name?: string;
  description?: string;
  icon_url?: string;
  color_code?: string;
  severity_weight?: number;
  is_active?: boolean;
}

// ==================== Admin Model ====================
export interface IAdmin {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ICreateAdminInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: AdminRole;
}

export interface IUpdateAdminInput {
  full_name?: string;
  role?: AdminRole;
  is_active?: boolean;
}

// ==================== Notification Model ====================
export interface INotification {
  id: number;
  user_id: number;
  incident_id?: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export interface ICreateNotificationInput {
  user_id: number;
  incident_id?: number;
  title: string;
  message: string;
  type: string;
}

// ==================== Response Types ====================
export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
