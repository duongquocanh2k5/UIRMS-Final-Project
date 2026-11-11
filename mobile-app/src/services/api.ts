/**
 * API Client Service
 * Handles all HTTP requests to the backend
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getAPIBaseURL = () => {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.206:5000/api';
};

const API_BASE_URL = getAPIBaseURL();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const resolveImageUrl = (imageUrl: string) =>
  imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;

const normalizeIncidentImages = (data: any) => {
  if (data?.image_urls) data.image_urls = data.image_urls.map(resolveImageUrl);
  if (data?.images) {
    data.images = data.images.map((image: any) => ({
      ...image,
      image_url: resolveImageUrl(image.image_url),
    }));
  }
  return data;
};

export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIChatResponse {
  reply: string;
  suggestedCategoryId?: number | null;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // ==================== Auth ====================
  async register(
    phone: string,
    email: string,
    password: string,
    fullName: string,
    identityNumber: string
  ) {
    const response = await this.client.post('/auth/register', {
      phone,
      email,
      identity_number: identityNumber,
      password,
      full_name: fullName,
    });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(email: string, resetCode: string, newPassword: string) {
    const response = await this.client.post('/auth/reset-password', {
      email,
      resetCode,
      newPassword,
    });
    return response.data;
  }

  async sendVerificationEmail() {
    const response = await this.client.post('/auth/send-verification-email', {});
    return response.data;
  }

  async verifyEmail(verificationCode: string) {
    const response = await this.client.post('/auth/verify-email', { verificationCode });
    return response.data;
  }

  async getCategories(): Promise<{
    success: boolean;
    data: Array<{ id: number; name: string; icon: string | null }>;
  }> {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async login(emailOrPhone: string, password: string) {
    const response = await this.client.post('/auth/login', { emailOrPhone, password });
    if (response.data.data?.token) {
      await AsyncStorage.setItem('authToken', response.data.data.token);
    }
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: { full_name: string; phone?: string; bio?: string }) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.patch('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async logout() {
    await AsyncStorage.removeItem('authToken');
  }

  // ==================== Incidents ====================
  async sendAIChatMessage(message: string, history: AIChatMessage[], language: 'vi' | 'en' = 'vi') {
    const response = await this.client.post<{ success: boolean; data: AIChatResponse }>(
      '/incidents/ai-chat',
      { message, history, language },
      { timeout: 25000 }
    );
    return response.data;
  }

  async createIncident(data: {
    category_id: number;
    title: string;
    description?: string;
    location_name?: string;
    district?: string;
    latitude: number;
    longitude: number;
    priority?: 'low' | 'medium' | 'high';
  }) {
    const response = await this.client.post('/incidents', data);
    return response.data;
  }

  async getIncidents(page = 1, limit = 20, status?: string, category_id?: number) {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (category_id) params.category_id = category_id;

    const response = await this.client.get('/incidents', { params });
    return response.data;
  }

  async getUserIncidents(userId: number, page = 1, limit = 20) {
    const response = await this.client.get(`/incidents/user/${userId}`, {
      params: { page, limit },
    });
    response.data.data = response.data.data?.map(normalizeIncidentImages) || [];
    return response.data;
  }

  async getIncidentById(id: number) {
    const response = await this.client.get(`/incidents/${id}`);
    response.data.data = normalizeIncidentImages(response.data.data);
    return response.data;
  }

  async uploadIncidentImage(incidentId: number, imageUri: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: `incident-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    const response = await this.client.post(`/incidents/${incidentId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getNearbyIncidents(latitude: number, longitude: number, radius = 5000) {
    const response = await this.client.get('/incidents/search/nearby', {
      params: { latitude, longitude, radius },
    });
    return response.data;
  }

  async completeIncident(id: number) {
    const response = await this.client.patch(`/incidents/${id}/complete`, {});
    return response.data;
  }

  async updateIncident(
    id: number,
    data: {
      title?: string;
      description?: string;
      location_name?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      category_id?: number;
    }
  ) {
    const response = await this.client.put(`/incidents/${id}`, data);
    return response.data;
  }

  async submitIncidentFeedback(id: number, rating: number, feedback?: string) {
    const response = await this.client.post(`/incidents/${id}/feedback`, {
      rating,
      feedback,
    });
    return response.data;
  }

  async deleteIncident(id: number) {
    const response = await this.client.delete(`/incidents/${id}`);
    return response.data;
  }

  // ==================== Notifications ====================
  async getNotifications(page = 1, limit = 20) {
    const response = await this.client.get('/notifications', {
      params: { page, limit },
    });
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await this.client.get('/notifications/preferences');
    return response.data;
  }

  async updateNotificationPreferences(prefs: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
  }) {
    const response = await this.client.patch('/notifications/preferences', prefs);
    return response.data;
  }

  async markNotificationAsRead(id: number) {
    const response = await this.client.patch(`/notifications/${id}/read`, {});
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.patch('/notifications/read-all', {});
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.client.get('/notifications/unread/count');
    return response.data;
  }
}

export const apiClient = new ApiClient();