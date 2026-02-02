import { Box, Typography } from '@mui/material';
import MenuBar from '../components/MenuBar';

const MonthlyReportPage = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
    }}>
      <MenuBar title="Report Mensile" />
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Riepilogo Mensile
        </Typography>
        <Typography variant="body1">
          Qui verrà visualizzato il riepilogo del mese.
        </Typography>
        {/* Qui andrà il contenuto del report mensile */}
      </Box>
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by "AS"
      </Typography>
    </Box>
  );
};

export default MonthlyReportPage;
