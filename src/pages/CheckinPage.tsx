import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/hooks/useGlobalData';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { db } from '@/firebase';

const CheckinPage: React.FC = () => {
    const { user, userProfile } = useAuth();
    const { navi, luoghi } = useGlobalData();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const [naveId, setNaveId] = useState('');
    const [luogoId, setLuogoId] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

    const todayDocId = user ? format(new Date(), 'yyyy-MM-dd') + '_' + user.uid : '';

    useEffect(() => {
        const checkExistingCheckin = async () => {
            if (!user) {
                setPageLoading(false);
                return;
            }
            try {
                const docRef = doc(db, 'checkin_giornalieri', todayDocId);
                const docSnap = await getDoc(docRef);
                setAlreadyCheckedIn(docSnap.exists());
            } catch (err) {
                setError('Impossibile verificare lo stato del check-in.');
                console.error(err);
            } finally {
                setPageLoading(false);
            }
        };
        checkExistingCheckin();
    }, [user, todayDocId]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            setError('Utente non autenticato.');
            return;
        }
        
        if (!naveId && !luogoId) {
            setError('È necessario selezionare almeno una nave o un luogo.');
            return;
        }

        if (alreadyCheckedIn) {
            const confirmed = window.confirm("Sei sicuro di voler inviare un nuovo check-in? Hai già registrato la tua presenza per oggi.");
            if (!confirmed) {
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const now = Timestamp.now();
            const fullName = userProfile ? `${userProfile.nome} ${userProfile.cognome}` : user.displayName;

            const checkinData = {
                tecnicoId: user.uid,
                tecnicoName: fullName || user.email,
                email: user.email,
                naveId: naveId || null,
                luogoId: luogoId || null,
                data: now,
                timestamp: now,
                createdAt: now,
            };

            await setDoc(doc(db, 'checkin_giornalieri', todayDocId), checkinData, { merge: true });
            
            showSnackbar('Check-in registrato con successo!', 'success');
            navigate('/');

        } catch (err) {
            console.error("Errore durante il salvataggio del check-in:", err);
            setError('Si è verificato un errore durante la registrazione.');
            showSnackbar('Errore durante la registrazione del check-in.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    if (pageLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3, maxWidth: 500, margin: 'auto' }}>
            <Paper sx={{ p: { xs: 2, sm: 4 } }} elevation={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Check-in giornaliero
                </Typography>

                {alreadyCheckedIn && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Hai già registrato un check-in oggi. Se hai cambiato posto di lavoro, puoi reinviarlo.
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <FormControl fullWidth>
                                <InputLabel id="nave-label">Nave</InputLabel>
                                <Select
                                    labelId="nave-label"
                                    value={naveId}
                                    label="Nave"
                                    onChange={(e) => setNaveId(e.target.value)}
                                >
                                    {navi.map((n) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                            <FormControl fullWidth>
                                <InputLabel id="luogo-label">Luogo</InputLabel>
                                <Select
                                    labelId="luogo-label"
                                    value={luogoId}
                                    label="Luogo"
                                    onChange={(e) => setLuogoId(e.target.value)}
                                >
                                    {luoghi.map((l) => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {error && <Grid size={12}><Alert severity="error">{error}</Alert></Grid>}
                        
                        <Grid sx={{ mt: 2 }} size={12}>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                fullWidth 
                                disabled={loading}
                                size="large"
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Conferma Check-in'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                Questo check-in giornaliero serve a registrare rapidamente la tua presenza e la postazione assegnata per la giornata. Non sostituisce la compilazione del rapportino di lavoro.
            </Typography>
        </Box>
    );
};

export default CheckinPage;
