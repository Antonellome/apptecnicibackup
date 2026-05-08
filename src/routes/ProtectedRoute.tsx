import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout'; // IMPORTA IL LAYOUT

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // O un componente di caricamento
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // AVVOLGE L'OUTLET CON IL LAYOUT PRINCIPALE
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};
