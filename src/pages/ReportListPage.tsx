
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
import { Cloud, WifiOff, CloudQueue } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';
import { rapportinoConverter } from '@/utils/converters';

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [latestReportDate, setLatestReportDate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const enrichRapportino = (rapportino: Rapportino, masterData: MasterData, tecnicoId: string): Omit<EnrichedRapportino, 'isClickable'> => {
      const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
      const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
      const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
      const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data as any);
      const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId!) || { id: '', nome: 'N/D', colore: '', sigla: '' };

      let oreDisplay = '';
      const dettaglioTecnico = rapportino.dettaglioOreTecnici.find(d => d.tecnicoId === tecnicoId);

      if (dettaglioTecnico) {
          if (dettaglioTecnico.isManual) {
              oreDisplay = `${dettaglioTecnico.ore}h`;
          } else {
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
          oreDisplay: oreDisplay
      } as Omit<EnrichedRapportino, 'isClickable'>;
  };

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

  useEffect(() => {
      if (!userProfile?.tecnicoId) return;

      let cancelled = false;

      const bootstrapReports = async () => {
        const localCount = await localDb.rapportini.where('tecnicoId').equals(userProfile.tecnicoId).count();

        if (localCount === 0 && isOnline) {
          const rapportiniRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
          const [creatiDaMe, presenti] = await Promise.all([
            getDocs(query(rapportiniRef, where('tecnicoId', '==', userProfile.tecnicoId))),
            getDocs(query(rapportiniRef, where('presenze', 'array-contains', userProfile.tecnicoId))),
          ]);

          const merged = new Map<string, Rapportino>();
          creatiDaMe.forEach(docSnap => merged.set(docSnap.id, { ...docSnap.data(), id: docSnap.id }));
          presenti.forEach(docSnap => merged.set(docSnap.id, { ...docSnap.data(), id: docSnap.id }));

          const reportsToStore = Array.from(merged.values()).map(report => ({
            ...report,
            isOffline: report.isOffline || false,
          }));

          if (reportsToStore.length > 0) {
            await localDb.rapportini.bulkPut(reportsToStore);
          }

          const latestRemoteReport = reportsToStore.reduce<Rapportino | null>((latest, report) => {
            if (!latest) return report;
            const latestDate = latest.data instanceof Date ? latest.data : new Date(latest.data as any);
            const reportDate = report.data instanceof Date ? report.data : new Date(report.data as any);
            return reportDate > latestDate ? report : latest;
          }, null);

          if (!cancelled && latestRemoteReport) {
            const latestDate = latestRemoteReport.data instanceof Date ? latestRemoteReport.data : new Date(latestRemoteReport.data as any);
            setLatestReportDate(latestDate);
            setCurrentMonth(latestDate);
          }
          return;
        }

        const latestReport = await localDb.rapportini
          .where('tecnicoId').equals(userProfile.tecnicoId)
          .last();

        if (cancelled) return;

        if (latestReport) {
          const latestDate = latestReport.data instanceof Date ? latestReport.data : new Date(latestReport.data as any);
          setLatestReportDate(latestDate);
          setCurrentMonth(latestDate);
        } else {
          setCurrentMonth(null);
        }
      };

      bootstrapReports().catch(error => {
        console.error('Errore nel bootstrap dei rapportini locali:', error);
      });

      return () => {
        cancelled = true;
      };
    }, [userProfile?.tecnicoId, isOnline]);

  const rapportiniDelMese = useLiveQuery(() => {
    if (!userProfile?.tecnicoId || !currentMonth) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return localDb.rapportini
      .where('[tecnicoId+data]')
      .between([userProfile.tecnicoId, start], [userProfile.tecnicoId, end])
      .toArray();
  }, [currentMonth, userProfile?.tecnicoId]);

  const offlineSyncEventsCount = useLiveQuery(() => localDb.syncQueue.where('type').equals('rapportino').count(), []);

  const displayedRapportini = useMemo(() => {
    if (!masterData || !rapportiniDelMese || !userProfile?.tecnicoId) return [];
    const enriched = rapportiniDelMese.map(r => enrichRapportino(r, masterData, userProfile.tecnicoId));
    
    return enriched.sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
  }, [rapportiniDelMese, masterData, userProfile?.tecnicoId]);

  const isLoading = masterDataLoading || currentMonth === undefined;

  if (isLoading) {
      return <FullScreenLoader />;
  }

  if (masterDataError) {
      return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{masterDataError.message}</Alert></Box>;
  }

  const handleMonthChange = (increment: number) => {
      if (!currentMonth) return;
      setCurrentMonth(prev => new Date(prev!.getFullYear(), prev!.getMonth() + increment, 1));
  };

  const handleReportClick = (report: { id: string }) => {
    const path = report.id.startsWith('local-') ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  const isNextMonthDisabled = () => {
      if (!currentMonth || !latestReportDate) return true;
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      return isAfter(nextMonth, latestReportDate);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>Nuovo</Button>
      </Box>

      {!isOnline && <Alert severity="warning" icon={<WifiOff/>} sx={{ mb: 2 }}>Sei offline...</Alert>}
      {(offlineSyncEventsCount ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEventsCount} in attesa`} color="warning" sx={{ mb: 2, width: '100%' }}/>}

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{currentMonth ? format(currentMonth, 'MMMM yyyy', { locale: it }) : 'Nessun Report'}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextMonthDisabled()}>Mese Succ.</Button>
      </Paper>
      
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {(!rapportiniDelMese || rapportiniDelMese.length === 0) ? (
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
                                        {report.isOffline && <Chip icon={<Cloud />} label="Locale" size="small" color="info" variant="outlined" />}
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
