
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Corretto: usa l'hook di autenticazione
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth(); // Corretto: usa i dati giusti

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Corretto: l'autenticazione dipende dall'esistenza di currentUser
  return currentUser ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
