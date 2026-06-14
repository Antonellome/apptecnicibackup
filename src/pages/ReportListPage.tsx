import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItemText,
  Button,
  Alert,
  Paper,
  ListItemButton,
  Divider,
  Chip
} from '@mui/material';
import { CloudQueue, Sync } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';

const enrichRapportino = (rapportino: Partial<Rapportino> & { id: string, isOffline?: boolean }, masterData: MasterData): Omit<EnrichedRapportino, 'isClickable'> => {
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
  const [syncState, setSyncState] = useState({ loading: true, error: null as string | null});

  useEffect(() => {
    if (!userProfile?.tecnicoId) {
      setSyncState({ loading: false, error: "Profilo utente non caricato." });
      return;
    }
    setSyncState({ loading: true, error: null });

    const rapportiniQuery = query(
        collection(firestoreDb, "rapportini"),
        where("presenze", "array-contains", userProfile.tecnicoId),
        orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(rapportiniQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        const puts: Rapportino[] = [];
        const deletes: string[] = [];

        for (const change of changes) {
            if (change.type === 'removed') {
                deletes.push(change.doc.id);
            } else {
                const data = change.doc.data();
                const date = data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data as any);
                puts.push({ id: change.doc.id, ...data, data: date } as Rapportino);
            }
        }
        
        if (puts.length > 0) {
            localDb.rapportini.bulkPut(puts);
        }
        if (deletes.length > 0) {
            localDb.rapportini.bulkDelete(deletes);
        }

        setSyncState({ loading: false, error: null });

    }, (err) => {
        console.error("Firestore Snapshot Error: ", err);
        setSyncState({ loading: false, error: `Errore di sincronizzazione: ${err.message}` });
    });

    return () => unsubscribe();
  }, [userProfile]);

  const localRapportini = useLiveQuery(async () => {
    if (!userProfile?.tecnicoId) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const reportsInMonth = await localDb.rapportini.where('data').between(start, end, true, true).toArray();
    const userReports = reportsInMonth.filter(r => r.presenze && r.presenze.includes(userProfile.tecnicoId));
    userReports.sort((a, b) => b.data.getTime() - a.data.getTime());
    return userReports;
  }, [currentMonth, userProfile]);

  const offlineSyncEvents = useLiveQuery(() => localDb.syncQueue.where('type').equals('rapportino').toArray(), []);

 const displayedRapportini = useMemo(() => {
    if (!masterData || !userProfile || !localRapportini || !offlineSyncEvents) return [];

    const enrichedLocal = localRapportini.map(r => enrichRapportino(r, masterData));
    const localIds = new Set(localRapportini.map(r => r.id));

    const offlineUnsynced = offlineSyncEvents
        .map(event => {
            const rapportinoPayload = event.payload as Rapportino;
            const rapportinoDate = rapportinoPayload.data instanceof Timestamp ? rapportinoPayload.data.toDate() : new Date(rapportinoPayload.data as any);
            if (isSameMonth(rapportinoDate, currentMonth) && !localIds.has(event.entityId)) {
                return enrichRapportino({ ...rapportinoPayload, id: event.entityId, isOffline: true }, masterData);
            }
            return null;
        })
        .filter((r): r is Omit<EnrichedRapportino, 'isClickable'> => r !== null);

    const all = [...enrichedLocal, ...offlineUnsynced];
    all.sort((a, b) => b.data.getTime() - a.data.getTime());
    return all;
}, [localRapportini, offlineSyncEvents, masterData, userProfile, currentMonth]);

  const isLoading = masterDataLoading || !userProfile || localRapportini === undefined || offlineSyncEvents === undefined;

  if (isLoading) {
      return <FullScreenLoader />;
  }

  if (masterDataError) {
      return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">Errore nel caricamento dei dati. Riprova più tardi.</Alert></Box>;
  }

  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const handleReportClick = (report: { id: string, isOffline?: boolean }) => {
    const path = report.isOffline ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  const renderOre = (report: Omit<EnrichedRapportino, 'isClickable'>) => {
    if (report.oraInizio && report.oraFine) {
        return `${report.oraInizio} - ${report.oraFine} (P: ${report.pausa || '0h'})`;
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
      {syncState.error && <Alert severity="warning" sx={{ mb: 2 }}>{syncState.error}</Alert>}
      {offlineSyncEvents && offlineSyncEvents.length > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEvents.length} report non sincronizzati`} color="warning" sx={{ mb: 2, width: '100%' }}/>}

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
                                {report.isOffline && <Chip label="Offline" size="small" color="info" variant="outlined" />}
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
                      height: isLastOfDate ? '2px' : '1px',
                      opacity: isLastOfDate ? 0.3 : 1
                    }} 
                  />
                )}
              </Box>
              )
            })
          ) : (
            !syncState.loading && (
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
