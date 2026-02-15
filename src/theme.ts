
import { ThemeOptions } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

// CIAO: Esporto una funzione che restituisce SEMPRE il tema scuro.
// La logica per il tema chiaro e il colore giallo è stata rimossa.
export const getThemeOptions = (): ThemeOptions => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0D47A1', // Blu primario
    },
    divider: grey[700],
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: grey[500],
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
        fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
            }
        }
    }
  }
});
