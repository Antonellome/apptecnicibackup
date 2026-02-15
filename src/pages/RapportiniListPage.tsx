import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, CircularProgress, Alert, Fab,
    Divider, Chip, Paper, IconButton, Tooltip
} from '@mui/material';
import { Add as AddIcon, Work as WorkIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// --- INTERFACCE DATI ---

interface RapportinoListItem {
    id: string;
    data: string;
    tecnicoName: string;
    tipoGiornataName: string;
    oreLavoro: number;
    isLavorativo: boolean;
}

interface FirestoreDoc {
    id: string;
    [key: string]: any;
}

// --- FUNZIONE DI HELPERS ---

const formatOreLavoro = (ore: number) => {
    if (ore > 8) {
        const straordinario = ore - 8;
        return `8 + ${straordinario.toFixed(2)}`;
    }
    return ore.toString();
};

// --- COMPONENTE ---

const RapportiniListPage = () => {
    const [rapportini, setRapportini] = useState<RapportinoListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Carica tutte le collezioni necessarie in parallelo
            const [tecniciSnap, tipiGiornataSnap, rapportiniSnap] = await Promise.all([
                getDocs(collection(db, 'tecnici')),
                getDocs(collection(db, 'tipiGiornata')),
                getDocs(query(collection(db, 'rapportini'), orderBy('data', 'desc')))
            ]);

            // Crea mappe per una ricerca efficiente dei nomi
            const tecniciMap = new Map(tecniciSnap.docs.map(doc => [doc.id, doc.data().name]));
            const tipiGiornataMap = new Map(tipiGiornataSnap.docs.map(doc => [doc.id, { name: doc.data().name, lavorativo: doc.data().lavorativo }]));

            // Elabora i rapportini
            const rapportiniList = rapportiniSnap.docs.map(doc => {
                const data = doc.data();
                const tipoGiornataInfo = tipiGiornataMap.get(data.tipoGiornataId);

                return {
                    id: doc.id,
                    data: (data.data as Timestamp).toDate().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    tecnicoName: tecniciMap.get(data.tecnicoId) || 'N/A',
                    tipoGiornataName: tipoGiornataInfo?.name || 'N/A',
                    oreLavoro: data.oreLavoro || 0,
                    isLavorativo: tipoGiornataInfo?.lavorativo || false,
                } as RapportinoListItem;
            });

            setRapportini(rapportiniList);

        } catch (err) {
            console.error("Fallimento nel caricamento dei dati:", err);
            setError('Impossibile caricare i dati. Riprova più tardi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleItemClick = (id: string) => {
        navigate(`/rapportini/modifica/${id}`);
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 2, pb: 10 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate('/')} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    Elenco Rapportini
                </Typography>
            </Box>

            {rapportini.length === 0 ? (
                <Paper sx={{p: 3, textAlign: 'center'}}>
                    <Typography>Nessun rapportino trovato.</Typography>
                </Paper>
            ) : (
                <List component={Paper} elevation={2} sx={{ bgcolor: 'background.paper' }}>
                    {rapportini.map((rapportino, index) => (
                        <React.Fragment key={rapportino.id}>
                            <ListItem
                                secondaryAction={
                                    <Tooltip title="Modifica Rapportino">
                                        <IconButton edge="end" aria-label="edit" onClick={() => handleItemClick(rapportino.id)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: rapportino.isLavorativo ? 'primary.main' : 'grey.500' }}>
                                        <WorkIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${rapportino.data} - ${rapportino.tecnicoName}`}
                                    secondary={
                                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography component="span" variant="body2" color="text.primary">
                                                {rapportino.tipoGiornataName}
                                            </Typography>
                                            {rapportino.isLavorativo && 
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    Ore: {formatOreLavoro(rapportino.oreLavoro)}
                                                </Typography>}
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {index < rapportini.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            )}

            <Fab
                color="primary"
                aria-label="add"
                onClick={() => navigate('/rapportini/nuovo')}
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default RapportiniListPage;
