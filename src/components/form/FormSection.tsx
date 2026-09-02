import React, { ReactNode } from 'react';
import { Typography, Divider, Box } from '@mui/material';
import Grid from '@mui/material/Grid'; // <-- IMPORT CORRETTO (V2)

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <Grid sx={{ mb: 4 }} size={12}>
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
