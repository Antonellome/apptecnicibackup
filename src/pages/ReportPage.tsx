
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Rapportino } from '../models/definitions'; // Assumo che le definizioni siano qui
import { 
    Box, 
    Typography, 
    TextField, 
    InputAdornment, 
    CircularProgress, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    IconButton, 
    Tooltip
} from '@mui/material';
import { Search, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const ReportPage = () => {
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stati per i filtri di ricerca
    const [searchData, setSearchData] = useState('');
    const [searchNave, setSearchNave] = useState('');
    const [searchLuogo, setSearchLuogo] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchRapportini = async () => {
            try {
                setLoading(true);
                const q = query(collection(db, 'rapportini'), orderBy('data', 'desc'));
                const querySnapshot = await getDocs(q);
                const rapportiniList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Rapportino));
                setRapportini(rapportiniList);
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Errore nel caricamento dei report. Riprova più tardi.");
            } finally {
                setLoading(false);
            }
        };

        fetchRapportini();
    }, []);

    const filteredRapportini = useMemo(() => {
        return rapportini.filter(report => {
            const dataMatch = searchData ? dayjs(report.data.toDate()).format('DD/MM/YYYY').includes(searchData) : true;
            // NOTA: La ricerca su nave e luogo richiede di avere i nomi, non solo gli ID.
            // Per ora, la ricerca è disabilitata in attesa di un join dei dati.
            // const naveMatch = searchNave ? report.naveNome?.toLowerCase().includes(searchNave.toLowerCase()) : true;
            // const luogoMatch = searchLuogo ? report.luogoNome?.toLowerCase().includes(searchLuogo.toLowerCase()) : true;
            
            return dataMatch; // && naveMatch && luogoMatch;
        });
    }, [rapportini, searchData, searchNave, searchLuogo]);

    const handleEdit = (id: string) => {
        navigate(`/rapportino/modifica/${id}`);
    };

    const handleDelete = async (id: string) => {
        // Logica di cancellazione da implementare
        console.log(`Cancellazione richiesta per ${id}`);
        alert(`Funzione di cancellazione per ${id} da implementare.`);
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>{error}</Typography>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom component="h1">
                Elenco Report
            </Typography>

            {/* Sezione Filtri di Ricerca */}
            <Paper sx={{ mb: 3, p: 2, display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.08)' }}>
                <TextField
                    label="Filtra per data (GG/MM/YYYY)"
                    variant="outlined"
                    size="small"
                    value={searchData}
                    onChange={(e) => setSearchData(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
                <TextField
                    label="Filtra per nave (non attivo)"
                    variant="outlined"
                    size="small"
                    value={searchNave}
                    onChange={(e) => setSearchNave(e.target.value)}
                    disabled
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
                <TextField
                    label="Filtra per luogo (non attivo)"
                    variant="outlined"
                    size="small"
                    value={searchLuogo}
                    onChange={(e) => setLuogo(e.target.value)}
                    disabled
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
            </Paper>

            {/* Tabella dei Report */}
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="tabella dei report">
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Breve Descrizione</TableCell>
                            <TableCell>Ore Lavorate</TableCell>
                            <TableCell align="right">Azioni</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRapportini.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell component="th" scope="row">
                                    {dayjs(row.data.toDate()).format('DD/MM/YYYY')}
                                </TableCell>
                                <TableCell>{row.breveDescrizione}</TableCell>
                                <TableCell>{row.oreLavorate}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Modifica">
                                        <IconButton onClick={() => handleEdit(row.id)} color="primary">
                                            <Edit />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Elimina">
                                        <IconButton onClick={() => handleDelete(row.id)} color="error">
                                            <Delete />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ReportPage;
