import React, { useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { apiClient } from '../services/api';
import TrafficSignIcon, {
    detectUrbanCategoryType,
    getCategoryVisualConfig,
    sortUrbanCategories,
    type UrbanCategoryType,
} from '../components/TrafficSignIcon';
import SafeMapView from '../components/SafeMapView';
import { useLanguage } from '../context/LanguageContext';

interface CategoryItem {
    id: number;
    name: string;
}

const CATEGORIES: CategoryItem[] = [
    { id: 1, name: 'Road Damage' },
    { id: 2, name: 'Streetlight & Power' },
    { id: 7, name: 'Flooding & Wastewater' },
    { id: 9, name: 'Clogged Drain' },
    { id: 4, name: 'Waste & Litter' },
    { id: 6, name: 'Fallen / Damaged Trees' },
    { id: 3, name: 'Traffic Congestion' },
    { id: 5, name: 'Public Safety' },
    { id: 10, name: 'Sidewalk & Encroachment' },
    { id: 11, name: 'Traffic Signals & Signs' },
    { id: 12, name: 'Noise & Air Pollution' },
    { id: 13, name: 'Overhead Cables & Wiring' },
    { id: 14, name: 'Fire & Emergency Hazard' },
    { id: 8, name: 'Public Facility / Elevator' },
    { id: 15, name: 'Other Urban Issues' },
];

const QUICK_ISSUE_CHIPS: Record<UrbanCategoryType, Array<{ vi: string; en: string }>> = {
    road: [
        { vi: 'Ổ gà lớn gây nguy hiểm', en: 'Large hazardous pothole' },
        { vi: 'Mặt đường sụt lún / nứt vỡ', en: 'Sunken or cracked road surface' },
        { vi: 'Nắp hố ga bị mất / vênh', en: 'Missing or broken manhole cover' },
        { vi: 'Đá dăm / vật cản rơi vãi trên đường', en: 'Debris or gravel spilled on road' },
    ],
    light: [
        { vi: 'Đèn đường không sáng vào ban đêm', en: 'Streetlight out at night' },
        { vi: 'Cột đèn chiếu sáng bị nghiêng / gãy', en: 'Leaning or damaged light pole' },
        { vi: 'Đèn chiếu sáng nhấp nháy liên tục', en: 'Flickering streetlight' },
        { vi: 'Tủ điện / dây điện hở nguy hiểm', en: 'Exposed electrical box or wire' },
    ],
    water: [
        { vi: 'Đường ngập sâu sau mưa', en: 'Deep street flooding after rain' },
        { vi: 'Vỡ đường ống cấp nước sạch', en: 'Burst water supply pipe' },
        { vi: 'Nước thải tràn lên mặt đường bốc mùi', en: 'Foul wastewater overflowing on street' },
        { vi: 'Ứ đọng nước lâu ngày không thoát', en: 'Standing water not draining' },
    ],
    drain: [
        { vi: 'Miệng cống thoát nước bị rác bít kín', en: 'Storm drain blocked by trash' },
        { vi: 'Mất lưới chắn rác / nắp cống', en: 'Missing drain grate or cover' },
        { vi: 'Cống thoát nước trào ngược', en: 'Backflowing storm drain' },
        { vi: 'Hố ga thoát nước sụt lún nguy hiểm', en: 'Collapsed drainage pit' },
    ],
    waste: [
        { vi: 'Rác sinh hoạt tồn đọng lâu ngày', en: 'Uncollected household trash pile' },
        { vi: 'Đổ trộm xà bần / phế thải xây dựng', en: 'Illegal construction debris dumping' },
        { vi: 'Thùng rác công cộng quá tải / hư hỏng', en: 'Overflowing or broken public bin' },
        { vi: 'Chất thải bừa bãi gây mất vệ sinh', en: 'Unsanitary littering in public area' },
    ],
    tree: [
        { vi: 'Cây xanh gãy đổ chắn ngang đường', en: 'Fallen tree blocking the road' },
        { vi: 'Cành cây khô có nguy cơ gãy rụng', en: 'Hazardous dead tree branch' },
        { vi: 'Cây che khuất biển báo / đèn giao thông', en: 'Tree obscuring traffic sign or light' },
        { vi: 'Rễ cây đội vỉa hè hư hỏng', en: 'Tree roots lifting sidewalk' },
    ],
    traffic: [
        { vi: 'Ùn tắc giao thông nghiêm trọng kéo dài', en: 'Severe prolonged traffic jam' },
        { vi: 'Xe đậu đỗ sai quy định gây kẹt xe', en: 'Illegal parking causing congestion' },
        { vi: 'Rào chắn công trình cản trở lưu thông', en: 'Construction barrier blocking traffic' },
        { vi: 'Xung đột giao thông tại nút giao', en: 'Intersection traffic bottleneck' },
    ],
    safety: [
        { vi: 'Khu vực thiếu an toàn / nguy cơ tai nạn', en: 'Unsafe area with accident risk' },
        { vi: 'Lan can cầu / hộ lan đường bộ bị hỏng', en: 'Damaged bridge railing or guardrail' },
        { vi: 'Công trình thi công thiếu rào chắn cảnh báo', en: 'Unfenced construction hazard' },
        { vi: 'Vật kiến trúc có nguy cơ sập đổ', en: 'Structure at risk of collapsing' },
    ],
    elevator: [
        { vi: 'Thang máy cầu bộ hành ngưng hoạt động', en: 'Pedestrian bridge elevator out of service' },
        { vi: 'Nhà chờ xe buýt hư hỏng / mất điện', en: 'Damaged or unlit bus shelter' },
        { vi: 'Nhà vệ sinh công cộng xuống cấp', en: 'Degraded public restroom facility' },
        { vi: 'Ghế đá / thiết bị công viên bị hỏng', en: 'Broken park bench or public equipment' },
    ],
    sidewalk: [
        { vi: 'Gạch lát vỉa hè bong tróc / sụt lún', en: 'Broken or sunken sidewalk tiles' },
        { vi: 'Lấn chiếm vỉa hè làm nơi buôn bán', en: 'Sidewalk blocked by street vendors' },
        { vi: 'Đậu xe chiếm hết lối đi bộ', en: 'Vehicles parked across pedestrian walkway' },
        { vi: 'Lối lên xuống cho người khuyết tật bị chắn', en: 'Wheelchair ramp blocked or damaged' },
    ],
    signal: [
        { vi: 'Đèn tín hiệu giao thông bị hỏng / loạn nhịp', en: 'Malfunctioning traffic light signal' },
        { vi: 'Biển báo giao thông bị gãy đổ / mờ chữ', en: 'Broken or faded traffic sign' },
        { vi: 'Vạch kẻ đường / gờ giảm tốc bị mờ', en: 'Faded crosswalk or speed bump markings' },
        { vi: 'Gương cầu lồi bị vỡ / lệch hướng', en: 'Broken or misaligned convex traffic mirror' },
    ],
    pollution: [
        { vi: 'Karaoke / loa công suất lớn gây ồn quá giờ', en: 'Late-night loud karaoke or speaker noise' },
        { vi: 'Công trình thi công gây bụi và ồn ban đêm', en: 'Construction dust and nighttime noise' },
        { vi: 'Đốt rác / phế thải gây khói độc hại', en: 'Illegal trash burning causing toxic smoke' },
        { vi: 'Xả khí thải / mùi hôi ra khu dân cư', en: 'Foul odor or emissions in residential area' },
    ],
    cable: [
        { vi: 'Dây cáp viễn thông sà thấp ngang đường', en: 'Low-hanging telecom cable across street' },
        { vi: 'Bó dây cáp đứt rơi xuống vỉa hè', en: 'Snapped utility cable hanging on sidewalk' },
        { vi: 'Trụ đỡ dây cáp bị nghiêng nguy hiểm', en: 'Leaning utility pole with tangled wires' },
        { vi: 'Dây cáp chằng chịt gây mất an toàn', en: 'Hazardous tangled overhead wiring' },
    ],
    fire: [
        { vi: 'Phát hiện khói / cháy cỏ rác gần khu dân cư', en: 'Smoke or brush fire near residential area' },
        { vi: 'Chập cháy trên cột điện / trạm biến áp', en: 'Sparking power pole or transformer' },
        { vi: 'Trụ nước chữa cháy bị hư hỏng / rò rỉ', en: 'Damaged or leaking fire hydrant' },
        { vi: 'Rò rỉ khí / hóa chất có mùi bất thường', en: 'Suspected gas or chemical leak' },
    ],
    other: [
        { vi: 'Biển quảng cáo / pano có nguy cơ rơi đổ', en: 'Loose billboard or sign hazard' },
        { vi: 'Động vật thả rông gây nguy hiểm trên đường', en: 'Stray animals causing traffic hazard' },
        { vi: 'Bất cập hạ tầng đô thị cần khắc phục', en: 'General urban infrastructure issue' },
        { vi: 'Vấn đề dân sinh khác tại khu vực', en: 'Other community or neighborhood issue' },
    ],
};

const PRIORITIES = [
    { id: 'low', vi: 'Nhẹ', en: 'Low' },
    { id: 'medium', vi: 'Trung bình', en: 'Medium' },
    { id: 'high', vi: 'Nghiêm trọng', en: 'High' },
];
const DEFAULT_COORDINATES = { latitude: 10.7769, longitude: 106.7009 };
const INITIAL_VISIBLE_CATEGORIES = 9;

export default function ReportIncidentScreen({ navigation, route }: any) {
    const { language, t, translateCategory } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [district, setDistrict] = useState('');
    const [categories, setCategories] = useState<CategoryItem[]>(CATEGORIES);
    const [category, setCategory] = useState(String(route?.params?.categoryId || CATEGORIES[0].id));
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
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
                const apiItems: CategoryItem[] = sortUrbanCategories(
                    data.map((item) => ({ id: item.id, name: item.name }))
                );
                setCategories(apiItems);
                const requestedCategory = String(route?.params?.categoryId || '');
                const matchedId = apiItems.some((item) => String(item.id) === requestedCategory)
                    ? requestedCategory
                    : String(apiItems[0].id);
                setCategory(matchedId);

                const selectedIndex = apiItems.findIndex((item) => String(item.id) === matchedId);
                if (selectedIndex >= INITIAL_VISIBLE_CATEGORIES) {
                    setShowAllCategories(true);
                }
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

    const selectedCategoryItem = useMemo(
        () => categories.find((item) => String(item.id) === category) || categories[0],
        [categories, category]
    );

    const selectedCategoryType = useMemo(
        () => detectUrbanCategoryType(selectedCategoryItem?.name),
        [selectedCategoryItem]
    );

    const quickChips = useMemo(
        () => QUICK_ISSUE_CHIPS[selectedCategoryType] || QUICK_ISSUE_CHIPS.other,
        [selectedCategoryType]
    );

    const displayedCategories = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();
        if (q) {
            return categories.filter((item) => {
                const translated = translateCategory(item.name).toLowerCase();
                return item.name.toLowerCase().includes(q) || translated.includes(q);
            });
        }
        return showAllCategories ? categories : categories.slice(0, INITIAL_VISIBLE_CATEGORIES);
    }, [categories, categorySearch, showAllCategories, translateCategory]);

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
            Alert.alert(t('Thiếu thông tin', 'Missing Information'), t('Vui lòng nhập hoặc chọn nhanh tiêu đề sự cố.', 'Enter or tap a quick suggestion for the incident title.'));
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

                <View style={styles.categoryHeaderRow}>
                    <Text style={styles.sectionLabel}>
                        {t('Phân loại sự cố đô thị', 'Urban Incident Category')} ({categories.length})
                    </Text>
                    {categories.length > INITIAL_VISIBLE_CATEGORIES && !categorySearch.trim() && (
                        <TouchableOpacity
                            onPress={() => setShowAllCategories((prev) => !prev)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.expandCategoryLink}>
                                {showAllCategories
                                    ? t('Thu gọn ▴', 'Show less ▴')
                                    : t(`Xem tất cả (${categories.length}) ▾`, `View all (${categories.length}) ▾`)}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {showAllCategories && (
                    <View style={styles.categorySearchBox}>
                        <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <TextInput
                            value={categorySearch}
                            onChangeText={setCategorySearch}
                            placeholder={t('Tìm nhanh loại sự cố (ví dụ: vỉa hè, tiếng ồn, dây cáp...)', 'Filter categories (e.g., sidewalk, noise, cables...)')}
                            placeholderTextColor="#94A3B8"
                            style={styles.categorySearchInput}
                        />
                        {categorySearch.length > 0 && (
                            <TouchableOpacity onPress={() => setCategorySearch('')}>
                                <Ionicons name="close-circle" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.categoryGrid}>
                    {displayedCategories.map((item) => {
                        const isSelected = category === String(item.id);
                        const visual = getCategoryVisualConfig(item.name);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.categoryCard,
                                    isSelected && {
                                        backgroundColor: visual.badgeBg,
                                        borderColor: visual.iconColor,
                                        borderWidth: 1.5,
                                    },
                                ]}
                                onPress={() => setCategory(String(item.id))}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {isSelected && (
                                    <View style={[styles.selectedCheckBadge, { backgroundColor: visual.iconColor }]}>
                                        <Ionicons name="checkmark" size={10} color="#FFF" />
                                    </View>
                                )}
                                <TrafficSignIcon categoryName={item.name} size={44} />
                                <Text
                                    style={[
                                        styles.categoryName,
                                        isSelected && { color: visual.iconColor, fontWeight: '800' },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {item.name === 'Khác' ? t('Sự cố đô thị khác', 'Other Urban Issues') : translateCategory(item.name)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {categories.length > INITIAL_VISIBLE_CATEGORIES && !categorySearch.trim() && (
                    <TouchableOpacity
                        style={styles.expandButtonBar}
                        onPress={() => setShowAllCategories((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={showAllCategories ? 'chevron-up-circle-outline' : 'grid-outline'}
                            size={16}
                            color="#0A9D96"
                        />
                        <Text style={styles.expandButtonText}>
                            {showAllCategories
                                ? t('Thu gọn danh sách danh mục', 'Collapse category list')
                                : t(
                                      `Mở rộng thêm ${categories.length - INITIAL_VISIBLE_CATEGORIES} danh mục đô thị khác`,
                                      `Show ${categories.length - INITIAL_VISIBLE_CATEGORIES} more urban categories`
                                  )}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Quick Issue Suggestion Chips */}
                <View style={styles.quickChipsSection}>
                    <View style={styles.quickChipsHeader}>
                        <Ionicons name="flash-outline" size={14} color="#0A9D96" />
                        <Text style={styles.quickChipsTitle}>
                            {t('Tình huống phổ biến — chạm để điền nhanh tiêu đề:', 'Common issues — tap to quick-fill title:')}
                        </Text>
                    </View>
                    <View style={styles.quickChipsWrap}>
                        {quickChips.map((chip, idx) => {
                            const chipLabel = language === 'vi' ? chip.vi : chip.en;
                            const isChipActive = title.trim() === chipLabel;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.quickChip,
                                        isChipActive && styles.quickChipActive,
                                    ]}
                                    onPress={() => setTitle(chipLabel)}
                                    disabled={loading}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[
                                            styles.quickChipText,
                                            isChipActive && styles.quickChipTextActive,
                                        ]}
                                    >
                                        + {chipLabel}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <Text style={styles.sectionLabel}>{t('Tiêu đề sự cố', 'Incident Title')}</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('Nhập tiêu đề hoặc chạm gợi ý phía trên...', 'Enter a title or tap a suggestion above...')}
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
                            <Ionicons name="camera-outline" size={28} color="#0CA29B" style={{ marginBottom: 5 }} />
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
                    <SafeMapView
                        style={styles.map}
                        coordinates={coordinates}
                        markerTitle={t('Vị trí sự cố', 'Incident Location')}
                        draggableMarker
                        onCoordinateChange={(coords) => void updateCoordinates(coords)}
                    />
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
    categoryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionLabel: {
        color: '#52646E',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    expandCategoryLink: {
        color: '#0A9D96',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    categorySearchBox: {
        height: 40,
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#DCE6EA',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 11,
        marginBottom: 10,
    },
    categorySearchInput: {
        flex: 1,
        fontSize: 12,
        color: '#1E293B',
        paddingVertical: 0,
    },
    optional: { color: '#0A9D96', fontWeight: '600' },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    categoryCard: {
        width: '31.5%',
        minHeight: 92,
        backgroundColor: '#FFF',
        borderColor: '#E5EDF0',
        borderWidth: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 9,
        paddingVertical: 8,
        paddingHorizontal: 6,
        position: 'relative',
    },
    selectedCheckBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        color: '#475569',
        fontSize: 10.5,
        marginTop: 6,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 13.5,
    },
    expandButtonBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 14,
        backgroundColor: '#EDFBF9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#BCE6E1',
        marginBottom: 16,
    },
    expandButtonText: {
        color: '#087F7A',
        fontSize: 12,
        fontWeight: '700',
    },
    quickChipsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2EAED',
        marginBottom: 16,
    },
    quickChipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    quickChipsTitle: {
        color: '#334155',
        fontSize: 11.5,
        fontWeight: '700',
    },
    quickChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    quickChip: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    quickChipActive: {
        backgroundColor: '#0A9D96',
        borderColor: '#0A9D96',
    },
    quickChipText: {
        color: '#334155',
        fontSize: 11,
        fontWeight: '600',
    },
    quickChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
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
