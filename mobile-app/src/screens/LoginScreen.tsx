import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { apiClient } from '../services/api';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowRequest, setIsSlowRequest] = useState(false);
  const [serverWarming, setServerWarming] = useState(true);

  // Phương án 2: Tự động "đánh thức" (Pre-warm) máy chủ Render ngay khi mở màn hình Đăng nhập
  useEffect(() => {
    let active = true;
    setServerWarming(true);
    void apiClient.warmupServer().finally(() => {
      if (active) setServerWarming(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert(
        t('Thiếu thông tin', 'Missing information'),
        t('Vui lòng nhập đầy đủ Email/Số điện thoại và mật khẩu.', 'Please enter both your email/phone and password.')
      );
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setIsSlowRequest(false);

    const slowTimer = setTimeout(() => {
      setIsSlowRequest(true);
    }, 4000);

    try {
      await login(trimmedEmail, password);
    } catch (err: any) {
      const serverError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err?.code === 'ECONNABORTED'
          ? t(
              'Máy chủ đang khởi động lại mất nhiều thời gian hơn dự kiến. Vui lòng bấm Đăng nhập lại một lần nữa.',
              'The server took longer than expected to wake up. Please tap Log in once more.'
            )
          : err?.message);
      Alert.alert(
        t('Lỗi đăng nhập', 'Login failed'),
        serverError || t('Có lỗi xảy ra, vui lòng thử lại.', 'Something went wrong, please try again.')
      );
    } finally {
      clearTimeout(slowTimer);
      setIsSubmitting(false);
      setIsSlowRequest(false);
    }
  };

  const handleRegister = () => {
    // Try to navigate directly to the Register screen. If the current
    // navigator doesn't resolve the route (nested navigators), fall back
    // to navigating via the parent (Auth) stack.
    try {
      // preferred: same-stack navigation
      navigation.navigate('Register');
    } catch (e) {
      // fallback for nested/parent navigators
      const parent = (navigation as any).getParent && (navigation as any).getParent();
      if (parent && typeof parent.navigate === 'function') {
        parent.navigate('Register');
      } else {
        console.log('Navigation to Register failed', e);
      }
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = t('UIRMS - ĐĂNG NHẬP', 'UIRMS - LOG IN');
    }
  }, [language, t]);

  return (
    <View style={styles.container}>
      <View style={styles.languageButton}><LanguageToggle /></View>
      <Text style={styles.title}>{t('UIRMS - ĐĂNG NHẬP', 'UIRMS - LOG IN')}</Text>
      <TextInput
        style={[styles.input, isSubmitting && styles.inputDisabled]}
        placeholder={t('Email hoặc số điện thoại', 'Email or phone number')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isSubmitting}
      />
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput, isSubmitting && styles.inputDisabled]}
          placeholder={t('Mật khẩu', 'Password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isSubmitting}
          onSubmitEditing={() => void handleLogin()}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((visible) => !visible)}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? t('Ẩn mật khẩu', 'Hide password') : t('Hiển thị mật khẩu', 'Show password')}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        disabled={isSubmitting}
        onPress={() => {
          try {
            navigation.navigate('ForgotPassword');
          } catch (e) {
            const parent = (navigation as any).getParent && (navigation as any).getParent();
            if (parent && typeof parent.navigate === 'function') parent.navigate('ForgotPassword');
          }
        }}
      >
        <Text style={styles.forgotText}>{t('Quên mật khẩu?', 'Forgot password?')}</Text>
      </TouchableOpacity>
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
          onPress={() => void handleLogin()}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <View style={styles.loginButtonLoadingRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.loginButtonText}>
                {isSlowRequest
                  ? t('Đang đánh thức máy chủ...', 'Waking up server...')
                  : t('Đang đăng nhập...', 'Signing in...')}
              </Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>{t('Đăng nhập', 'Log in')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {isSubmitting && isSlowRequest && (
        <View style={styles.ColdStartNotice}>
          <Ionicons name="cloud-outline" size={18} color="#0A9D96" style={{ marginTop: 1 }} />
          <Text style={styles.ColdStartNoticeText}>
            {t(
              'Máy chủ đám mây đang khởi động sau thời gian nghỉ (lần đầu có thể mất 15–30 giây). Vui lòng giữ màn hình trong giây lát...',
              'The cloud server is waking up from idle mode (first connection may take 15–30 seconds). Please wait a moment...'
            )}
          </Text>
        </View>
      )}

      {!isSubmitting && serverWarming && (
        <View style={styles.warmupHintRow}>
          <ActivityIndicator size="small" color="#64748b" />
          <Text style={styles.warmupHintText}>
            {t('Đang kết nối sẵn tới máy chủ...', 'Connecting to server in background...')}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={isSubmitting}>
        <Text style={styles.registerButtonText}>{t('Đăng ký', 'Create account')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
  },
  languageButton: { position: 'absolute', top: 42, right: 24, zIndex: 1 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 16,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    marginTop: 12,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  loginButtonDisabled: {
    backgroundColor: '#60a5fa',
  },
  loginButtonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  ColdStartNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: '#BCE6E1',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ColdStartNoticeText: {
    flex: 1,
    color: '#0F524F',
    fontSize: 12,
    lineHeight: 18,
  },
  warmupHintRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  warmupHintText: {
    color: '#64748b',
    fontSize: 12,
  },
  registerButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  registerButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 16,
  },
  forgotText: {
    color: '#2563eb',
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 12,
  },
});
