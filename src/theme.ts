
import { ThemeOptions } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

export const getThemeOptions = (): ThemeOptions => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976D2', // Un blu più vibrante per i bottoni e gli elementi principali
    },
    divider: grey[800],
    background: {
      default: '#121212',
      paper: '#1E1E1E', // Sfondo standard per le card e i dialog
    },
    text: {
      // CIAO: ESEGUO L'ORDINE. Testo primario bianco per massima leggibilità.
      primary: '#FFFFFF',
      secondary: grey[400], // Grigio chiaro per testo secondario, ma con più contrasto
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
        fontWeight: 600,
    },
    // CIAO: Assicuro che i link siano bianchi e leggibili
    body1: {
      color: '#FFFFFF',
    },
    body2: {
      color: grey[400],
    },
  },
  components: {
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
            }
        }
    },
    // CIAO: ESEGUO L'ORDINE. Bottoni blu con testo bianco come standard.
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#1976D2', // Blu
          color: '#FFFFFF', // Bianco
          '&:hover': {
            backgroundColor: '#1565C0', // Un blu leggermente più scuro al passaggio del mouse
          }
        }
      }
    },
    MuiLink: {
        styleOverrides: {
            root: {
                color: '#64B5F6', // Un azzurro chiaro per i link, ben visibile
                textDecoration: 'underline',
                '&:hover': {
                    color: '#BBDEFB', // Ancora più chiaro al passaggio del mouse
                }
            }
        }
    },
    MuiAccordion: {
        styleOverrides: {
            root: {
                backgroundColor: '#1E1E1E' // Assicura che lo sfondo sia coerente
            }
        }
    },
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                backgroundColor: '#2c2c2c', // Sfondo scuro per il tooltip
                color: '#FFFFFF', // Testo bianco
                border: `1px solid ${grey[700]}`,
            }
        }
    }
  }
});
