import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  // L'ERRORE ERA QUI. Deve usare currentUser, non user.
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Ora il controllo è corretto.
  return currentUser ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
