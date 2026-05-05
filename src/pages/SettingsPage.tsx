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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/hooks/useGlobalData';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
    const { user, resetPassword, logout } = useAuth();
    const { tipiGiornata, loading: globalLoading } = useGlobalData();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const [tariffe, setTariffe] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (globalLoading || !user?.uid || tipiGiornata.length === 0) {
            return;
        }

        setIsLoading(true);

        const storageKey = `tariffe_${user.uid}`;
        const savedTariffeJSON = localStorage.getItem(storageKey);

        const defaultTariffe = tipiGiornata.reduce((acc, tipo) => {
            acc[tipo.nome] = 10.00;
            return acc;
        }, {} as Record<string, number>);

        let finalTariffe: Record<string, number>;

        if (savedTariffeJSON) {
            const savedTariffe = JSON.parse(savedTariffeJSON);
            finalTariffe = { ...defaultTariffe, ...savedTariffe };
        } else {
            finalTariffe = defaultTariffe;
            localStorage.setItem(storageKey, JSON.stringify(finalTariffe));
        }

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
            showSnackbar('Utente non autenticato.', 'error');
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
            
            showSnackbar('Tariffe salvate con successo!', 'success');
            setIsDirty(false);
        } catch (error) {
            console.error("Errore during il salvataggio:", error);
            showSnackbar('Errore during il salvataggio.', 'error');
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
            showSnackbar('Errore during il logout', 'error');
        }
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

            <Accordion elevation={3} sx={{ mb: 4 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Guida all'Uso dell'App R.I.S.O.</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Installazione App (PWA)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography paragraph>
                            Questa applicazione è una Progressive Web App (PWA). Puoi installarla sulla home screen del tuo telefono per un accesso rapido e per un'esperienza simile a quella di un'app nativa, incluse le funzionalità offline.
                        </Typography>
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>iPhone e iPad (Safari)</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography component="div">
                                    <ol>
                                        <li>Apri <strong>Safari</strong> e naviga a questa pagina.</li>
                                        <li>Tocca il pulsante <strong>Condividi</strong> (l'icona con il quadrato e la freccia verso l'alto).</li>
                                        <li>Scorri verso il basso e seleziona <strong>"Aggiungi a Home"</strong>.</li>
                                        <li>Conferma il nome dell'app e tocca <strong>"Aggiungi"</strong>.</li>
                                    </ol>
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Android (Chrome)</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography component="div">
                                    <ol>
                                        <li>Apri <strong>Chrome</strong> e naviga a questa pagina.</li>
                                        <li>Tocca il pulsante del menu (i tre puntini in alto a destra).</li>
                                        <li>Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong>.</li>
                                        <li>Segui le istruzioni per confermare l'installazione.</li>
                                    </ol>
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Funzionalità Principali</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography paragraph>
                            <strong>Dashboard:</strong> La tua pagina iniziale con accesso rapido a tutte le sezioni.
                        </Typography>
                        <Typography paragraph>
                            <strong>Nuovo Report:</strong> Compila i rapportini giornalieri. Puoi anche creare report per periodi di assenza (ferie, malattia) attivando l'opzione "Inserisci per un periodo".
                        </Typography>
                        <Typography paragraph>
                            <strong>Funzionalità Offline:</strong> L'app funziona anche senza connessione a internet. I dati verranno salvati localmente e sincronizzati automaticamente non appena torni online.
                        </Typography>
                        <Typography paragraph>
                            <strong>Lista Report:</strong> Vedi lo storico di tutti i tuoi rapportini. Puoi modificare solo quelli del mese corrente.
                        </Typography>
                        <Typography paragraph>
                            <strong>Report Mensile:</strong> Un riepilogo completo del tuo mese lavorativo.
                        </Typography>
                        <Typography paragraph>
                            <strong>Notifiche:</strong> Ricevi comunicazioni importanti direttamente nell'app.
                        </Typography>
                    </AccordionDetails>
                </Accordion>
                </AccordionDetails>
            </Accordion>
            
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h5" gutterBottom>Gestione Account</Typography>
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Button variant="contained" color="secondary" onClick={handlePasswordReset}>Recupero Password</Button>
                    <Button variant="outlined" color="error" onClick={handleLogout}>Logout</Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default SettingsPage;
