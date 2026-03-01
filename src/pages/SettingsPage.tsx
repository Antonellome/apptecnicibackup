import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    Divider,
    CircularProgress,
    Snackbar,
    Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/hooks/useGlobalData';

const SettingsPage: React.FC = () => {
    const { user, resetPassword } = useAuth();
    const { tipiGiornata, loading: globalLoading } = useGlobalData();
    const [emailSent, setEmailSent] = useState(false);
    const [tariffe, setTariffe] = useState<Record<string, number | string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const tipiGiornataUnici = useMemo(() => {
        if (globalLoading || !tipiGiornata) return [];
        return [...new Set(tipiGiornata.map(t => t.nome).filter(Boolean))];
    }, [tipiGiornata, globalLoading]);

    // Carica le tariffe da localStorage
    useEffect(() => {
        if (globalLoading || !user?.uid) return; // Attendi i dati globali e l'utente

        setIsLoading(true);
        try {
            const savedTariffeJSON = localStorage.getItem(`tariffe_${user.uid}`);
            let loadedTariffe: Record<string, number | string> = {};
            if (savedTariffeJSON) {
                loadedTariffe = JSON.parse(savedTariffeJSON);
            }

            // Assicura che tutti i tipi di giornata abbiano una tariffa, usando i default per quelli nuovi
            const completeTariffe = tipiGiornataUnici.reduce((acc, tipo) => {
                acc[tipo] = loadedTariffe[tipo] ?? '10.00';
                return acc;
            }, {} as Record<string, number | string>);

            setTariffe(completeTariffe);
        } catch (error) {
            console.error("Failed to load or parse tariffs from local storage", error);
            // In caso di errore (es. JSON malformato), usa i default
            const defaultTariffe = tipiGiornataUnici.reduce((acc, tipo) => {
                acc[tipo] = '10.00';
                return acc;
            }, {} as Record<string, string>);
            setTariffe(defaultTariffe);
        } finally {
            setIsLoading(false);
        }
    }, [user, tipiGiornataUnici, globalLoading]);

    const handleTariffaChange = (id: string, value: string) => {
        if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
            setTariffe(prev => ({ ...prev, [id]: value }));
            setIsDirty(true); // Segna che ci sono modifiche non salvate
        }
    };

    const handleSalvaTariffe = () => {
        if (!user) {
            setNotification({ open: true, message: 'Utente non autenticato.', severity: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            const tariffeToSave = Object.entries(tariffe).reduce((acc, [key, value]) => {
                acc[key] = parseFloat(value as string) || 0;
                return acc;
            }, {} as Record<string, number>);

            localStorage.setItem(`tariffe_${user.uid}`, JSON.stringify(tariffeToSave));
            setNotification({ open: true, message: 'Tariffe salvate con successo sul dispositivo!', severity: 'success' });
            setIsDirty(false); // Resetta lo stato dopo il salvataggio
        } catch (error) {
            console.error("Errore durante il salvataggio in localStorage:", error);
            setNotification({ open: true, message: 'Errore durante il salvataggio locale.', severity: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!user?.email) {
            alert('Impossibile identificare l\'utente. Prova a fare di nuovo il login.');
            return;
        }
        try {
            await resetPassword(user.email);
            setEmailSent(true);
        } catch (error) {
            console.error("Errore durante l'invio della mail di reset:", error);
            alert("Si è verificato un errore. Riprova.");
        }
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Impostazioni</Typography>

            {/* Gestione Tariffe */}
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Gestione Tariffe Orarie</Typography>
                <List>
                    {tipiGiornataUnici.map((tipo) => (
                        <React.Fragment key={tipo}>
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <ListItemText primary={tipo} />
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={tariffe[tipo] ?? ''}
                                        onChange={(e) => handleTariffaChange(tipo, e.target.value)}
                                        sx={{ width: '100px', mr: 1 }}
                                        inputProps={{ min: 0, step: "0.01" }}
                                        disabled={isSaving}
                                    />
                                    <Typography variant="body1">€/ora</Typography>
                                </Box>
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSalvaTariffe} disabled={isSaving || !isDirty}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva Tariffe'}
                </Button>
            </Paper>

            {/* Recupero Password, etc. */}
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Recupero Password</Typography>
                {emailSent ? (
                    <Typography color="green">Controlla la tua casella di posta per il link di reset.</Typography>
                ) : (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{mb: 2}}>Clicca il pulsante per inviare una mail di reset password a <b>{user?.email}</b>.</Typography>
                        <Button variant="contained" onClick={handleResetPassword}>Invia Link di Reset</Button>
                    </Box>
                )}
            </Paper>

            <Accordion elevation={3}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Guida all'Uso dell'App</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>Benvenuto in R.I.S.O. App Tecnici! Questa app ti aiuta a tracciare i tuoi report di lavoro giornalieri.</Typography>
                    <Typography paragraph><b>Home:</b> Dalla dashboard principale puoi creare un nuovo report, visualizzare quelli esistenti, accedere ai riepiloghi mensili e vedere le notifiche.</Typography>
                    <Typography paragraph><b>Nuovo Report:</b> Compila il form con tutti i dettagli del tuo intervento. Per le assenze puoi anche creare report per più giorni.</Typography>
                    <Typography paragraph><b>Impostazioni:</b> Qui puoi configurare le tariffe e recuperare la tua password.</Typography>
                </AccordionDetails>
            </Accordion>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default SettingsPage;
