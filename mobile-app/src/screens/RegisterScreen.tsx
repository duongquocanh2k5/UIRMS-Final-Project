/**
 * Register Screen
 * User registration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import ConditionalLoader from '../components/ui/ConditionalLoader';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  useEffect(() => {
    console.log('RegisterScreen mounted');
    if (typeof document !== 'undefined') {
      document.title = 'UIRMS - ĐĂNG KÝ';
    }
  }, []);

  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    email?: string;
    identityNumber?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const handleRegister = async () => {
    // clear previous errors
    setErrors({});

    const newErrors: any = {};
    if (!fullName) newErrors.fullName = 'Họ và tên là bắt buộc';
    if (!phone) newErrors.phone = 'Số điện thoại là bắt buộc';
    if (!email) newErrors.email = 'Email là bắt buộc';
    if (!identityNumber) newErrors.identityNumber = 'CMND/CCCD là bắt buộc';
    if (!password) newErrors.password = 'Mật khẩu là bắt buộc';
    if (!confirmPassword) newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await register(phone, email, password, fullName, identityNumber);
      Alert.alert('Thành công', 'Đăng ký thành công, vui lòng đăng nhập', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      // Server-side validation errors may come in error.response.data.details
      const resp = error.response?.data;
      if (resp?.details && typeof resp.details === 'object') {
        setErrors((prev) => ({ ...prev, ...resp.details }));
      } else if (resp?.error) {
        const msg: string = resp.error;
        if (/email/i.test(msg)) setErrors((prev) => ({ ...prev, email: msg }));
        else if (/phone/i.test(msg)) setErrors((prev) => ({ ...prev, phone: msg }));
        else if (/identity|cmnd|cccd/i.test(msg)) setErrors((prev) => ({ ...prev, identityNumber: msg }));
        else setErrors((prev) => ({ ...prev, general: msg }));
      } else {
        setErrors({ general: error.message || 'Đã xảy ra lỗi' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* ConditionalLoader is mounted only when `loading` is true */}
      <ConditionalLoader visible={loading} message="Đang xử lý..." />
      <Text style={styles.title}>Đăng Ký Tài Khoản</Text>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          value={fullName}
          onChangeText={(text) => { setFullName(text); setErrors((p) => ({ ...p, fullName: undefined })); }}
          editable={!loading}
        />
        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!loading}
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!loading}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Số CMND/CCCD"
          value={identityNumber}
          onChangeText={setIdentityNumber}
          keyboardType="numeric"
          editable={!loading}
        />
        {errors.identityNumber ? <Text style={styles.errorText}>{errors.identityNumber}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />
        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

        {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng Ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 24,
    marginTop: 20,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#dc2626',
    marginTop: 6,
    marginBottom: -6,
  },
  forgotLink: {
    color: '#2563eb',
    textAlign: 'right',
    marginBottom: 12,
    marginTop: -6,
  },
});
