export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AdminLoginData {
    token: string;
    user: { id: number; email: string; username: string; full_name: string; role: string };
}

export type AdminRole = 'super_admin' | 'manager' | 'technician';

export interface AdminIncident {
    id: number;
    user_id?: number;
    title: string;
    description?: string;
    location_name?: string;
    category_id: number;
    category_name?: string;
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigned_to?: number | null;
    assigned_technician?: string;
    ai_confidence?: number | string | null;
    ai_suggested_category?: number | null;
    ai_suggested_category_name?: string | null;
    is_duplicate?: boolean;
    duplicate_of?: number | null;
    duplicate_of_title?: string | null;
    nearby_incident_count?: number;
    images?: AdminIncidentImage[];
    created_at: string;
    updated_at: string;
    latitude?: number;
    longitude?: number;
    image_urls?: string[];
}

export interface AdminIncidentImage {
    id: number;
    image_url: string;
    is_before: boolean;
    created_at: string;
}

export interface AdminIncidentHistory {
    id: number;
    incident_id: number;
    action: 'assigned' | 'status_changed' | 'note_added';
    old_status: string | null;
    new_status: string | null;
    old_assigned_to: number | null;
    new_assigned_to: number | null;
    note: string | null;
    performed_by: number;
    performed_by_name: string;
    created_at: string;
}

export interface AdminIncidentNote {
    id: number;
    incident_id: number;
    note: string;
    created_by: number;
    created_by_name?: string;
    created_at: string;
}

export interface AssignableAdmin {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    is_online: boolean;
}

export interface AdminStats {
    totalIncidents: number;
    newIncidents: number;
    openIncidents: number;
    inProgressIncidents: number;
    completedIncidents: number;
    urgentIncidents: number;
    highPriorityCount: number;
}

export interface HeatmapPoint {
    lat: number;
    lng: number;
    count: number;
}

export interface StatsRange {
    from: string;
    to: string;
}

export interface StatsTrendPoint {
    date: string;
    received: number;
    completed: number;
}

export interface StatsOverview {
    avgProcessingDays: number;
    avgProcessingDaysChange: number;
    onTimeRate: number;
    onTimeRateChange: number;
    rejectionRate: number;
    rejectionRateChange: number;
    trend: StatsTrendPoint[];
}

export interface DistrictStats {
    district: string;
    total: number;
}

export interface CategoryMonthlyStats {
    month: string;
    category: string;
    total: number;
}

export type StaffRole = 'technician' | 'manager';

export interface StaffProfile {
    id: number;
    name: string;
    role: StaffRole;
    department: string | null;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
}

export interface StaffListItem extends StaffProfile {
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
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'assigned' | 'in_progress';
    created_at: string;
}

export interface StaffDetail extends StaffProfile {
    username: string;
    email: string;
    last_login: string | null;
    created_at: string;
    updated_at: string;
    activeIncidents: StaffActiveIncident[];
}

