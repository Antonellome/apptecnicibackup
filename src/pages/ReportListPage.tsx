import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Chip
} from '@mui/material';
import { Cloud, CloudQueue, Sync, WifiOff } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';

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
  const [syncState, setSyncState] = useState({ loading: false, error: null as string | null });
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
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

  const syncEngine = useCallback(async () => {
    if (!isOnline || !userProfile?.tecnicoId) {
      setSyncState({ loading: false, error: isOnline ? "Profilo utente non caricato." : "Sei offline. I dati non possono essere sincronizzati." });
      return () => {}; // No-op cleanup
    }
    
    setSyncState({ loading: true, error: null });

    const rapportiniQuery = query(
        collection(firestoreDb, "rapportini"),
        where("tecnicoId", "==", userProfile.tecnicoId),
        orderBy("data", "desc")
    );

    if (!initialSyncComplete) {
      try {
        const initialSnapshot = await getDocs(rapportiniQuery);
        const initialPuts = initialSnapshot.docs.map(doc => {
            const data = doc.data();
            const date = data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data as any);
            return { id: doc.id, ...data, data: date, isOffline: false } as Rapportino;
        });

        await localDb.transaction('rw', localDb.rapportini, async () => {
            await localDb.rapportini.bulkPut(initialPuts);
        });
        
        console.log(`INITIAL_SYNC: ${initialPuts.length} reports successfully loaded into local DB.`);
        setInitialSyncComplete(true);

      } catch (err: any) {
        console.error("INITIAL_SYNC_FAILED: ", err);
        setSyncState({ loading: false, error: `Errore nel caricamento iniziale: ${err.message}` });
        return () => {};
      }
    }

    const unsubscribe = onSnapshot(rapportiniQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        if (changes.length === 0) {
            setSyncState({ loading: false, error: null });
            return;
        }

        const puts: Rapportino[] = [];
        const deletes: string[] = [];

        for (const change of changes) {
            if (change.type === 'removed') {
                deletes.push(change.doc.id);
            } else { 
                const data = change.doc.data();
                const date = data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data as any);
                puts.push({ id: change.doc.id, ...data, data: date, isOffline: false } as Rapportino);
            }
        }
        
        localDb.transaction('rw', localDb.rapportini, async () => {
          if (puts.length > 0) await localDb.rapportini.bulkPut(puts);
          if (deletes.length > 0) await localDb.rapportini.bulkDelete(deletes);
        }).then(() => {
          setSyncState({ loading: false, error: null });
        }).catch(err => {
          console.error("DEXIE_TRANSACTION_FAILED: ", err);
          setSyncState({ loading: false, error: `Errore nell'aggiornamento locale: ${err.message}` });
        });

    }, (err) => {
        console.error("FIRESTORE_SNAPSHOT_ERROR: ", err);
        setSyncState({ loading: false, error: `Sincronizzazione fallita. Visualizzando dati locali.` });
    });

    return () => unsubscribe();
  }, [userProfile, isOnline, initialSyncComplete]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const runSync = async () => {
        const unsub = await syncEngine();
        if (unsub) {
            cleanup = unsub;
        }
    };

    runSync();

    return () => {
        if (cleanup) {
            cleanup();
        }
    };
}, [syncEngine]);


  const rapportiniDelMese = useLiveQuery(async () => {
    if (!userProfile?.tecnicoId) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const reportsInMonth = await localDb.rapportini
      .where('data')
      .between(start, end, true, true)
      .toArray();

    const userReports = reportsInMonth.filter(r => r.tecnicoId === userProfile.tecnicoId);
    userReports.sort((a, b) => b.data.getTime() - a.data.getTime());
    return userReports;
  }, [currentMonth, userProfile]);

  const offlineSyncEventsCount = useLiveQuery(() => localDb.syncQueue.where('type').equals('rapportino').count(), []);

  const displayedRapportini = useMemo(() => {
    if (!masterData || !userProfile || !rapportiniDelMese) return [];
    return rapportiniDelMese.map(r => enrichRapportino(r, masterData));
  }, [rapportiniDelMese, masterData, userProfile]);

  const isLoading = masterDataLoading || rapportiniDelMese === undefined;

  if (isLoading && !initialSyncComplete) {
      return <FullScreenLoader />;
  }

  if (masterDataError) {
      return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{masterDataError}</Alert></Box>;
  }

  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const handleReportClick = (report: { id: string, isOffline?: boolean }) => {
    const path = report.id.startsWith('local-') ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  const renderOre = (report: Omit<EnrichedRapportino, 'isClickable'>) => {
    if (report.oraInizio && report.oraFine) {
        return `${report.oraInizio} - ${report.oraFine} (P: ${report.pausa || 0}m)`;
    }
    if (report.oreLavoro) {
        return `Totale: ${report.oreLavoro}h`;
    }
    return 'Orario non spec.';
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>Nuovo</Button>
      </Box>

      {syncState.loading && <Chip icon={<Sync />} label="Sincronizzazione in corso..." color="info" sx={{ mb: 2, width: '100%' }} />}
      {!isOnline && <Alert severity="warning" icon={<WifiOff/>} sx={{ mb: 2 }}>Sei offline. Le modifiche saranno sincronizzate appena tornerà la connessione.</Alert>}
      {syncState.error && isOnline && <Alert severity="warning" sx={{ mb: 2 }}>{syncState.error}</Alert>}
      {offlineSyncEventsCount > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEventsCount} ${offlineSyncEventsCount > 1 ? 'report in attesa' : 'report in attesa'}`} color="warning" sx={{ mb: 2, width: '100%' }}/>}

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isSameMonth(currentMonth, new Date())}>Mese Succ.</Button>
      </Paper>
      
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {(displayedRapportini && displayedRapportini.length > 0) ? (
            displayedRapportini.map((report, index) => {
              const nextReport = displayedRapportini[index + 1];
              const isLastOfDate = !nextReport || !isSameDay(report.data, nextReport.data);

              return (
              <Box key={report.id}> 
                <ListItemButton onClick={() => handleReportClick(report)} sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Sinistra */}
                        <Box sx={{ flex: '0 0 25%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>{report.naveNome || report.luogoNome || 'N/D'}</Typography>
                            <Typography variant="body2" color="text.secondary">{format(report.data, 'dd/MM/yyyy', { locale: it })}</Typography>
                        </Box>

                        {/* Centro */}
                        <Box sx={{ flex: '1 1 auto', px: 2, overflow: 'hidden' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }} noWrap>
                                {report.descrizioneBreve || 'Nessuna descrizione'}
                            </Typography>
                        </Box>

                        {/* Destra */}
                        <Box sx={{ flex: '0 0 30%', textAlign: 'right' }}>
                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1}}>
                                {report.isOffline && <Chip icon={<Cloud />} label="Locale" size="small" color="info" variant="outlined" />}
                                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    {report.tipoGiornata?.nome}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {renderOre(report)}
                            </Typography>
                        </Box>
                    </Box>
                </ListItemButton>
                {index < displayedRapportini.length - 1 && (
                  <Divider 
                    component="li" 
                    sx={{ 
                      backgroundColor: isLastOfDate ? 'primary.main' : undefined,
                      height: isLastOfDate ? '3px' : '1px',
                      opacity: isLastOfDate ? 0.5 : 1
                    }} 
                  />
                )}
              </Box>
              )
            })
          ) : (
            (rapportiniDelMese && rapportiniDelMese.length === 0 && !syncState.loading) && (
              <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
                Nessun report trovato per il mese selezionato.
              </Typography>
            )
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default ReportListPage;
