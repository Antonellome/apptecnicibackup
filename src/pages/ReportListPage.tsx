
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Paper,
  ListItemButton,
  Divider,
  IconButton,
  Chip
} from '@mui/material';
import { Lock as LockIcon, CloudQueue } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, SyncEvent, MasterData } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';


const enrichRapportino = (rapportino: Partial<Rapportino> & { id: string, isOffline?: boolean }, masterData: MasterData, userProfile: any): EnrichedRapportino => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
    const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));

    const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data as any);
    const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId!) || { id: '', nome: 'N/D', colore: '', sigla: '' };
    const destinazione = rapportino.naveId ? naviMap.get(rapportino.naveId) : (rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : 'Nessuna');

    let isClickable = false;
    if (rapportino.isOffline) {
        isClickable = true; // Offline reports are always clickable to view
    } else if (userProfile?.tecnicoId === rapportino.tecnicoId) {
        // Logic for online reports
        const reportMonth = startOfMonth(reportDate);
        const currentActiveMonth = startOfMonth(new Date());
        const previousMonth = startOfMonth(subMonths(new Date(), 1));
        if (isSameMonth(reportMonth, currentActiveMonth) || (isSameMonth(reportMonth, previousMonth) && new Date().getDate() <= 10)) {
            isClickable = true;
        }
    }
    
    return {
        ...rapportino,
        id: rapportino.id,
        data: reportDate,
        isClickable: isClickable,
        tipoGiornata: tipoGiornata,
        destinazione: destinazione || 'N/D',
        isOffline: rapportino.isOffline || false,
    } as EnrichedRapportino;
};

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [rapportini, setRapportini] = useState<Rapportino[]>([]); // Usa il tipo base, non arricchito
  const [rapportiniLoading, setRapportiniLoading] = useState<boolean>(true);
  const [rapportiniError, setRapportiniError] = useState<string | null>(null);

  const offlineSyncEvents = useLiveQuery(() => 
      localDb.syncQueue.where('type').equals('rapportino').toArray(),
      [], 
      []
  ) as SyncEvent[];

  useEffect(() => {
    if (masterDataLoading || !masterData || !userProfile) return;

    setRapportiniLoading(true);
    setRapportiniError(null);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = query(
      collection(firestoreDb, "rapportini"), 
      where("presenze", "array-contains", userProfile.tecnicoId),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const firestoreData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Normalizza i dati per Dexie: assicurati che `data` sia un oggetto Date
            return { 
                ...data,
                id: doc.id,
                data: (data.data as Timestamp).toDate(),
            } as Rapportino;
        });
        setRapportini(firestoreData);

        // <<< SINCRONIZZAZIONE PASSIVA NEL DATABASE LOCALE >>>
        if (firestoreData.length > 0) {
            console.log(`Syncing ${firestoreData.length} reports to local DB...`);
            localDb.rapportini.bulkPut(firestoreData).catch(err => {
                console.error("Errore durante la sincronizzazione passiva dei rapportini:", err);
            });
        }

      } catch(e) {
          console.error("Errore durante l'elaborazione dei rapportini: ", e);
          setRapportiniError("Impossibile elaborare i dati dei rapportini.");
      }
      setRapportiniLoading(false);
    }, (err) => {
      console.error("Errore nel listener di Firestore: ", err);
      setRapportiniError("Impossibile caricare i rapportini in tempo reale.");
      setRapportiniLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, masterData, masterDataLoading, currentMonth]);

  const enrichedRapportini = useMemo(() => {
      if (!masterData || !userProfile) return [];
      return rapportini.map(r => enrichRapportino(r, masterData, userProfile));
  }, [rapportini, masterData, userProfile]);

  const offlineRapportini = useMemo(() => {
      if (!masterData || !userProfile) return [];
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      return offlineSyncEvents
          .map(event => {
              const rapportinoPayload = event.payload as Rapportino;
              const rapportinoDate = rapportinoPayload.data instanceof Timestamp ? rapportinoPayload.data.toDate() : new Date(rapportinoPayload.data as any);
              
              if (rapportinoDate >= start && rapportinoDate <= end && (rapportinoPayload.presenze || []).includes(userProfile.tecnicoId)) {
                  // Arricchisce il rapportino offline per la visualizzazione
                  return enrichRapportino({ ...rapportinoPayload, id: event.entityId, isOffline: true }, masterData, userProfile);
              } 
              return null;
          })
          .filter((r): r is EnrichedRapportino => r !== null);
  }, [offlineSyncEvents, masterData, userProfile, currentMonth]);


  const combinedRapportini = useMemo(() => {
    const onlineIds = new Set(enrichedRapportini.map(r => r.id));
    const uniqueOffline = offlineRapportini.filter(r => !onlineIds.has(r.id));
    const all = [...enrichedRapportini, ...uniqueOffline];
    all.sort((a, b) => b.data.getTime() - a.data.getTime());
    return all;
  }, [enrichedRapportini, offlineRapportini]);

  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const handleReportClick = (report: EnrichedRapportino) => {
    if (!report.isClickable) return;
    const path = report.isOffline ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  if (masterDataLoading) {
      return <FullScreenLoader message="Caricamento dati anagrafici..." />;
  }

  if (masterDataError) {
      return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="error">Errore critico nel caricamento dei dati anagrafici.</Alert>
          </Box>
      );
  }

  const isNextButtonDisabled = isSameMonth(currentMonth, new Date());

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          I Miei Report
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>
          Nuovo
        </Button>
      </Box>

      {offlineSyncEvents.length > 0 && (
          <Chip 
              icon={<CloudQueue />}
              label={`${offlineSyncEvents.length} report in attesa di sincronizzazione`}
              color="warning"
              sx={{ mb: 2, width: '100%' }}
          />
      )}

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
      </Paper>
      
      {rapportiniLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>}

      {rapportiniError && <Alert severity="error">{rapportiniError}</Alert>}

      {!rapportiniLoading && !rapportiniError && (
        <Paper elevation={3} sx={{ mt: 2 }}>
          <List disablePadding>
            {combinedRapportini.length > 0 ? (
              combinedRapportini.map((report, index) => (
                <Box key={report.id}> 
                  <ListItem 
                      component={ListItemButton}
                      onClick={() => handleReportClick(report)}
                      disabled={!report.isClickable}
                      sx={{ opacity: report.isClickable ? 1 : 0.6 }}
                      secondaryAction={
                         <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                              {report.isOffline && <Chip label="In coda" size="small" color="info" variant="outlined" />}
                              <Chip label={report.tipoGiornata.nome} size="small" />
                              {!report.isClickable && !report.isOffline && (
                                  <LockIcon fontSize="small" color="disabled" />
                              )}
                         </Box>
                      }
                  >
                    <ListItemText 
                      primaryTypographyProps={{ fontWeight: '500' }}
                      secondaryTypographyProps={{ color: 'text.secondary' }}
                      primary={report.destinazione}
                      secondary={`Data: ${format(report.data, 'dd/MM/yyyy', { locale: it })}`}
                    />
                  </ListItem>
                  {index < combinedRapportini.length - 1 && <Divider component="li" />}
                </Box>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
                Nessun report trovato per il mese selezionato.
              </Typography>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReportListPage;
