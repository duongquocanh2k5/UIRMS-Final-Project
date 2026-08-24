import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const DEMO_EMAIL = 'demo@uirms.com';
  const DEMO_PASSWORD = 'Demo123!';

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Lỗi đăng nhập', err.message || 'Có lỗi xảy ra');
    }
  };

  const handleQuickLogin = async () => {
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err: any) {
      Alert.alert('Lỗi đăng nhập nhanh', err.message || 'Có lỗi xảy ra');
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
      document.title = 'UIRMS - ĐĂNG NHẬP';
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UIRMS - ĐĂNG NHẬP</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity onPress={() => {
        try {
          navigation.navigate('ForgotPassword');
        } catch (e) {
          const parent = (navigation as any).getParent && (navigation as any).getParent();
          if (parent && typeof parent.navigate === 'function') parent.navigate('ForgotPassword');
        }
      }}>
        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
      </TouchableOpacity>
      <View style={styles.buttonWrapper}>
        <Button title="Đăng nhập" onPress={handleLogin} />
      </View>
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerButtonText}>Đăng ký</Text>
      </TouchableOpacity>
      <Text style={styles.demoInfo}>Tài khoản demo: demo@uirms.com / Demo123!</Text>
      <TouchableOpacity style={styles.demoButton} onPress={handleQuickLogin}>
        <Text style={styles.demoButtonText}>Đăng nhập nhanh</Text>
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
  demoInfo: {
    marginTop: 16,
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 14,
  },
  demoButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  demoButtonText: {
    color: '#fff',
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
