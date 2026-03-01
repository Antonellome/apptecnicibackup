import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // O un componente di caricamento
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
