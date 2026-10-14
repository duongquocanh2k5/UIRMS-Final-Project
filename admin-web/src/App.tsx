import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AuthLayout from './components/AuthLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import IncidentDetail from './pages/IncidentDetail';
import Incidents from './pages/Incidents';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Stats from './pages/Stats';

function AppRoutes() {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) return <AuthLayout><Routes><Route path="/login" element={<Login />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} /></Routes></AuthLayout>;

    const isSuperAdmin = user.role === 'super_admin';
    const isTechnician = user.role === 'technician';
    const defaultRoute = isSuperAdmin ? '/' : '/incidents';

    return <AdminLayout fullBleed={location.pathname === '/map'}><Routes>
        <Route path="/" element={isSuperAdmin ? <Dashboard /> : <Navigate to="/incidents" replace />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/map" element={isSuperAdmin ? <MapPage /> : <Navigate to="/incidents" replace />} />
        <Route path="/stats" element={isSuperAdmin ? <Stats /> : <Navigate to="/incidents" replace />} />
        <Route path="/staff" element={isTechnician ? <Navigate to="/incidents" replace /> : <Staff />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes></AdminLayout>;
}

export default function App() {
    return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>;
}
