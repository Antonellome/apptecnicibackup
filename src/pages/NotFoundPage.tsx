import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        Pagina Non Trovata
      </Typography>
      <Typography variant="body1" gutterBottom>
        La pagina che stai cercando non esiste.
      </Typography>
      <Button component={Link} to="/" variant="contained" color="primary" sx={{ mt: 2 }}>
        Torna alla Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
