import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import TrafficSignIcon from '../components/TrafficSignIcon';
import { useLanguage } from '../context/LanguageContext';

interface Incident {
    id: number;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at?: string;
    location_name?: string;
    category_name?: string;
    image_urls?: string[];
}

const FILTERS = [
    { key: 'all' },
    { key: 'pending' },
    { key: 'in_progress' },
    { key: 'completed' },
    { key: 'rejected' },
];

const STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ xử lý',
    assigned: 'Đã tiếp nhận',
    in_progress: 'Đang xử lý',
    completed: 'Hoàn tất',
    rejected: 'Từ chối',
};
const STATUS_COLORS: Record<string, { background: string; color: string }> = {
    pending: { background: '#FFF0C9', color: '#A56B00' },
    assigned: { background: '#DDE8FF', color: '#416DC5' },
    in_progress: { background: '#FFF0C9', color: '#A56B00' },
    completed: { background: '#DDF5E6', color: '#2F995D' },
    rejected: { background: '#FDE4E4', color: '#B84A4A' },
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Nhẹ',
    medium: 'Trung bình',
    high: 'Nghiêm trọng',
    critical: 'Khẩn cấp',
};

const formatDate = (value: string | undefined, language: 'vi' | 'en', t: (vi: string, en: string) => string) => {
    if (!value) return t('Chưa cập nhật', 'Not updated');
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? t('Chưa cập nhật', 'Not updated')
        : `${t('Cập nhật', 'Updated')} ${date.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`;
};

const cleanLocation = (value: string | undefined, t: (vi: string, en: string) => string) => {
    if (!value) return t('Chưa cập nhật địa điểm', 'Location not provided');
    const parts = value
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    return Array.from(new Set(parts)).join(', ');
};

