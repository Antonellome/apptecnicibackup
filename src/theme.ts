import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4F7DFF', // Il nostro blu di riferimento
    },
    background: {
      default: '#1a1a1a', // Sfondo di default
      paper: '#2a2a2a',   // Sfondo per elementi come le Card
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
  },
});

export default theme;
