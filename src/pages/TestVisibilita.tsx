import { Box, Typography } from '@mui/material';

const TestVisibilita = () => {
  return (
    <Box sx={{ p: 4, textAlign: 'center', backgroundColor: '#ff00ff', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <Typography variant="h1" component="h1" gutterBottom>
        TEST DI VISIBILITÀ ATTIVO
      </Typography>
      <Typography variant="h4">
        SE VEDI QUESTA PAGINA, STAI VISITANDO LA ROTTA /test-visibilita.
      </Typography>
      <Typography variant="h5" sx={{ mt: 2 }}>
        Questo conferma che il sistema di routing e il caricamento di NUOVI componenti funzionano.
      </Typography>
    </Box>
  );
};

export default TestVisibilita;
