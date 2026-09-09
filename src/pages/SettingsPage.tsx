import React, { useEffect, useState, useReducer, useContext, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';
import { Impostazioni, TariffaLocale, TipoGiornata } from '@/models/definitions';
import { ForceUpdateButton } from '@/components/ForceUpdateButton';
import { GlobalDataContext } from '@/contexts/GlobalDataContext';

// --- STATE MANAGEMENT ---
interface SettingsState {
    tariffe: TariffaLocale[];
    isSaving: boolean;
    isDirty: boolean;
}


type SettingsAction =
    | { type: 'SET_TARIFFE'; payload: TariffaLocale[] }
    | { type: 'UPDATE_TARIFFA_COSTO'; payload: { tipoGiornataId: string; costo: number } }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SAVE_SUCCESS' };

const initialState: SettingsState = {
    tariffe: [],
    isSaving: false,
    isDirty: false,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
    switch (action.type) {
        case 'SET_TARIFFE':
             if (state.isDirty) return state; 
            return { ...state, tariffe: action.payload };

        case 'UPDATE_TARIFFA_COSTO':
            return {
                ...state,
                isDirty: true,
                tariffe: state.tariffe.map(t =>
                    t.tipoGiornataId === action.payload.tipoGiornataId ? { ...t, costo: action.payload.costo } : t
                ),
            };

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };

        case 'SAVE_SUCCESS':
            return { ...state, isDirty: false, isSaving: false };

        default:
            return state;
    }
}

// --- Componente TariffaRow ---
interface TariffaRowProps {
    tariffa: TariffaLocale;
    isSaving: boolean;
    onCostoChange: (tipoGiornataId: string, costo: number) => void;
}

