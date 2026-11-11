import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

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

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert(t('Lỗi đăng nhập', 'Login failed'), err.message || t('Có lỗi xảy ra', 'Something went wrong'));
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
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder={t('Mật khẩu', 'Password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? t('Ẩn mật khẩu', 'Hide password') : t('Hiển thị mật khẩu', 'Show password')}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => {
        try {
          navigation.navigate('ForgotPassword');
        } catch (e) {
          const parent = (navigation as any).getParent && (navigation as any).getParent();
          if (parent && typeof parent.navigate === 'function') parent.navigate('ForgotPassword');
        }
      }}>
        <Text style={styles.forgotText}>{t('Quên mật khẩu?', 'Forgot password?')}</Text>
      </TouchableOpacity>
      <View style={styles.buttonWrapper}>
        <Button title={t('Đăng nhập', 'Log in')} onPress={handleLogin} />
      </View>
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
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
