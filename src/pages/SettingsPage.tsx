
import React, { useState, useEffect, useContext } from 'react';
import {
    Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';
import { localDB, TariffaLocaleCache } from '@/db/local-db'; // ++ FIX: Import corretto
import { TariffaLocale } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { MasterDataContext } from '@/contexts/MasterDataProvider';

const ForceUpdateButton = () => {
    const [updating, setUpdating] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleForceUpdate = async () => {
        setUpdating(true);
        showSnackbar("Forzando l'aggiornamento dell'app...", 'info');
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            await localDB.delete(); // Pulisce completamente il database Dexie
            setTimeout(() => { window.location.reload(); }, 2000);
        } catch (error) {
            console.error("Errore durante l'aggiornamento forzato:", error);
            showSnackbar("Errore durante l'aggiornamento forzato. Prova a pulire la cache del browser manualmente.", 'error');
            setUpdating(false);
        }
    };

    return (
        <Button variant="contained" color="warning" onClick={handleForceUpdate} disabled={updating}>
            {updating ? <CircularProgress size={24} /> : 'Forza Aggiornamento App'}
        </Button>
    );
};

const SettingsPage: React.FC = () => {
    const { user, resetPassword, logout } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const masterDataContext = useContext(MasterDataContext);

    // ++ FIX: Query e tabella corrette
    const impostazioniLive = useLiveQuery(() => localDB.tariffe_locali.get('main'), []);

    const [tariffe, setTariffe] = useState<TariffaLocale[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        // ++ FIX: Accesso corretto ai dati
        if (impostazioniLive?.data?.tariffe) {
            const tariffeOrdinate = [...impostazioniLive.data.tariffe].sort((a,b) => a.nome.localeCompare(b.nome));
            setTariffe(tariffeOrdinate);
            setIsDirty(false);
        }
    }, [impostazioniLive]);

    const handleTariffaChange = (id: string, value: string) => {
        const valueWithDot = value.replace(',', '.');
        if (valueWithDot === '' || /^[0-9]*\.?[0-9]*$/.test(valueWithDot)) {
            setTariffe(prev =>
                prev.map(t =>
                    t.id === id ? { ...t, costo: Number(valueWithDot) } : t // FIX: t.id invece di t.tipoGiornataId
                )
            );
            setIsDirty(true);
        }
    };
    
    const handleSalva = async () => {
        if (!impostazioniLive) {
            showSnackbar('Dati originali non trovati.', 'error');
            return;
        }
        setIsSaving(true);

        // ++ FIX: Struttura dell'oggetto corretta per il salvataggio
        const dataToSave: TariffaLocaleCache = {
            id: 'main',
            timestamp: new Date(),
            data: {
                ...(impostazioniLive.data || {}),
                tariffe: tariffe,
            }
        };

        try {
            await localDB.tariffe_locali.put(dataToSave);
            showSnackbar('Tariffe salvate con successo in locale!', 'success');
            setIsDirty(false);
        } catch (error) {
            console.error("Errore durante il salvataggio in locale:", error);
            showSnackbar('Errore durante il salvataggio delle tariffe.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await resetPassword(user.email);
                showSnackbar(`Email di reset inviata a ${user.email}`, 'success');
            } catch (error) {
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

    if (masterDataContext?.loading) { // FIX: Check sul loading del master data context
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
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <ListItemText primary={tariffa.nome} />
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                                    <TextField
                                        type="text"
                                        size="small"
                                        value={tariffa.costo.toFixed(2)}
                                        onChange={(e) => handleTariffaChange(tariffa.id, e.target.value)} // FIX: t.id invece di t.tipoGiornataId
                                        sx={{ width: '100px' }}
                                        inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                                        disabled={isSaving}
                                    />
                                    <Typography variant="body1" sx={{ ml: 1 }}>€/{tariffa.unita}</Typography>
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
                    Se riscontri problemi o l'app non sembra aggiornata, usa questo pulsante per forzare un riavvio e scaricare la versione più recente.
                </Typography>
                <ForceUpdateButton />
            </Paper>
        </Box>
    );
}

export default SettingsPage;
