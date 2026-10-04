import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Grid, Button, Modal, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/hooks/useGlobalData';
import { calculateOfflineSummary, OfflineCalculationResult } from '@/services/dataPageCalculator'; 
import { Rapportino, MasterData } from '@/models/definitions';
import { v4 as uuidv4 } from 'uuid';
import { format, getWeek, startOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#333',
  border: '2px solid #007bff',
  boxShadow: 24,
  p: 4,
  color: 'white'
};

const DataPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { masterData, loading } = useGlobalData();
  const [open, setOpen] = useState(false);
  const [offlineData, setOfflineData] = useState<Rapportino[]>([]);
  const [modalData, setModalData] = useState({ tecnicoId: '', data: '', oraInizio: '', oraFine: '', tipoGiornataId: 't_ordinaria' });

  const handleOpen = () => {
      if (userProfile) setModalData({ tecnicoId: userProfile.tecnicoId, data: '', oraInizio: '', oraFine: '', tipoGiornataId: 't_ordinaria' });
      setOpen(true);
  };
  const handleClose = () => setOpen(false);
  const handleModalChange = (field: string, value: string) => setModalData({ ...modalData, [field]: value });
  const handleSave = () => {
    if (!modalData.data || !modalData.oraInizio || !modalData.oraFine || !modalData.tipoGiornataId || !modalData.tecnicoId) {
        console.error("Tutti i campi sono obbligatori");
        return;
    }
    const nuovoRapportino: Rapportino = {
        id: uuidv4(), data: modalData.data, tipoGiornataId: modalData.tipoGiornataId, isOffline: true, cliente: 'Offline', cantiere: 'Offline', attivita: 'Lavoro Offline', km: 0, 
        dettaglioOreTecnici: [{
             tecnicoId: modalData.tecnicoId, 
             oraInizio: modalData.oraInizio, 
             oraFine: modalData.oraFine, 
             pausa: 0 
        }],
    };
    setOfflineData([...offlineData, nuovoRapportino]);
    handleClose();
  };

  const processedData = useMemo(() => {
    if (loading || !userProfile || !masterData || offlineData.length === 0) return {};

    const groupedByMonth = offlineData.reduce((acc, item) => {
        const monthKey = format(startOfMonth(new Date(item.data)), 'yyyy-MM-dd');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(item);
        return acc;
    }, {} as Record<string, Rapportino[]>);

    const result: Record<string, OfflineCalculationResult & { weeklyTotals: Record<string, number> }> = {};

    for (const monthKey in groupedByMonth) {
        const monthRapp = groupedByMonth[monthKey];
        const calculationResult = calculateOfflineSummary(monthRapp, masterData, userProfile);
        
        const weeklyTotals: Record<string, number> = {};
        for(const date in calculationResult.weeklyData) {
            const weekNumber = getWeek(parseISO(date), { weekStartsOn: 1 });
            if (!weeklyTotals[weekNumber]) weeklyTotals[weekNumber] = 0;
            const dailyHours = Object.values(calculationResult.weeklyData[date]).reduce((sum, h) => sum + h, 0);
            weeklyTotals[weekNumber] += dailyHours;
        }

        result[monthKey] = { ...calculationResult, weeklyTotals };
    }
    return result;
  }, [offlineData, masterData, userProfile, loading]);

  const sortedMonths = Object.keys(processedData).sort().reverse();

  if (loading || !userProfile || !masterData) {
      return <Box sx={{textAlign: 'center', mt: 10, color: 'white'}}>Caricamento...</Box>
  }

  return (
    <Box sx={{ backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh', p: 3, pb: 15 }}>
      <Typography variant="h4" component="h1" sx={{ color: '#007bff', mb: 4, textAlign: 'center', fontWeight: 'bold' }}>
        Pagina Dati (Offline)
      </Typography>

        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
                <Typography variant="h6" component="h2" sx={{color: '#007bff'}}>Inserisci Record</Typography>
                <FormControl fullWidth sx={{ mt: 2 }}><InputLabel sx={{color: 'white'}}>Tecnico</InputLabel><Select value={modalData.tecnicoId} onChange={(e) => handleModalChange('tecnicoId', e.target.value)} label="Tecnico" sx={{color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#007bff' }}}>{masterData.tecnici.map(tech => <MenuItem key={tech.id} value={tech.id}>{tech.nome}</MenuItem>)}</Select></FormControl>
                <FormControl fullWidth sx={{ mt: 2 }}><InputLabel sx={{color: 'white'}}>Tipo</InputLabel><Select value={modalData.tipoGiornataId} onChange={(e) => handleModalChange('tipoGiornataId', e.target.value)} label="Tipo" sx={{color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#007bff' }}}><MenuItem value="t_ordinaria">Lavoro Ordinario</MenuItem><MenuItem value="t_ferie">Ferie</MenuItem><MenuItem value="t_permesso">Permesso</MenuItem><MenuItem value="t_malattia">Malattia</MenuItem></Select></FormControl>
                <TextField label="Data" type="date" fullWidth value={modalData.data} onChange={(e) => handleModalChange('data', e.target.value)} InputLabelProps={{ shrink: true, style: { color: 'white' } }} sx={{ mt: 2, input: { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#007bff' } }}/>
                <TextField label="Ora Inizio" type="time" fullWidth value={modalData.oraInizio} onChange={(e) => handleModalChange('oraInizio', e.target.value)} InputLabelProps={{ shrink: true, style: { color: 'white' } }} sx={{ mt: 2, input: { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#007bff' } }}/>
                <TextField label="Ora Fine" type="time" fullWidth value={modalData.oraFine} onChange={(e) => handleModalChange('oraFine', e.target.value)} InputLabelProps={{ shrink: true, style: { color: 'white' } }} sx={{ mt: 2, input: { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#007bff' } }}/>
                <Button variant="contained" onClick={handleSave} sx={{mt: 3, backgroundColor: '#007bff'}} fullWidth>Salva</Button>
            </Box>
        </Modal>

      {sortedMonths.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#333', color: 'white' }}>
              <Typography variant="h6">Nessun dato presente</Typography>
              <Button variant="outlined" onClick={handleOpen} sx={{borderColor: '#007bff', color: '#007bff', mt: 2}}>Aggiungi Record</Button>
          </Paper>
      ) : (
          sortedMonths.map((monthKey, monthIndex) => {
              const monthData = processedData[monthKey];
              const monthName = format(new Date(monthKey), 'MMMM yyyy', { locale: it });
              const sortedWeeks = Object.keys(monthData.weeklyTotals).sort((a,b) => parseInt(a) - parseInt(b));

              return (
                  <Box key={monthKey} sx={{ mb: 5 }}>
                      {monthIndex > 0 && <hr style={{ borderColor: '#007bff', borderWidth: '1px 0 0 0', margin: '40px 0' }} />}
                      <Typography variant="h5" component="h2" sx={{ color: '#007bff', mb: 3 }}>{monthName}</Typography>

                      <Paper elevation={3} sx={{ backgroundColor: '#333', p: 2, mb: 3 }}>
                          <Typography variant="h6" sx={{ color: '#007bff', mb: 2 }}>Riepilogo Settimanale</Typography>
                          <Grid container spacing={2}>
                              {sortedWeeks.map(weekNumber => (
                                  <Grid item xs={12} sm={6} md={3} key={weekNumber}>
                                      <Paper sx={{ p: 2, backgroundColor: '#444', textAlign: 'center' }}>
                                          <Typography>Settimana {weekNumber}</Typography>
                                          <Typography variant="h5" sx={{ color: 'white' }}>{monthData.weeklyTotals[weekNumber].toFixed(2)} ore</Typography>
                                      </Paper>
                                  </Grid>
                              ))}
                          </Grid>
                      </Paper>

                      <Paper elevation={3} sx={{ backgroundColor: '#333', p: 2, mb: 3 }}>
                          <Typography variant="h6" sx={{ color: '#007bff' }}>Dettaglio Categorie Ore</Typography>
                          <Box sx={{ p: 2, backgroundColor: '#444', mt: 1, borderRadius: 1 }}>
                              {Array.from(monthData.summary.dettaglio.values()).map(voce => (
                                  voce.oreTotali > 0 && (
                                      <Typography key={voce.id}>{voce.nome}: {voce.oreTotali.toFixed(2)} ore ({voce.giorni} {voce.unita === 'g' ? 'giorni' : 'occasioni'})</Typography>
                                  )
                              ))}
                          </Box>
                      </Paper>

                      <Paper elevation={3} sx={{ backgroundColor: '#333', p: 2 }}>
                          <Typography variant="h6" sx={{ color: '#007bff' }}>Cumulativo Mese</Typography>
                          <Box sx={{ p: 2, backgroundColor: '#444', mt: 1, borderRadius: 1 }}>
                              <Typography>Ore Ordinarie: {monthData.summary.oreOrdinarie.toFixed(2)}</Typography>
                              <Typography>Ore Straordinarie: {monthData.summary.oreStraordinarie.toFixed(2)}</Typography>
                              <Typography>Ore Totali Mese: {monthData.summary.oreTotali.toFixed(2)}</Typography>
                              <Typography>Costo Totale Stimato: {monthData.summary.costoTotale.toFixed(2)} €</Typography>
                          </Box>
                      </Paper>
                  </Box>
              );
          })
      )}

       <Button variant="outlined" onClick={handleOpen} sx={{borderColor: '#007bff', color: '#007bff', mt: 2, position: 'fixed', bottom: 16, right: 16, backgroundColor: '#1a1a1a'}}>
           Aggiungi
        </Button>
    </Box>
  );
};

export default DataPage;
