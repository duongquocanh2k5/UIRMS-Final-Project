import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
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
const MAX_PHOTOS = 5;

const VOICE_DICTATION_PHRASES = [
    {
        vi: 'Sự cố xảy ra vừa mới đây, gây cản trở lưu thông qua khu vực.',
        en: 'The incident just occurred and is obstructing traffic in the area.',
    },
    {
        vi: 'Khu vực đông người qua lại, rất nguy hiểm vào ban đêm hoặc khi trời mưa.',
        en: 'High-traffic area, very dangerous at night or during rain.',
    },
    {
        vi: 'Mức độ hư hỏng đang lan rộng, cần rào chắn cảnh báo sớm.',
        en: 'Damage is spreading and needs warning barriers soon.',
    },
    {
        vi: 'Mong cơ quan chức năng sớm cử nhân viên kiểm tra và khắc phục.',
        en: 'Please dispatch a crew to inspect and resolve this soon.',
    },
];

interface SelectedPhoto {
    uri: string;
    base64?: string | null;
}

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
    const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [voiceStatusText, setVoiceStatusText] = useState('');
    const descriptionInputRef = useRef<any>(null);
    const speechRecognitionRef = useRef<any>(null);
    const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(true);

    useEffect(() => {
        void getLocation();
        void loadCategories();
        return () => {
            if (speechRecognitionRef.current) {
                try {
                    speechRecognitionRef.current.stop();
                } catch {
                    // ignore cleanup errors
                }
            }
        };
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
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert(
                t('Đã đạt giới hạn ảnh', 'Photo limit reached'),
                t(
                    `Bạn có thể đính kèm tối đa ${MAX_PHOTOS} ảnh cho mỗi báo cáo.`,
                    `You can attach up to ${MAX_PHOTOS} photos per report.`
                )
            );
            return;
        }

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

        const remainingSlots = MAX_PHOTOS - photos.length;
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                base64: true,
                allowsEditing: true,
                aspect: [4, 3],
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                base64: true,
                allowsMultipleSelection: true,
                selectionLimit: remainingSlots,
            });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const addedPhotos: SelectedPhoto[] = result.assets
                .slice(0, remainingSlots)
                .map((asset) => ({
                    uri: asset.uri,
                    base64: asset.base64 || null,
                }));

            setPhotos((prev) => {
                const existingUris = new Set(prev.map((item) => item.uri));
                const uniqueNew = addedPhotos.filter((item) => !existingUris.has(item.uri));
                return [...prev, ...uniqueNew].slice(0, MAX_PHOTOS);
            });
        }
    };

    const removePhotoAt = (index: number) => {
        setPhotos((prev) => prev.filter((_, idx) => idx !== index));
    };

    const showImageOptions = () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert(
                t('Đã đạt giới hạn ảnh', 'Photo limit reached'),
                t(
                    `Bạn đã chọn tối đa ${MAX_PHOTOS} ảnh. Hãy xóa bớt nếu muốn chọn ảnh khác.`,
                    `You have selected the maximum of ${MAX_PHOTOS} photos. Remove one to add another.`
                )
            );
            return;
        }
        Alert.alert(
            t('Thêm ảnh hiện trường', 'Add Incident Photos'),
            t(
                `Đã chọn ${photos.length}/${MAX_PHOTOS} ảnh. Bạn có thể chọn nhiều ảnh cùng lúc từ thư viện.`,
                `Selected ${photos.length}/${MAX_PHOTOS} photos. You can pick multiple photos from your library.`
            ),
            [
                { text: t('Chụp ảnh mới', 'Take Photo'), onPress: () => void chooseImage(true) },
                { text: t('Chọn nhiều ảnh từ thư viện', 'Choose Multiple from Library'), onPress: () => void chooseImage(false) },
                { text: t('Hủy', 'Cancel'), style: 'cancel' },
            ]
        );
    };

    const appendSpokenPhrase = (textToAppend: string) => {
        const clean = textToAppend.trim();
        if (!clean) return;
        setDescription((prev) => {
            const trimmed = prev.trim();
            if (!trimmed) return clean;
            const separator = /[.!?]$/.test(trimmed) ? ' ' : '. ';
            return `${trimmed}${separator}${clean}`;
        });
    };

    const composeSmartVoiceDescription = () => {
        const categoryLabel = translateCategory(selectedCategoryItem?.name || '');
        const issueText = title.trim() || categoryLabel;
        const addrText = location.trim() || district.trim() || t('khu vực đã đánh dấu GPS', 'the GPS-marked area');
        const severityVi = priority === 'high' ? 'nghiêm trọng, cần xử lý khẩn cấp' : priority === 'low' ? 'nhẹ' : 'trung bình';
        const severityEn = priority === 'high' ? 'severe and requires urgent attention' : priority === 'low' ? 'minor' : 'moderate';

        const generated =
            language === 'en'
                ? `Recorded "${issueText}" (${categoryLabel}) at ${addrText}. The impact level is ${severityEn}. Please inspect and resolve.`
                : `Ghi nhận sự cố "${issueText}" (${categoryLabel}) tại ${addrText}. Mức độ ảnh hưởng ${severityVi}, đề nghị cơ quan chức năng kiểm tra và xử lý sớm.`;

        setDescription(generated);
        setVoiceStatusText(
            t(
                'Đã tự động chuyển thông tin sự cố thành câu mô tả chi tiết.',
                'Automatically composed description from incident details.'
            )
        );
    };

    const toggleVoiceDictation = () => {
        if (isListening) {
            if (speechRecognitionRef.current) {
                try {
                    speechRecognitionRef.current.stop();
                } catch {
                    // ignore
                }
            }
            setIsListening(false);
            setVoiceStatusText('');
            return;
        }

        // Check Web Speech API availability (works on Web / Chrome / Edge / Safari)
        const globalAny = typeof window !== 'undefined' ? (window as any) : null;
        const SpeechRecognitionCtor =
            globalAny?.SpeechRecognition || globalAny?.webkitSpeechRecognition;

        if (SpeechRecognitionCtor) {
            try {
                const recognition = new SpeechRecognitionCtor();
                recognition.lang = language === 'en' ? 'en-US' : 'vi-VN';
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onstart = () => {
                    setIsListening(true);
                    setVoiceStatusText(
                        t('Đang nghe qua micro... Hãy nói mô tả sự cố của bạn.', 'Listening via microphone... Speak your incident description.')
                    );
                };

                recognition.onresult = (event: any) => {
                    const transcript = Array.from(event.results || [])
                        .map((res: any) => res?.[0]?.transcript || '')
                        .join(' ')
                        .trim();
                    if (transcript) {
                        appendSpokenPhrase(transcript);
                        setVoiceStatusText(
                            t(`Đã nhận giọng nói: "${transcript}"`, `Transcribed: "${transcript}"`)
                        );
                    }
                };

                recognition.onerror = () => {
                    setVoiceStatusText(
                        t(
                            'Hãy bấm biểu tượng 🎙️ trên bàn phím hoặc chọn mẫu câu giọng nói nhanh bên dưới.',
                            'Tap the 🎙️ key on your keyboard or select a quick spoken phrase below.'
                        )
                    );
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                speechRecognitionRef.current = recognition;
                recognition.start();
                return;
            } catch {
                // Fall back to mobile dictation helper below
            }
        }

        // Native mobile (iOS / Android): Focus input to bring up native keyboard mic + open quick voice dictation bar
        setIsListening(true);
        setVoiceStatusText(
            Platform.OS === 'web'
                ? t('Chế độ nhập giọng nói nhanh đang bật.', 'Quick voice dictation mode enabled.')
                : t(
                    'Đã bật chế độ giọng nói: Hãy bấm nút Micro (🎙️) trên bàn phím điện thoại để đọc tiếng Việt, hoặc chạm câu mẫu bên dưới.',
                    'Voice mode active: Tap the Microphone (🎙️) key on your phone keyboard to dictate, or tap a phrase below.'
                )
        );
        setTimeout(() => {
            descriptionInputRef.current?.focus();
        }, 120);
    };

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
            if (photos.length > 0 && incidentId) {
                let uploadedCount = 0;
                let lastUploadError: any = null;
                for (const photo of photos) {
                    try {
                        await apiClient.uploadIncidentImage(incidentId, photo.uri, photo.base64 || undefined);
                        uploadedCount += 1;
                    } catch (uploadError: any) {
                        lastUploadError = uploadError;
                    }
                }
                if (uploadedCount < photos.length) {
                    Alert.alert(
                        t('Đã tạo báo cáo nhưng lỗi tải một số ảnh', 'Report Created, Some Photos Failed'),
                        t(
                            `Đã tải lên ${uploadedCount}/${photos.length} ảnh. ${lastUploadError?.message || 'Vui lòng kiểm tra kết nối.'}`,
                            `Uploaded ${uploadedCount}/${photos.length} photos. ${lastUploadError?.message || 'Please check your connection.'}`
                        ),
                        [{ text: t('Xong', 'Done'), onPress: () => navigation.goBack() }]
                    );
                    return;
                }
            }
            Alert.alert(t('Đã gửi báo cáo', 'Report Submitted'), t('Cảm ơn bạn đã góp phần xây dựng đô thị tốt hơn.', 'Thank you for helping improve our city.'), [
                { text: t('Xong', 'Done'), onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert(
                t('Gửi báo cáo thất bại', 'Report Submission Failed'),
                error?.response?.data?.error || error?.message || t('Vui lòng kiểm tra kết nối và thử lại.', 'Check your connection and try again.')
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

                <View style={styles.photoHeaderRow}>
                    <Text style={styles.sectionLabel}>
                        {t('Hình ảnh hiện trường', 'Incident Photos')}{' '}
                        <Text style={styles.optional}>
                            {t(`(Đã chọn ${photos.length}/${MAX_PHOTOS} ảnh)`, `(${photos.length}/${MAX_PHOTOS} selected)`)}
                        </Text>
                    </Text>
                    {photos.length > 0 && (
                        <TouchableOpacity onPress={() => setPhotos([])} disabled={loading}>
                            <Text style={styles.removePhotoText}>{t('Xóa tất cả', 'Clear all')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {photos.length === 0 ? (
                    <TouchableOpacity
                        style={styles.photoBox}
                        onPress={showImageOptions}
                        disabled={loading}
                    >
                        <Ionicons name="images-outline" size={28} color="#0CA29B" style={{ marginBottom: 5 }} />
                        <Text style={styles.photoTitle}>
                            {t('Tải lên nhiều ảnh hoặc chụp trực tiếp (tối đa 5 ảnh)', 'Upload multiple photos or take a photo (up to 5)')}
                        </Text>
                        <Text style={styles.photoHint}>
                            {t('Nhiều góc chụp giúp cơ quan xử lý và AI xác minh nhanh hơn', 'Multiple angles help response teams and AI verify faster')}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.multiPhotoSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.multiPhotoScroll}
                        >
                            {photos.map((item, idx) => (
                                <View key={`${item.uri}-${idx}`} style={styles.photoThumbWrap}>
                                    <Image source={{ uri: item.uri }} style={styles.photoThumbImage} />
                                    <View style={styles.photoIndexBadge}>
                                        <Text style={styles.photoIndexText}>#{idx + 1}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeSinglePhotoBtn}
                                        onPress={() => removePhotoAt(idx)}
                                        disabled={loading}
                                    >
                                        <Ionicons name="close" size={14} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {photos.length < MAX_PHOTOS && (
                                <TouchableOpacity
                                    style={styles.addMorePhotoCard}
                                    onPress={showImageOptions}
                                    disabled={loading}
                                >
                                    <Ionicons name="add-circle-outline" size={26} color="#0A9D96" />
                                    <Text style={styles.addMorePhotoText}>
                                        {t('Thêm ảnh', 'Add photo')}
                                    </Text>
                                    <Text style={styles.addMorePhotoCount}>
                                        {photos.length}/{MAX_PHOTOS}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.descriptionHeaderRow}>
                    <Text style={styles.sectionLabel}>{t('Mô tả chi tiết', 'Description')}</Text>
                    <TouchableOpacity
                        style={[
                            styles.micButton,
                            isListening && styles.micButtonActive,
                        ]}
                        onPress={toggleVoiceDictation}
                        disabled={loading}
                    >
                        <Ionicons
                            name={isListening ? 'mic' : 'mic-outline'}
                            size={15}
                            color={isListening ? '#FFFFFF' : '#0A9D96'}
                        />
                        <Text
                            style={[
                                styles.micButtonText,
                                isListening && styles.micButtonTextActive,
                            ]}
                        >
                            {isListening
                                ? t('Đang nghe... (Chạm để tắt)', 'Listening... (Tap to stop)')
                                : t('Nhập bằng giọng nói', 'Voice Input')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isListening && (
                    <View style={styles.voiceAssistantPanel}>
                        <View style={styles.voiceStatusRow}>
                            <View style={styles.voicePulseDot} />
                            <Text style={styles.voiceStatusMessage}>
                                {voiceStatusText ||
                                    t(
                                        'Micro đang bật: Hãy nói trực tiếp hoặc chọn câu đọc nhanh bên dưới.',
                                        'Microphone active: Speak directly or tap a quick phrase below.'
                                    )}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.smartComposeButton}
                            onPress={composeSmartVoiceDescription}
                        >
                            <Ionicons name="sparkles" size={14} color="#0F766E" />
                            <Text style={styles.smartComposeText}>
                                {t(
                                    'Tự động đọc & điền mô tả từ Tiêu đề + Vị trí GPS',
                                    'Auto-compose description from Title + GPS Location'
                                )}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.voicePhrasesLabel}>
                            {t('Chạm để chèn nhanh câu mô tả thường gặp:', 'Tap to insert common spoken phrases:')}
                        </Text>
                        <View style={styles.voicePhrasesWrap}>
                            {VOICE_DICTATION_PHRASES.map((phrase, idx) => {
                                const textValue = t(phrase.vi, phrase.en);
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.voicePhraseChip}
                                        onPress={() => appendSpokenPhrase(textValue)}
                                    >
                                        <Ionicons name="volume-medium-outline" size={13} color="#0A9D96" />
                                        <Text style={styles.voicePhraseChipText}>{textValue}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={styles.descriptionInputWrapper}>
                    <TextInput
                        ref={descriptionInputRef}
                        style={[styles.input, styles.description]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={t(
                            'Mô tả sự cố hoặc bấm nút "Nhập bằng giọng nói" 🎙️ ở góc phải...',
                            'Describe the incident or tap "Voice Input" 🎙️ above...'
                        )}
                        placeholderTextColor="#A5B1B8"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={[
                            styles.FloatingMicInsideInput,
                            isListening && styles.FloatingMicInsideInputActive,
                        ]}
                        onPress={toggleVoiceDictation}
                        disabled={loading}
                    >
                        <Ionicons
                            name={isListening ? 'mic' : 'mic-outline'}
                            size={18}
                            color={isListening ? '#FFF' : '#0A9D96'}
                        />
                    </TouchableOpacity>
                </View>

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
    description: { minHeight: 96, paddingTop: 12, paddingRight: 44 },
    photoHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
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
        paddingHorizontal: 12,
    },
    photoTitle: { color: '#334155', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    photoHint: { color: '#64748B', fontSize: 10, marginTop: 4, textAlign: 'center' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    removePhoto: { alignSelf: 'flex-end', marginTop: -11, marginBottom: 13 },
    removePhotoText: { color: '#C15A5A', fontSize: 11, fontWeight: '700', marginBottom: 8 },
    multiPhotoSection: {
        marginBottom: 16,
    },
    multiPhotoScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 4,
    },
    photoThumbWrap: {
        width: 106,
        height: 106,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#E2E8F0',
        position: 'relative',
    },
    photoThumbImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoIndexBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    photoIndexText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    removeSinglePhotoBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(220, 38, 38, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMorePhotoCard: {
        width: 106,
        height: 106,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#0A9D96',
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    addMorePhotoText: {
        color: '#0F766E',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
    },
    addMorePhotoCount: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    descriptionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    micButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E6F7F5',
        borderWidth: 1,
        borderColor: '#99E6DF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    micButtonActive: {
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
    },
    micButtonText: {
        color: '#0F766E',
        fontSize: 11,
        fontWeight: '700',
    },
    micButtonTextActive: {
        color: '#FFFFFF',
    },
    voiceAssistantPanel: {
        backgroundColor: '#F0FDFA',
        borderWidth: 1,
        borderColor: '#99E6DF',
        borderRadius: 12,
        padding: 11,
        marginBottom: 10,
    },
    voiceStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 8,
    },
    voicePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    voiceStatusMessage: {
        flex: 1,
        color: '#0F524F',
        fontSize: 11.5,
        fontWeight: '600',
        lineHeight: 16,
    },
    smartComposeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#CCFBF1',
        borderWidth: 1,
        borderColor: '#5EEAD4',
        borderRadius: 9,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 9,
    },
    smartComposeText: {
        color: '#0F766E',
        fontSize: 11.5,
        fontWeight: '700',
    },
    voicePhrasesLabel: {
        color: '#475569',
        fontSize: 10.5,
        fontWeight: '700',
        marginBottom: 6,
    },
    voicePhrasesWrap: {
        gap: 6,
    },
    voicePhraseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 6,
    },
    voicePhraseChipText: {
        flex: 1,
        color: '#334155',
        fontSize: 11,
        fontWeight: '500',
    },
    descriptionInputWrapper: {
        position: 'relative',
    },
    FloatingMicInsideInput: {
        position: 'absolute',
        right: 10,
        bottom: 24,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E6F7F5',
        borderWidth: 1,
        borderColor: '#99E6DF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    FloatingMicInsideInputActive: {
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
    },
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
