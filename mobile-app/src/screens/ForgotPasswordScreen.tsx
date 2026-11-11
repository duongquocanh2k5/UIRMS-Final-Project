import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function ForgotPasswordScreen({ navigation }: any) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSend = async () => {
        if (!email) {
            setMessage(t('Vui lòng nhập email', 'Please enter your email address'));
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            await apiClient.forgotPassword(email);
            setCodeSent(true);
            setMessage(t('Mã đặt lại mật khẩu đã được gửi đến email. Vui lòng kiểm tra hộp thư.', 'A password reset code has been sent. Please check your inbox.'));
        } catch (err: any) {
            const resp = err.response?.data;
            if (resp?.error) setMessage(resp.error);
            else setMessage(t('Đã xảy ra lỗi khi gửi mã.', 'Unable to send the code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!resetCode.trim() || !newPassword) {
            setMessage(t('Vui lòng nhập mã OTP và mật khẩu mới.', 'Enter the verification code and your new password.'));
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            await apiClient.resetPassword(email, resetCode.trim(), newPassword);
            setResetComplete(true);
            setMessage(t('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.', 'Password reset successfully. You can now log in with your new password.'));
        } catch (err: any) {
            const resp = err.response?.data;
            if (resp?.error) setMessage(resp.error);
            else setMessage(t('Đã xảy ra lỗi khi đặt lại mật khẩu.', 'Unable to reset your password. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('Quên mật khẩu', 'Forgot Password')}</Text>
                <LanguageToggle />
            </View>
            <Text style={styles.helper}>{t('Nhập email bạn đã dùng để đăng ký để nhận mã đặt lại mật khẩu.', 'Enter the email address you used to register to receive a password reset code.')}</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setMessage(null); setCodeSent(false); setResetComplete(false); }}
                editable={!loading && !codeSent}
            />
            {codeSent && !resetComplete && <>
                <TextInput
                    style={[styles.input, styles.additionalInput]}
                    placeholder={t('Mã xác nhận (OTP)', 'Verification code (OTP)')}
                    keyboardType="number-pad"
                    value={resetCode}
                    onChangeText={(value) => { setResetCode(value); setMessage(null); }}
                    editable={!loading}
                />
                <TextInput
                    style={[styles.input, styles.additionalInput]}
                    placeholder={t('Mật khẩu mới', 'New password')}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={(value) => { setNewPassword(value); setMessage(null); }}
                    editable={!loading}
                />
            </>}
            {message ? <Text style={[styles.message, resetComplete && styles.successMessage]}>{message}</Text> : null}
            {!codeSent ? (
                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSend} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('Gửi mã', 'Send code')}</Text>}
                </TouchableOpacity>
            ) : resetComplete ? (
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.buttonText}>{t('Đăng nhập', 'Log in')}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('Đặt lại mật khẩu', 'Reset password')}</Text>}
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>{t('Quay về đăng nhập', 'Back to log in')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 8, marginTop: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    helper: { color: '#555', marginBottom: 12 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    additionalInput: { marginTop: 12 },
    button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    link: { color: '#2563eb', textAlign: 'center', marginTop: 12 },
    message: { color: '#dc2626', marginTop: 8 },
    successMessage: { color: '#16834A' },
});
