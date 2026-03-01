import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const FullScreenLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#121212', // Sfondo nero come descritto
    }}
  >
    <CircularProgress />
  </Box>
);

export default FullScreenLoader;
