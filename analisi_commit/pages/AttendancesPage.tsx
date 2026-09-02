import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
    Box, Typography, Paper, CircularProgress, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, 
    FormControl, InputLabel, Grid 
} from '@mui/material';
import MenuBar from '../components/MenuBar';
import { Tecnico, Rapportino, TipoGiornata } from '../models/definitions';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
dayjs.locale('it');

interface AttendanceData {
    [key: string]: { // tecnicoId
        [key: number]: { // day of month
            status: string;
            tipo: string;
        };
    };
}

const fetchCollection = async <T extends { id: string }>(colName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, colName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const getStatusStyle = (status: string) => {
    let backgroundColor = '#424242'; // Grigio scuro per weekend/default
    const color = 'white';
    switch (status) {
        case 'LAVORO': backgroundColor = '#4CAF50'; break; // Verde
        case 'FERIE': backgroundColor = '#2196F3'; break; // Blu
        case 'MALATTIA': backgroundColor = '#FF9800'; break; // Arancione
        case 'ASSENZA INGIUSTIFICATA': backgroundColor = '#F44336'; break; // Rosso
        case 'PERMESSO': backgroundColor = '#9C27B0'; break; // Viola
        default: break;
    }
    return { backgroundColor, color, width: '40px', height: '40px', textAlign: 'center', padding: '8px', border: '1px solid #555' };
};

const Legend = () => (
    <Grid container spacing={2} sx={{ mt: 2, mb: 2, p: 2, backgroundColor: '#333', borderRadius: '8px' }}>
        {Object.entries({
            'Lavoro': 'LAVORO',
            'Ferie': 'FERIE',
            'Malattia': 'MALATTIA',
            'Permesso': 'PERMESSO',
            'Assenza Ingiustificata': 'ASSENZA INGIUSTIFICATA'
        }).map(([label, status]) => (
            <Grid key={status} display="flex" alignItems="center">
                <Box sx={{ ...getStatusStyle(status), width: 20, height: 20, mr: 1 }} />
                <Typography variant="body2">{label}</Typography>
            </Grid>
        ))}
    </Grid>
);

const AttendancesPage = () => {
    const [date, setDate] = useState(dayjs());
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
    const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
    const [loading, setLoading] = useState(true);

    const daysInMonth = date.daysInMonth();

    useEffect(() => {
        const processData = async () => {
            setLoading(true);
            try {
                // 1. Fetch data
                const [fetchedTecnici, fetchedTipiGiornata] = await Promise.all([
                    fetchCollection<Tecnico>('tecnici'),
                    fetchCollection<TipoGiornata>('tipi_giornata_data')
                ]);
                setTecnici(fetchedTecnici);
                setTipiGiornata(fetchedTipiGiornata);
                const tipiGiornataMap = new Map(fetchedTipiGiornata.map(t => [t.id, t]));

                const startOfMonth = date.startOf('month').toDate();
                const endOfMonth = date.endOf('month').toDate();

                const rapportiniQuery = query(
                    collection(db, 'rapportini'),
                    where('data', '>=', startOfMonth),
                    where('data', '<=', endOfMonth)
                );
                const rapportiniSnapshot = await getDocs(rapportiniQuery);
                const rapportini = rapportiniSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Rapportino[];

                // 2. Process data
                const data: AttendanceData = {};

                for (const tecnico of fetchedTecnici) {
                    data[tecnico.id] = {};
                    for (let day = 1; day <= daysInMonth; day++) {
                        const currentDay = date.date(day);
                        const dayOfWeek = currentDay.day(); // 0 = Domenica, 6 = Sabato
                        
                        const rapportino = rapportini.find(r => 
                            r.tecnicoScriventeId === tecnico.id && dayjs(r.data.toDate()).isSame(currentDay, 'day')
                        );

                        if (rapportino) {
                            const tipo = tipiGiornataMap.get(rapportino.giornataId);
                            data[tecnico.id][day] = { 
                                status: tipo?.lavorativa ? 'LAVORO' : tipo?.nome.toUpperCase() || 'NON DEFINITO',
                                tipo: tipo?.nome || 'N/D'
                            }; 
                        } else {
                            if (dayOfWeek > 0 && dayOfWeek < 6) { // Se è un giorno lavorativo (Lun-Ven)
                                data[tecnico.id][day] = { status: 'ASSENZA INGIUSTIFICATA', tipo: 'Assenza' };
                            } else {
                                data[tecnico.id][day] = { status: 'WEEKEND', tipo: 'Weekend' };
                            }
                        }
                    }
                }
                setAttendanceData(data);
            } catch (error) {
                console.error("Errore nel caricamento delle presenze:", error);
            } finally {
                setLoading(false);
            }
        };

        processData();
    }, [date, daysInMonth]);
    
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM')), []);
    const yearOptions = useMemo(() => {
        const currentYear = dayjs().year();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
            <MenuBar title="Presenze" />
            <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h5" component="h2" gutterBottom>Heatmap Presenze Mensili</Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 3
                            }}>
                            <FormControl fullWidth>
                                <InputLabel>Mese</InputLabel>
                                <Select value={date.month()} onChange={e => setDate(date.month(e.target.value as number))}>
                                    {monthOptions.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 3
                            }}>
                            <FormControl fullWidth>
                                <InputLabel>Anno</InputLabel>
                                <Select value={date.year()} onChange={e => setDate(date.year(e.target.value as number))}>
                                    {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Legend />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} elevation={2}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 150, position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#212121' }}>Tecnico</TableCell>
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                            <TableCell key={day} sx={{ textAlign: 'center', fontWeight: 'bold' }}>{day}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tecnici.map(tecnico => (
                                        <TableRow key={tecnico.id}>
                                            <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#212121' }}>
                                                {`${tecnico.nome} ${tecnico.cognome}`}
                                            </TableCell>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                                <TableCell key={day} sx={getStatusStyle(attendanceData[tecnico.id]?.[day]?.status || 'WEEKEND')}>
                                                   <Typography variant="caption">{attendanceData[tecnico.id]?.[day]?.tipo || ''}</Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};

export default AttendancesPage;
