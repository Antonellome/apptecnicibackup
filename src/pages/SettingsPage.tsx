
import React, { useState, useMemo } from 'react';
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
    CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/hooks/useGlobalData';

const SettingsPage: React.FC = () => {
    const { user, resetPassword } = useAuth();
    const { rapportini, tipiGiornata, loading } = useGlobalData();
    const [emailSent, setEmailSent] = useState(false);
    
    const tipiGiornataUnici = useMemo(() => {
        if (loading) return [];
        if(tipiGiornata && tipiGiornata.length > 0) return tipiGiornata.map(t => t.nome);
        const tipiNeiReport = rapportini.map(r => r.tipoGiornata).filter(Boolean);
        return [...new Set(tipiNeiReport)];
    }, [rapportini, tipiGiornata, loading]);
    
    const [tariffe, setTariffe] = useState<Record<string, string>>(
        tipiGiornataUnici.reduce((acc, tipo) => ({ ...acc, [tipo]: '10' }), {})
    );

    const handleTariffaChange = (id: string, value: string) => {
        setTariffe(prev => ({ ...prev, [id]: value }));
    };

    const handleResetPassword = async () => {
        if (!user || !user.email) {
            alert('Impossibile identificare l\'utente. Prova a fare di nuovo il login.');
            return;
        }
        try {
            await resetPassword(user.email);
            setEmailSent(true);
        } catch (error) { 
            console.error("Errore durante l'invio della mail di reset:", error);
            alert("Si è verificato un errore. Riprova.")
        }
    };

    const now = new Date();
    const years = useMemo(() => {
        if (rapportini.length === 0) return [now.getFullYear()];
        const minYear = Math.min(...rapportini.map(r => r.data.toDate().getFullYear()));
        const maxYear = Math.max(...rapportini.map(r => r.data.toDate().getFullYear()));
        return Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
    }, [rapportini]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Impostazioni</Typography>

            {/* Gestione Tariffe */}
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Gestione Tariffe Orarie</Typography>
                <List>
                    {tipiGiornataUnici.map((tipo, index) => (
                        <React.Fragment key={tipo}>
                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <ListItemText primary={tipo} />
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={tariffe[tipo] || '10'}
                                        onChange={(e) => handleTariffaChange(tipo, e.target.value)}
                                        sx={{ width: '100px', mr: 1 }}
                                    />
                                    <Typography variant="body1">€/ora</Typography>
                                </Box>
                            </ListItem>
                            {index < tipiGiornataUnici.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
                <Button variant="contained" sx={{ mt: 2 }}>Salva Tariffe</Button>
            </Paper>

            {/* Recupero Password */}
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

            {/* Guida all'uso */}
            <Accordion elevation={3} sx={{ mb: 4 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Guida all'Uso dell'App</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>Benvenuto in R.I.S.O. App Tecnici! Questa app ti aiuta a tracciare i tuoi report di lavoro giornalieri.</Typography>
                    <Typography paragraph><b>Home:</b> Dalla dashboard principale puoi creare un nuovo report, visualizzare quelli esistenti, accedere ai riepiloghi mensili e vedere le notifiche.</Typography>
                    <Typography paragraph><b>Nuovo Report:</b> Compila il form con tutti i dettagli del tuo intervento. Puoi scegliere se inserire le ore totali o l'orario di inizio/fine. Per le assenze (es. Ferie, Malattia) puoi anche creare report per più giorni consecutivi attivando l'apposito interruttore.</Typography>
                    <Typography paragraph><b>Notifiche:</b> Qui trovi le comunicazioni importanti, come i rapportini non ancora sincronizzati o altre segnalazioni di sistema.</Typography>
                    <Typography paragraph><b>Impostazioni:</b> In questa pagina puoi configurare le tariffe orarie per calcolare i guadagni nei report mensili e recuperare la tua password.</Typography>
                </AccordionDetails>
            </Accordion>

            {/* Backup PDF */}
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Backup Report Mensili</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
                     <TextField select label="Mese" defaultValue={now.getMonth() + 1} SelectProps={{ native: true }} sx={{ mr: 2, mb: { xs: 2, sm: 0 } }}>
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>)}
                    </TextField>
                    <TextField select label="Anno" defaultValue={now.getFullYear()} SelectProps={{ native: true }} sx={{ mr: 2, mb: { xs: 2, sm: 0 } }}>
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                    </TextField>
                    <Button variant="contained" color="secondary">Esporta in PDF</Button>
                </Box>
            </Paper>

        </Box>
    );
}

export default SettingsPage;