export default function MyIncidentsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { language, t } = useLanguage();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

    const loadIncidents = useCallback(async () => {
        if (!user) return;
        try {
            const response = await apiClient.getUserIncidents(user.id, 1, 50);
            setIncidents(response.data || []);
        } catch {
            Alert.alert(t('Không thể tải báo cáo', 'Unable to load reports'), t('Kiểm tra kết nối rồi thử lại.', 'Check your connection and try again.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, t]);

    useFocusEffect(
        useCallback(() => {
            void loadIncidents();
        }, [loadIncidents])
    );

    const counts = useMemo(() => {
        const map: Record<string, number> = { all: incidents.length };
        FILTERS.slice(1).forEach(({ key }) => {
            map[key] = incidents.filter((item) =>
                key === 'in_progress'
                    ? item.status === 'in_progress' || item.status === 'assigned'
                    : item.status === key
            ).length;
        });
        return map;
    }, [incidents]);

    const filteredIncidents = useMemo(
        () =>
            filter === 'all'
                ? incidents
                : incidents.filter((incident) =>
                    filter === 'in_progress'
                        ? incident.status === 'in_progress' || incident.status === 'assigned'
                        : incident.status === filter
                ),
        [filter, incidents]
    );

    const confirmDelete = (item: Incident) =>
        Alert.alert(t('Xóa báo cáo?', 'Delete report?'), t('Bạn có chắc muốn xóa báo cáo này không?', 'Are you sure you want to delete this report?'), [
            { text: t('Hủy', 'Cancel'), style: 'cancel' },
            {
                text: t('Xóa', 'Delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiClient.deleteIncident(item.id);
                        setIncidents((current) => current.filter((incident) => incident.id !== item.id));
                    } catch (error: any) {
                        Alert.alert(t('Không thể xóa', 'Unable to delete'), error.response?.data?.error || t('Vui lòng thử lại.', 'Please try again.'));
                    }
                },
            },
        ]);

    const renderIncident = ({ item }: { item: Incident }) => {
        const status = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
        const thumbUri = item.image_urls?.find((url) => Boolean(url) && !failedImages[url]);
        return (
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.cardPressArea}
                    onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
                    activeOpacity={0.85}
                >
                    {thumbUri ? (
                        <Image
                            source={{ uri: thumbUri }}
                            style={styles.thumbnail}
                            onError={() =>
                                setFailedImages((prev) => ({ ...prev, [thumbUri]: true }))
                            }
                        />
                    ) : (
                        <View style={styles.thumbnailPlaceholder}>
                            <TrafficSignIcon categoryName={item.category_name || item.title} size={42} />
                        </View>
                    )}
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: status.background, color: status.color },
                                ]}
                            >
                                {t(STATUS_LABELS[item.status] || item.status, ({
                                    pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
                                } as Record<string, string>)[item.status] || item.status)}
                            </Text>
                        </View>
                        <Text style={styles.location} numberOfLines={1}>
                            ⌖ {cleanLocation(item.location_name, t)}
                        </Text>
                        <Text style={styles.updated}>
                            {t('Mã #BC-', 'Report #INC-')}{item.id} · {formatDate(item.updated_at || item.created_at, language, t)}
                        </Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.priority}>
                                <Text style={styles.priorityIcon}>ⓘ</Text> {t('Mức độ:', 'Severity:')}{' '}
                                {t(PRIORITY_LABELS[item.priority] || 'Trung bình', ({
                                    Nhẹ: 'Low', 'Trung bình': 'Medium', 'Nghiêm trọng': 'High', 'Khẩn cấp': 'Critical',
                                } as Record<string, string>)[PRIORITY_LABELS[item.priority] || 'Trung bình'])}
                            </Text>
                            {item.status === 'pending' ? (
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => confirmDelete(item)}
                                    accessibilityLabel={t('Xóa báo cáo', 'Delete report')}
                                >
                                    <Ionicons name="trash-outline" size={12} color="#B84A4A" />
                                    <Text style={styles.deleteText}>{t('Xóa', 'Delete')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.detailLink}>{t('Xem tiến trình ›', 'View progress ›')}</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0A9D96" />
                <Text style={styles.loadingText}>{t('Đang tải báo cáo...', 'Loading reports...')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{t('Báo cáo của tôi', 'My Reports')}</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {t('Theo dõi tiến độ xử lý các phản ánh đã gửi', 'Track the progress of your submitted reports')} ({incidents.length})
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.newReportBtn}
                    onPress={() => navigation.getParent()?.navigate('Home', { screen: 'ReportIncident' })}
                >
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.newReportBtnText}>{t('Tạo mới', 'New Report')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterBar}
            >
                {FILTERS.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => setFilter(item.key)}
                        style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
                    >
                        <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                            {t(({
                                all: 'Tất cả', pending: 'Chờ xử lý', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối',
                            } as Record<string, string>)[item.key], ({
                                all: 'All', pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
                            } as Record<string, string>)[item.key])} ({counts[item.key] ?? 0})
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <View style={styles.divider} />

            <FlatList
                data={filteredIncidents}
                renderItem={renderIncident}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            void loadIncidents();
                        }}
                        tintColor="#0A9D96"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="folder-open-outline" size={40} color="#7FCBC5" />
                        <Text style={styles.emptyTitle}>{t('Chưa có báo cáo trong mục này', 'No reports in this category yet')}</Text>
                        <Text style={styles.emptyText}>
                            {t('Các phản ánh sự cố đô thị của bạn sẽ hiển thị tại đây.', 'Your urban incident reports will appear here.')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F8FA' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FA' },
    loadingText: { color: '#71838D', fontSize: 12, marginTop: 10 },
    header: {
        paddingHorizontal: 18,
        paddingBottom: 12,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTextWrap: {
        flex: 1,
        minWidth: 0,
        paddingRight: 12,
    },
    headerTitle: { color: '#142532', fontSize: 20, fontWeight: '800', lineHeight: 28 },
    headerSubtitle: { color: '#64748B', fontSize: 11, marginTop: 2 },
    newReportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A9D96',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
        flexShrink: 0,
    },
    newReportBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    filterScroll: { flexGrow: 0, backgroundColor: '#FFF' },
    filterBar: {
        height: 46,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 13,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    filterChipActive: { backgroundColor: '#0A9D96', borderColor: '#0A9D96' },
    filterText: { color: '#64748B', fontSize: 11, fontWeight: '600' },
    filterTextActive: { color: '#FFF', fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#E2E8F0' },
    listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 12,
        marginBottom: 11,
        borderWidth: 1,
        borderColor: '#EDF2F7',
        shadowColor: '#1D5260',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    cardPressArea: { flexDirection: 'row' },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 11,
        resizeMode: 'cover',
        backgroundColor: '#DDEBEA',
        marginRight: 12,
    },
    thumbnailPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 11,
        backgroundColor: '#E6F4F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardContent: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    cardTitle: { color: '#1E293B', flex: 1, fontSize: 14, fontWeight: '800', marginRight: 6 },
    statusBadge: {
        borderRadius: 7,
        paddingHorizontal: 8,
        paddingVertical: 4,
        overflow: 'hidden',
        fontSize: 9,
        fontWeight: '800',
    },
    location: { color: '#64748B', fontSize: 11, marginBottom: 4 },
    updated: { color: '#94A3B8', fontSize: 10 },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        marginTop: 9,
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priority: { color: '#475569', fontSize: 11, fontWeight: '600' },
    priorityIcon: { color: '#099E96', fontSize: 12 },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#FDE8E8',
    },
    deleteText: { color: '#B84A4A', fontSize: 11, fontWeight: '800' },
    detailLink: { color: '#0A9D96', fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { color: '#334155', fontSize: 15, fontWeight: '800', marginTop: 10 },
    emptyText: { color: '#94A3B8', fontSize: 12, marginTop: 5 },
});