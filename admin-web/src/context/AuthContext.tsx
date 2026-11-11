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
    const storedUser = localStorage.getItem('adminUser');
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
        localStorage.getItem('adminToken') ? getStoredUser() : fallbackUser
    );
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));

    useEffect(() => {
        const handleUnauthorized = () => {
            localStorage.removeItem('adminLastActivity');
            setUser(fallbackUser);
            setToken(null);
        };
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'adminToken') {
                if (!event.newValue) {
                    localStorage.removeItem('adminLastActivity');
                    setUser(fallbackUser);
                    setToken(null);
                    return;
                }
                setToken(event.newValue);
                setUser(getStoredUser());
            } else if (event.key === 'adminUser') {
                setUser(localStorage.getItem('adminToken') ? getStoredUser() : fallbackUser);
            }
        };
        window.addEventListener('admin:unauthorized', handleUnauthorized);
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('admin:unauthorized', handleUnauthorized);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const login = async (email: string, password: string, role: AdminRole) => {
        const response = await adminApi.adminLogin(email, password, role);
        const nextUser = { id: response.data.user.id, email: response.data.user.email, username: response.data.user.username, name: response.data.user.full_name, role: response.data.user.role };
        localStorage.setItem('adminUser', JSON.stringify(nextUser));
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminLastActivity', String(Date.now()));
        setUser(nextUser);
        setToken(response.data.token);
    };

    const logout = useCallback(() => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminLastActivity');
        setUser(fallbackUser);
        setToken(null);
    }, []);

    useEffect(() => {
        if (!token) return;

        let idleTimer: number;
        const scheduleLogout = () => {
            const lastActivity = Number(localStorage.getItem('adminLastActivity')) || Date.now();
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
            const lastActivity = Number(localStorage.getItem('adminLastActivity')) || 0;
            if (now - lastActivity >= 1000) localStorage.setItem('adminLastActivity', String(now));
            scheduleLogout();
        };
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'adminLastActivity') scheduleLogout();
            if (event.key === 'adminToken' && event.newValue === null) logout();
        };
        const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'mousemove'] as const;

        if (!localStorage.getItem('adminLastActivity')) localStorage.setItem('adminLastActivity', String(Date.now()));
        scheduleLogout();
        activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity));
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', scheduleLogout);

        return () => {
            window.clearTimeout(idleTimer);
            activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
            window.removeEventListener('storage', handleStorageChange);
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
            localStorage.setItem('adminUser', JSON.stringify(nextUser));
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
