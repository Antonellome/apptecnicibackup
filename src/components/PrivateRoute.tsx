import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'; // FIX: Percorso di importazione corretto
import { Box, CircularProgress } from '@mui/material';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
