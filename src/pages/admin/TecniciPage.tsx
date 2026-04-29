
import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
    Box, Paper, Typography, Button, TextField, CircularProgress,
    Tabs, Tab, Alert, IconButton, Collapse, Tooltip,
    FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import {
    DataGrid, GridColDef, GridActionsCellItem, GridRowParams,
    GridToolbarContainer, GridToolbarExport
} from '@mui/x-data-grid';
import { collection, getDocs, query, where, orderBy, and, or } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { EnrichedRapportino, Rapportino, Tecnico } from '@/models/definitions';
import ReportMensileDialog from '@/components/ReportMensileDialog';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { DataContext } from '@/contexts/DataProvider';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface Row extends EnrichedRapportino {
    id: string;
    tecnicoNome: string;
    tipoGiornataNome: string;
    dataFormatted: string;
}

const TecniciPage: React.FC = () => {
    const { showSnackbar } = useSnackbar();
    const dataContext = useContext(DataContext);
    const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>('all');
    const [mese, setMese] = useState<Date>(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [openRows, setOpenRows] = useState<Set<string>>(new Set());

    if (!dataContext) return <CircularProgress />;
    const { tecnici, tipiGiornata, navi, luoghi, veicoli, loading: masterLoading } = dataContext;

    const fetchRapportini = async () => {
        setLoading(true);
        try {
            const inizioMese = startOfMonth(mese);
            const fineMese = endOfMonth(mese);

            const conditions = [
                where("data", ">=", inizioMese),
                where("data", "<=", fineMese),
            ];

            if (selectedTecnicoId && selectedTecnicoId !== 'all') {
                conditions.push(where("presenze", "array-contains", selectedTecnicoId));
            }

            if (searchTerm) {
                const searchConditions = or(
                     where('descrizioneBreve', '>=', searchTerm),
                     where('descrizioneBreve', '<=', searchTerm + '\uf8ff'),
                     where('lavoroEseguito', '>=', searchTerm),
                     where('lavoroEseguito', '<=', searchTerm + '\uf8ff')
                );
                conditions.push(searchConditions);
            }
            
            const q = query(collection(db, "rapportini"), and(...conditions));
            
            const querySnapshot = await getDocs(q);
            const rapportiniData = querySnapshot.docs.map(doc => {
                const data = doc.data() as Rapportino;
                const dataJS = data.data.toDate ? data.data.toDate() : parseISO(data.data as any);
                return { id: doc.id, ...data, data: dataJS };
            }) as EnrichedRapportino[];

            setRapportini(rapportiniData);
        } catch (error) {
            console.error("Error fetching rapportini: ", error);
            showSnackbar('Errore nel caricamento dei rapportini.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!masterLoading) {
            fetchRapportini();
        }
    }, [selectedTecnicoId, mese, masterLoading, searchTerm]);

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

    const getTecnicoNome = (id: string) => tecnici.find(t => t.id === id)?.nomeCompleto || 'N/A';
    const getTipoGiornataNome = (id?: string) => tipiGiornata.find(t => t.id === id)?.nome || 'N/A';

    const rows = useMemo(() => rapportini.map(r => ({
        ...r,
        tecnicoNome: getTecnicoNome(r.tecnicoId),
        tipoGiornataNome: getTipoGiornataNome(r.tipoGiornataId),
        dataFormatted: format(r.data, 'dd/MM/yyyy'),
    })), [rapportini, tecnici, tipiGiornata]);

    const toggleRow = (id: string) => {
        const newOpenRows = new Set(openRows);
        if (newOpenRows.has(id)) {
            newOpenRows.delete(id);
        } else {
            newOpenRows.add(id);
        }
        setOpenRows(newOpenRows);
    };

    const columns: GridColDef<Row>[] = [
        {
            field: 'expand',
            headerName: '',
            width: 50,
            renderCell: ({ row }) => (
                <IconButton onClick={() => toggleRow(row.id)}>
                    {openRows.has(row.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            )
        },
        { field: 'dataFormatted', headerName: 'Data', width: 120 },
        { field: 'tecnicoNome', headerName: 'Tecnico', flex: 1, minWidth: 150 },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1, minWidth: 150 },
        { field: 'oreLavoro', headerName: 'Ore', width: 80, type: 'number' },
        { field: 'descrizioneBreve', headerName: 'Descrizione', flex: 2, minWidth: 250 },
    ];

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
                                {tecnici.map(t => <MenuItem key={t.id} value={t.id}>{t.nomeCompleto}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <DatePicker label="Mese" value={mese} onChange={(date) => setMese(date || new Date())} views={['month', 'year']} />
                        <TextField
                            label="Cerca..."
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flexGrow: 1 }}
                        />
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
                                slotProps={{
                                    row: {
                                        as: (props) => {
                                            const { item, ...rest } = props;
                                            return (
                                                <>
                                                    <props.as {...rest} />
                                                    <Collapse in={openRows.has(item.id)} timeout="auto" unmountOnExit>
                                                        <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
                                                            <Typography variant="h6">Dettagli Intervento</Typography>
                                                            <Typography><strong>Lavoro Eseguito:</strong> {item.lavoroEseguito || 'N/D'}</Typography>
                                                            <Typography><strong>Materiali:</strong> {item.materialiImpiegati || 'N/D'}</Typography>
                                                            <Typography><strong>Altri Tecnici:</strong> {item.altriTecniciIds?.map(getTecnicoNome).join(', ') || 'Nessuno'}</Typography>
                                                            <Typography><strong>Nave:</strong> {navi.find(n => n.id === item.naveId)?.nome || 'N/D'}</Typography>
                                                        </Box>
                                                    </Collapse>
                                                </>
                                            );
                                        },
                                    }
                                }}
                            />
                        }
                    </Box>
                </Paper>
                <ReportMensileDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    rapportini={rapportini.filter(r => r.tecnicoId === selectedTecnicoId || r.altriTecniciIds?.includes(selectedTecnicoId))}
                    mese={mese}
                />
            </Box>
        </LocalizationProvider>
    );
};

export default TecniciPage;
