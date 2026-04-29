import React, { useState, useEffect } from 'react';
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
    const [tariffe, setTariffe] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (globalLoading || !user?.uid || tipiGiornata.length === 0) {
            return;
        }

        setIsLoading(true);

        const storageKey = `tariffe_${user.uid}`;
        const savedTariffeJSON = localStorage.getItem(storageKey);

        // Prepara le tariffe di default usando i tipi di giornata globali.
        const defaultTariffe = tipiGiornata.reduce((acc, tipo) => {
            acc[tipo.nome] = 10.00; // Valore numerico
            return acc;
        }, {} as Record<string, number>);

        let finalTariffe: Record<string, number>;

        if (savedTariffeJSON) {
            // Se esistono dati salvati, usali.
            const savedTariffe = JSON.parse(savedTariffeJSON);
            // Unisci i default con i salvati per coprire eventuali nuovi tipi di giornata.
            finalTariffe = { ...defaultTariffe, ...savedTariffe };
        } else {
            // **ECCO LA CORREZIONE**
            // Se non c'è NULLA nel localStorage, usiamo i default E LI SALVIAMO SUBITO.
            finalTariffe = defaultTariffe;
            localStorage.setItem(storageKey, JSON.stringify(finalTariffe));
        }

        // Converti i valori numerici in stringhe formattate per la visualizzazione.
        const displayTariffe = Object.entries(finalTariffe).reduce((acc, [key, value]) => {
            acc[key] = value.toFixed(2);
            return acc;
        }, {} as Record<string, string>);

        setTariffe(displayTariffe);
        setIsLoading(false);

    }, [user, tipiGiornata, globalLoading]);


    const handleTariffaChange = (id: string, value: string) => {
        const valueWithDot = value.replace(',', '.');
        if (valueWithDot === '' || /^[0-9]*\.?[0-9]*$/.test(valueWithDot)) {
            setTariffe(prev => ({ ...prev, [id]: valueWithDot }));
            setIsDirty(true);
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
                const numericValue = parseFloat(value);
                acc[key] = isNaN(numericValue) ? 0 : numericValue;
                return acc;
            }, {} as Record<string, number>);

            localStorage.setItem(`tariffe_${user.uid}`, JSON.stringify(tariffeToSave));
            
            const formattedTariffe = Object.entries(tariffeToSave).reduce((acc, [key, value]) => {
                acc[key] = value.toFixed(2);
                return acc;
            }, {} as Record<string, string>);
            setTariffe(formattedTariffe);
            
            setNotification({ open: true, message: 'Tariffe salvate con successo!', severity: 'success' });
            setIsDirty(false);
        } catch (error) {
            console.error("Errore durante il salvataggio:", error);
            setNotification({ open: true, message: 'Errore durante il salvataggio.', severity: 'error' });
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
            console.error("Errore invio mail di reset:", error);
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

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Gestione Tariffe Orarie</Typography>
                <List>
                    {tipiGiornata.map((tipo) => (
                        <React.Fragment key={tipo.id}>
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <ListItemText primary={tipo.nome} />
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                                    <TextField
                                        type="text"
                                        size="small"
                                        value={tariffe[tipo.nome] ?? ''}
                                        onChange={(e) => handleTariffaChange(tipo.nome, e.target.value)}
                                        sx={{ width: '100px' }}
                                        inputProps={{ 
                                            inputMode: 'decimal',
                                            pattern: '^[0-9]*\\.?[0-9]*$',
                                            style: { textAlign: 'right' } 
                                        }}
                                        disabled={isSaving}
                                    />
                                    <Typography variant="body1" sx={{ ml: 1 }}>€/ora</Typography>
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
                    <Typography variant="h6">Guida all&apos;Uso dell&apos;App</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>Benvenuto! Quest'app ti aiuta a tracciare i tuoi report di lavoro giornalieri.</Typography>
                    <Typography paragraph><b>Home:</b> Dalla dashboard puoi creare un nuovo report o visualizzare quelli esistenti.</Typography>
                    <Typography paragraph><b>Impostazioni:</b> Qui puoi configurare le tariffe e recuperare la password.</Typography>
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
