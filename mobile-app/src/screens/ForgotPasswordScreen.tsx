import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSend = async () => {
        if (!email) {
            setMessage('Vui lòng nhập email');
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            await apiClient.forgotPassword(email);
            setMessage('Mã đặt lại mật khẩu đã được gửi đến email. Vui lòng kiểm tra hộp thư.');
        } catch (err: any) {
            const resp = err.response?.data;
            if (resp?.error) setMessage(resp.error);
            else setMessage('Đã xảy ra lỗi khi gửi mã.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quên mật khẩu</Text>
            <Text style={styles.helper}>Nhập email bạn đã dùng để đăng ký để nhận mã đặt lại mật khẩu.</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setMessage(null); }}
                editable={!loading}
            />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSend} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi mã</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Quay về đăng nhập</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 8, marginTop: 20 },
    helper: { color: '#555', marginBottom: 12 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    link: { color: '#2563eb', textAlign: 'center', marginTop: 12 },
    message: { color: '#dc2626', marginTop: 8 },
});
