
import React, { useEffect, useReducer } from 'react';
import {
    Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';
import { db, TariffaLocaleCache } from '@/db/local-db';
import { TariffaLocale } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMasterData } from '@/hooks/useMasterData';
import { ForceUpdateButton } from '@/components/ForceUpdateButton';

// --- STATE MANAGEMENT ---
interface SettingsState {
    tariffe: TariffaLocale[];
    isSaving: boolean;
    isDirty: boolean;
}

type SettingsAction =
    | { type: 'SYNC_TARIFFE'; payload: TariffaLocale[] }
    | { type: 'UPDATE_TARIFFA_COSTO'; payload: { id: string; value: string } }
    | { type: 'UPDATE_TARIFFA_UNITA'; payload: { id: string; unita: 'h' | 'g' } }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SAVE_SUCCESS' };

const initialState: SettingsState = {
    tariffe: [],
    isSaving: false,
    isDirty: false,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
    switch (action.type) {
        case 'SYNC_TARIFFE':
            // RIMOSSO BLOCCO isDirty per permettere aggiornamento dopo salvataggio
            return { ...state, tariffe: action.payload, isDirty: false };
        
        case 'UPDATE_TARIFFA_COSTO': {
            const { id, value } = action.payload;
            const valueWithDot = value.replace(',', '.');
            if (valueWithDot === '' || /^[0-9]*\.?[0-9]*$/.test(valueWithDot)) {
                return {
                    ...state,
                    isDirty: true,
                    tariffe: state.tariffe.map(t =>
                        t.id === id ? { ...t, costo: Number(valueWithDot) } : t
                    ),
                };
            }
            return state;
        }

        case 'UPDATE_TARIFFA_UNITA': {
            const { id, unita } = action.payload;
             if (!unita) return state; // Evita aggiornamenti nulli
            return {
                ...state,
                isDirty: true,
                tariffe: state.tariffe.map(t =>
                    t.id === id ? { ...t, unita } : t
                ),
            };
        }

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };
        case 'SAVE_SUCCESS':
            return { ...state, isDirty: false, isSaving: false };
        default:
            return state;
    }
}

const SettingsPage: React.FC = () => {
    const { user, resetPassword, logout } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const { loading: masterDataLoading } = useMasterData();

    const impostazioniLive = useLiveQuery(() => db.tariffe_locali.get('main'), []);

    const [state, dispatch] = useReducer(settingsReducer, initialState);
    const { tariffe, isSaving, isDirty } = state;

    useEffect(() => {
        if (impostazioniLive?.data?.tariffe) {
            const tariffeOrdinate = [...impostazioniLive.data.tariffe].sort((a,b) => a.nome.localeCompare(b.nome));
            // Sincronizza lo stato solo se non ci sono modifiche pendenti
            if (!isDirty) {
                 dispatch({ type: 'SYNC_TARIFFE', payload: tariffeOrdinate });
            }
        }
    }, [impostazioniLive, isDirty]);

    const handleTariffaCostoChange = (id: string, value: string) => {
        dispatch({ type: 'UPDATE_TARIFFA_COSTO', payload: { id, value } });
    };

    const handleTariffaUnitaChange = (id: string, unita: 'h' | 'g') => {
        dispatch({ type: 'UPDATE_TARIFFA_UNITA', payload: { id, unita } });
    };
    
    const handleSalva = async () => {
        if (!impostazioniLive) {
            showSnackbar('Dati originali non trovati.', 'error');
            return;
        }
        dispatch({ type: 'SET_SAVING', payload: true });

        // Crea una mappa delle tariffe aggiornate per un accesso rapido
        const updatedTariffeMap = new Map(tariffe.map(t => [t.id, t]));

        // Aggiorna le tariffe originali preservando quelle non presenti nello stato (misura di sicurezza)
        const finalTariffeToSave = impostazioniLive.data.tariffe.map(
            originalTariffa => updatedTariffeMap.get(originalTariffa.id) || originalTariffa
        );

        const dataToSave: TariffaLocaleCache = {
            id: 'main',
            timestamp: new Date(),
            data: {
                ...impostazioniLive.data,
                tariffe: finalTariffeToSave, 
            }
        };

        try {
            await db.tariffe_locali.put(dataToSave);
            showSnackbar('Tariffe salvate con successo in locale!', 'success');
            dispatch({ type: 'SAVE_SUCCESS' });
        } catch (error) {
            console.error("Errore durante il salvataggio in locale:", error);
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
            showSnackbar('Errore durante il logout', 'error');
        }
    };

    if (masterDataLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Impostazioni</Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Gestione Tariffe</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Queste tariffe sono salvate solo su questo dispositivo e vengono usate per i calcoli nel report mensile. Non modificano i dati centrali.
                </Typography>
                <List>
                    {tariffe.map((tariffa, index) => (
                        <React.Fragment key={tariffa.id}>
                            {index > 0 && <Divider component="li" />}
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                <ListItemText primary={tariffa.nome} sx={{ flex: '1 1 150px' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 250px', justifyContent: 'flex-end' }}>
                                    <TextField
                                        type="text"
                                        size="small"
                                        value={tariffa.costo.toFixed(2)}
                                        onChange={(e) => handleTariffaCostoChange(tariffa.id, e.target.value)}
                                        sx={{ width: '100px' }}
                                        inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                                        disabled={isSaving}
                                    />
                                    <ToggleButtonGroup
                                        value={tariffa.unita}
                                        exclusive
                                        size="small"
                                        onChange={(e, newUnita) => handleTariffaUnitaChange(tariffa.id, newUnita)}
                                        aria-label="text alignment"
                                        disabled={isSaving}
                                    >
                                        <ToggleButton value="h" aria-label="hourly">
                                            €/h
                                        </ToggleButton>
                                        <ToggleButton value="g" aria-label="daily">
                                            €/g
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            </ListItem>
                        </React.Fragment>
                    ))}
                </List>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSalva} disabled={isSaving || !isDirty}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva Tariffe'}
                </Button>
            </Paper>

            <Accordion elevation={3} sx={{ mb: 4 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Guida e Gestione Account</Typography>
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
                    Se riscontri problemi o l&apos;app non sembra aggiornata, usa questo pulsante per forzare un riavvio e scaricare la versione più recente.
                </Typography>
                <ForceUpdateButton />
            </Paper>
        </Box>
    );
}

export default SettingsPage;
