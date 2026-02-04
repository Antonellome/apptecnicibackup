import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material'; // Corrected: Import type from @mui/material

// Definiamo opzioni di tema condivise che non cambiano tra light e dark
const sharedThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.3s ease-in-out',
        },
      },
    },
  },
};

// Definiamo le palette per le due modalità
const lightPalette = {
  mode: 'light',
  primary: {
    main: '#2962FF', // Un blu brillante per il light mode
  },
  background: {
    default: '#f4f5f7',
    paper: '#ffffff',
  },
  text: {
    primary: '#172b4d',
    secondary: '#5e6c84',
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#4F7DFF', // Il nostro blu di riferimento per il dark mode
  },
  background: {
    default: '#1a1a1a',
    paper: '#2a2a2a',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
  },
};

/**
 * Funzione che crea e restituisce un tema MUI completo in base alla modalità fornita.
 * @param mode La modalità del tema desiderata: 'light' or 'dark'
 * @returns Un oggetto tema di Material-UI
 */
export const getTheme = (mode: 'light' | 'dark') => {
  const palette = mode === 'light' ? lightPalette : darkPalette;
  return createTheme({
    ...sharedThemeOptions,
    palette: palette,
  });
};
