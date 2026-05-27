
import { useState, useEffect, useReducer, useMemo } from 'react';
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
import { Lock as LockIcon, SyncProblem as SyncProblemIcon } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/services/localDatabase'; // <-- Import corretto
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { Rapportino, EnrichedRapportino, Tecnico, SyncEvent } from '@/models/definitions';


// --- STATE MANAGEMENT CON useReducer ---
interface ReportListState {
    onlineRapportini: EnrichedRapportino[];
    loading: boolean;
    error: string | null;
}

type Action = 
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: EnrichedRapportino[] }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean };

const initialState: ReportListState = {
    onlineRapportini: [],
    loading: true,
    error: null,
};

function reportListReducer(state: ReportListState, action: Action): ReportListState {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, onlineRapportini: action.payload, error: null };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
}

// Funzione per arricchire i rapportini (sia online che offline)
const enrichRapportino = (rapportino: Rapportino, masterData: any, userProfile: any): EnrichedRapportino => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t: any) => [t.id, t]));
    const naviMap = new Map(masterData.navi.map((n: any) => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map((l: any) => [l.id, l.nome]));

    const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data);
    const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId) || { id: '', nome: 'Non Definito', colore: '', sigla: '' };
    const destinazione = rapportino.naveId ? naviMap.get(rapportino.naveId) : (rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : 'Nessuna');

    let isEditable = false;
    if (userProfile?.isAdmin) { 
        isEditable = true;
    } else {
        const reportMonth = startOfMonth(reportDate);
        const currentActiveMonth = startOfMonth(new Date());
        const previousMonth = startOfMonth(subMonths(new Date(), 1));
        if (isSameMonth(reportMonth, currentActiveMonth) || (isSameMonth(reportMonth, previousMonth) && new Date().getDate() <= 10)) {
            isEditable = true;
        }
    }
    
    return {
        ...rapportino,
        id: rapportino.id,
        data: reportDate,
        isEditable: isEditable,
        tipoGiornata: tipoGiornata,
        destinazione: destinazione || 'Non trovato',
        isOffline: (rapportino as any).isOffline || false, // Aggiungiamo il flag
    } as EnrichedRapportino;
};

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { data: masterData, loading: masterDataLoading } = useLocalData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [state, dispatch] = useReducer(reportListReducer, initialState);
  const { onlineRapportini, loading, error } = state;

  const offlineSyncEvents = useLiveQuery(() => 
      localDb.syncQueue
          .where('type')
          .equals('rapportino')
          .toArray(),
      [], 
      []
  ) as SyncEvent[];

  const offlineRapportini = useMemo(() => {
      if (!masterData || !userProfile) return [];

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      return offlineSyncEvents
          .map(event => event.payload as Rapportino)
          .filter(rapportino => {
              const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data);
              return reportDate >= start && reportDate <= end && rapportino.tecnicoId === userProfile.tecnicoId;
          })
          .map(rapportino => enrichRapportino({ ...rapportino, isOffline: true }, masterData, userProfile));
  }, [offlineSyncEvents, masterData, userProfile, currentMonth]);

  useEffect(() => {
    if (!userProfile || masterDataLoading) {
        if (!masterDataLoading) dispatch({ type: 'SET_LOADING', payload: false });
        return;
    }

    if (!masterData) {
        dispatch({ type: 'FETCH_ERROR', payload: "Dati anagrafici non disponibili. Sincronizzazione in corso o fallita." });
        return;
    }

    dispatch({ type: 'FETCH_START' });

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = query(
      collection(firestoreDb, "rapportini"), 
      where("tecnicoId", "==", userProfile.tecnicoId),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            return enrichRapportino({ ...data, id: doc.id }, masterData, userProfile);
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: enrichedData });
      } catch(e) {
          console.error("Errore durante l'elaborazione dei rapportini: ", e);
          dispatch({ type: 'FETCH_ERROR', payload: "Impossibile elaborare i dati dei rapportini." });
      }
    }, (err) => {
      console.error("Errore nel listener di Firestore: ", err);
      dispatch({ type: 'FETCH_ERROR', payload: "Impossibile caricare i rapportini in tempo reale." });
    });

    return () => unsubscribe();
  }, [userProfile, masterDataLoading, masterData, currentMonth]);

  const combinedRapportini = useMemo(() => {
    // Combina e rimuovi duplicati (i report offline vengono rimossi se la loro versione online è presente)
    const onlineIds = new Set(onlineRapportini.map(r => r.id));
    const uniqueOffline = offlineRapportini.filter(r => !onlineIds.has(r.id));
    
    const all = [...onlineRapportini, ...uniqueOffline];
    all.sort((a, b) => (b.data as Date).getTime() - (a.data as Date).getTime());
    return all;
  }, [onlineRapportini, offlineRapportini]);
  
  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const handleReportClick = (report: EnrichedRapportino) => {
    const path = report.isOffline ? `/report/edit-offline/${report.id}` : `/report/edit/${report.id}`;
    navigate(path);
  };

  const today = new Date();
  const isNextButtonDisabled = isSameMonth(currentMonth, today);

  const isLoading = loading || masterDataLoading;

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
              icon={<SyncProblemIcon />}
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
      
      {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}>
              <CircularProgress />
          </Box>
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!isLoading && !error && (
        <Paper elevation={3} sx={{ mt: 2 }}>
          <List disablePadding>
            {combinedRapportini.length > 0 ? (
              combinedRapportini.map((report, index) => (
                  <Box key={report.id}>
                    <ListItem 
                        component={report.isEditable ? ListItemButton : 'div'}
                        onClick={() => report.isEditable && handleReportClick(report)}
                        sx={{ opacity: report.isEditable ? 1 : 0.7 }}
                        secondaryAction={
                           <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                {report.isOffline && <Chip label="In coda" size="small" color="info" />}
                                {report.isEditable ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {report.tipoGiornata.nome}
                                    </Typography>
                                ) : (
                                    <IconButton edge="end" aria-label="locked" disabled>
                                        <LockIcon />
                                    </IconButton>
                                )}
                           </Box>
                        }
                    >
                      <ListItemText 
                        primaryTypographyProps={{ fontWeight: '500' }}
                        secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                        primary={
                            <Typography variant="subtitle1" component="span">
                                {report.descrizioneBreve || report.destinazione}
                            </Typography>
                        }
                        secondary={`Data: ${format(report.data, 'dd/MM/yyyy', { locale: it })} - Ore: ${(() => {
                            if (!userProfile) return 'N/A';
                            const userOreDetail = (report.dettaglioOreTecnici || []).find(d => d.tecnicoId === userProfile.tecnicoId); 
                            return userOreDetail ? (userOreDetail.ore || 0).toFixed(2) : 'N/A';
                        })()}`}
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
