import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiClient } from '../services/api';
import TrafficSignIcon from '../components/TrafficSignIcon';
import LanguageToggle from '../components/LanguageToggle';

interface Incident {
    id: number;
    title: string;
    status: string;
    priority?: string;
    created_at: string;
    location_name?: string;
    category_name?: string;
    image_urls?: string[];
}

const defaultCategories = [
    { id: 3, label: 'Ổ gà', background: '#FDE7E7' },
    { id: 1, label: 'Đèn đường', background: '#FFF2CC' },
    { id: 2, label: 'Ngập nước', background: '#DCEAFE' },
    { id: 4, label: 'Cống tắc', background: '#D9F6E9' },
];
const categoryColors = ['#FDE7E7', '#FFF2CC', '#DCEAFE', '#D9F6E9', '#EFE6FD', '#E2F5EA'];

const statusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    assigned: 'Đã tiếp nhận',
    in_progress: 'Đang xử lý',
    completed: 'Hoàn tất',
    rejected: 'Từ chối',
};
const statusColors: Record<string, { background: string; color: string }> = {
    pending: { background: '#FFF1CE', color: '#A86F00' },
    assigned: { background: '#E0EAFF', color: '#416DC5' },
    in_progress: { background: '#FFF1CE', color: '#A86F00' },
    completed: { background: '#DDF5E7', color: '#2F9B60' },
    rejected: { background: '#FDE4E4', color: '#B84A4A' },
};

const hotlines = [
    { number: '1022', label: 'Hạ tầng 1022', icon: 'construct-outline', bg: '#E6F7F5', color: '#0A9D96' },
    { number: '114', label: 'Cứu hỏa 114', icon: 'flame-outline', bg: '#FEE2E2', color: '#DC2626' },
    { number: '115', label: 'Cấp cứu 115', icon: 'medkit-outline', bg: '#DBEAFE', color: '#2563EB' },
    { number: '113', label: 'An ninh 113', icon: 'shield-checkmark-outline', bg: '#FEF3C7', color: '#D97706' },
] as const;

const formatDate = (value: string, language: 'vi' | 'en') => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? (language === 'vi' ? 'Gần đây' : 'Recently')
        : date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const cleanLocation = (value: string | undefined, language: 'vi' | 'en') => {
    if (!value) return language === 'vi' ? 'Chưa cập nhật địa điểm' : 'Location not provided';
    const parts = value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    return Array.from(new Set(parts)).join(', ');
};

