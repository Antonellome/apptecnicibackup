import React from 'react';
import { Typography, Box } from '@mui/material';

interface FormHeaderProps {
  title: string;
  subtitle: string;
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, subtitle }) => {
  return (
    <Box mb={4} textAlign="center">
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary">
        {subtitle}
      </Typography>
    </Box>
  );
};

export default FormHeader;