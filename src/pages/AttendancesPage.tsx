import { Box, Typography } from '@mui/material';
import MenuBar from '../components/MenuBar';

const AttendancesPage = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
    }}>
      <MenuBar title="Presenze" />
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Gestione Presenze
        </Typography>
        <Typography variant="body1">
          Qui sarà possibile gestire le presenze.
        </Typography>
        {/* Qui andrà il contenuto per la gestione delle presenze */}
      </Box>
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default AttendancesPage;
