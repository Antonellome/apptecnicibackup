import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Button,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useGlobalData } from '@/contexts/GlobalDataProvider'; // Corretto!
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase'; // Corretto!
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Rapportino, Tecnico, TipoGiornata, Nave, Luogo } from '@/models/definitions';

const ReportListPage: React.FC = () => {
    const navigate = useNavigate();
    const { rapportini, tecnici, tipiGiornata, navi, luoghi, loading: globalLoading } = useGlobalData();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'rapportini', showDeleteConfirm));
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error("Errore durante l'eliminazione del report: ", error);
            alert("Si è verificato un errore durante l'eliminazione.");
        } finally {
            setIsDeleting(false);
        }
    };

    const dataMap = useMemo(() => ({
        tecnici: tecnici.reduce((acc, t) => ({ ...acc, [t.id]: `${t.cognome} ${t.nome}` }), {}),
        tipiGiornata: tipiGiornata.reduce((acc, tg) => ({ ...acc, [tg.id]: tg }), {}),
        navi: navi.reduce((acc, n) => ({ ...acc, [n.id]: n.nome }), {}),
        luoghi: luoghi.reduce((acc, l) => ({ ...acc, [l.id]: l.nome }), {}),
    }), [tecnici, tipiGiornata, navi, luoghi]);

    const sortedReports = useMemo(() => 
        [...rapportini].sort((a, b) => b.data.toDate().getTime() - a.data.toDate().getTime()), 
    [rapportini]);

    const filteredReports = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return sortedReports;
        return sortedReports.filter(report => {
            const dataString = format(report.data.toDate(), 'dd/MM/yyyy', { locale: it });
            const tecnico = dataMap.tecnici[report.tecnicoScriventeId]?.toLowerCase();
            const tipoGiornata = dataMap.tipiGiornata[report.giornataId]?.nome.toLowerCase();
            const nave = report.naveId ? dataMap.navi[report.naveId]?.toLowerCase() : '';
            const luogo = report.luogoId ? dataMap.luoghi[report.luogoId]?.toLowerCase() : '';
            const descrizione = report.breveDescrizione?.toLowerCase();
            return (dataString.includes(query) || tecnico?.includes(query) || tipoGiornata?.includes(query) || nave?.includes(query) || luogo?.includes(query) || descrizione?.includes(query));
        });
    }, [searchQuery, sortedReports, dataMap]);

    if (globalLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" component="h1">Elenco Report</Typography>
                <Button variant="contained" color="primary" onClick={() => navigate('/rapportino/nuovo')}>Nuovo Report</Button>
            </Box>

            <TextField
                fullWidth
                variant="outlined"
                placeholder="Cerca per data, tecnico, nave, luogo, tipo o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ mb: 3 }}
            />
            
            <Paper elevation={3}>
                {filteredReports.length > 0 ? (
                    <List disablePadding>
                        {filteredReports.map((report, index) => {
                            const tipoG = dataMap.tipiGiornata[report.giornataId];
                            return (
                                <ListItem key={report.id} divider={index < filteredReports.length - 1} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start' }}>
                                    <ListItemText 
                                        primary={`${format(report.data.toDate(), 'EEEE, dd MMMM yyyy', { locale: it })} - ${dataMap.tecnici[report.tecnicoScriventeId] || 'N/D'}`}
                                        secondary={<>
                                            <Typography component="span" sx={{ display: 'block', fontWeight: 'bold' }}>
                                                {tipoG?.nome || 'N/D'} ({report.oreLavorate}h)
                                            </Typography>
                                            {report.breveDescrizione}
                                        </>}
                                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Button size="small" onClick={() => navigate(`/rapportino/edit/${report.id}`)}>Modifica</Button>
                                        <Button size="small" color="error" onClick={() => setShowDeleteConfirm(report.id)}>Elimina</Button>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Alert severity="info" sx={{ m: 2 }}>{rapportini.length > 0 ? 'Nessun report corrisponde alla ricerca.' : 'Nessun report trovato.'}</Alert>
                )}
            </Paper>

            <Dialog open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)}>
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent><DialogContentText>Sei sicuro di voler eliminare questo report? L'azione è irreversibile.</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteConfirm(null)} disabled={isDeleting}>Annulla</Button>
                    <Button onClick={handleDelete} color="error" disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={20} /> : 'Elimina'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReportListPage;
