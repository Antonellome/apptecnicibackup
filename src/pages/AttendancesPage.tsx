import { useState, useContext } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    TextField,
    Button,
    IconButton,
    Collapse
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckinGiornaliero, Rapportino } from '@/models/definitions'; 
import { db } from '@/db/local-db';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useGlobalData } from '@/hooks/useGlobalData';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface DayGroup {
    id: string; // Date string 'yyyy-MM-dd'
    date: Date;
    checkins: CheckinGiornaliero[];
    rapportini: Rapportino[];
}

const AttendancesPage = () => {
    const authContext = useContext(AuthContext);
    const loggedInTecnicoId = authContext?.userProfile?.tecnicoId;

    const [startDate, setStartDate] = useState(format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm"));
    const [endDate, setEndDate] = useState(format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm"));
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const { luoghi, navi, tipiGiornata } = useGlobalData();

    const handleToggle = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id);
    };

    const attendances = useLiveQuery(async () => {
        if (!loggedInTecnicoId) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);

        const rapportiniInRange = await db.rapportini
            .where('[tecnicoId+data]')
            .between([loggedInTecnicoId, start], [loggedInTecnicoId, end])
            .toArray();

        const checkinsInRange = await db.checkin_giornalieri
            .where('[tecnicoId+timestampReale]')
            .between([loggedInTecnicoId, start], [loggedInTecnicoId, end])
            .toArray();
        
        const groupedByDay: Map<string, DayGroup> = new Map();
        const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

        rapportiniInRange.forEach(r => {
            const dateKey = toDateKey(r.data);
            if (!groupedByDay.has(dateKey)) {
                groupedByDay.set(dateKey, { id: dateKey, date: r.data, rapportini: [], checkins: [] });
            }
            groupedByDay.get(dateKey)!.rapportini.push(r);
        });

        checkinsInRange.forEach(c => {
            const dateKey = toDateKey(c.timestampReale);
            if (!groupedByDay.has(dateKey)) {
                 groupedByDay.set(dateKey, { id: dateKey, date: startOfDay(c.timestampReale), rapportini: [], checkins: [] });
            }
            groupedByDay.get(dateKey)!.checkins.push(c);
        });
        
        const sortedGroups = Array.from(groupedByDay.values())
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return sortedGroups;

    }, [loggedInTecnicoId, startDate, endDate], []);

    const renderCheckinDetails = (checkin: CheckinGiornaliero) => {
        const luogo = checkin.luogoId 
            ? luoghi.find(l => l.id === checkin.luogoId)?.nome 
            : (checkin.naveId ? navi.find(n => n.id === checkin.naveId)?.nome : 'N/A');
        return (
            <ListItemText 
                primary={`${checkin.tipo.replace(/_/g, ' ')} - ${format(checkin.timestampImpostato, 'HH:mm')}`}
                secondary={luogo}
            />
        )
    }
    
    if (!attendances) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>Storico Presenze</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 5 }}>
                        <TextField
                            label="Data Inizio"
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 5 }}>
                        <TextField
                            label="Data Fine"
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                         <Button variant="contained" fullWidth>Cerca</Button>
                    </Grid>
                </Grid>
            </Paper>

            {attendances.length === 0 ? (
                <Alert severity="info">Nessuna presenza trovata per il periodo selezionato.</Alert>
            ) : (
                <List>
                    {attendances.map(dayGroup => {
                        const tipoGiornataId = dayGroup.rapportini[0]?.tipoGiornataId;
                        const giornataNome = tipiGiornata.find(t => t.id === tipoGiornataId)?.nome || (dayGroup.rapportini.length > 0 ? 'Rapportino Manuale' : 'Solo Check-in');

                        return (
                        <Paper key={dayGroup.id} sx={{ mb: 2 }}>
                            <ListItem>
                                 <ListItemText 
                                    primary={`Giornata del ${format(dayGroup.date, 'dd/MM/yyyy')}`}
                                    secondary={giornataNome}
                                />
                                <IconButton onClick={() => handleToggle(dayGroup.id)}>
                                    <ExpandMoreIcon />
                                </IconButton>
                            </ListItem>
                            <Collapse in={expandedItem === dayGroup.id} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 4, pr:2, pb: 2 }}>
                                    {dayGroup.checkins.length > 0 && <>
                                        <Typography variant='h6'>Check-in/out</Typography>
                                        <List dense>
                                             {dayGroup.checkins.sort((a,b) => a.timestampReale.getTime() - b.timestampReale.getTime()).map(c => <ListItem key={c.id}>{renderCheckinDetails(c)}</ListItem>)}
                                        </List>
                                    </>}
                                    {dayGroup.rapportini.length > 0 && <>
                                        <Typography variant='h6' sx={{mt: 2}}>Rapportini</Typography>
                                        <List dense>
                                             {dayGroup.rapportini.map(r => <ListItem key={r.id}><ListItemText primary={r.nome} secondary={`ID: ${r.id.substring(0,10)}...`} /></ListItem>)}
                                        </List>
                                    </>}
                                </Box>
                            </Collapse>
                        </Paper>
                    )})}
                </List>
            )}
        </Box>
    );
};

export default AttendancesPage;
