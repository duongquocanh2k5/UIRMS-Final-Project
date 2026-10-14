import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface Incident {
    id: number;
    title: string;
    status: string;
    created_at: string;
    location_name?: string;
    image_urls?: string[];
}

const categories = [
    { id: 3, label: 'Ổ gà', icon: '⊗', background: '#FDE7E7', color: '#B84A4A' },
    { id: 1, label: 'Đèn đường', icon: '△', background: '#FFF2CC', color: '#9B761A' },
    { id: 2, label: 'Ngập nước', icon: '≋', background: '#DCEAFE', color: '#3569A8' },
    { id: 4, label: 'Cống tắc', icon: '⊗', background: '#D9F6E9', color: '#27845E' },
];

const statusLabels: Record<string, string> = { pending: 'Chờ xử lý', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const statusColors: Record<string, { background: string; color: string }> = {
    pending: { background: '#FFF1CE', color: '#A86F00' }, assigned: { background: '#E0EAFF', color: '#416DC5' }, in_progress: { background: '#FFF1CE', color: '#A86F00' }, completed: { background: '#DDF5E7', color: '#2F9B60' }, rejected: { background: '#FDE4E4', color: '#B84A4A' },
};

const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Gần đây' : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function HomeScreen({ navigation }: any) {
    const { user } = useAuth();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoadError, setHasLoadError] = useState(false);

    const loadIncidents = useCallback(async () => {
        if (!user) return;
        try {
            const response = await apiClient.getUserIncidents(user.id, 1, 3);
            setIncidents(response.data || []);
            setHasLoadError(false);
        } catch {
            setIncidents([]);
            setHasLoadError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useFocusEffect(useCallback(() => {
        loadIncidents();
    }, [loadIncidents]));

    const visibleIncidents = useMemo(() => {
        const query = search.trim().toLowerCase();
        return query ? incidents.filter((item) => `${item.title} ${item.location_name || ''}`.toLowerCase().includes(query)) : incidents;
    }, [incidents, search]);

    const navigateToTab = (tab: string) => navigation.getParent?.()?.navigate(tab);
    const navigateToReports = () => navigation.getParent?.()?.navigate('MyIncidents');

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadIncidents(); }} tintColor="#0D9F9A" />}>
                <View style={styles.topBar}>
                    <View><Text style={styles.eyebrow}>Xin chào 👋</Text><Text style={styles.greeting}>{user?.full_name || 'Bạn'}!</Text></View>
                    <TouchableOpacity style={styles.avatarButton} onPress={() => navigateToTab('Profile')} accessibilityLabel="Mở hồ sơ">
                        {user?.avatar_url ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} /> : <Text style={styles.avatarText}>{(user?.full_name || 'U').charAt(0).toUpperCase()}</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Tìm kiếm báo cáo, sự cố..." placeholderTextColor="#9AA8B6" style={styles.searchInput} returnKeyType="search" /><Text style={styles.filterIcon}>≡</Text></View>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Danh mục báo cáo nhanh</Text><Text style={styles.sectionHint}>Chọn loại sự cố</Text></View>
                <View style={styles.categoryRow}>{categories.map((category) => <TouchableOpacity key={category.id} style={styles.categoryItem} onPress={() => navigation.navigate('ReportIncident', { categoryId: category.id })}><View style={[styles.categoryIcon, { backgroundColor: category.background }]}><Text style={[styles.categoryGlyph, { color: category.color }]}>{category.icon}</Text></View><Text style={styles.categoryLabel}>{category.label}</Text></TouchableOpacity>)}</View>

                <View style={[styles.sectionHeader, styles.recentHeader]}><Text style={styles.sectionTitle}>Báo cáo gần đây của bạn</Text><TouchableOpacity onPress={navigateToReports}><Text style={styles.viewAll}>Xem tất cả</Text></TouchableOpacity></View>
                {loading ? <View style={styles.stateBox}><ActivityIndicator color="#0D9F9A" /><Text style={styles.stateText}>Đang tải báo cáo...</Text></View> : visibleIncidents.length === 0 ? <View style={styles.stateBox}><Text style={styles.emptyIcon}>○</Text><Text style={styles.stateText}>{search ? 'Không tìm thấy báo cáo phù hợp' : 'Bạn chưa có báo cáo nào'}</Text></View> : visibleIncidents.map((incident) => { const status = statusColors[incident.status] || statusColors.pending; return <TouchableOpacity key={incident.id} style={styles.incidentCard} onPress={() => navigation.navigate('IncidentDetail', { id: incident.id })}>{incident.image_urls?.[0] ? <Image source={{ uri: incident.image_urls[0] }} style={styles.incidentThumb} /> : <View style={styles.incidentThumb}><Text style={styles.thumbIcon}>{incident.status === 'completed' ? '≋' : '⌂'}</Text></View>}<View style={styles.incidentBody}><View style={styles.incidentTitleRow}><Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text><Text style={[styles.statusBadge, { backgroundColor: status.background, color: status.color }]}>{statusLabels[incident.status] || incident.status}</Text></View><Text style={styles.location} numberOfLines={1}>⌖ {incident.location_name || 'Chưa cập nhật địa điểm'}</Text><Text style={styles.date}>{formatDate(incident.created_at)}</Text></View></TouchableOpacity>; })}
                {hasLoadError && <Text style={styles.offlineNote}>Không thể tải báo cáo. Kéo xuống để thử lại.</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('ReportIncident')} activeOpacity={0.85}><Text style={styles.plus}>＋</Text><Text style={styles.floatingText}>Báo cáo mới</Text></TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F8FA' }, content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 110 }, topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, eyebrow: { color: '#7A8997', fontSize: 13, marginBottom: 3 }, greeting: { color: '#142532', fontSize: 25, fontWeight: '800' },
    avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D8F4F0', borderWidth: 1, borderColor: '#0D9F9A', alignItems: 'center', justifyContent: 'center' }, avatar: { width: 42, height: 42, borderRadius: 21 }, avatarText: { color: '#0D918D', fontSize: 16, fontWeight: '800' }, searchBox: { height: 48, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5EDF1', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 27 }, searchIcon: { color: '#9AA8B6', fontSize: 25, marginRight: 7 }, searchInput: { flex: 1, color: '#21323D', fontSize: 13, paddingVertical: 0 }, filterIcon: { color: '#607686', fontSize: 20, transform: [{ rotate: '90deg' }] },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }, sectionTitle: { color: '#1D2D39', fontSize: 15, fontWeight: '800' }, sectionHint: { color: '#95A3AE', fontSize: 11 }, categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 }, categoryItem: { alignItems: 'center', width: '23%' }, categoryIcon: { width: 53, height: 53, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, categoryGlyph: { fontSize: 28 }, categoryLabel: { color: '#40515D', fontSize: 11, fontWeight: '600', textAlign: 'center' }, recentHeader: { marginBottom: 12 }, viewAll: { color: '#078E8A', fontSize: 12, fontWeight: '700' }, incidentCard: { backgroundColor: '#FFF', minHeight: 84, borderRadius: 15, padding: 9, flexDirection: 'row', alignItems: 'center', marginBottom: 11, shadowColor: '#1A4553', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, incidentThumb: { width: 67, height: 66, borderRadius: 11, backgroundColor: '#DDEBEA', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, thumbIcon: { color: '#56858A', fontSize: 34 }, incidentBody: { flex: 1, minWidth: 0 }, incidentTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, incidentTitle: { flex: 1, color: '#263640', fontSize: 13, fontWeight: '800', marginRight: 5 }, statusBadge: { overflow: 'hidden', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: '800' }, location: { color: '#71818C', fontSize: 10, marginBottom: 6 }, date: { color: '#A1ADB5', fontSize: 10 }, stateBox: { minHeight: 100, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, stateText: { color: '#84939E', fontSize: 12, marginTop: 8 }, emptyIcon: { color: '#8BC8C3', fontSize: 30 }, offlineNote: { color: '#9AA8B6', textAlign: 'center', fontSize: 11, marginTop: 2 }, floatingButton: { position: 'absolute', right: 20, bottom: 20, height: 48, paddingHorizontal: 17, borderRadius: 24, backgroundColor: '#079C96', flexDirection: 'row', alignItems: 'center', shadowColor: '#087873', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, plus: { color: '#FFF', fontSize: 24, lineHeight: 24, marginRight: 5 }, floatingText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});