
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../routes/index';
import { GlobalDataContext } from '../contexts/GlobalDataContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const AppContent: React.FC = () => {
  const globalDataContext = React.useContext(GlobalDataContext);

  // Handle both the undefined context state and the explicit loading state.
  if (!globalDataContext || globalDataContext.loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Caricamento dati in corso...</Typography>
      </Box>
    );
  }

  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
};

export default AppContent;
