import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { apiClient } from '../services/api';
import { decodeVietnameseCCCD, openOfficialVNeIDApp } from '../utils/vneid';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

interface EkycExtractedInfo {
  document_type: 'CCCD_CHIP' | 'VNEID_APP' | 'INVALID';
  identity_number: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  place_of_residence?: string;
  province_name?: string;
}

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const { login, loginWithVNeID } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowRequest, setIsSlowRequest] = useState(false);
  const [serverWarming, setServerWarming] = useState(true);
  const [vneidModalVisible, setVneidModalVisible] = useState(false);
  const [vneidCccd, setVneidCccd] = useState('');
  const [vneidName, setVneidName] = useState('');
  const [vneidPhone, setVneidPhone] = useState('');
  const [vneidLoading, setVneidLoading] = useState(false);
  const [scanningEkyc, setScanningEkyc] = useState(false);
  const [ekycResult, setEkycResult] = useState<EkycExtractedInfo | null>(null);

  const decodedCccd = useMemo(() => {
    if (vneidCccd.trim().length === 0) return null;
    return decodeVietnameseCCCD(vneidCccd.trim());
  }, [vneidCccd]);

  const handleScanVNeIDDocument = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t('Cần cấp quyền', 'Permission required'),
          useCamera
            ? t('Vui lòng cấp quyền Camera để chụp thẻ CCCD gắn chip.', 'Allow camera access to scan your Citizen ID card.')
            : t('Vui lòng cấp quyền Thư viện ảnh để chọn ảnh CCCD / màn hình VNeID.', 'Allow photo library access to select your CCCD or VNeID image.')
        );
        return;
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) {
        return;
      }

      const asset = pickerResult.assets[0];
      setScanningEkyc(true);
      const response = await apiClient.scanVNeIDDocument(
        asset.base64!,
        asset.mimeType || 'image/jpeg'
      );

      if (response?.success && response?.data) {
        const info = response.data as EkycExtractedInfo;
        setVneidCccd(info.identity_number || '');
        if (info.full_name) {
          setVneidName(info.full_name);
        }
        setEkycResult(info);
      }
    } catch (err: any) {
      Alert.alert(
        t('Không thể đọc thẻ CCCD / VNeID', 'eKYC Scan Failed'),
        err?.response?.data?.error ||
        err?.message ||
        t('Vui lòng chụp rõ nét mặt trước thẻ CCCD gắn chip hoặc ảnh màn hình VNeID.', 'Please take a clear photo of your CCCD front side or VNeID screen.')
      );
    } finally {
      setScanningEkyc(false);
    }
  };

  const handleVNeIDLogin = async () => {
    const cleanCccd = vneidCccd.trim();
    const check = decodeVietnameseCCCD(cleanCccd);
    if (!check.valid) {
      Alert.alert(
        t('Số CCCD không đúng chuẩn C06', 'Invalid Citizen ID (C06 Standard)'),
        (language === 'vi' ? check.errorVi : check.errorEn) ||
        t('Vui lòng nhập đúng 12 chữ số CCCD gắn chip hợp lệ.', 'Please enter a valid 12-digit Citizen ID.')
      );
      return;
    }

    const cleanName = vneidName.trim();
    if (cleanName.length < 2) {
      Alert.alert(
        t('Thiếu Họ và tên công dân', 'Missing Citizen Full Name'),
        t('Vui lòng nhập đúng Họ và tên trên thẻ CCCD (hoặc bấm Quét thẻ CCCD/VNeID phía trên).', 'Please enter your full name as shown on your CCCD (or scan your CCCD/VNeID above).')
      );
      return;
    }

    try {
      setVneidLoading(true);
      await loginWithVNeID(cleanCccd, cleanName, vneidPhone.trim() || undefined);
      setVneidModalVisible(false);
    } catch (err: any) {
      Alert.alert(
        t('Lỗi kết nối VNeID', 'VNeID Login Failed'),
        err?.response?.data?.error || err?.message || t('Không thể xác thực VNeID lúc này.', 'Unable to authenticate with VNeID right now.')
      );
    } finally {
      setVneidLoading(false);
    }
  };

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
      <Text style={styles.fieldLabel}>{t('Email hoặc Số điện thoại', 'Email or Phone Number')}</Text>
      <TextInput
        style={[styles.input, isSubmitting && styles.inputDisabled]}
        placeholder={t('Nhập email hoặc số điện thoại', 'Enter email or phone number')}
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isSubmitting}
      />
      <Text style={styles.fieldLabel}>{t('Mật khẩu', 'Password')}</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput, isSubmitting && styles.inputDisabled]}
          placeholder={t('Nhập mật khẩu của bạn', 'Enter your password')}
          placeholderTextColor="#64748b"
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

      <TouchableOpacity
        style={[styles.vneidButton, isSubmitting && styles.loginButtonDisabled]}
        onPress={() => setVneidModalVisible(true)}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        <View style={styles.vneidBadgeCircle}>
          <Ionicons name="shield-checkmark" size={16} color="#FACC15" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vneidButtonTitle}>
            {t('Đăng nhập bằng VNeID', 'Sign in with VNeID')}
          </Text>
          <Text style={styles.vneidButtonSub}>
            {t('Định danh điện tử Bộ Công an (Mức độ 2)', 'National Digital Identity (Level 2)')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FEE2E2" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={isSubmitting}>
        <Text style={styles.registerButtonText}>{t('Đăng ký', 'Create account')}</Text>
      </TouchableOpacity>

      <Modal
        visible={vneidModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVneidModalVisible(false)}
      >
        <View style={styles.vneidModalOverlay}>
          <View style={styles.vneidModalCard}>
            <View style={styles.vneidModalHeader}>
              <View style={styles.vneidHeaderRow}>
                <View style={styles.vneidHeaderIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#FACC15" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vneidModalTitle}>
                    {t('Định danh Điện tử VNeID & eKYC CCCD', 'VNeID & Citizen ID eKYC')}
                  </Text>
                  <Text style={styles.vneidModalSub}>
                    {t('Quét thẻ CCCD gắn chip hoặc đối chiếu chuẩn C06 Bộ Công an', 'Scan Chip-based CCCD or verify C06 National ID structure')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setVneidModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Real AI eKYC Scanner & Official VNeID App Actions */}
              <View style={styles.ekycActionRow}>
                <TouchableOpacity
                  style={styles.ekycScanBtn}
                  onPress={() => void handleScanVNeIDDocument(true)}
                  disabled={scanningEkyc || vneidLoading}
                >
                  <Ionicons name="camera-outline" size={17} color="#B91C1C" />
                  <Text style={styles.ekycScanBtnText}>
                    {t('Chụp CCCD', 'Scan CCCD')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.ekycScanBtn}
                  onPress={() => void handleScanVNeIDDocument(false)}
                  disabled={scanningEkyc || vneidLoading}
                >
                  <Ionicons name="image-outline" size={17} color="#B91C1C" />
                  <Text style={styles.ekycScanBtnText}>
                    {t('Ảnh CCCD/VNeID', 'Upload ID/VNeID')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.openVneidAppBtn}
                  onPress={() => void openOfficialVNeIDApp()}
                  disabled={scanningEkyc || vneidLoading}
                >
                  <Ionicons name="open-outline" size={16} color="#0F172A" />
                  <Text style={styles.openVneidAppText}>
                    {t('Mở VNeID', 'Open VNeID')}
                  </Text>
                </TouchableOpacity>
              </View>

              {scanningEkyc && (
                <View style={styles.ekycLoadingBox}>
                  <ActivityIndicator size="small" color="#B91C1C" />
                  <Text style={styles.ekycLoadingText}>
                    {t('AI eKYC đang đọc thông tin trên thẻ CCCD / màn hình VNeID...', 'AI eKYC is reading your CCCD / VNeID document...')}
                  </Text>
                </View>
              )}

              {ekycResult && (
                <View style={styles.ekycSuccessBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ekycSuccessTitle}>
                      {ekycResult.document_type === 'VNEID_APP'
                        ? t('Đã xác thực từ màn hình ứng dụng VNeID', 'Extracted from VNeID App Screen')
                        : t('Đã đọc thành công Thẻ CCCD gắn chip', 'Extracted from Chip-based CCCD Card')}
                    </Text>
                    <Text style={styles.ekycSuccessSub}>
                      {ekycResult.full_name} · {ekycResult.date_of_birth || ''} · {ekycResult.place_of_residence || ekycResult.province_name || ''}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.vneidFieldLabel}>
                {t('Số định danh cá nhân (CCCD gắn chip 12 số) *', '12-Digit Citizen ID (Chip CCCD) *')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('Nhập 12 chữ số trên thẻ CCCD của bạn', 'Enter your 12-digit Citizen ID')}
                placeholderTextColor="#64748b"
                value={vneidCccd}
                onChangeText={(val) => {
                  setVneidCccd(val.replace(/\D/g, ''));
                  setEkycResult(null);
                }}
                keyboardType="number-pad"
                maxLength={12}
                editable={!vneidLoading && !scanningEkyc}
              />

              {/* Real-time C06 National ID Structure Decoder */}
              {decodedCccd && (
                <View
                  style={[
                    styles.cccdDecodeBanner,
                    decodedCccd.valid ? styles.cccdDecodeValid : styles.cccdDecodeInvalid,
                  ]}
                >
                  <Ionicons
                    name={decodedCccd.valid ? 'shield-checkmark' : 'alert-circle'}
                    size={16}
                    color={decodedCccd.valid ? '#0F766E' : '#B91C1C'}
                  />
                  <Text
                    style={[
                      styles.cccdDecodeText,
                      { color: decodedCccd.valid ? '#0F766E' : '#B91C1C' },
                    ]}
                  >
                    {decodedCccd.valid
                      ? t(
                        `Chuẩn C06 hợp lệ: Nơi đăng ký khai sinh ${decodedCccd.provinceName} (Mã ${decodedCccd.provinceCode}) · Giới tính: ${decodedCccd.genderVi} · Năm sinh: ${decodedCccd.birthYear}`,
                        `Valid C06 ID: Province ${decodedCccd.provinceName} (${decodedCccd.provinceCode}) · Gender: ${decodedCccd.genderEn} · Birth Year: ${decodedCccd.birthYear}`
                      )
                      : language === 'vi'
                        ? decodedCccd.errorVi
                        : decodedCccd.errorEn}
                  </Text>
                </View>
              )}

              <Text style={styles.vneidFieldLabel}>
                {t('Họ và tên công dân (đúng như trên thẻ CCCD) *', 'Citizen Full Name (as shown on CCCD) *')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('Nhập họ và tên thật của bạn', 'Enter your full legal name')}
                placeholderTextColor="#64748b"
                value={vneidName}
                onChangeText={setVneidName}
                autoCapitalize="words"
                editable={!vneidLoading && !scanningEkyc}
              />

              <Text style={styles.vneidFieldLabel}>
                {t('Số điện thoại liên kết VNeID (tùy chọn)', 'VNeID Linked Phone Number (optional)')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('Ví dụ: 0901234567', 'e.g., 0901234567')}
                placeholderTextColor="#64748b"
                value={vneidPhone}
                onChangeText={setVneidPhone}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!vneidLoading && !scanningEkyc}
              />

              <TouchableOpacity
                style={[styles.vneidConfirmButton, (vneidLoading || scanningEkyc) && styles.loginButtonDisabled]}
                onPress={() => void handleVNeIDLogin()}
                disabled={vneidLoading || scanningEkyc}
              >
                {vneidLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.vneidConfirmText}>
                    {t('Xác thực Định danh & Đăng nhập', 'Verify Identity & Sign In')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    color: '#0f172a',
    marginBottom: 28,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: 15,
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
  vneidButton: {
    marginTop: 14,
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  vneidBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  vneidButtonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  vneidButtonSub: {
    color: '#FECACA',
    fontSize: 11,
    marginTop: 1,
  },
  vneidModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  vneidModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  vneidModalHeader: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  vneidHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vneidHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vneidModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  vneidModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ekycActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ekycScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  ekycScanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  openVneidAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  openVneidAppText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  ekycLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  ekycLoadingText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
  },
  ekycSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  ekycSuccessTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  ekycSuccessSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  cccdDecodeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: -8,
    marginBottom: 14,
  },
  cccdDecodeValid: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  cccdDecodeInvalid: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cccdDecodeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  vneidFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  vneidConfirmButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vneidConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
