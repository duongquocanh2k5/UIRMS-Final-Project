/**
 * Auth Context - Đồng bộ chuẩn 100% với ApiClient class
 * Manages authentication state and handles session restoration
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  is_verified?: boolean;
  avatar_url?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithVNeID: (identityNumber: string, fullName?: string, phone?: string) => Promise<void>;
  register: (phone: string, email: string, password: string, fullName: string, identityNumber: string) => Promise<void>;
  updateUserLocal: (userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      // Luôn làm sạch phiên cũ khi khởi động ứng dụng để mỗi thiết bị / mỗi lần mở app
      // đều bắt đầu độc lập tại màn hình Đăng nhập (LoginScreen), tránh tự động đăng nhập tài khoản cũ.
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setUser(null);
      setIsSignedIn(false);
    } catch (e) {
      console.error('Lỗi khi khởi tạo phiên đăng nhập mới:', e);
      setUser(null);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // api.ts đã trích xuất sẵn response.data
    const res = await apiClient.login(email, password);

    if (res && res.success && res.data) {
      const userData = res.data.user;

      // Lưu thông tin user cục bộ (Token đã được hàm login trong api.ts tự động lưu với key 'authToken')
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
    } else {
      throw new Error(res?.message || 'Đăng nhập thất bại');
    }
  };

  const loginWithVNeID = async (identityNumber: string, fullName?: string, phone?: string) => {
    const res = await apiClient.loginWithVNeID(identityNumber, fullName, phone);
    if (res && res.success && res.data) {
      const userData = res.data.user;
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsSignedIn(true);
    } else {
      throw new Error(res?.message || 'Đăng nhập VNeID thất bại');
    }
  };

  const register = async (
    phone: string,
    email: string,
    password: string,
    fullName: string,
    identityNumber: string
  ) => {
    const res = await apiClient.register(phone, email, password, fullName, identityNumber);
    if (!res || !res.success) {
      throw new Error(res?.message || 'Đăng ký thất bại');
    }
  };

  const updateUserLocal = async (userData: Partial<User>) => {
    if (!user) {
      throw new Error('No signed-in user to update');
    }

    const updatedUser = { ...user, ...userData };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      await apiClient.logout().catch(() => { });
    } catch (e) {
      console.log('Lỗi khi gọi hàm logout api');
    } finally {
      // Đảm bảo xóa sạch bộ nhớ tạm phía Mobile
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsSignedIn(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn,
        login,
        loginWithVNeID,
        register,
        updateUserLocal,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}