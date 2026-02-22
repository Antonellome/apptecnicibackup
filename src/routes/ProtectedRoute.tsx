import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // O un componente di caricamento
  }

  // Se l'utente non è loggato, lo reindirizzo alla pagina di login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se l'utente è loggato, mostro il layout principale con la pagina richiesta
  return <MainLayout><Outlet /></MainLayout>;
};
