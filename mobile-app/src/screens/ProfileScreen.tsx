/**
 * Profile Screen
 * Citizen digital profile, contribution stats and settings
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

type SettingsModal = 'profile' | 'password' | 'notifications' | 'about' | 'verify_email' | null;

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as { response?: { data?: { error?: string; message?: string } } }
    ).response;
    return response?.data?.error || response?.data?.message || fallback;
  }
  return fallback;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, isLoading, updateUserLocal } = useAuth();
  const { language, t, setLanguage } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeModal, setActiveModal] = useState<SettingsModal>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stats, setStats] = useState({ total: 0, processing: 0, completed: 0 });
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      apiClient
        .getUserIncidents(user.id, 1, 50)
        .then((res) => {
          const list = res.data || [];
          setStats({
            total: list.length,
            processing: list.filter((i: any) =>
              ['pending', 'assigned', 'in_progress'].includes(i.status)
            ).length,
            completed: list.filter((i: any) => i.status === 'completed').length,
          });
        })
        .catch(() => { });
    }, [user])
  );

  const openProfileEditor = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setActiveModal('profile');
  };

  const openNotificationSettings = async () => {
    setActiveModal('notifications');
    setLoadingPreferences(true);
    try {
      const response = await apiClient.getNotificationPreferences();
      if (response?.data) {
        setNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...response.data,
        });
      }
    } catch (error) {
      setActiveModal(null);
      Alert.alert(t('Lỗi', 'Error'), getErrorMessage(error, t('Không thể tải cài đặt thông báo.', 'Unable to load notification settings.')));
    } finally {
      setLoadingPreferences(false);
    }
  };

  const saveProfile = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert(t('Thông tin chưa hợp lệ', 'Invalid Information'), t('Họ và tên phải có ít nhất 2 ký tự.', 'Full name must be at least 2 characters.'));
      return;
    }
    try {
      setSaving(true);
      const response = await apiClient.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      if (!response?.success || !response.data) {
        throw new Error(response?.message || t('Không thể cập nhật hồ sơ.', 'Unable to update your profile.'));
      }
      await updateUserLocal(response.data);
      setActiveModal(null);
      Alert.alert(t('Thành công', 'Success'), t('Hồ sơ của bạn đã được cập nhật.', 'Your profile has been updated.'));
    } catch (error) {
      Alert.alert(t('Lỗi', 'Error'), getErrorMessage(error, t('Không thể cập nhật hồ sơ.', 'Unable to update your profile.')));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('Thiếu thông tin', 'Missing Information'), t('Vui lòng nhập đầy đủ các trường mật khẩu.', 'Complete all password fields.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('Mật khẩu không khớp', 'Passwords Do Not Match'), t('Vui lòng kiểm tra lại mật khẩu xác nhận.', 'Check your password confirmation.'));
      return;
    }
    try {
      setSaving(true);
      const response = await apiClient.changePassword(currentPassword, newPassword);
      if (!response?.success) {
        throw new Error(response?.message || t('Không thể thay đổi mật khẩu.', 'Unable to change your password.'));
      }
      setActiveModal(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('Thành công', 'Success'), t('Mật khẩu của bạn đã được thay đổi.', 'Your password has been changed.'));
    } catch (error) {
      Alert.alert(t('Lỗi', 'Error'), getErrorMessage(error, t('Không thể thay đổi mật khẩu.', 'Unable to change your password.')));
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      setSaving(true);
      const response = await apiClient.updateNotificationPreferences(notificationPreferences);
      if (!response?.success || !response.data) {
        throw new Error(response?.message || t('Không thể lưu cài đặt thông báo.', 'Unable to save notification settings.'));
      }
      setNotificationPreferences({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...response.data,
      });
      setActiveModal(null);
      Alert.alert(t('Thành công', 'Success'), t('Cài đặt thông báo đã được lưu.', 'Notification settings have been saved.'));
    } catch (error) {
      Alert.alert(t('Lỗi', 'Error'), getErrorMessage(error, t('Không thể lưu cài đặt thông báo.', 'Unable to save notification settings.')));
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => setActiveModal(null);

  const openEmailVerification = async () => {
    setVerificationCode('');
    setActiveModal('verify_email');
    await requestVerificationOtp();
  };

  const requestVerificationOtp = async () => {
    try {
      setSendingOtp(true);
      const response = await apiClient.sendVerificationEmail();
      if (response?.message === 'Email is already verified') {
        if (user) {
          await updateUserLocal({ ...user, is_verified: true });
        }
        setActiveModal(null);
        Alert.alert(t('Đã xác thực', 'Verified'), t('Email của bạn đã được xác thực.', 'Your email is already verified.'));
      }
    } catch (error) {
      Alert.alert(
        t('Lỗi gửi OTP', 'OTP Delivery Error'),
        getErrorMessage(error, t('Không thể gửi mã xác thực qua email.', 'Unable to send verification code via email.'))
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const submitVerificationOtp = async () => {
    const cleaned = verificationCode.trim();
    if (cleaned.length < 4) {
      Alert.alert(t('Thiếu mã OTP', 'Missing OTP'), t('Vui lòng nhập mã xác thực 6 chữ số được gửi về email.', 'Please enter the 6-digit verification code sent to your email.'));
      return;
    }
    try {
      setSaving(true);
      const response = await apiClient.verifyEmail(cleaned);
      if (!response?.success) {
        throw new Error(response?.message || t('Mã xác thực không hợp lệ.', 'Invalid verification code.'));
      }
      if (user) {
        await updateUserLocal({ ...user, is_verified: true });
      }
      setActiveModal(null);
      setVerificationCode('');
      Alert.alert(
        t('Xác thực thành công', 'Verification Successful'),
        t('Tài khoản công dân của bạn đã được kích hoạt huy hiệu Đã xác thực!', 'Your citizen account is now verified!')
      );
    } catch (error) {
      Alert.alert(
        t('Xác thực thất bại', 'Verification Failed'),
        getErrorMessage(error, t('Mã OTP không đúng hoặc đã hết hạn.', 'Invalid or expired OTP code.'))
      );
    } finally {
      setSaving(false);
    }
  };

  const saveActiveModal = () => {
    if (activeModal === 'profile') {
      void saveProfile();
    } else if (activeModal === 'password') {
      void savePassword();
    } else if (activeModal === 'notifications') {
      void saveNotificationPreferences();
    } else if (activeModal === 'verify_email') {
      void submitVerificationOtp();
    } else {
      closeModal();
    }
  };

  const handleLogout = () => {
    Alert.alert(t('Đăng xuất', 'Log Out'), t('Bạn có chắc muốn đăng xuất?', 'Are you sure you want to log out?'), [
      { text: t('Hủy', 'Cancel'), style: 'cancel' },
      {
        text: t('Đăng xuất', 'Log Out'),
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
          } catch {
            Alert.alert(t('Lỗi', 'Error'), t('Không thể đăng xuất', 'Unable to log out'));
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleSetLanguage = async (nextLanguage: 'vi' | 'en') => {
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      console.error('Unable to save language preference:', error);
      Alert.alert(t('Lỗi', 'Error'), t('Không thể lưu tùy chọn ngôn ngữ.', 'Unable to save your language preference.'));
    }
  };

  if (isLoading || !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0A9D96" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Citizen Digital Header Card */}
      <View style={[styles.profileHeader, { paddingTop: Math.max(insets.top + 16, 28) }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <View style={styles.citizenBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#0A9D96" />
          <Text style={styles.citizenBadgeText}>{t('Công dân Đô thị Số · Mã #', 'Digital City Resident · ID #')}{user.id}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statText}>{t('Đã phản ánh', 'Submitted')}</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.processing}</Text>
            <Text style={styles.statText}>{t('Đang xử lý', 'In Progress')}</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.completed}</Text>
            <Text style={styles.statText}>{t('Đã giải quyết', 'Resolved')}</Text>
          </View>
        </View>
      </View>

      {/* Contact Info Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Thông tin liên hệ', 'Contact Information')}</Text>

        <View style={styles.contactRow}>
          <View style={[styles.iconBox, { backgroundColor: '#E6F7F5' }]}>
            <Ionicons name="mail-outline" size={18} color="#0A9D96" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('Email đăng ký', 'Registered Email')}</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          {user.is_verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.verifiedBadgeText}>{t('Đã xác thực', 'Verified')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.unverifiedBadge}
              onPress={() => void openEmailVerification()}
              accessibilityRole="button"
            >
              <Ionicons name="alert-circle" size={14} color="#D97706" />
              <Text style={styles.unverifiedBadgeText}>{t('Xác thực OTP', 'Verify OTP')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.contactRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="call-outline" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('Số điện thoại', 'Phone Number')}</Text>
            <Text style={styles.value}>{user.phone || t('Chưa cập nhật', 'Not provided')}</Text>
          </View>
        </View>
      </View>

      {/* Settings Menu Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Cài đặt & Bảo mật', 'Settings & Security')}</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="globe-outline" size={18} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.settingText}>{t('Ngôn ngữ', 'Language')}</Text>
              <Text style={styles.settingSub}>{t('Chọn ngôn ngữ hiển thị', 'Choose your display language')}</Text>
            </View>
          </View>
          <View style={styles.languageChoices}>
            <TouchableOpacity
              onPress={() => void handleSetLanguage('vi')}
              style={[styles.languageChoice, language === 'vi' && styles.languageChoiceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === 'vi' }}
            >
              <Text style={[styles.languageChoiceText, language === 'vi' && styles.languageChoiceTextActive]}>🇻🇳 VI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSetLanguage('en')}
              style={[styles.languageChoice, language === 'en' && styles.languageChoiceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === 'en' }}
            >
              <Text style={[styles.languageChoiceText, language === 'en' && styles.languageChoiceTextActive]}>🇬🇧 EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.settingItem} onPress={openProfileEditor}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E6F7F5' }]}>
              <Ionicons name="person-outline" size={18} color="#0A9D96" />
            </View>
            <View>
              <Text style={styles.settingText}>{t('Chỉnh sửa hồ sơ', 'Edit Profile')}</Text>
              <Text style={styles.settingSub}>{t('Cập nhật họ tên và số điện thoại', 'Update your name and phone number')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setActiveModal('password')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#D97706" />
            </View>
            <View>
              <Text style={styles.settingText}>{t('Thay đổi mật khẩu', 'Change Password')}</Text>
              <Text style={styles.settingSub}>{t('Bảo vệ tài khoản cá nhân của bạn', 'Keep your account secure')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => void openNotificationSettings()}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="notifications-outline" size={18} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.settingText}>{t('Cài đặt thông báo', 'Notification Settings')}</Text>
              <Text style={styles.settingSub}>{t('Tùy chỉnh Push, Email và SMS', 'Manage push, email, and SMS notifications')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomWidth: 0 }]}
          onPress={() => setActiveModal('about')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.settingText}>{t('Về ứng dụng UIRMS', 'About UIRMS')}</Text>
              <Text style={styles.settingSub}>{t('Thông tin phiên bản & đơn vị vận hành', 'Version and operating organization')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={{ marginHorizontal: 16, marginTop: 18 }}>
        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={19} color="#FFF" />
              <Text style={styles.logoutButtonText}>{t('Đăng xuất tài khoản', 'Log Out')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>
          {t('UIRMS v1.0.0 · Hệ thống Phản ánh Hạ tầng Đô thị TP.HCM', 'UIRMS v1.0.0 · Ho Chi Minh City Urban Incident Reporting System')}
        </Text>
      </View>

      {/* Settings Modals */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'profile' && t('Chỉnh sửa hồ sơ', 'Edit Profile')}
                {activeModal === 'password' && t('Thay đổi mật khẩu', 'Change Password')}
                {activeModal === 'notifications' && t('Cài đặt thông báo', 'Notification Settings')}
                {activeModal === 'verify_email' && t('Xác thực tài khoản', 'Verify Account')}
                {activeModal === 'about' && t('Về ứng dụng', 'About UIRMS')}
              </Text>
              <TouchableOpacity onPress={closeModal} accessibilityLabel={t('Đóng', 'Close')}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {activeModal === 'profile' && (
                <>
                  <Text style={styles.inputLabel}>{t('Họ và tên', 'Full Name')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder={t('Nhập họ và tên', 'Enter your full name')}
                    autoCapitalize="words"
                    maxLength={255}
                  />
                  <Text style={styles.inputLabel}>{t('Số điện thoại', 'Phone Number')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('Nhập số điện thoại', 'Enter your phone number')}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {activeModal === 'password' && (
                <>
                  <Text style={styles.inputLabel}>{t('Mật khẩu hiện tại', 'Current Password')}</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder={t('Nhập mật khẩu hiện tại', 'Enter your current password')}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputLabel}>{t('Mật khẩu mới', 'New Password')}</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t('Nhập mật khẩu mới', 'Enter your new password')}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputLabel}>{t('Xác nhận mật khẩu mới', 'Confirm New Password')}</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t('Nhập lại mật khẩu mới', 'Re-enter your new password')}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {activeModal === 'notifications' &&
                (loadingPreferences ? (
                  <ActivityIndicator
                    size="large"
                    color="#0A9D96"
                    style={styles.preferencesLoading}
                  />
                ) : (
                  <>
                    <View style={styles.preferenceRow}>
                      <Text style={styles.preferenceLabel}>{t('Thông báo đẩy (Push)', 'Push Notifications')}</Text>
                      <Switch
                        value={notificationPreferences.pushNotifications}
                        onValueChange={(pushNotifications) =>
                          setNotificationPreferences((current) => ({
                            ...current,
                            pushNotifications,
                          }))
                        }
                        trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
                        thumbColor={
                          notificationPreferences.pushNotifications ? '#0A9D96' : '#f8fafc'
                        }
                      />
                    </View>
                    <View style={styles.preferenceRow}>
                      <Text style={styles.preferenceLabel}>{t('Thông báo qua Email', 'Email Notifications')}</Text>
                      <Switch
                        value={notificationPreferences.emailNotifications}
                        onValueChange={(emailNotifications) =>
                          setNotificationPreferences((current) => ({
                            ...current,
                            emailNotifications,
                          }))
                        }
                        trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
                        thumbColor={
                          notificationPreferences.emailNotifications ? '#0A9D96' : '#f8fafc'
                        }
                      />
                    </View>
                    <View style={styles.preferenceRow}>
                      <Text style={styles.preferenceLabel}>{t('Tin nhắn SMS khẩn cấp', 'Emergency SMS')}</Text>
                      <Switch
                        value={notificationPreferences.smsNotifications}
                        onValueChange={(smsNotifications) =>
                          setNotificationPreferences((current) => ({
                            ...current,
                            smsNotifications,
                          }))
                        }
                        trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
                        thumbColor={
                          notificationPreferences.smsNotifications ? '#0A9D96' : '#f8fafc'
                        }
                      />
                    </View>
                  </>
                ))}

              {activeModal === 'verify_email' && (
                <>
                  <Text style={styles.aboutText}>
                    {t(
                      `Mã xác thực 6 chữ số đã được gửi tới hộp thư ${user.email}. Vui lòng nhập mã bên dưới để kích hoạt huy hiệu Đã xác thực:`,
                      `A 6-digit verification code has been sent to ${user.email}. Enter it below to verify your account:`
                    )}
                  </Text>
                  <Text style={styles.inputLabel}>{t('Mã xác thực (OTP)', 'Verification Code (OTP)')}</Text>
                  <TextInput
                    style={[styles.modalInput, styles.otpInput]}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.resendOtpButton}
                    onPress={() => void requestVerificationOtp()}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color="#0A9D96" />
                    ) : (
                      <Text style={styles.resendOtpText}>
                        {t('Gửi lại mã OTP qua Email', 'Resend OTP via Email')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {activeModal === 'about' && (
                <Text style={styles.aboutText}>
                  {t('UIRMS v1.0.0 - Hệ thống Tiếp nhận & Quản lý Phản ánh Sự cố Hạ tầng Đô thị TP. Hồ Chí Minh.\n\nỨng dụng tích hợp định vị không gian PostGIS và Gemini AI để hỗ trợ người dân gửi phản ánh nhanh chóng, minh bạch.', 'UIRMS v1.0.0 - Ho Chi Minh City Urban Incident Reporting and Management System.\n\nThe app integrates PostGIS geospatial location and Gemini AI to help residents submit reports quickly and transparently.')}
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>{t('Đóng', 'Close')}</Text>
              </TouchableOpacity>
              {activeModal !== 'about' && (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (saving || loadingPreferences) && styles.saveButtonDisabled,
                  ]}
                  onPress={saveActiveModal}
                  disabled={saving || loadingPreferences}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('Lưu thay đổi', 'Save Changes')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EDF1',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#0A9D96',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0A9D96',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: '#142532' },
  citizenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#E6F7F5',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
  },
  citizenBadgeText: { color: '#0A9D96', fontSize: 11, fontWeight: '700' },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, backgroundColor: '#E2E8F0' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  statText: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EBF1F4',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  value: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  languageChoices: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  languageChoice: { borderWidth: 1, borderColor: '#DCE6E9', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6 },
  languageChoiceActive: { backgroundColor: '#E6F7F5', borderColor: '#0A9D96' },
  languageChoiceText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  languageChoiceTextActive: { color: '#087F7A' },
  settingText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  settingSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonDisabled: { opacity: 0.6 },
  logoutButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 18 },
  versionText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    padding: 20,
  },
  modalCard: {
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  inputLabel: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  modalInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1f2937',
    marginBottom: 16,
  },
  passwordInputContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  passwordInput: { flex: 1, color: '#1f2937', paddingVertical: 10 },
  preferenceRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  preferenceLabel: { fontSize: 14, color: '#334155', fontWeight: '600' },
  preferencesLoading: { paddingVertical: 24 },
  aboutText: { color: '#475569', fontSize: 14, lineHeight: 22, paddingVertical: 8 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: { color: '#475569', fontWeight: '700' },
  saveButton: {
    minWidth: 128,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#0A9D96',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '800' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  resendOtpButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendOtpText: {
    color: '#0A9D96',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});