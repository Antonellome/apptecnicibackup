import { useState, useMemo, useEffect, Fragment } from 'react';
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
} from '@mui/material';
import { WifiOff, CloudQueue } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore'; // Rimosso import non usati
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';

// La funzione enrichRapportino è stata semplificata e resa più robusta
const enrichRapportino = (
  rapportino: Rapportino, 
  masterData: MasterData, 
  tecnicoId: string
): Omit<EnrichedRapportino, 'isClickable'> => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
    const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));

    const reportDate = rapportino.data instanceof Timestamp 
        ? rapportino.data.toDate() 
        : new Date(rapportino.data as any);

    const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId!) || { id: '', nome: 'N/D', colore: '', sigla: '' };

    let oreDisplay = '';
    const dettaglioTecnico = rapportino.dettaglioOreTecnici?.find(d => d.tecnicoId === tecnicoId);

    if (dettaglioTecnico) {
        if (dettaglioTecnico.isManual) {
            oreDisplay = `${dettaglioTecnico.ore}h`;
        } else if (dettaglioTecnico.oraInizio && dettaglioTecnico.oraFine) {
            oreDisplay = `${dettaglioTecnico.oraInizio}-${dettaglioTecnico.oraFine} (${dettaglioTecnico.pausa}p)`;
        }
    }

    return {
        ...rapportino,
        id: rapportino.id,
        data: reportDate,
        tipoGiornata: tipoGiornata,
        naveNome: rapportino.naveId ? naviMap.get(rapportino.naveId) : undefined,
        luogoNome: rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : undefined,
        isOffline: rapportino.isOffline || false,
        isEditable: true,
        oreDisplay: oreDisplay,
    } as Omit<EnrichedRapportino, 'isClickable'>;
};

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Query 1: Rapportini dove l'utente è il creatore
  const rapportiniCreati = useLiveQuery(() => {
    if (!userProfile?.tecnicoId || !currentMonth) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return localDb.rapportini
      .where('data').between(start, end)
      .filter(r => r.tecnicoId === userProfile.tecnicoId)
      .toArray();
  }, [currentMonth, userProfile?.tecnicoId]);

  // Query 2: Rapportini dove l'utente è un partecipante
  const rapportiniPartecipati = useLiveQuery(() => {
    if (!userProfile?.tecnicoId || !currentMonth) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return localDb.rapportini
        .where('data').between(start, end)
        .filter(r => r.dettaglioOreTecnici.some(d => d.tecnicoId === userProfile.tecnicoId))
        .toArray();
  }, [currentMonth, userProfile?.tecnicoId]);

  const offlineSyncEventsCount = useLiveQuery(() => localDb.syncQueue.where('type').equals('rapportino').count(), []);

  // Unisci e deduplica i risultati
  const allRapportini = useMemo(() => {
    if (!rapportiniCreati || !rapportiniPartecipati) return [];
    const rapportiniMap = new Map<string, Rapportino>();
    [...rapportiniCreati, ...rapportiniPartecipati].forEach(r => {
      rapportiniMap.set(r.id, r);
    });
    return Array.from(rapportiniMap.values());
  }, [rapportiniCreati, rapportiniPartecipati]);

  const displayedRapportini = useMemo(() => {
    if (!masterData || !allRapportini || !userProfile?.tecnicoId) return [];
    const enriched = allRapportini.map(r => enrichRapportino(r, masterData, userProfile.tecnicoId));
    return enriched.sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
  }, [allRapportini, masterData, userProfile?.tecnicoId]);

  const isLoading = masterDataLoading;

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

      {!isOnline && <Alert severity="warning" icon={<WifiOff/>} sx={{ mb: 2 }}>Sei offline...</Alert>}
      {(offlineSyncEventsCount ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEventsCount} in attesa di sincronizzazione`} color="warning" sx={{ mb: 2, width: '100%' }}/>}

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)}>Mese Succ.</Button>
      </Paper>
      
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {displayedRapportini.length === 0 ? (
            <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
              Nessun report trovato per il mese selezionato.
            </Typography>
          ) : (
            displayedRapportini.map((report, index) => {
                const prevReport = index > 0 ? displayedRapportini[index - 1] : null;
                const showDivider = index > 0;
                let isDateChanged = false;
                if (prevReport?.data && report.data) {
                    isDateChanged = report.data.getDate() !== prevReport.data.getDate() ||
                                    report.data.getMonth() !== prevReport.data.getMonth() ||
                                    report.data.getFullYear() !== prevReport.data.getFullYear();
                }

                return (
                    <Fragment key={report.id}>
                        {showDivider && (
                           <Divider component="li" sx={isDateChanged ? { borderBottomWidth: '2px', borderColor: 'primary.main' } : {}} />
                        )}
                        <ListItemButton onClick={() => handleReportClick(report)} sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ flex: '0 0 25%' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>{report.naveNome || report.luogoNome || 'N/D'}</Typography>
                                    <Typography variant="body2" color="text.secondary">{format(report.data, 'dd/MM/yyyy', { locale: it })}</Typography>
                                </Box>
                                <Box sx={{ flex: '1 1 auto', px: 2, overflow: 'hidden' }}>
                                    <Typography variant="body2" noWrap>{report.descrizioneBreve || ''}</Typography>
                                </Box>
                                <Box sx={{ flex: '0 0 30%', textAlign: 'right' }}>
                                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5}}>
                                        {report.isOffline && <Chip label="Da Sincronizzare" size="small" color="warning" variant="outlined" />}
                                        <Typography variant="body2" sx={{ fontWeight: '500' }}>{report.tipoGiornata?.nome}</Typography>
                                        {report.oreDisplay && <Typography variant="caption">{report.oreDisplay}</Typography>}
                                    </Box>
                                </Box>
                            </Box>
                        </ListItemButton>
                    </Fragment>
                );
            })
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default ReportListPage;
