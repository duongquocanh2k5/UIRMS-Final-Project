import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { apiClient } from '../services/api';
import TrafficSignIcon from '../components/TrafficSignIcon';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = [
    { id: 1, name: 'Đèn đường' },
    { id: 2, name: 'Nước ngập' },
    { id: 3, name: 'Ổ gà' },
    { id: 4, name: 'Cống tắc' },
    { id: 5, name: 'Rác thải' },
    { id: 6, name: 'Khác' },
];

const PRIORITIES = [
    { id: 'low', vi: 'Nhẹ', en: 'Low' },
    { id: 'medium', vi: 'Trung bình', en: 'Medium' },
    { id: 'high', vi: 'Nghiêm trọng', en: 'High' },
];
const DEFAULT_COORDINATES = { latitude: 10.7769, longitude: 106.7009 };

export default function ReportIncidentScreen({ navigation, route }: any) {
    const { t, translateCategory } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [district, setDistrict] = useState('');
    const [categories, setCategories] = useState(CATEGORIES);
    const [category, setCategory] = useState(String(route?.params?.categoryId || ''));
    const [priority, setPriority] = useState('medium');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(true);

    useEffect(() => {
        void getLocation();
        void loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await apiClient.getCategories();
            const data = response.data;
            if (Array.isArray(data) && data.length > 0) {
                setCategories(data.map((item) => ({ id: item.id, name: item.name })));
                const requestedCategory = String(route?.params?.categoryId || '');
                setCategory(
                    data.some((item) => String(item.id) === requestedCategory)
                        ? requestedCategory
                        : String(data[0].id)
                );
            }
        } catch {
            setCategories(CATEGORIES);
            const requestedCategory = String(route?.params?.categoryId || '');
            setCategory(
                CATEGORIES.some((item) => String(item.id) === requestedCategory)
                    ? requestedCategory
                    : String(CATEGORIES[0].id)
            );
        }
    };

    const updateCoordinates = async (nextCoordinates: {
        latitude: number;
        longitude: number;
    }) => {
        setCoordinates(nextCoordinates);
        setDistrict('');
        setLocation('');
        try {
            const addresses = await Location.reverseGeocodeAsync(nextCoordinates);
            const address = addresses[0];
            if (address) {
                const nextDistrict = address.district || address.subregion || address.city || '';
                setDistrict(nextDistrict);
                const rawParts = [address.name, address.street, nextDistrict, address.city]
                    .map((part) => part?.trim())
                    .filter((part): part is string => Boolean(part));
                const uniqueParts = Array.from(new Set(rawParts));
                setLocation(uniqueParts.join(', '));
            }
        } catch {
            Alert.alert(
                t('Không thể tìm địa chỉ', 'Unable to find the address'),
                t('Vị trí đã được cập nhật, bạn có thể nhập địa chỉ thủ công.', 'The location was updated. You can enter the address manually.')
            );
        }
    };

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('Cần quyền vị trí', 'Location permission required'),
                    t('Vui lòng cho phép truy cập vị trí để đánh dấu nơi xảy ra sự cố.', 'Allow location access to mark where the incident occurred.')
                );
                return;
            }
            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const nextCoordinates = {
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
            };
            await updateCoordinates(nextCoordinates);
        } catch {
            Alert.alert(t('Không lấy được vị trí', 'Unable to get your location'), t('Bạn vẫn có thể nhập địa chỉ thủ công.', 'You can still enter the address manually.'));
        } finally {
            setGettingLocation(false);
        }
    };

    const chooseImage = async (useCamera: boolean) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(
                t('Cần cấp quyền', 'Permission required'),
                useCamera
                    ? t('Vui lòng cấp quyền camera trong phần cài đặt thiết bị.', 'Allow camera access in your device settings.')
                    : t('Vui lòng cấp quyền thư viện ảnh trong phần cài đặt thiết bị.', 'Allow photo library access in your device settings.')
            );
            return;
        }
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            });
        if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    };

    const showImageOptions = () =>
        Alert.alert(t('Thêm ảnh hiện trường', 'Add Incident Photo'), t('Chọn nguồn ảnh', 'Choose a photo source'), [
            { text: t('Chụp ảnh', 'Take Photo'), onPress: () => void chooseImage(true) },
            { text: t('Chọn từ thư viện', 'Choose from Library'), onPress: () => void chooseImage(false) },
            { text: t('Hủy', 'Cancel'), style: 'cancel' },
        ]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert(t('Thiếu thông tin', 'Missing Information'), t('Vui lòng nhập tiêu đề sự cố.', 'Enter an incident title.'));
            return;
        }
        try {
            setLoading(true);
            const response = await apiClient.createIncident({
                category_id: Number(category),
                title: title.trim(),
                description: description.trim(),
                location_name: location,
                district,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                priority: priority as 'low' | 'medium' | 'high',
            });
            const incidentId = response.data?.id;
            if (imageUri && incidentId) await apiClient.uploadIncidentImage(incidentId, imageUri);
            Alert.alert(t('Đã gửi báo cáo', 'Report Submitted'), t('Cảm ơn bạn đã góp phần xây dựng đô thị tốt hơn.', 'Thank you for helping improve our city.'), [
                { text: t('Xong', 'Done'), onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert(
                t('Gửi báo cáo thất bại', 'Report Submission Failed'),
                error.response?.data?.error || t('Vui lòng kiểm tra kết nối và thử lại.', 'Check your connection and try again.')
            );
        } finally {
            setLoading(false);
        }
    };

    if (gettingLocation) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="#0B9F98" />
                <Text style={styles.loadingText}>{t('Đang xác định vị trí của bạn...', 'Finding your location...')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerBanner}>
                    <Text style={styles.title}>{t('Tạo báo cáo sự cố mới', 'Create a New Incident Report')}</Text>
                    <Text style={styles.step}>
                        {t('🤖 Ảnh hiện trường sẽ được AI thẩm định & phân loại tự động', '🤖 AI will assess and automatically categorize your incident photo')}
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>{t('Phân loại sự cố', 'Incident Category')}</Text>
                <View style={styles.categoryGrid}>
                    {categories.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.categoryCard,
                                category === String(item.id) && styles.categoryCardActive,
                            ]}
                            onPress={() => setCategory(String(item.id))}
                            disabled={loading}
                        >
                            <TrafficSignIcon categoryName={item.name} size={44} />
                            <Text
                                style={[
                                    styles.categoryName,
                                    category === String(item.id) && styles.categoryNameActive,
                                ]}
                            >
                                {item.name === 'Khác' ? t('Khác', 'Other') : translateCategory(item.name)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>{t('Tiêu đề sự cố', 'Incident Title')}</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('Ví dụ: Ổ gà lớn gây nguy hiểm', 'Example: A large pothole creating a hazard')}
                    placeholderTextColor="#A5B1B8"
                    editable={!loading}
                />

                <Text style={styles.sectionLabel}>
                    {t('Hình ảnh hiện trường', 'Incident Photo')} <Text style={styles.optional}>{t('(khuyên dùng để AI thẩm định)', '(recommended for AI assessment)')}</Text>
                </Text>
                <TouchableOpacity
                    style={styles.photoBox}
                    onPress={showImageOptions}
                    disabled={loading}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <>
                            <Text style={styles.photoIcon}>▧</Text>
                            <Text style={styles.photoTitle}>{t('Tải lên hoặc chụp ảnh trực tiếp', 'Upload or take a photo')}</Text>
                            <Text style={styles.photoHint}>
                                {t('Ảnh giúp cơ quan xử lý và AI xác minh nhanh hơn', 'Photos help response teams and AI verify the incident faster')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
                {imageUri && (
                    <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removePhoto}>
                        <Text style={styles.removePhotoText}>{t('Xóa ảnh và chọn lại', 'Remove photo and choose another')}</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.sectionLabel}>{t('Mô tả chi tiết', 'Description')}</Text>
                <TextInput
                    style={[styles.input, styles.description]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('Mô tả sự cố (ví dụ: ổ gà sâu 10cm nằm ngay giữa đường giao nhau)...', 'Describe the incident (for example: a 10 cm pothole in the middle of an intersection)...')}
                    placeholderTextColor="#A5B1B8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!loading}
                />

                <View style={styles.locationHeader}>
                    <Text style={styles.sectionLabel}>{t('Vị trí sự cố', 'Incident Location')}</Text>
                    <TouchableOpacity onPress={() => void getLocation()} disabled={loading}>
                        <Text style={styles.refreshLocation}>⌖ {t('Cập nhật GPS', 'Update GPS')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.mapCard}>
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            ...coordinates,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008,
                        }}
                        region={{
                            ...coordinates,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008,
                        }}
                        onPress={(event) => void updateCoordinates(event.nativeEvent.coordinate)}
                    >
                        <Marker
                            coordinate={coordinates}
                            title={t('Vị trí sự cố', 'Incident Location')}
                            draggable
                            onDragEnd={(event) => void updateCoordinates(event.nativeEvent.coordinate)}
                        />
                    </MapView>
                    <View style={styles.addressBar}>
                        <Text style={styles.pin}>⌖</Text>
                        <TextInput
                            style={styles.addressInput}
                            value={location}
                            onChangeText={setLocation}
                            placeholder={t('Nhập địa chỉ cụ thể', 'Enter a specific address')}
                            placeholderTextColor="#83939C"
                            editable={!loading}
                        />
                    </View>
                </View>

                <Text style={styles.sectionLabel}>{t('Mức độ nghiêm trọng', 'Severity')}</Text>
                <View style={styles.priorityRow}>
                    {PRIORITIES.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.priorityButton,
                                priority === item.id && styles.priorityActive,
                            ]}
                            onPress={() => setPriority(item.id)}
                        >
                            <Text
                                style={[
                                    styles.priorityText,
                                    priority === item.id && styles.priorityTextActive,
                                ]}
                            >
                                {t(item.vi, item.en)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitDisabled]}
                    onPress={() => void handleSubmit()}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>{t('Gửi báo cáo phản ánh', 'Submit Report')}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F6F9FA' },
    content: { padding: 18, paddingBottom: 32 },
    loadingScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6F9FA',
    },
    loadingText: { color: '#647681', fontSize: 13, marginTop: 12 },
    headerBanner: {
        backgroundColor: '#E6F7F5',
        borderRadius: 12,
        padding: 13,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#BCE6E1',
    },
    title: { color: '#0F524F', fontSize: 16, fontWeight: '800' },
    step: { marginTop: 4, color: '#087F7A', fontSize: 11, fontWeight: '600' },
    sectionLabel: {
        color: '#52646E',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    optional: { color: '#0A9D96', fontWeight: '600' },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 17,
    },
    categoryCard: {
        width: '31.5%',
        minHeight: 84,
        backgroundColor: '#FFF',
        borderColor: '#E5EDF0',
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 6,
    },
    categoryCardActive: {
        backgroundColor: '#EDFBF9',
        borderColor: '#0BA39B',
        borderWidth: 1.5,
    },
    categoryName: {
        color: '#6A7B84',
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
        fontWeight: '600',
    },
    categoryNameActive: { color: '#087F7A', fontWeight: '800' },
    input: {
        backgroundColor: '#FFF',
        borderColor: '#E2EAED',
        borderWidth: 1,
        borderRadius: 10,
        minHeight: 46,
        paddingHorizontal: 13,
        color: '#263943',
        fontSize: 13,
        marginBottom: 16,
    },
    description: { minHeight: 88, paddingTop: 12 },
    photoBox: {
        height: 116,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#0A9D96',
        backgroundColor: '#FFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 16,
    },
    photoIcon: { color: '#0CA29B', fontSize: 25, marginBottom: 5 },
    photoTitle: { color: '#334155', fontSize: 12, fontWeight: '700' },
    photoHint: { color: '#64748B', fontSize: 10, marginTop: 4 },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    removePhoto: { alignSelf: 'flex-end', marginTop: -11, marginBottom: 13 },
    removePhotoText: { color: '#C15A5A', fontSize: 11, fontWeight: '700' },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    refreshLocation: {
        color: '#07968F',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    mapCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E9EB',
        marginBottom: 17,
    },
    map: { height: 145, width: '100%' },
    addressBar: {
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    pin: { color: '#0B9F98', fontSize: 18, marginRight: 6 },
    addressInput: { flex: 1, color: '#334155', fontSize: 12, paddingVertical: 6 },
    priorityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    priorityButton: {
        width: '31.5%',
        height: 40,
        backgroundColor: '#FFF',
        borderColor: '#E2EAED',
        borderWidth: 1,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityActive: { borderColor: '#0BA39B', backgroundColor: '#F0FCFA' },
    priorityText: { color: '#61717A', fontSize: 12, fontWeight: '600' },
    priorityTextActive: { color: '#078D87', fontWeight: '800' },
    submitButton: {
        height: 48,
        backgroundColor: '#0A9E96',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#087B76',
        shadowOpacity: 0.22,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    submitDisabled: { opacity: 0.65 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});