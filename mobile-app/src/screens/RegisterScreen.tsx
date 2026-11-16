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
import { Ionicons } from '@expo/vector-icons';
import ConditionalLoader from '../components/ui/ConditionalLoader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

type RegisterErrorCode =
  | 'fullNameRequired' | 'fullNameInvalid'
  | 'phoneRequired' | 'phoneInvalid' | 'phoneExists'
  | 'emailRequired' | 'emailInvalid' | 'emailExists'
  | 'identityNumberRequired' | 'identityNumberInvalid'
  | 'passwordRequired' | 'passwordInvalid'
  | 'confirmPasswordRequired' | 'passwordMismatch'
  | 'registrationInvalid' | 'registrationFailed';

type RegisterErrors = Partial<Record<'fullName' | 'phone' | 'email' | 'identityNumber' | 'password' | 'confirmPassword' | 'general', RegisterErrorCode>>;

const registrationFieldNames: Record<string, keyof RegisterErrors> = {
  full_name: 'fullName',
  phone: 'phone',
  email: 'email',
  identity_number: 'identityNumber',
  password: 'password',
};

export default function RegisterScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  useEffect(() => {
    console.log('RegisterScreen mounted');
    if (typeof document !== 'undefined') {
      document.title = t('UIRMS - ĐĂNG KÝ', 'UIRMS - REGISTER');
    }
  }, [language, t]);

  const { register } = useAuth();
  const errorMessages: Record<RegisterErrorCode, string> = {
    fullNameRequired: t('Họ và tên là bắt buộc', 'Full name is required'),
    fullNameInvalid: t('Họ và tên phải có ít nhất 2 ký tự', 'Full name must be at least 2 characters'),
    phoneRequired: t('Số điện thoại là bắt buộc', 'Phone number is required'),
    phoneInvalid: t('Số điện thoại không đúng định dạng Việt Nam', 'Enter a valid phone number'),
    phoneExists: t('Số điện thoại đã được đăng ký', 'This phone number is already registered'),
    emailRequired: t('Email là bắt buộc', 'Email is required'),
    emailInvalid: t('Email không đúng định dạng', 'Enter a valid email address'),
    emailExists: t('Email đã được đăng ký', 'This email is already registered'),
    identityNumberRequired: t('CMND/CCCD là bắt buộc', 'National ID is required'),
    identityNumberInvalid: t('CMND/CCCD phải gồm 9 hoặc 12 chữ số', 'National ID must contain 9 or 12 digits'),
    passwordRequired: t('Mật khẩu là bắt buộc', 'Password is required'),
    passwordInvalid: t('Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt (!@#$%^&*)', 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character (!@#$%^&*)'),
    confirmPasswordRequired: t('Xác nhận mật khẩu là bắt buộc', 'Please confirm your password'),
    passwordMismatch: t('Mật khẩu không khớp', 'Passwords do not match'),
    registrationInvalid: t('Thông tin đăng ký không hợp lệ', 'Registration details are invalid'),
    registrationFailed: t('Đã xảy ra lỗi', 'Something went wrong'),
  };
  const getErrorMessage = (code?: RegisterErrorCode) => code ? errorMessages[code] : '';
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const handleRegister = async () => {
    // clear previous errors
    setErrors({});

    const newErrors: RegisterErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'fullNameRequired';
    else if (fullName.trim().length < 2) newErrors.fullName = 'fullNameInvalid';

    if (!phone) newErrors.phone = 'phoneRequired';
    else if (!/^(0|\+84)(1|2|3|4|5|6|7|8|9)[0-9]{8}$/.test(phone)) {
      newErrors.phone = 'phoneInvalid';
    }

    if (!email) newErrors.email = 'emailRequired';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'emailInvalid';

    if (!identityNumber) newErrors.identityNumber = 'identityNumberRequired';
    else if (!/^(?:\d{9}|\d{12})$/.test(identityNumber)) {
      newErrors.identityNumber = 'identityNumberInvalid';
    }

    if (!password) newErrors.password = 'passwordRequired';
    else if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/.test(password)) {
      newErrors.password = 'passwordInvalid';
    }

    if (!confirmPassword) newErrors.confirmPassword = 'confirmPasswordRequired';

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'passwordMismatch';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await register(phone, email, password, fullName, identityNumber);
      Alert.alert(t('Thành công', 'Success'), t('Đăng ký thành công, vui lòng đăng nhập', 'Registration successful. Please log in.'), [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      // Server-side validation errors may come in error.response.data.details
      const resp = error.response?.data;
      if (resp?.details && typeof resp.details === 'object') {
        const fieldErrors: RegisterErrors = {};
        for (const [field, message] of Object.entries(resp.details)) {
          const localField = registrationFieldNames[field];
          if (localField) {
            fieldErrors[localField] = localField === 'fullName' ? 'fullNameInvalid'
              : localField === 'phone' ? 'phoneInvalid'
                : localField === 'email' ? 'emailInvalid'
                  : localField === 'identityNumber' ? 'identityNumberInvalid'
                    : 'passwordInvalid';
          }
        }
        setErrors(Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { general: 'registrationInvalid' });
      } else if (resp?.error) {
        const msg: string = resp.error;
        if (/email/i.test(msg)) setErrors((prev) => ({ ...prev, email: /exist|already|taken|duplicate/i.test(msg) ? 'emailExists' : 'emailInvalid' }));
        else if (/phone/i.test(msg)) setErrors((prev) => ({ ...prev, phone: /exist|already|taken|duplicate/i.test(msg) ? 'phoneExists' : 'phoneInvalid' }));
        else if (/identity|cmnd|cccd/i.test(msg)) setErrors((prev) => ({ ...prev, identityNumber: 'identityNumberInvalid' }));
        else if (/password/i.test(msg)) setErrors((prev) => ({ ...prev, password: 'passwordInvalid' }));
        else setErrors((prev) => ({ ...prev, general: 'registrationInvalid' }));
      } else {
        setErrors({ general: 'registrationFailed' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* ConditionalLoader is mounted only when `loading` is true */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('Đăng Ký Tài Khoản', 'Create an Account')}</Text>
        <LanguageToggle />
      </View>
      <ConditionalLoader visible={loading} message={t('Đang xử lý...', 'Processing...')} />
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotLink}>{t('Quên mật khẩu?', 'Forgot password?')}</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Họ và tên', 'Full name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('Nhập họ và tên (VD: Nguyễn Văn A)', 'Enter your full name')}
            placeholderTextColor="#64748b"
            value={fullName}
            onChangeText={(text) => { setFullName(text); setErrors((p) => ({ ...p, fullName: undefined })); }}
            editable={!loading}
          />
          {errors.fullName ? <Text style={styles.errorText}>{getErrorMessage(errors.fullName)}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Số điện thoại', 'Phone number')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('Nhập số điện thoại Việt Nam (VD: 0901234567)', 'Enter phone number (e.g., 0901234567)')}
            placeholderTextColor="#64748b"
            value={phone}
            onChangeText={(text) => { setPhone(text); setErrors((p) => ({ ...p, phone: undefined })); }}
            keyboardType="phone-pad"
            editable={!loading}
          />
          {errors.phone ? <Text style={styles.errorText}>{getErrorMessage(errors.phone)}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Địa chỉ Email', 'Email address')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('Nhập email của bạn', 'Enter your email address')}
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors((p) => ({ ...p, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {errors.email ? <Text style={styles.errorText}>{getErrorMessage(errors.email)}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Số CMND/CCCD (9 hoặc 12 số)', 'National ID / CCCD (9 or 12 digits)')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('Nhập 12 chữ số CCCD hoặc 9 số CMND', 'Enter 12-digit CCCD or 9-digit ID')}
            placeholderTextColor="#64748b"
            value={identityNumber}
            onChangeText={(text) => { setIdentityNumber(text); setErrors((p) => ({ ...p, identityNumber: undefined })); }}
            keyboardType="numeric"
            maxLength={12}
            editable={!loading}
          />
          {errors.identityNumber ? <Text style={styles.errorText}>{getErrorMessage(errors.identityNumber)}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Mật khẩu', 'Password')}</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('Ít nhất 8 ký tự, gồm chữ hoa, số & ký tự đặc biệt', 'Min 8 chars, uppercase, number & special char')}
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors((p) => ({ ...p, password: undefined })); }}
              secureTextEntry={!showPassword}
              editable={!loading}
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
          {errors.password ? <Text style={styles.errorText}>{getErrorMessage(errors.password)}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('Xác nhận mật khẩu', 'Confirm password')}</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('Nhập lại mật khẩu phía trên', 'Re-enter your password')}
              placeholderTextColor="#64748b"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? t('Ẩn mật khẩu xác nhận', 'Hide password confirmation') : t('Hiển thị mật khẩu xác nhận', 'Show password confirmation')}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{getErrorMessage(errors.confirmPassword)}</Text> : null}
        </View>

        {errors.general ? <Text style={styles.errorText}>{getErrorMessage(errors.general)}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('Đăng Ký', 'Register')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>{t('Đã có tài khoản? Đăng nhập', 'Already have an account? Log in')}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  form: {
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#0f172a',
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
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
  },
  forgotLink: {
    color: '#2563eb',
    textAlign: 'right',
    marginBottom: 12,
    marginTop: -6,
  },
});
