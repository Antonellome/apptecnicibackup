
import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const FullScreenLoader: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 9999,
            }}
        >
            <CircularProgress />
        </Box>
    );
};

export default FullScreenLoader;
