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
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (phone: string, email: string, password: string, fullName: string, identityNumber: string) => Promise<void>;
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
      console.log('=== Khởi động Auth Bootstrap ===');

      if (Platform.OS === 'web') {
        setIsLoading(false);
        return;
      }

      // Khớp chuẩn Key 'authToken' từ file api.ts của bạn
      const token = await AsyncStorage.getItem('authToken');
      const savedUserData = await AsyncStorage.getItem('userData');

      if (token && savedUserData) {
        console.log('Khôi phục phiên đăng nhập từ bộ nhớ tạm...');
        setUser(JSON.parse(savedUserData));
        setIsSignedIn(true);

        // Gọi ngầm API để kiểm tra và cập nhật thông tin user mới nhất
        try {
          // api.ts đã return response.data nên data ở đây chứa trực tiếp { success, data, message }
          const res = await Promise.race([
            apiClient.getCurrentUser(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]) as any;

          if (res && res.success && res.data) {
            console.log('Token hợp lệ. Cập nhật profile.');
            setUser(res.data);
            await AsyncStorage.setItem('userData', JSON.stringify(res.data));
          }
        } catch (apiErr) {
          console.log('Không làm mới được session ngầm (Backend offline hoặc Token hết hạn):', apiErr);
        }
      } else {
        console.log('Không tìm thấy token cũ. Chuyển hướng sang Đăng nhập.');
        setIsSignedIn(false);
      }
    } catch (e) {
      console.error('Lỗi nghiêm trọng trong bootstrapAsync:', e);
      setIsSignedIn(false);
    } finally {
      console.log('=== Hoàn thành Auth Bootstrap -> Tắt Loading ===');
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
        register,
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