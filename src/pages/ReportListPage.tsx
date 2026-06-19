
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  Button,
  Alert,
  Paper,
  ListItemButton,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import { Cloud, WifiOff, CloudQueue } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';

// Funzione helper per arricchire i dati del rapportino con le anagrafiche
const enrichRapportino = (rapportino: Rapportino, masterData: MasterData): Omit<EnrichedRapportino, 'isClickable'> => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
    const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
    const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data as any);
    const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId!) || { id: '', nome: 'N/D', colore: '', sigla: '' };
    
    return {
        ...rapportino,
        id: rapportino.id,
        data: reportDate,
        tipoGiornata: tipoGiornata,
        naveNome: rapportino.naveId ? naviMap.get(rapportino.naveId) : undefined,
        luogoNome: rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : undefined,
        isOffline: rapportino.isOffline || false,
        isEditable: true, 
    } as Omit<EnrichedRapportino, 'isClickable'>;
};

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitora lo stato della connessione
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Unica fonte di verità: il database locale interrogato da Dexie
  const rapportiniDelMese = useLiveQuery(() => {
    if (!userProfile?.tecnicoId) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return localDb.rapportini
      .where('[tecnicoId+data]')
      .between([userProfile.tecnicoId, start], [userProfile.tecnicoId, end])
      .reverse()
      .toArray();
  }, [currentMonth, userProfile?.tecnicoId]);

  // Conteggio degli elementi in coda di sincronizzazione
  const offlineSyncEventsCount = useLiveQuery(() => localDb.syncQueue.where('type').equals('rapportino').count(), []);

  // Memoizza i dati arricchiti per evitare ricalcoli
  const displayedRapportini = useMemo(() => {
    if (!masterData || !rapportiniDelMese) return [];
    return rapportiniDelMese.map(r => enrichRapportino(r, masterData));
  }, [rapportiniDelMese, masterData]);

  // Stato di caricamento unificato
  const isLoading = masterDataLoading || rapportiniDelMese === undefined;

  if (isLoading) {
      return <FullScreenLoader />;
  }

  if (masterDataError) {
      return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{masterDataError.message}</Alert></Box>;
  }

  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const handleReportClick = (report: { id: string }) => {
    const path = report.id.startsWith('local-') ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>Nuovo</Button>
      </Box>

      {!isOnline && <Alert severity="warning" icon={<WifiOff/>} sx={{ mb: 2 }}>Sei offline. Le modifiche saranno sincronizzate appena tornerà la connessione.</Alert>}
      {(offlineSyncEventsCount ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEventsCount} ${offlineSyncEventsCount === 1 ? 'report in attesa' : 'report in attesa'}`} color="warning" sx={{ mb: 2, width: '100%' }}/>}

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isSameMonth(currentMonth, new Date())}>Mese Succ.</Button>
      </Paper>
      
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {isLoading ? (
            <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>
          ) : displayedRapportini && displayedRapportini.length > 0 ? (
            displayedRapportini.map((report, index) => (
              <Box key={report.id}> 
                <ListItemButton onClick={() => handleReportClick(report)} sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: '0 0 25%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>{report.naveNome || report.luogoNome || 'N/D'}</Typography>
                            <Typography variant="body2" color="text.secondary">{format(report.data, 'dd/MM/yyyy', { locale: it })}</Typography>
                        </Box>

                        <Box sx={{ flex: '1 1 auto', px: 2, overflow: 'hidden' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }} noWrap>
                                {report.descrizioneBreve || 'Nessuna descrizione'}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: '0 0 30%', textAlign: 'right' }}>
                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1}}>
                                {report.isOffline && <Chip icon={<Cloud />} label="Locale" size="small" color="info" variant="outlined" />}
                                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    {report.tipoGiornata?.nome}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </ListItemButton>
                {index < displayedRapportini.length - 1 && (
                  <Divider component="li" />
                )}
              </Box>
            ))
          ) : (
            <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
              Nessun report trovato per il mese selezionato.
            </Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default ReportListPage;
