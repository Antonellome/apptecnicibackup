import React, { ReactNode } from 'react';
import { Grid, Typography, Divider, Box } from '@mui/material';

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <Grid size={12} sx={{ mb: 4 }}>
      <Box mb={2}>
        <Typography variant="h6" component="h2" gutterBottom>{title}</Typography>
        <Divider />
      </Box>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Grid>
  );
};

export default FormSection;
