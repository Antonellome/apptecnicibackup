
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Select, MenuItem, FormControl, InputLabel, TextField, IconButton, CircularProgress } from '@mui/material';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAuth } from '@/hooks/useAuth';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { rapportoConverter } from '@/utils/converters';

import ConsuntivoTable from '@/components/ConsuntivoTable';
import CalendarioView from '@/components/CalendarioView';
import { TipoGiornata, Rapportino } from '@/models/definitions';

const ReportMensilePage: React.FC = () => {
    const { user } = useAuth();
    const { tipiGiornata, loading: globalLoading } = useGlobalData();
    
    const [allReports, setAllReports] = useState<Rapportino[]>([]);
    const [reportsLoading, setReportsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setReportsLoading(false);
            return;
        }
        const q = query(
            collection(db, 'rapportini'),
            where('tecnicoId', '==', user.uid)
        ).withConverter(rapportoConverter);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setAllReports(data);
            setReportsLoading(false);
        }, (error) => {
            console.error("Errore nel caricamento dei rapportini: ", error);
            setReportsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const [activeTab, setActiveTab] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const enrichedAndFilteredReports = useMemo(() => {
        const filteredByDate = allReports.filter(report => {
            const reportDate = (report.data as Timestamp)?.toDate();
            if (!reportDate) return false;
            return reportDate.getFullYear() === currentYear &&
                   reportDate.getMonth() === currentMonth;
        });

        const tipiGiornataMap = new Map(tipiGiornata.map((item: TipoGiornata) => [item.id, item]));
        const enriched = filteredByDate.map(report => ({
            ...report,
            tipoGiornata: tipiGiornataMap.get(report.tipoGiornataId),
        }));

        if (searchTerm === '') return enriched;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return enriched.filter(report => {
            const searchIn = [ report.tipoGiornata?.nome ].join(' ').toLowerCase();
            return searchIn.includes(lowerCaseSearch);
        });

    }, [allReports, tipiGiornata, currentMonth, currentYear, searchTerm]);

    const handleExport = () => {
        console.log("Esportazione dei dati...", enrichedAndFilteredReports);
        alert("Funzionalità di esportazione da implementare.");
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    // --- MODIFICA: Ordinamento alfabetico dei mesi --- 
    const months = useMemo(() => {
        const monthData = Array.from({ length: 12 }, (_, i) => {
            const name = new Date(0, i).toLocaleString('it-IT', { month: 'long' });
            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: i,
            };
        });
        monthData.sort((a, b) => a.name.localeCompare(b.name, 'it'));
        return monthData;
    }, []);
    // --------------------------------------------------

    const loading = reportsLoading || globalLoading;

    return (
        <Box sx={{ maxWidth: 1200, margin: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Report Mensile
            </Typography>

            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
                 <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                     <FormControl >
                        <InputLabel>Mese</InputLabel>
                        {/* --- MODIFICA: Aggiornamento del menu a tendina dei mesi --- */}
                        <Select value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value as number)} label="Mese">
                            {months.map(month => <MenuItem key={month.value} value={month.value}>{month.name}</MenuItem>)}
                        </Select>
                        {/* -------------------------------------------------------------- */}
                    </FormControl>
                    <FormControl >
                        <InputLabel>Anno</InputLabel>
                        <Select value={currentYear} onChange={(e) => setCurrentYear(e.target.value as number)} label="Anno">
                            {years.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField 
                        variant="outlined"
                        label="Cerca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flexGrow: 1 }}
                    />
                    <IconButton onClick={handleExport} color="primary">
                        <FileDownloadIcon />
                    </IconButton>
                </Box>
            </Paper>

            <Paper elevation={2}>
                <Tabs value={activeTab} onChange={handleTabChange} centered variant="fullWidth">
                    <Tab label="Consuntivo" />
                    <Tab label="Calendario" />
                </Tabs>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}>
                         <CircularProgress />
                    </Box>
                )}
                
                {!loading && (
                    <>
                        <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                           <ConsuntivoTable reports={enrichedAndFilteredReports} />
                        </Box>
                         <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                            <CalendarioView reports={enrichedAndFilteredReports} year={currentYear} month={currentMonth} />
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
}

export default ReportMensilePage;
