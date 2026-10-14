/**
 * TypeScript Type Definitions
 * Interfaces and types for the application
 */

import { IncidentStatus, IncidentPriority, AdminRole, NotificationType } from '../config/constants';

// ==================== User Types ====================
export interface User {
  id: number;
  phone: string;
  email: string;
  password_hash: string;
  full_name: string;
  avatar_url?: string;
  is_verified: boolean;
  verification_code?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  image_urls?: string[];
}

export interface CreateUserInput {
  phone: string;
  email: string;
  password: string;
  full_name: string;
  identity_number: string;
  bio?: string;
}

export interface UpdateUserInput {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

// ==================== Admin Types ====================
export interface Admin {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string | null;
  department_id: number | null;
  avatar_url?: string | null;
  role: AdminRole;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AdminProfileResponse {
  id: number;
  username: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: Date;
}

export interface UpdateAdminProfileInput {
  name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  icon_url: string | null;
  color_code: string | null;
  severity_weight: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  reportCount: number;
}

export interface CategoryInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}

export interface DepartmentResponse {
  id: number;
  name: string;
  area: string | null;
  lead_admin_id: number | null;
  leadName: string | null;
  staffCount: number;
  created_at: Date;
}

export interface DepartmentInput {
  name?: string;
  area?: string | null;
  lead_admin_id?: number | null;
}

export interface CreateAdminInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: AdminRole;
}

export type StaffRole = AdminRole.TECHNICIAN | AdminRole.MANAGER;

export interface StaffListItem {
  id: number;
  name: string;
  role: StaffRole;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  inProgressCount: number;
  completedCount: number;
}

export interface StaffActiveIncident {
  id: number;
  title: string;
  description: string | null;
  category_name: string | null;
  location_name: string | null;
  district: string | null;
  priority: IncidentPriority;
  status: IncidentStatus;
  created_at: Date;
}

export interface StaffDetailResponse {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  avatar_url: string | null;
  role: StaffRole;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  activeIncidents: StaffActiveIncident[];
}

export interface StaffStatsSummaryResponse {
  totalStaff: number;
  activeStaff: number;
  busiestDepartment: {
    name: string;
    activeCount: number;
  };
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  role: StaffRole;
  password: string;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string | null;
  department?: string | null;
  is_active?: boolean;
}

// ==================== Category Types ====================
export interface Category {
  id: number;
  name: string;
  description?: string;
  icon_url?: string;
  color_code?: string;
  icon?: string | null;
  color?: string | null;
  severity_weight: number;
  is_active: boolean;
  created_at: Date;
}

// ==================== Incident Types ====================
export interface Incident {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description?: string;
  location_name?: string;
  district?: string | null;
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

export interface CreateIncidentInput {
  category_id: number;
  title: string;
  description?: string;
  location_name?: string;
  district?: string;
  latitude: number;
  longitude: number;
  priority?: IncidentPriority;
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  priority?: IncidentPriority;
  assigned_to?: number;
  assigned_technician?: number;
}

// ==================== Incident Image Types ====================
export interface IncidentImage {
  id: number;
  incident_id: number;
  image_url: string;
  ai_analysis?: any; // JSONB
  uploaded_by?: number;
  is_before: boolean;
  created_at: Date;
}

// ==================== Incident Update Types ====================
export interface IncidentUpdate {
  id: number;
  incident_id: number;
  old_status?: string;
  new_status: string;
  comment?: string;
  updated_by: number;
  update_type: string;
  created_at: Date;
}

export interface IncidentHistory {
  id: number;
  incident_id: number;
  action: 'assigned' | 'status_changed' | 'note_added';
  old_status?: string;
  new_status?: string;
  old_assigned_to?: number;
  new_assigned_to?: number;
  note?: string;
  performed_by: number;
  created_at: Date;
}

export interface IncidentNote {
  id: number;
  incident_id: number;
  note: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

// ==================== Technician Types ====================
export interface Technician {
  id: number;
  admin_id: number;
  department?: string;
  phone?: string;
  area_zone?: any; // PostGIS Polygon type
  avg_resolution_time?: number;
  completed_incidents: number;
  rating: number;
  created_at: Date;
}

// ==================== Notification Types ====================
export interface Notification {
  id: number;
  user_id: number;
  incident_id?: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  action_url?: string;
  created_at: Date;
  read_at?: Date;
}

// ==================== API Response Types ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Query Filters ====================
export interface IncidentFilters {
  search?: string;
  status?: IncidentStatus;
  priority?: IncidentPriority;
  category_id?: number;
  user_id?: number;
  assigned_to?: number;
  startDate?: Date;
  endDate?: Date;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