export default function HomeScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { language, t, translateCategory } = useLanguage();
    const [allUserIncidents, setAllUserIncidents] = useState<Incident[]>([]);
    const [communityIncidents, setCommunityIncidents] = useState<Incident[]>([]);
    const [reportCategories, setReportCategories] = useState(defaultCategories);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoadError, setHasLoadError] = useState(false);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await apiClient.getCategories();
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setReportCategories(
                        response.data.map((item, index) => ({
                            id: item.id,
                            label: item.name,
                            background: categoryColors[index % categoryColors.length],
                        }))
                    );
                }
            } catch {
                setReportCategories(defaultCategories);
            }
        };
        void loadCategories();
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const [userRes, nearbyRes] = await Promise.allSettled([
                apiClient.getUserIncidents(user.id, 1, 50),
                apiClient.getIncidents(1, 6),
            ]);

            if (userRes.status === 'fulfilled') {
                setAllUserIncidents(userRes.value.data || []);
                setHasLoadError(false);
            } else {
                setAllUserIncidents([]);
                setHasLoadError(true);
            }

            if (nearbyRes.status === 'fulfilled') {
                setCommunityIncidents(nearbyRes.value.data || []);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            void loadData();
        }, [loadData])
    );

    const summary = useMemo(() => {
        const total = allUserIncidents.length;
        const processing = allUserIncidents.filter((item) =>
            ['pending', 'assigned', 'in_progress'].includes(item.status)
        ).length;
        const completed = allUserIncidents.filter((item) => item.status === 'completed').length;
        return { total, processing, completed };
    }, [allUserIncidents]);

    const visibleIncidents = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = query
            ? allUserIncidents.filter((item) =>
                `${item.title} ${item.location_name || ''}`.toLowerCase().includes(query)
            )
            : allUserIncidents;
        return filtered.slice(0, 3);
    }, [allUserIncidents, search]);

    const navigateToTab = (tab: string) => navigation.getParent?.()?.navigate(tab);
    const navigateToReports = () => navigation.getParent?.()?.navigate('MyIncidents');

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: Math.max(insets.top + 12, 24) },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            void loadData();
                        }}
                        tintColor="#0D9F9A"
                    />
                }
            >
                {/* Top Greeting Bar */}
                <View style={styles.topBar}>
                    <View>
                        <View style={styles.cityBadge}>
                            <Ionicons name="location" size={12} color="#0A9D96" />
                            <Text style={styles.cityBadgeText}>{t('TP. Hồ Chí Minh · Đô thị số', 'Ho Chi Minh City · Digital City')}</Text>
                        </View>
                        <Text style={styles.greeting}>{t('Xin chào', 'Hello')}, {user?.full_name || t('Bạn', 'there')}!</Text>
                    </View>
                    <View style={styles.topActions}>
                        <LanguageToggle />
                        <TouchableOpacity
                            style={styles.avatarButton}
                            onPress={() => navigateToTab('Profile')}
                            accessibilityLabel={t('Mở hồ sơ', 'Open profile')}
                        >
                            {user?.avatar_url ? (
                                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {(user?.full_name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dashboard Summary Banner */}
                <View style={styles.dashboardBanner}>
                    <View style={styles.dashboardHeaderRow}>
                        <View>
                            <Text style={styles.dashboardTitle}>{t('Tổng quan phản ánh của bạn', 'Your Reports at a Glance')}</Text>
                            <Text style={styles.dashboardSubtitle}>
                                {t('Cập nhật trực tiếp từ Trung tâm Điều hành UIRMS', 'Live updates from the UIRMS Operations Center')}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.dashboardAction} onPress={navigateToReports}>
                            <Text style={styles.dashboardActionText}>{t('Chi tiết ›', 'Details ›')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{summary.total}</Text>
                            <Text style={styles.statLabel}>{t('Đã gửi', 'Submitted')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#FBBF24' }]}>{summary.processing}</Text>
                            <Text style={styles.statLabel}>{t('Đang xử lý', 'In Progress')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#34D399' }]}>{summary.completed}</Text>
                            <Text style={styles.statLabel}>{t('Hoàn tất', 'Completed')}</Text>
                        </View>
                    </View>
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={19} color="#8B9AA6" style={{ marginRight: 8 }} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('Tìm kiếm báo cáo, tên đường, sự cố...', 'Search reports, streets, or incidents...')}
                        placeholderTextColor="#9AA8B6"
                        style={styles.searchInput}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#9AA8B6" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* AI Assistant Card */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('AIChat')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={styles.aiBanner}
                >
                    <View style={styles.aiIconBox}>
                        <Text style={{ fontSize: 21 }}>🤖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.aiTitle}>{t('Trợ lý AI Đô thị 24/7', '24/7 Urban AI Assistant')}</Text>
                            <View style={styles.aiLiveBadge}>
                                <Text style={styles.aiLiveText}>AI</Text>
                            </View>
                        </View>
                        <Text style={styles.aiSubtitle}>
                            {t('Tra cứu tiến độ tự động, hỏi SLA & tư vấn phân loại sự cố', 'Check report status, ask about SLAs, and get incident category guidance')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0A9D96" />
                </TouchableOpacity>

                {/* Quick Report Categories */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('Danh mục báo cáo nhanh', 'Quick Report Categories')}</Text>
                    <Text style={styles.sectionHint}>{t('Chạm để tạo phản ánh', 'Tap to create a report')}</Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    decelerationRate="fast"
                    style={{ marginHorizontal: -20, marginBottom: 26 }}
                    contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 20 }}
                >
                    {reportCategories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[styles.categoryItem, { width: 78, flexShrink: 0, marginRight: 12 }]}
                            onPress={() => navigation.navigate('ReportIncident', { categoryId: category.id })}
                        >
                            <View style={[styles.categoryIcon, { backgroundColor: category.background }]}>
                                <TrafficSignIcon categoryName={category.label} size={44} />
                            </View>
                            <Text style={styles.categoryLabel} numberOfLines={2}>
                                {translateCategory(category.label)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* User's Recent Incidents */}
                <View style={[styles.sectionHeader, styles.recentHeader]}>
                    <Text style={styles.sectionTitle}>{t('Báo cáo gần đây của bạn', 'Your Recent Reports')}</Text>
                    <TouchableOpacity onPress={navigateToReports}>
                        <Text style={styles.viewAll}>{t('Xem tất cả', 'View all')} ({allUserIncidents.length})</Text>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <View style={styles.stateBox}>
                        <ActivityIndicator color="#0D9F9A" />
                        <Text style={styles.stateText}>{t('Đang tải báo cáo...', 'Loading reports...')}</Text>
                    </View>
                ) : visibleIncidents.length === 0 ? (
                    <View style={styles.stateBox}>
                        <Ionicons name="document-text-outline" size={32} color="#8BC8C3" />
                        <Text style={styles.stateText}>
                            {search ? t('Không tìm thấy báo cáo phù hợp', 'No matching reports found') : t('Bạn chưa có báo cáo nào', 'You have no reports yet')}
                        </Text>
                    </View>
                ) : (
                    visibleIncidents.map((incident) => {
                        const status = statusColors[incident.status] || statusColors.pending;
                        return (
                            <TouchableOpacity
                                key={incident.id}
                                style={styles.incidentCard}
                                onPress={() => navigation.navigate('IncidentDetail', { id: incident.id })}
                            >
                                {incident.image_urls?.[0] ? (
                                    <Image source={{ uri: incident.image_urls[0] }} style={styles.incidentThumb} />
                                ) : (
                                    <View style={styles.incidentThumb}>
                                        <TrafficSignIcon
                                            categoryName={incident.category_name || incident.title}
                                            size={46}
                                        />
                                    </View>
                                )}
                                <View style={styles.incidentBody}>
                                    <View style={styles.incidentTitleRow}>
                                        <Text style={styles.incidentTitle} numberOfLines={1}>
                                            {incident.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: status.background, color: status.color },
                                            ]}
                                        >
                                            {t(statusLabels[incident.status] || incident.status, ({
                                                pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
                                            } as Record<string, string>)[incident.status] || incident.status)}
                                        </Text>
                                    </View>
                                    <Text style={styles.location} numberOfLines={1}>
                                        ⌖ {cleanLocation(incident.location_name, language)}
                                    </Text>
                                    <View style={styles.incidentMetaRow}>
                                        <Text style={styles.date}>{t('Mã #BC-', 'Report #INC-')}{incident.id}</Text>
                                        <Text style={styles.date}>{formatDate(incident.created_at, language)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Community Incidents Feed */}
                {communityIncidents.length > 0 && (
                    <View style={{ marginTop: 18 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('Phản ánh cộng đồng mới nhất', 'Latest Community Reports')}</Text>
                            <Text style={styles.sectionHint}>{t('Toàn thành phố', 'Across the city')}</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginHorizontal: -20, marginBottom: 22 }}
                            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                        >
                            {communityIncidents.slice(0, 5).map((item) => {
                                const status = statusColors[item.status] || statusColors.pending;
                                return (
                                    <TouchableOpacity
                                        key={`comm-${item.id}`}
                                        style={styles.communityCard}
                                        onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
                                        activeOpacity={0.85}
                                    >
                                        <View style={styles.communityTopRow}>
                                            <Text style={styles.communityCode}>{t('#BC-', '#INC-')}{item.id}</Text>
                                            <Text
                                                style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: status.background, color: status.color },
                                                ]}
                                            >
                                                {t(statusLabels[item.status] || item.status, ({
                                                    pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
                                                } as Record<string, string>)[item.status] || item.status)}
                                            </Text>
                                        </View>
                                        <Text style={styles.communityTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.communityLocation} numberOfLines={1}>
                                            ⌖ {cleanLocation(item.location_name, language)}
                                        </Text>
                                        <Text style={styles.communityDate}>{formatDate(item.created_at, language)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Emergency Urban Hotlines */}
                <View style={{ marginTop: 6 }}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('Đường dây nóng Đô thị', 'City Emergency Hotlines')}</Text>
                        <Text style={styles.sectionHint}>{t('Chạm để gọi khẩn cấp', 'Tap to call')}</Text>
                    </View>
                    <View style={styles.hotlineGrid}>
                        {hotlines.map((item) => (
                            <TouchableOpacity
                                key={item.number}
                                style={styles.hotlineCard}
                                onPress={() => void Linking.openURL(`tel:${item.number}`)}
                            >
                                <View style={[styles.hotlineIcon, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <Text style={styles.hotlineLabel}>{t(item.label, ({
                                    'Hạ tầng 1022': 'Infrastructure 1022',
                                    'Cứu hỏa 114': 'Fire and Rescue 114',
                                    'Cấp cứu 115': 'Medical Emergency 115',
                                    'An ninh 113': 'Police 113',
                                } as Record<string, string>)[item.label] || item.label)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {hasLoadError && (
                    <Text style={styles.offlineNote}>{t('Không thể tải báo cáo. Kéo xuống để thử lại.', 'Unable to load reports. Pull down to try again.')}</Text>
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => navigation.navigate('ReportIncident')}
                activeOpacity={0.85}
            >
                <Text style={styles.plus}>＋</Text>
                <Text style={styles.floatingText}>{t('Báo cáo mới', 'New Report')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F8FA' },
    content: { paddingHorizontal: 20, paddingBottom: 110 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    languageButton: { borderRadius: 18, borderWidth: 1, borderColor: '#BCE6E1', backgroundColor: '#FFF', paddingHorizontal: 9, paddingVertical: 8 },
    languageButtonText: { color: '#087F7A', fontSize: 11, fontWeight: '800' },
    cityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    cityBadgeText: { color: '#0A9D96', fontSize: 12, fontWeight: '700' },
    greeting: { color: '#142532', fontSize: 22, fontWeight: '800' },
    avatarButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#D8F4F0',
        borderWidth: 1.5,
        borderColor: '#0D9F9A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    avatarText: { color: '#0D918D', fontSize: 16, fontWeight: '800' },
    dashboardBanner: {
        backgroundColor: '#0F2A3D',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#0F2A3D',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
    },
    dashboardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    dashboardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    dashboardSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
    dashboardAction: {
        backgroundColor: 'rgba(10, 157, 150, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    dashboardActionText: { color: '#5EEAD4', fontSize: 11, fontWeight: '700' },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 13,
        paddingVertical: 11,
        alignItems: 'center',
    },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.14)' },
    statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    statLabel: { color: '#CBD5E1', fontSize: 11, marginTop: 2, fontWeight: '600' },
    searchBox: {
        height: 46,
        backgroundColor: '#FFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5EDF1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    searchInput: { flex: 1, color: '#21323D', fontSize: 13, paddingVertical: 0 },
    aiBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#E8F7F5',
        borderWidth: 1,
        borderColor: '#BCE6E1',
    },
    aiIconBox: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: '#0A9D96',
        marginRight: 12,
    },
    aiTitle: { color: '#0F524F', fontSize: 14, fontWeight: '800' },
    aiLiveBadge: {
        backgroundColor: '#0A9D96',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    aiLiveText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    aiSubtitle: { marginTop: 3, color: '#476E6B', fontSize: 11 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: { color: '#1D2D39', fontSize: 15, fontWeight: '800' },
    sectionHint: { color: '#8C9BA5', fontSize: 11 },
    categoryItem: { alignItems: 'center' },
    categoryIcon: {
        width: 54,
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 7,
    },
    categoryLabel: { color: '#40515D', fontSize: 11, fontWeight: '600', textAlign: 'center' },
    recentHeader: { marginBottom: 12 },
    viewAll: { color: '#078E8A', fontSize: 12, fontWeight: '700' },
    incidentCard: {
        backgroundColor: '#FFF',
        minHeight: 86,
        borderRadius: 15,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 11,
        borderWidth: 1,
        borderColor: '#EDF2F5',
        shadowColor: '#1A4553',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    incidentThumb: {
        width: 66,
        height: 66,
        borderRadius: 12,
        backgroundColor: '#E6F2F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 11,
    },
    incidentBody: { flex: 1, minWidth: 0 },
    incidentTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    incidentTitle: { flex: 1, color: '#1E293B', fontSize: 13, fontWeight: '800', marginRight: 6 },
    statusBadge: {
        overflow: 'hidden',
        borderRadius: 7,
        paddingHorizontal: 7,
        paddingVertical: 3,
        fontSize: 9,
        fontWeight: '800',
    },
    location: { color: '#64748B', fontSize: 11, marginBottom: 6 },
    incidentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    date: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
    communityCard: {
        width: 215,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 13,
        borderWidth: 1,
        borderColor: '#E5EDF1',
    },
    communityTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    communityCode: { color: '#0A9D96', fontSize: 11, fontWeight: '800' },
    communityTitle: { color: '#1E293B', fontSize: 13, fontWeight: '700', minHeight: 36 },
    communityLocation: { color: '#64748B', fontSize: 10, marginTop: 6 },
    communityDate: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
    hotlineGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 14,
    },
    hotlineCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 13,
        paddingVertical: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8EEF2',
    },
    hotlineIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    hotlineLabel: { color: '#334155', fontSize: 10, fontWeight: '700', textAlign: 'center' },
    stateBox: {
        minHeight: 100,
        backgroundColor: '#FFF',
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    stateText: { color: '#84939E', fontSize: 12, marginTop: 8 },
    offlineNote: { color: '#9AA8B6', textAlign: 'center', fontSize: 11, marginTop: 2 },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 18,
        height: 48,
        paddingHorizontal: 18,
        borderRadius: 24,
        backgroundColor: '#0A9D96',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#087873',
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    plus: { color: '#FFF', fontSize: 22, lineHeight: 24, marginRight: 6 },
    floatingText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});