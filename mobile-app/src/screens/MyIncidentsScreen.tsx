import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface Incident {
    id: number;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at?: string;
    location_name?: string;
    image_urls?: string[];
}

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'in_progress', label: 'Đang xử lý' },
    { key: 'completed', label: 'Hoàn tất' },
];

const STATUS_LABELS: Record<string, string> = { pending: 'Chờ xử lý', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const STATUS_COLORS: Record<string, { background: string; color: string }> = {
    pending: { background: '#FFF0C9', color: '#A56B00' }, assigned: { background: '#DDE8FF', color: '#416DC5' }, in_progress: { background: '#FFF0C9', color: '#A56B00' }, completed: { background: '#DDF5E6', color: '#2F995D' }, rejected: { background: '#FDE4E4', color: '#B84A4A' },
};

const PRIORITY_LABELS: Record<string, string> = { low: 'Nhẹ', medium: 'Trung bình', high: 'Nghiêm trọng', critical: 'Khẩn cấp' };

const formatDate = (value?: string) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : `Cập nhật ${date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
};

export default function MyIncidentsScreen({ navigation }: any) {
    const { user } = useAuth();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadIncidents = useCallback(async () => {
        if (!user) return;
        try {
            const response = await apiClient.getUserIncidents(user.id, 1, 50);
            setIncidents(response.data || []);
        } catch {
            Alert.alert('Không thể tải báo cáo', 'Kiểm tra kết nối rồi thử lại.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useFocusEffect(useCallback(() => {
        loadIncidents();
    }, [loadIncidents]));

    const filteredIncidents = useMemo(() => filter === 'all' ? incidents : incidents.filter((incident) => incident.status === filter), [filter, incidents]);

    const renderIncident = ({ item }: { item: Incident }) => {
        const status = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
        return (
            <View style={styles.card}>
                <TouchableOpacity style={styles.cardPressArea} onPress={() => navigation.navigate('IncidentDetail', { id: item.id })} activeOpacity={0.85}>
                    {item.image_urls?.[0] ? <Image source={{ uri: item.image_urls[0] }} style={styles.thumbnail} /> : <View style={styles.thumbnailPlaceholder}><Text style={styles.placeholderIcon}>⌂</Text></View>}
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}><Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text><Text style={[styles.statusBadge, { backgroundColor: status.background, color: status.color }]}>{STATUS_LABELS[item.status] || item.status}</Text></View>
                        <Text style={styles.location} numberOfLines={1}>⌖ {item.location_name || 'Chưa cập nhật địa điểm'}</Text>
                        <Text style={styles.updated}>{formatDate(item.updated_at || item.created_at)}</Text>
                        <View style={styles.cardFooter}><Text style={styles.priority}><Text style={styles.priorityIcon}>ⓘ</Text> Mức độ: {PRIORITY_LABELS[item.priority] || 'Trung bình'}</Text><Text style={[styles.footerStatus, { backgroundColor: status.background, color: status.color }]}>{STATUS_LABELS[item.status] || item.status}</Text></View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item)} accessibilityLabel="Xóa báo cáo"><Text style={styles.deleteText}>Xóa</Text></TouchableOpacity>
            </View>
        );
    };

    const confirmDelete = (item: Incident) => Alert.alert('Xóa báo cáo?', 'Bạn có chắc muốn xóa báo cáo này không?', [{ text: 'Hủy', style: 'cancel' }, {
        text: 'Xóa', style: 'destructive', onPress: async () => {
            try { await apiClient.deleteIncident(item.id); setIncidents((current) => current.filter((incident) => incident.id !== item.id)); }
            catch (error: any) { Alert.alert('Không thể xóa', error.response?.data?.error || 'Vui lòng thử lại.'); }
        }
    }]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0A9D96" /><Text style={styles.loadingText}>Đang tải báo cáo...</Text></View>;

    return (
        <View style={styles.screen}>
            <View style={styles.header}><Text style={styles.headerTitle}>Báo cáo của tôi</Text><TouchableOpacity style={styles.filterButton} accessibilityLabel="Bộ lọc"><Text style={styles.filterIcon}>≡</Text></TouchableOpacity></View>
            <View style={styles.filterBar}>{FILTERS.map((item) => <TouchableOpacity key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}><Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
            <View style={styles.divider} />
            <FlatList data={filteredIncidents} renderItem={renderIncident} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadIncidents(); }} tintColor="#0A9D96" />} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>○</Text><Text style={styles.emptyTitle}>Chưa có báo cáo</Text><Text style={styles.emptyText}>Các báo cáo của bạn sẽ xuất hiện tại đây.</Text></View>} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F8FA' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FA' }, loadingText: { color: '#71838D', fontSize: 12, marginTop: 10 }, header: { height: 54, paddingHorizontal: 17, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { color: '#1B303C', fontSize: 17, fontWeight: '800' }, filterButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#DDE7EA', alignItems: 'center', justifyContent: 'center' }, filterIcon: { color: '#49606B', fontSize: 19, transform: [{ rotate: '90deg' }] }, filterBar: { height: 43, paddingHorizontal: 8, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 6 }, filterChip: { paddingHorizontal: 14, height: 28, borderRadius: 15, justifyContent: 'center', borderWidth: 1, borderColor: '#E5ECEE' }, filterChipActive: { backgroundColor: '#0A9D96', borderColor: '#0A9D96' }, filterText: { color: '#80909A', fontSize: 10, fontWeight: '600' }, filterTextActive: { color: '#FFF', fontWeight: '800' }, divider: { height: 1, backgroundColor: '#B9E7E3' }, listContent: { paddingHorizontal: 9, paddingTop: 10, paddingBottom: 20 }, card: { minHeight: 124, backgroundColor: '#FFF', borderRadius: 13, padding: 9, marginBottom: 11, shadowColor: '#1D5260', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, cardPressArea: { flex: 1, flexDirection: 'row' }, thumbnail: { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover', backgroundColor: '#DDEBEA', marginRight: 10 }, thumbnailPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#DDEBEA', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, placeholderIcon: { color: '#649096', fontSize: 26 }, cardContent: { flex: 1, minWidth: 0 }, titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 }, cardTitle: { color: '#283A44', flex: 1, fontSize: 12, fontWeight: '800', marginRight: 5 }, statusBadge: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden', fontSize: 8, fontWeight: '800' }, location: { color: '#667B86', fontSize: 9, marginBottom: 5 }, updated: { color: '#A3AFB5', fontSize: 9 }, cardFooter: { borderTopWidth: 1, borderTopColor: '#EFF3F4', marginTop: 8, paddingTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, priority: { color: '#4B7E7D', fontSize: 9, fontWeight: '600' }, priorityIcon: { color: '#099E96', fontSize: 11 }, footerStatus: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, fontSize: 8, fontWeight: '800' }, deleteButton: { alignSelf: 'center', marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FDE8E8' }, deleteText: { color: '#B84A4A', fontSize: 10, fontWeight: '800' }, expiredText: { alignSelf: 'center', color: '#9AA6AC', fontSize: 9, marginLeft: 8 }, empty: { alignItems: 'center', paddingTop: 80 }, emptyIcon: { color: '#7FCBC5', fontSize: 32 }, emptyTitle: { color: '#3B515C', fontSize: 15, fontWeight: '800', marginTop: 9 }, emptyText: { color: '#8B9AA2', fontSize: 11, marginTop: 5 },
});