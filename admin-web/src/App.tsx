import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AuthLayout from './components/AuthLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import IncidentDetail from './pages/IncidentDetail';
import Incidents from './pages/Incidents';
import Login from './pages/Login';
import Register from './pages/Register';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Stats from './pages/Stats';

function AppRoutes() {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) return <AuthLayout><Routes><Route path="/login" element={<Login />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} /></Routes></AuthLayout>;

    return <AdminLayout><Routes><Route path="/" element={<Dashboard />} /><Route path="/incidents" element={<Incidents />} /><Route path="/incidents/:id" element={<IncidentDetail />} /><Route path="/map" element={<Dashboard />} /><Route path="/stats" element={<Stats />} /><Route path="/staff" element={<Staff />} /><Route path="/settings" element={<Settings />} /><Route path="/register" element={['super_admin', 'manager'].includes(user.role) ? <Register /> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AdminLayout>;
}

export default function App() {
    return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>;
}
