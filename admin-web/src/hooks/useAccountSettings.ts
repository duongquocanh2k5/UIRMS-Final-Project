import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, type AdminProfile, type UpdateAdminProfilePayload } from '../services/api';

interface ProfileResult {
    key: number;
    profile: AdminProfile | null;
    error: string;
}

export function useAccountSettings() {
    const { updateUser } = useAuth();
    const [reloadKey, setReloadKey] = useState(0);
    const [profileResult, setProfileResult] = useState<ProfileResult>({ key: -1, profile: null, error: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [profileSaveError, setProfileSaveError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        let active = true;
        adminApi.getAdminProfile()
            .then(({ data }) => {
                if (!active) return;
                setProfileResult({ key: reloadKey, profile: data, error: '' });
                updateUser({ name: data.name, email: data.email, username: data.username, role: data.role, avatarUrl: data.avatar_url ?? undefined });
            })
            .catch((reason: unknown) => {
                if (active) setProfileResult({ key: reloadKey, profile: null, error: reason instanceof Error ? reason.message : 'Không thể tải thông tin tài khoản.' });
            });
        return () => { active = false; };
    }, [reloadKey, updateUser]);

    async function saveProfile(payload: UpdateAdminProfilePayload) {
        setProfileSaving(true);
        setProfileMessage('');
        setProfileSaveError('');
        try {
            const { data } = await adminApi.updateAdminProfile(payload);
            setProfileResult({ key: reloadKey, profile: data, error: '' });
            updateUser({ name: data.name, email: data.email, username: data.username, role: data.role, avatarUrl: data.avatar_url ?? undefined });
            setProfileMessage('Thông tin cá nhân đã được lưu.');
        } catch (reason) {
            setProfileSaveError(reason instanceof Error ? reason.message : 'Không thể lưu thông tin cá nhân.');
            throw reason;
        } finally {
            setProfileSaving(false);
        }
    }

    async function changePassword(currentPassword: string, newPassword: string) {
        setPasswordSaving(true);
        setPasswordMessage('');
        setPasswordError('');
        try {
            const response = await adminApi.changeAdminPassword({ currentPassword, newPassword });
            setPasswordMessage(response.data.message || 'Đổi mật khẩu thành công.');
        } catch (reason) {
            setPasswordError(reason instanceof Error ? reason.message : 'Không thể đổi mật khẩu.');
            throw reason;
        } finally {
            setPasswordSaving(false);
        }
    }

    const current = profileResult.key === reloadKey;
    return {
        profile: current ? profileResult.profile : null,
        loading: !current,
        loadError: current ? profileResult.error : '',
        profileSaving,
        profileMessage,
        profileSaveError,
        passwordSaving,
        passwordMessage,
        passwordError,
        saveProfile,
        changePassword,
        refresh: () => setReloadKey((key) => key + 1),
    };
}