export interface StaffCreateResult extends StaffProfile {
    username: string;
    email: string;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface StaffStatsSummary {
    totalStaff: number;
    activeStaff: number;
    busiestDepartment: {
        name: string;
        activeCount: number;
    };
}

export interface CreateStaffPayload {
    name: string;
    email: string;
    phone?: string;
    department?: string;
    role: StaffRole;
    password: string;
}

export interface UpdateStaffPayload {
    name?: string;
    phone?: string | null;
    department?: string | null;
    is_active?: boolean;
}

export interface AdminProfile {
    id: number;
    username: string;
    email: string;
    name: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface UpdateAdminProfilePayload {
    name?: string;
    phone?: string | null;
    avatar_url?: string | null;
}

export interface AdminCategory {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    icon_url: string | null;
    color_code: string | null;
    severity_weight: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    reportCount: number;
}

export interface CategoryPayload {
    name: string;
    icon: string | null;
    color: string | null;
}

export interface AdminDepartment {
    id: number;
    name: string;
    area: string | null;
    lead_admin_id: number | null;
    leadName: string | null;
    staffCount: number;
    created_at: string;
}

export interface DepartmentPayload {
    name: string;
    area: string | null;
    lead_admin_id: number | null;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const apiOrigin = API_BASE_URL.replace(/\/api$/, '');

function normalizeImages<T extends { image_urls?: string[] }>(item: T) {
    return item.image_urls ? { ...item, image_urls: item.image_urls.map((url) => url.startsWith('http') ? url : `${apiOrigin}${url}`) } : item;
}

function normalizeIncident(item: AdminIncident): AdminIncident {
    const normalized = normalizeImages(item);
    return {
        ...normalized,
        images: item.images?.map((image) => ({
            ...image,
            image_url: image.image_url.startsWith('http') ? image.image_url : `${apiOrigin}${image.image_url}`,
        })),
    };
}

function normalizeStaffAvatar<T extends { avatar_url: string | null }>(item: T): T {
    if (!item.avatar_url || item.avatar_url.startsWith('http')) return item;
    return { ...item, avatar_url: `${apiOrigin}/${item.avatar_url.replace(/^\/+/, '')}` };
}

async function getAllStaff(): Promise<StaffListItem[]> {
    const limit = 100;
    const firstPage = await request<PaginatedResponse<StaffListItem>>(`/staff${queryString({ page: 1, limit })}`);
    const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
            request<PaginatedResponse<StaffListItem>>(`/staff${queryString({ page: index + 2, limit })}`)
        )
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const body = await response.json().catch(() => null);
    if (response.status === 401 && ['/admin/', '/stats/', '/staff', '/admins/', '/categories', '/departments'].some((prefix) => path.startsWith(prefix))) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.dispatchEvent(new Event('admin:unauthorized'));
    }
    if (!response.ok) throw new Error(body?.error || `API request failed (${response.status})`);
    return body as T;
}

function queryString(params: Record<string, string | number | undefined>) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

export const adminApi = {
    adminLogin: (emailOrUsername: string, password: string, role: AdminRole) => request<ApiResponse<AdminLoginData>>('/auth/admin-login', { method: 'POST', body: JSON.stringify({ emailOrUsername, password, role }) }),
    getHealth: () => request<{ status: string; timestamp: string }>('/health'),
    getDashboardStats: () => request<ApiResponse<AdminStats>>('/admin/dashboard/stats'),
    getIncidents: (page = 1, limit = 10, status?: string, priority?: string, categoryId?: number, search?: string, fromDate?: string, toDate?: string) => request<PaginatedResponse<AdminIncident>>(`/admin/incidents${queryString({ page, limit, status, priority, category_id: categoryId, search, from_date: fromDate, to_date: toDate })}`),
    getIncident: async (incidentId: number) => { const response = await request<ApiResponse<AdminIncident>>(`/admin/incidents/${incidentId}`); return { ...response, data: normalizeIncident(response.data) }; },
    getAssignableStaff: () => request<ApiResponse<AssignableAdmin[]>>('/admin/staff'),
    assignIncident: (incidentId: number, payload: { assigned_technician?: string; assigned_to?: number | null; priority?: string }) => request<ApiResponse<unknown>>(`/admin/incidents/${incidentId}/assign`, { method: 'POST', body: JSON.stringify(payload) }),
    updateIncidentStatus: (incidentId: number, status: string, rejectionReason?: string) => request<ApiResponse<unknown>>(`/admin/incidents/${incidentId}/status`, { method: 'PATCH', body: JSON.stringify({ status, ...(rejectionReason ? { rejection_reason: rejectionReason } : {}) }) }),
    uploadIncidentAfterImage: (incidentId: number, file: File) => { const formData = new FormData(); formData.append('image', file); return request<ApiResponse<AdminIncidentImage>>(`/admin/incidents/${incidentId}/images/after`, { method: 'POST', body: formData }); },
    getIncidentHistory: (incidentId: number) => request<ApiResponse<AdminIncidentHistory[]>>(`/admin/incidents/${incidentId}/history`),
    getIncidentNotes: (incidentId: number) => request<ApiResponse<AdminIncidentNote[]>>(`/admin/incidents/${incidentId}/notes`),
    addIncidentNote: (incidentId: number, note: string) => request<ApiResponse<AdminIncidentNote>>(`/admin/incidents/${incidentId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
    sendAdminNotification: (payload: { user_id: number; incident_id: number; title: string; message: string; type: 'status_update' | 'new_reply' | 'system' | 'reminder' }) => request<ApiResponse<unknown>>('/admin/notifications', { method: 'POST', body: JSON.stringify(payload) }),
    getAnalytics: (period: 'day' | 'week' | 'month' = 'week') => request<ApiResponse<unknown>>(`/admin/analytics/incidents?period=${period}`),
    getHeatmap: () => request<ApiResponse<HeatmapPoint[]>>('/admin/incidents/heatmap'),
    getActiveTechnicians: () => request<ApiResponse<unknown>>('/admin/technicians/active'),
    getTechnicianWorkload: () => request<ApiResponse<unknown>>('/admin/technicians/workload'),
    getPerformanceMetrics: () => request<ApiResponse<unknown>>('/admin/metrics/performance'),
    getStatsOverview: (range: StatsRange) => request<StatsOverview>(`/stats/overview${queryString({ from: range.from, to: range.to })}`),
    getStatsByDistrict: (range: StatsRange) => request<DistrictStats[]>(`/stats/by-district${queryString({ from: range.from, to: range.to })}`),
    getStatsByCategoryMonthly: (range: StatsRange) => request<CategoryMonthlyStats[]>(`/stats/by-category-monthly${queryString({ from: range.from, to: range.to })}`),
    getStaff: async (page = 1, limit = 10) => {
        const response = await request<PaginatedResponse<StaffListItem>>(`/staff${queryString({ page, limit })}`);
        return { ...response, data: response.data.map(normalizeStaffAvatar) };
    },
    getStaffStatsSummary: () => request<ApiResponse<StaffStatsSummary>>('/staff/stats/summary'),
    getStaffById: async (staffId: number) => {
        const response = await request<ApiResponse<StaffDetail>>(`/staff/${staffId}`);
        return { ...response, data: normalizeStaffAvatar(response.data) };
    },
    createStaff: (payload: CreateStaffPayload) => request<ApiResponse<StaffCreateResult>>('/staff', { method: 'POST', body: JSON.stringify(payload) }),
    updateStaff: (staffId: number, payload: UpdateStaffPayload) => request<ApiResponse<StaffCreateResult>>(`/staff/${staffId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    getAdminProfile: async () => {
        const response = await request<ApiResponse<AdminProfile>>('/admins/me');
        return { ...response, data: normalizeStaffAvatar(response.data) };
    },
    updateAdminProfile: async (payload: UpdateAdminProfilePayload) => {
        const response = await request<ApiResponse<AdminProfile>>('/admins/me', { method: 'PATCH', body: JSON.stringify(payload) });
        return { ...response, data: normalizeStaffAvatar(response.data) };
    },
    changeAdminPassword: (payload: { currentPassword: string; newPassword: string }) => request<ApiResponse<{ message: string }>>('/admins/me/password', { method: 'PATCH', body: JSON.stringify(payload) }),
    updatePresence: () => request<ApiResponse<{ success: boolean }>>('/admins/me/presence', { method: 'POST' }),
    getCategories: () => request<ApiResponse<AdminCategory[]>>('/categories'),
    createCategory: (payload: CategoryPayload) => request<ApiResponse<AdminCategory>>('/categories', { method: 'POST', body: JSON.stringify(payload) }),
    updateCategory: (id: number, payload: Partial<CategoryPayload>) => request<ApiResponse<AdminCategory>>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteCategory: (id: number) => request<ApiResponse<{ id: number }>>(`/categories/${id}`, { method: 'DELETE' }),
    getDepartments: () => request<ApiResponse<AdminDepartment[]>>('/departments'),
    getAllStaff,
    createDepartment: (payload: DepartmentPayload) => request<ApiResponse<AdminDepartment>>('/departments', { method: 'POST', body: JSON.stringify(payload) }),
    updateDepartment: (id: number, payload: Partial<DepartmentPayload>) => request<ApiResponse<AdminDepartment>>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteDepartment: (id: number) => request<ApiResponse<{ id: number }>>(`/departments/${id}`, { method: 'DELETE' }),
};

export { API_BASE_URL };
