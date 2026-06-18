import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole: UserRole;
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { token, user, isAuthenticated } = useAuth();

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
