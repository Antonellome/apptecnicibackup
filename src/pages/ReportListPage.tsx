import { Box, Typography } from '@mui/material';
import MenuBar from '../components/MenuBar';

const ReportListPage = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
    }}>
      <MenuBar title="Lista Report" />
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Elenco dei Report
        </Typography>
        <Typography variant="body1">
          Qui verrà visualizzata la lista dei report creati.
        </Typography>
        {/* Qui andrà la lista dei report */}
      </Box>
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by "AS"
      </Typography>
    </Box>
  );
};

export default ReportListPage;
