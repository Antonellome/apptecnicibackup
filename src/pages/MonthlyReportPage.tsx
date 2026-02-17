import React, { useState, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    TextField, 
    Grid, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    ListItemText,
    List,
    ListItem,
    Divider
} from '@mui/material';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { Rapportino, TipoGiornata, Tecnico, Nave, Luogo, Veicolo } from '@/models/definitions';

const getContrastTextColor = (hexColor: string | undefined): string => {
    if (!hexColor || hexColor === 'transparent') return '#000000';
    let color = hexColor.slice(1);
    if (color.length === 3) {
        color = color.split('').map(char => char + char).join('');
    }
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    if (yiq > 220) return '#000000';
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    const s = 80; 
    const l = 60;
    const h_l = l / 100;
    const a = (s * Math.min(h_l, 1 - h_l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = h_l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const MonthlyReportPage: React.FC = () => {
    const now = new Date();
    // CIAO: Eseguo l'ordine. Aggiungo tutti i dati necessari dal contesto globale.
    const { rapportini, tipiGiornata, tecnici, navi, luoghi, veicoli, loading } = useGlobalData();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedReport, setSelectedReport] = useState<Rapportino | null>(null);

    // CIAO: Mappe di ricerca per la conversione ID -> Nome.
    const tipiGiornataMapById = useMemo(() => {
        const processedTipi = tipiGiornata.map(tipo => {
            if (!tipo.colore || tipo.colore.toLowerCase() === '#ffffff') {
                return { ...tipo, colore: stringToColor(tipo.nome) };
            }
            return tipo;
        });
        return new Map(processedTipi.map(t => [t.id, t]));
    }, [tipiGiornata]);

    const tecniciMapById = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);
    const naviMapById = useMemo(() => new Map(navi.map(n => [n.id, n])), [navi]);
    const luoghiMapById = useMemo(() => new Map(luoghi.map(l => [l.id, l])), [luoghi]);
    const veicoliMapById = useMemo(() => new Map(veicoli.map(v => [v.id, v])), [veicoli]);

    // CIAO: Funzioni per risolvere gli ID e ottenere dati leggibili.
    const getTipoGiornataInfo = (id: string): TipoGiornata | undefined => tipiGiornataMapById.get(id);
    const getTecnicoName = (id: string): string => {
        const tecnico = tecniciMapById.get(id);
        return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'N/D';
    };
    const getNaveName = (id: string): string => naviMapById.get(id)?.nome || 'N/D';
    const getLuogoName = (id: string): string => luoghiMapById.get(id)?.nome || 'N/D';
    const getVeicoloName = (id: string): string => veicoliMapById.get(id)?.targa || 'N/D';

    const filteredReports = useMemo(() => {
        return rapportini.filter(report => {
            const reportDate = report.data.toDate();
            return reportDate.getMonth() + 1 === selectedMonth && reportDate.getFullYear() === selectedYear;
        });
    }, [rapportini, selectedMonth, selectedYear]);

    const reportSummary = useMemo(() => {
        const totalsPerType = filteredReports.reduce((acc, report) => {
            const tipoInfo = getTipoGiornataInfo(report.tipoGiornataId);
            if (tipoInfo) {
                const nome = tipoInfo.nome;
                acc[nome] = (acc[nome] || 0) + (report.oreLavoro || 0);
            }
            return acc;
        }, {} as Record<string, number>);

        const summary = Object.entries(totalsPerType).map(([tipoNome, totalOre]) => {
            const tipoInfo = Array.from(tipiGiornataMapById.values()).find(t => t.nome === tipoNome);
            const tariffa = tipoInfo?.costoOrario ?? 0;
            const guadagno = totalOre * tariffa;
            return { tipo: tipoNome, ore: totalOre, guadagno };
        }).filter(item => item.ore > 0);

        const grandTotalOre = summary.reduce((sum, item) => sum + item.ore, 0);
        const grandTotalGuadagno = summary.reduce((sum, item) => sum + item.guadagno, 0);
        return { summary, grandTotalOre, grandTotalGuadagno };
    }, [filteredReports, tipiGiornataMapById]);

    const years = useMemo(() => {
        if (rapportini.length === 0) return [now.getFullYear()];
        const minYear = Math.min(...rapportini.map(r => r.data.toDate().getFullYear()));
        const maxYear = Math.max(...rapportini.map(r => r.data.toDate().getFullYear()));
        return Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
    }, [rapportini]);

    const handleOpenReport = (report: Rapportino) => setSelectedReport(report);
    const handleCloseReport = () => setSelectedReport(null);

    const generateCalendarDays = (month: number, year: number) => {
        const date = new Date(year, month - 1, 1);
        const days = [];
        const firstDayOfWeek = (date.getDay() + 6) % 7; 
        for (let i = 0; i < firstDayOfWeek; i++) days.push({ key: `empty-${i}`, day: null, report: null });
        while (date.getMonth() === month - 1) {
            const currentDate = new Date(date);
            const report = filteredReports.find(r => r.data.toDate().toDateString() === currentDate.toDateString());
            days.push({ key: currentDate.toISOString(), day: currentDate.getDate(), report });
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const calendarDays = generateCalendarDays(selectedMonth, selectedYear);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" gutterBottom>Report Mensile</Typography>
            <Paper elevation={3} sx={{ p: 2, mb: 4, display: 'flex', gap: 2 }}>
                <TextField select label="Mese" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} SelectProps={{ native: true }} sx={{ flex: 1 }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>)}
                </TextField>
                <TextField select label="Anno" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} SelectProps={{ native: true }} sx={{ flex: 1 }}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </TextField>
            </Paper>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}> 
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Riepilogo del Mese</Typography>
                        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead><TableRow><TableCell sx={{fontWeight: 'bold'}}>Tipo Giornata</TableCell><TableCell align="right" sx={{fontWeight: 'bold'}}>Ore Totali</TableCell><TableCell align="right" sx={{fontWeight: 'bold'}}>Guadagno</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {reportSummary.summary.map(({ tipo, ore, guadagno }) => (
                                        <TableRow key={tipo}><TableCell>{tipo}</TableCell><TableCell align="right">{ore}</TableCell><TableCell align="right">{guadagno.toFixed(2)} €</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#000000', color: '#FFFFFF', borderRadius: 1 }}>
                            <Typography variant="h6" sx={{ color: 'inherit' }}>Totali Complessivi</Typography>
                            <Typography sx={{ color: 'inherit' }}><b>Gran Totale Ore:</b> {reportSummary.grandTotalOre}</Typography>
                            <Typography sx={{ color: 'inherit' }}><b>Gran Totale Guadagno:</b> {reportSummary.grandTotalGuadagno.toFixed(2)} €</Typography>
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Elenco Report Giornalieri</Typography>
                        <TableContainer sx={{ maxHeight: 220 }}>
                           <Table size="small" stickyHeader>
                                <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Ore</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {filteredReports.map((report) => (
                                        <TableRow key={report.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpenReport(report)}>
                                            <TableCell>{report.data.toDate().toLocaleDateString('it-IT')}</TableCell>
                                            <TableCell>{getTipoGiornataInfo(report.tipoGiornataId)?.nome || 'N/D'}</TableCell>
                                            <TableCell align="right">{report.oreLavoro}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Calendario</Typography>
                        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
                            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => <Typography key={day} align="center" variant="caption" sx={{ fontWeight: 'bold' }}>{day}</Typography>)}
                            {calendarDays.map(({ key, day, report }) => {
                                let dayBackgroundColor = 'transparent';
                                let dayTextColor = '#000000';
                                if (report) {
                                    const tipoInfo = getTipoGiornataInfo(report.tipoGiornataId); 
                                    if (tipoInfo && tipoInfo.colore) dayBackgroundColor = tipoInfo.colore;
                                }
                                dayTextColor = getContrastTextColor(dayBackgroundColor);
                                return (
                                <Box key={key} onClick={() => report && handleOpenReport(report)} sx={{
                                    aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px',
                                    backgroundColor: dayBackgroundColor, color: dayTextColor, border: '1px solid', 
                                    borderColor: 'divider', cursor: report ? 'pointer' : 'default'
                                }}>
                                    <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 'bold' }}>{day}</Typography>
                                </Box>
                                );
                            })}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
                <Typography variant="h6" gutterBottom>Legenda Colori</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {Array.from(tipiGiornataMapById.values()).sort((a,b) => a.nome.localeCompare(b.nome)).map(tipo => (
                        <Box key={tipo.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 20, height: 20, backgroundColor: tipo.colore, borderRadius: '4px', border: '1px solid grey' }} />
                            <Typography variant="body2">{tipo.nome}</Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>
            
            {/* CIAO: Ho sostituito i codici con i nomi leggibili come ordinato. */}
            <Dialog open={!!selectedReport} onClose={handleCloseReport} fullWidth maxWidth="sm">
                <DialogTitle>Dettaglio Report - {selectedReport?.data.toDate().toLocaleDateString('it-IT')}</DialogTitle>
                <DialogContent dividers>
                    {selectedReport && (
                        <List dense>
                            <ListItem><ListItemText primary="Tecnico" secondary={getTecnicoName(selectedReport.tecnicoId)} /></ListItem>
                            <ListItem><ListItemText primary="Data" secondary={selectedReport.data.toDate().toLocaleDateString('it-IT')} /></ListItem>
                            <ListItem><ListItemText primary="Tipo Giornata" secondary={getTipoGiornataInfo(selectedReport.tipoGiornataId)?.nome || 'N/D'} /></ListItem>
                            <ListItem><ListItemText primary="Ore Lavorate" secondary={selectedReport.oreLavoro} /></ListItem>
                            <ListItem><ListItemText primary="Luogo" secondary={getLuogoName(selectedReport.luogoId)} /></ListItem>
                            <ListItem><ListItemText primary="Nave" secondary={getNaveName(selectedReport.naveId)} /></ListItem>
                            <ListItem><ListItemText primary="Descrizione" secondary={selectedReport.descrizioneBreve} /></ListItem>
                            <ListItem><ListItemText primary="Lavoro Eseguito" secondary={selectedReport.lavoroEseguito} /></ListItem>
                            <ListItem><ListItemText primary="Materiali Usati" secondary={selectedReport.materialiImpiegati} /></ListItem>
                            <ListItem><ListItemText primary="Veicolo" secondary={getVeicoloName(selectedReport.veicoloId)} /></ListItem>
                        </List>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleCloseReport}>Chiudi</Button></DialogActions>
            </Dialog>
        </Box>
    );
}

export default MonthlyReportPage;
