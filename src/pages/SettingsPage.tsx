
import React, { useEffect, useState, useReducer, useCallback } from 'react';
import {
    Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/local-db';
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
    | { type: 'UPDATE_TARIFFA_COSTO'; payload: { id: string; costo: number } }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SAVE_SUCCESS' }
    | { type: 'SET_DIRTY' };

const initialState: SettingsState = {
    tariffe: [],
    isSaving: false,
    isDirty: false,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
    switch (action.type) {
        case 'SYNC_TARIFFE':
            const sortedTariffe = [...action.payload].sort((a, b) => a.nome.localeCompare(b.nome));
            return { ...state, tariffe: sortedTariffe, isDirty: false };
        
        case 'UPDATE_TARIFFA_COSTO': {
            return {
                ...state,
                isDirty: true, 
                tariffe: state.tariffe.map(t =>
                    t.id === action.payload.id ? { ...t, costo: action.payload.costo } : t
                ),
            };
        }
        
        case 'SET_DIRTY':
            if (state.isDirty) return state; // Evita ri-render se è già dirty
            return { ...state, isDirty: true };

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };

        case 'SAVE_SUCCESS':
            return { ...state, isDirty: false, isSaving: false };

        default:
            return state;
    }
}

// --- Componente per una singola tariffa ---
interface TariffaRowProps {
    tariffa: TariffaLocale;
    isSaving: boolean;
    onCostoChange: (id: string, costo: number) => void;
    onDirty: () => void;
}

const TariffaRow: React.FC<TariffaRowProps> = ({ tariffa, isSaving, onCostoChange, onDirty }) => {
    const [inputValue, setInputValue] = useState(tariffa.costo.toFixed(2));
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setInputValue(tariffa.costo.toFixed(2));
        }
    }, [tariffa.costo, isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        if (/^[0-9,.]*$/.test(rawValue)) {
            setInputValue(rawValue);
            onDirty(); // Notifica il parent che il form è stato modificato
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        let numericValue = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(numericValue)) {
            numericValue = 0;
        }
        setInputValue(numericValue.toFixed(2));
        if (numericValue !== tariffa.costo) {
             onCostoChange(tariffa.id, numericValue);
        }
    };

    const handleFocus = () => {
        setIsEditing(true);
    };

    return (
         <ListItem sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <ListItemText primary={tariffa.nome} sx={{ flex: '1 1 150px' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 250px', justifyContent: 'flex-end' }}>
                <TextField
                    type="text"
                    size="small"
                    value={inputValue}
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
    const { loading: masterDataLoading } = useMasterData();

    const impostazioniLive = useLiveQuery(() => db.tariffe_locali.get('main'), []);

    const [state, dispatch] = useReducer(settingsReducer, initialState);
    const { tariffe, isSaving, isDirty } = state;

    useEffect(() => {
        if (impostazioniLive?.data?.tariffe && !isDirty) {
             dispatch({ type: 'SYNC_TARIFFE', payload: impostazioniLive.data.tariffe });
        }
    }, [impostazioniLive, isDirty]);

    useEffect(() => {
        const fixMalattiaTariff = async () => {
            const settings = await db.tariffe_locali.get('main');
            if (settings) {
                const malattiaTariff = settings.data.tariffe.find(t => t.nome.toLowerCase() === 'malattia');
                if (malattiaTariff && (malattiaTariff.unita !== 'h' || malattiaTariff.costo !== 10)) {
                    console.log("Applicazione patch una tantum: Adeguamento tariffa 'Malattia' a 10 €/h.");
                    await db.tariffe_locali.update('main', { 'data.tariffe': settings.data.tariffe.map(t => 
                        t.nome.toLowerCase() === 'malattia' ? { ...t, costo: 10, unita: 'h' } : t
                    )});
                }
            }
        };
        fixMalattiaTariff();
    }, []);

    const handleTariffaCostoChange = (id: string, costo: number) => {
        dispatch({ type: 'UPDATE_TARIFFA_COSTO', payload: { id, costo } });
    };
    
    const handleSetDirty = useCallback(() => {
        dispatch({ type: 'SET_DIRTY' });
    }, []);
    
    const handleSalva = async () => {
        if (!impostazioniLive) {
            showSnackbar('Impossibile trovare la configurazione delle tariffe da aggiornare.', 'error');
            return;
        }
        dispatch({ type: 'SET_SAVING', payload: true });

        try {
            await db.tariffe_locali.update('main', {
                'data.tariffe': tariffe,
                'timestamp': new Date()
            });

            showSnackbar('Tariffe salvate con successo in locale!', 'success');
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
                            <TariffaRow
                                tariffa={tariffa}
                                isSaving={isSaving}
                                onCostoChange={handleTariffaCostoChange}
                                onDirty={handleSetDirty}
                            />
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
