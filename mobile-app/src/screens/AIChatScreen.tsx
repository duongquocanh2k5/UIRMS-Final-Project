import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { AIChatMessage } from '../services/api';
import { apiClient } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

interface ChatItem extends AIChatMessage {
    id: string;
    suggestedCategoryId?: number | null;
}

export default function AIChatScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { language, t } = useLanguage();
    const quickQuestions = [
        t('Kiểm tra tiến độ báo cáo của tôi', 'Check my report status'),
        t('Cách phân loại mức độ sự cố?', 'How are incidents prioritized?'),
        t('Thời gian xử lý (SLA) là bao lâu?', 'What are the service-level targets (SLA)?'),
        t('Đường ngập nước và ổ gà báo ở đâu?', 'Where can I report flooding or potholes?'),
    ];
    const [messages, setMessages] = useState<ChatItem[]>([{
        id: 'welcome',
        role: 'model',
        text: t(
            'Xin chào! Tôi là Trợ lý UIRMS. Tôi có thể giúp bạn tra cứu báo cáo hoặc tư vấn cách gửi phản ánh sự cố đô thị.',
            'Hello! I am the UIRMS assistant. I can help you check reports or explain how to report urban incidents.'
        ),
    }]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [androidKeyboardSpace, setAndroidKeyboardSpace] = useState(0);
    const listRef = useRef<FlatList<ChatItem>>(null);

    useEffect(() => {
        setMessages((current) => current.map((item) => item.id === 'welcome'
            ? {
                ...item,
                text: t(
                    'Xin chào! Tôi là Trợ lý UIRMS. Tôi có thể giúp bạn tra cứu báo cáo hoặc tư vấn cách gửi phản ánh sự cố đô thị.',
                    'Hello! I am the UIRMS assistant. I can help you check reports or explain how to report urban incidents.'
                ),
            }
            : item));
    }, [language, t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [messages, sending, androidKeyboardSpace]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (event) => {
            if (Platform.OS === 'android') {
                // Đẩy khung nhập liệu lên đúng bằng chiều cao bàn phím trên Android
                setAndroidKeyboardSpace(event.endCoordinates.height + insets.bottom + 28);
            }
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 120);
        });

        const hideSub = Keyboard.addListener(hideEvent, () => {
            if (Platform.OS === 'android') {
                setAndroidKeyboardSpace(0);
            }
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    async function sendMessage(value = input) {
        const text = value.trim();
        if (!text || sending) return;

        // Lọc bỏ tin nhắn chào mừng ban đầu để tránh lỗi role đầu tiên là 'model'
        const history: AIChatMessage[] = messages
            .filter((item) => item.id !== 'welcome')
            .slice(-10)
            .map(({ role, text: messageText }) => ({ role, text: messageText }));

        const userMessage: ChatItem = { id: `user-${Date.now()}`, role: 'user', text };
        setMessages((current) => [...current, userMessage]);
        setInput('');
        setSending(true);

        try {
            const response = await apiClient.sendAIChatMessage(text, history, language);
            const reply = response?.data?.reply?.trim();
            setMessages((current) => [
                ...current,
                {
                    id: `model-${Date.now()}`,
                    role: 'model',
                    text:
                        reply ||
                        t('Xin lỗi, Trợ lý UIRMS hiện chưa có câu trả lời. Bạn có thể tiếp tục tạo báo cáo trong ứng dụng.', 'The UIRMS assistant does not have a response right now. You can still submit a report in the app.'),
                    suggestedCategoryId: response?.data?.suggestedCategoryId ?? null,
                },
            ]);
        } catch {
            setMessages((current) => [
                ...current,
                {
                    id: `model-${Date.now()}`,
                    role: 'model',
                    text: t('Xin lỗi, hiện chưa kết nối được với Trợ lý UIRMS. Bạn có thể thử lại sau hoặc tạo báo cáo trực tiếp trên ứng dụng.', 'Unable to connect to the UIRMS assistant right now. Please try again later or submit a report directly in the app.'),
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    function renderMessage({ item }: { item: ChatItem }) {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
                <View style={[styles.messageColumn, isUser && styles.userMessageColumn]}>
                    {!isUser && <Text style={styles.assistantLabel}>🤖 {t('Trợ lý UIRMS', 'UIRMS Assistant')}</Text>}
                    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                        <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
                    </View>
                    {!isUser && item.suggestedCategoryId != null && (
                        <TouchableOpacity
                            style={styles.suggestionButton}
                            onPress={() => {
                                Keyboard.dismiss();
                                navigation.navigate('ReportIncident', { categoryId: item.suggestedCategoryId });
                            }}
                            accessibilityRole="button"
                        >
                            <Text style={styles.suggestionText}>{t('＋ Tạo báo cáo danh mục này ngay', '＋ Report this issue now')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    const content = (
        <View style={[styles.screen, Platform.OS === 'android' && { paddingBottom: androidKeyboardSpace }]}>
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={
                    sending ? (
                        <View style={styles.typingRow}>
                            <ActivityIndicator size="small" color="#0A9D96" />
                            <Text style={styles.typingText}>{t('Trợ lý đang trả lời...', 'Assistant is responding...')}</Text>
                        </View>
                    ) : undefined
                }
            />
            <View
                style={[
                    styles.composerArea,
                    { paddingBottom: Platform.OS === 'ios' ? 12 : androidKeyboardSpace === 0 ? 16 : 10 },
                ]}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.quickQuestions}
                >
                    {quickQuestions.map((question) => (
                        <TouchableOpacity
                            key={question}
                            style={styles.quickChip}
                            onPress={() => void sendMessage(question)}
                            disabled={sending}
                            accessibilityRole="button"
                        >
                            <Text style={styles.quickChipText}>{question}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={styles.inputRow}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        onFocus={() => {
                            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
                        }}
                        placeholder={t('Nhập câu hỏi hoặc mô tả sự cố...', 'Ask a question or describe an incident...')}
                        placeholderTextColor="#91A0AA"
                        style={styles.input}
                        multiline
                        maxLength={1000}
                        editable={!sending}
                        returnKeyType="send"
                        blurOnSubmit
                        onSubmitEditing={() => void sendMessage()}
                        accessibilityLabel={t('Tin nhắn cho Trợ lý UIRMS', 'Message the UIRMS assistant')}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
                        onPress={() => void sendMessage()}
                        disabled={!input.trim() || sending}
                        accessibilityLabel={t('Gửi tin nhắn', 'Send message')}
                        accessibilityRole="button"
                    >
                        <Text style={styles.sendButtonText}>{sending ? '…' : t('Gửi', 'Send')}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>{t('Tối đa 1000 ký tự', 'Up to 1,000 characters')}</Text>
            </View>
        </View>
    );

    if (Platform.OS === 'ios') {
        return (
            <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={90}>
                {content}
            </KeyboardAvoidingView>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F8FA' },
    messageList: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
    messageRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 14 },
    userMessageRow: { justifyContent: 'flex-end' },
    messageColumn: { maxWidth: '88%', alignItems: 'flex-start' },
    userMessageColumn: { alignItems: 'flex-end' },
    assistantLabel: { color: '#52646E', fontSize: 11, fontWeight: '700', marginBottom: 5, marginLeft: 4 },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
    assistantBubble: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E7EDF0', borderTopLeftRadius: 6 },
    userBubble: { backgroundColor: '#0A9D96', borderTopRightRadius: 6 },
    messageText: { color: '#263943', fontSize: 14, lineHeight: 21 },
    userMessageText: { color: '#FFF' },
    suggestionButton: {
        marginTop: 7,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#0A9D96',
        backgroundColor: '#E8F7F5',
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    suggestionText: { color: '#087F7A', fontSize: 12, fontWeight: '700' },
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 5, marginBottom: 8 },
    typingText: { color: '#74838D', fontSize: 12 },
    composerArea: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5EDF1',
        paddingTop: 10,
    },
    quickQuestions: { paddingHorizontal: 14, paddingBottom: 9, alignItems: 'center' },
    quickChip: {
        maxWidth: 245,
        marginRight: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#D5E7E5',
        backgroundColor: '#F7FBFA',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    quickChipText: { color: '#28615E', fontSize: 11, fontWeight: '600' },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#DCE6E9',
        backgroundColor: '#F8FAFB',
        paddingLeft: 12,
        paddingRight: 5,
        paddingVertical: 5,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        paddingTop: 10,
        paddingBottom: 8,
        color: '#263943',
        fontSize: 14,
        lineHeight: 19,
    },
    sendButton: {
        minWidth: 54,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#0A9D96',
        marginLeft: 7,
    },
    sendButtonDisabled: { backgroundColor: '#A8D8D5' },
    sendButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    inputHint: { alignSelf: 'flex-end', marginTop: 4, marginHorizontal: 16, color: '#94A1AA', fontSize: 10 },
});