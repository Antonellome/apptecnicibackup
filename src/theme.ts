
import { createTheme } from '@mui/material/styles';
import { type ThemeOptions } from '@mui/material'; // <-- CORREZIONE: Importazione del tipo dalla libreria principale

/**
 * Opzioni del tema condivise sia in modalità light che dark.
 * Questo include tipografia, forma dei componenti, ecc.
 */
const sharedThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '\"Roboto\", \"Helvetica\", \"Arial\", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Bordi leggermente arrotondati
  },
};

// Palette per la LIGHT MODE
const lightPalette = {
  mode: 'light',
  primary: {
    main: '#1976d2', // Blu standard di Material-UI
  },
  background: {
    default: '#f4f6f8', // Un grigio molto chiaro per lo sfondo
    paper: '#ffffff',   // Bianco puro per le card e le superfici
  },
};

// Palette per la DARK MODE - **AGGIORNATA COME DA BLUEPRINT**
const darkPalette = {
  mode: 'dark' as const, // Aggiunto 'as const' per coerenza di tipo
  primary: {
    main: '#4F8BFF', // Un blu più vibrante per risaltare sul fondo scuro
  },
  background: {
    default: '#0D1B2A', // **Blu notte** per lo sfondo principale dell'app
    paper: '#1B263B',   // Blu scuro più chiaro per le superfici (es. Card)
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0C4DE', // Un grigio-blu per testi secondari e icone non attive
  },
};

/**
 * Funzione che crea e restituisce un tema MUI completo in base alla modalità fornita.
 * @param mode La modalità del tema desiderata: 'light' o 'dark'
 * @returns Un oggetto tema di Material-UI
 */
export const getTheme = (mode: 'light' | 'dark') => {
  const palette = mode === 'light' ? lightPalette : darkPalette;
  return createTheme({
    ...sharedThemeOptions,
    palette: palette,
    components: {
        // Override globali per componenti specifici
        MuiAppBar: {
            styleOverrides: {
                root: {
                    // Applica uno sfondo leggermente trasparente in dark mode
                    backgroundColor: mode === 'dark' ? 'rgba(27, 38, 59, 0.8)' : undefined,
                    backdropFilter: mode === 'dark' ? 'blur(8px)' : undefined,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${palette.divider}`
                }
            }
        }
    }
  });
};
