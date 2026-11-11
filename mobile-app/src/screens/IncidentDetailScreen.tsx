/**
 * Incident Detail Screen
 * View full incident details with SLA & Step Progress Timeline
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface IncidentImage {
  id: number;
  image_url: string;
  is_before: boolean;
  created_at: string;
}

type ImagePreview = Pick<IncidentImage, 'image_url' | 'is_before'> & {
  id: number | string;
  created_at?: string;
};

interface IncidentDetail {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  category_id: number;
  user_id: number;
  category_name?: string | null;
  ai_confidence?: number | string | null;
  is_duplicate?: boolean;
  duplicate_of?: number | null;
  images?: IncidentImage[];
  image_urls?: string[];
  citizen_rating?: number | null;
  citizen_feedback?: string | null;
  citizen_feedback_at?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  assigned: 'Đã tiếp nhận',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  rejected: 'Từ chối',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nhẹ',
  medium: 'Trung bình',
  high: 'Nghiêm trọng',
  critical: 'Khẩn cấp',
};

const SLA_HOURS: Record<string, number> = {
  critical: 24,
  high: 48,
  medium: 72,
  low: 120,
};

const STEPS = [
  { key: 'pending', label: 'Đã gửi' },
  { key: 'assigned', label: 'Tiếp nhận' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'completed', label: 'Hoàn tất' },
];

const formatVietnamDateTime = (value: string, language: 'vi' | 'en') =>
  new Date(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const deduplicateAddress = (address: string | undefined, t: (vi: string, en: string) => string) => {
  if (!address) return t('Chưa cập nhật địa điểm', 'Location not provided');
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
};

export default function IncidentDetailScreen({ route, navigation }: any) {
  const { language, t, translateCategory } = useLanguage();
  const { user } = useAuth();
  const { id } = route.params;
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImagePreview | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [savingEdit, setSavingEdit] = useState(false);

  const [rating, setRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    void loadIncident();
  }, [id]);

  const loadIncident = async () => {
    try {
      const response = await apiClient.getIncidentById(id);
      const data = response.data as IncidentDetail;
      setIncident(data);
      if (data?.citizen_rating) {
        setRating(data.citizen_rating);
        setFeedbackText(data.citizen_feedback || '');
      }
    } catch {
      Alert.alert(t('Lỗi', 'Error'), t('Không thể tải chi tiết sự cố', 'Unable to load incident details'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!incident) return;
    setEditTitle(incident.title || '');
    setEditDescription(incident.description || '');
    setEditLocation(incident.location_name || '');
    setEditPriority((incident.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!incident) return;
    if (editTitle.trim().length < 3) {
      Alert.alert(t('Tiêu đề quá ngắn', 'Title too short'), t('Tiêu đề báo cáo phải có ít nhất 3 ký tự.', 'Report title must be at least 3 characters.'));
      return;
    }
    try {
      setSavingEdit(true);
      await apiClient.updateIncident(incident.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        location_name: editLocation.trim(),
        priority: editPriority,
      });
      setEditModalVisible(false);
      await loadIncident();
      Alert.alert(t('Đã cập nhật', 'Updated'), t('Thông tin báo cáo đã được cập nhật thành công.', 'Report details updated successfully.'));
    } catch (error: any) {
      Alert.alert(
        t('Không thể cập nhật', 'Unable to update'),
        error.response?.data?.error || t('Vui lòng thử lại.', 'Please try again.')
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!incident) return;
    try {
      setSubmittingFeedback(true);
      const response = await apiClient.submitIncidentFeedback(incident.id, rating, feedbackText.trim());
      if (response?.data) {
        setIncident((prev) =>
          prev
            ? {
                ...prev,
                citizen_rating: response.data.citizen_rating,
                citizen_feedback: response.data.citizen_feedback,
                citizen_feedback_at: response.data.citizen_feedback_at,
              }
            : prev
        );
      } else {
        await loadIncident();
      }
      setEditingFeedback(false);
      Alert.alert(
        t('Cảm ơn bạn đã đánh giá!', 'Thank you for your feedback!'),
        t('Ý kiến nghiệm thu của bạn đã được ghi nhận và gửi tới Ban quản lý đô thị.', 'Your resolution rating has been recorded.')
      );
    } catch (error: any) {
      Alert.alert(
        t('Không thể gửi đánh giá', 'Unable to submit feedback'),
        error.response?.data?.error || t('Vui lòng thử lại.', 'Please try again.')
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('Xóa báo cáo?', 'Delete report?'), t('Bạn có chắc muốn xóa báo cáo này không?', 'Are you sure you want to delete this report?'), [
      { text: t('Hủy', 'Cancel'), style: 'cancel' },
      {
        text: t('Xóa', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteIncident(id);
            Alert.alert(t('Đã xóa báo cáo', 'Report Deleted'), t('Báo cáo đã được xóa thành công.', 'The report was deleted successfully.'), [
              { text: t('Xong', 'Done'), onPress: () => navigation.goBack() },
            ]);
          } catch (error: any) {
            Alert.alert(t('Không thể xóa', 'Unable to delete'), error.response?.data?.error || t('Vui lòng thử lại.', 'Please try again.'));
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'assigned':
      case 'in_progress':
        return '#0A9D96';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0A9D96" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('Không tìm thấy sự cố', 'Incident not found')}</Text>
      </View>
    );
  }

  const coordinates =
    Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
      ? { latitude: Number(incident.latitude), longitude: Number(incident.longitude) }
      : null;
  const beforeImages = incident.images?.filter((image) => image.is_before) || [];
  const resultImages = incident.images?.filter((image) => !image.is_before) || [];
  const displayedBeforeImages: ImagePreview[] =
    beforeImages.length > 0
      ? beforeImages
      : incident.images?.length
        ? []
        : (incident.image_urls || []).map((image_url, index) => ({
          id: `legacy-${index}`,
          image_url,
          is_before: true,
        }));

  const currentStepIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.key === incident.status)
  );
  const slaHours = SLA_HOURS[incident.priority] || 72;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header Title & Badges */}
      <View style={styles.header}>
        <View style={styles.codeRow}>
          <Text style={styles.incidentCode}>{t('Mã phản ánh: #BC-', 'Report #INC-')}{incident.id}</Text>
          <Text style={styles.createdTime}>{formatVietnamDateTime(incident.created_at, language)}</Text>
        </View>
        <Text style={styles.title}>{incident.title}</Text>
        <View style={styles.badgesContainer}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(incident.status) }]}>
            <Text style={styles.badgeText}>
              {t(STATUS_LABELS[incident.status] || incident.status, ({
                pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
              } as Record<string, string>)[incident.status] || incident.status)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getPriorityColor(incident.priority) }]}>
            <Text style={styles.badgeText}>
              {t('Mức độ:', 'Severity:')} {t(PRIORITY_LABELS[incident.priority] || 'Trung bình', ({
                Nhẹ: 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical',
              } as Record<string, string>)[PRIORITY_LABELS[incident.priority] || 'Trung bình'])}
            </Text>
          </View>
        </View>
      </View>

      {/* Step Progress Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Tiến trình xử lý', 'Resolution Progress')}</Text>
        {incident.status === 'rejected' ? (
          <View style={styles.rejectedBanner}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
            <Text style={styles.rejectedBannerText}>
              {t('Báo cáo này đã bị từ chối xử lý. Vui lòng kiểm tra mục Thông báo để xem lý do chi tiết.', 'This report was rejected. Check Notifications for the reason.')}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineRow}>
            {STEPS.map((step, index) => {
              const active = index <= currentStepIndex;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View style={styles.stepCircleRow}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.stepLine,
                          index <= currentStepIndex && styles.stepLineActive,
                        ]}
                      />
                    )}
                    <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                      <Ionicons
                        name={active ? 'checkmark' : 'ellipse'}
                        size={active ? 13 : 6}
                        color="#FFF"
                      />
                    </View>
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                    {t(step.label, ({
                      'Đã gửi': 'Submitted', 'Tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed',
                    } as Record<string, string>)[step.label])}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* SLA & AI Confidence Info Box */}
        <View style={styles.slaBox}>
          <Ionicons name="time-outline" size={18} color="#0A9D96" />
          <Text style={styles.slaText}>
            {t('Cam kết xử lý (SLA):', 'Service-level target (SLA):')} <Text style={{ fontWeight: '800' }}>{slaHours} {t('giờ', 'hours')}</Text> {t('kể từ lúc tiếp nhận', 'from receipt')}
          </Text>
        </View>

        {incident.ai_confidence !== null && incident.ai_confidence !== undefined && (
          <View style={styles.aiBox}>
            <Ionicons name="sparkles" size={16} color="#1D4ED8" />
            <Text style={styles.aiBoxText}>
              {t('AI thẩm định hiện trường tự động · Độ tin cậy', 'AI site assessment · Confidence')}{' '}
              <Text style={{ fontWeight: '800' }}>
                {Math.round(Number(incident.ai_confidence) * 100)}%
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* Details Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Thông tin chi tiết', 'Incident Details')}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('Danh mục:', 'Category:')}</Text>
          <Text style={styles.value}>
            {incident.category_name ? translateCategory(incident.category_name) : `${t('Danh mục', 'Category')} ${incident.category_id}`}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('Địa điểm:', 'Location:')}</Text>
          <Text style={styles.value}>{deduplicateAddress(incident.location_name, t)}</Text>
        </View>

        {coordinates && (
          <MapView
            style={styles.locationMap}
            initialRegion={{
              ...coordinates,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={coordinates} title={t('Vị trí sự cố', 'Incident Location')} />
          </MapView>
        )}

        <View style={[styles.infoRow, { marginTop: 8 }]}>
          <Text style={styles.label}>{t('Cập nhật lần cuối:', 'Last Updated:')}</Text>
          <Text style={styles.value}>
            {formatVietnamDateTime(incident.updated_at || incident.created_at, language)}
          </Text>
        </View>

        {incident.completed_at && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('Ngày hoàn thành:', 'Completed On:')}</Text>
            <Text style={[styles.value, { color: '#10b981' }]}>
              {formatVietnamDateTime(incident.completed_at, language)}
            </Text>
          </View>
        )}
      </View>

      {/* Field Images */}
      {displayedBeforeImages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('Ảnh hiện trường', 'Incident Photos')} ({displayedBeforeImages.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
          >
            {displayedBeforeImages.map((image) => (
              <TouchableOpacity
                key={image.id}
                onPress={() => setSelectedImage(image)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: image.image_url }} style={styles.incidentImage} />
                <View style={styles.imageCornerBadge}>
                  <Text style={styles.imageCornerText}>{t('TRƯỚC XỬ LÝ', 'BEFORE')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* After / Resolution Images */}
      {resultImages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Ảnh nghiệm thu sau xử lý', 'Resolution Photos')} ({resultImages.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
          >
            {resultImages.map((image) => (
              <TouchableOpacity
                key={image.id}
                onPress={() => setSelectedImage(image)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: image.image_url }} style={styles.incidentImage} />
                <View style={[styles.imageCornerBadge, { backgroundColor: '#16A34A' }]}>
                  <Text style={styles.imageCornerText}>{t('ĐÃ KHẮC PHỤC', 'RESOLVED')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Mô tả hiện trạng', 'Incident Description')}</Text>
        <Text style={styles.description}>
          {incident.description || t('Không có mô tả chi tiết.', 'No detailed description provided.')}
        </Text>
      </View>

      {/* Citizen Resolution Rating & Feedback (when Completed) */}
      {incident.status === 'completed' && (
        <View style={styles.section}>
          <View style={styles.ratingHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                {t('Đánh giá kết quả xử lý', 'Resolution Quality Rating')}
              </Text>
            </View>
            {incident.citizen_rating && user?.id === incident.user_id && !editingFeedback && (
              <TouchableOpacity onPress={() => setEditingFeedback(true)}>
                <Text style={styles.editFeedbackLink}>{t('Sửa đánh giá', 'Edit')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {incident.citizen_rating && !editingFeedback ? (
            <View style={styles.submittedRatingBox}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= (incident.citizen_rating || 0) ? 'star' : 'star-outline'}
                    size={22}
                    color="#F59E0B"
                  />
                ))}
                <Text style={styles.ratingScoreText}>{incident.citizen_rating}/5</Text>
              </View>
              {incident.citizen_feedback ? (
                <Text style={styles.submittedFeedbackText}>"{incident.citizen_feedback}"</Text>
              ) : (
                <Text style={styles.submittedFeedbackSub}>
                  {t('Người dân đã xác nhận hài lòng với kết quả xử lý.', 'Citizen rated the resolution.')}
                </Text>
              )}
              {incident.citizen_feedback_at && (
                <Text style={styles.submittedFeedbackTime}>
                  {t('Đánh giá lúc:', 'Rated at:')} {formatVietnamDateTime(incident.citizen_feedback_at, language)}
                </Text>
              )}
            </View>
          ) : user?.id === incident.user_id ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.ratingPromptText}>
                {t(
                  'Sự cố đã được khắc phục. Bạn đánh giá mức độ hài lòng về kết quả xử lý như thế nào?',
                  'This incident has been resolved. How satisfied are you with the resolution?'
                )}
              </Text>
              <View style={styles.interactiveStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starTouch}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabelText}>
                {rating === 5 && t('5 sao · Rất hài lòng', '5 stars · Very Satisfied')}
                {rating === 4 && t('4 sao · Hài lòng', '4 stars · Satisfied')}
                {rating === 3 && t('3 sao · Bình thường', '3 stars · Neutral')}
                {rating === 2 && t('2 sao · Chưa hài lòng', '2 stars · Unsatisfied')}
                {rating === 1 && t('1 sao · Rất không hài lòng', '1 star · Very Unsatisfied')}
              </Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder={t(
                  'Nhập nhận xét nghiệm thu thực tế của bạn (không bắt buộc)...',
                  'Share your feedback on the resolution (optional)...'
                )}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {editingFeedback && (
                  <TouchableOpacity
                    style={[styles.cancelEditButton, { flex: 1 }]}
                    onPress={() => {
                      setEditingFeedback(false);
                      setRating(incident.citizen_rating || 5);
                      setFeedbackText(incident.citizen_feedback || '');
                    }}
                    disabled={submittingFeedback}
                  >
                    <Text style={styles.cancelEditButtonText}>{t('Hủy', 'Cancel')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.submitFeedbackButton, { flex: 2 }, submittingFeedback && { opacity: 0.6 }]}
                  onPress={() => void handleSubmitFeedback()}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle-outline" size={18} color="#FFF" />
                      <Text style={styles.submitFeedbackButtonText}>
                        {t('Gửi đánh giá nghiệm thu', 'Submit Rating')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.description, { marginTop: 8 }]}>
              {t('Người gửi báo cáo chưa để lại đánh giá nghiệm thu.', 'The reporter has not submitted a resolution rating yet.')}
            </Text>
          )}
        </View>
      )}

      {incident.status === 'pending' && (!user || user.id === incident.user_id) && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={18} color="#0A9D96" />
            <Text style={styles.editButtonText}>{t('Chỉnh sửa nội dung báo cáo', 'Edit Report Details')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteButton, { marginTop: 10 }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={17} color="#B84A4A" />
            <Text style={styles.deleteButtonText}>{t('Hủy / Xóa báo cáo này', 'Cancel / Delete This Report')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Pending Incident Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editModalCard}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>{t('Chỉnh sửa báo cáo', 'Edit Report')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.editInputLabel}>{t('Tiêu đề sự cố *', 'Incident Title *')}</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={t('Nhập tiêu đề sự cố', 'Enter incident title')}
                maxLength={255}
              />

              <Text style={styles.editInputLabel}>{t('Mức độ nghiêm trọng', 'Severity Level')}</Text>
              <View style={styles.priorityChipsRow}>
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => {
                  const selected = editPriority === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setEditPriority(level)}
                      style={[
                        styles.priorityChip,
                        selected && { backgroundColor: getPriorityColor(level), borderColor: getPriorityColor(level) },
                      ]}
                    >
                      <Text style={[styles.priorityChipText, selected && { color: '#FFF' }]}>
                        {t(PRIORITY_LABELS[level], ({
                          low: 'Low',
                          medium: 'Medium',
                          high: 'High',
                          critical: 'Critical',
                        })[level])}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.editInputLabel}>{t('Địa chỉ / Điểm mốc', 'Location / Landmark')}</Text>
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder={t('Nhập địa chỉ cụ thể', 'Enter specific address')}
                maxLength={500}
              />

              <Text style={styles.editInputLabel}>{t('Mô tả chi tiết', 'Detailed Description')}</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder={t('Mô tả thêm về hiện trạng sự cố...', 'Describe the incident details...')}
                multiline
                maxLength={2000}
              />
            </ScrollView>

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.cancelEditButtonText}>{t('Hủy', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditButton, savingEdit && { opacity: 0.6 }]}
                onPress={() => void handleSaveEdit()}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveEditButtonText}>{t('Lưu cập nhật', 'Save Changes')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModal}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
            accessibilityLabel={t('Đóng ảnh', 'Close image')}
          >
            <Text style={styles.imageModalCloseText}>×</Text>
          </TouchableOpacity>
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage.image_url }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <View style={styles.imageModalCaption}>
                <Text style={styles.imageModalLabel}>
                  {selectedImage.is_before ? t('TRƯỚC XỬ LÝ', 'BEFORE') : t('ĐÃ KHẮC PHỤC', 'RESOLVED')}
                </Text>
                <Text style={styles.imageModalDate}>
                  {selectedImage.created_at
                    ? `${t('Chụp lúc', 'Captured')} ${formatVietnamDateTime(selectedImage.created_at, language)}`
                    : t('Ảnh minh chứng hiện trường', 'Incident evidence photo')}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#999' },
  header: {
    backgroundColor: '#fff',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EDF1',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  incidentCode: { fontSize: 12, fontWeight: '800', color: '#0A9D96' },
  createdTime: { fontSize: 11, color: '#94A3B8' },
  title: { fontSize: 19, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  badgesContainer: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBF1F4',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircleRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stepLine: {
    position: 'absolute',
    left: '-50%',
    right: '50%',
    top: 11,
    height: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 0,
  },
  stepLineActive: { backgroundColor: '#0A9D96' },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleActive: { backgroundColor: '#0A9D96' },
  stepLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: { color: '#0F172A', fontWeight: '800' },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
  },
  rejectedBannerText: { flex: 1, fontSize: 12, color: '#B91C1C', lineHeight: 18 },
  slaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDFB',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  slaText: { fontSize: 12, color: '#0F766E', flex: 1 },
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiBoxText: { fontSize: 12, color: '#1E40AF', flex: 1 },
  locationMap: { height: 170, marginTop: 10, borderRadius: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: { fontSize: 13, color: '#64748B', fontWeight: '600', marginRight: 12 },
  value: { fontSize: 13, color: '#1E293B', fontWeight: '700', flex: 1, textAlign: 'right' },
  description: { fontSize: 14, color: '#475569', lineHeight: 21 },
  imageList: { gap: 12 },
  incidentImage: {
    width: 220,
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#e5edef',
  },
  imageCornerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageCornerText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDE8E8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#B84A4A', fontSize: 14, fontWeight: '700' },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: { color: '#0A9D96', fontSize: 14, fontWeight: '800' },
  ratingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editFeedbackLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A9D96',
    textDecorationLine: 'underline',
  },
  submittedRatingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScoreText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  submittedFeedbackText: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 19,
  },
  submittedFeedbackSub: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  submittedFeedbackTime: {
    marginTop: 6,
    fontSize: 11,
    color: '#94A3B8',
  },
  ratingPromptText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  starTouch: {
    padding: 4,
  },
  ratingLabelText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 76,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
  },
  submitFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A9D96',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  submitFeedbackButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    padding: 18,
  },
  editModalCard: {
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 14,
  },
  priorityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  priorityChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelEditButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelEditButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  saveEditButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0A9D96',
  },
  saveEditButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  imageModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    paddingHorizontal: 16,
  },
  imageModalClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  imageModalCloseText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  fullscreenImage: { width: '100%', height: '78%' },
  imageModalCaption: { alignItems: 'center', paddingTop: 16 },
  imageModalLabel: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#0A9E96',
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  imageModalDate: { marginTop: 10, color: '#e2e8f0', fontSize: 13 },
});