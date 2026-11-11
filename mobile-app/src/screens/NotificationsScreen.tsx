/**
 * Notifications Screen
 * View notifications from admin with filter & deep navigation
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface Notification {
  id: number;
  incident_id?: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: string;
}

const TYPE_META: Record<
  string,
  { vi: string; en: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  status_update: {
    vi: 'Cập nhật trạng thái',
    en: 'Status Update',
    color: '#0A9D96',
    bg: '#E6F7F5',
    icon: 'sync-circle-outline',
  },
  new_reply: {
    vi: 'Phản hồi từ Điều phối viên',
    en: 'Response from Coordinator',
    color: '#2563EB',
    bg: '#DBEAFE',
    icon: 'chatbubble-ellipses-outline',
  },
  reminder: {
    vi: 'Nhắc nhở',
    en: 'Reminder',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: 'alarm-outline',
  },
  system: {
    vi: 'Hệ thống UIRMS',
    en: 'UIRMS System',
    color: '#475569',
    bg: '#F1F5F9',
    icon: 'notifications-outline',
  },
};

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiClient.getNotifications(1, 50);
      setNotifications(response.data || []);
    } catch {
      Alert.alert(t('Lỗi', 'Error'), t('Không thể tải thông báo', 'Unable to load notifications'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.getUnreadCount();
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
      void loadUnreadCount();
    }, [loadNotifications, loadUnreadCount])
  );

  const handlePressNotification = async (item: Notification) => {
    if (!item.is_read) {
      try {
        await apiClient.markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore read update error and still navigate if incident_id exists
      }
    }

    if (item.incident_id) {
      navigation.navigate('Home', {
        screen: 'IncidentDetail',
        params: { id: item.incident_id },
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert(t('Lỗi', 'Error'), t('Không thể đánh dấu đã đọc tất cả.', 'Unable to mark all notifications as read.'));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications();
    void loadUnreadCount();
  };

  const visibleNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [filter, notifications]
  );

  const renderNotification = ({ item }: { item: Notification }) => {
    const meta = TYPE_META[item.notification_type] || TYPE_META.system;
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => void handlePressNotification(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.typeText, { color: meta.color }]}>{t(meta.vi, meta.en)}</Text>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {language === 'vi' && /^Incident #INC-(\d+) Updated$/i.test(item.title)
            ? `Cập nhật sự cố #INC-${item.title.match(/^Incident #INC-(\d+) Updated$/i)?.[1]}`
            : language === 'en' && /^Cập nhật báo cáo BC-(\d+)$/i.test(item.title)
              ? `Incident #INC-${item.title.match(/^Cập nhật báo cáo BC-(\d+)$/i)?.[1]} Updated`
              : item.title}
        </Text>

        <Text style={styles.message}>
          {language === 'vi' && item.message.startsWith('Your report was rejected. Reason: ')
            ? `Báo cáo của bạn đã bị từ chối. Lý do: ${item.message.slice('Your report was rejected. Reason: '.length)}`
            : language === 'vi' && /^Your report status has been updated to: (.+)\.$/.test(item.message)
              ? `Trạng thái báo cáo của bạn đã được cập nhật: ${
                ({
                  Pending: 'Chờ xử lý',
                  Assigned: 'Đã tiếp nhận',
                  'In Progress': 'Đang xử lý',
                  Completed: 'Hoàn tất',
                  Rejected: 'Từ chối',
                } as Record<string, string>)[item.message.match(/^Your report status has been updated to: (.+)\.$/)?.[1] || ''] ||
                item.message.match(/^Your report status has been updated to: (.+)\.$/)?.[1]
              }.`
              : language === 'en' && item.message.startsWith('Báo cáo đã bị từ chối. Lý do: ')
                ? `Your report was rejected. Reason: ${item.message.slice('Báo cáo đã bị từ chối. Lý do: '.length)}`
                : language === 'en' && /^Trạng thái báo cáo đã được cập nhật: (.+)\.$/.test(item.message)
                  ? `Your report status has been updated to: ${
                    ({
                      'Chờ xử lý': 'Pending',
                      'Đã tiếp nhận': 'Assigned',
                      'Đang xử lý': 'In Progress',
                      'Hoàn tất': 'Completed',
                      'Từ chối': 'Rejected',
                    } as Record<string, string>)[item.message.match(/^Trạng thái báo cáo đã được cập nhật: (.+)\.$/)?.[1] || ''] ||
                    item.message.match(/^Trạng thái báo cáo đã được cập nhật: (.+)\.$/)?.[1]
                  }.`
                  : item.message}
        </Text>

        {item.incident_id && (
          <View style={styles.cardFooter}>
            <Text style={styles.linkText}>{t('Xem chi tiết báo cáo #BC-', 'View report #INC-')}{item.incident_id} ›</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0A9D96" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{t('Thông báo', 'Notifications')}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} {t('mới', 'new')}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => void handleMarkAllRead()} style={styles.readAllBtn}>
            <Ionicons name="checkmark-done-outline" size={16} color="#0A9D96" />
            <Text style={styles.readAllText}>{t('Đọc tất cả', 'Mark all as read')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            {t('Tất cả', 'All')} ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            {t('Chưa đọc', 'Unread')} ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A9D96" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {filter === 'unread'
                ? t('Bạn đã đọc hết tất cả thông báo', 'You are all caught up')
                : t('Chưa có thông báo nào từ hệ thống', 'There are no system notifications yet')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#142532' },
  unreadBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E6F7F5',
  },
  readAllText: { color: '#0A9D96', fontSize: 12, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EDF1',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#0A9D96', borderColor: '#0A9D96' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFF', fontWeight: '800' },
  listContent: { padding: 14 },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 11,
    borderLeftWidth: 4,
    borderLeftColor: '#CBD5E1',
    borderWidth: 1,
    borderColor: '#EBF1F4',
  },
  unreadCard: {
    backgroundColor: '#F0FDFB',
    borderLeftColor: '#0A9D96',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { fontSize: 11, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timestamp: { fontSize: 11, color: '#94A3B8' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0A9D96' },
  title: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  message: { fontSize: 13, color: '#475569', lineHeight: 19 },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  linkText: { fontSize: 12, fontWeight: '700', color: '#0A9D96' },
  emptyContainer: { alignItems: 'center', paddingTop: 70 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10, fontWeight: '600' },
});