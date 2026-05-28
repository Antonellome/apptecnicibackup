
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, CircularProgress, Alert,
    FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import {
    DataGrid, GridColDef, GridToolbarContainer
} from '@mui/x-data-grid';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { rapportinoConverter } from '@/utils/converters';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { EnrichedRapportino, Rapportino } from '@/models/definitions';
import ReportMensileDialog from '@/components/ReportMensileDialog';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useMasterData } from '@/hooks/useMasterData';
import DownloadIcon from '@mui/icons-material/Download';

const calculateOreLavoro = (report: Rapportino): number => {
    if (report.dettaglioOreTecnici && report.dettaglioOreTecnici.length > 0) {
        return report.dettaglioOreTecnici.reduce((total, d) => total + (d.ore || 0), 0);
    }
    return report.oreLavoro || 8; 
};

const TecniciPage: React.FC = () => {
    const { showSnackbar } = useSnackbar();
    const { masterData, loading: masterLoading, error: masterError } = useMasterData();

    const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>('all');
    const [mese, setMese] = useState<Date>(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (!masterData) return;

        const fetchRapportini = async () => {
            setLoading(true);
            try {
                const inizioMese = startOfMonth(mese);
                const fineMese = endOfMonth(mese);

                const queryConstraints = [
                    where("data", ">=", inizioMese),
                    where("data", "<=", fineMese),
                ];

                if (selectedTecnicoId && selectedTecnicoId !== 'all') {
                    queryConstraints.push(where("presenze", "array-contains", selectedTecnicoId));
                }
                
                const rapportiniRef = collection(db, "rapportini").withConverter(rapportinoConverter);
                const q = query(rapportiniRef, ...queryConstraints);
                
                const querySnapshot = await getDocs(q);

                const tipiGiornataMap = new Map(masterData.tipiGiornata.map(doc => [doc.id, doc]));
                const tecniciMap = new Map(masterData.tecnici.map(doc => [doc.id, doc]));

                const rapportiniData = querySnapshot.docs.map(doc => {
                    const report = doc.data();
                    const oreGiorno = calculateOreLavoro(report);
                    
                    return {
                        ...report,
                        tipoGiornata: tipiGiornataMap.get(report.tipoGiornataId),
                        tecnicoScrivente: tecniciMap.get(report.tecnicoId),
                        oreGiorno: oreGiorno, 
                    } as EnrichedRapportino;
                });

                setRapportini(rapportiniData);
            } catch (error) {
                console.error("Error fetching rapportini: ", error);
                showSnackbar('Errore nel caricamento dei rapportini.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchRapportini();
    }, [selectedTecnicoId, mese, masterData, showSnackbar]);

    const handleTecnicoChange = (event: SelectChangeEvent<string>) => {
        setSelectedTecnicoId(event.target.value as string);
    };

    const handleGeneraReport = () => {
        if (selectedTecnicoId === 'all') {
            showSnackbar("Seleziona un tecnico per generare il report.", "warning");
            return;
        }
        setDialogOpen(true);
    };

    const rows = useMemo(() => {
        return rapportini.map(r => ({
            ...r,
            id: r.id!,
            tecnicoNome: r.tecnicoScrivente ? `${r.tecnicoScrivente.cognome} ${r.tecnicoScrivente.nome}` : 'N/A',
            tipoGiornataNome: r.tipoGiornata?.nome ?? 'N/D',
            dataFormatted: format(r.data, 'dd/MM/yyyy'),
        }));
    }, [rapportini]);

    const columns: GridColDef<(typeof rows)[0]>[] = [
        { field: 'dataFormatted', headerName: 'Data', width: 120 },
        { field: 'tecnicoNome', headerName: 'Tecnico Scrivente', flex: 1, minWidth: 150 },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1, minWidth: 150 },
        { field: 'oreGiorno', headerName: 'Ore', width: 80, type: 'number' },
        { field: 'descrizioneBreve', headerName: 'Descrizione', flex: 2, minWidth: 250 },
    ];
    
    if (masterLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (masterError) return <Alert severity="error">{masterError}</Alert>;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" gutterBottom>Gestione Rapportini Tecnici</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Tecnico</InputLabel>
                            <Select value={selectedTecnicoId} label="Tecnico" onChange={handleTecnicoChange}>
                                <MenuItem value="all">Tutti i Tecnici</MenuItem>
                                {masterData?.tecnici.sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => <MenuItem key={t.id} value={t.id}>{`${t.cognome} ${t.nome}`}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <DatePicker label="Mese" value={mese} onChange={(date) => setMese(date || new Date())} views={['month', 'year']} />
                        
                        <Button
                            variant="contained"
                            onClick={handleGeneraReport}
                            disabled={selectedTecnicoId === 'all'}
                            startIcon={<DownloadIcon />}
                        >
                            Report Mensile
                        </Button>
                    </Box>

                    <Box sx={{ height: 650, width: '100%' }}>
                        {loading ? <CircularProgress /> :
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                rowHeight={60}
                                slots={{ toolbar: GridToolbarContainer }}
                            />
                        }
                    </Box>
                </Paper>
                {dialogOpen && (
                    <ReportMensileDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        reports={rapportini.filter(r => r.presenze.some(p => p === selectedTecnicoId))}
                        currentMonth={mese}
                    />
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default TecniciPage;
