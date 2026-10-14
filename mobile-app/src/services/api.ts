/**
 * API Client Service
 * Handles all HTTP requests to the backend
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get API base URL based on platform and environment
const getAPIBaseURL = () => {
  // Expo web runs on a different port than the API during development.
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
  }
  // For mobile (iOS/Android), use environment variable or default
  // During development, update this to your machine's IP (e.g., http://192.168.1.100:5000/api)
  return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.206:5000/api';
};

const API_BASE_URL = getAPIBaseURL();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const resolveImageUrl = (imageUrl: string) => imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
const normalizeIncidentImages = (data: any) => {
  if (data?.image_urls) data.image_urls = data.image_urls.map(resolveImageUrl);
  return data;
};

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

    // Request interceptor to add auth token
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
  async register(phone: string, email: string, password: string, fullName: string, identityNumber: string) {
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
    const response = await this.client.post('/auth/reset-password', { email, resetCode, newPassword });
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

  async logout() {
    await AsyncStorage.removeItem('authToken');
  }

  // ==================== Incidents ====================
  async createIncident(data: {
    category_id: number;
    title: string;
    description?: string;
    location_name?: string;
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
    formData.append('image', { uri: imageUri, name: `incident-${Date.now()}.jpg`, type: 'image/jpeg' } as any);
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

  async markNotificationAsRead(id: number) {
    const response = await this.client.patch(`/notifications/${id}/read`, {});
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.client.get('/notifications/unread/count');
    return response.data;
  }
}

export const apiClient = new ApiClient();
