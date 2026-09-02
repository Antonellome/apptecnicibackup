import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

// Il componente ora accetta 'children' come prop
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Se l'utente è autenticato, renderizza i figli, altrimenti reindirizza al login
  return user ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute;
