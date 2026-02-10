
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NoteIcon from '@mui/icons-material/Note';

const DashboardWidget: React.FC<{ title: string; icon: React.ReactElement; children: React.ReactNode }> = ({ title, icon, children }) => (
  <Grid item xs={12} md={4} lg={4}>
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 240 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" component="h2" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Paper>
  </Grid>
);

const HomePage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <DashboardWidget title="Rapportini Recenti" icon={<SummarizeIcon color="primary" />}>
        <Typography>Nessun rapportino recente.</Typography>
      </DashboardWidget>
      <DashboardWidget title="Presenze Mensili" icon={<CalendarMonthIcon color="primary" />}>
        <Typography>Dati presenze non disponibili.</Typography>
      </DashboardWidget>
      <DashboardWidget title="Note Rapide" icon={<NoteIcon color="primary" />}>
        <Typography>Nessuna nota.</Typography>
      </DashboardWidget>
    </Grid>
  );
};

export default HomePage;
