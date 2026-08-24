/**
 * My Incidents Screen
 * List user's reported incidents
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

interface Incident {
  id: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  location_name?: string;
}

export default function MyIncidentsScreen({ navigation }: any) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    if (!user) return;
    try {
      const response = await apiClient.getUserIncidents(user.id, page);
      setIncidents(response.data || []);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sự cố');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadIncidents();
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

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Chờ xử lý',
      in_progress: 'Đang xử lý',
      completed: 'Hoàn thành',
      assigned: 'Đã gán',
      rejected: 'Từ chối',
    };
    return labels[status] || status;
  };

  const renderIncident = ({ item }: { item: Incident }) => (
    <TouchableOpacity
      style={styles.incidentCard}
      onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      {item.location_name && (
        <Text style={styles.location}>📍 {item.location_name}</Text>
      )}

      <View style={styles.priorityContainer}>
        <Text style={styles.priorityLabel}>
          Mức độ: {item.priority?.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Báo cáo của tôi</Text>

      <FlatList
        data={incidents}
        renderItem={renderIncident}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Bạn chưa báo cáo sự cố nào</Text>
          </View>
        }
      />
    </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContent: {
    padding: 12,
  },
  incidentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityLabel: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