const TariffaRow: React.FC<TariffaRowProps> = ({ tariffa, isSaving, onCostoChange }) => {
    const [inputValue, setInputValue] = useState<string | null>(null);
    const isEditing = inputValue !== null;

    const handleFocus = () => {
        setInputValue(tariffa.costo.toFixed(2));
    };

    const handleBlur = () => {
        if (inputValue === null) return;
        
        let numericValue = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(numericValue)) {
            numericValue = 0;
        }

        if (numericValue !== tariffa.costo) {
             onCostoChange(tariffa.tipoGiornataId, numericValue);
        }

        setInputValue(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        if (/^[0-9,.]*$/.test(rawValue)) {
            setInputValue(rawValue);
        }
    };

    return (
         <ListItem sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <ListItemText primary={tariffa.nome} sx={{ flex: '1 1 150px' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 250px', justifyContent: 'flex-end' }}>
                <TextField
                    type="text"
                    size="small"
                    value={isEditing ? inputValue : tariffa.costo.toFixed(2)}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    sx={{ width: '100px' }}
                    inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                    disabled={isSaving}
                />
                <Box sx={{ width: 100, textAlign: 'left' }}>
                   <Typography variant="body1" color="text.secondary">
                       {tariffa.unita === 'h' ? '€ / ora' : '€ / giorno'}
                   </Typography>
               </Box>
            </Box>
        </ListItem>
    );
};


// --- Pagina principale ---
const SettingsPage: React.FC = () => {
    const { user, resetPassword, logout } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    
    const { masterData, updateImpostazioni, loading: masterDataLoading } = useContext(GlobalDataContext);

    const [state, dispatch] = useReducer(settingsReducer, initialState);
    const { tariffe, isSaving, isDirty } = state;

    const [clickCount, setClickCount] = useState(0);
    const [showTariffe, setShowTariffe] = useState(false);

    // =====================================================================================
    // --- LOGICA DI INIZIALIZZAZIONE TARIFFE --- V3 - DEFINITIVA
    // =====================================================================================
    useEffect(() => {
        if (masterData?.tipiGiornata && masterData.impostazioni) {
            const tariffeSalvate = masterData.impostazioni.tariffe || [];
            
            // Costruisce la lista UI partendo dai tipiGiornata per garantire che tutte le voci siano presenti.
            const tariffeComplete = masterData.tipiGiornata.map((tipoGiornata: TipoGiornata) => {
                const tariffaSalvata = tariffeSalvate.find(t => t.tipoGiornataId === tipoGiornata.id);
                
                return {
                    id: tipoGiornata.id,
                    tipoGiornataId: tipoGiornata.id,
                    nome: tipoGiornata.nome,
                    // USA L'UNITA' DELLA TARIFFA SALVATA, NON QUELLA DEL TIPO GIORNATA.
                    // Se la tariffa non è salvata, fa un fallback basato sul tipo, ma dovrebbe sempre esserci.
                    unita: tariffaSalvata ? tariffaSalvata.unita : (tipoGiornata.tipo === 'oraria' ? 'h' : 'g'),
                    costo: tariffaSalvata ? tariffaSalvata.costo : 0, 
                    tariffa: tariffaSalvata ? tariffaSalvata.tariffa : 0,
                };
            });

            const tariffeOrdinate = tariffeComplete.sort((a, b) => a.nome.localeCompare(b.nome));

            dispatch({ type: 'SET_TARIFFE', payload: tariffeOrdinate });
        }
    }, [masterData]); // Dipendenza semplificata: reagisce a qualsiasi cambio di masterData.
    // =====================================================================================

    const handleTitleClick = () => {
        const newClickCount = clickCount + 1;
        if (newClickCount >= 5) {
            setShowTariffe(!showTariffe);
            setClickCount(0);
        } else {
            setClickCount(newClickCount);
        }
    };

    const handleTariffaCostoChange = (tipoGiornataId: string, costo: number) => {
        dispatch({ type: 'UPDATE_TARIFFA_COSTO', payload: { tipoGiornataId, costo } });
    };
    
    const handleSalva = async () => {
        if (!updateImpostazioni) {
            showSnackbar('Funzione di aggiornamento non disponibile.', 'error');
            return;
        }
        dispatch({ type: 'SET_SAVING', payload: true });

        try {
            const impostazioniDaSalvare: Impostazioni = {
                id: masterData?.impostazioni?.id || 'main',
                tariffe: tariffe.map(t => ({ 
                    id: t.id,
                    tipoGiornataId: t.tipoGiornataId,
                    nome: t.nome,
                    costo: t.costo,
                    unita: t.unita,
                    tariffa: t.costo,
                })),
            };

            await updateImpostazioni(impostazioniDaSalvare);
            
            showSnackbar('Tariffe salvate e applicate con successo!', 'success');
            dispatch({ type: 'SAVE_SUCCESS' });
        } catch (error) {
            console.error("Errore durante il salvataggio delle tariffe:", error);
            showSnackbar('Errore durante il salvataggio delle tariffe.', 'error');
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await resetPassword(user.email);
                showSnackbar(`Email di reset inviata a ${user.email}`, 'success');
            } catch (error) {
                console.error("Errore nell'invio della mail di reset:", error);
                showSnackbar("Errore nell'invio della mail di reset.", 'error');
            }
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout Error: ", error);
            showSnackbar("Errore durante il logout", 'error');
        }
    };

    if (masterDataLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, cursor: 'pointer' }} onClick={handleTitleClick}>Impostazioni</Typography>

            <Accordion elevation={3} sx={{ mb: 4 }} defaultExpanded>
                 <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Guida App Tecnici</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ border: '1px solid #1976d2', borderRadius: 2, p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>Installazione App</Typography>
                        <Typography paragraph>
                            Per un accesso più rapido, puoi installare questa applicazione sulla schermata principale del tuo dispositivo, come se fosse un'app nativa.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Android:</Typography>
                        <Typography paragraph>
                            Apri il menu del browser (i tre puntini in alto a destra) e seleziona &quot;Installa app&quot; o &quot;Aggiungi a schermata Home&quot;.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>iOS (iPhone/iPad):</Typography>
                        <Typography paragraph>
                            Tocca il pulsante di condivisione (il quadrato con la freccia verso l'alto) nella barra di navigazione di Safari e scorri fino a trovare &quot;Aggiungi a Home&quot;.
                        </Typography>
                    </Box>

                    <Box sx={{ border: '1px solid #1976d2', borderRadius: 2, p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>Funzionalità delle Pagine</Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Home:</Typography>
                        <Typography paragraph>
                            La pagina principale da cui puoi navigare verso tutte le sezioni principali dell'app.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Nuovo Report:</Typography>
                        <Typography paragraph>
                            Crea un nuovo rapporto di intervento, inserendo tutti i dettagli necessari.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>I Miei Report:</Typography>
                        <Typography paragraph>
                            Consulta lo storico di tutti i tuoi report inviati.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Report Mensili:</Typography>
                        <Typography paragraph>
                            Visualizza un riepilogo mensile delle tue attività.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Notifiche:</Typography>
                        <Typography paragraph>
                            Leggi le comunicazioni importanti inviate dall'azienda.
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>Check-in:</Typography>
                        <Typography paragraph>
                            Registra l'inizio e la fine delle tue attività giornaliere.
                        </Typography>
                    </Box>

                    <Box sx={{ border: '1px solid #1976d2', borderRadius: 2, p: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>Modalità Offline</Typography>
                        <Typography paragraph>
                            L'applicazione è progettata per funzionare anche senza una connessione a Internet. Puoi continuare a creare report e utilizzare le altre funzionalità. I dati verranno sincronizzati automaticamente non appena il dispositivo tornerà online.
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>

            {showTariffe && (
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Gestione Tariffe</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Queste tariffe sono salvate solo su questo dispositivo e vengono usate per i calcoli nel report mensile. Non modificano i dati centrali.
                    </Typography>
                    <List>
                        {tariffe.map((tariffa, index) => (
                            <React.Fragment key={tariffa.tipoGiornataId}>
                                {index > 0 && <Divider component="li" />}
                                <TariffaRow
                                    tariffa={tariffa}
                                    isSaving={isSaving}
                                    onCostoChange={handleTariffaCostoChange}
                                />
                            </React.Fragment>
                        ))}
                    </List>
                    <Button variant="contained" sx={{ mt: 2 }} onClick={handleSalva} disabled={isSaving || !isDirty}>
                        {isSaving ? <CircularProgress size={24} /> : 'Salva Tariffe'}
                    </Button>
                </Paper>
            )}

            <Accordion elevation={3} sx={{ mb: 4 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Gestione Account</Typography>
                </AccordionSummary>
                <AccordionDetails>
                     <Typography paragraph>Qui puoi gestire le impostazioni del tuo account.</Typography>
                    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h5" gutterBottom>Gestione Account</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <Button variant="contained" color="secondary" onClick={handlePasswordReset}>Recupero Password</Button>
                            <Button variant="outlined" color="error" onClick={handleLogout}>Logout</Button>
                        </Box>
                    </Paper>
                </AccordionDetails>
            </Accordion>

             <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
                <Typography variant="h6" gutterBottom>Manutenzione App</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Se riscontri problemi o l'app non sembra aggiornata, usa questo pulsante per forzare un riavvio e scaricare la versione più recente. 
                    <strong>Attenzione: questa operazione può cancellare i dati non ancora sincronizzati con il server, come i report creati offline.</strong>
                </Typography>
                <ForceUpdateButton />
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    APP TECNICI
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    V 2.4
                </Typography>
            </Box>

        </Box>
    );
}

export default SettingsPage;
