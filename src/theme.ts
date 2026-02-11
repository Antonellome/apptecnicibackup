import { createTheme, ThemeOptions } from '@mui/material/styles';

// --- Palette per il tema scuro (come da ULTIMA INDICAZIONE) ---
const darkPalette: ThemeOptions['palette'] = {
  mode: 'dark',

  // L'AppBar DEVE AVERE LO STESSO COLORE DELLE TAB.
  primary: {
    main: '#1976D2', // Blu standard, lo stesso di 'paper'
  },

  // Non più utilizzato, ma lo lascio per evitare errori.
  secondary: {
    main: '#2196F3',
  },

  background: {
    default: '#000000',   // Sfondo NERO
    // Questo è il blu delle TAB, ora usato anche dall'AppBar.
    paper: '#1976D2',     // Blu standard
  },

  text: {
    primary: '#FFFFFF',   // Testo principale BIANCO
    secondary: '#B0B0B0',
  },
  
  // Questi colori non vengono toccati.
  grey: {
    800: '#1C2536',
    700: '#2196F3',
  },
};

// --- Creazione del tema scuro ---
const darkTheme = createTheme({
  palette: darkPalette,
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
});

// Esportiamo un oggetto con i temi
export const appThemes = {
  dark: darkTheme,
};
