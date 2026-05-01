import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';

const SettingsPage: React.FC = () => {
    const { logout, resetPassword, user } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout Error: ", error);
            showSnackbar('Errore durante il logout', 'error');
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

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Impostazioni
                </Typography>
                
                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" gutterBottom>Guida all'Uso dell'App R.I.S.O.</Typography>

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

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" gutterBottom>Gestione Account</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Button variant="contained" color="secondary" onClick={handlePasswordReset}>Recupero Password</Button>
                    <Button variant="outlined" color="error" onClick={handleLogout}>Logout</Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default SettingsPage;
