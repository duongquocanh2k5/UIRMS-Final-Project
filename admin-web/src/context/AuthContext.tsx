import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminApi, type AdminRole } from '../services/api';

export interface AdminUser {
    id?: number;
    email?: string;
    username?: string;
    name: string;
    role: string;
    avatarUrl?: string;
}

interface AuthContextValue {
    user: AdminUser;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, role: AdminRole) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<AdminUser>) => void;
}

const fallbackUser: AdminUser = {
    name: 'Chưa xác định',
    role: '',
};

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredUser(): AdminUser {
    const storedUser = sessionStorage.getItem('adminUser');
    if (!storedUser) return fallbackUser;

    try {
        const parsed = JSON.parse(storedUser) as Partial<AdminUser>;
        if (typeof parsed.name !== 'string' || typeof parsed.role !== 'string') return fallbackUser;
        return { ...parsed, name: parsed.name, role: parsed.role };
    } catch {
        return fallbackUser;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AdminUser>(() =>
        sessionStorage.getItem('adminToken') ? getStoredUser() : fallbackUser
    );
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('adminToken'));

    useEffect(() => {
        const handleUnauthorized = () => {
            sessionStorage.removeItem('adminLastActivity');
            setUser(fallbackUser);
            setToken(null);
        };
        window.addEventListener('admin:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('admin:unauthorized', handleUnauthorized);
        };
    }, []);

    const login = async (email: string, password: string, role: AdminRole) => {
        const response = await adminApi.adminLogin(email, password, role);
        const nextUser = { id: response.data.user.id, email: response.data.user.email, username: response.data.user.username, name: response.data.user.full_name, role: response.data.user.role };
        sessionStorage.setItem('adminUser', JSON.stringify(nextUser));
        sessionStorage.setItem('adminToken', response.data.token);
        sessionStorage.setItem('adminLastActivity', String(Date.now()));
        setUser(nextUser);
        setToken(response.data.token);
    };

    const logout = useCallback(() => {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminLastActivity');
        setUser(fallbackUser);
        setToken(null);
    }, []);

    useEffect(() => {
        if (!token) return;

        let idleTimer: number;
        const scheduleLogout = () => {
            const lastActivity = Number(sessionStorage.getItem('adminLastActivity')) || Date.now();
            const remaining = ADMIN_IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
            if (remaining <= 0) {
                logout();
                return;
            }
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(logout, remaining);
        };
        const handleActivity = () => {
            const now = Date.now();
            const lastActivity = Number(sessionStorage.getItem('adminLastActivity')) || 0;
            if (now - lastActivity >= 1000) sessionStorage.setItem('adminLastActivity', String(now));
            scheduleLogout();
        };
        const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'mousemove'] as const;

        if (!sessionStorage.getItem('adminLastActivity')) sessionStorage.setItem('adminLastActivity', String(Date.now()));
        scheduleLogout();
        activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity));
        document.addEventListener('visibilitychange', scheduleLogout);

        return () => {
            window.clearTimeout(idleTimer);
            activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
            document.removeEventListener('visibilitychange', scheduleLogout);
        };
    }, [token, logout]);

    useEffect(() => {
        if (!token) return;

        const sendPresence = () => {
            if (document.visibilityState === 'visible') void adminApi.updatePresence().catch(() => { });
        };
        sendPresence();
        const presenceTimer = window.setInterval(sendPresence, 30_000);
        document.addEventListener('visibilitychange', sendPresence);

        return () => {
            window.clearInterval(presenceTimer);
            document.removeEventListener('visibilitychange', sendPresence);
        };
    }, [token]);

    const updateUser = useCallback((updates: Partial<AdminUser>) => {
        setUser((current) => {
            const nextUser = { ...current, ...updates };
            sessionStorage.setItem('adminUser', JSON.stringify(nextUser));
            return nextUser;
        });
    }, []);

    return <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(token), login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
