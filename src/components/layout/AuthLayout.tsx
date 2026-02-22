import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // O un componente di caricamento
  }

  // Se l'utente è già loggato, lo reindirizzo alla home
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Altrimenti, mostro la pagina di login o registrazione
  return <Outlet />;
};

export default AuthLayout;
