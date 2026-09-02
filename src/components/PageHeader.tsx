
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Mostra il pulsante "Indietro" solo se non siamo nella pagina principale
  const showBackButton = location.pathname !== '/';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      {showBackButton && (
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
      )}
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
    </Box>
  );
};

export default PageHeader;
