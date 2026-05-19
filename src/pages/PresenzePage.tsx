
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert, IconButton, Tooltip, SxProps, Theme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLocalData } from '@/hooks/useLocalData';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Tecnico, RiepilogoMensile, DayInfo } from '@/models/definitions';
import { useAuth } from '@/hooks/useAuth';

// --- STILI ---
const cellStyle: SxProps<Theme> = {
    minWidth: 40,
    textAlign: 'center',
    padding: '8px 4px',
    borderRight: '1px solid #eee',
    position: 'relative',
};

const headerCellStyle: SxProps<Theme> = {
    ...cellStyle,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    color: '#333',
    borderBottom: '2px solid #ddd',
};

const weekendCellStyle = (isWeekendDay: boolean): SxProps<Theme> | undefined => (
    isWeekendDay ? { backgroundColor: '#fafafa' } : undefined
);

const tecnicoNameStyle: SxProps<Theme> = {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    width: 180,
    backgroundColor: '#f9f9f9',
    borderRight: '2px solid #ddd',
    fontWeight: 'bold',
};

// --- COMPONENTI ---

const CalendarHeader: React.FC<{ days: Date[] }> = ({ days }) => (
    <Box sx={{ display: 'flex' }}>
        <Box sx={{...headerCellStyle, ...tecnicoNameStyle}}>
            <Typography variant="body2" fontWeight="bold">Tecnico</Typography>
        </Box>
        {days.map(day => {
            const isWeekendDay = isWeekend(day);
            return (
                <Box key={day.toISOString()} sx={{...headerCellStyle, ...weekendCellStyle(isWeekendDay)}}>
                    <Typography variant="caption" display="block">{format(day, 'E', { locale: it })}</Typography>
                    <Typography variant="body2">{format(day, 'd')}</Typography>
                </Box>
            );
        })}
    </Box>
);

const DayCell: React.FC<{ dayInfo?: DayInfo; isWeekendDay: boolean }> = ({ dayInfo, isWeekendDay }) => {
    const getCellContent = () => {
        if (!dayInfo || !dayInfo.tipo) {
            return { text: '-', color: 'text.disabled', tooltip: 'Nessun dato' };
        }
        switch (dayInfo.tipo) {
            case 'LAVORO':
                return { text: dayInfo.ore?.toFixed(1) || 'L', color: 'text.primary', tooltip: `Lavoro: ${dayInfo.ore} ore` };
            case 'FERIE':
                return { text: 'F', color: 'info.main', tooltip: 'Ferie' };
            case 'MALATTIA':
                return { text: 'M', color: 'error.main', tooltip: 'Malattia' };
            case 'PERMESSO':
                return { text: 'P', color: 'warning.main', tooltip: 'Permesso' };
            default:
                return { text: 'N/D', color: 'text.secondary', tooltip: dayInfo.tooltip || 'Dato non disponibile' };
        }
    };

    const { text, color, tooltip } = getCellContent();

    return (
        <Tooltip title={tooltip} placement="top">
            <Box sx={{...cellStyle, ...weekendCellStyle(isWeekendDay)}}>
                <Typography variant="body2" sx={{ color, fontWeight: text !== '-' ? 'bold' : 'normal' }}>
                    {text}
                </Typography>
            </Box>
        </Tooltip>
    );
};


const PresenzePage: React.FC = () => {
    const { userProfile } = useAuth(); // ++ FIX: Usare userProfile per i dati arricchiti
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { data: masterData, loading: masterDataLoading } = useLocalData();
    const [riepiloghi, setRiepiloghi] = useState<Map<string, RiepilogoMensile>>(new Map());

    const tecnici = masterData?.tecnici ?? [];

    const sortedTecnici = useMemo(() => {
        return [...tecnici].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
    }, [tecnici]);

    const daysOfMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const fetchRiepiloghi = useCallback(async (tecniciToFetch: Tecnico[], date: Date) => {
        if (!userProfile?.isAdmin) { // ++ FIX: Controllo su userProfile
             setLoading(false);
             return;
        }

        setLoading(true);
        setError(null);
        
        const monthStr = format(date, 'yyyy-MM');
        const riepiloghiPromises = tecniciToFetch.map(tecnico => {
            const docId = `${tecnico.id}_${monthStr}`;
            return getDoc(doc(db, 'riepiloghiMensili', docId));
        });

        try {
            const riepilogoSnapshots = await Promise.all(riepiloghiPromises);
            const newRiepiloghi = new Map<string, RiepilogoMensile>();
            
            riepilogoSnapshots.forEach((docSnap, index) => {
                const tecnicoId = tecniciToFetch[index].id;
                if (docSnap.exists()) {
                    newRiepiloghi.set(tecnicoId, docSnap.data() as RiepilogoMensile);
                }
            });

            setRiepiloghi(newRiepiloghi);

        } catch (err) {
            console.error("Errore nel caricamento dei riepiloghi mensili:", err);
            setError("Impossibile caricare i dati delle presenze. Riprova più tardi.");
        } finally {
            setLoading(false);
        }
    }, [userProfile]); // ++ FIX: Dipendenza corretta

    useEffect(() => {
        if (tecnici.length > 0) {
            fetchRiepiloghi(tecnici, currentDate);
        }
    }, [currentDate, tecnici, fetchRiepiloghi]);


    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    if (!userProfile?.isAdmin) { // ++ FIX: Controllo su userProfile
        return (
            <Alert severity="error" sx={{m: 3}}>
                Accesso non autorizzato. Questa pagina è riservata agli amministratori.
            </Alert>
        );
    }

    if (masterDataLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="h1" fontWeight="bold">
                        Quadro Presenze
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={handlePrevMonth}><ChevronLeft /></IconButton>
                        <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                            {format(currentDate, 'MMMM yyyy', { locale: it })}
                        </Typography>
                        <IconButton onClick={handleNextMonth}><ChevronRight /></IconButton>
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Box sx={{ overflowX: 'auto', border: '1px solid #ddd' }}>
                        <CalendarHeader days={daysOfMonth} />
                        <Box>
                            {sortedTecnici.map(tecnico => {
                                const riepilogoTecnico = riepiloghi.get(tecnico.id);
                                return (
                                    <Box key={tecnico.id} sx={{ display: 'flex' }}>
                                        <Box sx={{...cellStyle, ...tecnicoNameStyle}}>
                                            <Typography variant="body2">
                                                {tecnico.cognome} {tecnico.nome}
                                            </Typography>
                                        </Box>
                                        {daysOfMonth.map(day => {
                                            const dayOfMonth = format(day, 'd');
                                            const dayInfo = riepilogoTecnico?.giorni[dayOfMonth];
                                            const isWeekendDay = isWeekend(day);
                                            return (
                                                <DayCell 
                                                    key={day.toISOString()}
                                                    dayInfo={dayInfo}
                                                    isWeekendDay={isWeekendDay}
                                                />
                                            );
                                        })}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default PresenzePage;
