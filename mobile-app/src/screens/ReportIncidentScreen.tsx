import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiClient } from '../services/api';

const CATEGORIES = [
    { id: 1, name: 'Đèn đường', icon: '⌁' }, { id: 2, name: 'Nước ngập', icon: '≋' },
    { id: 3, name: 'Ổ gà', icon: '⊗' }, { id: 4, name: 'Cống tắc', icon: '⌑' },
    { id: 5, name: 'Rác thải', icon: '□' }, { id: 6, name: 'Khác', icon: '△' },
];

const PRIORITIES = [{ id: 'low', label: 'Nhẹ' }, { id: 'medium', label: 'Trung bình' }, { id: 'high', label: 'Nghiêm trọng' }];

export default function ReportIncidentScreen({ navigation, route }: any) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState(String(route?.params?.categoryId || 3));
    const [priority, setPriority] = useState('medium');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState({ latitude: 21.0285, longitude: 105.8542 });
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(true);

    useEffect(() => { getLocation(); }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cần quyền vị trí', 'Vui lòng cho phép truy cập vị trí để đánh dấu nơi xảy ra sự cố.');
                return;
            }
            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const nextCoordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
            setCoordinates(nextCoordinates);
            const addresses = await Location.reverseGeocodeAsync(nextCoordinates);
            if (addresses.length > 0) {
                const address = addresses[0];
                setLocation([address.name, address.street, address.district, address.city].filter(Boolean).join(', '));
            }
        } catch {
            Alert.alert('Không lấy được vị trí', 'Bạn vẫn có thể nhập địa chỉ thủ công.');
        } finally {
            setGettingLocation(false);
        }
    };

    const chooseImage = async (useCamera: boolean) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Cần cấp quyền', `Vui lòng cấp quyền ${useCamera ? 'camera' : 'thư viện ảnh'} trong phần cài đặt thiết bị.`);
            return;
        }
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3] })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3] });
        if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    };

    const showImageOptions = () => Alert.alert('Thêm ảnh hiện trường', 'Chọn nguồn ảnh', [
        { text: 'Chụp ảnh', onPress: () => chooseImage(true) },
        { text: 'Chọn từ thư viện', onPress: () => chooseImage(false) },
        { text: 'Hủy', style: 'cancel' },
    ]);

    const handleSubmit = async () => {
        if (!title.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề sự cố.'); return; }
        try {
            setLoading(true);
            const response = await apiClient.createIncident({ category_id: Number(category), title: title.trim(), description: description.trim(), location_name: location, latitude: coordinates.latitude, longitude: coordinates.longitude, priority: priority as 'low' | 'medium' | 'high' });
            const incidentId = response.data?.id;
            if (imageUri && incidentId) await apiClient.uploadIncidentImage(incidentId, imageUri);
            Alert.alert('Đã gửi báo cáo', 'Cảm ơn bạn đã góp phần xây dựng đô thị tốt hơn.', [{ text: 'Xong', onPress: () => navigation.goBack() }]);
        } catch (error: any) {
            Alert.alert('Gửi báo cáo thất bại', error.response?.data?.error || 'Vui lòng kiểm tra kết nối và thử lại.');
        } finally { setLoading(false); }
    };

    if (gettingLocation) return <View style={styles.loadingScreen}><ActivityIndicator size="large" color="#0B9F98" /><Text style={styles.loadingText}>Đang xác định vị trí của bạn...</Text></View>;

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Quay lại"><Text style={styles.backIcon}>‹</Text></TouchableOpacity><View><Text style={styles.title}>Tạo báo cáo mới</Text><Text style={styles.step}>Bước 1/3</Text></View></View>
                <Text style={styles.sectionLabel}>Phân loại sự cố</Text>
                <View style={styles.categoryGrid}>{CATEGORIES.map((item) => <TouchableOpacity key={item.id} style={[styles.categoryCard, category === String(item.id) && styles.categoryCardActive]} onPress={() => setCategory(String(item.id))} disabled={loading}><Text style={[styles.categoryIcon, category === String(item.id) && styles.categoryIconActive]}>{item.icon}</Text><Text style={[styles.categoryName, category === String(item.id) && styles.categoryNameActive]}>{item.name}</Text></TouchableOpacity>)}</View>

                <Text style={styles.sectionLabel}>Tiêu đề sự cố</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ví dụ: Ổ gà lớn gây nguy hiểm" placeholderTextColor="#A5B1B8" editable={!loading} />
                <Text style={styles.sectionLabel}>Hình ảnh hiện trường <Text style={styles.optional}>(không bắt buộc)</Text></Text>
                <TouchableOpacity style={styles.photoBox} onPress={showImageOptions} disabled={loading}>
                    {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <><Text style={styles.photoIcon}>▧</Text><Text style={styles.photoTitle}>Tải lên hoặc chụp ảnh trực tiếp</Text><Text style={styles.photoHint}>Ảnh giúp cơ quan xử lý xác minh nhanh hơn</Text></>}
                </TouchableOpacity>
                {imageUri && <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removePhoto}><Text style={styles.removePhotoText}>Xóa ảnh và chọn lại</Text></TouchableOpacity>}

                <Text style={styles.sectionLabel}>Mô tả chi tiết</Text>
                <TextInput style={[styles.input, styles.description]} value={description} onChangeText={setDescription} placeholder="Mô tả sự cố (ví dụ: ổ gà sâu 10cm nằm ngay giữa đường giao nhau)..." placeholderTextColor="#A5B1B8" multiline numberOfLines={4} textAlignVertical="top" editable={!loading} />
                <View style={styles.locationHeader}><Text style={styles.sectionLabel}>Vị trí sự cố</Text><TouchableOpacity onPress={getLocation} disabled={loading}><Text style={styles.refreshLocation}>⌖ Cập nhật</Text></TouchableOpacity></View>
                <View style={styles.mapCard}><MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={{ ...coordinates, latitudeDelta: 0.008, longitudeDelta: 0.008 }} region={{ ...coordinates, latitudeDelta: 0.008, longitudeDelta: 0.008 }}><Marker coordinate={coordinates} title="Vị trí sự cố" /></MapView><View style={styles.addressBar}><Text style={styles.pin}>⌖</Text><TextInput style={styles.addressInput} value={location} onChangeText={setLocation} placeholder="Nhập địa chỉ cụ thể" placeholderTextColor="#83939C" editable={!loading} /></View></View>
                <Text style={styles.sectionLabel}>Mức độ nghiêm trọng</Text>
                <View style={styles.priorityRow}>{PRIORITIES.map((item) => <TouchableOpacity key={item.id} style={[styles.priorityButton, priority === item.id && styles.priorityActive]} onPress={() => setPriority(item.id)}><Text style={[styles.priorityText, priority === item.id && styles.priorityTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
                <TouchableOpacity style={[styles.submitButton, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Gửi báo cáo</Text>}</TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F6F9FA' }, content: { padding: 18, paddingBottom: 32 }, loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F9FA' }, loadingText: { color: '#647681', fontSize: 13, marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 }, backButton: { width: 34, height: 34, justifyContent: 'center' }, backIcon: { color: '#263943', fontSize: 31, lineHeight: 31 }, title: { color: '#20333E', fontSize: 18, fontWeight: '800' }, step: { position: 'absolute', right: -205, top: 4, color: '#07968F', fontSize: 11, fontWeight: '800' }, sectionLabel: { color: '#52646E', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 0.2 }, optional: { color: '#9BA8AE', fontWeight: '500' }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 17 }, categoryCard: { width: '31.5%', height: 61, backgroundColor: '#FFF', borderColor: '#E5EDF0', borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, categoryCardActive: { backgroundColor: '#EDFBF9', borderColor: '#0BA39B', borderWidth: 1.5 }, categoryIcon: { color: '#6F828C', fontSize: 21, marginBottom: 2 }, categoryIconActive: { color: '#0A9F98' }, categoryName: { color: '#6A7B84', fontSize: 9 }, categoryNameActive: { color: '#087F7A', fontWeight: '800' }, input: { backgroundColor: '#FFF', borderColor: '#E2EAED', borderWidth: 1, borderRadius: 10, minHeight: 46, paddingHorizontal: 13, color: '#263943', fontSize: 12, marginBottom: 16 }, description: { minHeight: 88, paddingTop: 12 }, photoBox: { height: 112, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D7E2E6', backgroundColor: '#FFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16 }, photoIcon: { color: '#0CA29B', fontSize: 25, marginBottom: 5 }, photoTitle: { color: '#82939D', fontSize: 10, fontWeight: '600' }, photoHint: { color: '#AAB6BC', fontSize: 9, marginTop: 5 }, previewImage: { width: '100%', height: '100%', resizeMode: 'cover' }, removePhoto: { alignSelf: 'flex-end', marginTop: -11, marginBottom: 13 }, removePhotoText: { color: '#C15A5A', fontSize: 11, fontWeight: '700' }, locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, refreshLocation: { color: '#07968F', fontSize: 11, fontWeight: '700', marginBottom: 8 }, mapCard: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E9EB', marginBottom: 17 }, map: { height: 134, width: '100%' }, addressBar: { minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }, pin: { color: '#0B9F98', fontSize: 18, marginRight: 6 }, addressInput: { flex: 1, color: '#52646E', fontSize: 10, paddingVertical: 5 }, priorityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }, priorityButton: { width: '31.5%', height: 38, backgroundColor: '#FFF', borderColor: '#E2EAED', borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, priorityActive: { borderColor: '#0BA39B', backgroundColor: '#F0FCFA' }, priorityText: { color: '#61717A', fontSize: 10, fontWeight: '600' }, priorityTextActive: { color: '#078D87', fontWeight: '800' }, submitButton: { height: 46, backgroundColor: '#0A9E96', borderRadius: 9, justifyContent: 'center', alignItems: 'center', shadowColor: '#087B76', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, submitDisabled: { opacity: 0.65 }, submitText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});