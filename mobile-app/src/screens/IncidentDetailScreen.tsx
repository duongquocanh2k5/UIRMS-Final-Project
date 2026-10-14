/**
 * Incident Detail Screen
 * View full incident details
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
} from 'react-native';
import { apiClient } from '../services/api';

interface IncidentDetail {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  location_name?: string;
  location_point?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  category_id: number;
  user_id: number;
  image_urls?: string[];
}

const formatVietnamDateTime = (value: string) => new Date(value).toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function IncidentDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    try {
      const response = await apiClient.getIncidentById(id);
      setIncident(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải chi tiết sự cố');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    Alert.alert('Xác nhận', 'Đánh dấu sự cố này đã hoàn thành?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            await apiClient.completeIncident(id);
            Alert.alert('Thành công', 'Sự cố đã được đánh dấu hoàn thành');
            loadIncident();
          } catch (error: any) {
            Alert.alert('Lỗi', 'Không thể cập nhật sự cố');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Xóa báo cáo?', 'Bạn có chắc muốn xóa báo cáo này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteIncident(id);
            Alert.alert('Đã xóa báo cáo', 'Báo cáo đã được xóa thành công.', [{ text: 'Xong', onPress: () => navigation.goBack() }]);
          } catch (error: any) {
            Alert.alert('Không thể xóa', error.response?.data?.error || 'Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
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
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy sự cố</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{incident.title}</Text>
        <View style={styles.badgesContainer}>
          <View
            style={[styles.badge, { backgroundColor: getStatusColor(incident.status) }]}
          >
            <Text style={styles.badgeText}>{incident.status.toUpperCase()}</Text>
          </View>
          <View
            style={[styles.badge, { backgroundColor: getPriorityColor(incident.priority) }]}
          >
            <Text style={styles.badgeText}>{incident.priority.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>#{incident.id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Danh mục:</Text>
          <Text style={styles.value}>Danh mục {incident.category_id}</Text>
        </View>

        {incident.location_name && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Địa điểm:</Text>
            <Text style={styles.value}>{incident.location_name}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Ngày báo cáo:</Text>
          <Text style={styles.value}>
            {formatVietnamDateTime(incident.created_at)}
          </Text>
        </View>

        {incident.completed_at && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Ngày hoàn thành:</Text>
            <Text style={styles.value}>
              {formatVietnamDateTime(incident.completed_at)}
            </Text>
          </View>
        )}
      </View>

      {incident.image_urls?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh hiện trường</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
            {incident.image_urls.map((imageUrl) => (
              <Image key={imageUrl} source={{ uri: imageUrl }} style={styles.incidentImage} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {incident.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <Text style={styles.description}>{incident.description}</Text>
        </View>
      )}

      {incident.status !== 'completed' && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleMarkComplete}
          >
            <Text style={styles.completeButtonText}>Đánh dấu hoàn thành</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Xóa báo cáo này</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FDE8E8',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B84A4A',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteExpiredText: {
    color: '#9AA6AC',
    textAlign: 'center',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  imageList: {
    gap: 10,
  },
  incidentImage: {
    width: 220,
    height: 150,
    borderRadius: 10,
    resizeMode: 'cover',
    backgroundColor: '#e5edef',
  },
  completeButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
