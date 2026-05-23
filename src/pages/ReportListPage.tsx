
import { useState, useEffect, useReducer } from 'react';
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
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { Rapportino, EnrichedRapportino, Tecnico } from '@/models/definitions';

// --- STATE MANAGEMENT CON useReducer ---
interface ReportListState {
    rapportini: EnrichedRapportino[];
    loading: boolean;
    error: string | null;
}

type Action = 
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: EnrichedRapportino[] }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean };

const initialState: ReportListState = {
    rapportini: [],
    loading: true,
    error: null,
};

function reportListReducer(state: ReportListState, action: Action): ReportListState {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, rapportini: action.payload, error: null };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
}

const ReportListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { data: masterData, loading: masterDataLoading } = useLocalData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [state, dispatch] = useReducer(reportListReducer, initialState);
  const { rapportini, loading, error } = state;

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
      collection(db, "rapportini"), 
      where("tecnicoId", "==", userProfile.tecnicoId),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
        const naviMap = new Map(masterData.navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map(l => [l.id, l.nome]));
        const tecniciMap = new Map(masterData.tecnici.map(t => [t.id, t]));

        const today = new Date();

        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            const reportDate = (data.data as Timestamp).toDate();
            const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Non Definito', colore: '', lavorativo: false, icona: '', sigla: '' };
            const destinazione = data.naveId ? naviMap.get(data.naveId) : (data.luogoId ? luoghiMap.get(data.luogoId) : 'Nessuna');
            
            const reportMonth = startOfMonth(reportDate);
            const currentActiveMonth = startOfMonth(new Date());
            const previousMonth = startOfMonth(subMonths(new Date(), 1));

            let isEditable = false;
            if (userProfile && userProfile.isAdmin) { 
                isEditable = true;
            } else {
                if (isSameMonth(reportMonth, currentActiveMonth)) {
                    isEditable = true;
                } else if (isSameMonth(reportMonth, previousMonth) && today.getDate() <= 10) {
                    isEditable = true;
                }
            }
            
            const presenzeArricchite = (data.presenze || []).map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);
            const oreGiorno = (data.dettaglioOreTecnici || []).reduce((acc, d) => acc + (d.ore || 0), 0);

            return {
                ...data,
                id: doc.id,
                data: reportDate,
                isEditable: isEditable,
                tipoGiornata: tipoGiornata,
                destinazione: destinazione || 'Non trovato',
                presenze: presenzeArricchite,
                oreGiorno: oreGiorno,
            } as EnrichedRapportino;
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
  
  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
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
            {rapportini.length > 0 ? (
              rapportini.map((report, index) => (
                  <Box key={report.id}>
                    <ListItem 
                        component={report.isEditable ? ListItemButton : 'div'}
                        onClick={report.isEditable ? () => navigate(`/report/edit/${report.id}`) : undefined}
                        sx={{ opacity: report.isEditable ? 1 : 0.7 }}
                        secondaryAction={
                            report.isEditable ? (
                                <Typography variant="body2" color="text.secondary" sx={{pr: 2}}>
                                    {report.tipoGiornata.nome}
                                </Typography>
                            ) : (
                                <IconButton edge="end" aria-label="locked" disabled>
                                    <LockIcon />
                                </IconButton>
                            )
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
                    {index < rapportini.length - 1 && <Divider component="li" />}
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
