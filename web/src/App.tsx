import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OwnerDashboard from './pages/Owner/Dashboard';
import OwnerPrices from './pages/Owner/Prices';
import OwnerQRCode from './pages/Owner/QRCode';
import AddShop from './pages/SuperAdmin/AddShop';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate to="/login" replace />} path="/" />
        <Route element={<Login />} path="/login" />
        <Route
          element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
          path="/super-admin/dashboard"
        />
        <Route
          element={
            <ProtectedRoute requiredRole="super_admin">
              <AddShop />
            </ProtectedRoute>
          }
          path="/super-admin/add-shop"
        />
        <Route
          element={
            <ProtectedRoute requiredRole="shop_owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
          path="/owner/dashboard"
        />
        <Route
          element={
            <ProtectedRoute requiredRole="shop_owner">
              <OwnerPrices />
            </ProtectedRoute>
          }
          path="/owner/prices"
        />
        <Route
          element={
            <ProtectedRoute requiredRole="shop_owner">
              <OwnerQRCode />
            </ProtectedRoute>
          }
          path="/owner/qr"
        />
        <Route element={<Menu />} path="/menu/:shopId" />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
